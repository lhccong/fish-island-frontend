import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getNexusAssetConfig } from '../../config/environmentConfig';
import { GAME_CONFIG } from '../../config/gameConfig';
import { useGameStore } from '../../store/useGameStore';
import { TEAM_COLORS } from '../../config/mapConfig';
import FacilityAsset from './FacilityAsset';
import StructureHealthBar from './StructureHealthBar';

/** 根据血量百分比和配置阈值计算当前动画状态。 */
function getNexusHealthState(hp: number, maxHp: number, isDestroyed: boolean): 'idle' | 'damaged' | 'critical' | 'death' {
  if (isDestroyed || hp <= 0) return 'death';
  const ratio = hp / maxHp;
  const { criticalThreshold, damagedThreshold } = GAME_CONFIG.environment.nexus;
  if (ratio <= criticalThreshold) return 'critical';
  if (ratio <= damagedThreshold) return 'damaged';
  return 'idle';
}

/** 单个水晶枢纽 */
const Nexus: React.FC<{
  id: string;
  position: [number, number, number];
  team: 'blue' | 'red';
  hp: number;
  maxHp: number;
  isDestroyed: boolean;
}> = ({ id, position, team, hp, maxHp, isDestroyed }) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  const colors = TEAM_COLORS[team];
  const assetConfig = getNexusAssetConfig()[team];

  /** 根据血量状态选择对应动画片段，依次降级。 */
  const healthState = useMemo(() => getNexusHealthState(hp, maxHp, isDestroyed), [hp, maxHp, isDestroyed]);
  const activeAsset = healthState === 'death' && assetConfig.destroyedAsset?.modelPath ? assetConfig.destroyedAsset : assetConfig.asset;
  const animationClipName = useMemo(() => {
    const anims = activeAsset.animations ?? assetConfig.asset.animations;
    if (!anims) return undefined;
    switch (healthState) {
      case 'death': return anims.deathClip ?? assetConfig.asset.animations?.deathClip;
      case 'critical': return anims.criticalClip ?? anims.damagedClip ?? anims.idleClip;
      case 'damaged': return anims.damagedClip ?? anims.idleClip;
      default: return anims.idleClip;
    }
  }, [activeAsset.animations, assetConfig.asset.animations, healthState]);
  const requiresAnimationFallback = healthState !== 'death' || !activeAsset.modelPath || !!animationClipName;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (coreRef.current) {
      coreRef.current.rotation.y += 0.008;
      coreRef.current.rotation.x += 0.003;
      const s = 1 + Math.sin(t * 2) * 0.06;
      coreRef.current.scale.setScalar(s);
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += 0.006;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= 0.004;
      ring2Ref.current.rotation.x += 0.002;
    }
  });

  return (
    <group position={position} userData={{ entityType: 'structure', structureId: id, structureKind: 'nexus', team, isDead: isDestroyed }}>
      <FacilityAsset
        modelPath={activeAsset.modelPath}
        targetHeight={activeAsset.targetHeight}
        modelScale={activeAsset.modelScale}
        groundOffsetY={activeAsset.groundOffsetY}
        rotationY={activeAsset.rotationY}
        animationClipName={animationClipName}
        animationLoop={healthState !== 'death'}
        fallbackWhenAnimationMissing={requiresAnimationFallback}
        fallback={(
          <>
            <mesh position={[0, 0.5, 0]} receiveShadow>
              <cylinderGeometry args={[2.5, 3, 1, 12]} />
              <meshStandardMaterial color={0x2a3a4a} roughness={0.8} metalness={0.2} />
            </mesh>
            <mesh position={[0, 2, 0]}>
              <cylinderGeometry args={[0.5, 1, 3, 8]} />
              <meshStandardMaterial color={0x3a4a5a} roughness={0.7} />
            </mesh>
            <mesh ref={coreRef} position={[0, 4.5, 0]}>
              <icosahedronGeometry args={[1.2, 1]} />
              <meshStandardMaterial
                color={colors.light}
                emissive={colors.primary}
                emissiveIntensity={3}
                toneMapped={false}
                transparent
                opacity={0.85}
              />
            </mesh>
            <mesh ref={ring1Ref} position={[0, 4.5, 0]}>
              <torusGeometry args={[2, 0.06, 8, 32]} />
              <meshStandardMaterial
                color={colors.light}
                emissive={colors.primary}
                emissiveIntensity={1.5}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={ring2Ref} position={[0, 4.5, 0]} rotation={[Math.PI / 3, 0, 0]}>
              <torusGeometry args={[2.5, 0.04, 8, 32]} />
              <meshStandardMaterial
                color={colors.light}
                emissive={colors.primary}
                emissiveIntensity={1}
                toneMapped={false}
                transparent
                opacity={0.7}
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
        offsetY={10}
        barWidth={5.5}
      />
    </group>
  );
};

/** 所有水晶枢纽 */
const Nexuses: React.FC = () => {
  const nexuses = useGameStore((s) => s.nexuses);

  return (
    <>
      {nexuses.map((n) => (
        <Nexus
          key={n.id}
          id={n.id}
          position={[n.position.x, n.position.y, n.position.z]}
          team={n.team}
          hp={n.hp}
          maxHp={n.maxHp}
          isDestroyed={n.isDestroyed}
        />
      ))}
    </>
  );
};

export default Nexuses;
