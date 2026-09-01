# gyre

A marketplace of Claude Code plugins.

```
/plugin marketplace add vancoja/gyre
/plugin install loop@gyre
```

Both names are lower-case identifiers. If you installed under an earlier
name, the marketplace carries a rename map and Claude Code migrates you on
the next load.

| Plugin | |
| --- | --- |
| [`loop`](plugins/loop/) | Two Agent Skills for authoring and writing **story loops** — causal loop diagrams as diagram-as-code — with the real analysis bundled, so an agent computes the feedback loops instead of guessing them. |

Each plugin's own README is in its directory.

## Where this comes from

The `loop` plugin is built from **gyre-loop**, which is not yet public. This
repository carries the built artifact, not its source, and is updated when a
release is cut — so what you install here is the same bundle that release
produced, and nothing is assembled by hand.

## Licence

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

Copyright Jan Van Coppenolle.
