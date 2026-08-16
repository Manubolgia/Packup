import { useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Container, ContainerKind, Item } from '@/domain/types';
import { CONTAINER_CAPS } from '@/domain/rules';
import { frameContainer, HOME_CAMERA, PERSON_X, placeContainers } from './layout';
import { groundMaterial } from './materials';
import { ContainerNode } from './containers/ContainerNode';
import { EmptySlot } from './EmptySlot';
import { CameraRig } from './CameraRig';

export interface SceneProps {
  containers: readonly Container[];
  items: readonly Item[];
  accentColor: string;
  selectedContainerId: string | null;
  highlightedContainerId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (kind: ContainerKind) => void;
  /** Bumped by the parent to re-trigger framing on the same container. */
  frameNonce?: number;
}

const KINDS: readonly ContainerKind[] = ['suitcase', 'bag', 'pouch', 'person'];

/** Exposes the r3f invalidate() to the demand frameloop from outside Canvas. */
function SceneContents({
  containers,
  items,
  accentColor,
  selectedContainerId,
  highlightedContainerId,
  onSelect,
  onAdd,
}: Omit<SceneProps, 'frameNonce'>) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { invalidate } = useThree();

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

  const framing = useMemo(() => {
    if (!selectedContainerId) return null;
    const target = placed.find((p) => p.container.id === selectedContainerId);
    return target ? frameContainer(target) : null;
  }, [selectedContainerId, placed]);

  return (
    <>
      {/* §5 budget: one hemisphere + one directional, no shadow maps, no HDRI.
          Lit generously because the palette is dark on dark — under a dimmer
          key the containers merge into the ground plane. */}
      <hemisphereLight args={['#F2F2F0', '#2B3138', 2.2]} />
      <directionalLight position={[3, 6, 4]} intensity={1.8} />

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.45}
        scale={12}
        blur={2.4}
        far={4}
        resolution={256}
      />

      {/* Ground plane. Clicking it clears the selection. */}
      {/* Centred on the scene's own centre of mass (the rows plus the person to
          their right), and wide enough that its edges never cut across the
          frame as a visible diagonal. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[PERSON_X / 2, 0, 0]}
        onClick={() => onSelect(null)}
        receiveShadow={false}
      >
        <planeGeometry args={[26, 26]} />
        <primitive object={groundMaterial()} attach="material" />
      </mesh>

      {placed.map((p) => (
        <ContainerNode
          key={p.container.id}
          placed={p}
          containers={containers}
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

      <CameraRig framing={framing} controls={controls} invalidate={invalidate} />

      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        // Clamped so the user can never get under the floor or behind the scene.
        minPolarAngle={0.15 * Math.PI}
        maxPolarAngle={0.48 * Math.PI}
        minAzimuthAngle={-0.6}
        maxAzimuthAngle={0.6}
        minDistance={1.6}
        maxDistance={9}
        target={HOME_CAMERA.target as unknown as [number, number, number]}
        onChange={() => invalidate()}
      />
    </>
  );
}

export function Scene(props: SceneProps) {
  const { containers } = props;

  return (
    <Canvas
      // demand: the scene only redraws on interaction or an active tween (§5).
      frameloop="demand"
      dpr={[1, 2]}
      camera={{
        // A shallow angle: looking down steeply turns the scene into a floor
        // plan rather than a view of luggage standing in a room.
        position: [
          HOME_CAMERA.target[0],
          HOME_CAMERA.target[1] + 2.4,
          HOME_CAMERA.target[2] + HOME_CAMERA.distance,
        ],
        fov: 42,
      }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // The canvas itself is decorative; the focusable buttons inside each
      // container carry the semantics (§5 accessibility).
      aria-hidden="true"
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#14171A']} />
      <SceneContents {...props} key={containers.length === 0 ? 'empty' : 'scene'} />
    </Canvas>
  );
}
