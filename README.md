# Packup!

Model your luggage in 3D and know which item is in which bag.

A local-first, offline-capable PWA for planning and tracking travel packing.
No backend, no accounts, no network calls — all data lives on your device.

## Status

**M2 complete.** Trips and travellers are fully editable and persist offline;
the 3D luggage view (M4), items and the drawer (M5) are still to come. See
`PLAN.md` for the roadmap and `DECISIONS.md` for deviations from the spec.

| Milestone             | State                                          |
| --------------------- | ---------------------------------------------- |
| M0 skeleton           | done — installable, offline, CI green          |
| M1 domain + data      | done — rules, volume, Dexie repo, backup, seed |
| M2 trips & travellers | done — CRUD, duplicate, archive, export/import |
| M3–M7                 | not started                                    |

## Design

One main colour, one secondary, one accent — `#14171A` / `#F2F2F0` / `#E8A317`,
plus a single derived red for destructive and over-capacity states. No
gradients, no rounded corners, no emoji: icons are line-only SVGs on a 24-unit
grid with a 1.5 stroke, drawn like a parts diagram. Space Grotesk for signage,
JetBrains Mono for data, both self-hosted. All of it lives in `src/index.css`.

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
