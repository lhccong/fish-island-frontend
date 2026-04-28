import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';
import * as THREE from 'three';
import BattleScene from './scene/BattleScene';
import AudioListenerManager from './scene/AudioListenerManager';
import LoadingScreen from './LoadingScreen';
import { usePreloadSceneModels } from './hooks/usePreloadSceneModels';
import { usePreloadVoiceAssets } from './hooks/usePreloadVoiceAssets';
import { RENDER_CONFIG } from '../config/renderConfig';
import { CAMERA_CONFIG } from '../config/cameraConfig';
import { assetCacheService } from '../utils/AssetCacheService';

const BattleCanvas: React.FC = () => {
  usePreloadSceneModels();
  usePreloadVoiceAssets();

  // 组件挂载时清理旧版本持久化缓存
  useEffect(() => {
    assetCacheService.clearOldVersions().catch(() => {});
  }, []);

  // 延迟渲染完整场景：等待 Canvas WebGL 上下文完全就绪后再挂载
  // BattleScene（含 EffectComposer 等依赖 renderer 的组件），
  // 避免从路由跳转进入时 renderer 内部状态未完全稳定。
  const [glReady, setGlReady] = useState(false);
  const rafIdRef = useRef<number>(0);

  const handleCreated = useCallback((_state: RootState) => {
    rafIdRef.current = requestAnimationFrame(() => {
      setGlReady(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <>
      <LoadingScreen />
      <Canvas
        shadows={RENDER_CONFIG.enableShadows}
        dpr={RENDER_CONFIG.dpr}
        camera={{
          fov: CAMERA_CONFIG.fov,
          near: CAMERA_CONFIG.near,
          far: CAMERA_CONFIG.far,
          position: [...CAMERA_CONFIG.baseOffset],
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: RENDER_CONFIG.toneMappingExposure,
        }}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        onCreated={handleCreated}
      >
        {glReady && (
          <Suspense fallback={null}>
            <BattleScene />
            <AudioListenerManager />
          </Suspense>
        )}
      </Canvas>
    </>
  );
};

export default BattleCanvas;
