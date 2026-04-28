import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { ModelVisualState } from '../../types/game';
import { threejsHelper } from '../../utils/ThreejsHelper';

interface FacilityAssetProps {
  modelPath?: string;
  targetHeight: number;
  modelScale?: number;
  groundOffsetY?: number;
  /** 模型绕 Y 轴的旋转角度，单位弧度。 */
  rotationY?: number;
  animationClipName?: string;
  animationLoop?: boolean;
  fallbackWhenAnimationMissing?: boolean;
  /** 是否收敛模型脚下近地装饰底盘，避免覆盖角色阴影。 */
  suppressGroundOverlay?: boolean;
  fallback: React.ReactNode;
}

const FacilityAsset: React.FC<FacilityAssetProps> = ({
  modelPath,
  targetHeight,
  modelScale = 1,
  groundOffsetY = 0,
  rotationY = 0,
  animationClipName,
  animationLoop = true,
  fallbackWhenAnimationMissing = false,
  suppressGroundOverlay = false,
  fallback,
}) => {
  const [visualState, setVisualState] = useState<ModelVisualState>(modelPath ? 'loading' : 'fallback');
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeClipRef = useRef<THREE.AnimationClip | null>(null);
  /** 已加载模型中所有可用的动画片段列表。 */
  const allClipsRef = useRef<THREE.AnimationClip[]>([]);
  /** 当前已加载的模型路径，用于判断 modelPath 是否变化。 */
  const loadedModelPathRef = useRef<string | null>(null);
  /** 当前实际播放的动画片段名称，用于避免重复切换。 */
  const activeClipNameRef = useRef<string | null>(null);

  const fallbackNode = useMemo(() => fallback, [fallback]);

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    /** HMR 后 mixer 的 action 可能丢失，检测并恢复。 */
    const clip = activeClipRef.current;
    if (clip) {
      const action = mixer.existingAction(clip);
      if (!action || !action.isRunning()) {
        /** LoopOnce + clampWhenFinished 的 action 播完后停留在末帧，不应重启。 */
        if (action && action.clampWhenFinished && action.loop === THREE.LoopOnce) {
          // 死亡等一次性动画已播完，保持末帧不重播
        } else {
          mixer.clipAction(clip).reset().play();
        }
      }
    }
    mixer.update(delta);
  });

  /* ── 模型加载：仅在 modelPath 或几何参数变化时重新加载 ── */
  useEffect(() => {
    if (!modelPath) {
      setModelGroup(null);
      setVisualState('fallback');
      loadedModelPathRef.current = null;
      allClipsRef.current = [];
      activeClipNameRef.current = null;
      return;
    }

    let cancelled = false;
    mixerRef.current = null;
    activeClipRef.current = null;
    allClipsRef.current = [];
    activeClipNameRef.current = null;

    const applyLoadedModel = (gltf: GLTF, wrapper: THREE.Group) => {
      const clips = threejsHelper.getAnimationClips(gltf);
      const resolvedClip = animationClipName ? threejsHelper.findAnimationClip(clips, animationClipName) : undefined;
      if (animationClipName && !resolvedClip && fallbackWhenAnimationMissing) {
        setModelGroup(null);
        setVisualState('fallback');
        return false;
      }

      const animatedRoot = wrapper.children[0] || wrapper;
      const mixer = new THREE.AnimationMixer(animatedRoot);
      mixerRef.current = mixer;
      allClipsRef.current = clips;
      loadedModelPathRef.current = modelPath;

      if (resolvedClip) {
        const action = mixer.clipAction(resolvedClip);
        action.loop = animationLoop ? THREE.LoopRepeat : THREE.LoopOnce;
        action.clampWhenFinished = !animationLoop;
        action.reset().play();
        activeClipRef.current = resolvedClip;
      }

      setModelGroup(wrapper);
      setVisualState('ready');
      return true;
    };

    const cachedModel = threejsHelper.createPreparedModelFromCache(modelPath, {
      targetHeight,
      modelScale,
      groundOffsetY,
      suppressGroundOverlay,
    });
    if (cachedModel) {
      applyLoadedModel(cachedModel.gltf, cachedModel.wrapper);
      return () => {
        cancelled = true;
        mixerRef.current?.stopAllAction();
        mixerRef.current = null;
        activeClipRef.current = null;
        allClipsRef.current = [];
        activeClipNameRef.current = null;
        loadedModelPathRef.current = null;
      };
    }

    setVisualState('loading');
    setModelGroup(null);

    const loadModel = async () => {
      try {
        const gltf = await threejsHelper.loadGLTF(modelPath);
        if (cancelled) return;
        const wrapper = threejsHelper.prepareModel(gltf, targetHeight, modelScale, groundOffsetY, suppressGroundOverlay);
        applyLoadedModel(gltf, wrapper);
      } catch (_error) {
        if (cancelled) return;
        setModelGroup(null);
        setVisualState('fallback');
      }
    };

    loadModel();

    return () => {
      cancelled = true;
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      activeClipRef.current = null;
      allClipsRef.current = [];
      activeClipNameRef.current = null;
      loadedModelPathRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animationClipName 的变化由下方独立 effect 处理，此处仅关心模型几何参数
  }, [fallbackWhenAnimationMissing, groundOffsetY, modelPath, modelScale, suppressGroundOverlay, targetHeight]);

  /* ── 动画片段热切换：模型不重新加载，仅在已有 mixer 上切换动画 ── */
  /* modelGroup 加入依赖：模型异步加载完成后 mixer 才可用，需重新触发以播放当前 clip */
  useEffect(() => {
    const mixer = mixerRef.current;
    if (!mixer) return;

    /* animationClipName 为空：停止所有动画（如防御塔满血 idle 状态无动画） */
    if (!animationClipName) {
      if (activeClipRef.current) {
        mixer.stopAllAction();
        activeClipRef.current = null;
        activeClipNameRef.current = null;
      }
      return;
    }

    /* 去重：名称相同 且 当前确实有 clip 在播放 → 跳过（避免重复 reset 导致动画跳帧） */
    if (activeClipNameRef.current === animationClipName && activeClipRef.current) {
      const existing = mixer.existingAction(activeClipRef.current);
      if (existing && existing.isRunning()) return;
    }

    const clips = allClipsRef.current;
    let clip = threejsHelper.findAnimationClip(clips, animationClipName);

    /* 精确匹配失败时尝试模糊匹配（忽略大小写的包含匹配） */
    if (!clip && clips.length > 0) {
      const lowerName = animationClipName.toLowerCase();
      clip = clips.find((c) => c.name.toLowerCase().includes(lowerName))
        ?? clips.find((c) => lowerName.includes(c.name.toLowerCase()))
        ?? null;
      if (clip) {
        console.warn(
          `[FacilityAsset] 精确匹配 "${animationClipName}" 失败，模糊匹配到 "${clip.name}"`,
        );
      } else {
        console.warn(
          `[FacilityAsset] 动画片段 "${animationClipName}" 未找到，可用片段: [${clips.map((c) => c.name).join(', ')}]`,
        );
      }
    }

    /* 无论是否找到 clip，都更新 ref 防止每帧重复查找 */
    activeClipNameRef.current = animationClipName;
    if (!clip) return;

    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.loop = animationLoop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.clampWhenFinished = !animationLoop;
    action.reset().play();
    activeClipRef.current = clip;
  }, [animationClipName, animationLoop, modelGroup]);

  if (visualState === 'ready' && modelGroup) {
    return (
      <group rotation-y={rotationY}>
        <primitive object={modelGroup} />
      </group>
    );
  }

  return (
    <group rotation-y={rotationY}>
      {fallbackNode}
    </group>
  );
};

export default FacilityAsset;
