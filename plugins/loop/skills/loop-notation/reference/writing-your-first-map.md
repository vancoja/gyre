# Writing your first map

A walk from an empty file to an analysed, rendered story loop, using the
team-burnout example the spec is built around. Every tool output below is real
— captured from the commands shown, not typed from memory. The
[syntax reference](syntax.md) is the companion page; this one is the journey.

## 1. Sketch what you suspect

You are mapping why a team keeps burning out. Start with what you'd say out
loud, one causal claim per line, in a file called `burnout.loop`:

```loop
map "Team burnout" { level influence }

workload     + -> hours_worked +
hours_worked + -> fatigue      +
fatigue      + -> quality      ?
```

*More workload, more hours. More hours, more fatigue. More fatigue — and
quality does something, you're not sure which way yet, so `?`.* The map claims
`level influence`: it is a sketch and says so.

```
$ loop analyse burnout.loop
Team burnout: 0 feedback loops — 0 reinforcing, 0 balancing, 0 indeterminate
```

Zero loops. That is not a failure — it is the tool telling you something: a
chain of causes is not yet a system. Nothing here feeds back.

## 2. Close the circle

What does bad quality cause? Rework. And rework lands back on workload:

```loop
map "Team burnout" { level influence }

workload     + -> hours_worked +
hours_worked + -> fatigue      +
fatigue      + -> quality      ?
quality      - -> rework       +
rework       + -> workload     +
```

```
$ loop analyse burnout.loop
Team burnout: 1 feedback loops — 0 reinforcing, 0 balancing, 1 indeterminate

I1  indeterminate   5  fatigue -> quality -> rework -> workload -> hours_worked
```

Now there is a loop — and it is **indeterminate**, because one of its links is
still `?`. Loop never guesses: until you commit to a polarity, the loop's
character is honestly unknown. Validation, meanwhile, is content:

```
$ loop validate burnout.loop
burnout.loop: valid — no diagnostics
```

A `?` at influence level is the expected state of a map under construction,
so nothing complains. The level is your claim, and you're within it.

## 3. Claim more than you know — and get caught

Raise the claim before resolving the `?`, and watch the contract flip. Change
the map block to `level causal`:

```
$ loop validate burnout.loop
burnout.loop:5:1 error [V-3] unknown polarity on link fatigue -> quality;
  the map declares level 'causal', so give both ends '+' or '-',
  or lower the level to 'influence'
burnout.loop: 1 error, 0 warnings   (exit code 1)
```

Same map, same `?` — but now it is an error, with the line number and both
ways out. This is the level system working as designed: the tool never flags
a sketch for being a sketch, and never lets a map claim maturity it doesn't
have. In CI, `loop validate --strict` makes this the build gate.

## 4. Commit, and the loop declares its character

You decide: fatigue genuinely erodes quality. Sign the link —
`fatigue + -> quality -` — and:

```
$ loop analyse burnout.loop
Team burnout: 1 feedback loops — 1 reinforcing, 0 balancing, 0 indeterminate

R1  reinforcing     5  fatigue -> quality -> rework -> workload -> hours_worked
```

**Reinforcing.** Check it as a story: more fatigue → less quality → more
rework → more workload → more hours → *more fatigue*. The story comes back
where it started, rising. Two `(O)` links — an even count — and this is worth
pausing on: the textbook picture of a reinforcing loop has no `(O)` links at
all, and this one has two. The parity rule, not the textbook silhouette, is
what classifies.

## 5. Name a loop — and let the tool disambiguate

Add the attrition path (`fatigue → attrition → capacity → workload`) and try
to name the original loop, picking an edge it passes through:

```loop-fragment
loop burnout_engine "Burnout engine" via hours_worked -> fatigue
```

```
$ loop validate burnout.loop
burnout.loop:12:1 error [V-1.4] loop "Burnout engine" matches 2 cycles,
  so the name is ambiguous; to pin the shortest candidate (R1),
  add: via attrition -> capacity
burnout.loop: 1 error, 0 warnings
```

`hours_worked -> fatigue` sits on **both** loops now, so the name is
ambiguous — and the error hands you a computed fix rather than a list of
candidates. Read it carefully, though: the suggestion pins the *shortest*
candidate, which here is the **attrition** loop. That's not the loop you
meant. You know which one you meant, so pick an edge unique to it:

```loop-fragment
loop burnout_engine "Burnout engine" via fatigue -> quality
```

```
$ loop validate burnout.loop
burnout.loop: valid — no diagnostics
```

The tool computes what can be computed and never decides what a thing means —
naming is yours; resolving is its.

## 6. Add the balancing force, and render

Management's answer to workload is hiring — which takes time:

```loop
map "Team burnout" { level causal }

workload     + -> hours_worked +
hours_worked + -> fatigue      +
fatigue      + -> quality      -
quality      - -> rework       +
rework       + -> workload     +
fatigue      + -> attrition    +
attrition    + -> capacity     -
capacity     - -> workload     +
workload     + -> hiring       +
hiring       + -> capacity     +  ~delay "onboarding ramp"

loop burnout_engine "Burnout engine" via fatigue -> quality
```

```
$ loop analyse burnout.loop
Team burnout: 3 feedback loops — 2 reinforcing, 1 balancing, 0 indeterminate

B1  balancing       3  capacity -> workload -> hiring  [1 delayed link]
R1  reinforcing     5  attrition -> capacity -> workload -> hours_worked -> fatigue
R2  reinforcing     5  fatigue -> quality -> rework -> workload -> hours_worked  "Burnout engine"
```

The full picture, computed: **two reinforcing spirals against one balancing
response — and the balancing loop is the one carrying the delay.** That last
clause is the diagnosis. Hiring does push back on workload, but it pushes back
late, and both spirals compound while it ramps. You wrote ten causal claims;
the tool told you what system they add up to.

Render it:

```
$ loop render burnout.loop -o burnout.svg          # the whole Connection Circle
$ loop render burnout.loop --loop burnout_engine   # one loop as a narrated ring
$ loop render burnout.loop --view influence        # same map, signs withheld
```

`--loop` takes any of the three ways a loop can be named: the identifier you
gave it, its prose name in quotes, or the `R1`/`B2` from the report — though
that last one renumbers as the map grows, so it is the one to avoid in a script.

The single-loop ring draws the narration — `+ (S) +` along each link, and the
story visibly closing on itself — which is the drawing to put in front of
people who have never seen a causal loop diagram.

In the **web viewer** the same drawings are a click away. The **diagram group**
in the header names what is on screen, and one of its seven segments is always
the selected one: the **Connection Circle** (the whole map on one ring), the
**connection vortex** (the same map re-seated in three shells around its
junctions), **Bubbles** (the map's *spheres* — one atom for each distinct
combination of them, carrying how many variables are in it, with the ones that
belong to no sphere counted too), and then a **story loop**, an **archetype** or
a **tension** — the thing you picked in the panel, lifted out as its own
drawing. Picking a container while something is selected draws that thing
*inside* it; clicking the container you are already in is the way back to the
plain map.

**Bubbles is the one container that holds nothing else.** Its atoms are
combinations of spheres rather than your variables, so there is no room on it
for a loop or a tension to be lit up — pick one of those and the Bubbles segment
greys out until you clear the selection. It also needs a map that declares at
least one `sphere`; with none, every variable would fall in the same atom and
the picture would say nothing about your map.

The group only ever shows **four** of its seven: the three containers, and the
one figure that belongs to whatever you have picked. An archetype segment while
a loop is selected would not be an option you are being refused — it is a
different subject — so it is not there at all. A seventh, **story map**, is a
slot held open for a drawing this tool does not make yet and is never on
screen.

**A big map is shown small, so you can zoom into it.** A forty-variable map is
about 2900px across and the drawing pane is a few hundred, so it opens at around
a fifth of its size and the labels are too small to read. Hold **ctrl** (or **⌘**)
and use the wheel to zoom in on whatever the pointer is over; a plain wheel goes
on scrolling, and **double-click** puts it back to fitting the pane. The zoom
stays where you left it while you type, so you can work on a detail without
being thrown back out on every keystroke — but picking a different loop or a
different diagram starts fresh, because that is a different picture.

Zooming changes what you are looking at and not what you would save: the SVG and
the PNG are of the drawing, whatever the screen is doing.

The **download group** beside it saves whatever is on screen right now. It has three
segments: **`SVG`**, **`PNG`**, and a document icon that saves the `.loop`
source itself. Whatever you are looking at is what you get: the whole map, one
loop as a ring, an archetype as its own figure, either view. The file names
itself after what it holds, so `burnout-r1-ring-causal.svg` and
`burnout-r1-in-map-causal.svg` are two files rather than one and a copy — and
the **PNG is the same name with the other extension**, because it is the same
picture.

**Which of the two to reach for.** The **SVG** is the drawing: it scales to any
size, its text stays selectable, and it opens in every browser and imports into
every tool that matters here. Its bytes are the same bytes `loop render` writes,
so it does not matter which of the two you used to make it. The **PNG** is a
photograph of that drawing, taken at twice its size, for the places that will
not take an SVG — a slide, a chat window, an issue tracker. It is made in your
browser and never leaves the page, and because it is your browser doing the
rasterising, someone on another machine who exports the same map gets a slightly
different file. That is fine for pasting into a deck and it is the reason the
SVG is the one to keep.

## 7. Say which pattern you think it is — and be checked

You now have a reinforcing spiral and a delayed balancing response. That shape
has a name: **Limits to Growth**, one of the ten classical system archetypes.
Say so, and the tool will tell you whether the map agrees.

The other nine are worth meeting. *A Pocket Guide to Using the Archetypes* takes
each one in turn with an example, at
`https://thesystemsthinker.com/a-pocket-guide-to-using-the-archetypes/`, and it
is included in the Systemic Design Toolkit's download at
`https://www.systemicdesigntoolkit.org/download`. This page shows you how to
*declare* one and have it checked; those tell you what each pattern means once
it fits.

An archetype is declared by binding each of its **roles** to one of your loops.
The roles are the archetype's own words for its parts — `engine` and `limit`
here — and they are fixed: you cannot invent one, and naming something else
gets you the list of the ones that exist. What you choose is which of *your*
loops plays each part:

```loop
map "Team burnout" { level causal }

workload     + -> hours_worked +
hours_worked + -> fatigue      +
fatigue      + -> quality      -
quality      - -> rework       +
rework       + -> workload     +
fatigue      + -> attrition    +
attrition    + -> capacity     -
capacity     - -> workload     +
workload     + -> hiring       +
hiring       + -> capacity     +  ~delay "onboarding ramp"

loop burnout_engine  "Burnout engine" via fatigue -> quality
loop hiring_response "Hiring response" via workload -> hiring

archetype "Limits to Growth" {
  engine burnout_engine
  limit  hiring_response
}
```

Two columns, two different kinds of thing. On the left, the archetype's word for
the part. On the right, the identifier of a loop you declared. They are not
supposed to resemble each other — the left is the pattern's vocabulary, the
right is your map's.

```
$ loop analyse burnout.loop
archetype "Limits to Growth" — fits
  engine meets limit at hinge workload
```

**Nothing about that verdict was asserted.** The tool checked that the loop you
called the engine computes as reinforcing, that the one you called the limit
computes as balancing, and that the two actually share a variable — then told
you which one: `workload` is the hinge, the place the growth and the brake meet.
You did not write "hinge" anywhere.

Get it backwards and you are refused, in the same breath:

```
$ loop validate burnout.loop
burnout.loop:17:1 error [V-9.4] 'engine' must be reinforcing, but 'hiring_response'
  ("Hiring response") computes as balancing — the map, as it stands, refutes this fit
```

Which is the point of declaring one at all. An archetype is a **hypothesis about
your map**, not a label you stick on it, and a hypothesis you cannot fail is not
worth stating. If you do not know which pattern you have, ask:
`loop analyse burnout.loop --archetypes` proposes the ones that fit the
structure you have written, and `loop seed "Limits to Growth"` writes a fresh
map of one if you would rather start from the shape.

## 8. See what changed, months later

A text diff tells you a line was edited. `loop diff` tells you what that did
to the system:

```
$ git show HEAD~5:burnout.loop > /tmp/before.loop
$ loop diff /tmp/before.loop burnout.loop
/tmp/before.loop -> burnout.loop: 1 loops (0 R / 0 B / 1 I) -> 3 loops (2 R / 1 B / 0 I)

[loop-resolved] fatigue -> quality -> rework -> workload -> hours_worked is no longer
  indeterminate: a polarity on it was signed, and the loop computes as reinforcing
[loop-appeared] a reinforcing loop appeared: attrition -> capacity -> workload -> ...
[loop-named] fatigue -> quality -> ... is now named "Burnout engine"
[link-repolarised] fatigue -> quality changed polarity: unknown (?) -> opposite (O)
```

Loops are matched by their variables, not by `R1`/`B2` — those renumber, so
comparing them would report noise. The finding worth waiting for is
`archetype-fit-changed`: an archetype you declared months ago no longer fits
the map you have since built. That is not a failure, it is the method
arriving somewhere — the map has outgrown the hypothesis.

Note what the output never says: which version is *better*. A polarity being
signed is recorded, not applauded; a map is allowed to become less certain on
purpose. `--strict` exits non-zero when the structure moved, so
"tell me if my understanding of this system changed" can be a CI gate.

## 9. Keep it honest from here

- `git init` — the map is text; its history is your understanding's history.
  A changed conviction is a one-character diff on a named line.
- `loop validate --strict` in CI — a map that claims `causal` with an
  unsigned link fails the build, naming the file, line and link.
- `loop fmt` before committing — canonical layout, comments preserved,
  diffs stay clean.

You now know the entire notation except what you can look up in the
[reference](syntax.md) in under a minute. The next map is yours.
