import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Container, Item } from '@/domain/types';
import { fillRatio, fillStatus, usedUnitsDeep } from '@/domain/volume';
import { fillBlockCount, KIND_SIZE, type PlacedContainer } from '../layout';
import { fillMaterial, ghostMaterial, shellMaterial } from '../materials';
import { ContainerShape } from './Shapes';

export interface ContainerNodeProps {
  placed: PlacedContainer;
  containers: readonly Container[];
  items: readonly Item[];
  accentColor: string;
  selected: boolean;
  /** Pulses an outline for ~1.5s when the drawer taps through (§4.3). */
  highlighted: boolean;
  onSelect: (id: string) => void;
  onHover: (hovering: boolean) => void;
}

const HIGHLIGHT_PERIOD = 0.55;

export function ContainerNode({
  placed,
  containers,
  items,
  accentColor,
  selected,
  highlighted,
  onSelect,
  onHover,
}: ContainerNodeProps) {
  const { container, position, nested } = placed;
  const outlineRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const used = usedUnitsDeep(container.id, containers, items);
  const ratio = fillRatio(used, container.capacityUnits);
  const status = fillStatus(ratio);
  const blocks = fillBlockCount(used, container.capacityUnits);

  const material = selected ? ghostMaterial(container.colorHex) : shellMaterial(container.colorHex);
  const half = KIND_SIZE[container.kind];
  // A nested pouch is drawn smaller so it reads as "inside", not "next to".
  const scale = nested ? 0.72 : 1;

  const outlineGeometry = useMemo(
    () => new THREE.BoxGeometry(half[0] * 2.2, half[1] * 2.2, half[2] * 2.2),
    [half],
  );

  const outlineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: accentColor,
        wireframe: true,
        transparent: true,
        opacity: 0,
      }),
    [accentColor],
  );

  // The pulse is animation, not state: driving it here avoids re-rendering the
  // whole scene 60 times while it runs.
  useFrame(({ clock }) => {
    if (!outlineRef.current) return;
    const mat = outlineRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = highlighted
      ? 0.35 + 0.45 * Math.abs(Math.sin((clock.elapsedTime * Math.PI) / HIGHLIGHT_PERIOD))
      : 0;
    outlineRef.current.visible = highlighted;
  });

  const percent = Math.round(ratio * 100);
  const directCount = items.filter((i) => i.containerId === container.id).length;

  return (
    <group
      ref={groupRef}
      position={position as unknown as [number, number, number]}
      scale={scale}
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
      <ContainerShape container={container} material={material} />

      <mesh ref={outlineRef} geometry={outlineGeometry} material={outlineMaterial} visible={false} />

      {/* Selected: translucent shell reveals stacked volume blocks inside. */}
      {selected && blocks > 0 ? (
        <group>
          {Array.from({ length: blocks }, (_, i) => {
            const blockHeight = (half[1] * 1.7) / 12;
            return (
              <mesh
                key={i}
                position={[0, -half[1] * 0.85 + blockHeight * (i + 0.5), 0]}
                material={fillMaterial(accentColor)}
              >
                <boxGeometry args={[half[0] * 1.5, blockHeight * 0.82, half[2] * 1.5]} />
              </mesh>
            );
          })}
        </group>
      ) : null}

      {/* Unselected: an opaque shell with a fill bar on the front panel —
          cheaper and clearer than revealing the interior (§5). */}
      {!selected ? (
        <group position={[0, -half[1] * 0.82, half[2] + 0.012]}>
          <mesh>
            <planeGeometry args={[half[0] * 1.5, 0.05]} />
            <meshBasicMaterial color="#0E1113" transparent opacity={0.75} />
          </mesh>
          <mesh
            position={[(-half[0] * 1.5 * (1 - Math.min(ratio, 1))) / 2, 0, 0.002]}
            scale={[Math.max(Math.min(ratio, 1), 0.001), 1, 1]}
          >
            <planeGeometry args={[half[0] * 1.5, 0.05]} />
            <meshBasicMaterial color={status === 'red' ? '#C2401F' : accentColor} />
          </mesh>
        </group>
      ) : null}

      {/* §5 accessibility: every container is also a focusable button with a
          spoken label. This is what makes the scene operable without sight. */}
      <Html>
        <button
          className="sr-only-focusable"
          onClick={() => onSelect(container.id)}
          aria-pressed={selected}
        >
          {`${container.label}, ${directCount} items, ${percent} percent full`}
        </button>
      </Html>
    </group>
  );
}
