import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { AnimationClipRequest, ChampionState, HeroActionSlot, ModelVisualState, Team } from '../../types/game';
import { GAME_CONFIG } from '../../config/gameConfig';
import { EMOTE_MAP } from '../../config/emoteConfig';
import { getHeroAnimationConfig, getHeroConfig, getHeroOverheadConfig, getHeroVoiceConfig } from '../../config/heroConfig';
import { RENDER_CONFIG } from '../../config/renderConfig';
import { useGameStore } from '../../store/useGameStore';
import { getLocalPredictor, getClockSync, getSnapshotBuffer, getRemoteChampionFrameCache, setRemoteChampionFrameCache } from '../../network/NetworkSyncRegistry';
import { threejsHelper } from '../../utils/ThreejsHelper';
import { audioPreloader } from '../../utils/AudioPreloader';
import { getHeroModelPath } from '../../utils/heroModel';
import { AnimationController } from './AnimationController';
import { createChampionHudTexture, createEmoteTexture } from './championOverheadTexture';
import { getListenerPosition, isListenerReady } from '../scene/AudioListenerManager';

interface ChampionProps {
  championId: string;
}

/** 创建血条 Canvas 纹理（纯 GPU，不走 DOM） */
function createHealthBarTexture(
  hp: number,
  maxHp: number,
  mp: number,
  maxMp: number,
  team: 'blue' | 'red',
  name: string,
  level: number,
  isMe: boolean,
): THREE.CanvasTexture {
  return createChampionHudTexture(hp, maxHp, mp, maxMp, team, name, level, isMe);
}

function pickRandomItem<T>(items?: T[]): T | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }

  return items[Math.floor(Math.random() * items.length)];
}

function resolveActionSlotFromRequest(
  request: AnimationClipRequest | null,
  actionClips?: Partial<Record<HeroActionSlot, string>>,
): HeroActionSlot | undefined {
  if (!request) {
    return undefined;
  }

  if (request.actionSlot) {
    return request.actionSlot;
  }

  const clipName = request.clipName.toLowerCase();
  return (Object.entries(actionClips ?? {}) as Array<[HeroActionSlot, string | undefined]>).find(([, configuredClip]) => {
    if (!configuredClip) {
      return false;
    }

    const lowerConfiguredClip = configuredClip.toLowerCase();
    return lowerConfiguredClip === clipName || lowerConfiguredClip.includes(clipName) || clipName.includes(lowerConfiguredClip);
  })?.[0];
}

function getOrBuildRemoteChampionFrameCache(pair: {
  from: any;
  to: any;
  alpha: number;
  cacheKey: string;
}): Map<string, {
  position: { x: number; y: number; z: number };
  rotation: number;
}> {
  const cached = getRemoteChampionFrameCache(pair.cacheKey);
  if (cached) {
    return cached;
  }
  const fromChamps = (pair.from as any).champions ?? (pair.from as any).entities ?? [];
  const toChamps = (pair.to as any).champions ?? (pair.to as any).entities ?? [];
  const toChampionMap = new Map((toChamps as any[]).map((champion) => [champion.id, champion] as const));
  const alpha = Math.max(0, Math.min(1, pair.alpha));
  const interpolatedMap = new Map<string, {
    position: { x: number; y: number; z: number };
    rotation: number;
  }>();
  for (const fromChampion of fromChamps as any[]) {
    const toChampion = toChampionMap.get(fromChampion.id);
    if (!fromChampion?.position || !toChampion?.position) {
      continue;
    }
    const fromRot = typeof fromChampion.rotation === 'number' ? fromChampion.rotation : 0;
    const toRot = typeof toChampion.rotation === 'number' ? toChampion.rotation : fromRot;
    const PI2 = Math.PI * 2;
    const rotDiff = ((toRot - fromRot + Math.PI) % PI2 + PI2) % PI2 - Math.PI;
    interpolatedMap.set(fromChampion.id, {
      position: {
        x: fromChampion.position.x + (toChampion.position.x - fromChampion.position.x) * alpha,
        y: fromChampion.position.y + (toChampion.position.y - fromChampion.position.y) * alpha,
        z: fromChampion.position.z + (toChampion.position.z - fromChampion.position.z) * alpha,
      },
      rotation: fromRot + rotDiff * alpha,
    });
  }
  setRemoteChampionFrameCache(pair.cacheKey, interpolatedMap);
  return interpolatedMap;
}

/** 单个英雄组件（自动尝试加载glTF模型，降级为程序化几何体） */
const Champion: React.FC<ChampionProps> = ({ championId }) => {
  const state = useGameStore((s): ChampionState => s.champions.find((champion) => champion.id === championId) as ChampionState);
  const groupRef = useRef<THREE.Group>(null);
  const [visualState, setVisualState] = useState<ModelVisualState>('idle');
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const animControllerRef = useRef<AnimationController | null>(null);
  const rootMotionNodesRef = useRef<Array<{ node: THREE.Object3D; x: number; z: number }>>([]);
  const hpBarRef = useRef<THREE.Sprite>(null);
  const emoteSpriteRef = useRef<THREE.Sprite>(null);
  const lastClipRequestKeyRef = useRef<string | null>(null);
  const lastAnimationVoiceNonceRef = useRef<number | null>(state.animationClipRequest?.nonce ?? null);
  const lastVoiceCommandNonceRef = useRef<number | null>(state.lastVoiceRequest?.nonce ?? null);
  const activeVoiceRef = useRef<HTMLAudioElement | AudioBufferSourceNode | null>(null);
  const activeVoiceSlotRef = useRef<HeroActionSlot | 'idle' | null>(null);
  /** 复用 Audio 对象池，避免反复 new Audio() 导致浏览器资源耗尽 */
  const audioPoolRef = useRef<HTMLAudioElement[]>([]);
  const audioPoolNextRef = useRef(0);
  /** 语音播放冷却时间戳，用于去重同帧的动画触发与显式语音请求 */
  const voicePlayedAtRef = useRef(0);
  const renderPositionRef = useRef(new THREE.Vector3());
  const targetPositionRef = useRef(new THREE.Vector3());
  const renderRotationRef = useRef(0);
  /** 记录上一次 state.position 引用，用于检测快照更新。 */
  const lastStatePositionRef = useRef<THREE.Vector3 | null>(null);
  /** 外推用的临时向量，避免每帧 new。 */
  const extrapolationDirRef = useRef(new THREE.Vector3());
  /** 联机模式首帧初始化标记，避免 lengthSq()===0 在原点附近误判。 */
  const multiplayerInitializedRef = useRef(false);
  /** 追踪上一帧 moveTarget 引用，用于远端英雄停止吸附。 */
  const lastMoveTargetRef = useRef<THREE.Vector3 | null>(null);

  const heroConfig = useMemo(() => getHeroConfig(state.heroId), [state.heroId]);
  const heroAnimationConfig = useMemo(() => getHeroAnimationConfig(state.heroId), [state.heroId]);
  const heroVoiceConfig = useMemo(() => getHeroVoiceConfig(state.heroId), [state.heroId]);
  const heroOverheadConfig = useMemo(() => getHeroOverheadConfig(state.heroId), [state.heroId]);
  const modelPath = useMemo(
    () => getHeroModelPath(state.heroId, {
      skin: state.skin,
      overridePath: state.skin ? undefined : (heroConfig?.modelPath || state.modelUrl),
    }),
    [heroConfig?.modelPath, state.heroId, state.modelUrl, state.skin],
  );
  const activeEmote = useGameStore((s) => {
    for (let i = s.activeEmotes.length - 1; i >= 0; i -= 1) {
      const item = s.activeEmotes[i];
      if (item.championId === championId) {
        return item;
      }
    }
    return null;
  });
  const overheadConfig = useMemo(() => {
    const base = GAME_CONFIG.hud.overhead;
    return {
      ...base,
      ...heroOverheadConfig,
      hpSpriteScale: heroOverheadConfig?.hpSpriteScale ?? base.hpSpriteScale,
      emoteSpriteScale: heroOverheadConfig?.emoteSpriteScale ?? base.emoteSpriteScale,
    };
  }, [heroOverheadConfig]);

  // 血条纹理（HP/MP 取整避免浮点微变引起无意义重绘）
  const hpCeil = Math.ceil(state.hp);
  const maxHpCeil = Math.ceil(state.maxHp);
  const mpCeil = Math.ceil(state.mp);
  const maxMpCeil = Math.ceil(state.maxMp);
  const hpTexture = useMemo(() => {
    return createHealthBarTexture(
      hpCeil, maxHpCeil, mpCeil, maxMpCeil,
      state.team, state.playerName, state.level, state.isMe,
    );
  }, [hpCeil, maxHpCeil, mpCeil, maxMpCeil, state.team, state.playerName, state.level, state.isMe]);

  const emoteTexture = useMemo(() => {
    if (!activeEmote) {
      return null;
    }

    const emote = EMOTE_MAP[activeEmote.emoteId];
    return createEmoteTexture(emote);
  }, [activeEmote]);

  useEffect(() => {
    return () => {
      hpTexture.dispose();
    };
  }, [hpTexture]);

  useEffect(() => {
    return () => {
      emoteTexture?.dispose();
    };
  }, [emoteTexture]);

  useEffect(() => {
    /* 联机模式下 targetPositionRef 由 useFrame 中的快照对齐 + 外推逻辑独占管理，
     * 此处不能重置否则会在 useFrame 之后撤销外推导致英雄后退。
     * 仅在非联机模式或首次初始化时设置 targetPositionRef。 */
    if (!GAME_CONFIG.multiplayer.enabled) {
      targetPositionRef.current.copy(state.position);
    }
    if (!groupRef.current) {
      renderPositionRef.current.copy(state.position);
      renderRotationRef.current = state.rotation;
      if (GAME_CONFIG.multiplayer.enabled) {
        targetPositionRef.current.copy(state.position);
      }
      return;
    }

    if (!GAME_CONFIG.multiplayer.enabled) {
      renderPositionRef.current.copy(state.position);
      renderRotationRef.current = state.rotation;
      groupRef.current.position.copy(state.position);
      groupRef.current.rotation.y = state.rotation;
      return;
    }

    if (!multiplayerInitializedRef.current) {
      renderPositionRef.current.copy(state.position);
      renderRotationRef.current = state.rotation;
      targetPositionRef.current.copy(state.position);
      groupRef.current.position.copy(state.position);
      groupRef.current.rotation.y = state.rotation;
      multiplayerInitializedRef.current = true;
    }
  }, [state.position, state.rotation]);

  useEffect(() => {
    return () => {
      /* 组件卸载时释放当前正在播放的语音 */
      if (activeVoiceRef.current) {
        if (activeVoiceRef.current instanceof HTMLAudioElement) {
          activeVoiceRef.current.pause();
          activeVoiceRef.current.onended = null;
          activeVoiceRef.current.onerror = null;
        } else {
          try { activeVoiceRef.current.stop(); } catch { /* already stopped */ }
        }
        activeVoiceRef.current = null;
        activeVoiceSlotRef.current = null;
      }
      /* 销毁对象池中所有 Audio 实例的媒体缓冲区 */
      audioPoolRef.current.forEach((audio) => {
        audio.pause();
        audio.onended = null;
        audio.onerror = null;
        audio.removeAttribute('src');
        audio.load();
      });
      audioPoolRef.current = [];
      audioPoolNextRef.current = 0;
    };
  }, []);

  const stopActiveVoice = React.useCallback(() => {
    if (!activeVoiceRef.current) {
      return;
    }

    if (activeVoiceRef.current instanceof HTMLAudioElement) {
      const audio = activeVoiceRef.current;
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      /* 清空 src 并调用 load() 释放浏览器内部的媒体解码缓冲区，避免内存持续增长 */
      audio.removeAttribute('src');
      audio.load();
    } else {
      try { activeVoiceRef.current.stop(); } catch { /* already stopped */ }
    }
    activeVoiceRef.current = null;
    activeVoiceSlotRef.current = null;
  }, []);

  const playAudioUrl = React.useCallback((voiceUrl: string, volume: number, slot: HeroActionSlot | 'idle' | null) => {
    const finalVolume = THREE.MathUtils.clamp(
      state.isMe
        ? volume
        : volume * GAME_CONFIG.audio.remoteVoiceVolumeMultiplier,
      0,
      1,
    );

    stopActiveVoice();

    /* ── 空间音效：非本机英雄使用 3D 定位播放 ── */
    const useSpatial = GAME_CONFIG.audio.enabled && !state.isMe && isListenerReady();

    /* ── 优先尝试 AudioPreloader 缓存播放（Web Audio API，0 延迟） ── */
    if (audioPreloader.hasBuffer(voiceUrl)) {
      let source: AudioBufferSourceNode | null = null;

      if (useSpatial) {
        const sourcePos = renderPositionRef.current;
        const listenerPos = getListenerPosition();
        source = audioPreloader.playSpatial(
          voiceUrl,
          finalVolume,
          sourcePos,
          listenerPos,
          GAME_CONFIG.audio,
        );
      } else {
        source = audioPreloader.play(voiceUrl, finalVolume);
      }

      if (source) {
        activeVoiceRef.current = source;
        activeVoiceSlotRef.current = slot;
        voicePlayedAtRef.current = Date.now();

        source.onended = () => {
          if (activeVoiceRef.current === source) {
            activeVoiceRef.current = null;
            activeVoiceSlotRef.current = null;
          }
        };
        return true;
      }

      if (useSpatial) {
        return false;
      }
    }

    if (useSpatial) {
      return false;
    }

    /* ── 退回 HTML5 Audio 对象池播放（缓存未命中或 Web Audio 不可用） ── */
    const POOL_SIZE = 3;
    if (audioPoolRef.current.length < POOL_SIZE) {
      const newAudio = new Audio();
      newAudio.preload = 'auto';
      newAudio.crossOrigin = 'anonymous';
      audioPoolRef.current.push(newAudio);
    }
    const idx = audioPoolNextRef.current % audioPoolRef.current.length;
    audioPoolNextRef.current = idx + 1;
    const audio = audioPoolRef.current[idx];

    /* 确保复用的实例处于干净状态 */
    audio.pause();
    audio.onended = null;
    audio.onerror = null;
    audio.volume = finalVolume;
    audio.src = voiceUrl;

    activeVoiceRef.current = audio;
    activeVoiceSlotRef.current = slot;
    voicePlayedAtRef.current = Date.now();

    const finalize = () => {
      if (activeVoiceRef.current === audio) {
        activeVoiceRef.current = null;
        activeVoiceSlotRef.current = null;
      }
    };

    audio.onended = finalize;
    audio.onerror = finalize;
    void audio.play().catch(() => {
      finalize();
    });

    return true;
  }, [state.isMe, stopActiveVoice]);

  const playVoice = React.useCallback((slot: HeroActionSlot | 'idle') => {
    const candidates = heroVoiceConfig?.[slot];
    const voiceUrl = pickRandomItem(candidates);
    if (!voiceUrl) {
      return false;
    }

    return playAudioUrl(voiceUrl, heroVoiceConfig?.volume ?? 1, slot);
  }, [heroVoiceConfig, playAudioUrl]);

  const playVoiceByRequest = React.useCallback((request: ChampionState['lastVoiceRequest']) => {
    if (!request) {
      return;
    }

    if (lastVoiceCommandNonceRef.current === request.nonce) {
      return;
    }

    lastVoiceCommandNonceRef.current = request.nonce;

    if (request.slot === 'customWheel') {
      const voiceUrl = request.voiceUrl;
      if (!voiceUrl) {
        return;
      }

      playAudioUrl(voiceUrl, request.volume ?? heroVoiceConfig?.volume ?? 1, null);
      return;
    }

    playVoice(request.slot);
  }, [heroVoiceConfig?.volume, playAudioUrl, playVoice]);

  useEffect(() => {
    const actionSlot = resolveActionSlotFromRequest(state.animationClipRequest, heroAnimationConfig?.actionClips);
    const nonce = state.animationClipRequest?.nonce ?? null;
    if (!actionSlot || nonce === null || lastAnimationVoiceNonceRef.current === nonce) {
      return;
    }

    lastAnimationVoiceNonceRef.current = nonce;

    /*
     * 去重：若同一渲染帧中还存在未消费的显式语音请求（lastVoiceRequest），
     * 则跳过动画触发的语音，让显式请求优先播放，避免同一次施法产生两次语音。
     */
    if (state.lastVoiceRequest && lastVoiceCommandNonceRef.current !== state.lastVoiceRequest.nonce) {
      return;
    }

    playVoice(actionSlot);
  }, [heroAnimationConfig?.actionClips, playVoice, state.animationClipRequest, state.lastVoiceRequest]);

  useEffect(() => {
    if (!state.lastVoiceRequest) {
      return;
    }
    playVoiceByRequest(state.lastVoiceRequest);
  }, [playVoiceByRequest, state.lastVoiceRequest]);

  useEffect(() => {
    if (state.isDead) {
      stopActiveVoice();
    }
  }, [state.isDead, stopActiveVoice]);

  // 尝试加载 glTF 模型
  useEffect(() => {
    animControllerRef.current?.dispose();
    animControllerRef.current = null;
    rootMotionNodesRef.current = [];

    const applyLoadedModel = (gltf: GLTF, wrapper: THREE.Group) => {
      const clips = threejsHelper.getAnimationClips(gltf);
      if (clips.length > 0) {
        const clonedScene = wrapper.children[0] || wrapper;
        animControllerRef.current = new AnimationController(clonedScene, clips, heroAnimationConfig);
        const rootMotionNodes: Array<{ node: THREE.Object3D; x: number; z: number }> = [
          { node: clonedScene, x: clonedScene.position.x, z: clonedScene.position.z },
        ];
        clonedScene.traverse((child) => {
          if (child === clonedScene) return;
          if (!/(armature|root|hips)/i.test(child.name)) return;
          rootMotionNodes.push({ node: child, x: child.position.x, z: child.position.z });
        });
        rootMotionNodesRef.current = rootMotionNodes;
      }

      setModelGroup(wrapper);
      setVisualState('ready');
    };

    const cachedModel = threejsHelper.createPreparedModelFromCache(modelPath, {
      targetHeight: RENDER_CONFIG.heroTargetHeight,
      modelScale: heroConfig?.asset?.modelScale ?? 1,
      groundOffsetY: heroConfig?.asset?.groundOffsetY ?? 0,
    });
    if (cachedModel) {
      applyLoadedModel(cachedModel.gltf, cachedModel.wrapper);
      return () => {
        animControllerRef.current?.dispose();
        animControllerRef.current = null;
        rootMotionNodesRef.current = [];
      };
    }

    setVisualState('loading');
    setModelGroup(null);

    let cancelled = false;
    const loadModel = async () => {
      try {
        const gltf = await threejsHelper.loadGLTF(modelPath);
        if (cancelled) return;

        const wrapper = threejsHelper.prepareModel(
          gltf,
          RENDER_CONFIG.heroTargetHeight,
          heroConfig?.asset?.modelScale ?? 1,
          heroConfig?.asset?.groundOffsetY ?? 0,
        );

        applyLoadedModel(gltf, wrapper);
      } catch (err) {
        console.warn(`[Champion] Model load failed for ${state.heroId}, using fallback.`, err);
        if (cancelled) return;
        setModelGroup(null);
        setVisualState('fallback');
      }
    };

    loadModel();
    return () => {
      cancelled = true;
      animControllerRef.current?.dispose();
      animControllerRef.current = null;
      rootMotionNodesRef.current = [];
    };
  }, [heroAnimationConfig, heroConfig?.asset?.groundOffsetY, heroConfig?.asset?.modelScale, modelPath, state.heroId]);

  // 更新动画
  useFrame((_, delta) => {
    let localPredictedState: {
      position: THREE.Vector3;
      rotation: number;
      moveTarget: THREE.Vector3 | null;
      isMoving: boolean;
    } | null = null;
    const getLocalPredictedState = () => {
      if (localPredictedState) {
        return localPredictedState;
      }
      const predictor = getLocalPredictor();
      if (!predictor?.initialized) {
        return null;
      }
      localPredictedState = predictor.getCurrentState();
      return localPredictedState;
    };

    if (groupRef.current) {
      if (GAME_CONFIG.multiplayer.enabled) {
        /* ── 联机模式：本地/远端分离渲染 ──
         * 本地玩家（isMe）：使用 LocalPlayerPredictor 驱动，无中间外推。
         * 远端玩家：服务端快照 + 方向外推 + lerp 平滑。 */

        let interpolatedRotation: number | null = null;

        if (state.isMe) {
          /* ═══ 本地玩家：客户端预测驱动 ═══
           * predict(delta) 内部已包含 always-lerp 平滑，
           * 输出的 visualPosition 对相机和渲染保持一致，直接使用即可。 */
          const predictor = getLocalPredictor();
          if (predictor?.initialized && multiplayerInitializedRef.current) {
            localPredictedState = predictor.predict(delta);
            renderPositionRef.current.copy(localPredictedState.position);
          } else {
            /* 预测器未就绪或首帧：回退到服务端位置 */
            const positionChanged = state.position !== lastStatePositionRef.current;
            if (positionChanged || !multiplayerInitializedRef.current) {
              renderPositionRef.current.copy(state.position);
              renderRotationRef.current = state.rotation;
              multiplayerInitializedRef.current = true;
              lastStatePositionRef.current = state.position;
            }
          }
        } else {
          /* ═══ 远端玩家：SnapshotBuffer 时间插值（优先）→ 外推回退 ═══ */
          if (!multiplayerInitializedRef.current) {
            targetPositionRef.current.copy(state.position);
            renderPositionRef.current.copy(state.position);
            renderRotationRef.current = state.rotation;
            if (groupRef.current) {
              groupRef.current.position.copy(state.position);
              groupRef.current.rotation.y = state.rotation;
            }
            multiplayerInitializedRef.current = true;
            lastStatePositionRef.current = state.position;
          }

          let interpolated = false;
          /* 远端施法锁移动：跳过旧快照插值，直接 snap 到最新权威位置，
           * 避免 spellCastStarted 事件已到达但旧快照仍在外推导致的"边移动边施法"残影。 */
          const remoteCastLocked = !state.isMe && state.movementLockedUntil > Date.now();
          const clock = getClockSync();
          const snapBuf = getSnapshotBuffer();
          if (!remoteCastLocked && clock && snapBuf && snapBuf.size >= 2) {
            const renderTime = clock.estimatedServerTime() - GAME_CONFIG.multiplayer.interpolationDelayMs;
            const pair = snapBuf.getInterpolationFrame(renderTime);
            if (pair) {
              const interpolatedFrame = getOrBuildRemoteChampionFrameCache(pair);
              const interpolatedChampion = interpolatedFrame.get(championId);
              if (interpolatedChampion) {
                targetPositionRef.current.set(
                  interpolatedChampion.position.x,
                  interpolatedChampion.position.y,
                  interpolatedChampion.position.z,
                );
                interpolated = true;
                interpolatedRotation = interpolatedChampion.rotation;
              }
            }
          }

          if (remoteCastLocked) {
            targetPositionRef.current.copy(state.position);
            const dx = state.position.x - renderPositionRef.current.x;
            const dz = state.position.z - renderPositionRef.current.z;
            if (dx * dx + dz * dz > 16) {
              renderPositionRef.current.copy(state.position);
            }
            lastStatePositionRef.current = state.position;
          } else if (!interpolated) {
            /* 回退：快照位置对齐 + moveTarget 方向外推 */
            const positionChanged = state.position !== lastStatePositionRef.current;
            if (positionChanged) {
              const SNAP_THRESHOLD_SQ = 16;
              if (state.moveTarget && !state.isDead) {
                const dx = targetPositionRef.current.x - state.position.x;
                const dz = targetPositionRef.current.z - state.position.z;
                const driftSq = dx * dx + dz * dz;
                if (driftSq > SNAP_THRESHOLD_SQ) {
                  targetPositionRef.current.copy(state.position);
                  renderPositionRef.current.copy(state.position);
                } else if (driftSq > 1.21) {
                  targetPositionRef.current.lerp(state.position, 0.25);
                }
              } else {
                targetPositionRef.current.copy(state.position);
                const dx = state.position.x - renderPositionRef.current.x;
                const dz = state.position.z - renderPositionRef.current.z;
                if (dx * dx + dz * dz > SNAP_THRESHOLD_SQ) {
                  renderPositionRef.current.copy(state.position);
                }
              }
              lastStatePositionRef.current = state.position;
            }

            if (state.moveTarget && !state.isDead) {
              const dir = extrapolationDirRef.current;
              dir.copy(state.moveTarget).sub(targetPositionRef.current);
              dir.y = 0;
              const remainDist = dir.length();
              if (remainDist > 0.01) {
                dir.divideScalar(remainDist);
                const step = Math.min(state.moveSpeed * delta, remainDist);
                if (step > 0.0001) {
                  targetPositionRef.current.addScaledVector(dir, step);
                }
              }
            }
          }

          /* 远端英雄停止吸附：moveTarget 从有变无时，snap 到服务端停止位置消除外推残余。
           * 施法锁移动期间跳过，避免 snap 产生瞬移。 */
          if (!remoteCastLocked && lastMoveTargetRef.current && !state.moveTarget && !state.isDead) {
            targetPositionRef.current.copy(state.position);
          }
          lastMoveTargetRef.current = state.moveTarget;

          const remoteSmoothingFactor = GAME_CONFIG.multiplayer.positionSmoothing * 1.1;
          renderPositionRef.current.lerp(targetPositionRef.current, 1 - Math.exp(-remoteSmoothingFactor * delta));
        }

        groupRef.current.position.copy(renderPositionRef.current);

        /* ── 旋转平滑：向 moveTarget 或施法方向旋转 ── */
        let targetRotation = state.rotation;
        let skipRotationSmoothing = false;
        const now = Date.now();
        const isCastingLocked = state.movementLockedUntil > now;
        if (state.isMe) {
          /* 本地玩家：始终从 predictor 获取朝向（predictor 内部已做视觉平滑 + 施法 snap），
           * 无论是否处于施法锁移动状态，都直接使用 predictor 值并跳过额外平滑，
           * 避免 isCastingLocked 分支用 state.rotation + lerp 造成施法转向延迟。 */
          const predicted = getLocalPredictedState();
          if (predicted) {
            targetRotation = predicted.rotation;
            renderRotationRef.current = predicted.rotation;
            skipRotationSmoothing = true;
          }
        } else if (isCastingLocked) {
          targetRotation = state.rotation;
        } else {
          /* 远端玩家：优先使用插值旋转，其次 moveTarget 方向，最后回退到 state.rotation */
          if (interpolatedRotation !== null) {
            targetRotation = interpolatedRotation;
          } else if (state.moveTarget && !state.isDead) {
            const dx = state.moveTarget.x - renderPositionRef.current.x;
            const dz = state.moveTarget.z - renderPositionRef.current.z;
            if (dx * dx + dz * dz > 0.001) {
              targetRotation = Math.atan2(dx, dz);
            }
          }
        }

        const rotSmoothingFactor = state.isMe
          ? GAME_CONFIG.multiplayer.rotationSmoothing * 2.0
          : GAME_CONFIG.multiplayer.rotationSmoothing * 2.2;
        if (!skipRotationSmoothing) {
          const PI2 = Math.PI * 2;
          const rotationDelta = ((targetRotation - renderRotationRef.current + Math.PI) % PI2 + PI2) % PI2 - Math.PI;
          const absDelta = Math.abs(rotationDelta);
          if (absDelta < 0.03) {
            /* 极小角度差直接 snap，消除微抖 */
            renderRotationRef.current = targetRotation;
          } else {
            /* 大角度差时额外加速，避免 180° 转身拖泥带水 */
            const boost = absDelta > 1.5 ? 2.0 : absDelta > 0.8 ? 1.3 : 1;
            renderRotationRef.current += rotationDelta * (1 - Math.exp(-rotSmoothingFactor * boost * delta));
          }
        } else {
          renderRotationRef.current = targetRotation;
        }
        groupRef.current.rotation.y = renderRotationRef.current;
      } else {
        groupRef.current.position.copy(state.position);
        groupRef.current.rotation.y = state.rotation;
      }
    }

    if (animControllerRef.current) {
      const clipRequest = state.animationClipRequest;
      const clipRequestKey = clipRequest
        ? `${clipRequest.clipName}|${clipRequest.loop ? 'loop' : 'once'}|${clipRequest.reset === false ? 'keep' : 'reset'}|${clipRequest.nonce ?? 'stable'}`
        : null;

      if (clipRequest && clipRequestKey !== lastClipRequestKeyRef.current) {
        const played = animControllerRef.current.playClip(clipRequest as AnimationClipRequest);
        if (played) {
          lastClipRequestKeyRef.current = clipRequestKey;
        }
      }

      if (!clipRequest) {
        // animControllerRef.current.cancelClip();
        // lastClipRequestKeyRef.current = null;
      }

      /* 本地玩家：用 predictor 移动状态覆盖服务端动画，消除快照延迟导致的滑步 */
      let effectiveAnimState = state.animationState;
      if (GAME_CONFIG.multiplayer.enabled && state.isMe && !state.isDead) {
        const predicted = localPredictedState ?? getLocalPredictedState();
        if (predicted) {
          if (predicted.isMoving && (effectiveAnimState === 'idle' || effectiveAnimState === 'standby')) {
            effectiveAnimState = 'run';
          } else if (!predicted.isMoving && effectiveAnimState === 'run') {
            effectiveAnimState = 'idle';
          }
        }
      }

      // if (
      //   clipRequest
      //   && clipRequest.lockMovement
      //   && effectiveAnimState === 'run'
      //   && state.movementLockedUntil <= Date.now()
      // ) {
      //   animControllerRef.current.cancelClip();
      // }

      animControllerRef.current.setState(effectiveAnimState);
      animControllerRef.current.update(delta);

      rootMotionNodesRef.current.forEach(({ node, x, z }) => {
        if (node.position.x !== x || node.position.z !== z) {
          node.position.x = x;
          node.position.z = z;
        }
      });
    }

    /* 每帧同步血条 sprite 的 Y 位置与缩放，确保配置变更能动态生效 */
    if (hpBarRef.current) {
      hpBarRef.current.position.y = overheadConfig.hpSpritePositionY;
      const hpScale = overheadConfig.hpSpriteScale;
      hpBarRef.current.scale.set(hpScale[0], hpScale[1], hpScale[2]);
    }

    /* 每帧同步表情 sprite 的 Y 位置与缩放，缩放基于配置值 × 弹跳动画系数 */
    if (emoteSpriteRef.current) {
      if (!activeEmote) {
        emoteSpriteRef.current.visible = false;
      } else {
        const elapsedMs = Date.now() - activeEmote.createdAt;
        const life = THREE.MathUtils.clamp(elapsedMs / Math.max(1, activeEmote.expiresAt - activeEmote.createdAt), 0, 1);
        emoteSpriteRef.current.visible = true;
        emoteSpriteRef.current.position.y = overheadConfig.emoteSpritePositionY + life * 0.55;
        /* 弹跳动画系数：以配置的 emoteSpriteScale 为基准进行缩放 */
        const bounce = 1.18 + Math.sin(life * Math.PI) * 0.14;
        const emoteScale = overheadConfig.emoteSpriteScale;
        emoteSpriteRef.current.scale.set(emoteScale[0] * bounce, emoteScale[1] * bounce, emoteScale[2]);
        const material = emoteSpriteRef.current.material;
        if (material instanceof THREE.SpriteMaterial) {
          material.opacity = 1 - Math.max(0, life - 0.72) / 0.28;
        }
      }
    }

    if (groupRef.current) {
      groupRef.current.visible = true;
    }
  });

  return (
    <group
      ref={groupRef}
      userData={{
        entityType: 'champion',
        championId: state.id,
        team: state.team,
        isDead: state.isDead,
        isMe: state.isMe,
      }}
    >
      {visualState === 'ready' && modelGroup ? (
        <primitive object={modelGroup} />
      ) : (
        <ProceduralChampion
          heroId={state.heroId}
          team={state.team}
          isMe={state.isMe}
          isDead={state.isDead}
        />
      )}

      {/* 头顶血条（Sprite，纯GPU渲染，不卡） */}
      <sprite ref={hpBarRef} position={[0, overheadConfig.hpSpritePositionY, 0]} scale={overheadConfig.hpSpriteScale}>
        <spriteMaterial map={hpTexture} transparent depthTest depthWrite={false} />
      </sprite>

      {activeEmote && emoteTexture && (
        <sprite ref={emoteSpriteRef} position={[0, overheadConfig.emoteSpritePositionY, 0]} scale={overheadConfig.emoteSpriteScale}>
          <spriteMaterial map={emoteTexture} transparent depthTest depthWrite={false} />
        </sprite>
      )}
    </group>
  );
};

/** 程序化英雄模型（降级方案） */
const ProceduralChampion: React.FC<{
  heroId: string;
  team: Team;
  isMe: boolean;
  isDead: boolean;
}> = React.memo(({ heroId, team, isMe, isDead }) => {
  const bodyRef = useRef<THREE.Group>(null);
  const heroConfig = getHeroConfig(heroId);
  const bodyColor = heroConfig?.bodyColor || (team === 'blue' ? 0x4488ff : 0xff4444);
  const accentColor = heroConfig?.accentColor || 0xffffff;
  const crestColor = isMe ? 0xfde047 : accentColor;
  const motionProfile = useMemo(() => {
    const seed = Array.from(heroId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return {
      speed: 1.45 + (seed % 5) * 0.05,
      offset: seed * 0.11,
    };
  }, [heroId]);

  useFrame(({ clock }) => {
    if (!bodyRef.current || isDead) return;
    const t = clock.getElapsedTime();

    // 呼吸动画
    bodyRef.current.position.y = Math.sin(t * motionProfile.speed + motionProfile.offset) * 0.12;
    // 轻微摇摆
    bodyRef.current.rotation.y = Math.sin(t * motionProfile.speed * 0.7 + motionProfile.offset) * 0.08;
  });

  return (
    <group ref={bodyRef}>
      {/* 身体（胶囊体） */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <capsuleGeometry args={[0.34, 1.12, 8, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.1, 0.16]} castShadow>
        <boxGeometry args={[0.7, 1.15, 0.32]} />
        <meshStandardMaterial color={accentColor} roughness={0.38} metalness={0.48} />
      </mesh>
      <mesh position={[0, 0.55, 0.05]} castShadow>
        <cylinderGeometry args={[0.25, 0.38, 0.34, 6]} />
        <meshStandardMaterial color={crestColor} roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[-0.26, 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.11, 0.52, 4, 8]} />
        <meshStandardMaterial color={0x35404d} roughness={0.7} metalness={0.18} />
      </mesh>
      <mesh position={[0.26, 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.11, 0.52, 4, 8]} />
        <meshStandardMaterial color={0x35404d} roughness={0.7} metalness={0.18} />
      </mesh>

      {/* 头部 */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <sphereGeometry args={[0.31, 14, 14]} />
        <meshStandardMaterial color={0xeeddcc} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.36, 0]} castShadow>
        <coneGeometry args={[0.3, 0.36, 6]} />
        <meshStandardMaterial color={crestColor} roughness={0.42} metalness={0.48} />
      </mesh>
      <mesh position={[0, 2.15, 0.22]} castShadow>
        <boxGeometry args={[0.44, 0.24, 0.18]} />
        <meshStandardMaterial color={accentColor} roughness={0.42} metalness={0.46} />
      </mesh>

      {/* 肩甲（左） */}
      <mesh position={[-0.47, 1.56, 0.02]} castShadow>
        <sphereGeometry args={[0.24, 12, 12]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[-0.64, 1.03, 0]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.1, 0.62, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.62} metalness={0.18} />
      </mesh>

      {/* 肩甲（右） */}
      <mesh position={[0.47, 1.56, 0.02]} castShadow>
        <sphereGeometry args={[0.24, 12, 12]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0.66, 1.02, 0.03]} rotation={[0.1, 0, -0.24]} castShadow>
        <capsuleGeometry args={[0.1, 0.72, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.62} metalness={0.18} />
      </mesh>
      <mesh position={[0.9, 1.05, 0.16]} rotation={[0.3, 0.15, -0.28]} castShadow>
        <boxGeometry args={[0.12, 0.88, 0.12]} />
        <meshStandardMaterial color={crestColor} roughness={0.28} metalness={0.86} />
      </mesh>
      <mesh position={[1.03, 1.38, 0.18]} rotation={[0.26, 0.15, -0.28]} castShadow>
        <coneGeometry args={[0.16, 0.46, 5]} />
        <meshStandardMaterial color={0xdfe8f3} roughness={0.18} metalness={0.9} />
      </mesh>

      {/* 英雄标识（Emoji对应的简单形状） */}
      <mesh position={[0, 2.7, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial
          color={crestColor}
          emissive={crestColor}
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>

      {/* 脚底阴影圆 */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.52, 16]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.16} />
      </mesh>
    </group>
  );
});

export default React.memo(Champion);
