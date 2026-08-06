# Contlify Release Checklist

Use this checklist prior to publishing a new release of `contlify` to npm.

---

## Pre-Release Verification

- [ ] **Working Tree**: Ensure all feature branches are merged into `main` and working directory is clean (`git status`).
- [ ] **Dependencies**: Verify `package.json` contains no unneeded devDependencies or security issues (`npm audit`).
- [ ] **TypeScript Check**: Verify zero type errors across codebase and examples (`npm run typecheck`).
- [ ] **Build Check**: Verify `tsup` generates `dist/index.js`, `dist/index.mjs`, and `dist/index.d.ts` without warnings (`npm run build`).
- [ ] **Documentation Review**:
  - `README.md` features current version and examples.
  - `CHANGELOG.md` updated with release notes and version number.
  - `docs/api-reference.md` reflects current API contracts.
- [ ] **Package Contents Verification**: Run `npm pack` dry run and inspect generated tarball file listing to verify no logs or scratch files leak into bundle.

---

## Release Execution

1. Update package version in `package.json`:
   ```bash
   npm version 1.0.0 --no-git-tag-version
   ```
2. Commit version bump:
   ```bash
   git commit -m "chore(release): v1.0.0"
   ```
3. Tag the release commit:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   ```
4. Push commit and tag to GitHub:
   ```bash
   git push origin main --tags
   ```
5. Publish package to npm registry:
   ```bash
   npm publish --access public
   ```
