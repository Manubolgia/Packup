# NATIVE.md — what M7 (the native wrap) still needs

**Status:** not implemented. The app currently ships as an installable PWA and
is complete through M6. This document is the hand-off for whoever does M7.

M7 was deliberately deferred: verifying `npx cap run android` needs the Android
SDK, and `npx cap run ios` needs macOS + Xcode. Neither is available on the
Linux machine this was built on, and shipping unverified native config would
have violated the project's own rule about not claiming things work untested.

Everything M7 depends on **is already in place**. M7 is configuration, not
surgery — which was the whole point of building `src/platform/` from day one.

---

## 1. What is already done

| Requirement              | Where                                                 | State                                                                                                                |
| ------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Platform abstraction     | [src/platform/index.ts](src/platform/index.ts)        | Done — `Platform` interface with `haptic`, `share`, `pickPhoto`, `saveTextFile`, `pickTextFile`, `isNative`          |
| Web implementations      | [src/platform/web.ts](src/platform/web.ts)            | Done — `navigator.vibrate`, `navigator.share`, `<input type="file">`, canvas downscaling to 512px JPEG q0.7          |
| Native runtime detection | [src/platform/index.ts:26](src/platform/index.ts#L26) | Done — `detectNative()` reads `window.Capacitor` without importing it, so the web build carries no native dependency |
| SW skipped on native     | [src/main.tsx:27](src/main.tsx#L27)                   | Done — `isNativeRuntime ? null : <UpdateToast />`, so the WebView never serves a stale cached bundle                 |
| Relative asset paths     | [vite.config.ts:9](vite.config.ts#L9)                 | Done — `base: './'`                                                                                                  |
| Hash routing             | [src/app/router.tsx](src/app/router.tsx)              | Done — `createHashRouter`, so `capacitor://localhost` resolves                                                       |
| No network at runtime    | —                                                     | Done — all data in IndexedDB, fonts self-hosted, 3D geometry procedural                                              |

**Nothing in `src/` needs to change for M7 except one line** — see step 3.

---

## 2. Install and configure Capacitor

```bash
npm i @capacitor/core @capacitor/haptics @capacitor/share @capacitor/camera @capacitor/preferences
npm i -D @capacitor/cli @capacitor/assets
npx cap init Packup app.packup.luggage --web-dir=dist
npm i @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios          # macOS only
```

`capacitor.config.ts` must contain:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.packup.luggage',
  appName: 'Packup',
  webDir: 'dist',
  server: { androidScheme: 'https' },
};

export default config;
```

`server.androidScheme: 'https'` is required — under the default `http` scheme
Android treats the origin as insecure and **IndexedDB is unavailable**, which
would silently break every screen in this app.

---

## 3. Fill in `src/platform/native.ts`

The file exists as a stub. It should export a `nativePlatform: Platform`:

```ts
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import type { Platform } from './index';

export const nativePlatform: Platform = {
  isNative: true,
  async haptic(kind) {
    if (kind === 'light') return Haptics.impact({ style: ImpactStyle.Light });
    return Haptics.notification({
      type: kind === 'success' ? NotificationType.Success : NotificationType.Warning,
    });
  },
  async share(payload) {
    await Share.share({ title: payload.title, text: payload.text });
  },
  async pickPhoto() {
    const photo = await Camera.getPhoto({
      quality: 70,
      width: 512, // matches PHOTO_MAX_EDGE in web.ts
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
    });
    return photo.dataUrl ?? null;
  },
  // saveTextFile / pickTextFile need @capacitor/filesystem — see step 6.
  async saveTextFile(filename, text) {
    /* Filesystem.writeFile + Share.share */
  },
  async pickTextFile() {
    /* @capawesome/capacitor-file-picker */
  },
};
```

Then the **only** change outside this folder:

```ts
// src/platform/index.ts — last line, currently:
export const platform: Platform = webPlatform;
// becomes:
export const platform: Platform = isNativeRuntime ? nativePlatform : webPlatform;
```

Keep the import static-but-guarded, or the web bundle will pull in
`@capacitor/*`. A dynamic import or a build-time alias both work.

---

## 4. Icons and splash

```bash
# assets/icon-source.svg already exists; export it to 1024x1024 PNG first.
npx capacitor-assets generate --iconBackgroundColor '#14171A' \
                              --splashBackgroundColor '#14171A'
```

Source of truth: [assets/icon-source.svg](assets/icon-source.svg).
Background must be `#14171A` to match `theme_color` / `background_color` in the
manifest, or the splash will flash a different colour than the app.

---

## 5. Verification checklist (none of this has been run)

- [ ] `npx cap sync` completes without error
- [ ] `npx cap run android` launches on a device/emulator
- [ ] `npx cap run ios` launches in the simulator (macOS only)
- [ ] Airplane mode: app launches and every screen works
- [ ] Create a trip → force-quit → relaunch → data intact
- [ ] Haptics fire on container select and on packed-toggle
- [ ] Camera capture attaches a photo to an item
- [ ] Native share sends a packing list
- [ ] Safe areas respected on a notched device and one with a home indicator
- [ ] No service worker registered (check `navigator.serviceWorker.controller` is null)

---

## 6. Still to write for store submission

These were part of M7's scope and do **not** exist yet:

- **`STORE.md`** — app name, subtitle, description, keywords, screenshot
  checklist per required device size, age-rating answers, and the data-safety
  line: _"This app does not collect any data. All information is stored on your
  device."_
- **`PRIVACY.md`** — must be published at a reachable URL. Both stores require
  one even for zero-collection apps. GitHub Pages already serves this repo, so
  `https://<user>.github.io/packup/PRIVACY.html` is the natural home.
- **`@capacitor/filesystem`** — needed for `saveTextFile`/`pickTextFile` on
  native; the web build uses a Blob download and `<input type="file">`.

## 7. Apple guideline 4.2

App Store review rejects apps that are "just a website in a wrapper". The
features that earn a native release here, all already built or specified above:
full offline operation, camera capture of items, haptic feedback, and native
share of a packing list. Lead with those in the review notes.
