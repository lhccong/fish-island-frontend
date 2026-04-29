import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getLocalPredictor } from '../../network/NetworkSyncRegistry';
import { useGameStore } from '../../store/useGameStore';

const RANGE_CIRCLE_COLOR = 0x4488ff;
const DIRECTIONAL_COLOR = 0x44ddff;
const AOE_CIRCLE_COLOR = 0xff8844;
const RANGE_RING_WIDTH = 0.12;
const AOE_RING_WIDTH = 0.08;
const INDICATOR_Y_OFFSET = 0.06;
const DEFAULT_DIRECTIONAL_WIDTH = 1.0;
const DIRECTIONAL_ARROW_HEAD_LENGTH = 1.25;
const DIRECTIONAL_ARROW_HEAD_WIDTH_SCALE = 1.75;
const AIM_SYNC_EPSILON = 0.02;
const RANGE_PULSE_SPEED = 3;
const TARGET_HIGHLIGHT_COLOR = 0xff4444;
const TARGET_ALLOWED_HIGHLIGHT_COLOR = 0x55dd88;

function arePointsClose(
  a?: { x: number; y: number; z: number } | null,
  b?: { x: number; y: number; z: number } | null,
): boolean {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return Math.abs(a.x - b.x) <= AIM_SYNC_EPSILON
    && Math.abs(a.y - b.y) <= AIM_SYNC_EPSILON
    && Math.abs(a.z - b.z) <= AIM_SYNC_EPSILON;
}

function toSerializedVector3(vector: THREE.Vector3): { x: number; y: number; z: number } {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function getAimCasterPosition(casterId?: string | null): THREE.Vector3 | null {
  const store = useGameStore.getState();
  const champion = casterId
    ? store.champions.find((c) => c.id === casterId) ?? null
    : store.champions.find((c) => c.isMe) ?? null;
  if (!champion) {
    return null;
  }
  if (champion.isMe) {
    const predictor = getLocalPredictor();
    if (predictor?.initialized) {
      return predictor.getCurrentState().position;
    }
  }
  return champion.position;
}

const RangeCircle: React.FC<{ range: number }> = ({ range }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);

  const geometry = useMemo(() => {
    const inner = Math.max(0, range - RANGE_RING_WIDTH);
    return new THREE.RingGeometry(inner, range, 64);
  }, [range]);

  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: RANGE_CIRCLE_COLOR,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const casterPosition = getAimCasterPosition(useGameStore.getState().spellAimState?.casterId);
    if (!casterPosition) return;
    mesh.position.set(casterPosition.x, INDICATOR_Y_OFFSET, casterPosition.z);
    mesh.rotation.x = -Math.PI / 2;
    pulseRef.current += RANGE_PULSE_SPEED * delta;
    const pulseValue = Math.sin(pulseRef.current);
    material.opacity = 0.28 + pulseValue * 0.08;
    const scaleAdjust = 1 + pulseValue * 0.01;
    mesh.scale.set(scaleAdjust, scaleAdjust, 1);
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />;
};

const TargetHighlight: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);
  const geometry = useMemo(() => new THREE.RingGeometry(0.5, 0.7, 32), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: TARGET_HIGHLIGHT_COLOR,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const aim = useGameStore.getState().spellAimState;
    const hoveredId = aim?.hoveredTargetEntityId;
    const hoveredAllowed = aim?.hoveredTargetAllowed;
    if (!hoveredId) {
      mesh.visible = false;
      return;
    }

    const store = useGameStore.getState();
    const champion = store.champions.find((c) => c.id === hoveredId);
    const minion = store.minions.find((m) => m.id === hoveredId);
    const tower = store.towers.find((t) => t.id === hoveredId);
    const nexus = store.nexuses.find((n) => n.id === hoveredId);
    const inhibitor = store.inhibitors.find((i) => i.id === hoveredId);
    const targetPos = champion?.position ?? minion?.position ?? tower?.position ?? nexus?.position ?? inhibitor?.position ?? null;
    if (!targetPos) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    mesh.position.set(targetPos.x, INDICATOR_Y_OFFSET + 0.02, targetPos.z);
    mesh.rotation.x = -Math.PI / 2;
    material.color.setHex(hoveredAllowed ? TARGET_ALLOWED_HIGHLIGHT_COLOR : TARGET_HIGHLIGHT_COLOR);
    pulseRef.current += 4 * delta;
    const pulseValue = Math.sin(pulseRef.current);
    material.opacity = 0.45 + pulseValue * 0.15;
    const s = 1 + pulseValue * 0.06;
    mesh.scale.set(s, s, 1);
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />;
};

const DirectionalRect: React.FC<{
  range: number;
  width: number;
  cursorRef: React.RefObject<THREE.Vector3>;
}> = ({ range, width, cursorRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const headLength = Math.min(range * 0.38, Math.max(width * 1.35, DIRECTIONAL_ARROW_HEAD_LENGTH));
    const bodyLength = Math.max(0.18, range - headLength);
    const halfWidth = width / 2;
    const headHalfWidth = Math.max(halfWidth * DIRECTIONAL_ARROW_HEAD_WIDTH_SCALE, halfWidth + 0.22);
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(-halfWidth, bodyLength);
    shape.lineTo(-headHalfWidth, bodyLength);
    shape.lineTo(0, range);
    shape.lineTo(headHalfWidth, bodyLength);
    shape.lineTo(halfWidth, bodyLength);
    shape.lineTo(halfWidth, 0);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [range, width]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: DIRECTIONAL_COLOR,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  useFrame(() => {
    const mesh = meshRef.current;
    const cursor = cursorRef.current;
    if (!mesh || !cursor) return;
    const casterPosition = getAimCasterPosition(useGameStore.getState().spellAimState?.casterId);
    if (!casterPosition) return;
    const dx = cursor.x - casterPosition.x;
    const dz = cursor.z - casterPosition.z;
    const angle = Math.atan2(dx, dz);
    mesh.position.set(casterPosition.x, INDICATOR_Y_OFFSET, casterPosition.z);
    mesh.rotation.set(-Math.PI / 2, 0, angle + Math.PI);
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />;
};

const DirectionalArrow: React.FC<{
  width: number;
  cursorRef: React.RefObject<THREE.Vector3>;
}> = ({ width, cursorRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const bodyHalfWidth = Math.max(0.16, width * 0.28);
    const arrowLength = Math.max(0.65, width * 0.95);
    shape.moveTo(0, arrowLength);
    shape.lineTo(-bodyHalfWidth, 0.16);
    shape.lineTo(0, 0.34);
    shape.lineTo(bodyHalfWidth, 0.16);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [width]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: DIRECTIONAL_COLOR,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  useFrame(() => {
    const mesh = meshRef.current;
    const cursor = cursorRef.current;
    if (!mesh || !cursor) return;
    const casterPosition = getAimCasterPosition(useGameStore.getState().spellAimState?.casterId);
    if (!casterPosition) return;
    const dx = cursor.x - casterPosition.x;
    const dz = cursor.z - casterPosition.z;
    const angle = Math.atan2(dx, dz);
    const offset = Math.max(0.35, width * 0.3);
    mesh.position.set(
      casterPosition.x + Math.sin(angle) * offset,
      INDICATOR_Y_OFFSET,
      casterPosition.z + Math.cos(angle) * offset,
    );
    mesh.rotation.set(-Math.PI / 2, 0, angle + Math.PI);
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />;
};

const AoeCircle: React.FC<{
  radius: number;
  range: number;
  cursorRef: React.RefObject<THREE.Vector3>;
}> = ({ radius, range, cursorRef }) => {
  const meshRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.RingGeometry(Math.max(0, radius - AOE_RING_WIDTH), radius, 48), [radius]);
  const fillGeometry = useMemo(() => new THREE.CircleGeometry(radius, 48), [radius]);
  const ringMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: AOE_CIRCLE_COLOR,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const fillMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: AOE_CIRCLE_COLOR,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  useFrame(() => {
    const mesh = meshRef.current;
    const cursor = cursorRef.current;
    if (!mesh || !cursor) return;
    const casterPosition = getAimCasterPosition(useGameStore.getState().spellAimState?.casterId);
    if (!casterPosition) return;
    const dx = cursor.x - casterPosition.x;
    const dz = cursor.z - casterPosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    let targetX = cursor.x;
    let targetZ = cursor.z;
    if (dist > range && dist > 0.001) {
      const ratio = range / dist;
      targetX = casterPosition.x + dx * ratio;
      targetZ = casterPosition.z + dz * ratio;
    }
    mesh.position.set(targetX, INDICATOR_Y_OFFSET, targetZ);
    mesh.rotation.x = -Math.PI / 2;
  });

  return (
    <group ref={meshRef}>
      <mesh geometry={fillGeometry} material={fillMaterial} castShadow={false} receiveShadow={false} />
      <mesh geometry={geometry} material={ringMaterial} position={[0, 0.001, 0]} castShadow={false} receiveShadow={false} />
    </group>
  );
};

const SpellAimIndicator: React.FC = () => {
  const spellAimState = useGameStore((s) => s.spellAimState);
  const lastMouseWorldPosition = useGameStore((s) => s.lastMouseWorldPosition);
  const cursorWorldRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const lastSyncedAimRef = useRef<{
    cursorWorldPosition: { x: number; y: number; z: number } | null;
    targetPoint: { x: number; y: number; z: number } | null;
    targetDirection: { x: number; y: number; z: number } | null;
  }>({
    cursorWorldPosition: null,
    targetPoint: null,
    targetDirection: null,
  });

  useFrame(() => {
    const aim = useGameStore.getState().spellAimState;
    if (!aim) {
      cursorWorldRef.current.set(0, 0, 0);
      lastSyncedAimRef.current = {
        cursorWorldPosition: null,
        targetPoint: null,
        targetDirection: null,
      };
      return;
    }

    if (lastMouseWorldPosition) {
      cursorWorldRef.current.set(lastMouseWorldPosition.x, lastMouseWorldPosition.y ?? 0, lastMouseWorldPosition.z);
    }

    const casterPosition = getAimCasterPosition(aim.casterId);
    if (!casterPosition) {
      return;
    }

    const cursorWorldPosition = toSerializedVector3(cursorWorldRef.current);
    let targetPoint = aim.targetPoint ?? null;
    let targetDirection = aim.targetDirection ?? null;

    if (aim.targetType === 'directional' || aim.targetType === 'target_point') {
      const dx = cursorWorldRef.current.x - casterPosition.x;
      const dz = cursorWorldRef.current.z - casterPosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const clampedDistance = distance > 0.001 ? Math.min(distance, aim.range) : 0;
      const normalizedX = distance > 0.001 ? dx / distance : 0;
      const normalizedZ = distance > 0.001 ? dz / distance : 1;
      const clampedPoint = new THREE.Vector3(
        casterPosition.x + normalizedX * clampedDistance,
        0,
        casterPosition.z + normalizedZ * clampedDistance,
      );
      targetPoint = toSerializedVector3(clampedPoint);
      targetDirection = { x: normalizedX, y: 0, z: normalizedZ };
    } else if (aim.targetType !== 'target_unit') {
      return;
    }

    const lastSynced = lastSyncedAimRef.current;
    const shouldSync = !arePointsClose(lastSynced.cursorWorldPosition, cursorWorldPosition)
      || !arePointsClose(lastSynced.targetPoint, targetPoint)
      || !arePointsClose(lastSynced.targetDirection, targetDirection);
    if (!shouldSync) {
      return;
    }

    lastSyncedAimRef.current = { cursorWorldPosition, targetPoint, targetDirection };
    useGameStore.getState().updateSpellAim({ cursorWorldPosition, targetPoint, targetDirection });
  });

  if (!spellAimState) {
    return null;
  }

  const { targetType, range, radius, width } = spellAimState;
  if (targetType === 'self_cast') {
    return null;
  }

  return (
    <group name="spell-aim-indicator">
      <RangeCircle range={range} />
      {targetType === 'directional' && (
        <>
          <DirectionalRect range={range} width={width ?? DEFAULT_DIRECTIONAL_WIDTH} cursorRef={cursorWorldRef} />
          <DirectionalArrow width={width ?? DEFAULT_DIRECTIONAL_WIDTH} cursorRef={cursorWorldRef} />
        </>
      )}
      {targetType === 'target_point' && radius != null && radius > 0 && (
        <AoeCircle radius={radius} range={range} cursorRef={cursorWorldRef} />
      )}
      {targetType === 'target_unit' && <TargetHighlight />}
    </group>
  );
};

export default React.memo(SpellAimIndicator);
