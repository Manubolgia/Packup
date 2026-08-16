import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { HOME_CAMERA, type CameraFraming } from './layout';

export interface CameraRigProps {
  /** Where to fly to; null means stay where the user left it. */
  framing: CameraFraming | null;
  controls: React.RefObject<OrbitControlsImpl | null>;
  /** Nudges the demand-driven frameloop while the tween runs. */
  invalidate: () => void;
}

/** §4.3: 600ms, ease-out — fast enough to feel like a jump-cut with continuity. */
const DURATION_MS = 600;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Eases the camera to frame a container. Written as a tween over the
 * OrbitControls target (rather than setting position directly) so the user's
 * orbit angle is preserved — they end up looking at the new thing from where
 * they were standing, which is far less disorienting than a hard cut.
 */
export function CameraRig({ framing, controls, invalidate }: CameraRigProps) {
  const { camera } = useThree();
  const tween = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    fromDist: number;
    toDist: number;
    start: number;
  } | null>(null);

  useEffect(() => {
    if (!framing) return;
    const ctrl = controls.current;
    if (!ctrl) return;

    const to = new THREE.Vector3(...framing.target);
    const from = ctrl.target.clone();
    const fromDist = camera.position.distanceTo(ctrl.target);

    // Skip the tween when already framed, so repeated taps do not re-animate.
    if (from.distanceTo(to) < 0.01 && Math.abs(fromDist - framing.distance) < 0.01) return;

    tween.current = {
      from,
      to,
      fromDist,
      toDist: framing.distance,
      start: performance.now(),
    };
    invalidate();
  }, [framing, controls, camera, invalidate]);

  useFrame(() => {
    const active = tween.current;
    const ctrl = controls.current;
    if (!active || !ctrl) return;

    const elapsed = performance.now() - active.start;
    const t = Math.min(elapsed / DURATION_MS, 1);
    const eased = easeOut(t);

    // Preserve the viewing direction while target and distance interpolate.
    const direction = camera.position.clone().sub(ctrl.target).normalize();
    ctrl.target.lerpVectors(active.from, active.to, eased);
    const distance = active.fromDist + (active.toDist - active.fromDist) * eased;
    camera.position.copy(ctrl.target).addScaledVector(direction, distance);
    ctrl.update();

    if (t >= 1) tween.current = null;
    invalidate();
  });

  return null;
}

export { HOME_CAMERA };
