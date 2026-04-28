import React from 'react';
import * as THREE from 'three';
import { getFountainAssetConfig } from '../../config/environmentConfig';
import { TEAM_COLORS } from '../../config/mapConfig';
import FacilityAsset from './FacilityAsset';

const Fountain: React.FC<{ team: 'blue' | 'red' }> = ({ team }) => {
  const config = getFountainAssetConfig()[team];
  const colors = TEAM_COLORS[team];
  const showAura = config.radius > 0.05;
  const animationClipName = config.asset.animations?.idleClip;

  return (
    <group position={config.position}>
      {showAura && (
        <>
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[config.radius * 0.52, config.radius, 48]} />
            <meshBasicMaterial
              color={colors.light}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[config.radius * 0.44, 40]} />
            <meshBasicMaterial
              color={team === 'blue' ? 0x20466a : 0x5d2630}
              transparent
              opacity={0.12}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
      <group position={[0, 0.1, 0]}>
        <FacilityAsset
          modelPath={config.asset.modelPath}
          targetHeight={config.asset.targetHeight}
          rotationY={config.asset.rotationY}
          animationClipName={animationClipName}
          fallbackWhenAnimationMissing
          fallback={(
            <>
              {showAura && (
                <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[config.radius * 0.18, config.radius * 0.38, 32]} />
                  <meshBasicMaterial
                    color={colors.light}
                    transparent
                    opacity={0.24}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              )}
              <mesh position={[0, 1.3, 0]} castShadow>
                <cylinderGeometry args={[0.9, 1.3, 2.2, 10]} />
                <meshStandardMaterial color={0x42586c} roughness={0.72} metalness={0.16} />
              </mesh>
              <mesh position={[0, 3.1, 0]} castShadow>
                <octahedronGeometry args={[0.9]} />
                <meshStandardMaterial
                  color={colors.light}
                  emissive={colors.primary}
                  emissiveIntensity={1.2}
                  transparent
                  opacity={0.92}
                  toneMapped={false}
                />
              </mesh>
            </>
          )}
        />
      </group>
    </group>
  );
};

const Fountains: React.FC = () => {
  return (
    <>
      <Fountain team="blue" />
      <Fountain team="red" />
    </>
  );
};

export default Fountains;
