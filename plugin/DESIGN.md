# Waypoint for dsh: design rules

Waypoint is a working tool, not a landing page. Every screen should read like a dense, calm
professional dashboard: status at a glance, few controls, nothing decorative.

## Tokens

All colour, type, radius and spacing values live in `src/tokens.js` (light and dark palettes,
contrast-tested). Page files use the CSS variables (`var(--cc-text)`, `var(--cc-r-control)`,
`var(--cc-fs-meta)`), never raw colours (`ui_lint` checks this).

| What | Value |
| --- | --- |
| Type sizes | 11 meta, 12 label and table text, 14 body, 17 page title, 22 reserved for hero numbers. No other sizes. |
| Weights | 400, 500 (controls), 600 (titles, section heads). |
| Radii | 6 controls, 8 panels and fields, pill only for switches and badges. |
| Spacing | 4, 8, 12, 16, 24, 32. Page gutter 16. |
| Heights | Header bar 48. Buttons 28 (small 24). Rows 32. Inputs 32. |
| Numbers | Every count, percent, time and id uses `font-variant-numeric: tabular-nums`. |

## The kit (`src/ui.js`)

Use these before writing a page-specific control. If a page needs something the kit lacks, add it
to the kit.

- `CC.ui.Page({header, banner, pad, col, raw})`: the page frame. Body scrolls; header stays.
- `CC.ui.PageHeader({title, meta, mid, actions})`: one bar per page. Title, one short meta line
  (counts, state), an optional view switch in `mid`, actions on the right.
- `CC.ui.Button({kind, size, icon, onClick})`: `default` hairline, `primary` (accent fill),
  `quiet` (text only), `danger`. 
- `CC.ui.Segmented({options, value, onChange})`: view or filter switches. Options may carry a count.
- `CC.ui.Toggle({checked, onChange, label})`: on/off switches.
- `CC.ui.Section({title, meta, actions})`: a hairline-separated block. Never a card.
- `CC.ui.List` / `CC.ui.Row({lead, title, sub, meta, trail, onClick, selected, off})`: 32 px rows.
- `CC.ui.Meter({value, tone, label})`: thin bar plus a number. Unknown value shows a dash.
- `CC.ui.Badge({tone})`: only for something that needs action (`action`, `error`, `run`).
- `CC.ui.Banner({tone, action})`: one line under the header (for example, "Waypoint Core is not running").
- `CC.ui.Empty({title, body, action})`: left-aligned, compact empty state with at most one action.
- `CC.ui.Field({label, hint})` with `className: 'cc-in'` on input, select and textarea.

## Rules

1. **One header bar per page**, built with `PageHeader`. Same height, padding and title size on every page.
2. **One primary button per view.** Everything else is default or quiet. Rare actions go in a "More" menu
   or the inspector, not the header.
3. **Flat.** One container level above the page background at most. Sections are separated by
   hairlines and spacing, not by boxes. No cards inside cards. No shadows except a menu or popover.
4. **No slop.** No gradients, glows, glass blur, emoji, ALL-CAPS labels, `!important`, decorative
   illustrations or slow animation (120 ms at most; the running pulse is the only loop).
5. **Status colour is semantic and consistent**: done, ready (outline only), running (blue pulse),
   error (red), not started (neutral), needs you (accent ring). Colour is never the only signal: pair it with
   a shape or a word.
6. **Text is short.** Labels are one to three words. Help text is one line or none. No paragraphs
   explaining the UI. Sentence case everywhere.
7. **Dense, not cramped.** Rows are 32 px, tables align in columns, long text truncates with an
   ellipsis and shows the full text on hover.
8. **Empty, loading and error states are designed.** Loading is a quiet line, not a spinner wall. Errors
   say what failed and what to do next, in one line.
9. **Forms are left-aligned** in a column at most 960 px wide. Labels above fields.
10. **No refresh buttons.** Pages load fresh state on open and follow the engine's live stream.
11. **Keyboard**: every control is reachable, focus shows one accent ring, Escape closes popovers.
12. **Both themes** are checked in screenshots before any change lands (`node tools/preview.mjs --shots`).
13. **Never name the owner.** Interface text says "you", or uses the configured owner name from the engine.

## Brand

Product name: **Waypoint** (full: "Waypoint for dsh"). The mark is `assets/logo.svg` in the accent green.
Never show "Control Centre", "cc" or the old package name in the interface.
