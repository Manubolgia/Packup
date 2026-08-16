# Packup!

Model your luggage in 3D and know which item is in which bag.

A local-first, offline-capable PWA for planning and tracking travel packing.
No backend, no accounts, no network calls — all data lives on your device.

## Status

**M0 — skeleton.** Build, PWA shell, CI and icons are in place; the Trips screen
is a placeholder. See `PLAN.md` for the roadmap and `DECISIONS.md` for
deviations from the spec.

## Requirements

Node 22 (pinned in `.nvmrc`):

```bash
nvm use        # or: nvm use 22
npm install
```

## Scripts

| Command             | What it does                             |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Dev server                               |
| `npm run build`     | Typecheck + production build to `dist/`  |
| `npm run preview`   | Serve the production build               |
| `npm run typecheck` | `tsc -b --noEmit`                        |
| `npm run lint`      | ESLint                                   |
| `npm run format`    | Prettier, write                          |
| `npm test`          | Vitest                                   |
| `npm run icons`     | Regenerate PWA icons from `assets/*.svg` |

## Architecture notes

- **`base: './'` + `HashRouter`** — one build works at a GitHub Pages subpath
  and at `capacitor://localhost`, with no server rewrites.
- **`src/domain/`** is pure TypeScript: no React, no browser globals, unit-tested
  under plain Node.
- **`src/data/repo.ts`** is the only module allowed to touch Dexie; ESLint
  enforces this so a native SQLite driver can be swapped in later.
- **`src/platform/`** abstracts haptics, share and camera behind one interface —
  web implementations today, Capacitor at M7, no caller changes.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.
One-time setup: in the repo, **Settings → Pages → Source: GitHub Actions**.
