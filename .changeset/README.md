# Changesets

This directory tracks [changesets](https://github.com/changesets/changesets) — one file per not-yet-released change. Each file declares which packages are affected and at what version bump (patch / minor / major).

## Adding a changeset

From the repo root:

```bash
pnpm changeset
```

The CLI asks which packages changed and what kind of bump each needs, then writes a markdown file under `.changeset/` that gets committed alongside your PR.

## Releasing

1. When changesets are merged to `main`, the **Release** GitHub Action opens or updates a PR titled "chore: release" that bumps versions and rewrites `CHANGELOG.md` entries from the pending changeset files.
2. Merging that PR triggers the same Action to publish the updated packages to npm and create the git tags.

No manual version editing is ever required — all releases go through changesets.

## Configuration

See `config.json` for the active config (changelog generator, access level, base branch, etc.). Full reference: [`@changesets/config` schema](https://github.com/changesets/changesets/blob/main/packages/config/schema.json).
