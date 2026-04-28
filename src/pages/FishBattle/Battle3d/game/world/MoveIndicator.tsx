import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/gameConfig';
import { useGameStore } from '../../store/useGameStore';
import FacilityAsset from './FacilityAsset';

const SCALE = new THREE.Vector3(1, 1, 1);
const RIPPLE_SCALE = new THREE.Vector3(1, 1, 1);

const MoveIndicator: React.FC = () => {
  const indicator = useGameStore((s) => s.moveIndicator);
  const groupRef = React.useRef<THREE.Group>(null);
  const groundRef = React.useRef<THREE.Group>(null);
  const rippleRef = React.useRef<THREE.Group>(null);
  const farRippleRef = React.useRef<THREE.Group>(null);
  const config = GAME_CONFIG.input.rightClickIndicator;

  useFrame(({ clock }) => {
    if (!groupRef.current || !indicator) {
      return;
    }

    const remaining = indicator.expiresAt - Date.now();
    if (remaining <= 0) {
      groupRef.current.visible = false;
      return;
    }

    const progress = 1 - remaining / config.durationMs;
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 14) * 0.06;
    const rippleScale = 1 + progress * (config.ground.rippleScale - 1);
    const farRippleScale = 1 + progress * (config.ground.rippleScale + 0.22 - 1);
    groupRef.current.visible = true;
    groupRef.current.position.set(indicator.position.x, indicator.position.y, indicator.position.z);

    if (groundRef.current) {
      groundRef.current.scale.copy(SCALE).multiplyScalar(pulse + progress * 0.12);
    }

    if (rippleRef.current) {
      rippleRef.current.scale.copy(RIPPLE_SCALE).multiplyScalar(rippleScale);
    }

    if (farRippleRef.current) {
      farRippleRef.current.scale.copy(RIPPLE_SCALE).multiplyScalar(farRippleScale);
    }
  });

  if (!indicator) {
    return null;
  }

  const elapsed = Date.now() - indicator.createdAt;
  const progress = THREE.MathUtils.clamp(elapsed / config.durationMs, 0, 1);
  const opacity = Math.max(0, 1 - progress);
  const ringOpacity = Math.max(0.24, opacity * 0.96);
  const coreOpacity = Math.max(0.14, opacity * 0.42);
  const rippleOpacity = Math.max(0, 0.48 - progress * 0.38);
  const farRippleOpacity = Math.max(0, 0.22 - progress * 0.2);

  return (
    <group ref={groupRef} position={[indicator.position.x, indicator.position.y, indicator.position.z]}>
      <group ref={groundRef} position={[0, config.ground.offsetY, 0]}>
        <FacilityAsset
          modelPath={config.ground.modelPath}
          targetHeight={config.ground.targetHeight}
          animationClipName={config.ground.animationClipName}
          fallbackWhenAnimationMissing
          fallback={(
            <>
              <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
                <ringGeometry args={[config.ground.innerRadius, config.ground.outerRadius, 40]} />
                <meshStandardMaterial
                  color={config.ground.color}
                  emissive={config.ground.emissive}
                  emissiveIntensity={config.ground.emissiveIntensity}
                  transparent
                  opacity={ringOpacity}
                  depthWrite={false}
                  toneMapped={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}>
                <circleGeometry args={[config.ground.centerRadius, 32]} />
                <meshStandardMaterial
                  color={config.ground.highlight}
                  emissive={config.ground.highlight}
                  emissiveIntensity={0.78}
                  transparent
                  opacity={coreOpacity}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </>
          )}
        />
      </group>
      <group ref={rippleRef} position={[0, config.ground.offsetY + 0.002, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
          <ringGeometry args={[config.ground.outerRadius * 0.94, config.ground.rippleOuterRadius, 48]} />
          <meshBasicMaterial
            color={config.ground.highlight}
            transparent
            opacity={rippleOpacity}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      <group ref={farRippleRef} position={[0, config.ground.offsetY + 0.001, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[config.ground.rippleOuterRadius * 0.96, config.ground.rippleFarOuterRadius, 48]} />
          <meshBasicMaterial
            color={config.ground.color}
            transparent
            opacity={farRippleOpacity}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
};

export default MoveIndicator;
