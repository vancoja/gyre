# Loop — the skills, as a plugin — v1.53.1

Two Agent Skills, so an agent can **author** a story loop with you and **write**
it as a valid `.loop` document. Neither draws: the picture is the Obsidian
plugin's, the viewer's or the Figma plugin's job, and they are all in this same
release.

| Folder | |
| --- | --- |
| `loop-authoring/` | the method — arriving at the variables and causal claims, with the evidence for each |
| `loop-notation/` | writing, editing and checking the document, and running the real analysis |

## Installing

**As a Claude Code plugin**, which is the short way — the plugin is published to
the `gyre` marketplace:

```
/plugin marketplace add vancoja/gyre
/plugin install Loop@Gyre
```

`/plugin update Loop@Gyre` moves you to a later release. An installed
plugin is copied into a per-version cache, so a release you already have keeps
working whatever happens to the repository afterwards.

**Or by hand.** A skill is a directory with a `SKILL.md` in it, and the two
under `skills/` here are exactly that. Where the directory goes depends on where
you want the skill:

- **Claude Code, this machine** — copy the folder into `~/.claude/skills/`
  (personal) or `.claude/skills/` in a project. It loads on the next session.
- **claude.ai, Cowork, cloud sessions** — upload the folder as a skill from the
  skills settings on claude.ai, and enable it. Cowork and cloud sessions load
  the skills enabled for your account.
- **Another agent** — both skills use only the six frontmatter fields the
  [Agent Skills](https://agentskills.io) spec defines, so they load anywhere the
  standard is implemented.

Take one or both. `loop-notation` is useful on its own; `loop-authoring` hands
its result to it.

## What is in this folder

| File | |
| --- | --- |
| `.claude-plugin/plugin.json` | the plugin manifest — what `/plugin install` reads |
| `skills/loop-authoring/SKILL.md` | the authoring skill |
| `skills/loop-notation/SKILL.md` | the notation skill |
| `skills/loop-notation/reference/syntax.md` | the grammar, copied unchanged from the project's docs |
| `skills/loop-notation/reference/writing-your-first-map.md` | the walkthrough, likewise — so neither can drift |
| `skills/loop-notation/scripts/loop.mjs` | the CLI, one file, no dependencies |

`skills/loop-notation/scripts/loop.mjs` needs only Node. It reaches no network and installs nothing:

```bash
node scripts/loop.mjs validate map.loop
node scripts/loop.mjs analyse  map.loop
node scripts/loop.mjs fmt      map.loop --write
```

That bundle is what makes the skills' one rule enforceable rather than merely
stated: **nothing is said about a map's feedback loops that the tool did not
compute.** Where there is no Node, the skills still write and edit maps — and
say nothing about their loops, which is the correct answer rather than a
degraded one.

**It cannot seed.** `loop seed` writes a starter map from one of the ten System
Archetypes, and those templates are transcribed from the book the method comes
from, so they are left out of a skill that travels. Use the full tool for that.

## In a vault

Ask for a map and put the result in a note as a fenced ```` ```loop ```` block.
The Loop Obsidian plugin — `obsidian/` in this same release — draws it, computes
the loops, and reports diagnostics in place. The block is the map: there is no
export step and no second copy to keep in step.

## Licence

Apache License 2.0. The full text and the copyright notice are in the
repository's `LICENSE` and `NOTICE`; third-party material is recorded in
`THIRD-PARTY-NOTICES.md`.
