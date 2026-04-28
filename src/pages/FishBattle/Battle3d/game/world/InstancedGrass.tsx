import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/gameConfig';
import { threejsHelper } from '../../utils/ThreejsHelper';

/** 草地自定义 ShaderMaterial：纯风摆动效果（无碰撞推开，英雄可穿入草丛）。 */
class GrassMaterial extends THREE.ShaderMaterial {
  constructor() {
    const grassConfig = GAME_CONFIG.environment.grass;
    super({
      side: THREE.DoubleSide,
      uniforms: {
        fTime: { value: 0.0 },
        fSwayIntensity: { value: grassConfig.swayIntensity },
      },
      vertexShader: /* glsl */ `
        uniform float fTime;
        uniform float fSwayIntensity;

        varying float fDistanceFromGround;

        float rand(vec2 n) {
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        float createNoise(vec2 n) {
          vec2 d = vec2(0.0, 1.0);
          vec2 b = floor(n);
          vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
          return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
        }

        vec3 localToWorld(vec3 target) {
          return (modelMatrix * instanceMatrix * vec4(target, 1.0)).xyz;
        }

        void main() {
          fDistanceFromGround = max(0.0, position.y);

          vec3 worldPosition = localToWorld(position);
          float noise = createNoise(vec2(worldPosition.x * 0.3, worldPosition.z * 0.3)) * 0.6 + 0.4;

          worldPosition += fSwayIntensity * vec3(
            cos(fTime + worldPosition.x * 0.5) * noise * fDistanceFromGround,
            0.0,
            sin(fTime * 0.7 + worldPosition.z * 0.5) * noise * fDistanceFromGround * 0.5
          );

          gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float fDistanceFromGround;

        void main() {
          vec3 dark  = vec3(12.0, 28.0, 8.0) / 255.0;
          vec3 light = vec3(35.0, 65.0, 25.0) / 255.0;
          float t = clamp(fDistanceFromGround / 1.8, 0.0, 1.0);
          vec3 color = mix(dark, light, t);
          float shade = 0.7 + t * 0.3;
          color *= shade;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }
}

interface InstancedGrassProps {
  /** 草丛区域宽度（X 方向）。 */
  width: number;
  /** 草丛区域深度（Z 方向）。 */
  depth: number;
}

/** 实例化草地组件：在给定区域内随机撒草，纯风摆动效果。 */
const InstancedGrass: React.FC<InstancedGrassProps> = ({ width, depth }) => {
  const grassConfig = GAME_CONFIG.environment.grass;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<GrassMaterial | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const loadedRef = useRef(false);

  /** 缓存 material 实例，避免重复创建。 */
  const material = useMemo(() => {
    const mat = new GrassMaterial();
    materialRef.current = mat;
    return mat;
  }, []);

  /** 加载草片模型获取几何体，然后初始化 InstancedMesh 矩阵。 */
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const gltf = await threejsHelper.loadGLTF(grassConfig.modelPath);
        if (cancelled) return;

        /** 从 GLTF 场景中找到第一个 Mesh 子节点的几何体。 */
        let grassGeometry: THREE.BufferGeometry | null = null;
        gltf.scene.traverse((child) => {
          if (!grassGeometry && (child as THREE.Mesh).isMesh) {
            grassGeometry = (child as THREE.Mesh).geometry;
          }
        });

        if (!grassGeometry || !meshRef.current) return;

        meshRef.current.geometry = grassGeometry;

        const dummy = new THREE.Object3D();
        const count = grassConfig.count;
        const heightScale = grassConfig.heightScale;

        for (let i = 0; i < count; i++) {
          dummy.position.set(
            (Math.random() - 0.5) * width,
            0.0,
            (Math.random() - 0.5) * depth,
          );
          dummy.rotation.set(0.0, Math.random() * Math.PI * 2.0, 0.0);
          const s = Math.random() * (grassConfig.scaleMax - grassConfig.scaleMin) + grassConfig.scaleMin;
          dummy.scale.set(s, s * heightScale, s);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        loadedRef.current = true;
      } catch {
        /* 草片模型加载失败，静默降级为不显示 */
      }
    };

    init();
    return () => { cancelled = true; };
  }, [grassConfig.modelPath, grassConfig.count, grassConfig.scaleMin, grassConfig.scaleMax, grassConfig.heightScale, width, depth]);

  /** 每帧更新时间 uniform 驱动风摆动。 */
  useFrame(() => {
    if (!materialRef.current || !loadedRef.current) return;
    materialRef.current.uniforms.fTime.value = clockRef.current.getElapsedTime();
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, material, grassConfig.count]}
      frustumCulled={false}
    />
  );
};

export default InstancedGrass;
