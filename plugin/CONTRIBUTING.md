# Contributing

Thank you for helping. Small, focused pull requests are easiest to review.

## No build tools

- Plain Node.js (20+) and Python 3.11+ with pytest. No npm packages, bundlers or transpilers.
- `node tools/build.mjs` concatenates the files listed in `src/ORDER` into `lib/client.js`, the single dsh
  client bundle. The build refuses to write a bundle that does not parse.
- Commit `lib/client.js` together with the source change that produced it.

## Source layout

- `src/*.js`: each file is wrapped as `(function (CC) { ... })(CC);` and attaches to the shared `CC`
  namespace. No imports or exports. Inside a file use `const h = CC.h` and `CC.React`.
- `src/ORDER`: the build order, one file per line. A new file must be added here.
- `tools/`: build, install, test, export, compat and lint tools. `tests/`: node tests (`*.test.mjs`) and
  Python tests (`tests/py`).

## Tests

```
node tools/test.mjs                 # every node test, then the Python tests
node tools/test.mjs --node-only     # node tests only
node tools/test.mjs --only install  # files whose name contains "install"
```

- A change comes with a test that failed first.
- Node tests load source files into a `vm` context with stub React (`tests/harness.mjs`). They need no
  browser, dsh, Waypoint Core or network.
- Python tests use the standard library and pytest only, and work in temporary folders.
- Tests must pass on Windows, macOS and Linux. A test that only makes sense on one system skips with a
  message.

## Style

- Plain English in the interface: short labels, one-line descriptions, nothing preselected.
- Colours, sizes and radii come from `src/tokens.js` only (`python tools/ui_lint.py` and
  `python tools/contrast_lint.py` check this).
- Every call into dsh is guarded: a failure logs one warning and never breaks dsh.
- No personal paths, names or keys anywhere. `python tools/export.py --list` must report nothing new.

## Design rules

Read [DESIGN.md](DESIGN.md) before changing any page: tokens, the UI kit and the layout rules.
