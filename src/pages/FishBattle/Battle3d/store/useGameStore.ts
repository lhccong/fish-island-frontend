import { create } from 'zustand';
import * as THREE from 'three';
import type { ActiveEmoteState, AnimationClipRequest, AnimationState, AreaPresentationState, CameraMode, ChampionState, CombatImpactVfxState, EmoteId, FloatingCombatTextState, HealthRelicState, InhibitorState, InputMode, KillFeedEntry, MinionState, MoveIndicatorState, MultiplayerDiagnosticsState, MultiplayerSessionState, MultiplayerSnapshot, NexusState, PlayerSessionAssignment, ProjectilePresentationState, SerializedVector3, SkillRuntimeState, SpellAimState, SpellCastPhase, SpellSlot, StatusEffectViewState, TowerState, VoicePlaybackRequest } from '../types/game';
import { GAME_CONFIG } from '../config/gameConfig';
import type { SkillCastDefinition } from '../config/skillDefinitions';
import { getHeroConfig } from '../config/heroConfig';
import { MAP_CONFIG } from '../config/mapConfig';

/** 客户端本地施法预测运行态。 */
interface LocalSpellPredictionState {
  /** 客户端本地施法请求 ID。 */
  requestId: string;
  /** 施法者实体 ID。 */
  casterId: string;
  /** 技能槽位。 */
  slot: SpellSlot;
  /** 技能定义 ID。 */
  skillId: string;
  /** 预测登记时间戳。 */
  createdAt: number;
  /** 服务端回传的技能实例 ID。 */
  castInstanceId: string | null;
  /** 当前预测状态。 */
  status: 'pending' | 'accepted' | 'started';
  /** 施法失败时用于恢复的瞄准态快照。 */
  aimSnapshot: SpellAimState | null;
}

interface GameStore {
  // 游戏状态
  gameTimer: number;
  blueKills: number;
  redKills: number;
  champions: ChampionState[];
  minions: MinionState[];
  towers: TowerState[];
  nexuses: NexusState[];
  inhibitors: InhibitorState[];
  healthRelics: HealthRelicState[];
  activeEmotes: ActiveEmoteState[];
  moveIndicator: MoveIndicatorState | null;
  cameraMode: CameraMode;
  isPlayerCameraLocked: boolean;
  spectatorTargetId: string | null;
  showWorldCoordinates: boolean;
  debugFreeCamera: boolean;
  /** 调试模式：是否显示技能判定范围线框（投射物碰撞球、区域体范围、英雄碰撞体）。 */
  debugHitboxes: boolean;
  multiplayerSession: MultiplayerSessionState;

  /** 当前场景中的投射物表现态列表（来自 combatSnapshot）。 */
  projectiles: ProjectilePresentationState[];
  /** 当前场景中的区域体表现态列表（来自 combatSnapshot）。 */
  areas: AreaPresentationState[];
  /** 当前场景中的战斗状态效果列表（来自 combatSnapshot）。 */
  combatStatuses: StatusEffectViewState[];
  /** 当前场景中的浮动战斗文本列表。 */
  floatingCombatTexts: FloatingCombatTextState[];
  /** 当前场景中的战斗命中特效列表。 */
  combatImpactVfxes: CombatImpactVfxState[];
  killFeed: KillFeedEntry[];
  scoreboardVisible: boolean;

  /** 当前技能瞄准状态（null 表示未在瞄准模式）。 */
  spellAimState: SpellAimState | null;
  /** 当前等待服务端确认的本地施法预测表。 */
  localSpellPredictions: Record<string, LocalSpellPredictionState>;

  /** 英雄技能元数据（图标、描述），按 championId → slot → {icon, name, description} 存储。 */
  heroSkillsMeta: Record<string, Record<string, { name: string; icon: string; description: string }>>;
  /** 后端下发的英雄技能施法参数定义，按 heroId → slot → SkillCastDefinition 存储。为前端指示器/范围判定的单一数据源。 */
  heroSkillCastDefs: Record<string, Record<string, SkillCastDefinition>>;
  /** 召唤师技能元数据（图标、描述、参数JSON），按 spellId → {name, icon, description, cooldown, assetConfig} 存储。 */
  summonerSpellsMeta: Record<string, { name: string; icon: string; description: string; cooldown: number; assetConfig?: string }>;
  /** 各英雄选择的召唤师技能映射，按 championId → {spell1, spell2} 存储。 */
  championSummonerSpells: Record<string, { spell1: string; spell2: string }>;
  /** 英雄头像 URL，按 championId → avatarUrl 存储。 */
  championAvatarUrls: Record<string, string>;

  /** 智能施法模式开关（开启后按键直接释放技能，无需瞄准确认）。 */
  smartCastEnabled: boolean;
  /** 全局鼠标地面世界坐标（由 InputController 持续更新）。 */
  lastMouseWorldPosition: SerializedVector3 | null;

  // 加载状态
  isLoading: boolean;
  loadingProgress: number;
  loadingError: string | null;
  /** 全员 3D 场景加载就绪标志（CyclicBarrier：所有人都加载完成后才为 true） */
  allScenesReady: boolean;

  // Actions
  setLoadingProgress: (progress: number) => void;
  setLoading: (loading: boolean) => void;
  beginAssetLoading: (total: number) => void;
  updateAssetLoading: (loaded: number, total: number) => void;
  finishAssetLoading: () => void;
  setLoadingError: (message: string | null) => void;
  setAllScenesReady: (ready: boolean) => void;
  applyMultiplayerSnapshot: (snapshot: MultiplayerSnapshot) => void;
  setMultiplayerConnectionStatus: (status: MultiplayerSessionState['status'], errorMessage?: string | null) => void;
  setMultiplayerAssignment: (assignment: PlayerSessionAssignment, socketId: string, roomId: string) => void;
  clearMultiplayerAssignment: () => void;
  setMultiplayerPlayers: (players: PlayerSessionAssignment[]) => void;
  setMultiplayerBufferedSnapshotCount: (count: number) => void;
  setMultiplayerDiagnosticsFps: (fps: number) => void;
  pushFloatingCombatText: (text: FloatingCombatTextState) => void;
  pushCombatImpactVfx: (vfx: CombatImpactVfxState) => void;
  cleanupExpiredCombatFeedback: () => void;
  pushKillFeedEntry: (entry: KillFeedEntry) => void;
  cleanupExpiredKillFeed: () => void;
  setScoreboardVisible: (visible: boolean) => void;
  upsertCombatStatus: (status: StatusEffectViewState) => void;
  removeCombatStatus: (statusInstanceId?: string, statusId?: string, targetEntityId?: string) => void;
  upsertProjectile: (projectile: ProjectilePresentationState) => void;
  removeProjectile: (projectileId: string) => void;
  upsertArea: (area: AreaPresentationState) => void;
  removeArea: (areaId: string) => void;
  applyAuthoritativeDisplacement: (championId: string, position: SerializedVector3, movementLockedUntil?: number) => void;
  setChampionAnimationState: (championId: string, animationState: AnimationState) => void;
  /** 设置英雄朝向角度（施法时转向鼠标方向）。 */
  setChampionFacingRotation: (championId: string, rotation: number) => void;
  patchChampionSkillRuntimeState: (championId: string, slot: SpellSlot, patch: Partial<SkillRuntimeState>) => void;
  playChampionAnimationClip: (championId: string, request: AnimationClipRequest) => void;
  clearChampionAnimationClip: (championId: string) => void;
  setCameraMode: (mode: CameraMode) => void;
  togglePlayerCameraLock: () => void;
  setPlayerCameraLocked: (locked: boolean) => void;
  toggleDirectorMode: () => void;
  setSpectatorTarget: (championId: string | null) => void;
  cycleSpectatorTarget: (direction: 1 | -1) => void;
  focusControlledChampion: () => void;
  toggleWorldCoordinates: () => void;
  toggleDebugFreeCamera: () => void;
  /** 切换调试判定范围线框显示。 */
  toggleDebugHitboxes: () => void;
  setChampionMoveTarget: (championId: string, target: THREE.Vector3 | null, inputMode?: InputMode) => void;
  showMoveIndicator: (position: THREE.Vector3) => void;
  stopChampion: (championId: string) => void;
  triggerChampionEmote: (championId: string, emoteId: EmoteId, durationMs?: number) => void;
  setChampionVoiceRequest: (championId: string, request: VoicePlaybackRequest | null) => void;
  cleanupExpiredEmotes: () => void;
  /** 进入技能瞄准模式。 */
  enterSpellAim: (aimState: SpellAimState) => void;
  /** 更新当前技能瞄准中的实时目标信息。 */
  updateSpellAim: (patch: Partial<SpellAimState>) => void;
  /** 退出技能瞄准模式。 */
  exitSpellAim: () => void;
  /** 登记一条本地施法预测记录。 */
  registerLocalSpellPrediction: (prediction: LocalSpellPredictionState) => void;
  /** 将预测请求标记为已被服务端接受，并绑定技能实例 ID。 */
  acceptLocalSpellPrediction: (requestId: string, castInstanceId?: string | null) => void;
  /** 将已接受的预测请求标记为 started。 */
  markLocalSpellPredictionStarted: (castInstanceId: string) => void;
  /** 按 requestId 查找本地施法预测记录。 */
  findLocalSpellPredictionByRequestId: (requestId: string) => LocalSpellPredictionState | null;
  /** 按 castInstanceId 查找本地施法预测记录。 */
  findLocalSpellPredictionByCastInstanceId: (castInstanceId: string) => LocalSpellPredictionState | null;
  /** 按 requestId 清理本地施法预测记录。 */
  clearLocalSpellPredictionByRequestId: (requestId: string) => void;
  /** 按 castInstanceId 清理本地施法预测记录。 */
  clearLocalSpellPredictionByCastInstanceId: (castInstanceId: string) => void;
  tickMovement: (delta: number) => void;
  initGameState: () => void;
  updateGameTimer: (delta: number) => void;
  /** 设置英雄技能元数据。 */
  setHeroSkillsMeta: (championId: string, skills: Record<string, { name: string; icon: string; description: string }>) => void;
  /** 设置后端下发的英雄技能施法参数定义（heroId → slot → def）。 */
  setHeroSkillCastDefs: (defs: Record<string, Record<string, SkillCastDefinition>>) => void;
  /** 设置召唤师技能元数据。 */
  setSummonerSpellsMeta: (spells: Record<string, { name: string; icon: string; description: string; cooldown: number; assetConfig?: string }>) => void;
  /** 设置英雄选择的召唤师技能。 */
  setChampionSummonerSpells: (championId: string, spell1: string, spell2: string) => void;
  /** 设置英雄头像 URL。 */
  setChampionAvatarUrl: (championId: string, avatarUrl: string) => void;
  /** 切换智能施法模式。 */
  toggleSmartCast: () => void;
  /** 设置智能施法模式。 */
  setSmartCastEnabled: (enabled: boolean) => void;
  /** 更新全局鼠标地面世界坐标。 */
  setLastMouseWorldPosition: (position: SerializedVector3) => void;
}

const INITIAL_MULTIPLAYER_DIAGNOSTICS: MultiplayerDiagnosticsState = {
  enabled: GAME_CONFIG.multiplayer.enabled,
  fps: 0,
  lastReceivedSequence: 0,
  lastAppliedSequence: 0,
  droppedSnapshotCount: 0,
  snapshotArrivalCount: 0,
  lastSnapshotReceivedAt: null,
  lastSnapshotServerTime: null,
  snapshotLatencyMs: null,
  rttMs: null,
  bufferedSnapshotCount: 0,
  renderDelayMs: GAME_CONFIG.multiplayer.renderDelayMs,
  lastSentMoveSequence: 0,
  lastAckedMoveSequence: 0,
  lastMoveCommandSentAt: null,
  lastMoveCommandAckAt: null,
  pingSampleCount: 0,
  timedOutPingCount: 0,
  pingTimeoutRatePercent: 0,
  snapshotDiscardRatePercent: 0,
  networkAnomalyPercent: 0,
};

const INITIAL_MULTIPLAYER_SESSION: MultiplayerSessionState = {
  enabled: GAME_CONFIG.multiplayer.enabled,
  status: 'idle',
  socketId: null,
  roomId: null,
  controlledChampionId: null,
  assignedTeam: null,
  errorMessage: null,
  players: [],
  hasJoinedRoom: false,
  diagnostics: INITIAL_MULTIPLAYER_DIAGNOSTICS,
};

const DEFAULT_SPELL_SLOTS: SpellSlot[] = ['passive', 'basicAttack', 'q', 'w', 'e', 'r', 'summonerD', 'summonerF', 'recall'];

function createDefaultSkillRuntimeState(slot: SpellSlot): SkillRuntimeState {
  return {
    slot,
    skillId: slot,
    name: slot === 'passive'
      ? '被动'
      : slot === 'basicAttack'
        ? '普攻'
        : slot === 'summonerD'
          ? '召唤师技能 D'
          : slot === 'summonerF'
            ? '召唤师技能 F'
            : slot === 'recall'
              ? '回城'
              : slot.toUpperCase(),
    level: slot === 'passive' ? 1 : 0,
    maxCooldownMs: 0,
    remainingCooldownMs: 0,
    isReady: true,
    insufficientResource: false,
    isSecondPhase: false,
    isCasting: false,
  };
}

function createInitialSkillStates(): Record<SpellSlot, SkillRuntimeState> {
  return DEFAULT_SPELL_SLOTS.reduce((result, slot) => {
    result[slot] = createDefaultSkillRuntimeState(slot);
    return result;
  }, {} as Record<SpellSlot, SkillRuntimeState>);
}

function createInitialStatusEffects(): StatusEffectViewState[] {
  return [];
}

function createInitialCastPhase(): SpellCastPhase {
  return 'idle';
}

function toVector3(vector: { x: number; y: number; z: number } | null | undefined): THREE.Vector3 | null {
  if (!vector) {
    return null;
  }
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}

function vectorEquals(
  current: THREE.Vector3 | null,
  next: { x: number; y: number; z: number } | THREE.Vector3 | null | undefined,
): boolean {
  if (!current && !next) {
    return true;
  }

  if (!current || !next) {
    return false;
  }

  return current.x === next.x && current.y === next.y && current.z === next.z;
}

function serializedVectorEquals(
  current: SerializedVector3 | null | undefined,
  next: SerializedVector3 | null | undefined,
): boolean {
  if (!current && !next) {
    return true;
  }
  if (!current || !next) {
    return false;
  }
  return current.x === next.x && current.y === next.y && current.z === next.z;
}

function spellAimPatchChanged(current: SpellAimState, patch: Partial<SpellAimState>): boolean {
  for (const [key, value] of Object.entries(patch) as [keyof SpellAimState, SpellAimState[keyof SpellAimState]][]) {
    const currentValue = current[key];
    if (key === 'cursorWorldPosition' || key === 'targetPoint' || key === 'targetDirection') {
      if (!serializedVectorEquals(currentValue as SerializedVector3 | null | undefined, value as SerializedVector3 | null | undefined)) {
        return true;
      }
      continue;
    }
    if (currentValue !== value) {
      return true;
    }
  }
  return false;
}

function animationClipRequestEquals(
  current: AnimationClipRequest | null | undefined,
  next: AnimationClipRequest | null | undefined,
): boolean {
  if (!current && !next) {
    return true;
  }

  if (!current || !next) {
    return false;
  }

  return current.actionSlot === next.actionSlot
    && current.clipName === next.clipName
    && current.loop === next.loop
    && current.playbackRate === next.playbackRate
    && current.reset === next.reset
    && current.durationMs === next.durationMs
    && current.lockMovement === next.lockMovement
    && current.movementLockDurationMs === next.movementLockDurationMs
    && current.fallbackState === next.fallbackState
    && current.nonce === next.nonce;
}

function voicePlaybackRequestEquals(
  current: VoicePlaybackRequest | null | undefined,
  next: VoicePlaybackRequest | null | undefined,
): boolean {
  if (!current && !next) {
    return true;
  }

  if (!current || !next) {
    return false;
  }

  return current.nonce === next.nonce
    && current.slot === next.slot
    && current.customVoiceId === next.customVoiceId
    && current.voiceUrl === next.voiceUrl
    && current.volume === next.volume;
}

function skillRuntimeStateEquals(
  current: SkillRuntimeState | undefined,
  next: SkillRuntimeState | undefined,
): boolean {
  if (!current && !next) {
    return true;
  }

  if (!current || !next) {
    return false;
  }

  return current.slot === next.slot
    && current.skillId === next.skillId
    && current.name === next.name
    && current.level === next.level
    && current.maxCooldownMs === next.maxCooldownMs
    && current.remainingCooldownMs === next.remainingCooldownMs
    && current.isReady === next.isReady
    && current.insufficientResource === next.insufficientResource
    && current.isSecondPhase === next.isSecondPhase
    && current.isCasting === next.isCasting;
}

function skillStatesEquals(
  current: ChampionState['skillStates'] | undefined,
  next: ChampionState['skillStates'] | undefined,
): boolean {
  if (!current && !next) {
    return true;
  }

  if (!current || !next) {
    return false;
  }

  const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
  for (const key of keys) {
    if (!skillRuntimeStateEquals(current[key as SpellSlot], next[key as SpellSlot])) {
      return false;
    }
  }
  return true;
}

function mergeSnapshotChampions(
  previousChampions: ChampionState[],
  snapshotChampions: MultiplayerSnapshot['champions'],
  controlledChampionId: string | null,
): ChampionState[] {
  const previousChampionMap = new Map(previousChampions.map((champion) => [champion.id, champion]));
  const snapshotChampionMap = new Map(snapshotChampions.map((c) => [c.id, c]));

  /* 合并快照中存在的英雄 */
  const merged: ChampionState[] = snapshotChampions.map((snapshotChampion) => {
    const previousChampion = previousChampionMap.get(snapshotChampion.id);
    const nextPosition = toVector3(snapshotChampion.position) ?? new THREE.Vector3();
    const nextMoveTarget = toVector3(snapshotChampion.moveTarget);
    const nextAnimationClipRequest = snapshotChampion.animationClipRequest ?? null;
    const nextVoiceRequest = snapshotChampion.lastVoiceRequest ?? null;
    const nextIsMe = snapshotChampion.id === controlledChampionId;

    if (!previousChampion) {
      return {
        ...snapshotChampion,
        position: nextPosition,
        moveTarget: nextMoveTarget,
        animationClipRequest: nextAnimationClipRequest,
        lastVoiceRequest: nextVoiceRequest,
        isMe: nextIsMe,
      };
    }

    const samePosition = vectorEquals(previousChampion.position, nextPosition);
    const sameMoveTarget = vectorEquals(previousChampion.moveTarget, nextMoveTarget);
    const sameAnimationClipRequest = animationClipRequestEquals(previousChampion.animationClipRequest, nextAnimationClipRequest);
    const sameVoiceRequest = voicePlaybackRequestEquals(previousChampion.lastVoiceRequest, nextVoiceRequest);
    const sameSkillStates = skillStatesEquals(previousChampion.skillStates, snapshotChampion.skillStates);
    const sameChampion = previousChampion.heroId === snapshotChampion.heroId
      && previousChampion.skin === snapshotChampion.skin
      && previousChampion.playerName === snapshotChampion.playerName
      && previousChampion.team === snapshotChampion.team
      && previousChampion.rotation === snapshotChampion.rotation
      && previousChampion.hp === snapshotChampion.hp
      && previousChampion.maxHp === snapshotChampion.maxHp
      && previousChampion.mp === snapshotChampion.mp
      && previousChampion.maxMp === snapshotChampion.maxMp
      && previousChampion.level === snapshotChampion.level
      && previousChampion.kills === snapshotChampion.kills
      && previousChampion.deaths === snapshotChampion.deaths
      && previousChampion.assists === snapshotChampion.assists
      && previousChampion.damageDealt === snapshotChampion.damageDealt
      && previousChampion.damageTaken === snapshotChampion.damageTaken
      && previousChampion.isDead === snapshotChampion.isDead
      && previousChampion.respawnTimer === snapshotChampion.respawnTimer
      && previousChampion.animationState === snapshotChampion.animationState
      && previousChampion.inputMode === snapshotChampion.inputMode
      && previousChampion.moveSpeed === snapshotChampion.moveSpeed
      && previousChampion.movementLockedUntil === snapshotChampion.movementLockedUntil
      && previousChampion.idleStartedAt === snapshotChampion.idleStartedAt
      && sameSkillStates
      && previousChampion.isMe === nextIsMe;

    if (sameChampion && samePosition && sameMoveTarget && sameAnimationClipRequest && sameVoiceRequest) {
      return previousChampion;
    }

    return {
      ...previousChampion,
      ...snapshotChampion,
      position: samePosition ? previousChampion.position : nextPosition,
      moveTarget: sameMoveTarget ? previousChampion.moveTarget : nextMoveTarget,
      animationClipRequest: sameAnimationClipRequest ? previousChampion.animationClipRequest : nextAnimationClipRequest,
      lastVoiceRequest: sameVoiceRequest ? previousChampion.lastVoiceRequest : nextVoiceRequest,
      isMe: nextIsMe,
    };
  });

  /* 保留之前存在但当前快照中不可见的英雄（视野过滤导致缺失），
   * 这样计分板（TAB）始终能展示所有英雄的 KDA 等统计数据。 */
  for (const prev of previousChampions) {
    if (!snapshotChampionMap.has(prev.id)) {
      merged.push(prev);
    }
  }

  return merged;
}

function mergeSnapshotEmotes(
  previousEmotes: ActiveEmoteState[],
  snapshotEmotes: MultiplayerSnapshot['activeEmotes'],
  controlledChampionId: string | null,
  now: number,
): ActiveEmoteState[] {
  const previousEmoteMap = new Map(previousEmotes.map((item) => [item.id, item]));

  return snapshotEmotes
    .filter((item) => item.expiresAt > now)
    .map((item) => {
      const previousEmote = previousEmoteMap.get(item.id);
      const nextIsMe = item.championId === controlledChampionId;

      if (
        previousEmote
        && previousEmote.championId === item.championId
        && previousEmote.playerName === item.playerName
        && previousEmote.emoteId === item.emoteId
        && previousEmote.createdAt === item.createdAt
        && previousEmote.expiresAt === item.expiresAt
        && previousEmote.isMe === nextIsMe
      ) {
        return previousEmote;
      }

      return {
        ...item,
        isMe: nextIsMe,
      };
    });
}

function attachStatusesToChampions(
  champions: ChampionState[],
  statuses: StatusEffectViewState[],
): ChampionState[] {
  /* 无状态效果时直接返回原数组引用，避免每次快照都为所有英雄创建新对象 */
  if (statuses.length === 0) {
    const allEmpty = champions.every((c) => !c.statusEffects || c.statusEffects.length === 0);
    if (allEmpty) {
      return champions;
    }
    return champions.map((champion) =>
      (!champion.statusEffects || champion.statusEffects.length === 0)
        ? champion
        : { ...champion, statusEffects: [] },
    );
  }

  const statusMap = new Map<string, StatusEffectViewState[]>();
  for (const status of statuses) {
    if (!statusMap.has(status.targetEntityId)) {
      statusMap.set(status.targetEntityId, []);
    }
    statusMap.get(status.targetEntityId)!.push(status);
  }
  let changed = false;
  const result = champions.map((champion) => {
    const nextEffects = statusMap.get(champion.id) ?? [];
    const prevEffects = champion.statusEffects ?? [];
    /* 浅比较：数量相同且每一项引用相同则跳过 */
    if (nextEffects.length === prevEffects.length && nextEffects.every((e, i) => e === prevEffects[i])) {
      return champion;
    }
    changed = true;
    return { ...champion, statusEffects: nextEffects };
  });
  return changed ? result : champions;
}

function upsertCombatStatusItem(
  previousStatuses: StatusEffectViewState[],
  nextStatus: StatusEffectViewState,
): StatusEffectViewState[] {
  const index = previousStatuses.findIndex((status) => status.statusInstanceId === nextStatus.statusInstanceId);
  if (index < 0) {
    return [...previousStatuses, nextStatus];
  }
  const nextStatuses = [...previousStatuses];
  nextStatuses[index] = nextStatus;
  return nextStatuses;
}

function upsertProjectileItem(
  previousProjectiles: ProjectilePresentationState[],
  nextProjectile: ProjectilePresentationState,
): ProjectilePresentationState[] {
  const index = previousProjectiles.findIndex((projectile) => projectile.projectileId === nextProjectile.projectileId);
  if (index < 0) {
    return [...previousProjectiles, nextProjectile];
  }
  const nextProjectiles = [...previousProjectiles];
  nextProjectiles[index] = nextProjectile;
  return nextProjectiles;
}

function upsertAreaItem(
  previousAreas: AreaPresentationState[],
  nextArea: AreaPresentationState,
): AreaPresentationState[] {
  const index = previousAreas.findIndex((area) => area.areaId === nextArea.areaId);
  if (index < 0) {
    return [...previousAreas, nextArea];
  }
  const nextAreas = [...previousAreas];
  nextAreas[index] = nextArea;
  return nextAreas;
}

const TEMP_DIRECTION = new THREE.Vector3();
const FULL_TURN = Math.PI * 2;
const ROTATION_LERP_SPEED = 14;

function isWithinPlayableBounds(position: THREE.Vector3): boolean {
  return position.x >= MAP_CONFIG.playableBounds.minX
    && position.x <= MAP_CONFIG.playableBounds.maxX
    && position.z >= MAP_CONFIG.playableBounds.minZ
    && position.z <= MAP_CONFIG.playableBounds.maxZ;
}

function getShortestAngleDelta(current: number, target: number): number {
  return ((target - current + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI;
}

function clampToBattlefield(position: THREE.Vector3): THREE.Vector3 {
  return position.set(
    THREE.MathUtils.clamp(position.x, MAP_CONFIG.playableBounds.minX, MAP_CONFIG.playableBounds.maxX),
    0,
    THREE.MathUtils.clamp(position.z, MAP_CONFIG.playableBounds.minZ, MAP_CONFIG.playableBounds.maxZ),
  );
}

function getChampionSpeed(heroId: string): number {
  const hero = getHeroConfig(heroId);
  return hero?.moveSpeed ?? 300;
}

function getChampionStandbyDelay(heroId: string): number {
  const hero = getHeroConfig(heroId);
  return hero?.asset?.animations.standbyDelayMs ?? 1400;
}

function resolveSingleHeroDebugId(): string | null {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const debugHeroId = params.get('debugHero')?.trim() || params.get('singleHero')?.trim();
  return debugHeroId && debugHeroId.length > 0 ? debugHeroId : null;
}

function getTowerMaxHp(type: TowerState['type']): number {
  if (type === 'outer') {
    return GAME_CONFIG.environment.towers.outerMaxHp;
  }
  if (type === 'inner') {
    return GAME_CONFIG.environment.towers.innerMaxHp;
  }
  return GAME_CONFIG.environment.towers.nexusGuardMaxHp;
}

function createInitialChampions(): ChampionState[] {
  const champions: ChampionState[] = [];
  const idleStartedAt = Date.now();
  const configuredLineup = GAME_CONFIG.heroes.lineup;
  const singleHeroDebugId = resolveSingleHeroDebugId();
  const lineup = singleHeroDebugId
    ? configuredLineup.filter((item) => item.heroId === singleHeroDebugId).slice(0, 1)
    : configuredLineup;
  const effectiveLineup = lineup.length > 0 ? lineup : configuredLineup;
  const bluePositions = MAP_CONFIG.spawnLayouts.blue;
  const redPositions = MAP_CONFIG.spawnLayouts.red;

  const pushChampionFromLineup = (team: 'blue' | 'red', slotIndex: number) => {
    const teamLineup = effectiveLineup.filter((item) => item.team === team);
    const lineupItem = teamLineup[slotIndex];
    if (!lineupItem) return;

    const hero = getHeroConfig(lineupItem.heroId);
    if (!hero) return;

    const spawnLayouts = team === 'blue' ? bluePositions : redPositions;
    const pos = spawnLayouts[slotIndex];
    if (!pos) return;

    champions.push({
      id: `${team}_${slotIndex}`,
      heroId: hero.heroId,
      skin: lineupItem.skin,
      playerName: lineupItem.playerName,
      team,
      position: new THREE.Vector3(pos[0], pos[1], pos[2]),
      rotation: team === 'blue' ? 0 : Math.PI,
      hp: hero.baseHp * (0.5 + Math.random() * 0.5),
      maxHp: hero.baseHp,
      mp: hero.baseMp * (0.4 + Math.random() * 0.6),
      maxMp: hero.baseMp,
      level: 1,
      kills: 0,
      deaths: 0,
      assists: 0,
      damageDealt: 0,
      damageTaken: 0,
      isDead: false,
      respawnTimer: 0,
      animationState: 'idle',
      animationClipRequest: null,
      isMe: false,
      moveTarget: null,
      inputMode: 'idle',
      movementLockedUntil: 0,
      idleStartedAt,
      lastVoiceRequest: null,
      shield: 0,
      flowValue: 0,
      skillStates: createInitialSkillStates(),
      statusEffects: createInitialStatusEffects(),
      activeCastInstanceId: null,
      activeCastPhase: createInitialCastPhase(),
    } as ChampionState);
  };

  for (let i = 0; i < bluePositions.length; i++) {
    pushChampionFromLineup('blue', i);
  }

  for (let i = 0; i < redPositions.length; i++) {
    pushChampionFromLineup('red', i);
  }

  const controlledLineupItem = effectiveLineup.find((item) => item.isControlled) ?? effectiveLineup[0] ?? null;
  const meIndex = controlledLineupItem
    ? champions.findIndex(
      (c) => c.team === controlledLineupItem.team
        && c.heroId === controlledLineupItem.heroId
        && c.skin === controlledLineupItem.skin
        && c.playerName === controlledLineupItem.playerName,
    )
    : -1;

  if (meIndex >= 0) {
    const me = champions[meIndex];
    champions[meIndex] = {
      ...me,
      /** 受控英雄名称后追加"(我)"标识。 */
      playerName: `${me.playerName}(我)`,
      isMe: true,
    };
  } else if (champions.length > 0) {
    const fallbackIndex = controlledLineupItem
      ? champions.findIndex((c) => c.team === controlledLineupItem.team)
      : champions.findIndex((c) => c.team === 'blue');
    const safeFallbackIndex = fallbackIndex >= 0 ? fallbackIndex : 0;
    if (safeFallbackIndex >= 0) {
      const fallback = champions[safeFallbackIndex];
      champions[safeFallbackIndex] = {
        ...fallback,
        playerName: `${fallback.playerName}(我)`,
        isMe: true,
      };
    }
  }

  return champions;
}

function createInitialTowers(): TowerState[] {
  return MAP_CONFIG.towers.map((t, i) => ({
    id: `tower_${i}`,
    team: t.team,
    position: new THREE.Vector3(...t.position),
    hp: getTowerMaxHp(t.type),
    maxHp: getTowerMaxHp(t.type),
    isDestroyed: false,
    type: t.type,
  }));
}

function createInitialNexuses(): NexusState[] {
  return MAP_CONFIG.nexuses.map((n, i) => ({
    id: `nexus_${i}`,
    team: n.team,
    position: new THREE.Vector3(...n.position),
    hp: 5000,
    maxHp: 5000,
    isDestroyed: false,
  }));
}

function createInitialInhibitors(): InhibitorState[] {
  const inhibitorMaxHp = GAME_CONFIG.environment.inhibitor.maxHp;
  return MAP_CONFIG.inhibitors.map((inh, i) => ({
    id: `inhibitor_${i}`,
    team: inh.team,
    position: new THREE.Vector3(...inh.position),
    hp: inhibitorMaxHp,
    maxHp: inhibitorMaxHp,
    isDestroyed: false,
  }));
}

function createInitialRelics(): HealthRelicState[] {
  return MAP_CONFIG.healthRelics.map((r, i) => ({
    id: `relic_${i}`,
    position: new THREE.Vector3(...r.position),
    isAvailable: true,
    respawnTimer: 0,
  }));
}

function createInitialMinions(): MinionState[] {
  return [];
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameTimer: 0,
  blueKills: 0,
  redKills: 0,
  champions: createInitialChampions(),
  minions: createInitialMinions(),
  towers: createInitialTowers(),
  nexuses: createInitialNexuses(),
  inhibitors: createInitialInhibitors(),
  healthRelics: createInitialRelics(),
  activeEmotes: [],
  moveIndicator: null,
  cameraMode: 'playerLocked',
  isPlayerCameraLocked: GAME_CONFIG.camera.defaultLocked,
  spectatorTargetId: null,
  showWorldCoordinates: GAME_CONFIG.debug.worldCoordinates.enabled,
  debugFreeCamera: GAME_CONFIG.debug.freeCamera.enabled,
  debugHitboxes: false,
  multiplayerSession: INITIAL_MULTIPLAYER_SESSION,
  projectiles: [],
  areas: [],
  combatStatuses: [],
  floatingCombatTexts: [],
  combatImpactVfxes: [],
  killFeed: [],
  scoreboardVisible: false,
  spellAimState: null,
  localSpellPredictions: {},
  heroSkillsMeta: {},
  heroSkillCastDefs: {},
  summonerSpellsMeta: {},
  championSummonerSpells: {},
  championAvatarUrls: {},
  smartCastEnabled: false,
  lastMouseWorldPosition: null,
  isLoading: true,
  loadingProgress: 0,
  loadingError: null,
  allScenesReady: false,

  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
  setLoading: (loading) => set({ isLoading: loading }),
  beginAssetLoading: (total) =>
    set({
      isLoading: total > 0,
      loadingProgress: total > 0 ? 0 : 100,
      loadingError: null,
    }),
  updateAssetLoading: (loaded, total) =>
    set({
      isLoading: loaded < total,
      loadingProgress: total > 0 ? Math.min(100, (loaded / total) * 100) : 100,
    }),
  finishAssetLoading: () =>
    set({
      isLoading: false,
      loadingProgress: 100,
    }),
  setLoadingError: (message) => set({ loadingError: message }),
  setAllScenesReady: (ready) => set({ allScenesReady: ready }),
  applyMultiplayerSnapshot: (snapshot) =>
    set((state) => {
      const now = Date.now();
      const diagnostics = state.multiplayerSession.diagnostics;
      const lastAppliedSequence = diagnostics.lastAppliedSequence;
      const nextReceivedSequence = Math.max(diagnostics.lastReceivedSequence, snapshot.sequence);
      const nextDiagnosticsBase = {
        ...diagnostics,
        enabled: state.multiplayerSession.enabled,
        lastReceivedSequence: nextReceivedSequence,
        lastSnapshotReceivedAt: now,
        lastSnapshotServerTime: snapshot.timestamp,
        snapshotLatencyMs: Math.max(0, now - snapshot.timestamp),
        bufferedSnapshotCount: 1,
      };

      if (snapshot.sequence <= lastAppliedSequence) {
        return {
          multiplayerSession: {
            ...state.multiplayerSession,
            diagnostics: {
              ...nextDiagnosticsBase,
              droppedSnapshotCount: diagnostics.droppedSnapshotCount + 1,
            },
          },
        };
      }

      const nextChampions = mergeSnapshotChampions(
        state.champions,
        snapshot.champions,
        state.multiplayerSession.controlledChampionId,
      );
      const nextActiveEmotes = mergeSnapshotEmotes(
        state.activeEmotes,
        snapshot.activeEmotes,
        state.multiplayerSession.controlledChampionId,
        now,
      );

      return {
        gameTimer: snapshot.gameTimer,
        blueKills: snapshot.blueKills,
        redKills: snapshot.redKills,
        champions: attachStatusesToChampions(nextChampions, state.combatStatuses),
        minions: snapshot.minions,
        activeEmotes: nextActiveEmotes,
        multiplayerSession: {
          ...state.multiplayerSession,
          diagnostics: {
            ...nextDiagnosticsBase,
            lastAppliedSequence: snapshot.sequence,
            bufferedSnapshotCount: 0,
          },
        },
      };
    }),
  setMultiplayerConnectionStatus: (status, errorMessage = null) =>
    set((state) => ({
      multiplayerSession: {
        ...state.multiplayerSession,
        status,
        errorMessage,
        hasJoinedRoom: status === 'connected' ? state.multiplayerSession.hasJoinedRoom : false,
      },
    })),
  setMultiplayerAssignment: (assignment, socketId, roomId) =>
    set((state) => ({
      multiplayerSession: {
        ...state.multiplayerSession,
        status: 'connected',
        socketId,
        roomId,
        controlledChampionId: assignment.championId,
        assignedTeam: assignment.team,
        errorMessage: null,
        hasJoinedRoom: true,
      },
      champions: state.champions.map((champion) => ({
        ...champion,
        isMe: champion.id === assignment.championId,
      })),
    })),
  clearMultiplayerAssignment: () =>
    set((state) => ({
      multiplayerSession: {
        ...state.multiplayerSession,
        socketId: null,
        controlledChampionId: null,
        assignedTeam: null,
        hasJoinedRoom: false,
      },
      champions: state.champions.map((champion) =>
        champion.isMe
          ? { ...champion, isMe: false }
          : champion
      ),
    })),
  setMultiplayerPlayers: (players) =>
    set((state) => ({
      multiplayerSession: {
        ...state.multiplayerSession,
        players,
      },
    })),
  setMultiplayerBufferedSnapshotCount: (count) =>
    set((state) => ({
      multiplayerSession: {
        ...state.multiplayerSession,
        diagnostics: {
          ...state.multiplayerSession.diagnostics,
          bufferedSnapshotCount: count,
        },
      },
    })),
  setMultiplayerDiagnosticsFps: (fps) =>
    set((state) => {
      if (state.multiplayerSession.diagnostics.fps === fps) {
        return state;
      }
      return {
        multiplayerSession: {
          ...state.multiplayerSession,
          diagnostics: {
            ...state.multiplayerSession.diagnostics,
            fps,
          },
        },
      };
    }),
  pushFloatingCombatText: (text) =>
    set((state) => ({
      floatingCombatTexts: [...state.floatingCombatTexts, text].slice(-48),
    })),
  pushCombatImpactVfx: (vfx) =>
    set((state) => ({
      combatImpactVfxes: [...state.combatImpactVfxes, vfx].slice(-48),
    })),
  pushKillFeedEntry: (entry) =>
    set((state) => ({
      killFeed: [...state.killFeed, entry].slice(-8),
    })),
  cleanupExpiredCombatFeedback: () =>
    set((state) => {
      const now = Date.now();
      const nextTexts = state.floatingCombatTexts.filter((item) => item.expiresAt > now);
      const nextVfxes = state.combatImpactVfxes.filter((item) => item.expiresAt > now);
      if (nextTexts.length === state.floatingCombatTexts.length && nextVfxes.length === state.combatImpactVfxes.length) {
        return state;
      }
      return {
        floatingCombatTexts: nextTexts,
        combatImpactVfxes: nextVfxes,
      };
    }),
  cleanupExpiredKillFeed: () =>
    set((state) => {
      const now = Date.now();
      const nextKillFeed = state.killFeed.filter((item) => item.expiresAt > now);
      if (nextKillFeed.length === state.killFeed.length) {
        return state;
      }
      return {
        killFeed: nextKillFeed,
      };
    }),
  setScoreboardVisible: (visible) => set({ scoreboardVisible: visible }),
  upsertCombatStatus: (status) =>
    set((state) => {
      const nextStatuses = upsertCombatStatusItem(state.combatStatuses, status);
      return {
        combatStatuses: nextStatuses,
        champions: attachStatusesToChampions(state.champions, nextStatuses),
      };
    }),
  removeCombatStatus: (statusInstanceId, statusId, targetEntityId) =>
    set((state) => {
      const nextStatuses = state.combatStatuses.filter((status) => {
        if (statusInstanceId && status.statusInstanceId === statusInstanceId) {
          return false;
        }
        if (!statusInstanceId && statusId && targetEntityId) {
          return !(status.statusId === statusId && status.targetEntityId === targetEntityId);
        }
        return true;
      });
      if (nextStatuses.length === state.combatStatuses.length) {
        return state;
      }
      return {
        combatStatuses: nextStatuses,
        champions: attachStatusesToChampions(state.champions, nextStatuses),
      };
    }),
  upsertProjectile: (projectile) =>
    set((state) => ({
      projectiles: upsertProjectileItem(state.projectiles, projectile),
    })),
  removeProjectile: (projectileId) =>
    set((state) => ({
      projectiles: state.projectiles.filter((projectile) => projectile.projectileId !== projectileId),
    })),
  upsertArea: (area) =>
    set((state) => ({
      areas: upsertAreaItem(state.areas, area),
    })),
  removeArea: (areaId) =>
    set((state) => ({
      areas: state.areas.filter((area) => area.areaId !== areaId),
    })),
  applyAuthoritativeDisplacement: (championId, position, movementLockedUntil) =>
    set((state) => ({
      champions: state.champions.map((champion) =>
        champion.id !== championId
          ? champion
          : {
              ...champion,
              position: champion.position.clone().set(position.x, position.y, position.z),
              moveTarget: null,
              inputMode: 'idle',
              movementLockedUntil: movementLockedUntil ?? champion.movementLockedUntil,
              idleStartedAt: Date.now(),
            },
      ),
    })),
  setChampionAnimationState: (championId, animationState) =>
    set((state) => ({
      champions: state.champions.map((champion) =>
        champion.id === championId
          ? (champion.animationState === animationState
              ? champion
              : {
                  ...champion,
                  animationState,
                })
          : champion,
      ),
    })),
  setChampionFacingRotation: (championId, rotation) =>
    set((state) => ({
      champions: state.champions.map((champion) =>
        champion.id === championId
          ? { ...champion, rotation }
          : champion,
      ),
    })),
  patchChampionSkillRuntimeState: (championId, slot, patch) =>
    set((state) => ({
      champions: state.champions.map((champion) => {
        if (champion.id !== championId) {
          return champion;
        }
        const currentSkillStates = champion.skillStates ?? createInitialSkillStates();
        const currentSkillState = currentSkillStates[slot] ?? createDefaultSkillRuntimeState(slot);
        return {
          ...champion,
          skillStates: {
            ...currentSkillStates,
            [slot]: {
              ...currentSkillState,
              ...patch,
            },
          },
        };
      }),
    })),
  playChampionAnimationClip: (championId, request) =>
    set((state) => ({
      champions: state.champions.map((champion) =>
        champion.id === championId
          ? (() => {
              const nextRequest = {
                ...request,
                nonce: request.nonce ?? Date.now() + Math.random(),
              };
              const movementLockDurationMs = nextRequest.lockMovement
                ? Math.max(0, nextRequest.movementLockDurationMs ?? 0)
                : 0;
              if (animationClipRequestEquals(champion.animationClipRequest, nextRequest)) {
                return champion;
              }
              return {
                ...champion,
                animationClipRequest: nextRequest,
                moveTarget: request.lockMovement ? null : champion.moveTarget,
                inputMode: request.lockMovement ? 'idle' : champion.inputMode,
                movementLockedUntil: request.lockMovement
                  ? movementLockDurationMs > 0
                    ? Date.now() + movementLockDurationMs
                    : champion.movementLockedUntil
                  : champion.movementLockedUntil,
                idleStartedAt: request.lockMovement ? Date.now() : champion.idleStartedAt,
              };
            })()
          : champion,
      ),
    })),
  clearChampionAnimationClip: (championId) =>
    set((state) => ({
      champions: state.champions.map((champion) =>
        champion.id === championId
          ? {
              ...champion,
              animationClipRequest: null,
              idleStartedAt: champion.moveTarget ? champion.idleStartedAt : Date.now(),
            }
          : champion,
      ),
    })),
  setCameraMode: (mode) =>
    set((state) => ({
      cameraMode: mode,
      isPlayerCameraLocked: mode === 'playerLocked' ? state.isPlayerCameraLocked : false,
    })),
  togglePlayerCameraLock: () =>
    set((state) => ({
      cameraMode: 'playerLocked',
      isPlayerCameraLocked: !state.isPlayerCameraLocked,
    })),
  setPlayerCameraLocked: (locked) =>
    set((state) => ({
      cameraMode: state.cameraMode === 'playerLocked' ? 'playerLocked' : state.cameraMode,
      isPlayerCameraLocked: locked,
    })),
  toggleDirectorMode: () =>
    set((state) => {
      const nextIsDirector = state.cameraMode !== 'directorFree';
      return {
        cameraMode: nextIsDirector ? 'directorFree' as CameraMode : 'playerLocked' as CameraMode,
        isPlayerCameraLocked: nextIsDirector ? false : state.isPlayerCameraLocked,
      };
    }),
  setSpectatorTarget: (championId) =>
    set((state) => {
      if (!championId) {
        return {
          spectatorTargetId: null,
          cameraMode: 'playerLocked' as CameraMode,
          isPlayerCameraLocked: state.isPlayerCameraLocked,
        };
      }

      const target = state.champions.find((champion) => champion.id === championId);
      if (!target) {
        return state;
      }
      const isControlledTarget = target.id === state.multiplayerSession.controlledChampionId;

      return {
        spectatorTargetId: championId,
        cameraMode: isControlledTarget ? 'playerLocked' as CameraMode : 'spectatorFollow' as CameraMode,
        isPlayerCameraLocked: isControlledTarget ? state.isPlayerCameraLocked : false,
      };
    }),
  cycleSpectatorTarget: (direction) => {
    const { champions, spectatorTargetId, multiplayerSession, isPlayerCameraLocked } = get();
    if (champions.length === 0) {
      return;
    }

    const sorted = [...champions].sort((a, b) => a.id.localeCompare(b.id));
    const currentIndex = spectatorTargetId
      ? sorted.findIndex((champion) => champion.id === spectatorTargetId)
      : sorted.findIndex((champion) => champion.id === multiplayerSession.controlledChampionId);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeCurrentIndex + direction + sorted.length) % sorted.length;
    const nextTarget = sorted[nextIndex];
    const isControlledTarget = nextTarget.id === multiplayerSession.controlledChampionId;

    set({
      spectatorTargetId: nextTarget.id,
      cameraMode: isControlledTarget ? 'playerLocked' : 'spectatorFollow',
      isPlayerCameraLocked: isControlledTarget ? isPlayerCameraLocked : false,
    });
  },
  focusControlledChampion: () =>
    set((state) => {
      const me = state.multiplayerSession.controlledChampionId
        ? state.champions.find((champion) => champion.id === state.multiplayerSession.controlledChampionId) ?? null
        : state.champions.find((champion) => champion.isMe) ?? null;
      return {
        spectatorTargetId: me?.id ?? null,
        cameraMode: 'playerLocked' as CameraMode,
        isPlayerCameraLocked: state.isPlayerCameraLocked,
      };
    }),
  toggleWorldCoordinates: () =>
    set((state) => {
      if (!GAME_CONFIG.debug.worldCoordinates.enabled) {
        return state;
      }
      return {
        showWorldCoordinates: !state.showWorldCoordinates,
      };
    }),
  toggleDebugFreeCamera: () =>
    set((state) => {
      if (!GAME_CONFIG.debug.freeCamera.enabled) {
        return state;
      }
      return {
        debugFreeCamera: !state.debugFreeCamera,
      };
    }),
  toggleDebugHitboxes: () =>
    set((state) => ({
      debugHitboxes: !state.debugHitboxes,
    })),
  setChampionMoveTarget: (championId, target, inputMode = 'mouse') =>
    set((state) => ({
      champions: state.champions.map((champion) =>
        champion.id !== championId
          ? champion
          : (() => {
              const now = Date.now();
              const nextTarget = target && isWithinPlayableBounds(target)
                ? target.clone().setY(0)
                : null;
              const isLocked = champion.movementLockedUntil > now;

              return {
                ...champion,
                moveTarget: isLocked ? null : nextTarget,
                attackMoveTarget: null,
                currentAttackTargetId: null,
                currentAttackTargetType: null,
                inputMode: isLocked ? 'idle' : nextTarget ? inputMode : 'idle',
                animationState: isLocked
                  ? champion.animationState
                  : nextTarget
                    ? 'run'
                    : champion.isDead
                      ? 'death'
                      : 'idle',
                idleStartedAt: nextTarget ? champion.idleStartedAt : now,
              };
            })(),
      ),
    })),
  showMoveIndicator: (position) =>
    set({
      moveIndicator: {
        position: position.clone(),
        createdAt: Date.now(),
        expiresAt: Date.now() + GAME_CONFIG.input.rightClickIndicator.durationMs,
      },
    }),
  stopChampion: (championId) =>
    set((state) => ({
      champions: state.champions.map((champion) =>
        champion.id === championId
          ? {
              ...champion,
              moveTarget: null,
              attackMoveTarget: null,
              currentAttackTargetId: null,
              currentAttackTargetType: null,
              inputMode: 'idle',
              animationState: champion.isDead ? 'death' : 'idle',
              idleStartedAt: Date.now(),
            }
          : champion,
      ),
    })),
  triggerChampionEmote: (championId, emoteId, durationMs = 1800) =>
    set((state) => {
      const champion = state.champions.find((item) => item.id === championId);
      if (!champion) {
        return state;
      }

      const now = Date.now();
      const duplicatedEmote = state.activeEmotes.some((item) =>
        item.championId === championId
        && item.emoteId === emoteId
        && now - item.createdAt <= 250,
      );
      if (duplicatedEmote) {
        return state;
      }
      return {
        activeEmotes: [
          ...state.activeEmotes,
          {
            id: `${championId}_${emoteId}_${now}`,
            championId,
            playerName: champion.playerName,
            emoteId,
            createdAt: now,
            expiresAt: now + durationMs,
            isMe: champion.isMe,
          },
        ],
      };
    }),
  setChampionVoiceRequest: (championId, request) =>
    set((state) => ({
      champions: state.champions.map((champion) =>
        champion.id === championId
          ? (voicePlaybackRequestEquals(champion.lastVoiceRequest, request)
              ? champion
              : {
                  ...champion,
                  lastVoiceRequest: request,
                })
          : champion,
      ),
    })),
  cleanupExpiredEmotes: () =>
    set((state) => {
      const now = Date.now();
      const next = state.activeEmotes.filter((item) => item.expiresAt > now);
      if (next.length === state.activeEmotes.length) {
        return state;
      }
      return {
        activeEmotes: next,
      };
    }),
  enterSpellAim: (aimState) => set({
    spellAimState: {
      ...aimState,
      targetRules: aimState.targetRules ?? null,
      cursorWorldPosition: aimState.cursorWorldPosition ?? null,
      targetPoint: aimState.targetPoint ?? null,
      targetDirection: aimState.targetDirection ?? null,
      hoveredTargetEntityId: aimState.hoveredTargetEntityId ?? null,
      hoveredTargetAllowed: aimState.hoveredTargetAllowed ?? null,
      targetEntityId: aimState.targetEntityId ?? null,
    },
  }),
  updateSpellAim: (patch) =>
    set((state) => {
      if (!state.spellAimState) {
        return state;
      }
      if (!spellAimPatchChanged(state.spellAimState, patch)) {
        return state;
      }
      return {
        spellAimState: {
          ...state.spellAimState,
          ...patch,
        },
      };
    }),
  exitSpellAim: () => set({ spellAimState: null }),
  registerLocalSpellPrediction: (prediction) =>
    set((state) => ({
      localSpellPredictions: {
        ...state.localSpellPredictions,
        [prediction.requestId]: prediction,
      },
    })),
  acceptLocalSpellPrediction: (requestId, castInstanceId = null) =>
    set((state) => {
      const currentPrediction = state.localSpellPredictions[requestId];
      if (!currentPrediction) {
        return state;
      }
      return {
        localSpellPredictions: {
          ...state.localSpellPredictions,
          [requestId]: {
            ...currentPrediction,
            castInstanceId,
            status: 'accepted',
          },
        },
      };
    }),
  markLocalSpellPredictionStarted: (castInstanceId) =>
    set((state) => {
      const matchedEntry = Object.entries(state.localSpellPredictions)
        .find(([, prediction]) => prediction.castInstanceId === castInstanceId);
      if (!matchedEntry) {
        return state;
      }
      const [requestId, prediction] = matchedEntry;
      return {
        localSpellPredictions: {
          ...state.localSpellPredictions,
          [requestId]: {
            ...prediction,
            status: 'started',
          },
        },
      };
    }),
  findLocalSpellPredictionByRequestId: (requestId) => get().localSpellPredictions[requestId] ?? null,
  findLocalSpellPredictionByCastInstanceId: (castInstanceId) =>
    Object.values(get().localSpellPredictions)
      .find((prediction) => prediction.castInstanceId === castInstanceId) ?? null,
  clearLocalSpellPredictionByRequestId: (requestId) =>
    set((state) => {
      if (!state.localSpellPredictions[requestId]) {
        return state;
      }
      const nextPredictions = { ...state.localSpellPredictions };
      delete nextPredictions[requestId];
      return {
        localSpellPredictions: nextPredictions,
      };
    }),
  clearLocalSpellPredictionByCastInstanceId: (castInstanceId) =>
    set((state) => {
      const matchedEntry = Object.entries(state.localSpellPredictions)
        .find(([, prediction]) => prediction.castInstanceId === castInstanceId);
      if (!matchedEntry) {
        return state;
      }
      const nextPredictions = { ...state.localSpellPredictions };
      delete nextPredictions[matchedEntry[0]];
      return {
        localSpellPredictions: nextPredictions,
      };
    }),
  tickMovement: (delta) =>
    set((state) => {
      /* ══════════════════════════════════════════════════════════════════
       * 联机模式：tickMovement 为 no-op。
       * 所有英雄的位置、朝向、animationState（含 idle→standby 轮转）
       * 均由 mapServerChampionToLocal（快照映射层）一次性决定，
       * 此处不再写入 champions，彻底消除与快照层的双重驱动冲突。
       * ═══════════════════════════════════════════════════════════════ */
      if (GAME_CONFIG.multiplayer.enabled) {
        return {};
      }

      /* ========== 单机模式：保留完整的本地位置推进逻辑 ========== */
      return {
        champions: state.champions.map((champion) => {
          if (champion.movementLockedUntil > Date.now()) {
            return {
              ...champion,
              moveTarget: null,
              inputMode: 'idle',
            };
          }

          if (champion.isDead || !champion.moveTarget) {
            if (champion.isDead) {
              return champion.animationState === 'death'
                ? champion
                : { ...champion, animationState: 'death', inputMode: 'idle' };
            }

            const standbyDelay = getChampionStandbyDelay(champion.heroId);
            const nextAnimationState = Date.now() - champion.idleStartedAt >= standbyDelay ? 'standby' : 'idle';

            return champion.animationState !== nextAnimationState || champion.inputMode !== 'idle'
              ? { ...champion, animationState: nextAnimationState, inputMode: 'idle' }
              : champion;
          }

          if (!isWithinPlayableBounds(champion.moveTarget)) {
            return {
              ...champion,
              moveTarget: null,
              animationState: champion.isDead ? 'death' : 'idle',
              inputMode: 'idle',
              idleStartedAt: Date.now(),
            };
          }

          TEMP_DIRECTION.copy(champion.moveTarget).sub(champion.position);
          const distance = TEMP_DIRECTION.length();

          if (distance <= 0.08) {
            return {
              ...champion,
              position: champion.moveTarget.clone(),
              moveTarget: null,
              animationState: 'idle',
              inputMode: 'idle',
              idleStartedAt: Date.now(),
            };
          }

          const speed = getChampionSpeed(champion.heroId) / 100;
          const step = Math.min(distance, speed * delta);
          const direction = TEMP_DIRECTION.normalize();
          const nextPosition = clampToBattlefield(champion.position.clone().add(direction.clone().multiplyScalar(step)));
          const desiredRotation = Math.atan2(direction.x, direction.z);
          const rotationDelta = getShortestAngleDelta(champion.rotation, desiredRotation);
          const rotation = champion.rotation + rotationDelta * Math.min(1, delta * ROTATION_LERP_SPEED);

          if (nextPosition.distanceToSquared(champion.position) <= 0.000001) {
            return {
              ...champion,
              moveTarget: null,
              animationState: 'idle',
              inputMode: 'idle',
              idleStartedAt: Date.now(),
            };
          }

          return {
            ...champion,
            position: nextPosition,
            rotation,
            animationState: 'run',
            inputMode: 'mouse',
            idleStartedAt: champion.idleStartedAt,
          };
        }),
      };
    }),
  initGameState: () =>
    set((state) => ({
      gameTimer: 0,
      blueKills: 0,
      redKills: 0,
      champions: createInitialChampions(),
      minions: createInitialMinions(),
      towers: createInitialTowers(),
      nexuses: createInitialNexuses(),
      inhibitors: createInitialInhibitors(),
      healthRelics: createInitialRelics(),
      activeEmotes: [],
      moveIndicator: null,
      cameraMode: 'playerLocked',
      isPlayerCameraLocked: GAME_CONFIG.camera.defaultLocked,
      spectatorTargetId: null,
      showWorldCoordinates: GAME_CONFIG.debug.worldCoordinates.enabled,
      debugFreeCamera: GAME_CONFIG.debug.freeCamera.enabled,
      debugHitboxes: false,
      multiplayerSession: state.multiplayerSession,
      projectiles: [],
      areas: [],
      combatStatuses: [],
      floatingCombatTexts: [],
      combatImpactVfxes: [],
      killFeed: [],
      scoreboardVisible: false,
      spellAimState: null,
      localSpellPredictions: {},
    })),
  updateGameTimer: (delta) =>
    set((state) => ({ gameTimer: state.gameTimer + delta })),
  setHeroSkillsMeta: (championId, skills) =>
    set((state) => ({
      heroSkillsMeta: { ...state.heroSkillsMeta, [championId]: skills },
    })),
  setHeroSkillCastDefs: (defs) =>
    set((state) => ({
      heroSkillCastDefs: { ...state.heroSkillCastDefs, ...defs },
    })),
  setSummonerSpellsMeta: (spells) =>
    set({ summonerSpellsMeta: spells }),
  setChampionSummonerSpells: (championId, spell1, spell2) =>
    set((state) => ({
      championSummonerSpells: { ...state.championSummonerSpells, [championId]: { spell1, spell2 } },
    })),
  setChampionAvatarUrl: (championId, avatarUrl) =>
    set((state) => ({
      championAvatarUrls: { ...state.championAvatarUrls, [championId]: avatarUrl },
    })),
  toggleSmartCast: () =>
    set((state) => ({ smartCastEnabled: !state.smartCastEnabled })),
  setSmartCastEnabled: (enabled) =>
    set({ smartCastEnabled: enabled }),
  setLastMouseWorldPosition: (position) =>
    set((state) => {
      if (serializedVectorEquals(state.lastMouseWorldPosition, position)) {
        return state;
      }
      return { lastMouseWorldPosition: position };
    }),
}));
