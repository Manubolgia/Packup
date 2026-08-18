import { matteMaterial, floorMaterial } from './materials';

/**
 * The hotel room the luggage stands in (§5). Fixed front-facing view, drawn
 * entirely from primitives and one canvas texture — nothing fetched (C4).
 * Colourful and flat-shaded on purpose: a picture-book room, not a render.
 *
 * Everything here is static decoration. Interaction (selecting, adding) lives
 * on the containers and empty slots, never on the room.
 */

/** Room palette. The curtain mustard deliberately echoes the app accent. */
const WALL = '#7FA48E';
const CREAM = '#F2EAD8';
const WOOD_DARK = '#7C5A3C';
const TERRACOTTA = '#C05F3C';
const LINEN = '#F5F1E6';
const CURTAIN = '#E8A317';
const LEAF = '#5C8A57';
const SKY = '#FFE9BB';

export const BACK_WALL_Z = -2.65;

export function Room() {
  return (
    <group>
      {/* Floor and back wall — the stage. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0.5, 0, 1.2]}
        receiveShadow
        material={floorMaterial()}
      >
        <planeGeometry args={[16, 9]} />
      </mesh>
      <mesh position={[0.5, 2.6, BACK_WALL_Z]} receiveShadow material={matteMaterial(WALL)}>
        <planeGeometry args={[16, 5.2]} />
      </mesh>

      {/* Skirting board and picture rail: the two lines that make it a wall. */}
      <mesh position={[0.5, 0.09, BACK_WALL_Z + 0.03]} material={matteMaterial(CREAM)}>
        <boxGeometry args={[16, 0.18, 0.05]} />
      </mesh>
      <mesh position={[0.5, 2.3, BACK_WALL_Z + 0.02]} material={matteMaterial(CREAM)}>
        <boxGeometry args={[16, 0.05, 0.03]} />
      </mesh>

      {/* Window, right of centre, with the mustard curtains. */}
      <group position={[2.05, 1.75, BACK_WALL_Z]}>
        <mesh position={[0, 0, 0.03]} material={matteMaterial(CREAM)} castShadow>
          <boxGeometry args={[1.8, 1.5, 0.07]} />
        </mesh>
        {/* The pane is basic material: it must glow like daylight, unlit. */}
        <mesh position={[0, 0, 0.075]}>
          <planeGeometry args={[1.56, 1.26]} />
          <meshBasicMaterial color={SKY} />
        </mesh>
        <mesh position={[0, 0, 0.085]} material={matteMaterial(CREAM)}>
          <boxGeometry args={[0.05, 1.26, 0.02]} />
        </mesh>
        <mesh position={[0, 0, 0.085]} material={matteMaterial(CREAM)}>
          <boxGeometry args={[1.56, 0.05, 0.02]} />
        </mesh>
        {/* Curtains and pelmet. */}
        <mesh position={[-1.13, -0.05, 0.14]} material={matteMaterial(CURTAIN, 0.85)} castShadow>
          <boxGeometry args={[0.3, 1.9, 0.12]} />
        </mesh>
        <mesh position={[1.13, -0.05, 0.14]} material={matteMaterial(CURTAIN, 0.85)} castShadow>
          <boxGeometry args={[0.3, 1.9, 0.12]} />
        </mesh>
        <mesh position={[0, 0.95, 0.12]} material={matteMaterial(CURTAIN, 0.85)}>
          <boxGeometry args={[2.62, 0.14, 0.16]} />
        </mesh>
      </group>

      {/* Framed print, left of centre. */}
      <group position={[-1.55, 1.95, BACK_WALL_Z + 0.02]}>
        <mesh material={matteMaterial(WOOD_DARK)}>
          <boxGeometry args={[0.62, 0.82, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.025]} material={matteMaterial(LINEN)}>
          <planeGeometry args={[0.52, 0.72]} />
        </mesh>
        {/* The print: a minimal mountain-and-sun postcard. */}
        <mesh position={[0, -0.12, 0.03]} material={matteMaterial(TERRACOTTA)}>
          <coneGeometry args={[0.2, 0.26, 4]} />
        </mesh>
        <mesh position={[0.14, 0.18, 0.03]} material={matteMaterial(CURTAIN)}>
          <cylinderGeometry args={[0.07, 0.07, 0.01, 20]} />
        </mesh>
      </group>

      {/* The bed, cropped by the left edge of the frame — the room continues. */}
      <group position={[-3.55, 0, -1.5]}>
        <mesh position={[0, 0.6, -1.1]} material={matteMaterial(WOOD_DARK)} castShadow>
          <boxGeometry args={[2.7, 1.1, 0.09]} />
        </mesh>
        <mesh position={[0, 0.24, 0]} material={matteMaterial(WOOD_DARK)} castShadow>
          <boxGeometry args={[2.7, 0.38, 2.1]} />
        </mesh>
        <mesh position={[0, 0.55, 0]} material={matteMaterial(LINEN, 0.95)} castShadow>
          <boxGeometry args={[2.6, 0.26, 2.0]} />
        </mesh>
        <mesh position={[0, 0.72, -0.65]} material={matteMaterial(CREAM, 0.95)}>
          <boxGeometry args={[0.7, 0.14, 0.45]} />
        </mesh>
        <mesh position={[0, 0.64, 0.55]} material={matteMaterial(TERRACOTTA, 0.95)} castShadow>
          <boxGeometry args={[2.62, 0.12, 0.85]} />
        </mesh>
      </group>

      {/* Nightstand and its lamp — the warm light in the corner. */}
      <group position={[-2.35, 0, -2.15]}>
        <mesh position={[0, 0.26, 0]} material={matteMaterial(WOOD_DARK)} castShadow>
          <boxGeometry args={[0.5, 0.52, 0.45]} />
        </mesh>
        <mesh position={[0, 0.58, 0]} material={matteMaterial(TRIMWOOD)}>
          <cylinderGeometry args={[0.03, 0.05, 0.12, 10]} />
        </mesh>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.1, 0.16, 0.2, 14, 1, true]} />
          <meshStandardMaterial
            color={CREAM}
            emissive="#FFC97A"
            emissiveIntensity={0.85}
            roughness={0.9}
          />
        </mesh>
      </group>

      {/* Rug under the luggage rows: cream border, terracotta field. */}
      <mesh position={[0.3, 0.012, 0.2]} receiveShadow material={matteMaterial(CREAM, 0.95)}>
        <boxGeometry args={[4.9, 0.024, 3.2]} />
      </mesh>
      <mesh position={[0.3, 0.026, 0.2]} receiveShadow material={matteMaterial(TERRACOTTA, 0.95)}>
        <boxGeometry args={[4.55, 0.024, 2.85]} />
      </mesh>

      {/* Hotel slippers by the rug — the foreground detail the tilted phone
          framing would otherwise leave as bare floor. */}
      <group position={[0.7, 0, 2.4]} rotation={[0, -0.35, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.14, 0, side * 0.04]}>
            <mesh position={[0, 0.02, 0]} material={matteMaterial(CREAM, 0.95)} castShadow>
              <boxGeometry args={[0.13, 0.04, 0.34]} />
            </mesh>
            <mesh position={[0, 0.06, -0.06]} material={matteMaterial(TERRACOTTA, 0.95)}>
              <boxGeometry args={[0.13, 0.04, 0.14]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Potted plant in the right corner. */}
      <group position={[3.7, 0, -2.05]}>
        <mesh position={[0, 0.19, 0]} material={matteMaterial(TERRACOTTA)} castShadow>
          <cylinderGeometry args={[0.2, 0.15, 0.38, 12]} />
        </mesh>
        <mesh position={[0, 0.66, 0]} material={matteMaterial(LEAF)} castShadow>
          <sphereGeometry args={[0.3, 12, 10]} />
        </mesh>
        <mesh position={[-0.18, 0.92, 0.05]} material={matteMaterial(LEAF)} castShadow>
          <sphereGeometry args={[0.2, 12, 10]} />
        </mesh>
        <mesh position={[0.2, 0.98, -0.06]} material={matteMaterial(LEAF)} castShadow>
          <sphereGeometry args={[0.24, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
}

/** Lamp stem tone — kept here because it is only ever used above. */
const TRIMWOOD = '#4A3826';
