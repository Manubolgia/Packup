/**
 * Capacitor implementations land in M7.
 *
 * This file is intentionally not wired up yet: importing @capacitor/* before
 * those packages are installed would break the web build. At M7 this exports a
 * `nativePlatform: Platform` backed by @capacitor/haptics, /share and /camera,
 * and `platform` in ./index.ts becomes a runtime pick on `isNativeRuntime`.
 * No caller changes.
 */
export {};
