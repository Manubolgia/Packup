import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Container, ContainerKind, Item } from '@/domain/types';
import { CONTAINER_CAPS } from '@/domain/rules';
import { placeContainers } from './layout';
import { ContainerNode } from './containers/ContainerNode';
import { EmptySlot } from './EmptySlot';
import { Room } from './Room';

export interface SceneProps {
  containers: readonly Container[];
  items: readonly Item[];
  accentColor: string;
  selectedContainerId: string | null;
  highlightedContainerId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (kind: ContainerKind) => void;
}

const KINDS: readonly ContainerKind[] = ['suitcase', 'bag', 'pouch', 'person'];

/**
 * The fixed view (§5): one front-facing framing of the room, chosen once per
 * canvas size. The camera never orbits or flies — luggage simply appears.
 *
 * Two compositions, blended by aspect ratio. Landscape looks straight into the
 * room and backs off until the stage width fits. Portrait cannot fit a wide
 * room in a narrow frame at eye level, so it moves closer and higher and tilts
 * down — floor fills the lower frame, wall the upper, and the rows spread
 * vertically through the tilt instead of horizontally.
 */
const STAGE_HALF_WIDTH = 2.3;
const STAGE_HALF_HEIGHT = 1.6;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function FixedCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    // 0 = landscape framing, 1 = tall portrait framing.
    const t = Math.min(Math.max((1.15 - aspect) / 0.7, 0), 1);

    camera.fov = lerp(32, 58, t);
    const vHalf = Math.tan((camera.fov * Math.PI) / 360);
    const fitDistance = Math.max(
      STAGE_HALF_HEIGHT / vHalf,
      STAGE_HALF_WIDTH / (vHalf * Math.max(aspect, 0.2)),
    );

    const x = lerp(0.45, 0.1, t);
    const y = lerp(1.6, 2.35, t);
    const z = lerp(Math.min(fitDistance, 9) - 0.6, 4.8, t);
    const lookY = lerp(0.85, 0.58, t);
    const lookZ = lerp(-0.6, -1.05, t);

    camera.position.set(x, y, z);
    camera.lookAt(x, lookY, lookZ);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);

  return null;
}

/**
 * Procedurally generated environment map (RoomEnvironment ships with three) so
 * the standard materials have something to reflect — no HDRI fetched (C4).
 */
function SceneEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.45;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}

function SceneContents({
  containers,
  items,
  accentColor,
  selectedContainerId,
  highlightedContainerId,
  onSelect,
  onAdd,
}: SceneProps) {
  const placed = useMemo(() => placeContainers(containers), [containers]);

  // Slots with nothing in them become "add here" placeholders (§5).
  const emptySlots = useMemo(() => {
    const gaps: { kind: ContainerKind; slotIndex: number }[] = [];
    for (const kind of KINDS) {
      const taken = new Set<number>(
        containers.filter((c) => c.kind === kind && !c.parentContainerId).map((c) => c.slotIndex),
      );
      for (let slot = 0; slot < CONTAINER_CAPS[kind]; slot++) {
        if (!taken.has(slot)) gaps.push({ kind, slotIndex: slot });
      }
    }
    return gaps;
  }, [containers]);

  return (
    <>
      {/* Key/fill/rim (§5 v2). The key casts the one soft shadow map; the lamp
          point light warms the bed corner like a real hotel room at dusk. */}
      <hemisphereLight args={['#EAF2FF', '#B98A5C', 0.7]} />
      <directionalLight
        position={[-3.5, 5.5, 4.5]}
        intensity={1.9}
        color="#FFF2DC"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={7}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={16}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[3, 4, -3.5]} intensity={0.7} color="#BFD9CE" />
      <pointLight
        position={[-2.35, 0.95, -2.1]}
        color="#FFC97A"
        intensity={1.4}
        distance={4}
        decay={2}
      />

      {/* Fog softens the cropped room edges into depth rather than a cut.
          It starts beyond the back wall so the stage itself stays crisp. */}
      <fog attach="fog" args={['#87A891', 11, 30]} />

      {/* Tapping anywhere on the room itself clears the selection. */}
      <group onClick={() => onSelect(null)}>
        <Room />
      </group>

      {placed.map((p) => (
        <ContainerNode
          key={p.container.id}
          placed={p}
          items={items}
          accentColor={accentColor}
          selected={p.container.id === selectedContainerId}
          highlighted={p.container.id === highlightedContainerId}
          onSelect={onSelect}
          onHover={(h) => {
            document.body.style.cursor = h ? 'pointer' : '';
          }}
        />
      ))}

      {emptySlots.map(({ kind, slotIndex }) => (
        <EmptySlot key={`${kind}-${slotIndex}`} kind={kind} slotIndex={slotIndex} onAdd={onAdd} />
      ))}

      <FixedCamera />
      <SceneEnvironment />
    </>
  );
}

export function Scene(props: SceneProps) {
  return (
    <Canvas
      // demand: the scene only redraws on interaction or an active tween (§5).
      frameloop="demand"
      dpr={[1, 2]}
      shadows="soft"
      camera={{ fov: 30, near: 0.1, far: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        // Filmic tone mapping is most of "professional grade": highlights roll
        // off instead of clipping. Output is sRGB by default in this three.
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      // The canvas itself is decorative; the focusable buttons inside each
      // container carry the semantics (§5 accessibility).
      aria-hidden="true"
      style={{ touchAction: 'none' }}
    >
      {/* Anything past the walls fades to the wall tone, never to a void. */}
      <color attach="background" args={['#6E9480']} />
      <SceneContents {...props} />
    </Canvas>
  );
}
