# Tasks

## 1. Remove the tsx runner

- [x] 1.1 Remove `tsx` from devDependencies and confirm `package-lock.json` no longer lists `node_modules/tsx` (verify with `grep -c '"node_modules/tsx"' package-lock.json` returning 0)
- [x] 1.2 Change the `timesheet`, `import`, and `test` scripts in `package.json` to use `node` instead of `tsx` (verify with `grep -n tsx package.json` returning no matches)

## 2. Explicit TypeScript import paths

- [x] 2.1 Rewrite relative imports in `src/` and `tests/` from `.js` to `.ts` and fix the extensionless `./date` import in `src/config.ts` (verify with `grep -rn '\.js"' src tests` returning no matches)
- [x] 2.2 Set `allowImportingTsExtensions: true` in `tsconfig.json` and verify `npm run typecheck` passes

## 3. Strip-only compatibility

- [x] 3.1 Replace the `SapClient` constructor parameter properties in `src/sap/client.ts` with explicit fields and verify `node --test tests/client.test.ts` passes
- [x] 3.2 Verify no other TypeScript-only syntax (parameter properties, enums, namespaces) remains in `src/` or `tests/` (verify `npm run typecheck` passes and `npm test` runs with no `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` errors)

## 4. Verification

- [x] 4.1 Run `npm test` and verify all tests pass (88 tests as of this change)
- [x] 4.2 Verify `npm run timesheet` prints usage and `npm run import` starts without a module loading error (verify on Linux and macOS after `npm install`)

## Workflow follow-up

- Run `npm install` on macOS and on Linux after pulling this change so `node_modules` matches the updated lockfile.
- Archive the change after the verification tasks pass.
