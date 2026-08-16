# Packup!

Model your luggage in 3D and know which item is in which bag.

A local-first, offline-capable PWA for planning and tracking travel packing.
No backend, no accounts, no network calls — all data lives on your device.

## Status

**M0–M6 complete.** The app is feature-complete as an installable PWA: trips,
travellers, luggage, a 3D scene, items and the inventory drawer all work
offline. M7 (the Capacitor native wrap) is deferred and specified in
[NATIVE.md](NATIVE.md). See `PLAN.md` for the roadmap and `DECISIONS.md` for
deviations from the spec.

| Milestone             | State                                               |
| --------------------- | --------------------------------------------------- |
| M0 skeleton           | done — installable, offline, CI green               |
| M1 domain + data      | done — rules, volume, Dexie repo, backup, seed      |
| M2 trips & travellers | done — CRUD, duplicate, archive, export/import      |
| M3 containers         | done — luggage CRUD, caps enforced, nesting         |
| M4 3D scene           | done — procedural geometry, framing, WebGL fallback |
| M5 items & drawer     | done — item CRUD, search/filters, tap-to-locate     |
| M6 PWA polish         | done — a11y 100, perf 96, offline verified          |
| M7 native wrap        | not started — see [NATIVE.md](NATIVE.md)            |

### Measured

Lighthouse mobile against the production build: **performance 96,
accessibility 100, best-practices 100, SEO 100**. Offline verified in headless
Chrome — 18 precached entries, app reloads and renders with the network
disabled, data intact in IndexedDB. 103 tests passing.

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
