import { RoundedBox } from '@react-three/drei';
import type { Container } from '@/domain/types';
import { KIND_SIZE } from '../layout';
import { trimMaterial } from '../materials';
import type * as THREE from 'three';

/**
 * Procedural luggage (C4, §5). Every shape is primitives — no loaded models —
 * so the bundle carries no geometry and nothing is fetched at runtime.
 *
 * Each shape takes the resolved material so selected/unselected variants share
 * one cached instance rather than allocating per mesh.
 */
export interface ShapeProps {
  container: Container;
  material: THREE.Material;
}

export function SuitcaseShape({ container, material }: ShapeProps) {
  const [hx, hy, hz] = KIND_SIZE.suitcase;
  // A duffel is softer and squatter than a hardshell.
  const duffel = container.subtype === 'duffel';
  const radius = duffel ? 0.16 : 0.06;
  const height = duffel ? hy * 0.78 : hy;

  return (
    <group>
      <RoundedBox
        args={[hx * 2, height * 2, hz * 2]}
        radius={radius}
        smoothness={2}
        material={material}
      />
      {/* Inset front panel: a slightly smaller box proud of the face. */}
      <RoundedBox
        args={[hx * 1.5, height * 1.4, 0.02]}
        radius={0.02}
        smoothness={2}
        position={[0, 0, hz + 0.01]}
        material={material}
      />
      {!duffel ? (
        <>
          {/* Telescoping handle */}
          <mesh position={[0, height + 0.11, -hz * 0.4]} material={trimMaterial()}>
            <boxGeometry args={[hx * 0.9, 0.22, 0.03]} />
          </mesh>
          {/* Wheels, one pair, at the base corners */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * hx * 0.7, -height, hz * 0.4]}
              rotation={[0, 0, Math.PI / 2]}
              material={trimMaterial()}
            >
              <cylinderGeometry args={[0.07, 0.07, 0.06, 10]} />
            </mesh>
          ))}
        </>
      ) : (
        // A duffel gets a carry strap instead of wheels and a handle.
        <mesh
          position={[0, height * 0.95, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={trimMaterial()}
        >
          <torusGeometry args={[hx * 0.42, 0.022, 6, 16, Math.PI]} />
        </mesh>
      )}
    </group>
  );
}

export function BagShape({ container, material }: ShapeProps) {
  const [hx, hy, hz] = KIND_SIZE.bag;
  const tote = container.subtype === 'tote';
  const flat = container.subtype === 'laptop-bag';
  const height = flat ? hy * 0.72 : hy;
  const depth = flat ? hz * 0.5 : hz;

  return (
    <group>
      <RoundedBox
        args={[hx * 2, height * 2, depth * 2]}
        radius={tote ? 0.04 : 0.1}
        smoothness={2}
        material={material}
      />
      {tote || flat ? (
        // Tote/laptop bag: a rigid handle arc over the opening.
        <mesh
          position={[0, height + 0.07, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={trimMaterial()}
        >
          <torusGeometry args={[0.12, 0.018, 6, 16, Math.PI]} />
        </mesh>
      ) : (
        // Backpack/shoulder bag: straps down the back face.
        [-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * hx * 0.45, 0, -depth - 0.02]}
            rotation={[Math.PI / 2, 0, 0]}
            material={trimMaterial()}
          >
            <torusGeometry args={[height * 0.62, 0.022, 6, 12, Math.PI]} />
          </mesh>
        ))
      )}
    </group>
  );
}

export function PouchShape({ material }: ShapeProps) {
  const [hx, hy, hz] = KIND_SIZE.pouch;
  return (
    <group>
      <RoundedBox
        args={[hx * 2, hy * 2, hz * 2]}
        radius={0.05}
        smoothness={2}
        material={material}
      />
      {/* Zip line: a thin stretched box across the top face. */}
      <mesh position={[0, hy * 0.72, 0]} material={trimMaterial()}>
        <boxGeometry args={[hx * 1.85, 0.012, hz * 0.28]} />
      </mesh>
    </group>
  );
}

export function PersonShape({ material }: ShapeProps) {
  const [hx, hy] = KIND_SIZE.person;
  return (
    <group>
      {/* Torso — a capsule, no face (§5). */}
      <mesh position={[0, 0, 0]} material={material}>
        <capsuleGeometry args={[hx * 0.78, hy * 0.9, 4, 12]} />
      </mesh>
      <mesh position={[0, hy * 0.92, 0]} material={material}>
        <sphereGeometry args={[hx * 0.52, 14, 12]} />
      </mesh>
    </group>
  );
}

const SHAPES = {
  suitcase: SuitcaseShape,
  bag: BagShape,
  pouch: PouchShape,
  person: PersonShape,
} as const;

export function ContainerShape(props: ShapeProps) {
  const Shape = SHAPES[props.container.kind];
  return <Shape {...props} />;
}
