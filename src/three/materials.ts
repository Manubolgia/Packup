import * as THREE from 'three';

/**
 * Shared materials (§5 performance budget): containers of the same colour must
 * reuse one material instance, so 10 containers cost a handful of programs
 * rather than 10 uploads.
 *
 * Everything is MeshStandardMaterial so the room environment map and the
 * key/fill/rim rig actually read on the surfaces — Lambert was the old flat
 * look. The caches live for the page's lifetime, which is correct: the palettes
 * are fixed sets, so they cannot grow without bound.
 */

/** Hardshells are glossy plastic; fabric luggage is matte. */
export type Finish = 'hard' | 'soft';

const shellCache = new Map<string, THREE.MeshStandardMaterial>();

export function shellMaterial(
  colorHex: string,
  finish: Finish = 'soft',
): THREE.MeshStandardMaterial {
  const key = `${colorHex}:${finish}`;
  const existing = shellCache.get(key);
  if (existing) return existing;
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: finish === 'hard' ? 0.32 : 0.82,
    metalness: finish === 'hard' ? 0.12 : 0.02,
  });
  shellCache.set(key, material);
  return material;
}

/** Room props: cartoon-flat colour, no shine. One instance per (hex, rough). */
const matteCache = new Map<string, THREE.MeshStandardMaterial>();

export function matteMaterial(colorHex: string, roughness = 0.92): THREE.MeshStandardMaterial {
  const key = `${colorHex}:${roughness}`;
  const existing = matteCache.get(key);
  if (existing) return existing;
  const material = new THREE.MeshStandardMaterial({ color: colorHex, roughness, metalness: 0 });
  matteCache.set(key, material);
  return material;
}

/** Dark trim shared by wheels, handles, zips — always the same colour. */
export const TRIM_COLOR = '#23272C';

let trimMaterialInstance: THREE.MeshStandardMaterial | undefined;
export function trimMaterial(): THREE.MeshStandardMaterial {
  trimMaterialInstance ??= new THREE.MeshStandardMaterial({
    color: TRIM_COLOR,
    roughness: 0.5,
    metalness: 0.2,
  });
  return trimMaterialInstance;
}

/**
 * Faint corner brackets marking an empty slot's footprint — drawn like chalk
 * marks on the floor plan. Must read as absence, never compete with luggage.
 */
let slotMaterialInstance: THREE.MeshBasicMaterial | undefined;
export function slotMaterial(): THREE.MeshBasicMaterial {
  slotMaterialInstance ??= new THREE.MeshBasicMaterial({
    color: '#3A2E23',
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
  });
  return slotMaterialInstance;
}

/** Accent outline for the selected container, pulsed while locating (§4.3). */
const outlineCache = new Map<string, THREE.LineBasicMaterial>();
export function outlineMaterial(colorHex: string): THREE.LineBasicMaterial {
  const existing = outlineCache.get(colorHex);
  if (existing) return existing;
  const material = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
  outlineCache.set(colorHex, material);
  return material;
}

/**
 * The wooden floor: planks drawn into a canvas at runtime — no fetched asset
 * (C4), one texture shared by the whole room. Warm and slightly irregular so
 * the room reads hand-drawn rather than rendered.
 */
let floorMaterialInstance: THREE.MeshStandardMaterial | undefined;

export function floorMaterial(): THREE.MeshStandardMaterial {
  if (floorMaterialInstance) return floorMaterialInstance;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#B9895C';
  ctx.fillRect(0, 0, size, size);

  // Planks run along X (canvas rows). Deterministic pseudo-random tints so
  // every load draws the same floor.
  const plank = size / 8;
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let row = 0; row < 8; row++) {
    const tint = 0.92 + rand() * 0.16;
    ctx.fillStyle = `rgb(${Math.round(185 * tint)}, ${Math.round(137 * tint)}, ${Math.round(92 * tint)})`;
    ctx.fillRect(0, row * plank, size, plank - 2);
    // Butt joints: one seam per plank at a jittered position.
    ctx.fillStyle = 'rgba(90, 62, 40, 0.55)';
    ctx.fillRect(Math.floor(rand() * size), row * plank, 3, plank - 2);
    // A few grain streaks.
    ctx.strokeStyle = 'rgba(120, 84, 52, 0.25)';
    ctx.lineWidth = 1.5;
    for (let g = 0; g < 3; g++) {
      const y = row * plank + 8 + rand() * (plank - 16);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (rand() - 0.5) * 6);
      ctx.stroke();
    }
    // Gap between planks.
    ctx.fillStyle = 'rgba(70, 46, 28, 0.8)';
    ctx.fillRect(0, row * plank + plank - 2, size, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 4;
  floorMaterialInstance = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.85,
    metalness: 0,
  });
  return floorMaterialInstance;
}

/** Test/HMR hook — the caches are module-level and otherwise permanent. */
export function disposeMaterials(): void {
  for (const cache of [shellCache, matteCache]) {
    for (const material of cache.values()) material.dispose();
    cache.clear();
  }
  for (const material of outlineCache.values()) material.dispose();
  outlineCache.clear();
  trimMaterialInstance?.dispose();
  trimMaterialInstance = undefined;
  slotMaterialInstance?.dispose();
  slotMaterialInstance = undefined;
  floorMaterialInstance?.map?.dispose();
  floorMaterialInstance?.dispose();
  floorMaterialInstance = undefined;
}
