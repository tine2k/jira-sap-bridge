# Tasks

## 1. Week-boundary detection

- [x] 1.1 Add a private UTC ISO week-year/week-number helper in `src/import/summary.ts` and insert a spanning `Week <number>` row before the first displayed date and whenever consecutive dates have different ISO week keys; verify the renderer compiles with `npm run typecheck`.
- [x] 1.2 Add `tests/summary.test.ts` cases for the first-week title, Friday-to-Monday, Friday-to-Tuesday, same-week days, no title after the last day, and the 2027-01-01 to 2027-01-04 transition; verify labels and placement with `node --test tests/summary.test.ts`.

## 2. Colored week titles

- [x] 2.1 Build a blank spanning separator row from the computed column widths with a left-aligned, bold cyan `Week <number>` title, no horizontal rule, `colSpan: 4`, and cell-level `wordWrap: false`; verify enabled output colors the title and disabled output preserves the same spaced layout with `node --test tests/summary.test.ts`.
- [x] 2.2 Extend the summary width tests to cover week separators at narrow and wide explicit widths, with color on and off; verify each separator stays on one line, contains no horizontal rule, and every ANSI-stripped table line remains within the configured width using `node --test tests/summary.test.ts`.

## 3. Integration check

- [x] 3.1 Run `npm test` and `npm run typecheck`; verify all existing and new tests pass and the change touches only the summary renderer, its tests, and this change's planning artifacts.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
