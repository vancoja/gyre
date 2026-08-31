---
name: loop-notation
description: Write, edit and check a Loop story-loop document — the `.loop` diagram-as-code notation for causal loop diagrams. Use when asked to produce a loop map, a causal loop diagram, a story loop or a Connection Circle; to put one in a note for the Obsidian plugin as a ```loop block; to fix syntax errors in a `.loop` file; or to change a map that already exists. Also use before saying anything about a map's feedback loops, because this skill runs the tool that computes them rather than guessing.
---

# Writing a loop document

You turn variables and causal claims into a valid Loop document.

Read `reference/syntax.md` for the grammar and `reference/writing-your-first-map.md`
for the shape of a first map. They are the project's own documents, copied here
unchanged — prefer them to anything you remember about the notation.

## The rule that matters more than the syntax

**Never state anything about a map that the tool did not compute.**

Not how many feedback loops it has. Not whether one is reinforcing or
balancing. Not which archetype it resembles. Not "this is a virtuous cycle",
"these reinforce each other", or "this loop will run away". A causal loop
diagram *looks* like it can be read off the words, and it cannot — that is the
entire reason this notation exists.

You write the variables and the links. **The loops are derived**, by
`loop analyse` or by the Obsidian plugin drawing the block. If neither has run,
say nothing about them — and say that you have not:

> I have not run the analysis, so I can't tell you what loops this closes.

That sentence is a correct answer. A confident guess is not.

## What a document looks like

```
# One line on what this map is about.
map "Housing affordability" { profile systemic-design/story-loop  level causal }

speculation      "speculation"
house_prices     "house prices"
housing_demand   "housing demand"
interest_rates   "interest rates" { exogenous }

speculation    + -> house_prices   +
house_prices   + -> speculation    +
house_prices   + -> housing_demand -
interest_rates + -> house_prices   -
```

**Always write the `map "…"` block.** It is optional in the grammar — a document
without one is valid and renders as *"Untitled map"* — but it is how a map is
named, and how one block among several in the same note is addressed later.
A map you cannot refer to by name is a map nobody can ask you to change.

Pick `level`:

- **`influence`** — you know what acts on what, not in which direction. Links
  carry `?`. This is the honest level for a first pass, a workshop capture, or
  anything drawn from someone else's account. It is not a lesser map.
- **`causal`** — every link is signed `+` or `-` at both ends, and every
  variable is connected. Move up to this when the material supports it, not
  when the map looks tidier.

Starting at `causal` and inventing polarities to satisfy the validator is the
most common way to produce a confident, wrong map. Start at `influence` and
earn the signs.

**That example validates with one warning, on purpose.** `housing_demand` takes
part in no feedback loop, so `V-3` fires. It is left in because it is a true
finding about an abridged map — a chain that has not been closed — and because
the section on diagnostics below is about exactly this. **Do not "fix" it by
deleting the variable or by dropping to `influence`.**

## Two constructs a first map often wants

The reference has the whole grammar. These two are named here because a workshop
map usually needs them and neither is guessable:

```
sphere "Employer" holds workload, hiring
sphere "Employee" holds fatigue, hours_worked, attrition

tension "Balancing" in workload => capacity
```

- **`sphere`** groups variables by who or what they belong to — a stakeholder, a
  domain, a part of the organisation. A variable may be in several spheres or in
  none, and the grouping is yours: the tool draws it and computes nothing from
  it. The name is required, because it is what a reader sees in the legend.
- **`tension`** names a pair of variables that pull against each other. The tool
  checks whether it can find two paths between them whose polarities disagree,
  and **warns rather than errors when it cannot** — your claim stands and the
  tool says it could not corroborate it.

Everything else — `{ goal }`, a variable `note "…"`, `~delay` on a link,
`archetype` and `signature` declarations — is in `reference/syntax.md`. Read it
rather than guessing; it is the project's own document, not a summary.

## Where the document goes

One document. Where it lands is the caller's business, not a different product:

- **shown in chat** — in a fenced block, to read or copy out;
- **written to a `.loop` file** — beside the work;
- **wrapped in a ```` ```loop ```` fence inside a Markdown note** — which the
  Loop Obsidian plugin renders as the drawing, with the loops computed and the
  diagnostics in place.

In a vault, the fence is the map. There is no separate file to keep in step and
no export step.

## Changing a map that already exists

A note is a file and a fence is a region in it, so edit it in place: read the
note, replace the body of the block, write it back.

**Address a block by its map name**, not by its position — `map "Housing
affordability"` is what identifies it, and a note may hold several.

## Running the tool

If `scripts/loop.mjs` is beside this file and `node` is available, you have the
real thing. Check once:

```bash
node --version && node scripts/loop.mjs --help
```

Then, on the document you are about to hand over — write it to a temporary file
first if it is going into a fence:

```bash
node scripts/loop.mjs validate map.loop     # errors and warnings, with line numbers
node scripts/loop.mjs fmt map.loop          # canonical form, rewritten in place
node scripts/loop.mjs analyse map.loop      # THE loop count and their kinds
```

Three habits, in this order:

1. **`validate` before you hand anything over.** A broken map in a note is
   worse than no map: the plugin will show diagnostics where the reader
   expected a drawing.
2. **`fmt` so the document lands in canonical form**, not in whatever shape you
   happened to emit. It rewrites the file in place — there is no `--write`, and
   `--check` is the flag that only reports. Alignment is part of the notation's
   readability.
3. **`analyse` before you say anything about the system** — and quote what it
   printed, rather than paraphrasing it into a claim it did not make.

**This bundle cannot seed.** `loop seed` writes a starter map from one of the
ten System Archetypes, and its templates are transcriptions from the book the
method comes from, so they are left out of a skill that travels. Seeding is a
job for the full tool.

`analyse --archetypes` proposes candidate archetypes with a hinge variable.
Those are *proposals to judge*, not findings: report them as suggestions and
never as "this map is a Limits to Growth".

If there is no `node`, you can still write and edit maps. You cannot say what
loops they close — so don't.

## Diagnostics are the point

When `validate` reports something, read it rather than working around it:

- **`V-1`** — a syntax or reference error. Fix it.
- **`V-3`** — a variable in no loop at `causal` level. Usually a missing link,
  which is a real finding about the map. Do not silence it by deleting the
  variable or by dropping to `influence`; ask what closes the circle. If the
  variable genuinely acts from outside the system, mark it `{ exogenous }` —
  that is a claim, and the tool checks it.

A warning that survives because it is true is a better outcome than a clean run
that was arranged.

## What you do not do

- You do not draw. The viewer, the Obsidian plugin and the Figma plugin draw;
  they all use the same renderer and none of them lives here.
- You do not declare loops. There is no syntax for asserting a loop's polarity
  and there is not meant to be — `loop "…" via a -> b` names a loop the tool
  already found, it does not create one.
- You do not invent archetype definitions. The catalogue is in the tool.
