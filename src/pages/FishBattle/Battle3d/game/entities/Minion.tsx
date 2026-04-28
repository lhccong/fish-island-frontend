import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { getClockSync, getSnapshotBuffer, getRemoteMinionFrameCache, setRemoteMinionFrameCache } from '../../network/NetworkSyncRegistry';
import { useGameStore } from '../../store/useGameStore';
import { GAME_CONFIG } from '../../config/gameConfig';
import { threejsHelper } from '../../utils/ThreejsHelper';
import type { MinionState } from '../../types/game';

interface MinionProps {
  minionId: string;
}

/** 小兵配置快捷引用。 */
const MINION_CFG = GAME_CONFIG.environment.minion;

/** 根据小兵类型获取对应子配置（melee/caster）。 */
function getTypeCfg(minionType?: string) {
  return minionType === 'caster' ? MINION_CFG.caster : MINION_CFG.melee;
}

/** 血条 Canvas 纹理尺寸。 */
const BAR_TEX_W = 128;
const BAR_TEX_H = 32;

/** 创建小兵血条 Canvas 纹理（与英雄/建筑一致的 sprite 方案）。 */
function createMinionHpTexture(hp: number, maxHp: number, team: 'blue' | 'red'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = BAR_TEX_W;
  canvas.height = BAR_TEX_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  ctx.clearRect(0, 0, BAR_TEX_W, BAR_TEX_H);

  /* 血条背景圆角矩形 */
  const barX = 2;
  const barY = 4;
  const barH = BAR_TEX_H - 8;
  const fullW = BAR_TEX_W - 4;
  ctx.beginPath();
  ctx.roundRect(barX, barY, fullW, barH, 4);
  ctx.fillStyle = 'rgba(3, 7, 15, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(196, 169, 110, 0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();

  /* 血条前景渐变 */
  if (pct > 0) {
    const fgW = Math.max(4, fullW * pct);
    const grad = ctx.createLinearGradient(barX, 0, barX + fgW, 0);
    if (team === 'blue') {
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(1, '#16a34a');
    } else {
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(1, '#d97706');
    }
    ctx.beginPath();
    ctx.roundRect(barX + 2, barY + 2, fgW - 4, barH - 4, 3);
    ctx.fillStyle = grad;
    ctx.fill();

    /* 高光 */
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.roundRect(barX + 2, barY + 2, fgW - 4, (barH - 4) * 0.35, 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** 根据动画状态和小兵类型解析当前应播放的动画片段名。 */
function resolveClipName(animationState: string, minionType?: string): string | undefined {
  const cfg = getTypeCfg(minionType);
  switch (animationState) {
    case 'attack': return cfg.attackClip;
    case 'run': return cfg.runClip;
    case 'death': return cfg.deathClip;
    default: return cfg.idleClip;
  }
}

function getOrBuildRemoteMinionFrameCache(pair: {
  from: any;
  to: any;
  alpha: number;
  cacheKey: string;
}): Map<string, {
  position: { x: number; y: number; z: number };
  rotation: number;
}> {
  const cached = getRemoteMinionFrameCache(pair.cacheKey);
  if (cached) {
    return cached;
  }
  const fromMinions = (pair.from as any).minions ?? [];
  const toMinions = (pair.to as any).minions ?? [];
  const toMinionMap = new Map((toMinions as any[]).map((minion) => [minion.id, minion] as const));
  const alpha = Math.max(0, Math.min(1, pair.alpha));
  const interpolatedMap = new Map<string, {
    position: { x: number; y: number; z: number };
    rotation: number;
  }>();
  for (const fromMinion of fromMinions as any[]) {
    const toMinion = toMinionMap.get(fromMinion.id);
    if (!fromMinion?.position || !toMinion?.position) {
      continue;
    }
    const fromRot = typeof fromMinion.rotation === 'number' ? fromMinion.rotation : 0;
    const toRot = typeof toMinion.rotation === 'number' ? toMinion.rotation : fromRot;
    const PI2 = Math.PI * 2;
    const rotDiff = ((toRot - fromRot + Math.PI) % PI2 + PI2) % PI2 - Math.PI;
    interpolatedMap.set(fromMinion.id, {
      position: {
        x: fromMinion.position.x + (toMinion.position.x - fromMinion.position.x) * alpha,
        y: fromMinion.position.y + (toMinion.position.y - fromMinion.position.y) * alpha,
        z: fromMinion.position.z + (toMinion.position.z - fromMinion.position.z) * alpha,
      },
      rotation: fromRot + rotDiff * alpha,
    });
  }
  setRemoteMinionFrameCache(pair.cacheKey, interpolatedMap);
  return interpolatedMap;
}

function lerpAngle(current: number, target: number, factor: number): number {
  const PI2 = Math.PI * 2;
  const delta = ((target - current + Math.PI) % PI2 + PI2) % PI2 - Math.PI;
  return current + delta * factor;
}

const Minion: React.FC<MinionProps> = ({ minionId }) => {
  const state = useGameStore((s) => s.minions.find((item) => item.id === minionId) as MinionState);
  const groupRef = useRef<THREE.Group>(null);

  /* ── GLTF 模型 ── */
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clipsRef = useRef<THREE.AnimationClip[]>([]);
  const activeClipNameRef = useRef<string | null>(null);
  const renderPositionRef = useRef(new THREE.Vector3());
  const targetPositionRef = useRef(new THREE.Vector3());
  const renderRotationRef = useRef(0);
  const lastStatePositionRef = useRef<THREE.Vector3 | null>(null);
  const initializedRef = useRef(false);

  /** 小兵模型路径：优先后端下发 modelUrl，否则从前端配置按 minionType + team 读取。 */
  const modelPath = useMemo(() => {
    if (state.modelUrl) return state.modelUrl;
    const typeCfg = getTypeCfg(state.minionType);
    return state.team === 'blue' ? typeCfg.blue.modelPath : typeCfg.red.modelPath;
  }, [state.modelUrl, state.team, state.minionType]);

  const teamCfg = useMemo(() => {
    const typeCfg = getTypeCfg(state.minionType);
    return state.team === 'blue' ? typeCfg.blue : typeCfg.red;
  }, [state.team, state.minionType]);

  /* ── 血条 sprite 纹理（Canvas 绘制，与英雄/建筑一致） ── */
  const hpCeil = Math.ceil(state.hp);
  const maxHpCeil = Math.ceil(state.maxHp);
  const hpTexture = useMemo(
    () => createMinionHpTexture(hpCeil, maxHpCeil, state.team),
    [hpCeil, maxHpCeil, state.team],
  );
  const hpMaterial = useMemo(
    () => new THREE.SpriteMaterial({ map: hpTexture, transparent: true, depthTest: false, sizeAttenuation: true }),
    [hpTexture],
  );

  useEffect(() => {
    return () => { hpTexture.dispose(); };
  }, [hpTexture]);

  /* ── 加载模型 ── */
  useEffect(() => {
    if (!modelPath) {
      setModelGroup(null);
      return;
    }

    const applyLoadedModel = (gltf: GLTF, wrapper: THREE.Group) => {
      const clips = threejsHelper.getAnimationClips(gltf);
      const animRoot = wrapper.children[0] || wrapper;
      const mixer = new THREE.AnimationMixer(animRoot);
      mixerRef.current = mixer;
      clipsRef.current = clips;
      activeClipNameRef.current = null;
      setModelGroup(wrapper);
    };

    const cachedModel = threejsHelper.createPreparedModelFromCache(modelPath, {
      targetHeight: teamCfg.targetHeight,
      modelScale: teamCfg.modelScale,
      groundOffsetY: teamCfg.groundOffsetY,
      suppressGroundOverlay: false,
    });
    if (cachedModel) {
      applyLoadedModel(cachedModel.gltf, cachedModel.wrapper);
      return () => {
        mixerRef.current?.stopAllAction();
        mixerRef.current = null;
        clipsRef.current = [];
        activeClipNameRef.current = null;
      };
    }

    setModelGroup(null);

    let cancelled = false;
    const load = async () => {
      try {
        const gltf = await threejsHelper.loadGLTF(modelPath);
        if (cancelled) return;
        const wrapper = threejsHelper.prepareModel(
          gltf,
          teamCfg.targetHeight,
          teamCfg.modelScale,
          teamCfg.groundOffsetY,
          false,
        );
        applyLoadedModel(gltf, wrapper);
      } catch {
        if (!cancelled) setModelGroup(null);
      }
    };
    load();
    return () => {
      cancelled = true;
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      clipsRef.current = [];
      activeClipNameRef.current = null;
    };
  }, [modelPath, teamCfg]);

  /* ── 动画切换：modelGroup 加入依赖，确保模型加载完成后立即播放当前动画 ── */
  const desiredClipName = resolveClipName(state.animationState, state.minionType);
  useEffect(() => {
    const mixer = mixerRef.current;
    if (!mixer || !desiredClipName) return;
    if (activeClipNameRef.current === desiredClipName) return;
    const clip = threejsHelper.findAnimationClip(clipsRef.current, desiredClipName);
    if (!clip) return;
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    const isDeath = state.animationState === 'death';
    action.loop = isDeath ? THREE.LoopOnce : THREE.LoopRepeat;
    action.clampWhenFinished = isDeath;
    action.reset().play();
    activeClipNameRef.current = desiredClipName;
  }, [desiredClipName, state.animationState, modelGroup]);

  /* ── 帧更新 ── */
  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
    const group = groupRef.current;
    if (!group) {
      return;
    }

    if (!initializedRef.current) {
      renderPositionRef.current.copy(state.position);
      targetPositionRef.current.copy(state.position);
      renderRotationRef.current = state.rotation;
      group.position.copy(state.position);
      group.rotation.y = state.rotation;
      lastStatePositionRef.current = state.position;
      initializedRef.current = true;
      return;
    }

    let targetRotation = state.rotation;
    let interpolated = false;
    const clock = getClockSync();
    const snapBuf = getSnapshotBuffer();
    if (clock && snapBuf && snapBuf.size >= 2) {
      const renderTime = clock.estimatedServerTime() - GAME_CONFIG.multiplayer.interpolationDelayMs;
      const pair = snapBuf.getInterpolationFrame(renderTime);
      if (pair) {
        const interpolatedFrame = getOrBuildRemoteMinionFrameCache(pair);
        const interpolatedMinion = interpolatedFrame.get(minionId);
        if (interpolatedMinion) {
          targetPositionRef.current.set(
            interpolatedMinion.position.x,
            interpolatedMinion.position.y,
            interpolatedMinion.position.z,
          );
          targetRotation = interpolatedMinion.rotation;
          interpolated = true;
        }
      }
    }

    if (!interpolated) {
      const positionChanged = state.position !== lastStatePositionRef.current;
      if (positionChanged) {
        targetPositionRef.current.copy(state.position);
        const dx = state.position.x - renderPositionRef.current.x;
        const dz = state.position.z - renderPositionRef.current.z;
        if (dx * dx + dz * dz > 16) {
          renderPositionRef.current.copy(state.position);
        }
        lastStatePositionRef.current = state.position;
      }
    }

    const positionLerp = 1 - Math.exp(-(GAME_CONFIG.multiplayer.positionSmoothing * 1.15) * delta);
    const rotationLerp = 1 - Math.exp(-(GAME_CONFIG.multiplayer.rotationSmoothing * 1.1) * delta);
    renderPositionRef.current.lerp(targetPositionRef.current, positionLerp);
    renderRotationRef.current = lerpAngle(renderRotationRef.current, targetRotation, rotationLerp);
    group.position.copy(renderPositionRef.current);
    group.rotation.y = renderRotationRef.current;
  });

  /* ── 血条尺寸 ── */
  const barW = MINION_CFG.healthBarWidth;
  const barY = MINION_CFG.healthBarOffsetY;
  const barScaleY = barW * (BAR_TEX_H / BAR_TEX_W);

  const bodyColor = state.team === 'blue' ? '#60a5fa' : '#f87171';
  const accentColor = state.team === 'blue' ? '#dbeafe' : '#fee2e2';

  return (
    <>
      <group ref={groupRef} userData={{ entityType: 'minion', minionId: state.id, team: state.team, isDead: state.isDead }}>
        {/* GLTF 模型 */}
        {modelGroup ? (
          <group rotation-y={teamCfg.rotationY}>
            <primitive object={modelGroup} />
          </group>
        ) : (
          /* 程序化几何体兜底 */
          <>
            <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
              <capsuleGeometry args={[0.22, 0.44, 4, 8]} />
              <meshStandardMaterial color={bodyColor} roughness={0.72} metalness={0.08} />
            </mesh>
            <mesh castShadow position={[0, 0.92, 0]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color={accentColor} roughness={0.58} metalness={0.1} />
            </mesh>
            <mesh castShadow position={[0, 0.58, 0.22]}>
              <boxGeometry args={[0.18, 0.12, 0.34]} />
              <meshStandardMaterial color={accentColor} roughness={0.55} metalness={0.12} />
            </mesh>
          </>
        )}

        {/* 头顶血条（Sprite，天然始终水平面向摄像机，与英雄血条一致），死亡后隐藏 */}
        {!state.isDead && (
          <sprite position={[0, barY, 0]} material={hpMaterial} scale={[barW, barScaleY, 1]} />
        )}
      </group>
    </>
  );
};

export default Minion;
