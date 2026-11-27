# Proposal

## Why

The project ran TypeScript through `tsx`, which depends on esbuild. esbuild installs a native binary only for the operating system that ran `npm install`. Because `node_modules` lives in the shared project folder, an install on Linux breaks `npm run import` on macOS (and vice versa). Switching package managers does not fix this, since pnpm, Yarn, and Bun install the same platform-specific binaries.

Node now runs TypeScript directly through built-in type stripping, so the runner can be removed and `node_modules` no longer contains native binaries.

## What Changes

- Remove `tsx` from devDependencies and update `package-lock.json`.
- Run the `timesheet`, `import`, and `test` scripts with `node` instead of `tsx`.
- Rewrite relative imports to use explicit `.ts` extensions, and enable `allowImportingTsExtensions` in `tsconfig.json`.
- Replace the `SapClient` constructor's TypeScript parameter properties with explicit fields, since strip-only mode does not support them.
- **BREAKING** for contributors on Node 22 releases without built-in TypeScript type stripping: those versions can no longer run the scripts. Use a current Node release (the project is developed on Node 26).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change affects tooling only. No requirement in `openspec/specs/` changes, so the change sets `skip_specs: true`.

## Impact

- `package.json` (scripts and devDependencies), `package-lock.json`, `tsconfig.json`.
- Source and test imports under `src/` and `tests/`, plus the `SapClient` constructor in `src/sap/client.ts`.
- Developers on macOS and Linux can share one `node_modules` after a single `npm install`.
- No runtime behavior change for the CLI.
