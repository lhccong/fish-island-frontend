import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/gameConfig';
import { getRelicAssetConfig } from '../../config/environmentConfig';
import { useGameStore } from '../../store/useGameStore';
import FacilityAsset from './FacilityAsset';

/** 单个生命遗迹 */
const HealthRelic: React.FC<{
  position: [number, number, number];
  isAvailable: boolean;
}> = ({ position, isAvailable }) => {
  const groupRef = useRef<THREE.Group>(null);
  const relicAsset = getRelicAssetConfig();
  const animationClipName = relicAsset.asset.animations?.idleClip;

  useFrame(({ clock }) => {
    if (!groupRef.current || !isAvailable) return;
    const t = clock.getElapsedTime();
    /** 上下浮动偏移量。 */
    const bobOffset = Math.sin(t * GAME_CONFIG.environment.relic.bobSpeed) * GAME_CONFIG.environment.relic.bobAmplitude;
    const height = GAME_CONFIG.environment.relic.floatHeight + bobOffset;
    groupRef.current.position.y = height;
    groupRef.current.rotation.y += 0.02;
  });

  if (!isAvailable) return null;

  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[GAME_CONFIG.environment.relic.ringInnerRadius, GAME_CONFIG.environment.relic.ringOuterRadius, 24]} />
        <meshBasicMaterial
          color={0x44ff88}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 悬浮补血道具主体 */}
      <group ref={groupRef} position={[0, GAME_CONFIG.environment.relic.floatHeight, 0]}>
        <FacilityAsset
          modelPath={relicAsset.asset.modelPath}
          targetHeight={relicAsset.asset.targetHeight}
          rotationY={relicAsset.asset.rotationY}
          animationClipName={animationClipName}
          fallbackWhenAnimationMissing
          fallback={(
            <mesh>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial
                color={0x88ffaa}
                emissive={0x44ff88}
                emissiveIntensity={2}
                toneMapped={false}
                transparent
                opacity={0.8}
              />
            </mesh>
          )}
        />
      </group>

    </group>
  );
};

/** 所有生命遗迹 */
const HealthRelics: React.FC = () => {
  const relics = useGameStore((s) => s.healthRelics);

  return (
    <>
      {relics.map((r) => (
        <HealthRelic
          key={r.id}
          position={[r.position.x, r.position.y, r.position.z]}
          isAvailable={r.isAvailable}
        />
      ))}
    </>
  );
};

export default HealthRelics;
