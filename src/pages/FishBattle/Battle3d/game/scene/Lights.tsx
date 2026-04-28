import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RENDER_CONFIG } from '../../config/renderConfig';

const Lights: React.FC = () => {
  const blueRimRef = useRef<THREE.PointLight>(null);
  const redRimRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (blueRimRef.current) {
      blueRimRef.current.intensity = 2 + Math.sin(elapsed * 1.5) * 0.5;
    }
    if (redRimRef.current) {
      redRimRef.current.intensity = 2 + Math.cos(elapsed * 1.5) * 0.5;
    }
  });

  return (
    <>
      {/* 全局环境光与半球光 */}
      <ambientLight color={0x6688cc} intensity={0.7} />
      <hemisphereLight args={[0xddeeff, 0x112233, 0.6]} />

      {/* 主方向光（带阴影） 模拟月光与雪光反射 */}
      <directionalLight
        color={0xe8f4ff}
        intensity={1.6}
        position={[0, 50, 15]}
        castShadow={RENDER_CONFIG.enableShadows}
        shadow-mapSize-width={RENDER_CONFIG.shadowMapSize}
        shadow-mapSize-height={RENDER_CONFIG.shadowMapSize}
        shadow-camera-left={-145}
        shadow-camera-right={145}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0005}
      />

      {/* 蓝队侧光 */}
      <pointLight
        ref={blueRimRef}
        color={0x4488ff}
        intensity={2}
        distance={60}
        position={[-50, 12, 0]}
      />

      {/* 红队侧光 */}
      <pointLight
        ref={redRimRef}
        color={0xff4444}
        intensity={2}
        distance={60}
        position={[50, 12, 0]}
      />
    </>
  );
};

export default Lights;
