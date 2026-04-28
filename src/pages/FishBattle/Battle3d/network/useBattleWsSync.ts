/**
 * 战斗 Socket.IO 同步 Hook（精简版）。
 * 职责：
 *   1. 管理 Socket.IO 连接生命周期（随组件挂载/卸载自动连接/断开）
 *   2. 发送 battle:join 并监听 battle:state 获取初始英雄站位
 *   3. 将服务端下发的英雄数据映射到 useGameStore
 *
 * 用法：在 App 组件顶层调用 useBattleWsSync()。
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  connectToBattleSocket,
  disconnectBattleSocket,
  getSocketClient,
  getBattleRoomCode,
} from './socketClient';
import { ClockSync } from './ClockSync';
import { SnapshotBuffer, type Timestamped } from './SnapshotBuffer';
import { LocalPlayerPredictor } from './LocalPlayerPredictor';
import { registerSyncInstances, unregisterSyncInstances } from './NetworkSyncRegistry';
import { GAME_CONFIG } from '../config/gameConfig';
import { useGameStore } from '../store/useGameStore';
import { getHeroConfig } from '../config/heroConfig';
import { isHttpUrl } from '../utils/assetUrl';
import type {
  AnimationClipRequest,
  ChampionState,
  HeroActionSlot,
  PlayerSessionAssignment,
  SkillRuntimeState,
  SpellSlot,
  VoicePlaybackRequest,
  VoicePlaybackSlot,
} from '../types/game';

/** 服务端 battle:state 中的单个英雄字段 */
interface BattleStateChampion {
  id?: string;
  odm?: number;
  playerName: string;
  heroId: string;
  team: string;
  skinId?: string;
  skin?: string;
  heroModelUrl?: string;
  position?: { x: number; y: number; z: number };
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  rotation?: number;
  moveSpeed?: number;
  animationState?: string;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
}

/** 服务端 battle:state 载荷 */
interface BattleStatePayload {
  roomCode: string;
  myUserId?: number;
  myChampionId?: string;
  champions: BattleStateChampion[];
  userChampionMapping?: Record<number, string>;
  serverTime: number;
}

/** 服务端 combatSnapshot 中的英雄字段 */
interface ServerChampionSnapshot {
  id: string;
  heroId: string;
  skin?: string;
  modelUrl?: string;
  playerName: string;
  team: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  moveTarget?: { x: number; y: number; z: number } | null;
  moveSpeed?: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level?: number;
  isDead?: boolean;
  animationState?: string;
  shield?: number;
  flowValue?: number;
  activeCastInstanceId?: string | null;
  activeCastPhase?: string;
  inputMode?: 'idle' | 'mouse';
  skillStates?: Record<string, unknown>;
  movementLockedUntil?: number;
  idleStartedAt?: number;
  lastProcessedMoveSequence?: number;
  lastMoveCommandClientTime?: number;
  lastMoveCommandServerTime?: number;
  lastProcessedInputSeq?: number;
  baseAd?: number;
  baseAp?: number;
  baseArmor?: number;
  baseMr?: number;
  attackRange?: number;
  attackSpeed?: number;
}

/** 服务端 combatSnapshot 载荷 */
interface CombatSnapshotPayload {
  eventId: string;
  sequence: number;
  roomId: string;
  serverTime: number;
  serverTick: number;
  gameTimer: number;
  champions: ServerChampionSnapshot[];
  players?: Array<{
    socketId: string;
    playerName: string;
    championId: string;
    team: string;
    isSpectator: boolean;
  }>;
}

interface SpellCastAcceptedPayload {
  requestId?: string;
  castInstanceId?: string;
  casterId?: string;
  slot?: string;
}

interface SpellCastRejectedPayload {
  requestId?: string;
  castInstanceId?: string;
  casterId?: string;
  slot?: string;
  reasonCode?: string;
  reasonMessage?: string;
}

interface SpellCastStartedPayload {
  requestId?: string;
  castInstanceId?: string;
  casterId?: string;
  slot?: string;
  lockMovement?: boolean;
  movementLockDurationMs?: number;
}

/** 服务端 room:info 中的玩家字段 */
interface RoomInfoPlayer {
  userId: number;
  playerName: string;
  heroAvatarUrl?: string;
  selectedHeroId?: string;
  team?: string;
  spell1?: string;
  spell2?: string;
}

/** 服务端 room:info 中的召唤师技能字段 */
interface RoomInfoSummonerSpell {
  spellId: string;
  name: string;
  icon: string;
  description?: string;
  cooldown?: number;
  assetConfig?: string;
}

/** 延迟平滑因子 */
const LATENCY_SMOOTHING_FACTOR = 0.2;

function smoothLatencyMs(previousLatencyMs: number | null | undefined, nextLatencyMs: number): number {
  if (previousLatencyMs === null || previousLatencyMs === undefined) {
    return nextLatencyMs;
  }
  return Math.round(previousLatencyMs + (nextLatencyMs - previousLatencyMs) * LATENCY_SMOOTHING_FACTOR);
}

function toRatePercent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
}

function getNetworkAnomalyPercent(snapshotDiscardRatePercent: number, pingTimeoutRatePercent: number): number {
  return Math.round(Math.max(snapshotDiscardRatePercent, pingTimeoutRatePercent) * 10) / 10;
}

function readNumberLike(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function readBooleanLike(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  return fallback;
}

function mapServerSkillStatesToLocal(
  skillStates: Record<string, unknown> | undefined,
  previousSkillStates: ChampionState['skillStates'] | undefined,
): ChampionState['skillStates'] {
  const nextStates = { ...(previousSkillStates ?? {}) } as ChampionState['skillStates'];
  if (!skillStates) {
    return nextStates;
  }
  Object.entries(skillStates).forEach(([slot, rawState]) => {
    if (!rawState || typeof rawState !== 'object') {
      return;
    }
    const state = rawState as Record<string, unknown>;
    const normalizedSlot = slot as SpellSlot;
    const previous = nextStates[normalizedSlot];
    const nextLevel = Math.max(0, readNumberLike(state.level, previous?.level ?? 0));
    const nextMaxCooldownMs = Math.max(0, readNumberLike(state.maxCooldownMs, previous?.maxCooldownMs ?? 0));
    const nextRemainingCooldownMs = Math.max(0, readNumberLike(state.remainingCooldownMs, previous?.remainingCooldownMs ?? 0));
    /* 服务端冷却 > 0 → 一定不可用。
     * 服务端冷却 = 0 但本地已乐观标记为 isCasting+!isReady（刚发起施法请求）时，
     * 保留乐观值，防止施法请求被服务端确认前快照把 isReady 覆盖回 true。
     * 但当服务端明确返回 isCasting=false 时（瞬发技能已在 create() 中直接 finishSpell），
     * 应立即解除乐观锁，避免永久死锁。 */
    const serverSaysReady = readBooleanLike(state.isReady, previous?.isReady ?? true);
    const serverIsCasting = readBooleanLike(state.isCasting, previous?.isCasting ?? false);
    const localOptimisticBlock = previous?.isCasting === true && previous?.isReady === false && serverIsCasting;
    const nextIsReady = nextRemainingCooldownMs > 0
      ? false
      : (localOptimisticBlock && serverSaysReady)
        ? false
        : serverSaysReady;
    const nextIsCasting = nextRemainingCooldownMs > 0
      ? readBooleanLike(state.isCasting, previous?.isCasting ?? false)
      : (localOptimisticBlock && serverSaysReady)
        ? true
        : readBooleanLike(state.isCasting, previous?.isCasting ?? false);
    nextStates[normalizedSlot] = {
      slot: normalizedSlot,
      skillId: (state.skillId as string) ?? previous?.skillId ?? normalizedSlot,
      name: (state.name as string) ?? previous?.name ?? normalizedSlot.toUpperCase(),
      level: nextLevel,
      maxCooldownMs: nextMaxCooldownMs,
      remainingCooldownMs: nextRemainingCooldownMs,
      isReady: nextIsReady,
      insufficientResource: readBooleanLike(state.insufficientResource, previous?.insufficientResource ?? false),
      isSecondPhase: readBooleanLike(state.isSecondPhase, previous?.isSecondPhase ?? false),
      isCasting: nextIsCasting,
    } satisfies SkillRuntimeState;
  });
  return nextStates;
}

/** standby 动画默认延迟 */
const DEFAULT_STANDBY_DELAY_MS = 1400;

/** 查询英雄的 standby 延迟 */
function getStandbyDelay(heroId: string): number {
  const hero = getHeroConfig(heroId);
  return hero?.asset?.animations?.standbyDelayMs ?? DEFAULT_STANDBY_DELAY_MS;
}

/** 安全解析服务端下发的动画切片请求。 */
function toAnimationClipRequest(raw: unknown): AnimationClipRequest | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  if (typeof value.clipName !== 'string') {
    return null;
  }

  return {
    clipName: value.clipName,
    loop: typeof value.loop === 'boolean' ? value.loop : undefined,
    playbackRate: typeof value.playbackRate === 'number' ? value.playbackRate : undefined,
    reset: typeof value.reset === 'boolean' ? value.reset : undefined,
    durationMs: typeof value.durationMs === 'number' ? value.durationMs : undefined,
    lockMovement: typeof value.lockMovement === 'boolean' ? value.lockMovement : undefined,
    movementLockDurationMs: typeof value.movementLockDurationMs === 'number' ? value.movementLockDurationMs : undefined,
    fallbackState: typeof value.fallbackState === 'string' ? value.fallbackState as AnimationClipRequest['fallbackState'] : undefined,
    actionSlot: typeof value.actionSlot === 'string' ? value.actionSlot as HeroActionSlot : undefined,
    nonce: typeof value.nonce === 'number' ? value.nonce : undefined,
  };
}

/** 安全解析服务端下发的语音播放请求。 */
function toVoicePlaybackRequest(raw: unknown): VoicePlaybackRequest | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  if (typeof value.slot !== 'string' || typeof value.nonce !== 'number') {
    return null;
  }

  return {
    nonce: value.nonce,
    slot: value.slot as VoicePlaybackSlot,
    customVoiceId: typeof value.customVoiceId === 'string' ? value.customVoiceId : undefined,
    voiceUrl: typeof value.voiceUrl === 'string' ? value.voiceUrl : undefined,
    volume: typeof value.volume === 'number' ? value.volume : undefined,
  };
}

/**
 * 将服务端 battle:state 的英雄列表映射到 useGameStore 中的 champions。
 */
function mapBattleStateToChampions(
  serverChampions: BattleStateChampion[],
  currentUserId: number | undefined,
  myChampionId?: string,
): ChampionState[] {
  const now = Date.now();

  return serverChampions.map((sc, index) => {
    const hero = getHeroConfig(sc.heroId);
    // 支持新格式（id 字段）和旧格式（team_index）
    const champId = sc.id ?? `${sc.team}_${index}`;
    // 支持新格式（myChampionId）和旧格式（odm/userId 匹配）
    const isMe = myChampionId
      ? champId === myChampionId
      : (currentUserId != null && sc.odm === currentUserId);
    const baseHp = sc.hp ?? hero?.baseHp ?? 1000;
    const baseMp = sc.mp ?? hero?.baseMp ?? 500;

    // 位置：支持新格式（position 对象）和旧格式（positionX/Y/Z）
    const px = sc.position?.x ?? sc.positionX ?? 0;
    const py = sc.position?.y ?? sc.positionY ?? 0;
    const pz = sc.position?.z ?? sc.positionZ ?? 0;

    return {
      id: champId,
      heroId: sc.heroId,
      skin: isHttpUrl(sc.skin) ? sc.skin : isHttpUrl(sc.skinId) ? sc.skinId : undefined,
      modelUrl: sc.heroModelUrl,
      playerName: isMe ? `${sc.playerName}(我)` : sc.playerName,
      team: sc.team as 'blue' | 'red',
      position: new THREE.Vector3(px, py, pz),
      rotation: sc.rotation ?? (sc.team === 'blue' ? 0 : Math.PI),
      hp: baseHp,
      maxHp: sc.maxHp ?? baseHp,
      mp: baseMp,
      maxMp: sc.maxMp ?? baseMp,
      level: 1,
      kills: 0,
      deaths: 0,
      assists: 0,
      isDead: false,
      respawnTimer: 0,
      animationState: (sc.animationState ?? 'idle') as ChampionState['animationState'],
      animationClipRequest: null,
      isMe,
      moveSpeed: sc.moveSpeed ?? hero?.moveSpeed ?? 3,
      moveTarget: null,
      inputMode: 'idle' as const,
      movementLockedUntil: 0,
      idleStartedAt: now,
      lastVoiceRequest: null,
      shield: 0,
      flowValue: 0,
      skillStates: {} as ChampionState['skillStates'],
      statusEffects: [],
      activeCastInstanceId: null,
      activeCastPhase: 'idle' as const,
    } as ChampionState;
  });
}

/**
 * 将服务端权威英雄快照映射为前端 ChampionState。
 * 位置直接使用服务端权威值，Champion.tsx 的 useFrame lerp 负责视觉平滑。
 */
function mapServerChampionToLocal(
  serverChampion: ServerChampionSnapshot,
  controlledChampionId: string | null,
  previousChampion: ChampionState | undefined,
): ChampionState {
  const now = Date.now();
  const isMe = serverChampion.id === controlledChampionId;
  const isDead = serverChampion.isDead ?? (serverChampion as unknown as Record<string, unknown>).dead as boolean ?? false;
  const serverMovementLockedUntil = ((serverChampion as unknown as Record<string, unknown>).movementLockedUntil as number | undefined) ?? 0;
  const shouldPreserveActiveLock = !!previousChampion
    && previousChampion.movementLockedUntil > now
    && serverMovementLockedUntil <= now;
  const nextMovementLockedUntil = shouldPreserveActiveLock && previousChampion
    ? previousChampion.movementLockedUntil
    : (isMe && previousChampion)
    ? Math.max(previousChampion.movementLockedUntil, serverMovementLockedUntil)
    : serverMovementLockedUntil;

  /* ── 位置：直接使用服务端权威位置 ── */
  const sx = serverChampion.position.x;
  const sy = serverChampion.position.y;
  const sz = serverChampion.position.z;
  let position: THREE.Vector3;
  if (previousChampion) {
    const pp = previousChampion.position;
    const dx = pp.x - sx, dy = pp.y - sy, dz = pp.z - sz;
    position = (dx * dx + dy * dy + dz * dz) <= 1e-6
      ? pp
      : new THREE.Vector3(sx, sy, sz);
  } else {
    position = new THREE.Vector3(sx, sy, sz);
  }

  /* ── moveTarget ── */
  let moveTarget: THREE.Vector3 | null = null;
  if (serverChampion.moveTarget) {
    const mx = serverChampion.moveTarget.x;
    const my = serverChampion.moveTarget.y ?? 0;
    const mz = serverChampion.moveTarget.z;
    const prevMt = previousChampion?.moveTarget;
    if (prevMt) {
      const dmx = prevMt.x - mx, dmy = prevMt.y - my, dmz = prevMt.z - mz;
      moveTarget = (dmx * dmx + dmy * dmy + dmz * dmz) <= 1e-6 ? prevMt : new THREE.Vector3(mx, my, mz);
    } else {
      moveTarget = new THREE.Vector3(mx, my, mz);
    }
  }
  if (isMe && nextMovementLockedUntil > now) {
    moveTarget = null;
  }

  /* ── 朝向 ── */
  const rotation = serverChampion.rotation ?? previousChampion?.rotation ?? 0;

  /* ── animationState ── */
  const serverHasMoveTarget = !!serverChampion.moveTarget;
  const resolvedAnimationState: ChampionState['animationState'] = (() => {
    if (isDead) return 'death' as const;
    const serverAnimState = (serverChampion.animationState ?? 'idle') as ChampionState['animationState'];
    if (!serverHasMoveTarget && serverAnimState === 'run') {
      // fall through to idle
    } else if (serverAnimState !== 'idle') {
      return serverAnimState;
    }
    const prevIdleStartedAt = previousChampion?.idleStartedAt ?? now;
    const prevWasIdle = previousChampion
      && (previousChampion.animationState === 'idle' || previousChampion.animationState === 'standby');
    const idleStartedAtLocal = prevWasIdle ? prevIdleStartedAt : now;
    const standbyDelay = getStandbyDelay(serverChampion.heroId);
    if (now - idleStartedAtLocal >= standbyDelay) {
      return 'standby' as const;
    }
    return 'idle' as const;
  })();

  /* ── idleStartedAt ── */
  const idleStartedAt: number = (() => {
    if (!previousChampion) return now;
    const prevWasIdle = previousChampion.animationState === 'idle' || previousChampion.animationState === 'standby';
    const nowIsIdle = resolvedAnimationState === 'idle' || resolvedAnimationState === 'standby';
    if (nowIsIdle && prevWasIdle) return previousChampion.idleStartedAt;
    if (nowIsIdle && !prevWasIdle) return now;
    return previousChampion.idleStartedAt;
  })();

  return {
    id: serverChampion.id,
    heroId: serverChampion.heroId,
    skin: serverChampion.skin ?? previousChampion?.skin,
    modelUrl: serverChampion.modelUrl ?? previousChampion?.modelUrl,
    playerName: `${serverChampion.playerName.replace(/\(我\)$/, '')}${isMe ? '(我)' : ''}`,
    team: serverChampion.team as 'blue' | 'red',
    position,
    rotation,
    hp: serverChampion.hp,
    maxHp: serverChampion.maxHp,
    mp: serverChampion.mp,
    maxMp: serverChampion.maxMp,
    level: serverChampion.level ?? 1,
    kills: 0,
    deaths: 0,
    assists: 0,
    isDead,
    respawnTimer: 0,
    animationState: resolvedAnimationState,
    animationClipRequest: previousChampion?.animationClipRequest ?? null,
    isMe,
    moveSpeed: serverChampion.moveSpeed ?? previousChampion?.moveSpeed ?? 3,
    moveTarget,
    inputMode: ((isMe && nextMovementLockedUntil > now)
      ? 'idle'
      : (serverChampion.inputMode ?? (moveTarget ? 'mouse' : 'idle'))) as ChampionState['inputMode'],
    movementLockedUntil: nextMovementLockedUntil,
    idleStartedAt,
    lastVoiceRequest: previousChampion?.lastVoiceRequest ?? null,
    shield: serverChampion.shield ?? 0,
    flowValue: serverChampion.flowValue ?? 0,
    skillStates: mapServerSkillStatesToLocal(serverChampion.skillStates, previousChampion?.skillStates),
    statusEffects: previousChampion?.statusEffects ?? [],
    activeCastInstanceId: serverChampion.activeCastInstanceId ?? null,
    activeCastPhase: (serverChampion.activeCastPhase ?? 'idle') as ChampionState['activeCastPhase'],
    baseAd: serverChampion.baseAd ?? previousChampion?.baseAd,
    baseAp: serverChampion.baseAp ?? previousChampion?.baseAp,
    baseArmor: serverChampion.baseArmor ?? previousChampion?.baseArmor,
    baseMr: serverChampion.baseMr ?? previousChampion?.baseMr,
    attackRange: serverChampion.attackRange ?? previousChampion?.attackRange,
    attackSpeed: serverChampion.attackSpeed ?? previousChampion?.attackSpeed,
  };
}

/**
 * 精简版战斗 WS 同步 Hook。
 * 连接 socket → 发送 battle:join → 接收 battle:state → 更新 store 英雄。
 */
export function useBattleWsSync(
  enabled: boolean,
  playerName: string,
  currentUserId?: number,
) {
  /** 快照环形缓冲区（用于远端英雄时间插值）。 */
  const snapshotBufferRef = useRef<SnapshotBuffer<CombatSnapshotPayload & Timestamped>>(
    new SnapshotBuffer(GAME_CONFIG.multiplayer.maxBufferedSnapshots),
  );
  /** 本地玩家客户端预测器。 */
  const localPredictorRef = useRef<LocalPlayerPredictor>(
    new LocalPlayerPredictor(GAME_CONFIG.multiplayer.tickDt),
  );
  /** 缓存受控英雄 ID（用于 predictor 对账时快速查找）。 */
  const controlledChampionIdRef = useRef<string | null>(null);
  /** 缓存最近一次收到的快照序号（用于乱序/重复检测）。 */
  const lastReceivedSnapshotSequenceRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    /* 立即将联机状态切为 connecting，
     * 清除上一局可能残留的 error/disconnected 状态，
     * 防止 DisconnectOverlay 因陈旧状态误显示。 */
    useGameStore.getState().setMultiplayerConnectionStatus('connecting');

    /* ── 初始化同步基础设施 ── */
    controlledChampionIdRef.current = null;
    lastReceivedSnapshotSequenceRef.current = 0;
    snapshotBufferRef.current.clear();
    localPredictorRef.current.reset();

    // ⚠️ 先注册监听器，再连接/发送 battle:join，
    // 否则 socket 已连接时 connectToBattleSocket 会立即 emit battle:join，
    // 服务端瞬间响应 battle:state 但此时监听器尚未注册，事件丢失。
    const client = getSocketClient();
    const clockSync = new ClockSync({ pingIntervalMs: 5000, pingTimeoutMs: 4000 });
    registerSyncInstances(clockSync, snapshotBufferRef.current as any, localPredictorRef.current);

    /* 暂存 room:info 中的玩家技能/头像数据，防止 room:info 到达时 champions 尚未填充导致映射丢失 */
    let pendingRoomInfoPlayers: RoomInfoPlayer[] | null = null;
    let spellMappingApplied = false;

    /** 将暂存的玩家技能/头像数据应用到当前 store 中的 champions */
    const applyPlayerSpellMapping = (players: RoomInfoPlayer[]) => {
      const store = useGameStore.getState();
      const champions = store.champions;
      if (!champions.length) return false;
      for (const p of players) {
        const matchedChampion = champions.find((c) => {
          const cleanName = c.playerName.replace(/\(我\)$/, '');
          return cleanName === p.playerName;
        });
        if (!matchedChampion) continue;
        if (p.spell1 || p.spell2) {
          store.setChampionSummonerSpells(matchedChampion.id, p.spell1 ?? 'flash', p.spell2 ?? 'heal');
        }
        if (p.heroAvatarUrl) {
          store.setChampionAvatarUrl(matchedChampion.id, p.heroAvatarUrl);
        }
      }
      return true;
    };

    const handleBattleState = (payload: BattleStatePayload) => {
      console.log('[useBattleWsSync] battle:state received', payload);
      const store = useGameStore.getState();

      // 优先用后端下发的 myUserId（最可靠），回退到 props 传入的 currentUserId
      const effectiveUserId = payload.myUserId ?? currentUserId;
      const champions = mapBattleStateToChampions(payload.champions, effectiveUserId, payload.myChampionId);

      // 更新 store 中的英雄
      useGameStore.setState({ champions });

      // 填充 players 数组（供 TopBar 在线/观战人数显示）
      const players: PlayerSessionAssignment[] = champions.map((c) => ({
        socketId: '',
        playerName: c.playerName,
        championId: c.id,
        team: c.team,
        isSpectator: false,
      }));
      store.setMultiplayerPlayers(players);

      // 设置联机状态为已连接（收到 battle:state 即代表服务端响应成功）
      store.setMultiplayerConnectionStatus('connected');

      // 设置受控英雄分配
      const myChampion = champions.find((c) => c.isMe);
      if (myChampion) {
        controlledChampionIdRef.current = myChampion.id;
        lastReceivedSnapshotSequenceRef.current = 0;
        snapshotBufferRef.current.clear();
        localPredictorRef.current.reset();
        store.setMultiplayerAssignment(
          {
            socketId: client.id ?? '',
            championId: myChampion.id,
            team: myChampion.team,
            playerName: myChampion.playerName,
            isSpectator: false,
          },
          client.id ?? '',
          payload.roomCode,
        );
      }

      // 如果 room:info 先到达但当时 champions 为空，现在 champions 已填充，立即应用暂存的映射
      if (pendingRoomInfoPlayers && !spellMappingApplied) {
        spellMappingApplied = applyPlayerSpellMapping(pendingRoomInfoPlayers);
        if (spellMappingApplied) {
          pendingRoomInfoPlayers = null;
        }
      }

      // 请求 room:info 获取召唤师技能、英雄头像等元数据
      client.emit('room:getInfo', { roomCode: payload.roomCode });

      console.log('[useBattleWsSync] champions updated from battle:state');
    };

    const handleRoomInfo = (payload: { players?: RoomInfoPlayer[]; summonerSpells?: RoomInfoSummonerSpell[] }) => {
      console.log('[useBattleWsSync] room:info received', payload);
      const store = useGameStore.getState();
      const champions = store.champions;

      // 填充召唤师技能元数据
      if (payload.summonerSpells?.length) {
        const meta: Record<string, { name: string; icon: string; description: string; cooldown: number; assetConfig?: string }> = {};
        for (const sp of payload.summonerSpells) {
          meta[sp.spellId] = {
            name: sp.name,
            icon: sp.icon,
            description: sp.description ?? '',
            cooldown: sp.cooldown ?? 0,
            assetConfig: sp.assetConfig,
          };
        }
        store.setSummonerSpellsMeta(meta);
      }

      // 将玩家的召唤师技能和英雄头像映射到 champion
      if (payload.players?.length) {
        if (champions.length) {
          spellMappingApplied = applyPlayerSpellMapping(payload.players);
        } else {
          // champions 尚未填充（room:info 早于 battle:state 到达），暂存等待后续应用
          console.log('[useBattleWsSync] champions not ready, caching room:info players for later');
          pendingRoomInfoPlayers = payload.players;
        }
      }
    };

    /** room:playersUpdate：后端在玩家加入/离开/断连时广播最新玩家列表 */
    const handlePlayersUpdate = (payload: { players?: Array<{ userId: number; playerName: string; team?: string; isOnline?: boolean }> }) => {
      if (!payload.players) return;
      const store = useGameStore.getState();
      // 只保留在线玩家作为 "在线人数"
      const onlinePlayers: PlayerSessionAssignment[] = payload.players
        .filter((p) => p.isOnline !== false)
        .map((p) => ({
          socketId: '',
          playerName: p.playerName,
          championId: '',
          team: (p.team ?? 'blue') as 'blue' | 'red',
          isSpectator: false,
        }));
      store.setMultiplayerPlayers(onlinePlayers);
    };

    const handleError = (data: { error?: string }) => {
      console.warn('[useBattleWsSync] battle:error:', data?.error);
    };

    /* 后端 sendError 发送到 room:error（非 battle:error），需同时监听 */
    const handleRoomError = (data: { error?: string }) => {
      console.warn('[useBattleWsSync] room:error:', data?.error);
    };

    /* 全员 3D 场景就绪屏障：收到 battle:allSceneReady 后才真正开始游戏 */
    const handleAllSceneReady = () => {
      console.log('[useBattleWsSync] battle:allSceneReady received');
      useGameStore.getState().setAllScenesReady(true);
    };

    /* 场景就绪标记 */
    const sceneReadySentRef = { sent: false };

    /* 房间不存在：后端重启或对局已结束，原房间内存已丢失 */
    const handleRoomNotFound = (payload: { reason?: string }) => {
      const reason = payload?.reason || '对局已结束或服务器已重启';
      console.warn('[useBattleWsSync] 房间不存在:', reason);
      useGameStore.getState().setMultiplayerConnectionStatus('error', reason);
    };

    /* 会话被取代：同一账号在其他标签页/设备进入战斗 */
    const handleSessionSuperseded = (payload: { reason?: string }) => {
      const reason = payload?.reason || '该账号已在其他地方进入战斗';
      console.warn('[useBattleWsSync] 会话被取代:', reason);
      useGameStore.getState().setMultiplayerConnectionStatus('error', reason);
    };

    /* ========== Socket.IO 传输层事件 ==========
     *
     * 状态机：connecting → connected → disconnected ⇄ (重连中) → error（终端）
     *
     * connect_error 不改变状态——它只是单次重连失败的信号，
     * 由 reconnect_attempt / reconnect_failed 统一管理状态流转，
     * 避免 error ↔ disconnected 快速翻转导致遮罩闪烁和重复弹窗。
     */

    const handleDisconnect = (reason: string) => {
      const isIntentional = reason === 'io client disconnect';
      if (!isIntentional) {
        useGameStore.getState().setMultiplayerConnectionStatus('disconnected', '召唤师，与战场的连接中断了，正在尝试重新连接...');
      } else {
        useGameStore.getState().setMultiplayerConnectionStatus('disconnected', '已离开战场');
      }
    };

    const handleConnectError = (err: Error) => {
      /* 仅记录日志，不改变状态。reconnect_attempt / reconnect_failed 负责状态。 */
      console.warn('[useBattleWsSync] 连接异常:', err.message);
    };

    const handleReconnect = () => {
      console.log('[useBattleWsSync] 重连成功');
      useGameStore.getState().setMultiplayerConnectionStatus('connecting');
      sceneReadySentRef.sent = false;
      // 重连后重置所有 sync 实例
      controlledChampionIdRef.current = null;
      lastReceivedSnapshotSequenceRef.current = 0;
      clockSync.reset();
      snapshotBufferRef.current.clear();
      localPredictorRef.current.reset();
      clockSync.start((clientSendTime) => {
        if (!client.connected) return;
        client.emit('battle:ping', { clientSendTime, clientTime: clientSendTime });
      });
    };

    const handleReconnectAttempt = (attempt: number) => {
      useGameStore.getState().setMultiplayerConnectionStatus('disconnected', `正在重新连接战场 (第${attempt}次尝试)...`);
    };

    const handleReconnectFailed = () => {
      useGameStore.getState().setMultiplayerConnectionStatus('error', '无法连接到战场服务器，请刷新页面重新进入战场');
    };

    /* battle:pong 监听：供 ClockSync 计算时钟偏移和 RTT */
    const handleBattlePong = (payload: Record<string, unknown>) => {
      // netty-socketio 可能将 Long 序列化为字符串，需用 Number() 兼容
      const serverTime = Number(payload.serverTime);
      const clientSendTime = Number(payload.clientSendTime ?? payload.clientTime);
      if (!isNaN(serverTime) && serverTime > 0 && !isNaN(clientSendTime) && clientSendTime > 0) {
        clockSync.onPong(serverTime, clientSendTime);
        const syncState = clockSync.getState();
        const store = useGameStore.getState();
        useGameStore.setState({
          multiplayerSession: {
            ...store.multiplayerSession,
            diagnostics: {
              ...store.multiplayerSession.diagnostics,
              rttMs: syncState.rtt,
              pingSampleCount: syncState.sampleCount,
            },
          },
        });
      }
    };

    /** combatSnapshot：服务端权威战斗快照（50ms 间隔） */
    const handleCombatSnapshot = (payload: CombatSnapshotPayload) => {
      const store = useGameStore.getState();
      const controlledChampionId = controlledChampionIdRef.current;
      const prevChampions = store.champions;
      const diagnostics = store.multiplayerSession.diagnostics;
      const sequence = typeof payload.sequence === 'number' ? payload.sequence : 0;
      const serverTime = payload.serverTime ?? Date.now();
      const now = Date.now();
      const nextLatencyMs = smoothLatencyMs(diagnostics.snapshotLatencyMs, Math.max(0, now - serverTime));
      const nextSnapshotArrivalCount = diagnostics.snapshotArrivalCount + 1;

      if (!payload.champions || payload.champions.length === 0) return;

      /* ── 序号去重：乱序或重复快照直接丢弃，仅更新诊断 ── */
      if (sequence > 0 && sequence <= lastReceivedSnapshotSequenceRef.current) {
        const nextDroppedSnapshotCount = diagnostics.droppedSnapshotCount + 1;
        const nextSnapshotDiscardRatePercent = toRatePercent(nextDroppedSnapshotCount, nextSnapshotArrivalCount);
        useGameStore.setState({
          multiplayerSession: {
            ...store.multiplayerSession,
            diagnostics: {
              ...diagnostics,
              lastSnapshotReceivedAt: now,
              lastSnapshotServerTime: serverTime,
              snapshotLatencyMs: nextLatencyMs,
              droppedSnapshotCount: nextDroppedSnapshotCount,
              snapshotArrivalCount: nextSnapshotArrivalCount,
              snapshotDiscardRatePercent: nextSnapshotDiscardRatePercent,
              networkAnomalyPercent: getNetworkAnomalyPercent(
                nextSnapshotDiscardRatePercent,
                diagnostics.pingTimeoutRatePercent,
              ),
            },
          },
        });
        return;
      }

      if (sequence > 0) {
        lastReceivedSnapshotSequenceRef.current = sequence;
      }

      /* ── 推入 SnapshotBuffer 供远端英雄时间插值 ── */
      snapshotBufferRef.current.push({
        ...payload,
        serverTime,
        serverTick: payload.serverTick,
      });

      const prevMap = new Map<string, ChampionState>();
      for (const c of prevChampions) {
        prevMap.set(c.id, c);
      }

      const newChampions = payload.champions.map((sc) =>
        mapServerChampionToLocal(sc, controlledChampionId, prevMap.get(sc.id)),
      );

      /* ── LocalPlayerPredictor 对账（reconciliation）── */
      if (controlledChampionId) {
        const controlledSnapshot = payload.champions.find((c) => c.id === controlledChampionId);
        if (controlledSnapshot) {
          const predictor = localPredictorRef.current;
          const serverMoveSpeed = controlledSnapshot.moveSpeed ?? 3;
          if (!predictor.initialized) {
            const pos = controlledSnapshot.position;
            predictor.init(
              new THREE.Vector3(pos.x, pos.y ?? 0, pos.z),
              controlledSnapshot.rotation ?? 0,
              serverMoveSpeed,
            );
          }
          const lastInputSeq = controlledSnapshot.lastProcessedInputSeq
            ?? controlledSnapshot.lastProcessedMoveSequence
            ?? 0;
          predictor.onServerSnapshot(
            controlledSnapshot.position,
            controlledSnapshot.rotation ?? 0,
            controlledSnapshot.moveTarget ?? null,
            serverMoveSpeed,
            lastInputSeq,
          );
        }
      }

      /* ── 更新诊断统计 ── */
      const nextSnapshotDiscardRatePercent = toRatePercent(diagnostics.droppedSnapshotCount, nextSnapshotArrivalCount);
      useGameStore.setState({
        champions: newChampions,
        multiplayerSession: {
          ...store.multiplayerSession,
          diagnostics: {
            ...diagnostics,
            lastReceivedSequence: Math.max(sequence, diagnostics.lastReceivedSequence),
            lastSnapshotReceivedAt: now,
            lastSnapshotServerTime: serverTime,
            snapshotLatencyMs: nextLatencyMs,
            snapshotArrivalCount: nextSnapshotArrivalCount,
            snapshotDiscardRatePercent: nextSnapshotDiscardRatePercent,
            networkAnomalyPercent: getNetworkAnomalyPercent(
              nextSnapshotDiscardRatePercent,
              diagnostics.pingTimeoutRatePercent,
            ),
          },
        },
      });

      // 重连防御：如果有暂存的 room:info 玩家数据且尚未应用，趁 champions 已存在时应用
      if (pendingRoomInfoPlayers && !spellMappingApplied) {
        spellMappingApplied = applyPlayerSpellMapping(pendingRoomInfoPlayers);
        if (spellMappingApplied) {
          pendingRoomInfoPlayers = null;
        }
      }
    };

    /* ========== 表情 / 语音 / 动画中继事件 ========== */

    const applyLocalMovementLock = (championId: string | undefined, durationMs?: number) => {
      if (!championId || championId !== controlledChampionIdRef.current) {
        return;
      }
      localPredictorRef.current.applyMovementLock(durationMs ?? 0);
    };

    const handleChampionAnimate = (payload: Record<string, unknown>) => {
      const championId = payload.championId as string | undefined;
      const request = toAnimationClipRequest(payload.request);
      if (!championId || !request) {
        return;
      }
      if (request.lockMovement) {
        applyLocalMovementLock(championId, request.movementLockDurationMs);
      }
      useGameStore.getState().playChampionAnimationClip(championId, request);
    };

    const handleChampionEmote = (payload: Record<string, unknown>) => {
      const championId = payload.championId as string | undefined;
      const emoteId = payload.emoteId as string | undefined;
      const durationMs = typeof payload.durationMs === 'number'
        ? payload.durationMs
        : GAME_CONFIG.emotes.worldDisplayDurationMs;
      if (!championId || !emoteId) {
        return;
      }
      useGameStore.getState().triggerChampionEmote(championId, emoteId, durationMs);
    };

    const handleChampionVoice = (payload: Record<string, unknown>) => {
      const championId = payload.championId as string | undefined;
      const request = toVoicePlaybackRequest(payload.request);
      if (!championId || !request) {
        return;
      }
      useGameStore.getState().setChampionVoiceRequest(championId, request);
    };

    const handleSpellCastAccepted = (payload: SpellCastAcceptedPayload) => {
      if (!payload.requestId) {
        return;
      }
      useGameStore.getState().acceptLocalSpellPrediction(payload.requestId, payload.castInstanceId ?? null);
    };

    const handleSpellCastRejected = (payload: SpellCastRejectedPayload) => {
      const store = useGameStore.getState();
      const prediction = payload.requestId
        ? store.findLocalSpellPredictionByRequestId(payload.requestId)
        : null;
      const targetChampionId = payload.casterId ?? prediction?.casterId;
      const targetSlot = (payload.slot ?? prediction?.slot) as 'summonerD' | 'summonerF' | 'basicAttack' | undefined;
      if (targetChampionId && targetSlot) {
        store.patchChampionSkillRuntimeState(targetChampionId, targetSlot, {
          isCasting: false,
          isReady: true,
          remainingCooldownMs: 0,
        });
      }
      if (payload.requestId) {
        store.clearLocalSpellPredictionByRequestId(payload.requestId);
      }
      console.warn('[useBattleWsSync] spellCastRejected', payload.reasonCode, payload.reasonMessage);
    };

    const handleSpellCastStarted = (payload: SpellCastStartedPayload) => {
      const store = useGameStore.getState();
      /* 服务端已确认施法 → 立即清理 local prediction（乐观预测完成使命）。
       * 之后由 isCasting:true + isReady:false 来防止重复施法，
       * 不再依赖 localSpellPredictions 的 5s 超时阻塞。 */
      if (payload.castInstanceId) {
        store.clearLocalSpellPredictionByCastInstanceId(payload.castInstanceId);
      }
      const targetSlot = payload.slot as 'summonerD' | 'summonerF' | 'basicAttack' | undefined;
      if (payload.casterId && targetSlot) {
        store.patchChampionSkillRuntimeState(payload.casterId, targetSlot, {
          isCasting: true,
          isReady: false,
        });
      }
      if (payload.lockMovement && payload.casterId) {
        applyLocalMovementLock(payload.casterId, payload.movementLockDurationMs);
      }
    };

    const handleSpellStageTransition = (payload: Record<string, unknown>) => {
      const nextStage = payload.nextStage as string | undefined;
      const casterId = payload.casterId as string | undefined;
      const castInstanceId = payload.castInstanceId as string | undefined;

      if (nextStage === 'interrupted' && casterId) {
        useGameStore.getState().clearChampionAnimationClip(casterId);
        const interruptedSlot = payload.slot as SpellSlot | undefined;
        if (interruptedSlot) {
          useGameStore.getState().patchChampionSkillRuntimeState(casterId, interruptedSlot, {
            isCasting: false,
            isReady: false,
          });
        }
        if (castInstanceId) {
          useGameStore.getState().clearLocalSpellPredictionByCastInstanceId(castInstanceId);
        }
      }

      if (nextStage === 'finished' && casterId) {
        useGameStore.getState().clearChampionAnimationClip(casterId);
        const finishedSlot = payload.slot as SpellSlot | undefined;
        if (finishedSlot) {
          useGameStore.getState().patchChampionSkillRuntimeState(casterId, finishedSlot, {
            isCasting: false,
            isReady: false,
          });
        }
        if (castInstanceId) {
          useGameStore.getState().clearLocalSpellPredictionByCastInstanceId(castInstanceId);
        }
      }
    };

    /* ========== 注册事件 ========== */

    client.on('disconnect', handleDisconnect);
    client.on('connect_error', handleConnectError);
    client.io.on('reconnect', handleReconnect);
    client.io.on('reconnect_attempt', handleReconnectAttempt);
    client.io.on('reconnect_failed', handleReconnectFailed);
    client.on('battle:state', handleBattleState);
    client.on('room:info', handleRoomInfo);
    client.on('battle:error', handleError);
    client.on('room:error', handleRoomError);
    client.on('battle:allSceneReady', handleAllSceneReady);
    client.on('battle:roomNotFound', handleRoomNotFound);
    client.on('session:superseded', handleSessionSuperseded);
    client.on('battle:pong', handleBattlePong);
    client.on('room:playersUpdate', handlePlayersUpdate);
    client.on('combatSnapshot', handleCombatSnapshot);
    client.on('spellCastAccepted', handleSpellCastAccepted);
    client.on('spellCastRejected', handleSpellCastRejected);
    client.on('spellCastStarted', handleSpellCastStarted);
    client.on('champion:animate', handleChampionAnimate);
    client.on('champion:emote', handleChampionEmote);
    client.on('champion:voice', handleChampionVoice);
    client.on('spellStageTransition', handleSpellStageTransition);
    client.on('spellStageChanged', handleSpellStageTransition);

    /* 监听本地加载完成：当 isLoading 变为 false 时发送 battle:sceneReady */
    const checkAndEmitSceneReady = () => {
      if (sceneReadySentRef.sent) return;
      const { isLoading } = useGameStore.getState();
      if (!isLoading) {
        sceneReadySentRef.sent = true;
        const roomCode = getBattleRoomCode();
        client.emit('battle:sceneReady', { roomCode });
        console.log('[useBattleWsSync] battle:sceneReady emitted');
      }
    };
    const sceneReadyUnsubscribe = useGameStore.subscribe((state) => {
      if (!state.isLoading && !sceneReadySentRef.sent) {
        checkAndEmitSceneReady();
      }
    });
    // 组件挂载时也检查一次（可能资产已经加载完成）
    checkAndEmitSceneReady();

    // 启动 ClockSync 定时 ping（注册完监听器后）
    clockSync.start((clientSendTime) => {
      if (!client.connected) return;
      client.emit('battle:ping', { clientSendTime, clientTime: clientSendTime });
    });

    // 注册完监听器后再连接/发送 battle:join
    connectToBattleSocket(playerName);

    return () => {
      sceneReadyUnsubscribe();
      client.off('disconnect', handleDisconnect);
      client.off('connect_error', handleConnectError);
      client.io.off('reconnect', handleReconnect);
      client.io.off('reconnect_attempt', handleReconnectAttempt);
      client.io.off('reconnect_failed', handleReconnectFailed);
      client.off('battle:state', handleBattleState);
      client.off('room:info', handleRoomInfo);
      client.off('battle:error', handleError);
      client.off('room:error', handleRoomError);
      client.off('battle:allSceneReady', handleAllSceneReady);
      client.off('battle:roomNotFound', handleRoomNotFound);
      client.off('session:superseded', handleSessionSuperseded);
      client.off('battle:pong', handleBattlePong);
      client.off('room:playersUpdate', handlePlayersUpdate);
      client.off('combatSnapshot', handleCombatSnapshot);
      client.off('spellCastAccepted', handleSpellCastAccepted);
      client.off('spellCastRejected', handleSpellCastRejected);
      client.off('spellCastStarted', handleSpellCastStarted);
      client.off('champion:animate', handleChampionAnimate);
      client.off('champion:emote', handleChampionEmote);
      client.off('champion:voice', handleChampionVoice);
      client.off('spellStageTransition', handleSpellStageTransition);
      client.off('spellStageChanged', handleSpellStageTransition);
      clockSync.stop();
      unregisterSyncInstances();
      snapshotBufferRef.current.clear();
      controlledChampionIdRef.current = null;
      disconnectBattleSocket();
    };
  }, [enabled, playerName, currentUserId]);
}
