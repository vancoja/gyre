# The Loop syntax reference

This page documents every construct in the notation (NFR-6). Loop's notation is
the **story loop** of *Design Journeys*: a causal loop diagram constructed and
presented as a system narrative. It is written for a practitioner, not a
programmer: if you have ever drawn an influence map on a whiteboard, everything
here will read as the thing you already do, typed. A stranger to Loop should be able to write a valid map from
this page alone — that is this document's acceptance test, and the code blocks
below are parsed by the test suite, so what you read is known to work.

A map is a plain-text file with the extension `.loop`, UTF-8 encoded. The
smallest valid map is one causal link:

```loop
coffee + -> alertness +
```

Read it aloud: *more coffee, more alertness*. That reading is the whole design.

---

## 1. Links

A link is written with a **direction-of-change mark at each end**, naming what
happens to each variable:

```loop
workload      + -> hours_worked  +
fatigue       + -> quality       -
quality       - -> rework        +
```

- `workload + -> hours_worked +` — *more workload, more hours worked*
- `fatigue + -> quality -` — *more fatigue, less quality*
- `quality - -> rework +` — *less quality, more rework*

The link's **polarity** follows from whether the marks agree:

| Marks | Meaning | Drawn as |
|---|---|---|
| agree (`+ … +` or `- … -`) | the variables move in the **same** direction | **(S)** mid-link |
| disagree (`+ … -` or `- … +`) | they move in **opposite** directions | **(O)** mid-link |

`(S)` and `(O)` are derived labels — you never type them. And because the
polarity is one fact however you narrate it, `a + -> b -` and `a - -> b +` are
the **same link**; the formatter preserves whichever direction you were
thinking in.

### Unknown polarity

When you know one thing influences another but not yet which way, write `?` at
the end:

```loop
mgmt_pressure + -> workload ?
```

*More management pressure, and workload changes — direction not yet known.*
This is the influence-map state, a deliberate statement rather than an
omission. Both marks are always required; leaving one out is a syntax error,
so an unsigned link can never be a slip.

### Delay

A link where the cause takes appreciable time to reach the effect carries a
delay marker, with optional text:

```loop
hiring + -> capacity +  ~delay "onboarding ramp"
```

Delay is annotation: it renders as the conventional double hatch and appears
in the analysis report, but it never changes a loop's classification. Watch
where you put it — in almost every classic archetype, the delayed link is the
one that makes the pattern pathological.

---

## 2. Variables

A variable is **created by appearing in a link** — no declaration needed. You
declare one explicitly only to attach a human label or attributes:

```loop
fatigue   "Fatigue"
capacity  "Team capacity"
```

The identifier (`letters`, `digits`, `_`, starting with a letter) is the
variable's identity; the quoted label is what renders. A variable may be
declared explicitly at most once.

### Naming variables

Name the **continuous, neutral quantity**, not a direction:
`health_status`, not `better_health` — the marks are what say better or worse,
and a directional name double-counts them (the validator warns about this).
Anything that can vary in degree qualifies: a quantity, an intensity, a
frequency, an emotional state, the level of a conflict. A one-off occurrence
with no more-or-less to it does not.

### Kinds and the exogenous flag

Attributes go in braces after the label:

```loop
goal_level  "Sales target"          { goal }
regulation  "Planning regulation"   { exogenous }
standard    "Performance standard"  { goal  exogenous }
```

- `goal` — this variable is a **reference level a balancing loop seeks**: the
  *desired level* in the classic balancing-loop drawing. Role is meaning, so
  you state it; the tool never guesses it.
- `exogenous` — a **structural claim**: this variable acts on the system from
  outside and takes part in no feedback loop (a limiting condition, a resource
  cap, an interest rate). The tool verifies the claim: an "exogenous" variable
  found inside a loop is an error, and a variable in no loop that *isn't*
  declared exogenous gets a warning, because an unclosed causal chain usually
  means a link is missing.

The two combine: an external reference level nothing in the system feeds — the
`performance standard` of the Growth and Underinvestment archetype — is
`{ goal  exogenous }`.

Both are **drawn**, so a reader of the picture sees what you claimed: a goal
gets a second ring inside its atom, an exogenous variable gets a dashed
outline, and the word hangs outside the atom.

`{ kind goal }` is what this attribute used to be called. It **stopped parsing
in v1.43** — writing it now is an error that names `{ goal }` as its
replacement. If you have a map from before that, change `{ kind goal }` to
`{ goal }` and delete `kind ordinary` outright; ordinary is the default and
never needed saying.

### Saying what a variable means

Neutral continuous names are right for the marks, but they hide the
definition. `note` says the rest:

```loop
house_prices "House prices" {
  note "Median transaction price, not asking price: the supply side responds
        to what actually clears, and asking prices lag it by a quarter."
}
```

This is the same `note` a loop or an archetype takes — free prose, never
analysed, and it is where the argument actually lives: *median, not asking*
is the sort of distinction a reader needs in order to disagree with you. A
`#` comment cannot do this job, because comments are not part of the
document and never reach a drawing.

Notes appear where a drawing is **about** the variable: under a single-loop
ring, under a highlighted map, under an archetype view — never under the
plain Connection Circle, where forty definitions would bury the map. Every
variable also carries its note as a tooltip you can hover in the viewer.

---

## 3. The map block

Optional metadata, anywhere in the file (conventionally at the top):

```loop
map "Team burnout" {
  profile  systemic-design/story-loop
  level    causal
}
```

- **title** — the quoted string, used in rendering.
- **profile** — the notation family: `systemic-design/story-loop`, the only
  profile in v1. A story loop **is** a causal loop diagram — one built and told
  as a system narrative — so if you arrived here knowing classical CLDs,
  everything transfers; what changes is that variables may be experiences, and
  the drawing is meant to be read aloud.
- **level** — your claim about the map's maturity: `influence` (default) or
  `causal`. See §5.

---

## 4. Loops — computed, never declared

You do not draw loops. You write variables and links; Loop enumerates **every
elementary cycle** in the map and classifies each one:

- **Reinforcing (R)** — an even number of `(O)` links around the cycle. It
  amplifies change.
- **Balancing (B)** — an odd number. It counteracts change.
- **Indeterminate (I)** — any link still `?`. Reported as such, never guessed.

The classification has a story form you can check by hand: start anywhere,
assume the variable rises, and follow the links — `(S)` carries the direction,
`(O)` flips it. Come back **rising** and the story closes on itself:
reinforcing. Come back **falling** and the story contradicts itself:
balancing. The renderer draws this narration on any single loop.

Beware the textbook shortcut: "reinforcing loops are all `(S)`" holds only for
the simplest loops. A loop with **two** `(O)` links is reinforcing — even
count — and loops like that are usually the interesting ones.

### Naming a loop

Loops get generated identifiers (`R1`, `B2`, `I3`) that renumber when the map
changes. To refer to a loop durably, declare it — an identifier of your own,
optionally some prose, and one or more edges it passes through:

```loop
demand + -> price +
price  + -> demand -

loop market_brake "Market brake" via price -> demand
```

That is a variable's shape, and for the same reasons. `market_brake` is what
other statements point at — an `archetype` block binds it by this identifier —
and `"Market brake"` is what you and your readers see: on the drawing, in the
report, in a diff. The prose is optional, and the identifier stands in when it
is absent:

```loop
demand + -> price +
price  + -> demand -

loop market_brake via price -> demand
```

Two loops may be *called* the same thing; no two may share an identifier.

`loop "Market brake" via price -> demand` — the name on its own, with no
identifier — parses too, and is the same short form a `sphere` and a `tension`
take. One is folded from the prose behind the scenes (`market_brake`), so an
archetype still has something to bind. `fmt` leaves the line exactly as you
wrote it; write the identifier out yourself when you want it visible, which is
worth doing as soon as something else points at the loop.

> **Changed in v1.43.1.** `fmt` used to expand this for you. It no longer does —
> it expanded neither the sphere nor the tension form, and one of three
> identical openings behaving differently was the whole of the reason.

The `via` edges must match **exactly one** cycle. If they match several, the
error tells you the smallest set of edges to add — you never work it out
yourself. Note what naming is *not*: there is no syntax anywhere in Loop by
which you can state a loop's polarity. That is computed, always.

A loop declaration can carry commentary in a block:

```loop
supply  + -> price   -
price   + -> supply  +

loop supply_response "Supply response" {
  via   price -> supply
  note  "Producers chase price; the response overshoots because
         capacity arrives in lumps."
}
```

`note` is free prose (strings may span lines). It never affects analysis.

### Declaring an archetype

Once loops are named, you can propose that they form one of the ten **System
Archetypes** — Limits to Growth, Shifting the Burden, Fixes that Fail, and
the rest of Senge's catalogue.

If the ten are new to you, *A Pocket Guide to Using the Archetypes* walks
through each one with an example, at
`https://thesystemsthinker.com/a-pocket-guide-to-using-the-archetypes/`, and it
is included in the Systemic Design Toolkit's download at
`https://www.systemicdesigntoolkit.org/download`. Loop computes whether a shape
*fits*; those explain what each shape means and what to do about it.

The declaration binds each *role* of the archetype's signature to one of your
declared loops, by that loop's identifier:

```loop
efforts + -> result         +
result  + -> efforts        +
result  + -> slowing_action +
slowing_action + -> result  -

loop growth_engine    "Growth engine" via efforts -> result
loop slowing_response "Slowing response" via result -> slowing_action

archetype "Limits to Growth" {
  engine growth_engine
  limit  "Slowing response"
}
```

This is a **hypothesis, and the tool tests it**: verification checks that
each bound loop computes to the kind its role requires (the engine
reinforcing, the limit balancing) and that the loops actually meet — share a
variable — where the archetype requires. When it fits, `analyse` reports the
fit and the computed **hinge variables** where the forces meet. When it does
not, `validate` names exactly what failed — the role whose loop has the
wrong character, or the pair of loops that never touch — so your next
approximation is informed. Note what the syntax cannot say: nothing here
states a polarity, a kind, or a hinge. As with loops, whether the claim
holds is computed, never asserted.

The roles are fixed per archetype (the error message lists them if you use
one that doesn't exist). Trying an archetype that turns out not to fit is
the method working, not a mistake — the abductive process is successive
approximation, and a refuted hypothesis is a finding.

One archetype asks for more than structure: **Eroding Goals** requires its
eroding loop to run through a variable you marked `{ goal }`, because
the loop that matters is the one that *moves the goal*. Without that, the
shape is just two balancing loops that meet, which describes half of any
real map.

### What the figure tells you about the pattern

Draw an archetype as its own figure and it carries the pattern's description
under the heading — what it does, and on a card written that way, an example
and something to try:

```
$ loop render housing.loop --archetype "Limits to Growth"
$ loop render housing.loop --archetype "Tragedy of the Commons" --at house_prices
```

The second one matters most: it is a **proposal**, naming a pattern you may
never have met, and a figure of an archetype you cannot name is a picture of
nothing.

Where the words come from depends on what the file is. A file that **is** an
archetype's card — `profile systemic-design/archetype`, declaring that
archetype — describes it in its own opening `#` comment, and the figure reads
that, so editing the comment changes the figure. Any other map takes the
catalogue's card, because an ordinary map's opening comment is about *your*
system, not about the archetype: it would caption a Limits to Growth figure
with a paragraph about your housing market.

Write a card's comment in parts if you like, one per line, and they are drawn
as parts:

```
# *Behaviour* - When parties misunderstand each other, the relationship erodes.
# *Example* - A marriage where small misreadings compound into divorce.
# *Possible strategy* - Get A and B into dialogue about the shared vision.
```

A comment with no such line is drawn as the paragraph it is. Either way the
comment is inert: nothing in it reaches the analysis.

### Starting from an archetype

The other direction: rather than finding an archetype in a map you wrote, start
from one and grow outward.

```
$ loop seed --list
$ loop seed "Limits to Growth" --title "Team growth" -o growth.loop
wrote growth.loop — a Limits to Growth to grow outward from
rename its variables to yours, then: loop validate growth.loop
```

What you get is the card as a map: its variables, its links, its named loops
and its `archetype` block — already valid, already formatted, and already
verifying. Rename the variables to the things in *your* system (they arrive as
the card's own words), then add what the archetype does not know about.

The `archetype` block is the point. It stays in the file as a hypothesis the
tool keeps checking, so months later, when the map has grown, `loop validate`
will tell you if it has outgrown the pattern you started from. That is a
finding, not a failure — it is the moment the method exists to reach.

Only the ten can be seeded: a `signature` you wrote states a shape, not the
variables and links that realise it, so there is nothing to emit for it.

### Defining your own archetype

The ten are the famous ones, not the only ones. If your field has a pattern of
its own, write its **signature** — `signature` defines a shape, `archetype`
declares an instance of it:

```loop
signature "Referral bounce" {
  role  gatekeeping    balancing  through goal
  role  self_referral  reinforcing
  meet  gatekeeping self_referral
  note  "Tightening the gate raises self-referral, which raises the gate."
}

gate         "Referral gate"
wait_target  "Waiting-time target" { goal }
self_ref     "Self-referral rate"

gate        + -> wait_target +
wait_target + -> gate        -
gate        + -> self_ref    +
self_ref    + -> gate        +

loop gate_tightening "Gatekeeping" via gate -> wait_target
loop bounce          "Self referral" via gate -> self_ref

archetype "Referral bounce" {
  gatekeeping   gate_tightening
  self_referral bounce
}
```

The two columns are different kinds of thing, which is why they are spelled
differently. The left is the **archetype's** word for the part — `engine`,
`limit`, `gatekeeping` — fixed by the catalogue or by your own `signature`, and
not yours to choose. The right is **your** word for the cycle in your map. On a
map of your own they rarely resemble each other, and they are not supposed to:

```
archetype "Limits to Growth" {
  engine speculation_engine
  limit  supply_response
}
```

Each `role` says which loop kind it needs — `reinforcing` or `balancing`, in
words — and optionally that its loop must run `through` a variable of a given
kind. Each `meet` says two roles' loops must share a variable. Your pattern is
then verified and detected exactly as Senge's are.

#### Loops that meet **twice**

`meet a b` asks the two loops to share a variable. Add `twice` and they must
share **two**:

```loop
signature "Backfiring fix" {
  role  fix      balancing
  role  backfire reinforcing
  meet  fix backfire twice
  note  "The backfire runs out of the fix and back into the symptom."
}
```

That one word is the difference between two of the famous ten. A **Limits to
Growth** limit attaches to the growth engine's state and nothing else — the two
loops meet **once**. A **Fixes that Fail** backfire leaves the fix and comes
back into the symptom, so it passes through *both* of the fix loop's variables —
they meet **twice**. Without the count, those two signatures say exactly the
same thing, and every map that matched one matched the other.

It is a **minimum**, not an exact count: your map may have the two loops meeting
at three variables and still fit. Real maps carry sharing the textbook figure
does not, and a pattern that rejected a fit for being embedded in context would
be the wrong way round.

`twice` is as far as it goes. Two cycles cannot share three variables without
being the same cycle, so there is no `thrice` to write.

Three things to know:

- **Verdicts say it is yours.** Reports read *"Referral bounce (local) —
  fits"*. The ten carry the standing of published, card-checked archetypes; a
  pattern you wrote this morning does not, and the output never lets that
  difference disappear.
- **You cannot redefine one of the ten.** Naming a signature "Limits to
  Growth" is an error, because making a map fit by changing the pattern instead
  of the understanding is exactly the trap the method warns about.
- **Two loops that meet is barely a pattern.** A signature with two roles, one
  `meet` and no `through` matches much of any dense map — measured at 89
  candidate pairings on a single variable — so you get a warning saying so, and
  detection ranks it last. `through goal` is usually what makes it mean
  something.

A signature belongs to the document that defines it. Sharing one across maps
would need a cross-file reference, which the notation deliberately does not
have yet, so a house pattern is copied into each map for now.

### Being shown where to look

If you don't yet have a hypothesis, ask:

```
loop analyse map.loop --archetypes
```

This searches your loops for configurations matching each catalogue
signature and reports them **by hinge variable** — "a Limits to Growth at
house_prices" — with the shortest pairing and a count of the others, rather
than every combination. Add `--archetype "Name"` to narrow it to one.

Read these as questions, not answers. Several archetypes have permissive
signatures and will match a dense map in many places; the tool ranks the
more constrained ones first precisely because they say more when they hold.
Nothing here records a finding: to make one a claim you write the
`archetype` block yourself, and then it gets verified like any other.

Before you write that block, **look at what it is proposing**:

```
loop render map.loop --archetype "Tragedy of the Commons" --at house_prices
              [--tension <from>..<to>]          one tension on the map
loop render map.loop --archetype "Tragedy of the Commons" --at house_prices --in-map
```

`--at` names the hinge from the report, and you get the same two drawings a
declaration gets — the figure, and the figure in context — except the subtitle
says **PROPOSED** and carries no verdict, because a suggestion cannot be
evidence for itself. Deciding whether a pattern is really there is what the
picture is for; transcribing four role bindings into a block just to see it
would be deciding first. An `--at` that names a hinge with no candidate lists
the hinges that have one, so the flag doubles as a way to explore.

---

## 5. Levels: influence → causal

A map is written first at `influence` level, while you are still working out
what causes what. Unsigned `?` links are legitimate; a variable with no links
yet is a loose end worth a warning, not a failure.

When your understanding firms up, raise the claim:

```loop
map "Firmed up" { level causal }
a + -> b +
b + -> a -
```

At `causal`, the tool holds you to it: every remaining `?` is an error naming
the link (and telling you the way out, including lowering the level), and
every variable must be connected. The level governs **validation only** — any
map can be *drawn* in either view at any maturity, because influence and
causal are one notation at two levels of claim.

---

## 6. Comments and formatting

`#` starts a comment, to end of line. Whitespace is insignificant; statements
need no terminators.

```loop
# the quality spiral
workload + -> hours_worked +   # long days
```

`loop fmt <file>` formats canonically: statements grouped by type (map,
variables, links, loops), columns aligned, comments travelling with the
statement they precede, your mark spelling preserved. It is idempotent, and
`fmt --check` makes CI reject unformatted maps.

## 7. What is a syntax error

For the record, the mistakes the parser catches — each reported with line,
column, what it found, and what it expected:

```loop-invalid
a -> b +
```

A link missing a mark (`a -> b +` has none on `a`). Others: an unclosed
string or block, `kind exogenous` (exogeneity is its own flag, not a kind), a
`loop` declaration with no `via`, marks on a `via` edge (it names an edge, it
does not restate polarity), a variable declared explicitly twice.

---

## 8. The commands

```
loop validate <file> [--strict]              errors and warnings, with file:line:column
loop analyse  <file> [--max-length N]        every loop, classified; report bounded by length
              [--max-loops N]                bound the ENUMERATION (default 10 000)
              [--archetypes]                 suggest archetypes you have not declared
              [--archetype "Name"]           narrow the suggestions to one
              [--rank]                       which loop to look at first
              [--tensions]                      pairs of paths that contradict each other
              [--quiet]                      exit code only, for CI logs
loop render   <file> [-o map.svg]            the Connection Circle
              [--view causal|influence]      how much of what is known to draw
              [--loop R3 | --loop id | --loop "Name"]  one loop as a ring
              [--archetype "Name"]           one archetype as its own figure
              [--archetype "Name" --in-map]  the same archetype, shown in the whole map
              [--archetype "Name" --at var]  a *detected* candidate at that hinge
                                             (add --in-map for it in context)
              [--tension from..to]     one tension, on its own
                                             (add --in-map for it on the map)
              [--identifier kind|name|none]  what a loop's identifier says
              [--no-description]             leave out the prose above the drawing
              [--no-spheres]                 leave the atoms plain — no sphere bands
              [--hubs]                       only the hubs, everything else recedes
              [--vortex]                      the map re-seated in three shells
loop fmt      <file> [--check]               canonical formatting
loop diff     <before> <after> [--strict]    what changed structurally between two versions
loop seed     <archetype> [-o map.loop]      start a map from an archetype
              [--title "..."] [--list]
```

The two bounds do different jobs and the difference matters. `--max-length`
bounds what gets **printed** — the totals still count every cycle, and the
report says how many it left out — the omitted count, stated rather than implied. `--max-loops` bounds the **enumeration**
itself, so the analysis is genuinely incomplete; the loop total is then marked
`— INCOMPLETE (bound hit)` and a warning goes to stderr. A bounded report that
did not say so would look like an answer, which is the one failure this tool
treats as unacceptable.

`--quiet` suppresses the human-readable report on `validate`, `analyse` and
`diff`, leaving the exit code as the whole output — for a CI step that wants
pass/fail and a clean log. It never suppresses `--format json`, because
withholding a payload the caller asked for would leave them nothing.

Exit codes: `0` clean · `1` errors found · `2` usage or I/O mistake — so
`loop validate --strict` is a one-line CI gate. `--format json` on `validate`
and `analyse` emits a versioned machine-readable payload whose published
schemas live beside this reference:
[`schema/analyse.schema.json`](schema/analyse.schema.json) and
[`schema/validate.schema.json`](schema/validate.schema.json). Every payload
carries a `formatVersion`; changes within a major version are additive only,
and CI validates real payloads against the schemas. No command ever touches
the network.

In **Obsidian** (`packages/obsidian`), a fenced ```` ```loop ```` block in a
note renders the same way: the title and summary, the drawing, scope buttons,
the archetype verdicts, and any diagnostics with line numbers relative to the
block. An empty block — one with no variables — says so in words rather
than drawing an empty ring — in a note an empty ring reads as a broken drawing. Variable notes
render as Markdown there, so a `[[wikilink]]` inside one resolves to a real
note in your vault — a variable's definition becomes a note with backlinks.
Nothing is written back to the block, and the plugin reaches no network. On a
dense map the scope buttons are bounded, and which loops get one is the same
### Tensions — where the map contradicts itself

`loop analyse map.loop --tensions` looks for **two paths from one variable to
another whose polarities disagree**. One act, one outcome, two routes, opposite
signs — the act makes the outcome better and worse at the same time, and pushing
harder does not settle it, because pushing drives both routes equally.

That is what a paradox is, structurally, and it is not exotic: four of the ten
archetype cards contain one. `Fixes that Fail` is the smallest — the fix relieves
the symptom directly and causes it through the unintended consequence:

```
1 tension — one act reaching one outcome two ways, with opposite signs.
Which side wins is not computed (A-4):

  fix -> problem_symptom
    R1  same     via unintended  [1 delayed link]
    B1  opposite directly
```

`loop render map.loop --tension city_attractiveness..public_services` draws one on
its own, as a **lens**: `from` on the left of a circle, `to` on the right, one route over
the top and the other underneath, each named with its net sign. The two halves are spaced
independently — the routes rarely have the same number of variables. The two ends are marked — blue where the routes leave, red
where they arrive disagreeing, because that is where the disagreement lands. Add
`--in-map` for the same finding on the whole map, both paths kept and everything else
dimmed. In the viewer, the **tensions** panel lists them; click one to select it and
the top bar chooses which of the two drawings you get.

A tension is a **question put to you**, not a defect report: it is often the correct
shape of a real situation. The tool will not tell you which side wins — that
needs magnitudes it does not have. It reports one finding per pair of variables,
with the shortest path of each sign and a count of how many cycles witness it.

ranking `--rank` reports, so the loops you named come first; the note says how
many it left out — the omitted count, stated rather than implied.

### Grouping variables — `sphere`

A map of forty variables is easier to read if you can say which ones belong
together. A **sphere** is your own grouping — economic, political, cultural, or
product, project, engineering; whatever the areas of concern are in your work:

```
sphere economic "Economic" holds house_prices, rents, wages
```

That is the whole declaration when a grouping is just a grouping. `holds` takes
one or more variable ids, and at least one is required — a sphere holding
nothing groups nothing. Say more about it in a block:

```
sphere economic "Economic" {
  note   "Money, prices and flows — anything measured in currency."
  holds  house_prices, rents, wages
}
```

And where nothing in the map refers to the sphere by identifier, the **name on
its own** is enough — the identifier is folded out of it, the way a `loop`'s is
folded out of its prose:

```
sphere "Built environment" holds housing_stock, new_construction
```

**A sphere must be named.** The name is what the drawing's legend shows, so an
unnamed sphere draws a band no reader can identify; `sphere economic { … }`
with no `"Economic"` is an error saying so.

**The sphere names its members**, the way a `loop` names its edges and an
`archetype` names its loops. A variable's own line never points outward, which
means a variable can be in **as many spheres as you like, or none** — add it to a
second `holds` and nothing about its own declaration changes.

Nothing here says your spheres must cover the map, and nothing says they cannot
overlap. That overlap is the point, and it is why the word is *sphere*: spheres
of influence overlap in ordinary English, where sectors and domains carve things
up.

Two things **are** checked, because they are facts rather than opinions: a sphere
may only hold variables your map actually has, and two spheres may not share an
identifier. Holding the same variable twice is a warning — harmless, but it says
nothing the first mention did not.

The drawing carries a **legend** for them — `● Economic  ● Built environment` —
last in the block above the diagram, each disc filled with that sphere's own
colour. It names only the spheres the drawing actually shows, so a loop ring
lists the ones its own variables belong to and no others.

A sphere changes no loop, no polarity and no diagnostic. A map with spheres and
the same map without them analyse identically.

### Naming the opposition — `tension`

The tool will not tell you which route of a tension wins. What it cannot
do is stop you naming what the two routes *are* to each other:

```
tension "replenishment vs erosion" in workload => capacity
```

**The name comes first**, the way a `loop`'s and a `sphere`'s do, and `in`
introduces the pair it runs between. You may put an identifier before the name —
`tension erosion "replenishment vs erosion" in workload => capacity` — and where
you do not, one is folded out of the name, exactly as for a loop and a sphere.
Nothing in the language points at a tension by its identifier yet; it is there so
that all three annotations are written the same way.

The two variables are the tension's own ends — the same pair
`--tension workload..capacity` addresses. **`=>`, not `->`**: they are not
a link, and usually there is no direct link between them at all; the routes are
what run between them. The quoted string is your name for the opposition, and it
is what appears on the drawing, so write it for a reader.

> **Changed in v1.43.** It was `tension workload => capacity "replenishment vs
> erosion"` from v1.31 to v1.42, and that spelling no longer parses. Move the
> quoted name to the front and put `in` before the pair.

It is drawn on that tension's figure as a **green double-dashed arrow**,
`= = = = >`, running the way you wrote it — from the act on the left to the
outcome on the right — with your phrase in the line, wrapped to two rows if it
needs them. It is the `=>` off your own source line, drawn at figure scale.

Green because every other colour on a Loop drawing means something the tool
computed — blue is *same*, red *opposite*, grey *unknown* — and this is the only
mark on the picture that nobody checked. Doubled because no link is ever drawn
twice. And its head is an open chevron rather than a filled triangle, because
every filled head on a Loop drawing belongs to a computed link. Three ways of
saying the same thing, so none of them has to carry it alone.

**Nothing verifies it.** A tension changes no loop, no polarity and no
diagnostic — a map with tensions and the same map without them analyse
identically. Note what it does *not* say: not which side wins, only what the two
sides are. Which side wins would need magnitudes, and Loop holds none — a link is
a sign, a delay is a flag, and nothing anywhere says how much.

If you wrote `dominator "..." via a -> b` on v1.30, that is gone and the parser
says so by name. It is not a mechanical rename: `via` pointed at an edge the
annotation passed through, `=>` names the tension itself.

### Two ways to change what a drawing carries

`--identifier` chooses what sits at a loop's centre. `kind` is the default and is
what you have always got: `R1`, `B2`, or a neutral `L1` on the influence view,
with the arrow that shows which way the cycle runs. `name` — **the default since
v1.38** — puts the loop's
**declared name** there instead — `loop l1 "Speculative spiral" via …` — and
falls back to the kind letter for any loop you have not named, which on a real
map is most of them. `none` draws nothing at the centre at all, arrow included:
the picture for a slide, where the letters are in the caption.

`--hubs` shows the map's HUBS on the Connection Circle, marked on the atom's own
outline, thickened, in yellow. A variable is a hub when it has **at least one
arrow each way** and its **connections** — arrows counted once per end, in and
out together — are **four or more AND at least the average for the map**. Busy in
absolute terms, and busy for *this* map: the first test alone calls everything on
a dense map a hub, the second alone calls a variable with two arrows a hub on a
map of ones.

Everything else on the map is drawn in one of two weights:

- a variable a hub **links to**, in either direction, keeps its ordinary weight —
  it is part of what the junction does;
- a variable that reaches a hub only *through* something else, or not at all,
  recedes, the way a selected loop's off-path variables do.

A link keeps its weight where it touches a hub, and fades where it does not.

`--vortex` answers the same question the other way: instead of recolouring the
Connection Circle, it **re-seats the map in three rings** around its junctions —
the hubs on the inside, everything they touch in the next ring out, and anything
that reaches a junction only through something else in a last outer connection vortex. The
three shells are named in a key under the subtitle, with their counts.

It exists because on a dense map the hubs reading is correct and the picture
cannot carry it: every variable is on one circle, and one circle has no inside.
The connection vortex gives it one. Links between two hubs follow the inner rim rather than
crossing the disc, so the middle of the drawing stays empty.

Two things worth knowing:

- **The outer ring is often missing, and that is a finding.** On a well-connected
  map every variable turns out to be one step from a junction, so nothing lands
  in the third shell and no third ring is drawn.
- **`--vortex` and `--hubs` are the same reading in two channels**, so asking for
  both gives you the connection vortex. Neither is on by default: they are readings you ask
  for, not facts the map owes you. Both do nothing on a scope that draws no map
  ring — a loop, an archetype figure, a tension.

`core` also computes **drivers** (arrows out and none in) and **sinks** (arrows
in and none out), and the same drawing carries their machinery — but v1.39's
reading is *display the hubs*, not *mark all three*, so neither colour ever
reaches this drawing.

**On a dense map the third tier is often empty**, and that is worth knowing
before you reach for this: if every variable is one step from some junction,
nothing fades and what you get is the yellow outlines. On the 40-variable
housing map, 30 variables are hubs and the other 10 all touch one.

**Everything else recedes**, the way a selected loop's off-path variables do on
the whole map: an atom that is none of the three fades to context, and a link
survives only where both of its ends do. The drawing is OF the reading, not the
whole map with an annotation.

Nothing is ever two of the three, and a variable with no links at all is none of
them. A driver and a sink are on no feedback loop — a loop needs every variable
on it to have an arrow in and an arrow out — so the reading exists on the whole
map and not on a loop ring or an archetype figure, where by construction there
is nothing to show. Off by default; it is a reading you ask for.

`--no-spheres` leaves the atoms plain. A `sphere` is drawn as a fan of bands hanging
off each atom that belongs to one, and on a map with several spheres that is every
atom — useful when the spheres are the question, in the way when they are not. Off,
the drawing is exactly what it would be if the map declared no sphere at all.

`--no-description` leaves out the prose block above the drawing. By default a
drawing carries one: an archetype figure carries the pattern's own description,
and everything else carries the `#` comment your file opens with. Turn it off
when the drawing is going into a document that already says it.

Both are presentation. Neither is written to the source, and neither changes the
analysis.

The **viewer** (`packages/web`, one HTML file, works from disk) shows source
and map side by side and re-renders as you type. Everything it offers:

| Control | Does |
| --- | --- |
| the **source** pane | where you type; errors are marked against the line |
| **diagnostics** | every error and warning; click one to jump to its line |
| **whole map** / **on the map** / **on its own** | one control of three saying which drawing is on screen. *Whole map* is the Connection Circle and clears the selection; the other two need something selected in the panels, and give you that thing highlighted in the map or lifted out as its own drawing. A tension has no drawing of its own, so *on its own* is off for one |
| **(S)/(O)** / **+/−** | the two polarity notations, on their own switches (R-3.2). `(S)/(O)` is the systemic-design badge mid-link; `+/−` is the direction-of-change pair — both ends on a ring, the head alone on an archetype figure. Either can be on without the other. **Turn both off and you get the influence view**: no polarity anywhere, which is what the influence view means. There is no separate causal/influence toggle |
| **description** | the prose above the drawing — the archetype's own card on a figure, your file's opening `#` comment on everything else. On by default; the same thing `--no-description` turns off |
| **hubs** | the hub icon: outlines the variables most of the map's traffic passes through, keeps what they link to at ordinary weight, and fades what reaches them only indirectly. The same thing `--hubs` does. Available on the whole map and nowhere else |
| **connection vortex** | beside the hub icon, and only one of the two can be on: the map re-seated in three rings around its junctions rather than recoloured in place. The same thing `--vortex` does. Press the lit one again for the plain map. Available on the whole map and nowhere else |
| **loop identifier** | three buttons, one active: the loop's declared name, the loop's kind (`R1`/`B2`), or nothing. **Name is where it starts** — it is your word for the loop, with the tool's letter in the corner — and an unnamed loop shows its letter anyway. The same three `--identifier` names. Off on the whole map, which carries no loop identifier in any state |
| **download the drawing** / **download the map** | two segments. The first saves the SVG on screen, named after the map, the scope and the view. The second saves the `.loop` source in the editor — the map itself, named after its title alone. The source one always works, including on a draft that does not parse yet, which is exactly when you would hate to lose it |
| **declare this loop** | the `+` on the SELECTED loop's row, where the document has not named it: writes a `loop … via …` statement at the end of the file with the name selected, so your next keystroke replaces it. The `via` edges are the tool's own minimal set. A loop you have already named does not offer it — a second declaration is a duplicate |
| the **summary** | loop totals, and an `INCOMPLETE (bound hit)` marker if enumeration was bounded |
| the **panel headings** | four panels — archetypes, undeclared archetypes, tensions, feedback loops — and one is open at a time. Click a heading to open it; the collapsed ones show their counts. Feedback loops is open when the page loads |
| the **loop report** | every loop within the reporting bound; click one to select it |
| the **archetypes** panel | every archetype you declared, with its verdict; click one to select it |
| **undeclared archetypes** | opening it runs detection and lists what it proposes — labelled as proposals, never as verdicts. Click one to select it |
| **re-analyse** | the storm icon beside a panel's description: runs that panel's analysis again over what is on screen. Editing the map clears the result rather than leaving a stale one, and this is how you ask for a fresh one |
| any **row** in the panel column | selects a subject. The top bar then says which drawing of it you get: on the map, or on its own. **From the whole map you land on the subject itself** — a loop's ring, an archetype's figure — the same thing `--archetype X` gives you on the command line; a tension lands on the map, where both its paths are visible against what they contradict. Once you are in a mode, selecting keeps it, so picking a second loop while looking at a ring gives you that loop's ring |
| the **scope bar** | names what you are currently looking at. The way back is the top bar's **whole map** segment, which is always there |
| **download** | saves the drawing on screen as an SVG file, named after what it holds — byte-identical to what `loop render` writes for the same map, scope, view and notation |
| **link** | puts the whole map in the URL fragment, so a link shares the map without anything leaving the browser |

Every control above is presentation, not content: none of them is written to the
source, because presentation is not part of the document.

---

## 9. A complete map

The worked example the implementation is required to parse, with everything
above in use:

```loop
map "Team burnout" {
  profile  systemic-design/story-loop
  level    causal
}

fatigue   "Fatigue"
capacity  "Team capacity"

workload      + -> hours_worked  +
hours_worked  + -> fatigue       +
fatigue       + -> quality       -
quality       - -> rework        +
rework        + -> workload      +
fatigue       + -> attrition     +
attrition     + -> capacity      -
capacity      - -> workload      +
workload      + -> hiring        +
hiring        + -> capacity      +  ~delay "onboarding ramp"

loop death_spiral "Quality death spiral" via quality -> rework
```

`loop analyse` reports three feedback loops: two reinforcing — the quality
spiral (*more workload → more hours → more fatigue → less quality → more
rework → more workload*) and the attrition spiral — and one balancing, the
hiring response, whose delay is exactly where the trouble lives.

For the same journey taken step by step, with the tool's actual output at
each stage, see [Writing your first map](writing-your-first-map.md).

---

## Appendix: the grammar

The complete grammar, in EBNF — the notation's **definition**, not a summary of
it. The parser is generated from this same grammar, including its statement
dispatch and its *"expected one of …"* messages, so anything it does not define
is not valid Loop and is refused by name rather than quietly ignored.


```ebnf
document          = { statement } ;
statement         = map_block | variable_decl | link_decl | loop_decl | sphere_decl
                  | archetype_decl | signature_decl | tension_decl ;

map_block         = "map" [ string ] "{" { map_setting } "}" ;
map_setting       = "profile" identifier_path
                  | "level" ( "influence" | "causal" ) ;

variable_decl     = identifier [ string ] [ "{" { attribute } "}" ] ;
attribute         = "goal"                         (* value-less attribute = flag *)
                  | "exogenous"
                  | "note" string
                  | identifier [ value ] ;         (* anything else kept as data *)

sphere_decl       = "sphere" ( identifier string | string ) [ holds_clause ]
                    [ "{" { sphere_setting } "}" ] ;
holds_clause      = "holds" identifier { "," identifier } ;
sphere_setting    = holds_clause | "note" string ;

link_decl         = identifier mark "->" identifier mark { link_attr } ;
mark              = "+" | "-" | "?" ;
link_attr         = "~delay" [ string ] ;

loop_decl         = "loop" ( identifier string | string ) [ via_clause ]
                    [ "{" { loop_setting } "}" ] ;   (* bare string = pre-v1.19, G-5.2 *)
via_clause        = "via" edge_ref { "," edge_ref } ;
loop_setting      = via_clause | "note" string ;
edge_ref          = identifier "->" identifier ;

tension_decl      = "tension" ( identifier string | string )
                    "in" identifier "=>" identifier ;

archetype_decl    = "archetype" string "{" { archetype_setting } "}" ;
archetype_setting = "note" string
                  | identifier string ;   (* role := declared loop name *)

signature_decl    = "signature" string "{" { signature_setting } "}" ;
signature_setting = "role" identifier loop_kind [ "through" var_kind ]
                  | "meet" identifier identifier [ "twice" ]   (* arity, A-13.5 *)
                  | "note" string ;
loop_kind         = "reinforcing" | "balancing" ;
var_kind          = "ordinary" | "goal" ;

identifier        = letter { letter | digit | "_" } ;
identifier_path   = identifier { "/" identifier } ;    (* a profile name *)
string            = '"' { character } '"' ;        (* may span lines *)
comment           = "#" { character } newline ;
```
