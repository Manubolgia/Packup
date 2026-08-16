import * as THREE from 'three';

/**
 * Shared materials (§5 performance budget): containers of the same colour must
 * reuse one material instance, so 10 containers cost a handful of programs
 * rather than 10 uploads.
 *
 * The cache lives for the page's lifetime, which is correct — the palette is a
 * fixed set of six colours, so it cannot grow without bound.
 */
const shellCache = new Map<string, THREE.MeshLambertMaterial>();

export function shellMaterial(colorHex: string): THREE.MeshLambertMaterial {
  const existing = shellCache.get(colorHex);
  if (existing) return existing;
  // Lambert, not Standard: no metalness/roughness maps in this scene, and it
  // is markedly cheaper on the mid-range Android the budget targets.
  const material = new THREE.MeshLambertMaterial({ color: colorHex });
  shellCache.set(colorHex, material);
  return material;
}

/** The see-through version used while a container is selected (§5). */
const ghostCache = new Map<string, THREE.MeshLambertMaterial>();

export function ghostMaterial(colorHex: string): THREE.MeshLambertMaterial {
  const existing = ghostCache.get(colorHex);
  if (existing) return existing;
  const material = new THREE.MeshLambertMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  ghostCache.set(colorHex, material);
  return material;
}

/** Translucent blocks representing used volume, in the traveller's accent. */
const fillCache = new Map<string, THREE.MeshLambertMaterial>();

export function fillMaterial(accentHex: string): THREE.MeshLambertMaterial {
  const existing = fillCache.get(accentHex);
  if (existing) return existing;
  const material = new THREE.MeshLambertMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.8,
  });
  fillCache.set(accentHex, material);
  return material;
}

/** Dark trim shared by wheels, handles, zips — always the same colour. */
export const TRIM_COLOR = '#0E1113';

let trimMaterialInstance: THREE.MeshLambertMaterial | undefined;
export function trimMaterial(): THREE.MeshLambertMaterial {
  trimMaterialInstance ??= new THREE.MeshLambertMaterial({ color: TRIM_COLOR });
  return trimMaterialInstance;
}

/**
 * Faint ground footprint for an empty slot's "add here" placeholder. Flat and
 * dim on purpose: it must read as absence, never compete with real luggage.
 * DoubleSide so it stays visible from any permitted camera angle.
 */
let slotMaterialInstance: THREE.MeshBasicMaterial | undefined;
export function slotMaterial(): THREE.MeshBasicMaterial {
  slotMaterialInstance ??= new THREE.MeshBasicMaterial({
    color: '#F2F2F0',
    transparent: true,
    opacity: 0.07,
    side: THREE.DoubleSide,
  });
  return slotMaterialInstance;
}

/**
 * The ground: light enough under the luggage to separate dark shells from it,
 * fading to the page background at the rim so the plane has no visible edge
 * cutting across the frame. Drawn as a canvas-generated radial gradient — no
 * asset to fetch (C4), and one texture shared by the whole scene.
 */
let groundMaterialInstance: THREE.MeshLambertMaterial | undefined;

export function groundMaterial(): THREE.MeshLambertMaterial {
  if (groundMaterialInstance) return groundMaterialInstance;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#454C55');
  gradient.addColorStop(0.42, '#3A4149');
  gradient.addColorStop(1, '#14171A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  groundMaterialInstance = new THREE.MeshLambertMaterial({ map: texture });
  return groundMaterialInstance;
}

/** Test/HMR hook — the caches are module-level and otherwise permanent. */
export function disposeMaterials(): void {
  for (const cache of [shellCache, ghostCache, fillCache]) {
    for (const material of cache.values()) material.dispose();
    cache.clear();
  }
  trimMaterialInstance?.dispose();
  trimMaterialInstance = undefined;
  slotMaterialInstance?.dispose();
  slotMaterialInstance = undefined;
  groundMaterialInstance?.map?.dispose();
  groundMaterialInstance?.dispose();
  groundMaterialInstance = undefined;
}
