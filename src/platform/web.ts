import type { Platform } from './index';

const HAPTIC_PATTERNS: Record<'light' | 'success' | 'warning', number | number[]> = {
  light: 10,
  success: [12, 40, 12],
  warning: [24, 60, 24],
};

/** Spec §3: photos are downscaled to <=512px on the long edge, JPEG q0.7. */
export const PHOTO_MAX_EDGE = 512;
export const PHOTO_QUALITY = 0.7;

export async function downscaleToDataUrl(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
  } finally {
    bitmap.close();
  }
}

export const webPlatform: Platform = {
  isNative: false,

  async haptic(kind) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(HAPTIC_PATTERNS[kind]);
    }
  },

  async share(payload) {
    const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
    if (canShare) {
      try {
        await navigator.share({ title: payload.title, text: payload.text });
        return;
      } catch (err) {
        // A user-cancelled share is not an error worth surfacing.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    // Fallback: clipboard, so the action always does something.
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${payload.title}\n\n${payload.text}`);
    }
  },

  pickPhoto() {
    return new Promise<string | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.style.display = 'none';

      // 'cancel' does not fire everywhere; focus regain is the portable backstop.
      let settled = false;
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(value);
      };

      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return finish(null);
        downscaleToDataUrl(file).then(finish, () => finish(null));
      });
      input.addEventListener('cancel', () => finish(null));

      document.body.append(input);
      input.click();
    });
  },

  async saveTextFile(filename, text, mimeType = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      // Revoking immediately can abort the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  },

  pickTextFile(accept = 'application/json,.json') {
    return new Promise<string | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none';

      let settled = false;
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(value);
      };

      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return finish(null);
        file.text().then(finish, () => finish(null));
      });
      input.addEventListener('cancel', () => finish(null));

      document.body.append(input);
      input.click();
    });
  },
};
