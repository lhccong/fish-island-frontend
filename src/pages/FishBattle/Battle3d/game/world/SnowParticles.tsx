import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RENDER_CONFIG } from '../../config/renderConfig';

const SNOW_COUNT = RENDER_CONFIG.snowCount;

const SnowParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(SNOW_COUNT * 3);
    const vel = new Float32Array(SNOW_COUNT);

    for (let i = 0; i < SNOW_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = Math.random() * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      vel[i] = 0.02 + Math.random() * 0.05;
    }

    return { positions: pos, velocities: vel };
  }, []);

  useFrame(({ clock }) => {
    if (!RENDER_CONFIG.enableSnow) return;
    if (!pointsRef.current) return;
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const elapsed = clock.getElapsedTime();

    for (let i = 0; i < SNOW_COUNT; i++) {
      // 下落
      posArray[i * 3 + 1] -= velocities[i];
      // 水平漂移
      posArray[i * 3] += Math.sin(elapsed + i) * 0.003;

      // 重置超出范围的雪花
      if (posArray[i * 3 + 1] < -5) {
        posArray[i * 3 + 1] = 40 + Math.random() * 10;
        posArray[i * 3] = (Math.random() - 0.5) * 200;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!RENDER_CONFIG.enableSnow) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={SNOW_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={0xffffff}
        size={0.2}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

export default SnowParticles;
