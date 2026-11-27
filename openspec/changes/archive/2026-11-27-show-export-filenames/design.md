# Design

## Context

`src/import/main.ts` runs `runImport` in three steps: `listExportMonths` builds month options, `chooseMonth` asks for a month with `monthOptions` (label plus date-range hint), then `findExports` and `chooseFile` pick the file for that month. `listExportMonths` and `findExports` in `src/import/discover.ts` already parse the same filenames, so the list of files is available in one scan.

## Goals / Non-Goals

**Goals**
- The first and only selection shows export filenames.
- The date-based default (previous month on days 1–10, current month on days 11–31) still selects the matching file.
- No file found means no picker and the download message.

**Non-Goals**
- No change to CSV parsing, aggregation, preview output, or SAP behavior.
- No new config options.

## Decisions

- **One scan returns files, not months.** Add a discovery function in `src/import/discover.ts` that returns the matching `DiscoveredExport` entries, sorted newest first by `from`, then by filename. `listExportMonths` can be removed once nothing uses it. Alternatively keep it and derive months; the file list is what the picker needs, so the file list is returned directly.
- **Picker options use the filename.** `value` is the file path, `label` is the filename, and `hint` is omitted. This replaces `monthOptions`, `chooseMonth`, and the second `chooseFile` prompt.
- **Default selection.** The helper in `src/import/month.ts` picks the date-based default month (`pickDefaultMonth`), and the default option is the first file whose range matches that month. If none matches, the newest file is the default. Both are passed as `initialValue`.
- **Empty directory.** The no-file branch stays before the picker, so no prompt is shown.

## Risks / Trade-offs

- Several files for the same month now appear as separate options. This matches the request; the user picks the one they want.
- Sort order changes from month order to filename order within the same `from` date. Sorting by `from` then filename keeps the newest month first.
