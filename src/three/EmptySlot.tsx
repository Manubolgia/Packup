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

/** Bracket arm length, thickness and lift off the floor.
    Lift clears the rug's top face — the bag and pouch rows stand on it. */
const ARM = 0.15;
const THICK = 0.028;
const LIFT = 0.055;

/**
 * Corner brackets marking the footprint of luggage that is not there yet,
 * doubling as an "add here" button (§5) — floor-tape marks on a stage plan,
 * with a small plus at the centre. Drawn flat so absence never reads louder
 * than the real luggage beside it.
 */
export function EmptySlot({ kind, slotIndex, onAdd }: EmptySlotProps) {
  const [hx, , hz] = KIND_SIZE[kind];
  const [x, , z] = slotPosition(kind, slotIndex);
  const material = slotMaterial();

  return (
    <group
      position={[x, LIFT, z]}
      onClick={(e) => {
        e.stopPropagation();
        onAdd(kind);
      }}
    >
      {/* Invisible hit plane: the brackets alone are a fiddly tap target. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[hx * 2.2, hz * 2.6]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * hx, 0, sz * hz]}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[-sx * (ARM / 2 - THICK / 2), 0, 0]}
              material={material}
            >
              <planeGeometry args={[ARM, THICK]} />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0, -sz * (ARM / 2 - THICK / 2)]}
              material={material}
            >
              <planeGeometry args={[THICK, ARM]} />
            </mesh>
          </group>
        )),
      )}

      {/* Centre plus: the invitation to add. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={material}>
        <planeGeometry args={[0.12, THICK]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={material}>
        <planeGeometry args={[THICK, 0.12]} />
      </mesh>

      <Html>
        <button className="sr-only-focusable" onClick={() => onAdd(kind)}>
          {`Add ${KIND_LABEL[kind].toLowerCase()} in slot ${slotIndex + 1}`}
        </button>
      </Html>
    </group>
  );
}
