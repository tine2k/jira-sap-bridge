# Design

## Context

Scripts (`timesheet`, `import`, `test`) ran TypeScript through `tsx` (`node --import tsx` for tests). `tsx` pulls in esbuild, whose native binary is platform-specific. The repository and its `node_modules` are shared between macOS and Linux, so the installed binary only works on the OS that ran the install. See proposal.md - Why.

The source already compiles under `tsc --noEmit` with `moduleResolution: Bundler`, and `tsconfig.json` has `noEmit: true`, so no build output is produced.

## Goals / Non-Goals

**Goals:**
- One `npm install` produces a `node_modules` that works on macOS and Linux.
- Scripts and tests run unchanged in behavior, with no added runtime dependency.

**Non-Goals:**
- Changing the CLI behavior or any spec requirement.
- Adding a build step or emitting JavaScript output.

## Decisions

- **Use Node's built-in type stripping instead of `tsx`.** Node strips type annotations at load time, so no native binary is needed. Alternatives considered:
  - *Keep `tsx`, switch to pnpm with `pnpm.supportedArchitectures`:* works, but keeps a native dependency and requires migrating the lockfile.
  - *Yarn PnP:* removes `node_modules`, but changes module resolution and tooling across the project; not verified for native binaries.
  - *Bun:* same platform-binary model as npm and not used by the project.
- **Explicit `.ts` import specifiers.** Node does not remap `.js` to `.ts` during stripping, so imports must name the real file. `allowImportingTsExtensions: true` lets `tsc --noEmit` accept them; `noEmit` keeps this from emitting output.
- **Rewrite `SapClient` constructor without parameter properties.** Strip-only mode rejects TypeScript parameter properties. Explicit field assignments keep the same public signature `(config, fetchImpl = fetch)`.
- **Keep `node --test tests/*.test.ts` glob.** Node's test runner accepts the glob; the existing `tests/` layout is unchanged.

## Risks / Trade-offs

- [Unsupported TypeScript syntax (enums, namespaces, parameter properties) fails at runtime] → Mitigation: `npm run typecheck` and the full test suite run after the change; the source was audited for these forms.
- [Older Node 22 releases lack type stripping] → Mitigation: document the required Node version; the project targets current Node (26 in use).
- [Stale `node_modules` from the previous layout] → Mitigation: run `npm install` on each OS after pulling so the lockfile change takes effect.

## Migration Plan

1. Pull the change, then run `npm install` on macOS and on Linux. This removes `tsx` and its esbuild binaries.
2. Verify with `npm run typecheck`, `npm test`, and a dry start of `npm run import` and `npm run timesheet`.
3. Rollback: restore `tsx` in devDependencies, revert the script lines to `tsx`/`node --import tsx`, and revert the import extensions. No data or config changes are involved.

## Open Questions

None.
