import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { HeroModelViewerProps } from './index';

interface ThreeCanvasProps extends HeroModelViewerProps {
  modelUrl: string;
  onError?: () => void;
  onReady?: () => void;
}

/** 加载并展示GLTF模型 */
const HeroModel: React.FC<{
  url: string;
  activeAnimation?: string;
  onAnimationsLoaded?: (names: string[]) => void;
  onReady?: () => void;
}> = ({ url, activeAnimation, onAnimationsLoaded, onReady }) => {
  const { scene, animations } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const { gl, scene: rootScene } = useThree();

  useEffect(() => {
    if (!scene) return;

    // 先隐藏整个 group，等材质预编译完成后再显示，避免骨骼闪现
    if (groupRef.current) {
      groupRef.current.visible = false;
    }

    // 额外保险：将所有 mesh 材质设为透明，防止预编译期间有帧泄漏
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat) => {
          if (mat) {
            if (mat.userData) {
              mat.userData._wasTransparent = mat.transparent;
              mat.userData._originalOpacity = mat.opacity;
            }
            mat.transparent = true;
            mat.opacity = 0;
          }
        });
      }
    });

    // 先重置 scene 自身的 transform（useGLTF 缓存可能残留上次修改）
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
    scene.scale.set(1, 1, 1);
    scene.updateMatrixWorld(true);

    // 计算包围盒，自动缩放和居中
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return;
    const scale = 1.8 / maxDim;

    if (groupRef.current) {
      groupRef.current.scale.setScalar(scale);
      groupRef.current.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale,
      );
    }

    // 预编译材质和着色器，避免首帧显示骨骼
    const cam = rootScene.children.find((c) => c.type === 'PerspectiveCamera') as THREE.Camera || new THREE.PerspectiveCamera();
    gl.compile(rootScene, cam);

    // 双帧延迟 + 恢复材质不透明度，确保 GPU 编译完成后再显示
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat) => {
              if (mat) {
                mat.opacity = mat.userData?._originalOpacity ?? 1;
                mat.transparent = mat.userData?._wasTransparent ?? false;
              }
            });
          }
        });
        if (groupRef.current) {
          groupRef.current.visible = true;
        }
        onReady?.();
      });
    });

    // 通知外部动画列表
    if (onAnimationsLoaded && animations.length > 0) {
      onAnimationsLoaded(animations.map((a) => a.name));
    } else if (onAnimationsLoaded) {
      onAnimationsLoaded([]);
    }
  }, [scene, animations]);

  // 动画播放逻辑
  useEffect(() => {
    if (!scene || animations.length === 0) return;

    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;

    const clipName = activeAnimation || undefined;
    const clip = clipName
      ? animations.find((a) => a.name === clipName) || animations[0]
      : animations.find((a) => /idle/i.test(a.name)) || animations[0];

    if (clip) {
      const action = mixer.clipAction(clip);
      action.play();
    }

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [scene, animations, activeAnimation]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
};

/** 模型加载中 — 不渲染任何 3D 对象，由外层 HTML 占位处理 */
const LoadingPlaceholder: React.FC = () => null;

/** 自动调整相机位置 */
const CameraSetup: React.FC = () => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0.3, 3.0);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
};

const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  modelUrl,
  autoRotate = true,
  enableZoom = false,
  activeAnimation,
  onAnimationsLoaded,
  onReady,
}) => {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <CameraSetup />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#6366f1" />
      <spotLight
        position={[0, 6, 0]}
        intensity={0.5}
        angle={0.5}
        penumbra={1}
        color="#c89b3c"
      />
      <Suspense fallback={<LoadingPlaceholder />}>
        <HeroModel key={modelUrl} url={modelUrl} activeAnimation={activeAnimation} onAnimationsLoaded={onAnimationsLoaded} onReady={onReady} />
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.4}
          scale={5}
          blur={2}
          far={4}
        />
      </Suspense>
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={2}
        enableZoom={enableZoom}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
};

export default ThreeCanvas;
