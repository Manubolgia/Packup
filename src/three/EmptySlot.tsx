import { Html } from '@react-three/drei';
import type { ContainerKind } from '@/domain/types';
import { KIND_LABEL } from '@/domain/catalog';
import { KIND_SIZE, slotPosition } from './layout';
import { slotMaterial } from './materials';

export interface EmptySlotProps {
  kind: ContainerKind;
  slotIndex: number;
  onAdd: (kind: ContainerKind) => void;
}

/**
 * A faint footprint on the ground standing in for luggage that is not there
 * yet, doubling as an "add here" button (§5). Drawn flat rather than as a
 * wireframe box: a full box outline reads louder than the real luggage beside
 * it, which inverts the visual hierarchy.
 */
export function EmptySlot({ kind, slotIndex, onAdd }: EmptySlotProps) {
  const [hx, , hz] = KIND_SIZE[kind];
  const [x, , z] = slotPosition(kind, slotIndex);

  return (
    <group
      position={[x, 0.012, z]}
      onClick={(e) => {
        e.stopPropagation();
        onAdd(kind);
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={slotMaterial()}>
        <planeGeometry args={[hx * 2, hz * 2]} />
      </mesh>
      <Html>
        <button className="sr-only-focusable" onClick={() => onAdd(kind)}>
          {`Add ${KIND_LABEL[kind].toLowerCase()} in slot ${slotIndex + 1}`}
        </button>
      </Html>
    </group>
  );
}
