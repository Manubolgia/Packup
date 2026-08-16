/**
 * C8: the app must remain fully usable when WebGL is unavailable — old devices,
 * WebGL-disabled WebViews, and reviewers on odd hardware. Detection runs once
 * and the result is cached, because creating a probe context is not free.
 */
let cached: boolean | undefined;

export function isWebGLAvailable(): boolean {
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') {
    cached = false;
    return cached;
  }

  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    cached = context !== null;

    // Release the probe context immediately rather than waiting for GC: browsers
    // cap the number of live contexts, and this one is never drawn to.
    if (context && 'getExtension' in context) {
      (context as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // A throwing getContext (some locked-down WebViews) means no WebGL.
    cached = false;
  }

  return cached;
}

/** Test seam — detection is memoised for the page's lifetime otherwise. */
export function resetWebGLDetection(value?: boolean): void {
  cached = value;
}
