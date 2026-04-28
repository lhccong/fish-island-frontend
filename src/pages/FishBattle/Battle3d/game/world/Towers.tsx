import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTowerAssetConfig } from '../../config/environmentConfig';
import { useGameStore } from '../../store/useGameStore';
import { TEAM_COLORS } from '../../config/mapConfig';
import FacilityAsset from './FacilityAsset';
import StructureHealthBar from './StructureHealthBar';

/** 单个防御塔 */
const Tower: React.FC<{
  position: [number, number, number];
  team: 'blue' | 'red';
  type: 'outer' | 'inner' | 'nexusGuard';
  hp: number;
  maxHp: number;
  isDestroyed: boolean;
  attackRange?: number;
  targetEntityId?: string | null;
  myChampionPosition?: THREE.Vector3 | null;
}> = ({ position, team, type, hp, maxHp, isDestroyed, attackRange, targetEntityId, myChampionPosition }) => {
  const crystalRef = useRef<THREE.Mesh>(null);

  const colors = TEAM_COLORS[team];
  const assetConfig = getTowerAssetConfig()[`${team}_${type}`];
  const activeAsset = isDestroyed && assetConfig.destroyedAsset?.modelPath ? assetConfig.destroyedAsset : assetConfig.asset;
  const animationClipName = isDestroyed
    ? activeAsset.animations?.deathClip ?? assetConfig.asset.animations?.deathClip
    : assetConfig.asset.animations?.idleClip;
  const requiresAnimationFallback = !isDestroyed || !activeAsset.modelPath || !!animationClipName;
  const height = type === 'inner' ? 6 : type === 'nexusGuard' ? 5.4 : 5;
  const baseRadius = type === 'nexusGuard' ? 1.05 : 1.2;
  const topRadius = type === 'nexusGuard' ? 0.65 : 0.8;
  const crystalSize = type === 'nexusGuard' ? 0.66 : 0.8;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (crystalRef.current) {
      crystalRef.current.rotation.y += 0.01;
      const s = 1 + Math.sin(t * 2) * 0.08;
      crystalRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={position}>
      <FacilityAsset
        modelPath={activeAsset.modelPath}
        targetHeight={activeAsset.targetHeight}
        modelScale={activeAsset.modelScale}
        groundOffsetY={activeAsset.groundOffsetY}
        animationClipName={animationClipName}
        rotationY={activeAsset.rotationY}
        animationLoop={!isDestroyed}
        fallbackWhenAnimationMissing={requiresAnimationFallback}
        suppressGroundOverlay
        fallback={(
          <>
            <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[baseRadius, baseRadius * 1.25, 0.6, 8]} />
              <meshStandardMaterial color={0x3a4a5a} roughness={0.8} metalness={0.2} />
            </mesh>
            <mesh position={[0, height / 2 + 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.4, topRadius, height, 8]} />
              <meshStandardMaterial color={0x4a5a6a} roughness={0.7} metalness={0.3} />
            </mesh>
            <mesh ref={crystalRef} position={[0, height + 1.2, 0]}>
              <octahedronGeometry args={[crystalSize]} />
              <meshStandardMaterial
                color={colors.light}
                emissive={colors.primary}
                emissiveIntensity={2}
                toneMapped={false}
                transparent
                opacity={0.9}
              />
            </mesh>
          </>
        )}
      />
      <StructureHealthBar
        hp={hp}
        maxHp={maxHp}
        team={team}
        isDestroyed={isDestroyed}
        offsetY={type === 'inner' ? 9 : type === 'nexusGuard' ? 8.5 : 8}
        barWidth={4}
      />
      {/* 攻击范围指示器：塔未摧毁 + 有攻击范围 + 受控英雄在攻击范围内时才显示 */}
      {!isDestroyed && attackRange != null && attackRange > 0 && (() => {
        if (!myChampionPosition) return false;
        const dx = myChampionPosition.x - position[0];
        const dz = myChampionPosition.z - position[2];
        return dx * dx + dz * dz <= attackRange * attackRange;
      })() && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
          <ringGeometry args={[attackRange - 0.15, attackRange, 64]} />
          <meshBasicMaterial
            color={targetEntityId ? 0xff4444 : 0xffffff}
            transparent
            opacity={targetEntityId ? 0.35 : 0.1}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

/** 所有防御塔 */
const Towers: React.FC = () => {
  const towers = useGameStore((s) => s.towers);
  const controlledChampion = useGameStore((s) => {
    const myId = s.multiplayerSession.controlledChampionId;
    if (!myId) return null;
    return s.champions.find((c) => c.id === myId) ?? null;
  });

  return (
    <>
      {towers.map((t) => (
        <Tower
          key={t.id}
          position={[t.position.x, t.position.y, t.position.z]}
          team={t.team}
          type={t.type}
          hp={t.hp}
          maxHp={t.maxHp}
          isDestroyed={t.isDestroyed}
          attackRange={t.attackRange}
          targetEntityId={t.targetEntityId}
          myChampionPosition={controlledChampion && controlledChampion.team !== t.team ? controlledChampion.position : null}
        />
      ))}
    </>
  );
};

export default Towers;
