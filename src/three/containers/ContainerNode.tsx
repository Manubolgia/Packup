import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Item } from '@/domain/types';
import { KIND_SIZE, type PlacedContainer } from '../layout';
import { ContainerShape } from './Shapes';

export interface ContainerNodeProps {
  placed: PlacedContainer;
  items: readonly Item[];
  accentColor: string;
  selected: boolean;
  /** Pulses the outline for ~1.5s when the drawer taps through (§4.3). */
  highlighted: boolean;
  onSelect: (id: string) => void;
  onHover: (hovering: boolean) => void;
}

const HIGHLIGHT_PERIOD = 0.55;
/** Seconds for a newly added container to pop into place. */
const APPEAR_S = 0.35;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function ContainerNode({
  placed,
  items,
  accentColor,
  selected,
  highlighted,
  onSelect,
  onHover,
}: ContainerNodeProps) {
  const { container, position, nested } = placed;
  const groupRef = useRef<THREE.Group>(null);
  const outlineRef = useRef<THREE.LineSegments>(null);
  const { invalidate } = useThree();

  // A nested pouch is drawn smaller so it reads as "inside", not "next to".
  const baseScale = nested ? 0.72 : 1;
  /** 0→1 mount animation: the room populates as luggage is added. */
  const appear = useRef(0);

  const half = KIND_SIZE[container.kind];

  // Accent outline for selected/located. Local instances, not the shared
  // caches: the pulse mutates opacity, which must not leak to other nodes.
  const outlineGeometry = useMemo(
    () =>
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(half[0] * 2.16, half[1] * 2.16, half[2] * 2.16),
      ),
    [half],
  );
  const outlineMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.95 }),
    [accentColor],
  );
  useEffect(
    () => () => {
      outlineGeometry.dispose();
      outlineMat.dispose();
    },
    [outlineGeometry, outlineMat],
  );

  // Animation, not state: driving it here avoids re-rendering the whole scene
  // 60 times while it runs. The demand frameloop only ticks while we invalidate.
  useFrame(({ clock }, delta) => {
    let animating = false;

    if (appear.current < 1) {
      appear.current = Math.min(1, appear.current + delta / APPEAR_S);
      animating = true;
    }
    groupRef.current?.scale.setScalar(baseScale * easeOutCubic(appear.current));

    if (outlineRef.current) {
      outlineRef.current.visible = selected || highlighted;
      if (highlighted) {
        outlineMat.opacity =
          0.35 + 0.6 * Math.abs(Math.sin((clock.elapsedTime * Math.PI) / HIGHLIGHT_PERIOD));
        animating = true;
      } else {
        outlineMat.opacity = 0.95;
      }
    }

    if (animating) invalidate();
  });

  const mine = items.filter((i) => i.containerId === container.id);
  const packedCount = mine.filter((i) => i.packed).length;

  return (
    <group
      ref={groupRef}
      position={position as unknown as [number, number, number]}
      scale={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(container.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      <ContainerShape container={container} />

      <lineSegments
        ref={outlineRef}
        geometry={outlineGeometry}
        material={outlineMat}
        visible={false}
      />

      {/* Stage mark under the selected container — the flat, technical-drawing
          answer to a glow. Skipped for nested pouches riding a parent. */}
      {selected && !nested ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045 - position[1], 0]}>
          <planeGeometry args={[half[0] * 2.9, half[2] * 3.6]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.3} />
        </mesh>
      ) : null}

      {/* §5 accessibility: every container is also a focusable button with a
          spoken label. This is what makes the scene operable without sight. */}
      <Html>
        <button
          className="sr-only-focusable"
          onClick={() => onSelect(container.id)}
          aria-pressed={selected}
        >
          {`${container.label}, ${mine.length} items, ${packedCount} packed`}
        </button>
      </Html>
    </group>
  );
}
