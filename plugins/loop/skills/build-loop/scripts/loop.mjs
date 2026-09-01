#!/usr/bin/env node
// Loop 1.54.0 — bundled CLI, no dependencies, no network.

// ../cli/dist/language-bin.js
import { readFileSync, writeFileSync } from "node:fs";

// ../core/dist/document.js
function sayLoop(id, name) {
  return name === void 0 || name === id ? `'${id}'` : `'${id}' ("${name}")`;
}
var EDGE_SEPARATOR = " ";
function edgeKey(from, to) {
  return `${from}${EDGE_SEPARATOR}${to}`;
}
function parseEdgeKey(key2) {
  const at = key2.indexOf(EDGE_SEPARATOR);
  if (at === -1) {
    throw new Error(`not an edge key: ${JSON.stringify(key2)}`);
  }
  return { from: key2.slice(0, at), to: key2.slice(at + EDGE_SEPARATOR.length) };
}

// ../core/dist/analyse.js
var TRUNCATION_MARKER = " \u2014 INCOMPLETE (bound hit)";
function loopKindWord(kind) {
  return kind === "R" ? "reinforcing" : kind === "B" ? "balancing" : "indeterminate";
}
function successors(doc) {
  const succ = /* @__PURE__ */ new Map();
  for (const v of doc.variables)
    succ.set(v.id, []);
  for (const l of doc.links) {
    if (!succ.has(l.from))
      succ.set(l.from, []);
    if (!succ.has(l.to))
      succ.set(l.to, []);
    succ.get(l.from).push(l.to);
  }
  for (const list of succ.values())
    list.sort();
  return succ;
}
function stronglyConnected(nodes, succ) {
  const inSet = new Set(nodes);
  const index = /* @__PURE__ */ new Map();
  const low = /* @__PURE__ */ new Map();
  const onStack = /* @__PURE__ */ new Set();
  const stack = [];
  const out = [];
  let counter = 0;
  for (const root of nodes) {
    if (index.has(root))
      continue;
    const work = [[root, 0]];
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const v = frame[0];
      if (frame[1] === 0) {
        index.set(v, counter);
        low.set(v, counter);
        counter++;
        stack.push(v);
        onStack.add(v);
      }
      let recursed = false;
      const edges = (succ.get(v) ?? []).filter((w) => inSet.has(w));
      for (let k = frame[1]; k < edges.length; k++) {
        const w = edges[k];
        if (!index.has(w)) {
          frame[1] = k + 1;
          work.push([w, 0]);
          recursed = true;
          break;
        } else if (onStack.has(w)) {
          low.set(v, Math.min(low.get(v), index.get(w)));
        }
      }
      if (recursed)
        continue;
      if (low.get(v) === index.get(v)) {
        const comp = [];
        for (; ; ) {
          const w = stack.pop();
          onStack.delete(w);
          comp.push(w);
          if (w === v)
            break;
        }
        out.push(comp);
      }
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1][0];
        low.set(parent, Math.min(low.get(parent), low.get(v)));
      }
    }
  }
  return out;
}
function elementaryCycles(order, succ, maxLoops) {
  const rank = new Map(order.map((v, k) => [v, k]));
  const cycles = [];
  let truncated = false;
  let startIdx = 0;
  while (startIdx < order.length && !truncated) {
    const remaining = order.slice(startIdx);
    const comps = stronglyConnected(remaining, succ);
    let s = null;
    let comp = null;
    for (const c of comps) {
      const nontrivial = c.length > 1 || (succ.get(c[0]) ?? []).includes(c[0]);
      if (!nontrivial)
        continue;
      for (const v of c) {
        if (s === null || rank.get(v) < rank.get(s)) {
          s = v;
          comp = c;
        }
      }
    }
    if (s === null || comp === null)
      break;
    const start = s;
    const inComp = new Set(comp);
    const blocked = /* @__PURE__ */ new Set();
    const blockedBy = new Map(comp.map((v) => [v, /* @__PURE__ */ new Set()]));
    const path = [];
    const unblock = (u) => {
      blocked.delete(u);
      const dependents = blockedBy.get(u);
      for (const w of [...dependents]) {
        dependents.delete(w);
        if (blocked.has(w))
          unblock(w);
      }
    };
    const circuit = (v) => {
      if (truncated)
        return false;
      let found = false;
      path.push(v);
      blocked.add(v);
      for (const w of succ.get(v) ?? []) {
        if (!inComp.has(w) || rank.get(w) < rank.get(start))
          continue;
        if (w === start) {
          cycles.push([...path]);
          if (cycles.length >= maxLoops)
            truncated = true;
          found = true;
          if (truncated)
            break;
        } else if (!blocked.has(w)) {
          if (circuit(w))
            found = true;
          if (truncated)
            break;
        }
      }
      if (found) {
        unblock(v);
      } else {
        for (const w of succ.get(v) ?? []) {
          if (!inComp.has(w) || rank.get(w) < rank.get(start))
            continue;
          blockedBy.get(w)?.add(v);
        }
      }
      path.pop();
      return found;
    };
    circuit(start);
    startIdx = rank.get(start) + 1;
  }
  return { cycles, truncated };
}
function canonicalForm(path) {
  let best = 0;
  for (let k = 1; k < path.length; k++) {
    if (path[k] < path[best])
      best = k;
  }
  return [...path.slice(best), ...path.slice(0, best)];
}
function edgesOf(path) {
  return path.map((v, k) => ({ from: v, to: path[(k + 1) % path.length] }));
}
function analyse(doc, options) {
  const maxLoops = options?.maxLoops ?? 1e4;
  const succ = successors(doc);
  const linkByEdge = new Map(doc.links.map((l) => [edgeKey(l.from, l.to), l]));
  const order = [...succ.keys()].sort();
  const { cycles, truncated } = elementaryCycles(order, succ, maxLoops);
  const working = cycles.map((raw) => {
    const path = canonicalForm(raw);
    const edges = edgesOf(path);
    let opposites = 0;
    let unknown = false;
    const delays = [];
    for (const e of edges) {
      const link = linkByEdge.get(edgeKey(e.from, e.to));
      if (link === void 0 || link.polarity === "unknown")
        unknown = true;
      else if (link.polarity === "opposite")
        opposites++;
      if (link?.delay !== void 0)
        delays.push(e);
    }
    const kind = unknown ? "I" : opposites % 2 === 0 ? "R" : "B";
    return { path, edges, opposites, kind, delays };
  });
  working.sort((a, b) => a.path.length - b.path.length || (a.path.join(" ") < b.path.join(" ") ? -1 : 1));
  const counters = { R: 0, B: 0, I: 0 };
  const byLength = {};
  const loops = working.map((w) => {
    counters[w.kind]++;
    byLength[w.path.length] = (byLength[w.path.length] ?? 0) + 1;
    return {
      id: `${w.kind}${counters[w.kind]}`,
      kind: w.kind,
      path: w.path,
      length: w.path.length,
      opposites: w.opposites,
      edges: w.edges,
      delays: w.delays
    };
  });
  const nameResolutions = doc.loopDeclarations.map((decl) => {
    const matches = loops.filter((l) => decl.via.every((v) => l.edges.some((e) => e.from === v.from && e.to === v.to))).map((l) => l.id);
    return decl.name === void 0 ? { id: decl.id, via: decl.via, matches } : { id: decl.id, name: decl.name, via: decl.via, matches };
  });
  const named = loops.map((l) => {
    const decl = nameResolutions.find((r) => r.matches.length === 1 && r.matches[0] === l.id);
    if (decl === void 0)
      return l;
    return { ...l, name: decl.name ?? decl.id, declaredId: decl.id };
  });
  return {
    loops: named,
    truncated,
    totals: { R: counters.R, B: counters.B, I: counters.I },
    byLength,
    nameResolutions
  };
}
function minimalVia(target, all, base = [], maxSize = 4) {
  const others = all.filter((l) => l.id !== target.id);
  const baseKeys = new Set(base.map((e) => edgeKey(e.from, e.to)));
  const candidates = target.edges.filter((e) => !baseKeys.has(edgeKey(e.from, e.to)));
  const otherEdgeSets = others.map((l) => new Set(l.edges.map((e) => edgeKey(e.from, e.to))));
  const unique = (extra) => {
    const keys = [...base, ...extra].map((e) => edgeKey(e.from, e.to));
    return !otherEdgeSets.some((set) => keys.every((k) => set.has(k)));
  };
  if (unique([]))
    return [...base];
  const pick = [];
  const search = (startAt, size) => {
    if (pick.length === size)
      return unique(pick) ? [...base, ...pick] : null;
    for (let i = startAt; i <= candidates.length - (size - pick.length); i++) {
      pick.push(candidates[i]);
      const found = search(i + 1, size);
      pick.pop();
      if (found !== null)
        return found;
    }
    return null;
  };
  for (let size = 1; size <= Math.min(maxSize, candidates.length); size++) {
    const found = search(0, size);
    if (found !== null)
      return found;
  }
  return null;
}

// ../core/dist/tensions.js
function segment(loop, from, to) {
  const start = loop.path.indexOf(from);
  if (start < 0)
    return void 0;
  const out = [from];
  for (let step = 1; step <= loop.path.length; step++) {
    const at = loop.path[(start + step) % loop.path.length];
    out.push(at);
    if (at === to)
      return out;
  }
  return void 0;
}
function polarityOf(path, links) {
  let opposites = 0;
  let delays = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    const link = links.get(edgeKey(path[i], path[i + 1]));
    if (link === void 0 || link.polarity === "unknown")
      return void 0;
    if (link.polarity === "opposite")
      opposites++;
    if (link.delay !== void 0)
      delays++;
  }
  return { polarity: opposites % 2 === 0 ? "same" : "opposite", delays };
}
function detectTensions(doc, analysis) {
  const links = /* @__PURE__ */ new Map();
  for (const l of doc.links)
    links.set(edgeKey(l.from, l.to), l);
  const at = /* @__PURE__ */ new Map();
  const loops = analysis.loops;
  for (let i = 0; i < loops.length; i++) {
    for (let j = i + 1; j < loops.length; j++) {
      const a = loops[i];
      const b = loops[j];
      const shared = a.path.filter((v) => b.path.includes(v));
      if (shared.length !== 2)
        continue;
      for (const [from, to] of [
        [shared[0], shared[1]],
        [shared[1], shared[0]]
      ]) {
        const pa = segment(a, from, to);
        const pb = segment(b, from, to);
        if (pa === void 0 || pb === void 0)
          continue;
        const sa = polarityOf(pa, links);
        const sb = polarityOf(pb, links);
        if (sa === void 0 || sb === void 0)
          continue;
        if (sa.polarity === sb.polarity)
          continue;
        const sides = [
          { loop: a, path: pa, ...sa },
          { loop: b, path: pb, ...sb }
        ].sort((x, y) => x.polarity === "same" ? -1 : y.polarity === "same" ? 1 : 0);
        const key2 = edgeKey(from, to);
        const entry = at.get(key2) ?? { from, to, sides: [], witnesses: 0 };
        entry.witnesses++;
        for (const s of sides) {
          const side = {
            loop: s.loop.id,
            ...s.loop.name === void 0 ? {} : { name: s.loop.name },
            path: s.path,
            polarity: s.polarity,
            delays: s.delays
          };
          const held = entry.sides.find((h) => h.polarity === side.polarity);
          if (held === void 0 || side.path.length < held.path.length || side.path.length === held.path.length && side.loop.localeCompare(held.loop) < 0) {
            entry.sides = [...entry.sides.filter((h) => h.polarity !== side.polarity), side];
          }
        }
        at.set(key2, entry);
      }
    }
  }
  for (const e of at.values()) {
    let [x, y] = e.sides.map((s) => [...s.path]);
    if (x === void 0 || y === void 0)
      continue;
    while (x.length > 1 && y.length > 1 && x[1] === y[1]) {
      x.shift();
      y.shift();
    }
    while (x.length > 1 && y.length > 1 && x[x.length - 2] === y[y.length - 2]) {
      x.pop();
      y.pop();
    }
    e.from = x[0];
    e.to = x[x.length - 1];
    e.sides = e.sides.map((s, i) => ({ ...s, path: i === 0 ? x : y }));
  }
  const narrowed = /* @__PURE__ */ new Map();
  for (const e of at.values()) {
    const key2 = edgeKey(e.from, e.to);
    const held = narrowed.get(key2);
    if (held === void 0) {
      narrowed.set(key2, e);
      continue;
    }
    held.witnesses += e.witnesses;
    for (const side of e.sides) {
      const other = held.sides.find((h) => h.polarity === side.polarity);
      if (other === void 0 || side.path.length < other.path.length) {
        held.sides = [...held.sides.filter((h) => h.polarity !== side.polarity), side];
      }
    }
  }
  const out = [...narrowed.values()].map((e) => ({
    from: e.from,
    to: e.to,
    witnesses: e.witnesses,
    paths: [
      e.sides.find((s) => s.polarity === "same"),
      e.sides.find((s) => s.polarity === "opposite")
    ]
  }));
  return out.sort((x, y) => x.from.localeCompare(y.from) || x.to.localeCompare(y.to) || x.paths[0].loop.localeCompare(y.paths[0].loop));
}

// ../core/dist/validate.js
var DIRECTIONAL = /* @__PURE__ */ new Set([
  "better",
  "worse",
  "more",
  "less",
  "increased",
  "decreased",
  "increasing",
  "decreasing",
  "reduced",
  "improved",
  "higher",
  "lower",
  "greater",
  "fewer",
  "good",
  "bad",
  "poor",
  "excessive",
  "insufficient"
]);
var normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function validate(doc, analysis, options) {
  const a = analysis ?? analyse(doc);
  const out = [];
  const err = (rule, element, message) => {
    out.push({ severity: "error", rule, message, element });
  };
  const warn = (rule, element, message) => {
    out.push({ severity: "warning", rule, message, element });
  };
  const linkKeys = new Set(doc.links.map((l) => edgeKey(l.from, l.to)));
  const inAnyLoop = new Set(a.loops.flatMap((l) => l.path));
  const inBalancing = new Set(a.loops.filter((l) => l.kind === "B").flatMap((l) => l.path));
  const degree = /* @__PURE__ */ new Map();
  for (const l of doc.links) {
    degree.set(l.from, (degree.get(l.from) ?? 0) + 1);
    degree.set(l.to, (degree.get(l.to) ?? 0) + 1);
  }
  const seen = /* @__PURE__ */ new Map();
  for (const l of doc.links) {
    const key2 = edgeKey(l.from, l.to);
    seen.set(key2, (seen.get(key2) ?? 0) + 1);
  }
  for (const [key2, count] of seen) {
    if (count > 1) {
      const { from, to } = parseEdgeKey(key2);
      err("V-1.2", { type: "link", from, to }, `${from} -> ${to} is declared ${count} times; parallel links have no meaning in this notation and are ambiguous under analysis \u2014 keep one, and put what the second was saying into its polarity or a note`);
    }
  }
  for (const res of a.nameResolutions) {
    const missing = res.via.filter((v) => !linkKeys.has(edgeKey(v.from, v.to)));
    if (missing.length > 0) {
      err("V-1.3", { type: "loopDeclaration", loop: res.id }, `loop ${sayLoop(res.id, res.name)} names ${missing.length === 1 ? "an edge" : "edges"} that ${missing.length === 1 ? "does" : "do"} not exist: ${missing.map((v) => `${v.from} -> ${v.to}`).join(", ")}; via edges must be links the map declares`);
      continue;
    }
    if (res.matches.length === 1)
      continue;
    if (res.matches.length === 0) {
      err("V-1.4", { type: "loopDeclaration", loop: res.id }, `loop ${sayLoop(res.id, res.name)} matches no cycle: its via edges exist but no single feedback loop passes through all of them; check the edges against the loop you meant`);
      continue;
    }
    const first = a.loops.find((l) => l.id === res.matches[0]);
    const suggestion = suggestExtension(first, a.loops, res.via);
    err("V-1.4", { type: "loopDeclaration", loop: res.id }, `loop ${sayLoop(res.id, res.name)} matches ${res.matches.length} cycles, so the declaration is ambiguous; ` + (suggestion !== null ? `to pin the shortest candidate (${first.id}), add: via ${suggestion}` : `add another via edge unique to the loop you mean`));
  }
  const idCount = /* @__PURE__ */ new Map();
  for (const d of doc.loopDeclarations) {
    idCount.set(d.id, (idCount.get(d.id) ?? 0) + 1);
  }
  for (const [id, count] of idCount) {
    if (count > 1) {
      err("V-1.5", { type: "loopDeclaration", loop: id }, `'${id}' identifies ${count} loops; an identifier is what an archetype binding points at (G-9), so each must be unique \u2014 rename all but one`);
    }
  }
  const causal = doc.level === "causal";
  for (const l of doc.links) {
    if (l.polarity === "unknown" && causal) {
      err("V-3", { type: "link", from: l.from, to: l.to }, `unknown polarity on link ${l.from} -> ${l.to}; the map declares level 'causal', so give both ends '+' or '-', or lower the level to 'influence'`);
    }
  }
  for (const v of doc.variables) {
    const deg = degree.get(v.id) ?? 0;
    if (deg === 0) {
      if (causal) {
        err("V-3", { type: "variable", id: v.id }, `'${v.id}' has no links; at level 'causal' every variable must be connected \u2014 link it in, remove it, or lower the level to 'influence'`);
      } else {
        warn("V-2", { type: "variable", id: v.id }, `'${v.id}' has no links yet \u2014 expected while a map is under construction, worth resolving before the level is raised to 'causal'`);
      }
      continue;
    }
    if (causal && !inAnyLoop.has(v.id) && !v.exogenous) {
      warn("V-3", { type: "variable", id: v.id }, `'${v.id}' takes part in no feedback loop \u2014 an unclosed causal chain usually means a link is missing; if it truly acts on the system from outside, declare it '{ exogenous }'`);
    }
    if (v.exogenous && inAnyLoop.has(v.id)) {
      err("V-3.2", { type: "variable", id: v.id }, `'${v.id}' is declared exogenous but takes part in a feedback loop; an exogenous variable acts from outside the system \u2014 remove the flag, or remove the links that close a loop through it`);
    }
    if (v.kind === "goal" && !inBalancing.has(v.id) && !v.exogenous && causal) {
      warn("V-8", { type: "variable", id: v.id }, `'${v.id}' is a goal but no balancing loop seeks it; either the loop is missing, or it is an external reference level (add '{ exogenous }'), or it is not a goal`);
    }
    const firstWord = (v.label ?? v.id).split(/[\s_]+/)[0]?.toLowerCase() ?? "";
    if (DIRECTIONAL.has(firstWord)) {
      warn("V-7", { type: "variable", id: v.id }, `'${v.label ?? v.id}' bakes a direction into the name; the marks say better or worse, so name the continuous quantity instead \u2014 'health_status', not 'better_health'`);
    }
  }
  const V9_RULE = {
    "unknown-archetype": "V-9.1",
    "role-misuse": "V-9.2",
    "unresolved-loop": "V-9.3",
    "kind-mismatch": "V-9.4",
    uncoupled: "V-9.4",
    "missing-variable-kind": "V-9.4",
    // A-13.3
    "indeterminate-loop": "V-9.5"
  };
  const profile = options?.profile;
  for (const decl of profile === void 0 ? doc.archetypeDeclarations : []) {
    warn("V-9.6", { type: "archetypeDeclaration", archetype: decl.archetype }, `"${decl.archetype}" is declared, but no archetype catalogue is loaded here, so the claim cannot be checked; the document itself is fine`);
  }
  for (const v of profile === void 0 ? [] : profile.verify(doc, a)) {
    const element = {
      type: "archetypeDeclaration",
      archetype: v.declaration.archetype
    };
    const subject = v.label;
    for (const f of v.failures) {
      const message = v.provenance === "local" ? `${subject}: ${f.message}` : f.message;
      if (f.check === "indeterminate-loop") {
        warn("V-9.5", element, message);
      } else {
        err(V9_RULE[f.check], element, message);
      }
    }
  }
  const sphereIds = /* @__PURE__ */ new Map();
  for (const sp of doc.spheres)
    sphereIds.set(sp.id, (sphereIds.get(sp.id) ?? 0) + 1);
  const known = new Set(doc.variables.map((v) => v.id));
  for (const sp of doc.spheres) {
    const element = { type: "sphere", id: sp.id };
    if ((sphereIds.get(sp.id) ?? 0) > 1) {
      err("V-11.1", element, `sphere '${sp.id}' is declared more than once; give each sphere its own identifier`);
    }
    for (const id of sp.holds) {
      if (!known.has(id)) {
        err("V-11.2", element, `sphere '${sp.id}' holds '${id}', which is not a variable of this map \u2014 check the spelling, or give it a link so the map has it`);
      }
    }
    const seen2 = /* @__PURE__ */ new Set();
    for (const id of sp.holds) {
      if (seen2.has(id)) {
        warn("V-11.3", element, `sphere '${sp.id}' holds '${id}' more than once; the repeat says nothing new`);
      }
      seen2.add(id);
    }
  }
  if (doc.tensions.length > 0) {
    const real = detectTensions(doc, a);
    const keys = new Set(real.map((t) => edgeKey(t.from, t.to)));
    for (const t of doc.tensions) {
      if (keys.has(edgeKey(t.from, t.to)))
        continue;
      const element = { type: "tension", from: t.from, to: t.to };
      if (keys.has(edgeKey(t.to, t.from))) {
        warn("V-12", element, `tension '${t.name}' runs ${t.from} => ${t.to}, but the tension this map has runs the other way, ${t.to} => ${t.from}; swap the two ends`);
        continue;
      }
      const near = real.find((r) => r.from === t.from || r.to === t.to) ?? real.find((r) => r.from === t.to || r.to === t.from);
      const first = real[0];
      const tail = near !== void 0 ? `; the nearest one this map has is ${near.from} => ${near.to}` : first !== void 0 ? `; this map's tensions are elsewhere \u2014 one of them is ${first.from} => ${first.to}` : `; this map has none at all`;
      warn("V-12", element, `tension '${t.name}' names ${t.from} => ${t.to}, and no two routes of opposite sign run between them, so it is drawn nowhere${tail}` + (first !== void 0 ? ` (run 'loop analyse --tensions' for the full list)` : ``));
    }
  }
  const declaredArchetypes = new Set(doc.archetypeDeclarations.map((d) => d.archetype));
  const signatureNames = /* @__PURE__ */ new Map();
  for (const sig of doc.signatures) {
    signatureNames.set(sig.name, (signatureNames.get(sig.name) ?? 0) + 1);
  }
  for (const sig of doc.signatures) {
    const element = { type: "signature", name: sig.name };
    if (profile?.entry(sig.name) !== void 0) {
      err("V-10.1", element, `"${sig.name}" is one of the ten catalogue archetypes, so a signature cannot redefine it \u2014 that would let a map be made to fit by changing the pattern instead of the understanding; name your own pattern something else`);
    }
    if ((signatureNames.get(sig.name) ?? 0) > 1) {
      err("V-10.2", element, `"${sig.name}" is defined ${signatureNames.get(sig.name)} times; a name identifies one signature \u2014 rename all but one`);
      signatureNames.set(sig.name, 1);
    }
    const roleNames = /* @__PURE__ */ new Set();
    const duplicated = /* @__PURE__ */ new Set();
    for (const r of sig.roles) {
      if (roleNames.has(r.role))
        duplicated.add(r.role);
      roleNames.add(r.role);
    }
    if (sig.roles.length < 2) {
      err("V-10.3", element, `"${sig.name}" defines ${sig.roles.length} role${sig.roles.length === 1 ? "" : "s"}; an archetype is a set of loops that meet, so it needs at least two`);
    }
    for (const dup of duplicated) {
      err("V-10.3", element, `"${sig.name}" defines the role '${dup}' twice`);
    }
    if (sig.couplings.length === 0 && sig.roles.length >= 2) {
      err("V-10.3", element, `"${sig.name}" says which loops it wants but never which of them must meet; add a 'meet' pair, or the signature describes loops that need not touch`);
    }
    for (const { roles: [a2, b] } of sig.couplings) {
      for (const side of [a2, b]) {
        if (!roleNames.has(side)) {
          err("V-10.3", element, `"${sig.name}" couples '${side}', which it does not define as a role; its roles are: ${[...roleNames].join(", ") || "none"}`);
        }
      }
    }
    if (!declaredArchetypes.has(sig.name)) {
      warn("V-10.4", element, `"${sig.name}" is defined but never declared in this map; a signature is scoped to its own document, so add 'archetype "${sig.name}" { \u2026 }' or remove it`);
    }
    const unconstrained = sig.roles.length === 2 && sig.couplings.length === 1 && sig.roles.every((r) => r.through === void 0);
    if (unconstrained) {
      warn("V-10.5", element, `"${sig.name}" constrains almost nothing: two loops that meet describes much of any dense map \u2014 measured at 89 candidate pairings on a single variable \u2014 so detection will rank it last (A-14.3). Consider 'through goal' on the role that must run through one, or a third role`);
    }
  }
  const byNorm = /* @__PURE__ */ new Map();
  for (const v of doc.variables) {
    for (const text of /* @__PURE__ */ new Set([v.id, v.label ?? v.id])) {
      const n = normalise(text);
      const list = byNorm.get(n) ?? [];
      if (!list.includes(v.id))
        list.push(v.id);
      byNorm.set(n, list);
    }
  }
  for (const ids of byNorm.values()) {
    if (ids.length > 1) {
      warn("V-4", { type: "variable", id: ids[0] }, `${ids.map((id) => `'${id}'`).join(" and ")} look like the same variable; identity is the name (DM-2), so a near-duplicate splits one concept's links across two nodes \u2014 merge them if they are one thing`);
    }
  }
  return out;
}
function suggestExtension(target, all, base) {
  const full = minimalVia(target, all, base);
  if (full === null)
    return null;
  const baseKeys = new Set(base.map((e) => edgeKey(e.from, e.to)));
  const extra = full.filter((e) => !baseKeys.has(edgeKey(e.from, e.to)));
  if (extra.length === 0)
    return null;
  return extra.map((e) => `${e.from} -> ${e.to}`).join(", ");
}

// ../core/dist/vortex-layout.js
var TAU = Math.PI * 2;
var START = -Math.PI / 2;

// ../core/dist/compare.js
var CATEGORY_ORDER = new Map([
  "archetype-fit-changed",
  "archetype-rebound",
  "archetype-added",
  "archetype-removed",
  "loop-reversed",
  "loop-resolved",
  "loop-obscured",
  "loop-appeared",
  "loop-vanished",
  "name-moved",
  "loop-named",
  "loop-unnamed",
  "link-repolarised",
  "link-added",
  "link-removed",
  "link-delay-changed",
  "variable-added",
  "variable-removed",
  "variable-changed"
].map((c, i) => [c, i]));
var STRUCTURAL_CATEGORIES = [
  "loop-appeared",
  "loop-vanished",
  "loop-reversed",
  "loop-resolved",
  "loop-obscured",
  "archetype-fit-changed"
];
var key = (path) => canonicalForm(path).join(" -> ");
var totalsOf = (a) => ({
  loops: a.loops.length,
  R: a.totals.R,
  B: a.totals.B,
  I: a.totals.I
});
var kindWord = loopKindWord;
var polarityWord = (p) => p === "same" ? "same (S)" : p === "opposite" ? "opposite (O)" : "unknown (?)";
function compare(before, after, options) {
  const beforeAnalysis = analyse(before);
  const afterAnalysis = analyse(after);
  const findings = [];
  const loopsBefore = new Map(beforeAnalysis.loops.map((l) => [key(l.path), l]));
  const loopsAfter = new Map(afterAnalysis.loops.map((l) => [key(l.path), l]));
  for (const [k, loop] of loopsAfter) {
    if (!loopsBefore.has(k)) {
      findings.push({
        category: "loop-appeared",
        subject: k,
        message: `a ${kindWord(loop.kind)} loop appeared: ${k}`,
        path: loop.path,
        after: loop.kind
      });
    }
  }
  for (const [k, loop] of loopsBefore) {
    if (!loopsAfter.has(k)) {
      findings.push({
        category: "loop-vanished",
        subject: k,
        message: `a ${kindWord(loop.kind)} loop is gone: ${k}`,
        path: loop.path,
        before: loop.kind
      });
    }
  }
  for (const [k, was] of loopsBefore) {
    const now = loopsAfter.get(k);
    if (now === void 0 || now.kind === was.kind)
      continue;
    const category = was.kind === "I" ? "loop-resolved" : now.kind === "I" ? "loop-obscured" : "loop-reversed";
    const message = category === "loop-reversed" ? `${k} reversed: ${kindWord(was.kind)} before, ${kindWord(now.kind)} now \u2014 the story runs the other way` : category === "loop-resolved" ? `${k} is no longer indeterminate: a polarity on it was signed, and the loop computes as ${kindWord(now.kind)}` : `${k} became indeterminate: it was ${kindWord(was.kind)}, and a link on it is now '?'`;
    findings.push({ category, subject: k, message, path: now.path, before: was.kind, after: now.kind });
  }
  const namedBefore = new Map(beforeAnalysis.loops.filter((l) => l.name !== void 0).map((l) => [l.name, key(l.path)]));
  for (const loop of afterAnalysis.loops) {
    if (loop.name === void 0)
      continue;
    const was = namedBefore.get(loop.name);
    const now = key(loop.path);
    if (was !== void 0 && was !== now) {
      findings.push({
        category: "name-moved",
        subject: loop.name,
        message: `the name "${loop.name}" now identifies a different cycle; it was ${was}, and is now ${now}`,
        path: loop.path,
        before: was,
        after: now
      });
    }
  }
  for (const [k, now] of loopsAfter) {
    const was = loopsBefore.get(k);
    if (was === void 0)
      continue;
    if (was.name === void 0 && now.name !== void 0) {
      findings.push({
        category: "loop-named",
        subject: k,
        message: `${k} is now named "${now.name}"`,
        path: now.path,
        after: now.name
      });
    } else if (was.name !== void 0 && now.name === void 0) {
      findings.push({
        category: "loop-unnamed",
        subject: k,
        message: `${k} no longer carries the name "${was.name}"`,
        path: now.path,
        before: was.name
      });
    }
  }
  const varsBefore = new Map(before.variables.map((v) => [v.id, v]));
  const varsAfter = new Map(after.variables.map((v) => [v.id, v]));
  for (const [id, v] of varsAfter) {
    if (!varsBefore.has(id)) {
      findings.push({
        category: "variable-added",
        subject: id,
        message: `'${id}' is new`
      });
    }
  }
  for (const [id] of varsBefore) {
    if (!varsAfter.has(id)) {
      findings.push({
        category: "variable-removed",
        subject: id,
        message: `'${id}' is gone`
      });
    }
  }
  for (const [id, was] of varsBefore) {
    const now = varsAfter.get(id);
    if (now === void 0)
      continue;
    const changes = [];
    if (was.kind !== now.kind)
      changes.push(`kind ${was.kind} -> ${now.kind}`);
    if (was.exogenous !== now.exogenous) {
      changes.push(now.exogenous ? "declared exogenous" : "no longer declared exogenous");
    }
    if ((was.note ?? "") !== (now.note ?? "")) {
      changes.push(was.note === void 0 ? "gained a note" : now.note === void 0 ? "lost its note" : "note rewritten");
    }
    if (changes.length > 0) {
      findings.push({
        category: "variable-changed",
        subject: id,
        message: `'${id}': ${changes.join(", ")}`
      });
    }
  }
  const linksBefore = new Map(before.links.map((l) => [edgeKey(l.from, l.to), l]));
  const linksAfter = new Map(after.links.map((l) => [edgeKey(l.from, l.to), l]));
  const arrow = (k) => {
    const e = parseEdgeKey(k);
    return `${e.from} -> ${e.to}`;
  };
  for (const [k, l] of linksAfter) {
    if (!linksBefore.has(k)) {
      findings.push({
        category: "link-added",
        subject: k,
        message: `${arrow(k)} is new, ${polarityWord(l.polarity)}`
      });
    }
  }
  for (const [k] of linksBefore) {
    if (!linksAfter.has(k)) {
      findings.push({
        category: "link-removed",
        subject: k,
        message: `${arrow(k)} is gone`
      });
    }
  }
  for (const [k, was] of linksBefore) {
    const now = linksAfter.get(k);
    if (now === void 0)
      continue;
    if (was.polarity !== now.polarity) {
      findings.push({
        category: "link-repolarised",
        subject: k,
        message: `${arrow(k)} changed polarity: ${polarityWord(was.polarity)} -> ${polarityWord(now.polarity)}`,
        before: was.polarity,
        after: now.polarity
      });
    }
    const wasDelay = was.delay !== void 0;
    const nowDelay = now.delay !== void 0;
    if (wasDelay !== nowDelay) {
      findings.push({
        category: "link-delay-changed",
        subject: k,
        message: `${arrow(k)} ${nowDelay ? "now carries a delay" : "no longer carries a delay"}`
      });
    }
  }
  const fitBefore = new Map((options?.profile?.verify(before, beforeAnalysis) ?? []).map((v) => [
    v.declaration.archetype,
    v
  ]));
  const fitAfter = new Map((options?.profile?.verify(after, afterAnalysis) ?? []).map((v) => [
    v.declaration.archetype,
    v
  ]));
  for (const [name] of fitAfter) {
    if (!fitBefore.has(name)) {
      findings.push({
        category: "archetype-added",
        subject: name,
        message: `"${name}" is declared for the first time`
      });
    }
  }
  for (const [name] of fitBefore) {
    if (!fitAfter.has(name)) {
      findings.push({
        category: "archetype-removed",
        subject: name,
        message: `the declaration of "${name}" is gone`
      });
    }
  }
  for (const [name, was] of fitBefore) {
    const now = fitAfter.get(name);
    if (now === void 0)
      continue;
    const subject = now.label;
    const bindingsOf = (v) => v.declaration.bindings.map((b) => `${b.role}=${b.loop}`).sort().join(", ");
    if (bindingsOf(was) !== bindingsOf(now)) {
      findings.push({
        category: "archetype-rebound",
        subject: name,
        message: `"${subject}" binds different loops now: ${bindingsOf(was)} -> ${bindingsOf(now)}`,
        before: bindingsOf(was),
        after: bindingsOf(now)
      });
    }
    if (was.fit === now.fit)
      continue;
    findings.push({
      category: "archetype-fit-changed",
      subject: name,
      message: now.fit ? `"${subject}" now fits the map \u2014 the hypothesis is borne out where it was not before` : `"${subject}" no longer fits: the map has outgrown the hypothesis (see 'loop validate' for what stopped matching)`,
      before: was.fit ? "fits" : "does not fit",
      after: now.fit ? "fits" : "does not fit"
    });
  }
  findings.sort((x, y) => CATEGORY_ORDER.get(x.category) - CATEGORY_ORDER.get(y.category) || (x.path?.length ?? 0) - (y.path?.length ?? 0) || x.subject.localeCompare(y.subject));
  return {
    findings,
    before: totalsOf(beforeAnalysis),
    after: totalsOf(afterAnalysis),
    structuralChange: findings.some((f) => STRUCTURAL_CATEGORIES.includes(f.category))
  };
}

// ../core/dist/rank.js
function rankLoops(doc, analysis, options) {
  const cyclesByEdge = /* @__PURE__ */ new Map();
  analysis.loops.forEach((loop, index) => {
    for (const e of loop.edges) {
      const key2 = edgeKey(e.from, e.to);
      const list = cyclesByEdge.get(key2);
      if (list === void 0)
        cyclesByEdge.set(key2, [index]);
      else
        list.push(index);
    }
  });
  const rolesByLoop = /* @__PURE__ */ new Map();
  for (const v of options?.profile?.verify(doc, analysis) ?? []) {
    for (const b of v.declaration.bindings) {
      const list = rolesByLoop.get(b.loop) ?? [];
      list.push({ archetype: v.declaration.archetype, role: b.role });
      rolesByLoop.set(b.loop, list);
    }
  }
  const others = Math.max(0, analysis.loops.length - 1);
  const pool = options?.maxLength === void 0 ? analysis.loops : analysis.loops.filter((l) => l.length <= options.maxLength);
  const salience = pool.map((loop) => {
    const index = analysis.loops.indexOf(loop);
    const touched = /* @__PURE__ */ new Set();
    for (const e of loop.edges) {
      for (const other of cyclesByEdge.get(edgeKey(e.from, e.to)) ?? []) {
        if (other !== index)
          touched.add(other);
      }
    }
    const roles = loop.declaredId === void 0 ? [] : rolesByLoop.get(loop.declaredId) ?? [];
    return {
      loop,
      reach: touched.size,
      reachRatio: others === 0 ? 0 : touched.size / others,
      delays: loop.delays.length,
      declared: loop.name !== void 0,
      archetypeRoles: roles
    };
  });
  const canonicalIndex = new Map(analysis.loops.map((l, i) => [l.id, i]));
  return salience.sort((x, y) => Number(y.archetypeRoles.length > 0) - Number(x.archetypeRoles.length > 0) || Number(y.declared) - Number(x.declared) || y.reach - x.reach || x.loop.length - y.loop.length || canonicalIndex.get(x.loop.id) - canonicalIndex.get(y.loop.id));
}

// ../core/dist/archetype-layout.js
var TAU2 = Math.PI * 2;

// ../core/dist/render.js
var TAU_R = Math.PI * 2;
var SPHERE_GAP = 4;
var SPHERE_BAND = 7;
var SPHERE_REACH = SPHERE_GAP + SPHERE_BAND;

// ../dsl/dist/grammar.generated.js
var LEADING = {
  "statement": [
    "map",
    "loop",
    "sphere",
    "archetype",
    "signature",
    "tension"
  ],
  "map_block": [
    "map"
  ],
  "map_setting": [
    "profile",
    "level"
  ],
  "attribute": [
    "goal",
    "exogenous",
    "note"
  ],
  "sphere_decl": [
    "sphere"
  ],
  "holds_clause": [
    "holds"
  ],
  "sphere_setting": [
    "holds",
    "note"
  ],
  "mark": [
    "+",
    "-",
    "?"
  ],
  "link_attr": [
    "~delay"
  ],
  "loop_decl": [
    "loop"
  ],
  "via_clause": [
    "via"
  ],
  "loop_setting": [
    "via",
    "note"
  ],
  "tension_decl": [
    "tension"
  ],
  "archetype_decl": [
    "archetype"
  ],
  "archetype_setting": [
    "note"
  ],
  "signature_decl": [
    "signature"
  ],
  "signature_setting": [
    "role",
    "meet",
    "note"
  ],
  "loop_kind": [
    "reinforcing",
    "balancing"
  ],
  "var_kind": [
    "ordinary",
    "goal"
  ],
  "string": [
    '"'
  ],
  "comment": [
    "#"
  ]
};

// ../dsl/dist/tokens.js
var isSpace = (ch) => ch === " " || ch === "	" || ch === "\r" || ch === "\n";
var isAtomEnd = (ch) => isSpace(ch) || ch === "{" || ch === "}" || ch === "," || ch === '"' || ch === "#";
function tokenize(src) {
  const tokens = [];
  const issues = [];
  let i = 0;
  let line = 1;
  let column = 1;
  const advance = () => {
    if (src[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
    i++;
  };
  while (i < src.length) {
    const ch = src[i];
    if (isSpace(ch)) {
      advance();
      continue;
    }
    if (ch === "#") {
      while (i < src.length && src[i] !== "\n")
        advance();
      continue;
    }
    if (ch === '"') {
      const startLine2 = line;
      const startCol2 = column;
      advance();
      let value2 = "";
      let closed = false;
      while (i < src.length) {
        if (src[i] === '"') {
          closed = true;
          advance();
          break;
        }
        value2 += src[i];
        advance();
      }
      if (!closed) {
        issues.push({
          message: `string starting here never closes; add a closing '"'`,
          line: startLine2,
          column: startCol2
        });
      }
      value2 = value2.replace(/\s*\n\s*/g, " ");
      tokens.push({ kind: "string", value: value2, line: startLine2, column: startCol2 });
      continue;
    }
    if (ch === "{" || ch === "}" || ch === ",") {
      tokens.push({
        kind: ch === "{" ? "lbrace" : ch === "}" ? "rbrace" : "comma",
        value: ch,
        line,
        column
      });
      advance();
      continue;
    }
    if (ch === "-" && src[i + 1] === ">") {
      tokens.push({ kind: "arrow", value: "->", line, column });
      advance();
      advance();
      continue;
    }
    if (ch === "=" && src[i + 1] === ">") {
      tokens.push({ kind: "fatarrow", value: "=>", line, column });
      advance();
      advance();
      continue;
    }
    const startLine = line;
    const startCol = column;
    let value = "";
    while (i < src.length && !isAtomEnd(src[i])) {
      if (src[i] === "-" && src[i + 1] === ">")
        break;
      if (src[i] === "=" && src[i + 1] === ">")
        break;
      value += src[i];
      advance();
    }
    tokens.push({ kind: "atom", value, line: startLine, column: startCol });
  }
  tokens.push({ kind: "eof", value: "", line, column });
  return { tokens, issues };
}

// ../dsl/dist/parse.js
function oneOf(rule) {
  return LEADING[rule] ?? [];
}
function saidAs(words) {
  const q = words.map((w) => `'${w}'`);
  if (q.length === 0)
    return "a keyword";
  if (q.length === 1)
    return q[0];
  return `${q.slice(0, -1).join(", ")} or ${q[q.length - 1]}`;
}
function derivedLoopId(name, position) {
  return derivedId(name, position, "loop");
}
function derivedId(name, position, what) {
  const folded = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (folded === "")
    return `${what}_${position + 1}`;
  return /^[0-9]/.test(folded) ? `${what}_${folded}` : folded;
}
var IDENT = /^[A-Za-z][A-Za-z0-9_]*$/;
var MARKS = /* @__PURE__ */ new Set(["+", "-", "?"]);
var markToSign = (mark) => mark === "+" ? 1 : mark === "-" ? -1 : 0;
function leadingNote(source) {
  const out = [];
  for (const line of source.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("#"))
      break;
    out.push(t.replace(/^#\s?/, "").trimEnd());
  }
  while (out.length > 0 && out[out.length - 1] === "")
    out.pop();
  return out;
}
function parse(source) {
  const note = leadingNote(source);
  const { tokens, issues } = tokenize(source);
  const diagnostics = issues.map((iss) => ({
    severity: "error",
    message: iss.message,
    line: iss.line,
    column: iss.column,
    expected: `'"'`
  }));
  let pos = 0;
  const peek = (n = 0) => tokens[Math.min(pos + n, tokens.length - 1)];
  const next = () => {
    const t = tokens[pos];
    if (t.kind !== "eof")
      pos++;
    return t;
  };
  const error = (at, message, expected) => {
    const d = { severity: "error", message, line: at.line, column: at.column };
    if (at.kind !== "eof")
      d.found = at.kind === "string" ? `"${at.value}"` : at.value;
    if (expected !== void 0)
      d.expected = expected;
    diagnostics.push(d);
  };
  const synchronize = () => {
    const fromLine = peek().line;
    while (peek().kind !== "eof" && peek().line === fromLine) {
      if (next().kind === "rbrace")
        return;
    }
  };
  let title;
  let profile;
  let level = "influence";
  const variables = /* @__PURE__ */ new Map();
  const links = [];
  const loopDeclarations = [];
  const tensions = [];
  const spheres = [];
  const byProse = [];
  const archetypeDeclarations = [];
  const signatures = [];
  const variablePos = {};
  const linkPos = [];
  const loopPos = [];
  const tensionPos = [];
  const spherePos = [];
  const archetypePos = [];
  const signaturePos = [];
  const touch = (id, at) => {
    let v = variables.get(id);
    if (v === void 0) {
      v = { kind: "ordinary", exogenous: false };
      variables.set(id, v);
    }
    if (at !== void 0 && variablePos[id] === void 0) {
      variablePos[id] = { line: at.line, column: at.column };
    }
    return v;
  };
  const expectIdent = (what) => {
    const t = peek();
    if (t.kind === "atom" && IDENT.test(t.value)) {
      next();
      return t.value;
    }
    error(t, `expected ${what}, an identifier of letters, digits and '_' starting with a letter`, "an identifier");
    return null;
  };
  const expectMark = (endName, linkText) => {
    const t = peek();
    if (t.kind === "atom" && MARKS.has(t.value)) {
      next();
      return t.value;
    }
    error(t, `the link ${linkText} is missing its direction-of-change mark on ${endName}; every link carries one at each end, e.g. 'a + -> b -', and '?' is how "not yet known" is written`, `'+', '-' or '?'`);
    return "?";
  };
  const parseMapBlock = () => {
    next();
    if (peek().kind === "string")
      title = next().value;
    if (peek().kind !== "lbrace") {
      error(peek(), `a map statement takes a block: map "Title" { \u2026 }`, "'{'");
      synchronize();
      return;
    }
    next();
    while (peek().kind !== "rbrace" && peek().kind !== "eof") {
      const key2 = peek();
      if (key2.kind !== "atom") {
        error(key2, `expected a map setting (${saidAs(oneOf("map_setting"))})`, saidAs(oneOf("map_setting")));
        synchronize();
        continue;
      }
      next();
      if (key2.value === "profile") {
        const v = peek();
        if (v.kind === "atom") {
          profile = next().value;
        } else {
          error(v, `'profile' takes an identifier path, e.g. systemic-design/story-loop`, "a profile name");
        }
      } else if (key2.value === "level") {
        const v = peek();
        if (v.kind === "atom" && (v.value === "influence" || v.value === "causal")) {
          level = next().value;
        } else {
          error(v, `'level' is the map's maturity claim and must be 'influence' or 'causal'`, "'influence' or 'causal'");
          if (v.kind === "atom")
            next();
        }
      } else {
        error(key2, `'${key2.value}' is not a map setting \u2014 the block takes ${saidAs(oneOf("map_setting"))}`, saidAs(oneOf("map_setting")));
      }
    }
    if (peek().kind === "rbrace")
      next();
    else
      error(peek(), `the map block starting earlier never closes`, "'}'");
  };
  const parseEdgeRef = () => {
    const from = expectIdent("the edge's source variable");
    if (from === null)
      return null;
    if (peek().kind !== "arrow") {
      error(peek(), `a via edge is written 'from -> to', without marks \u2014 it names an edge, it does not restate its polarity`, "'->'");
      return null;
    }
    next();
    const to = expectIdent("the edge's target variable");
    if (to === null)
      return null;
    return { from, to };
  };
  const parseLoopDecl = () => {
    const kw = next();
    loopPos.push({ line: kw.line, column: kw.column });
    let id;
    let name;
    if (peek().kind === "atom" && peek().value !== "via") {
      id = next().value;
      if (peek().kind === "string")
        name = next().value;
    } else if (peek().kind === "string") {
      name = next().value;
      id = derivedLoopId(name, loopDeclarations.length);
    } else {
      error(peek(), `a loop declaration identifies a computed loop: loop burnout "Burnout engine" via a -> b`, "an identifier");
      synchronize();
      return;
    }
    const via = [];
    let note2;
    const parseViaClause = () => {
      do {
        const edge = parseEdgeRef();
        if (edge !== null)
          via.push(edge);
        else
          break;
      } while (peek().kind === "comma" && (next(), true));
    };
    if (peek().kind === "atom" && peek().value === "via") {
      next();
      parseViaClause();
    }
    if (peek().kind === "lbrace") {
      next();
      while (peek().kind !== "rbrace" && peek().kind !== "eof") {
        const key2 = peek();
        if (key2.kind !== "atom") {
          error(key2, `expected 'via' or 'note' inside a loop block`, "'via' or 'note'");
          synchronize();
          continue;
        }
        next();
        if (key2.value === "via") {
          parseViaClause();
        } else if (key2.value === "note") {
          if (peek().kind === "string")
            note2 = next().value;
          else
            error(peek(), `'note' takes a quoted string`, "a quoted string");
        } else {
          error(key2, `'${key2.value}' is not a loop setting`, "'via' or 'note'");
        }
      }
      if (peek().kind === "rbrace")
        next();
      else
        error(peek(), `the loop block for '${id}' never closes`, "'}'");
    }
    if (via.length === 0) {
      error(kw, `loop '${id}' identifies no cycle; give it at least one 'via' edge it passes through (G-5)`, "'via'");
    }
    const decl = { id, via };
    if (name !== void 0)
      decl.name = name;
    if (note2 !== void 0)
      decl.note = note2;
    loopDeclarations.push(decl);
  };
  const parseTensionDecl = () => {
    const kw = next();
    tensionPos.push({ line: kw.line, column: kw.column });
    let id;
    let name;
    if (peek().kind === "string") {
      name = next().value;
      id = derivedId(name, tensionPos.length - 1, "tension");
    } else {
      id = expectIdent("the tension's identifier");
      if (id === null) {
        synchronize();
        return;
      }
      if (peek().kind !== "string") {
        error(peek(), `tension '${id}' has no name; say what the two sides are \u2014 tension ${id} "replenishment vs erosion" in a => b (G-11)`, "a quoted name");
        synchronize();
        return;
      }
      name = next().value;
    }
    if (!(peek().kind === "atom" && peek().value === "in")) {
      error(peek(), `a tension names the two ends it runs between: tension "replenishment vs erosion" in workload => capacity (G-11)`, "'in'");
      synchronize();
      return;
    }
    next();
    const from = expectIdent("the tension's start variable");
    if (from === null) {
      synchronize();
      return;
    }
    if (peek().kind !== "fatarrow") {
      error(peek(), `a tension's two ends are joined by '=>', not '->' \u2014 they are the ends of the tension, not a link: tension "\u2026" in workload => capacity (G-11)`, "'=>'");
      synchronize();
      return;
    }
    next();
    const to = expectIdent("the tension's end variable");
    if (to === null) {
      synchronize();
      return;
    }
    tensions.push({ id, from, to, name });
  };
  const parseSphereDecl = () => {
    const kw = next();
    spherePos.push({ line: kw.line, column: kw.column });
    let id;
    let label;
    if (peek().kind === "string") {
      label = next().value;
      id = derivedId(label, spherePos.length - 1, "sphere");
    } else {
      id = expectIdent("the sphere's identifier");
      if (id === null) {
        synchronize();
        return;
      }
      if (peek().kind === "string") {
        label = next().value;
      } else {
        error(peek(), `sphere '${id}' has no name; a sphere is named in the drawing's key, so give it one \u2014 sphere ${id} "Its name" holds a, b (G-12)`, "a quoted name");
      }
    }
    const holds = [];
    let note2;
    if (peek().kind === "atom" && peek().value === "holds") {
      next();
      do {
        const v = expectIdent("a variable the sphere holds");
        if (v !== null)
          holds.push(v);
        else
          break;
      } while (peek().kind === "comma" && (next(), true));
    }
    let said = false;
    if (peek().kind !== "lbrace") {
      if (holds.length === 0) {
        error(peek(), `sphere '${id}' holds nothing; name the variables it covers, e.g. holds a, b (G-12)`, "'holds' or '{'");
        said = true;
      }
    } else {
      next();
      while (peek().kind !== "rbrace" && peek().kind !== "eof") {
        const t = peek();
        if (t.kind !== "atom") {
          error(t, `expected 'holds' or 'note' inside a sphere block`, "'holds' or 'note'");
          synchronize();
          continue;
        }
        next();
        if (t.value === "holds") {
          do {
            const v = expectIdent("a variable the sphere holds");
            if (v !== null)
              holds.push(v);
            else
              break;
          } while (peek().kind === "comma" && (next(), true));
        } else if (t.value === "note") {
          if (peek().kind === "string")
            note2 = next().value;
          else
            error(peek(), `'note' takes a quoted string`, "a quoted string");
        } else {
          error(t, `'${t.value}' is not a sphere setting`, "'holds' or 'note'");
        }
      }
      if (peek().kind === "rbrace")
        next();
      else
        error(peek(), `the sphere block for '${id}' never closes`, "'}'");
    }
    if (holds.length === 0 && !said) {
      error(kw, `sphere '${id}' holds no variable; give it at least one 'holds' (G-12)`, "'holds'");
    }
    const decl = { id, holds };
    if (label !== void 0)
      decl.label = label;
    if (note2 !== void 0)
      decl.note = note2;
    spheres.push(decl);
  };
  const parseSignatureDecl = () => {
    const kw = next();
    signaturePos.push({ line: kw.line, column: kw.column });
    if (peek().kind !== "string") {
      error(peek(), `a signature defines an archetype and needs a name: signature "Referral bounce" { \u2026 }`, "a quoted signature name");
      synchronize();
      return;
    }
    const name = next().value;
    const roles = [];
    const couplings = [];
    let note2;
    if (peek().kind !== "lbrace") {
      error(peek(), `signature "${name}" defines nothing; give it a block of roles and 'meet' pairs (G-10)`, "'{'");
    } else {
      next();
      while (peek().kind !== "rbrace" && peek().kind !== "eof") {
        const key2 = peek();
        if (key2.kind !== "atom") {
          error(key2, `expected 'role', 'meet' or 'note' inside a signature`, "'role', 'meet' or 'note'");
          synchronize();
          continue;
        }
        next();
        if (key2.value === "role") {
          const role = expectIdent("a role name");
          if (role === null) {
            synchronize();
            continue;
          }
          const kindTok = peek();
          let kind = null;
          if (kindTok.kind === "atom" && kindTok.value === "reinforcing")
            kind = "R";
          else if (kindTok.kind === "atom" && kindTok.value === "balancing")
            kind = "B";
          if (kind === null) {
            error(kindTok, `role '${role}' needs the loop kind it requires: 'reinforcing' or 'balancing' (G-10)`, "'reinforcing' or 'balancing'");
            synchronize();
            continue;
          }
          next();
          let through;
          if (peek().kind === "atom" && peek().value === "through") {
            next();
            const vk = peek();
            if (vk.kind === "atom" && (vk.value === "ordinary" || vk.value === "goal")) {
              through = next().value;
            } else {
              error(vk, `'through' names the variable kind the role's loop must run through: 'ordinary' or 'goal' (A-13.3)`, "'ordinary' or 'goal'");
            }
          }
          roles.push(through === void 0 ? { role, kind } : { role, kind, through });
        } else if (key2.value === "meet") {
          const a = expectIdent("the first role of the pair");
          if (a === null) {
            synchronize();
            continue;
          }
          const b = expectIdent("the second role of the pair");
          if (b === null) {
            synchronize();
            continue;
          }
          let shares = 1;
          if (peek().kind === "atom" && peek().value === "twice") {
            next();
            shares = 2;
          }
          couplings.push({ roles: [a, b], shares });
        } else if (key2.value === "note") {
          if (peek().kind === "string")
            note2 = next().value;
          else
            error(peek(), `'note' takes a quoted string`, "a quoted string");
        } else {
          error(key2, `'${key2.value}' is not a signature setting`, "'role', 'meet' or 'note'");
        }
      }
      if (peek().kind === "rbrace")
        next();
      else
        error(peek(), `the signature block for "${name}" never closes`, "'}'");
    }
    signatures.push(note2 === void 0 ? { name, roles, couplings } : { name, roles, couplings, note: note2 });
  };
  const parseArchetypeDecl = () => {
    const kw = next();
    archetypePos.push({ line: kw.line, column: kw.column });
    if (peek().kind !== "string") {
      error(peek(), `an archetype declaration names a catalogue entry: archetype "Limits to Growth" { \u2026 }`, "a quoted archetype name");
      synchronize();
      return;
    }
    const archetype = next().value;
    const bindings = [];
    let note2;
    if (peek().kind !== "lbrace") {
      error(peek(), `archetype "${archetype}" binds no loops; give it a block of role-to-loop bindings, e.g. { engine "Growth engine" } (G-9)`, "'{'");
    } else {
      next();
      while (peek().kind !== "rbrace" && peek().kind !== "eof") {
        const key2 = peek();
        if (key2.kind !== "atom" || !IDENT.test(key2.value)) {
          error(key2, `expected a role name or 'note' inside the archetype block`, "a role or 'note'");
          synchronize();
          continue;
        }
        next();
        if (key2.value === "note") {
          if (peek().kind === "string")
            note2 = next().value;
          else
            error(peek(), `'note' takes a quoted string`, "a quoted string");
        } else if (peek().kind === "atom") {
          bindings.push({ role: key2.value, loop: next().value });
        } else if (peek().kind === "string") {
          byProse.push({ list: bindings, index: bindings.length });
          bindings.push({ role: key2.value, loop: next().value });
        } else {
          error(peek(), `role '${key2.value}' must bind a declared loop by its identifier (G-9)`, "a loop identifier");
        }
      }
      if (peek().kind === "rbrace")
        next();
      else
        error(peek(), `the archetype block for "${archetype}" never closes`, "'}'");
    }
    archetypeDeclarations.push(note2 === void 0 ? { archetype, bindings } : { archetype, bindings, note: note2 });
  };
  const parseAttributeBlock = (v, id) => {
    next();
    while (peek().kind !== "rbrace" && peek().kind !== "eof") {
      const key2 = peek();
      if (key2.kind !== "atom") {
        error(key2, `expected an attribute name inside ${id}'s block`, "an attribute");
        synchronize();
        continue;
      }
      next();
      if (key2.value === "exogenous") {
        v.exogenous = true;
      } else if (key2.value === "goal") {
        v.kind = "goal";
      } else if (key2.value === "note") {
        if (peek().kind === "string")
          v.note = next().value;
        else
          error(peek(), `'note' takes a quoted string`, "a quoted string");
      } else if (key2.value === "kind") {
        const val = peek();
        error(key2, `'kind' stopped parsing in v1.43: write '{ goal }' for a goal, and nothing at all for 'ordinary', which is the default (G-2.1)`, "'goal' or 'exogenous'");
        if (val.kind === "atom")
          next();
      } else {
        const val = peek();
        if (val.kind === "atom" || val.kind === "string") {
          next();
          (v.attributes ??= {})[key2.value] = val.value;
        } else {
          error(val, `attribute '${key2.value}' needs a value`, "a value");
        }
      }
    }
    if (peek().kind === "rbrace")
      next();
    else
      error(peek(), `${id}'s attribute block never closes`, "'}'");
  };
  const parseLinkOrVariable = () => {
    const first = peek();
    const isLink = peek(1).kind === "arrow" || // missing first mark — still a link (G-4 error)
    peek(1).kind === "atom" && MARKS.has(peek(1).value) && peek(2).kind === "arrow";
    if (!isLink) {
      const id = expectIdent("a variable id");
      if (id === null) {
        synchronize();
        return;
      }
      const v = touch(id, first);
      if (v.declaredAt !== void 0) {
        error(first, `'${id}' is already declared at line ${v.declaredAt.line}; a variable is declared explicitly at most once (V-1.1)`);
      }
      v.declaredAt = { line: first.line, column: first.column };
      if (peek().kind === "string")
        v.label = next().value;
      if (peek().kind === "lbrace")
        parseAttributeBlock(v, id);
      return;
    }
    const linkStart = { line: first.line, column: first.column };
    const from = expectIdent("the link's source variable");
    if (from === null) {
      synchronize();
      return;
    }
    const linkText = `from '${from}'`;
    const m1 = expectMark(`'${from}'`, linkText);
    if (peek().kind !== "arrow") {
      error(peek(), `expected '->' after the mark on '${from}'`, "'->'");
      synchronize();
      return;
    }
    next();
    const to = expectIdent("the link's target variable");
    if (to === null) {
      synchronize();
      return;
    }
    const m2 = expectMark(`'${to}'`, `'${from} -> ${to}'`);
    let delay;
    if (peek().kind === "atom" && peek().value === "~delay") {
      next();
      delay = peek().kind === "string" ? { text: next().value } : {};
    }
    const a = markToSign(m1);
    const b = markToSign(m2);
    const polarity = a === 0 || b === 0 ? "unknown" : a === b ? "same" : "opposite";
    touch(from, first);
    touch(to);
    linkPos.push(linkStart);
    const marks = { from: a, to: b };
    links.push(delay === void 0 ? { from, to, polarity, marks } : { from, to, polarity, marks, delay });
  };
  while (peek().kind !== "eof") {
    const t = peek();
    const STATEMENTS = {
      map: parseMapBlock,
      loop: parseLoopDecl,
      tension: parseTensionDecl,
      sphere: parseSphereDecl,
      archetype: parseArchetypeDecl,
      signature: parseSignatureDecl
    };
    const routine = t.kind === "atom" && oneOf("statement").includes(t.value) ? STATEMENTS[t.value] : void 0;
    if (routine !== void 0) {
      routine();
    } else if (t.kind === "atom" && t.value === "dominator") {
      error(t, `'dominator' was replaced by 'tension' in v1.31: tension "replenishment vs erosion" in workload => capacity \u2014 the two variables are the tension's ends, not an edge it passes through (G-11)`, "'tension'");
      synchronize();
    } else if (t.kind === "atom") {
      parseLinkOrVariable();
    } else {
      error(t, `a statement starts with ${saidAs(oneOf("statement"))}, or a variable identifier`, "a statement");
      synchronize();
    }
  }
  {
    const idOfProse = /* @__PURE__ */ new Map();
    for (const d of loopDeclarations) {
      if (d.name !== void 0 && !idOfProse.has(d.name))
        idOfProse.set(d.name, d.id);
    }
    for (const { list, index } of byProse) {
      const b = list[index];
      const id = idOfProse.get(b.loop);
      if (id !== void 0)
        list[index] = { role: b.role, loop: id };
    }
  }
  const vars = [...variables.entries()].map(([id, v]) => {
    const out = { id, kind: v.kind, exogenous: v.exogenous };
    if (v.label !== void 0)
      out.label = v.label;
    if (v.note !== void 0)
      out.note = v.note;
    if (v.attributes !== void 0)
      out.attributes = v.attributes;
    return out;
  });
  const document = {
    level,
    ...note.length > 0 ? { note } : {},
    variables: vars,
    links,
    loopDeclarations,
    tensions,
    spheres,
    archetypeDeclarations,
    signatures
  };
  if (title !== void 0)
    document.title = title;
  if (profile !== void 0)
    document.profile = profile;
  return {
    document,
    diagnostics,
    positions: {
      variables: variablePos,
      links: linkPos,
      loopDeclarations: loopPos,
      tensions: tensionPos,
      spheres: spherePos,
      archetypeDeclarations: archetypePos,
      signatures: signaturePos
    }
  };
}

// ../cli/dist/fmt.js
function toUnits(src) {
  const lines = src.split("\n");
  const units = [];
  let comments = [];
  let gapBefore = false;
  let i = 0;
  const statementKind = (line) => {
    const t = line.trim();
    if (/^map\b/.test(t))
      return "map";
    if (/^loop\b/.test(t))
      return "loop";
    if (/^archetype\b/.test(t))
      return "archetype";
    if (/^sphere\b/.test(t))
      return "sphere";
    if (/^tension\b/.test(t))
      return "tension";
    if (/^signature\b/.test(t))
      return "signature";
    const stripped = t.replace(/"[^"]*"/g, '""');
    if (stripped.includes("->"))
      return "link";
    return "variable";
  };
  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();
    if (t === "") {
      if (units.length > 0 || comments.length > 0)
        gapBefore = true;
      i++;
      continue;
    }
    if (t.startsWith("#")) {
      comments.push(raw.trimEnd());
      i++;
      continue;
    }
    const stmt = [];
    let depth = 0;
    let inString = false;
    let listOpen = false;
    do {
      const line = lines[i];
      stmt.push(line.trimEnd());
      let code = "";
      for (const ch of line) {
        if (ch === '"')
          inString = !inString;
        else if (!inString && ch === "{")
          depth++;
        else if (!inString && ch === "}")
          depth--;
        else if (!inString && ch === "#")
          break;
        code += ch;
      }
      listOpen = !inString && code.trimEnd().endsWith(",");
      i++;
    } while (i < lines.length && (depth > 0 || inString || listOpen));
    units.push({ comments, gapBefore, kind: statementKind(stmt[0]), lines: stmt });
    comments = [];
    gapBefore = false;
  }
  if (comments.length > 0) {
    units.push({ comments, gapBefore, kind: "other", lines: [] });
  }
  return units;
}
var LINK = /^(\w+)\s+([+\-?])\s+->\s+(\w+)\s+([+\-?])\s*(.*)$/;
var VARDECL = /^(\w+)\s*("(?:[^"]*)")?\s*(\{.*\})?$/;
var LOOPDECL = /^loop\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+("[^"]*"))?(?:\s+(.*))?$/;
function format(src) {
  const units = toUnits(src);
  let fromW = 0;
  let toW = 0;
  let idW = 0;
  let loopW = 0;
  for (const u of units) {
    if (u.lines.length !== 1)
      continue;
    if (u.kind === "link") {
      const m = LINK.exec(u.lines[0].trim());
      if (m !== null) {
        fromW = Math.max(fromW, m[1].length);
        toW = Math.max(toW, m[3].length);
      }
    } else if (u.kind === "variable") {
      const m = VARDECL.exec(u.lines[0].trim());
      if (m !== null)
        idW = Math.max(idW, m[1].length);
    } else if (u.kind === "loop") {
      const m = LOOPDECL.exec(u.lines[0].trim());
      if (m !== null)
        loopW = Math.max(loopW, m[1].length);
    }
  }
  const canonicalAttributes = (line) => line.replace(/\s+\}/g, " }").trimEnd();
  const emit = (u) => {
    if (u.lines.length === 1) {
      const t = u.lines[0].trim();
      if (u.kind === "link") {
        const m = LINK.exec(t);
        if (m !== null) {
          const [, from, m1, to, m2, rest] = m;
          const base = `${from.padEnd(fromW)} ${m1} -> ${to.padEnd(toW)} ${m2}`;
          return [rest === "" ? base : `${base}  ${rest}`.trimEnd()];
        }
      }
      if (u.kind === "loop") {
        const m = LOOPDECL.exec(t);
        if (m !== null) {
          const [, id, label, rest] = m;
          const parts = [`loop ${id.padEnd(label !== void 0 || rest !== void 0 ? loopW : 0)}`];
          if (label !== void 0)
            parts.push(label);
          if (rest !== void 0)
            parts.push(rest);
          return [parts.join(" ").trimEnd()];
        }
      }
      if (u.kind === "variable") {
        const m = VARDECL.exec(canonicalAttributes(t));
        if (m !== null) {
          const [, id, label, block] = m;
          const parts = [id.padEnd(label !== void 0 || block !== void 0 ? idW : 0)];
          if (label !== void 0)
            parts.push(label);
          if (block !== void 0)
            parts.push(block);
          return [parts.join(" ").trimEnd()];
        }
      }
    }
    return u.lines;
  };
  const order = [
    "map",
    "signature",
    "variable",
    "link",
    "sphere",
    "loop",
    "archetype",
    "tension",
    "other"
  ];
  const grouped = order.flatMap((k) => units.filter((u) => u.kind === k));
  const out = [];
  let prevKind = null;
  for (const u of grouped) {
    const groupChanged = prevKind !== null && u.kind !== prevKind;
    if (out.length > 0 && (groupChanged || u.gapBefore))
      out.push("");
    out.push(...u.comments);
    out.push(...emit(u));
    prevKind = u.kind;
  }
  return out.join("\n") + "\n";
}
function formatSafely(src, fmt = format) {
  const text = fmt(src);
  const errors = parse(text).diagnostics.filter((d) => d.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      errors: errors.map((d) => ({ line: d.line, column: d.column, message: d.message }))
    };
  }
  return { ok: true, text };
}

// ../cli/dist/support.js
function acceptedFlags(usage) {
  return new Set([...usage.matchAll(/(?<![a-z])(-{1,2}[a-z][a-z-]*)/g)].map((m) => m[1]));
}
function parseArgs(argv) {
  const positional = [];
  const flags = /* @__PURE__ */ new Map();
  const takesValue = /* @__PURE__ */ new Set([
    "--format",
    "--max-loops",
    "--max-length",
    "-o",
    "--view",
    "--loop",
    "--archetype",
    "--title",
    "--at",
    "--tension",
    "--identifier"
  ]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("-")) {
      if (takesValue.has(a) && i + 1 < argv.length) {
        flags.set(a, argv[++i]);
      } else {
        flags.set(a, true);
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}
function locate(parsed, file, element) {
  const { positions, document } = parsed;
  if (element.type === "variable") {
    const p = positions.variables[element.id];
    if (p !== void 0)
      return `${file}:${p.line}:${p.column}`;
  } else if (element.type === "link") {
    const idx = document.links.findIndex((l) => l.from === element.from && l.to === element.to);
    const p = positions.links[idx];
    if (p !== void 0)
      return `${file}:${p.line}:${p.column}`;
  } else if (element.type === "loopDeclaration") {
    const idx = document.loopDeclarations.findIndex((d) => d.id === element.loop);
    const p = positions.loopDeclarations[idx];
    if (p !== void 0)
      return `${file}:${p.line}:${p.column}`;
  } else if (element.type === "signature") {
    const idx = document.signatures.findIndex((sg) => sg.name === element.name);
    const p = positions.signatures[idx];
    if (p !== void 0)
      return `${file}:${p.line}:${p.column}`;
  } else if (element.type === "archetypeDeclaration") {
    const idx = document.archetypeDeclarations.findIndex((d) => d.archetype === element.archetype);
    const p = positions.archetypeDeclarations[idx];
    if (p !== void 0)
      return `${file}:${p.line}:${p.column}`;
  }
  return file;
}
function loadAndParse(file, io) {
  let src;
  try {
    src = io.readFile(file);
  } catch {
    io.err(`loop: cannot read ${file}`);
    return { failure: { code: 2 } };
  }
  return { parsed: parse(src) };
}

// ../cli/dist/run.js
var FORMAT_VERSION = "4.0.0";
function runValidate(file, f, io, profile) {
  const loaded = loadAndParse(file, io);
  if ("failure" in loaded)
    return loaded.failure;
  const { parsed } = loaded;
  const quiet = f.flags.has("--quiet");
  const strict = f.flags.has("--strict");
  const asJson = f.flags.get("--format") === "json";
  const analysis = analyse(parsed.document);
  const semantic = validate(parsed.document, analysis, { profile });
  const rows = [
    ...parsed.diagnostics.map((d) => ({
      location: `${file}:${d.line}:${d.column}`,
      severity: d.severity,
      rule: "parse",
      message: d.message + (d.found !== void 0 ? ` (found '${d.found}'` : "") + (d.expected !== void 0 ? `${d.found !== void 0 ? ", " : " ("}expected ${d.expected})` : d.found !== void 0 ? ")" : "")
    })),
    ...semantic.map((d) => ({
      location: locate(parsed, file, d.element),
      severity: d.severity,
      rule: d.rule,
      message: d.message
    }))
  ];
  const errors = rows.filter((r) => r.severity === "error").length;
  const warnings = rows.length - errors;
  if (asJson) {
    io.out(JSON.stringify({ formatVersion: FORMAT_VERSION, file, errors, warnings, diagnostics: rows }, null, 2));
  } else if (!quiet) {
    for (const r of rows) {
      io.out(`${r.location} ${r.severity} [${r.rule}] ${r.message}`);
    }
    io.out(rows.length === 0 ? `${file}: valid \u2014 no diagnostics` : `${file}: ${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}`);
  }
  if (errors > 0)
    return { code: 1 };
  if (strict && warnings > 0)
    return { code: 1 };
  return { code: 0 };
}
var kindWord2 = loopKindWord;
function runAnalyse(file, f, io, profile) {
  const loaded = loadAndParse(file, io);
  if ("failure" in loaded)
    return loaded.failure;
  const { parsed } = loaded;
  if (parsed.diagnostics.some((d) => d.severity === "error")) {
    for (const d of parsed.diagnostics) {
      io.err(`${file}:${d.line}:${d.column} ${d.severity} ${d.message}`);
    }
    io.err(`${file}: does not parse; fix the errors above before analysing`);
    return { code: 1 };
  }
  const maxLoops = Number(f.flags.get("--max-loops") ?? 1e4);
  const maxLength = Number(f.flags.get("--max-length") ?? 8);
  const quiet = f.flags.has("--quiet");
  const strict = f.flags.has("--strict");
  const asJson = f.flags.get("--format") === "json";
  const a = analyse(parsed.document, { maxLoops });
  const reported = a.loops.filter((l) => l.length <= maxLength);
  const omitted = a.loops.length - reported.length;
  const longest = a.loops.reduce((m, l) => Math.max(m, l.length), 0);
  const archetypes = profile?.verify(parsed.document, a) ?? [];
  const narrow = f.flags.get("--archetype");
  if (f.flags.has("--archetypes") && profile === void 0) {
    io.err(`loop analyse: --archetypes needs an archetype catalogue, and this build has none`);
    return { code: 2 };
  }
  const detection = f.flags.has("--archetypes") ? profile?.detect(parsed.document, a, {
    maxLength,
    ...typeof narrow === "string" ? { archetype: narrow } : {}
  }) ?? null : null;
  const RANK_SHOWN = 10;
  const ranking = f.flags.has("--rank") ? rankLoops(parsed.document, a, { maxLength, profile }) : null;
  const TENSIONS_SHOWN = 10;
  const tensions = f.flags.has("--tensions") ? detectTensions(parsed.document, a) : null;
  if (asJson) {
    io.out(JSON.stringify({
      formatVersion: FORMAT_VERSION,
      file,
      title: parsed.document.title ?? null,
      level: parsed.document.level,
      variables: parsed.document.variables.length,
      links: parsed.document.links.length,
      totals: a.totals,
      byLength: a.byLength,
      truncated: a.truncated,
      maxLength,
      omittedBeyondBound: omitted,
      loops: reported.map((l) => ({
        id: l.id,
        name: l.name ?? null,
        kind: l.kind,
        length: l.length,
        opposites: l.opposites,
        path: l.path,
        delays: l.delays
      })),
      archetypes: archetypes.map((v) => ({
        archetype: v.declaration.archetype,
        provenance: v.provenance,
        fit: v.fit,
        verifiable: v.verifiable,
        bindings: v.declaration.bindings.map((b) => ({
          role: b.role,
          loop: b.loop
        })),
        hinges: v.couplings.map((c) => ({
          roles: c.roles,
          variables: c.hinges
        })),
        failures: v.failures.map((f2) => ({ check: f2.check, message: f2.message }))
      })),
      ...tensions !== null ? {
        tensions: tensions.map((k) => ({
          from: k.from,
          to: k.to,
          witnesses: k.witnesses,
          paths: k.paths.map((x) => ({
            loop: x.loop,
            name: x.name ?? null,
            polarity: x.polarity,
            path: x.path,
            delays: x.delays
          }))
        }))
      } : {},
      ...ranking !== null ? {
        ranking: {
          maxLength,
          ranked: ranking.length,
          loops: ranking.map((s) => ({
            id: s.loop.id,
            name: s.loop.name ?? null,
            kind: s.loop.kind,
            length: s.loop.length,
            reach: s.reach,
            reachRatio: Number(s.reachRatio.toFixed(4)),
            delays: s.delays,
            declared: s.declared,
            archetypeRoles: s.archetypeRoles.map((r) => ({
              archetype: r.archetype,
              role: r.role
            }))
          }))
        }
      } : {},
      ...detection !== null ? {
        detection: {
          maxLength: detection.maxLength,
          consideredLoops: detection.considered,
          found: detection.found,
          truncated: detection.truncated,
          byHinge: detection.byHinge.map((g) => ({
            archetype: g.archetype,
            provenance: g.best.provenance,
            hinge: g.hinge,
            count: g.count,
            best: {
              archetype: g.best.archetype,
              totalLength: g.best.totalLength,
              assignment: g.best.assignment.map((r) => ({
                role: r.role,
                loop: r.loopId,
                ...r.loopName !== void 0 ? { name: r.loopName } : {}
              }))
            }
          }))
        }
      } : {}
    }, null, 2));
  } else if (!quiet) {
    const t = a.totals;
    io.out(`${parsed.document.title ?? file}: ${a.loops.length} feedback loops \u2014 ${t.R} reinforcing, ${t.B} balancing, ${t.I} indeterminate` + // A-9 on the stream that carries the report. The stderr warning below
    // says more, but stderr is not where a redirected report ends up, and
    // an unmarked total reads as a fact about the map.
    (a.truncated ? TRUNCATION_MARKER : ""));
    const dist = Object.entries(a.byLength).map(([len, n]) => `${len}:${n}`).join("  ");
    io.out(`by length  ${dist}`);
    io.out("");
    for (const l of reported) {
      const name = l.name !== void 0 ? ` "${l.name}"` : "";
      const delays = l.delays.length > 0 ? `  [${l.delays.length} delayed link${l.delays.length === 1 ? "" : "s"}]` : "";
      io.out(`${l.id.padEnd(4)}${kindWord2(l.kind).padEnd(14)} ${String(l.length).padStart(2)}  ${l.path.join(" -> ")}${name}${delays}`);
    }
    if (omitted > 0) {
      io.out("");
      io.out(`${omitted} longer cycles exist (up to length ${longest}); raise --max-length to see them`);
    }
    for (const v of archetypes) {
      io.out("");
      if (v.fit) {
        io.out(`archetype "${v.label}" \u2014 fits`);
        for (const c of v.couplings) {
          io.out(`  ${c.roles[0]} meets ${c.roles[1]} at ${c.hinges.length === 1 ? "hinge" : "hinges"} ${c.hinges.join(", ")}`);
        }
      } else if (!v.verifiable) {
        io.out(`archetype "${v.label}" \u2014 not yet verifiable (see 'loop validate' for what is unresolved)`);
      } else {
        io.out(`archetype "${v.label}" \u2014 does NOT fit; 'loop validate' names what failed`);
      }
    }
    if (tensions !== null) {
      io.out("");
      if (tensions.length === 0) {
        io.out(a.truncated ? `no tensions among the cycles examined${TRUNCATION_MARKER} \u2014 the enumeration was bounded, so this is not a statement about the map` : `no tensions \u2014 no pair of variables is joined by paths of both polarities`);
      } else {
        io.out(`${tensions.length} tension${tensions.length === 1 ? "" : "s"}${a.truncated ? TRUNCATION_MARKER : ""} \u2014 one act reaching one outcome two ways, with opposite signs. Which side wins is not computed (A-4):`);
        const idW = Math.max(...tensions.slice(0, TENSIONS_SHOWN).flatMap((k) => k.paths.map((x) => x.loop.length))) + 2;
        for (const k of tensions.slice(0, TENSIONS_SHOWN)) {
          io.out("");
          io.out(`  ${k.from} -> ${k.to}` + (k.witnesses > 1 ? `  (${k.witnesses} pairs of cycles show it)` : ""));
          for (const x of k.paths) {
            const via = x.path.slice(1, -1);
            io.out(`    ${x.loop.padEnd(idW)}${x.polarity.padEnd(9)}` + (via.length === 0 ? "directly" : `via ${via.join(" -> ")}`) + (x.delays > 0 ? `  [${x.delays} delayed link${x.delays === 1 ? "" : "s"}]` : ""));
          }
        }
        if (tensions.length > TENSIONS_SHOWN) {
          io.out("");
          io.out(`  ... and ${tensions.length - TENSIONS_SHOWN} more, not listed`);
        }
      }
    }
    if (ranking !== null) {
      io.out("");
      if (ranking.length === 0) {
        io.out(`nothing to rank among loops of length <= ${maxLength}`);
      } else {
        io.out(`ranked by the author's markers, then structural reach \u2014 reach counts the other cycles a loop shares an edge with, which is entanglement, not leverage:`);
        io.out("");
        for (const s of ranking.slice(0, RANK_SHOWN)) {
          const marks = [];
          for (const r of s.archetypeRoles)
            marks.push(`${r.archetype}:${r.role}`);
          if (s.declared && s.archetypeRoles.length === 0)
            marks.push("named");
          if (s.delays > 0)
            marks.push(`${s.delays} delayed`);
          io.out(`${s.loop.id.padEnd(4)}${kindWord2(s.loop.kind).padEnd(14)} len ${String(s.loop.length).padStart(2)}  reach ${String(s.reach).padStart(4)} (${(s.reachRatio * 100).toFixed(0).padStart(3)}% of the rest)` + (marks.length > 0 ? `  [${marks.join(", ")}]` : ""));
          io.out(`      ${s.loop.path.join(" -> ")}` + (s.loop.name !== void 0 ? `  "${s.loop.name}"` : ""));
        }
        if (ranking.length > RANK_SHOWN) {
          io.out("");
          io.out(`${ranking.length - RANK_SHOWN} more ranked loops not shown (all ${ranking.length} are in --format json)`);
        }
      }
    }
    if (detection !== null) {
      io.out("");
      if (detection.byHinge.length === 0) {
        io.out(`no archetype candidates among the ${detection.considered} loops of length <= ${detection.maxLength} \u2014 raise --max-length to widen the search`);
      } else {
        io.out(`archetype candidates \u2014 ${detection.found} pairings on ${detection.byHinge.length} hinge${detection.byHinge.length === 1 ? "" : "s"}, over ${detection.considered} loops of length <= ${detection.maxLength}. Suggestions only: write an 'archetype' block to make one a claim.`);
        for (const g of detection.byHinge) {
          io.out("");
          const more = g.count > 1 ? `  (+${g.count - 1} more pairing${g.count === 2 ? "" : "s"} here)` : "";
          io.out(`${g.label} at ${g.hinge}${more}`);
          for (const r of g.best.assignment) {
            const loop = a.loops.find((l) => l.id === r.loopId);
            io.out(`  ${r.role.padEnd(16)} ${r.loopId.padEnd(4)} ${loop.path.join(" -> ")}`);
          }
        }
      }
    }
  }
  if (a.truncated) {
    io.err(`enumeration stopped at ${maxLoops} loops \u2014 the map contains more; this report is INCOMPLETE (raise --max-loops)`);
    if (strict)
      return { code: 1 };
  }
  return { code: 0 };
}
function runFmt(file, f, io) {
  let src;
  try {
    src = io.readFile(file);
  } catch {
    io.err(`loop: cannot read ${file}`);
    return { code: 2 };
  }
  const parsed = parse(src);
  if (parsed.diagnostics.some((d) => d.severity === "error")) {
    io.err(`${file}: does not parse; fmt refuses to touch a file it cannot read back`);
    return { code: 1 };
  }
  const result2 = formatSafely(src);
  if (!result2.ok) {
    io.err(`${file}: fmt produced a document that does not parse \u2014 refusing to write it`);
    for (const d of result2.errors.slice(0, 3))
      io.err(`  ${d.line}:${d.column} ${d.message}`);
    io.err(`  this is a defect in fmt, not in ${file}; the file is unchanged`);
    return { code: 1 };
  }
  const formatted = result2.text;
  if (f.flags.has("--check")) {
    if (formatted !== src) {
      io.err(`${file}: not formatted (run 'loop fmt ${file}')`);
      return { code: 1 };
    }
    return { code: 0 };
  }
  if (formatted !== src)
    io.writeFile(file, formatted);
  return { code: 0 };
}
function runDiff(beforePath, f, io, profile) {
  const afterPath = f.positional[1];
  if (afterPath === void 0) {
    io.err(`loop diff: needs two files \u2014 'loop diff <before> <after>'`);
    io.err(`  history comes from git: git show HEAD:map.loop > /tmp/before.loop && loop diff /tmp/before.loop map.loop`);
    return { code: 2 };
  }
  const parsedPair = [];
  for (const p of [beforePath, afterPath]) {
    const loaded = loadAndParse(p, io);
    if ("failure" in loaded)
      return loaded.failure;
    if (loaded.parsed.diagnostics.some((d) => d.severity === "error")) {
      for (const d of loaded.parsed.diagnostics) {
        io.err(`${p}:${d.line}:${d.column} ${d.severity} ${d.message}`);
      }
      io.err(`${p}: does not parse; both versions must parse before they can be compared`);
      return { code: 1 };
    }
    parsedPair.push(loaded.parsed);
  }
  const result2 = compare(parsedPair[0].document, parsedPair[1].document, { profile });
  const quiet = f.flags.has("--quiet");
  const strict = f.flags.has("--strict");
  if (f.flags.get("--format") === "json") {
    io.out(JSON.stringify({
      formatVersion: FORMAT_VERSION,
      before: { file: beforePath, ...result2.before },
      after: { file: afterPath, ...result2.after },
      structuralChange: result2.structuralChange,
      findings: result2.findings.map((x) => ({
        category: x.category,
        subject: x.subject,
        message: x.message,
        ...x.path !== void 0 ? { path: x.path } : {},
        ...x.before !== void 0 ? { before: x.before } : {},
        ...x.after !== void 0 ? { after: x.after } : {}
      }))
    }, null, 2));
  } else if (!quiet) {
    const b = result2.before;
    const a = result2.after;
    io.out(`${beforePath} -> ${afterPath}: ${b.loops} loops (${b.R} R / ${b.B} B / ${b.I} I) -> ${a.loops} loops (${a.R} R / ${a.B} B / ${a.I} I)`);
    if (result2.findings.length === 0) {
      io.out("");
      io.out("no structural change: the two versions describe the same system");
    } else {
      const PER_CATEGORY = 4;
      const PATH_SHOWN = 6;
      const abbreviate = (x) => {
        if (x.path === void 0 || x.path.length <= PATH_SHOWN)
          return x.message;
        const short = `${x.path.slice(0, PATH_SHOWN).join(" -> ")} -> \u2026 (${x.path.length} variables)`;
        return x.message.replace(x.subject, short);
      };
      io.out("");
      let shownAny = false;
      for (const category of new Set(result2.findings.map((x) => x.category))) {
        const all = result2.findings.filter((x) => x.category === category);
        for (const x of all.slice(0, PER_CATEGORY)) {
          io.out(`[${category}] ${abbreviate(x)}`);
          shownAny = true;
        }
        if (all.length > PER_CATEGORY) {
          io.out(`[${category}] \u2026 and ${all.length - PER_CATEGORY} more`);
        }
      }
      io.out("");
      const n = result2.findings.length;
      io.out(`${n} change${n === 1 ? "" : "s"} in all \u2014 a description of what moved, not a judgement that it improved`);
      if (shownAny && n > PER_CATEGORY) {
        io.out(`every one of them is in --format json`);
      }
    }
  }
  if (strict && result2.structuralChange)
    return { code: 1 };
  return { code: 0 };
}
var RENAMED_FLAGS = [
  [
    "--contradictions",
    "--tensions",
    "v1.33",
    "the finding and the DSL statement that names it are both 'tension' now (C-15, C-16)"
  ],
  [
    "--contradiction",
    "--tension",
    "v1.33",
    "the finding and the DSL statement that names it are both 'tension' now (C-15, C-16)"
  ],
  [
    "--orbit",
    "--vortex",
    "v1.44",
    "the view is the CONNECTION VORTEX, beside the Connection Circle it is a reading of (C-21, R-33)"
  ],
  // `--hubs` is not a rename — the READING left the surface (ADR-032). It is in
  // this table anyway, because what a user needs is the same thing a rename
  // gives them: where the thing they asked for went. The vortex subsumes it —
  // same tiers, same sets, a stronger channel — so `--vortex` is a true answer
  // and not a consolation.
  [
    "--hubs",
    "--vortex",
    "v1.46",
    "the connection vortex SUBSUMES the hubs reading \u2014 same tiers, drawn in position rather than in colour (ADR-032, R-33)"
  ]
];
var LANGUAGE_COMMANDS = [
  {
    name: "validate",
    needsFile: () => true,
    usage: `  loop validate <file> [--strict] [--quiet] [--format text|json]`,
    run: runValidate
  },
  {
    name: "analyse",
    aliases: ["analyze"],
    needsFile: () => true,
    usage: `  loop analyse  <file> [--format text|json] [--max-loops N] [--max-length N] [--strict] [--quiet]
                       [--archetypes]                suggest undeclared archetypes (A-14)
                       [--archetype <name>]          narrow the suggestions to one
                       [--rank]                      which loop to look at first (A-15)
                       [--tensions]                     pairs of paths that contradict each other (A-19)`,
    run: runAnalyse
  },
  {
    name: "fmt",
    needsFile: () => true,
    usage: `  loop fmt      <file> [--check]`,
    run: runFmt
  },
  {
    name: "diff",
    needsFile: () => true,
    usage: `  loop diff     <before> <after> [--strict] [--quiet] [--format text|json]
                       what changed structurally between two versions (A-16)
                       history comes from git:
                         git show HEAD:map.loop > /tmp/before.loop
                         loop diff /tmp/before.loop map.loop`,
    run: runDiff
  }
];
var usageFor = (commands) => ["usage:", ...commands.map((c) => c.usage)].join("\n");
function run(argv, io, commands = LANGUAGE_COMMANDS, profile) {
  const [name, ...rest] = argv;
  const f = parseArgs(rest);
  const file = f.positional[0];
  const usage = usageFor(commands);
  if (name === void 0 || name === "--help" || name === "help") {
    io.out(usage);
    return { code: name === void 0 ? 2 : 0 };
  }
  for (const [was, now, since, why] of RENAMED_FLAGS) {
    if (f.flags.has(was)) {
      io.err(`loop: '${was}' was renamed to '${now}' in ${since} \u2014 ${why}`);
      return { code: 2 };
    }
  }
  const command = commands.find((c) => c.name === name || (c.aliases ?? []).includes(name));
  if (command === void 0) {
    io.err(`loop: unknown command '${name}'`);
    io.err(usage);
    return { code: 2 };
  }
  const accepted = acceptedFlags(command.usage);
  const unknown = [...f.flags.keys()].filter((k) => !accepted.has(k));
  if (unknown.length > 0) {
    io.err(`loop ${command.name}: unknown ${unknown.length === 1 ? "flag" : "flags"} ${unknown.join(", ")}`);
    io.err(command.usage);
    return { code: 2 };
  }
  if (file === void 0 && command.needsFile(f)) {
    io.err(usage);
    return { code: 2 };
  }
  return command.run(file, f, io, profile);
}

// ../cli/dist/language-bin.js
var result = run(process.argv.slice(2), {
  readFile: (p) => readFileSync(p, "utf8"),
  writeFile: (p, c) => writeFileSync(p, c),
  out: (line) => console.log(line),
  err: (line) => console.error(line)
});
process.exit(result.code);
