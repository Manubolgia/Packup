# DECISIONS.md

Running log of deviations from the build spec, and their rationale (spec §12).

---

## M0

### D1 — Node 22 via nvm, latest tool versions (supersedes PLAN.md B3)

**Spec:** silent on Node version.
**Found:** the default `node` on this machine is 18.20.8, which Vite 7 and
`vite-plugin-pwa` 1.x refuse to run on. PLAN.md proposed downgrading to Vite 6.
**Decided:** the user confirmed `nvm use 22` (v22.22.3 is installed), so the
project runs current Vite 7 / Vitest 3 / vite-plugin-pwa 1.3 instead.
`.nvmrc` pins `22`, and CI reads it via `node-version-file` so local and CI
never drift.
**Cost:** every local command needs `nvm use 22` first (the default is still 18).

### D2 — React 19, not React 18

**Spec §2:** "Vite + React 18 + TypeScript (strict)".
**Deviation:** React 19.2 is installed.
**Why:** `@react-three/fiber` v9 — the version compatible with the current
`three` and `@react-three/drei` — requires React 19. Holding React 18 would
mean pinning R3F v8 and an older `three`, i.e. starting the project on an
already-superseded 3D stack that M4 must live with. React 19 is a drop-in for
everything this spec uses.
**Risk:** none identified for the features in scope.

### D3 — Tailwind CSS v4, configured in CSS

**Spec §2:** "Tailwind CSS. Design tokens as CSS variables so theming is one file."
**Deviation:** Tailwind v4 has no `tailwind.config.ts`; configuration lives in
`src/index.css` via `@theme`, with `@tailwindcss/postcss` as the PostCSS plugin.
**Why:** this is v4's supported model, and it satisfies the spec's actual
requirement better — tokens _are_ CSS variables, in exactly one file.

### D4 — `public/404.html` is a redirect, not a copy of `index.html`

**Spec §6:** "`public/404.html` copying `index.html`".
**Deviation:** it is a small self-contained redirect page.
**Why:** `index.html` is a Vite _template_ — its `<script src="/src/main.tsx">`
is rewritten to a hashed bundle at build time. A literal copy placed in
`public/` would ship a script tag pointing at a file that does not exist in
`dist/`, so it would be a broken page precisely when it is needed. The redirect
bounces any stray deep link to the app root, preserving the hash route, which is
what the belt-and-braces is for.

### D5 — `sharp` pinned to ^0.35.3

**Why:** `sharp` <0.35.0 carries a high-severity libvips advisory
(GHSA-f88m-g3jw-g9cj). It is a devDependency used only by
`scripts/generate-icons.mjs` and never enters the bundle, but there is no reason
to keep a vulnerable version. `npm audit` reports 0 vulnerabilities.

### D6 — Maskable icon rendered from a separate transparent source

**Why:** compositing the full `icon-source.svg` onto the maskable padding
stamped its gradient backdrop as a visible dark square against the flat brand
padding — clearly wrong on an Android launcher (verified by looking at the
render). `assets/icon-mark.svg` is the same mark on a transparent ground; the
maskable icon composites that over flat brand colour at 60% scale, inside the
safe zone. The two SVGs must be kept in sync.

### D7 — ESLint mechanically enforces C3

**Addition:** a `no-restricted-imports` rule bans importing `dexie` anywhere
except `src/data/**`.
**Why:** C3 ("never call Dexie from a component") is the constraint that keeps a
native SQLite swap possible. A rule that fails CI is worth more than a
convention, and it costs one config block.

### D8 — `domain/types.ts` landed in M0 rather than M1

**Why:** `src/store/ui.ts` (an M0 deliverable) needs the `UUID` type. Only the
type definitions moved forward; `rules.ts`, `volume.ts` and `location.ts` remain
M1 work as planned.

### D9 — `three` chunk split via a function, not an array

**Why:** `manualChunks: { three: ['three'] }` emitted a _"Generated an empty
chunk"_ warning because nothing imports `three` until M4. The function form
keys off the module id, so the chunk appears only once there is something in it.

### D10 — Dependencies added beyond the spec list

All are dev-only tooling the spec implies but does not enumerate:
`sharp` (icon generation), `fake-indexeddb` (M1 repo tests), `globals`,
`typescript-eslint`, `@eslint/js`, `eslint-config-prettier`,
`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` (the ESLint 9 flat
config the spec's "ESLint + Prettier, run in CI" requires), `autoprefixer`,
`postcss`, `@types/*`.

No runtime dependency outside spec §2 has been added.
