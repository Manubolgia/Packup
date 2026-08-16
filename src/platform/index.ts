/**
 * Platform abstraction (spec §7).
 *
 * Web implementations ship today; Capacitor implementations are swapped in at
 * M7 by changing the selection below, not by touching any caller. Nothing
 * outside this folder may reference navigator.* or @capacitor/* directly.
 */
export interface Platform {
  haptic(kind: 'light' | 'success' | 'warning'): Promise<void>;
  share(payload: { title: string; text: string; files?: Blob[] }): Promise<void>;
  pickPhoto(): Promise<string | null>; // downscaled data URL, or null if cancelled
  isNative: boolean;
}

import { webPlatform } from './web';

/**
 * Capacitor injects `window.Capacitor` before the app bundle runs. Detecting it
 * here (rather than importing @capacitor/core) keeps the web build free of any
 * native dependency until M7.
 */
function detectNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() ?? false;
}

export const isNativeRuntime = detectNative();

export const platform: Platform = webPlatform;
