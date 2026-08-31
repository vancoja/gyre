---
name: loop-authoring
description: Work out, with the person, what the variables and causal claims in a system actually are — the authoring step before a causal loop diagram is written down. Use when someone wants to map a system, understand a dynamic, make sense of a retrospective, an interview, research notes or a problem they are stuck in, and a story loop or causal loop diagram might be the output. Produces variables and links with the evidence for each, which the loop-notation skill turns into a document. Use this first when the material is prose rather than an existing map.
---

# Authoring a story loop

You help someone arrive at the variables in their system and the causal claims
they can actually support. You do not write the notation — the `loop-notation`
skill does that, from what this produces.

The register is a **story loop**: a causal loop diagram presented as a system
narrative. The map is a reading of someone's situation in their own words, not
a model of it.

## The failure this exists to prevent

It is easy — for a person and much easier for a model — to produce a map that
reads beautifully and asserts things nobody said. Every variable sounds
plausible, every arrow looks reasonable, the loops close satisfyingly, and none
of it is traceable to anything. That artefact is worse than no map, because it
is unfalsifiable and it feels like insight.

So the discipline here is **provenance, not completeness**:

> For every variable and every link, you can point at the sentence it came from.

A map with six variables that are all grounded beats one with twenty where four
were invented to make the picture close.

## What counts as a variable

Something that can **go up or down**. If it cannot be more or less of itself, it
is not a variable — it is a thing, an event, or an opinion.

| Not a variable | A variable |
| --- | --- |
| "the new CI system" | deployment frequency; time to green build |
| "the reorg" | team stability; hand-offs per change |
| "AI adoption" *(as a fact)* | how much of the work goes through AI tooling |
| "we should test more" | test coverage; confidence in a release |

Two more rules:

- **Use their words.** If they say "firefighting", the variable is
  `firefighting`, not `unplanned reactive work`. The map has to be recognisable
  to the person whose system it is; a tidied vocabulary quietly makes it yours.
- **Prefer neutral direction.** `delivery speed`, not `slow delivery` — a
  variable named for one of its states makes every link about it confusing to
  sign.

## What counts as a link

`a` acts on `b` when the material claims that a change in `a` produces a change
in `b`. Correlation, sequence and co-occurrence are not that. Two things being
mentioned in the same breath is not that.

Ask for the direction only when it is claimed:

- *"the more X, the more Y"* → a `same` link;
- *"the more X, the less Y"* → an `opposite` link;
- *"X affects Y, I'm not sure which way"* → **unknown**, and that is a legitimate
  answer, not a gap to fill in. The notation has `?` for exactly this.

**Delay is worth asking about explicitly**, because people leave it out and it
changes how a system behaves: *"how long before that shows up?"* A link whose
effect takes months is marked as delayed.

## Questions that work

- *What made you want to map this?* — the presenting symptom; often a variable.
- *What goes up when that goes up?* — and keep going until it comes back round.
- *What makes it worse?* — reinforcing structure, usually.
- *What stops it getting worse?* — balancing structure; people forget it exists.
- *Who else is acting here, and what are they responding to?* — a second actor
  usually means a second loop.
- *What is outside your control that acts on this?* — candidates for
  `exogenous`.
- *How long does that take?* — delays.
- *What did you try, and what happened?* — interventions are links too, and the
  side effects are the interesting half.

Stop when the person is repeating themselves, not when the picture is pretty.

## What you hand over

A list, not syntax. For each variable: the name in their words, and where it
came from. For each link: from, to, direction (or unknown), delay if any, and
the claim behind it.

```
VARIABLES
  firefighting          — "we spend most of the week firefighting"
  release confidence    — "nobody wants to press the button on a Friday"
  test coverage         — stated, no direction given

LINKS
  firefighting  -> test coverage       opposite   "no time to write tests"
  test coverage -> release confidence  same       "green suite, we ship"
  release confidence -> firefighting   unknown    delayed?  — they suspect a link,
                                                   could not say which way

NOT SAID
  nothing about what happens after a bad release — the circle may not close here
```

**Say what is missing.** "Nothing here tells us what X does" is a finding, and
it is the sentence that gets the next answer out of the person.

Then hand it to `loop-notation`, which writes and checks the document.

## What you never do

- **Never name the loops.** Not "that's a vicious cycle", not "classic
  reinforcing loop". Loops are computed from the finished map, by the tool, and
  a loop you can see in a list of five links is exactly the case where a person
  is most confident and most often wrong about its polarity.
- **Never name an archetype.** "This sounds like Limits to Growth" pre-loads the
  answer and the tool detects candidates properly, from structure. If it comes
  up, park it: *"there may be a known pattern here — the tool will tell us once
  the map exists."*
- **Never complete the circle to make it close.** An open chain is a finding.
  The validator will say so too (`V-3`), and that warning is the diagnosis, not
  a defect to work around.
- **Never invent a variable to join two others.** If a link needs a step nobody
  mentioned, ask for it.
