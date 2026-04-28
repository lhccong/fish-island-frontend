import * as THREE from 'three';

/** 队伍 */
export type Team = 'blue' | 'red';

/** 英雄职业 */
export type HeroRole = 'tank' | 'fighter' | 'mage' | 'marksman' | 'support';

/** 动画状态 */
export type AnimationState = 'idle' | 'standby' | 'run' | 'attack' | 'cast' | 'death';

/** 可配置动作槽位 */
export type HeroActionSlot = 'basicAttack' | 'q' | 'w' | 'e' | 'r' | 'recall';

/** 正式技能系统使用的统一技能槽位。 */
export type SpellSlot = 'passive' | 'basicAttack' | 'q' | 'w' | 'e' | 'r' | 'summonerD' | 'summonerF' | 'recall';

/** 英雄语音槽位。 */
export type HeroVoiceSlot = HeroActionSlot | 'idle';

/** 镜头模式 */
export type CameraMode = 'playerLocked' | 'directorFree' | 'spectatorFollow';

/** 表情标识。
 * 使用字符串而非固定联合类型，便于在配置中直接新增、替换或删除自定义表情。
 */
export type EmoteId = string;

/** 防御塔类型。 */
export type TowerType = 'outer' | 'inner' | 'nexusGuard';

/** 输入来源 */
export type InputMode = 'idle' | 'mouse';

/** 联机连接状态。 */
export type MultiplayerConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

/** 联机传输层模式（已统一为 Socket.IO）。 */
export type MultiplayerTransportMode = 'socketio';

/** 服务器下发给客户端的动作语音槽位。 */
export type VoicePlaybackSlot = HeroVoiceSlot | 'customWheel';

/** 原始动画直切请求 */
export interface AnimationClipRequest {
  /** 需要直接播放的动画片段名。 */
  clipName: string;
  /** 是否循环播放该片段。 */
  loop?: boolean;
  /** 动画播放速率倍率，1 为原速，2 为两倍速，0.5 为半速。 */
  playbackRate?: number;
  /** 是否在播放前重置片段时间。 */
  reset?: boolean;
  /** 本次动作预计持续时长，单位毫秒。 */
  durationMs?: number;
  /** 动作期间是否锁定角色移动。 */
  lockMovement?: boolean;
  /** 动作期间显式锁定移动的时长，单位毫秒。 */
  movementLockDurationMs?: number;
  /** 片段播放结束后回落到的标准动画状态。 */
  fallbackState?: AnimationState;
  /** 本次动作对应的业务动作槽位。 */
  actionSlot?: HeroActionSlot;
  /** 用于强制触发响应的随机请求标记。 */
  nonce?: number;
}

/** 联机同步用的可序列化动画请求。 */
export interface SerializedAnimationClipRequest {
  /** 需要直接播放的动画片段名。 */
  clipName: string;
  /** 是否循环播放该片段。 */
  loop?: boolean;
  /** 动画播放速率倍率。 */
  playbackRate?: number;
  /** 是否在播放前重置片段时间。 */
  reset?: boolean;
  /** 本次动作预计持续时长，单位毫秒。 */
  durationMs?: number;
  /** 动作期间是否锁定角色移动。 */
  lockMovement?: boolean;
  /** 动作期间显式锁定移动的时长，单位毫秒。 */
  movementLockDurationMs?: number;
  /** 片段播放结束后回落到的标准动画状态。 */
  fallbackState?: AnimationState;
  /** 本次动作对应的业务动作槽位。 */
  actionSlot?: HeroActionSlot;
  /** 用于强制触发响应的随机请求标记。 */
  nonce?: number;
}

/** 英雄语音配置。 */
export interface HeroVoiceConfig {
  /** 基础普攻语音列表。 */
  basicAttack?: string[];
  /** Q 技能语音列表。 */
  q?: string[];
  /** W 技能语音列表。 */
  w?: string[];
  /** E 技能语音列表。 */
  e?: string[];
  /** R 技能语音列表。 */
  r?: string[];
  /** 回城语音列表。 */
  recall?: string[];
  /** 角色静止时的待机语音列表（已禁用自动调度，仅保留字段兼容性）。 */
  idle?: string[];
  /** 英雄语音播放音量，范围 0-1。 */
  volume?: number;
  /** T轮盘自定义语音列表，每项包含标签、图标和语音URL。 */
  customWheel?: HeroWheelVoice[];
}

/** 英雄T轮盘自定义语音项。 */
export interface HeroWheelVoice {
  /** 语音唯一标识。 */
  id: string;
  /** 显示标签。 */
  label: string;
  /** 显示用 emoji。 */
  emoji: string;
  /** 语音资源 URL 列表（随机播放）。 */
  voiceUrls: string[];
  /** 语音播放音量，范围 0-1。 */
  voiceVolume?: number;
}

/** 设施动画配置。 */
export interface FacilityAnimationConfig {
  /** 设施待机动画片段名。 */
  idleClip?: string;
  /** 设施小破动画片段名（血量 33%~66%）。 */
  damagedClip?: string;
  /** 设施大破动画片段名（血量 1%~33%）。 */
  criticalClip?: string;
  /** 设施死亡/销毁动画片段名。 */
  deathClip?: string;
}

/** 设施模型配置。 */
export interface FacilityModelConfig {
  /** 设施模型资源路径，可为本地路径或网络 URL。 */
  modelPath?: string;
  /** 设施模型标准化目标高度。 */
  targetHeight: number;
  /** 模型相对统一基准高度的尺寸倍率。 */
  modelScale?: number;
  /** 模型完成归一化后的额外落地偏移量。 */
  groundOffsetY?: number;
  /** 模型绕 Y 轴的旋转角度，单位弧度。 */
  rotationY?: number;
  /** 设施动画片段配置。 */
  animations?: FacilityAnimationConfig;
}

/** 英雄头顶 HUD 挂点配置。 */
export interface HeroOverheadConfig {
  /** 头顶血条 sprite 的 Y 轴挂点。 */
  hpSpritePositionY?: number;
  /** 头顶血条 sprite 的缩放尺寸。 */
  hpSpriteScale?: [number, number, number];
  /** 表情 sprite 的 Y 轴挂点。 */
  emoteSpritePositionY?: number;
  /** 表情 sprite 的缩放尺寸。 */
  emoteSpriteScale?: [number, number, number];
}

/** 英雄动画配置。 */
export interface HeroAnimationConfig {
  /** 标准状态到候选动画片段名列表的别名映射。 */
  stateAliases?: Partial<Record<AnimationState, string[]>>;
  /** 标准状态优先使用的片段名映射。 */
  stateClips?: Partial<Record<AnimationState, string>>;
  /** 动作槽位到片段名的映射。 */
  actionClips?: Partial<Record<HeroActionSlot, string>>;
  /** 动作槽位到动画播放速率倍率的映射。 */
  actionPlaybackRates?: Partial<Record<HeroActionSlot, number>>;
  /** 动作槽位到预估动作时长的映射，单位毫秒。 */
  actionDurationsMs?: Partial<Record<HeroActionSlot, number>>;
  /** 动作槽位到是否锁定移动的映射。 */
  actionMovementLocks?: Partial<Record<HeroActionSlot, boolean>>;
  /** 角色停止移动后切换到待机状态所需的静止时长，单位毫秒。 */
  standbyDelayMs?: number;
}

/** 英雄资源配置。 */
export interface HeroAssetConfig {
  /** 当前资源配置对应的展示名称。 */
  label: string;
  /** 英雄模型资源路径，可为本地路径或网络 URL。 */
  modelPath: string;
  /** 贴图资源基础目录，可为本地路径或网络 URL。 */
  textureBasePath?: string;
  /** 模型相对统一英雄基准高度的尺寸倍率。 */
  modelScale?: number;
  /** 模型完成归一化后额外施加的落地偏移量。 */
  groundOffsetY?: number;
  /** 该英雄的动画映射与动作配置。 */
  animations: HeroAnimationConfig;
  /** 英雄语音配置。 */
  voices?: HeroVoiceConfig;
  /** 该英雄的头顶 HUD 挂点配置。 */
  overhead?: HeroOverheadConfig;
}

/** 英雄配置。 */
export interface HeroConfig {
  /** 英雄唯一标识。 */
  heroId: string;
  /** 英雄中文名称。 */
  name: string;
  /** 英雄英文名称。 */
  nameEn: string;
  /** 用于 UI 展示的 emoji 图标。 */
  emoji: string;
  /** 英雄职业类型。 */
  role: HeroRole;
  /** 基础生命值。 */
  baseHp: number;
  /** 基础法力值。 */
  baseMp: number;
  /** 基础物理攻击力。 */
  baseAd: number;
  /** 基础法术强度。 */
  baseAp: number;
  /** 基础护甲。 */
  baseArmor: number;
  /** 基础魔法抗性。 */
  baseMr: number;
  /** 基础移动速度。 */
  moveSpeed: number;
  /** 基础攻击距离。 */
  attackRange: number;
  /** 基础攻击速度。 */
  attackSpeed: number;
  /** 默认模型路径。 */
  modelPath?: string;
  /** 默认贴图路径。 */
  texturePath?: string;
  /** 该英雄的完整资源配置。 */
  asset?: HeroAssetConfig;
  /** 程序化降级模型的主体颜色。 */
  bodyColor: number;
  /** 程序化降级模型的强调颜色。 */
  accentColor: number;
}

/** 对局阵容中的单个英雄实例配置。 */
export interface HeroLineupConfig {
  /** 所属队伍。 */
  team: Team;
  /** 该出场位使用的英雄 ID。 */
  heroId: string;
  /** 当前实例想使用的皮肤名。 */
  skin?: string;
  /** 当前实例展示给玩家的名称。 */
  playerName: string;
  /** 是否为本地玩家默认控制的实例。 */
  isControlled?: boolean;
}

/** 表情定义项。 */
export interface EmoteDefinition {
  /** 表情唯一标识。 */
  id: EmoteId;
  /** 表情显示用 emoji。 */
  emoji: string;
  /** 表情名称。 */
  label: string;
  /** 表情主色。 */
  color: string;
  /** 表情强调色。 */
  accent: string;
  /** 该表情触发时可随机播放的自定义语音资源列表。 */
  voiceUrls?: string[];
  /** 该表情语音的播放音量，范围 0-1。 */
  voiceVolume?: number;
}

/** 模型显示状态。 */
export type ModelVisualState = 'idle' | 'loading' | 'ready' | 'fallback' | 'error';

/** 运行时三维坐标的可序列化结构。 */
export interface SerializedVector3 {
  /** X 坐标。 */
  x: number;
  /** Y 坐标。 */
  y: number;
  /** Z 坐标。 */
  z: number;
}

/** 语音播放同步请求。 */
export interface VoicePlaybackRequest {
  /** 语音请求唯一 nonce，用于强制触发远端播放。 */
  nonce: number;
  /** 语音槽位。 */
  slot: VoicePlaybackSlot;
  /** 若为自定义语音，则标记自定义语音项 ID。 */
  customVoiceId?: string;
  /** 若已选定具体资源，则直接携带 URL，方便所有客户端播放同一条。 */
  voiceUrl?: string;
  /** 播放音量，范围 0-1。 */
  volume?: number;
}

/** 运行时英雄状态 */
export interface ChampionState {
  /** 运行时角色实例 ID。 */
  id: string;
  /** 对应的英雄配置 ID。 */
  heroId: string;
  /** 当前实例使用的皮肤名；仅影响模型路径解析，不改变英雄基础数值。 */
  skin?: string;
  /** 后端下发的英雄模型 URL（优先于前端本地配置）。 */
  modelUrl?: string;
  /** 玩家展示名称。 */
  playerName: string;
  /** 所属队伍。 */
  team: Team;
  /** 当前世界坐标。 */
  position: THREE.Vector3;
  /** 当前朝向角度，单位弧度。 */
  rotation: number;
  /** 当前生命值。 */
  hp: number;
  /** 最大生命值。 */
  maxHp: number;
  /** 当前法力值。 */
  mp: number;
  /** 最大法力值。 */
  maxMp: number;
  /** 当前等级。 */
  level: number;
  /** 击杀数。 */
  kills: number;
  /** 死亡数。 */
  deaths: number;
  /** 助攻数。 */
  assists: number;
  /** 是否处于死亡状态。 */
  isDead: boolean;
  /** 复活剩余计时，单位秒。 */
  respawnTimer: number;
  /** 当前标准动画状态。 */
  animationState: AnimationState;
  /** 当前待消费的直接动画请求。 */
  animationClipRequest: AnimationClipRequest | null;
  /** 是否为本地玩家控制的角色。 */
  isMe: boolean;
  /** 服务端权威移动速度（世界单位/秒）。 */
  moveSpeed: number;
  /** 当前移动目标点。 */
  moveTarget: THREE.Vector3 | null;
  /** 当前输入来源。 */
  inputMode: InputMode;
  /** 移动锁定结束时间戳，毫秒。 */
  movementLockedUntil: number;
  /** 最近一次进入静止状态的时间戳，毫秒。 */
  idleStartedAt: number;
  /** 最近一次发送的语音请求。 */
  lastVoiceRequest: VoicePlaybackRequest | null;
  /** 当前护盾值。 */
  shield: number;
  /** 当前流值或特殊资源值。 */
  flowValue: number;
  /** 当前技能运行时状态表。 */
  skillStates: Record<SpellSlot, SkillRuntimeState>;
  /** 当前可见状态列表。 */
  statusEffects: StatusEffectViewState[];
  /** 当前正在执行的技能实例 ID。 */
  activeCastInstanceId: string | null;
  /** 当前技能阶段。 */
  activeCastPhase: SpellCastPhase;
  /** 基础物理攻击力。 */
  baseAd?: number;
  /** 基础法术强度。 */
  baseAp?: number;
  /** 基础护甲。 */
  baseArmor?: number;
  /** 基础魔法抗性。 */
  baseMr?: number;
  /** 基础攻击距离。 */
  attackRange?: number;
  /** 基础攻击速度。 */
  attackSpeed?: number;
}

/** 联机快照 */
export interface MultiplayerSnapshot {
  /** 快照序号。 */
  sequence: number;
  /** 快照时间戳，毫秒。 */
  timestamp: number;
  /** 当前对局已进行时间，单位秒。 */
  gameTimer: number;
  /** 蓝队总击杀数。 */
  blueKills: number;
  /** 红队总击杀数。 */
  redKills: number;
  /** 全部英雄实例状态。 */
  champions: ChampionState[];
  minions: MinionState[];
  /** 当前仍在展示中的表情状态。 */
  activeEmotes: ActiveEmoteState[];
  createdAt: number;
  /** 指示器过期时间戳。 */
  expiresAt: number;
}

/** 正式战斗快照中的英雄实体状态。 */
export interface CombatSnapshotChampion {
  /** 英雄实例 ID。 */
  id: string;
  /** 英雄配置 ID。 */
  heroId: string;
  /** 当前皮肤名。 */
  skin?: string;
  /** 玩家展示名称。 */
  playerName: string;
  /** 所属队伍。 */
  team: Team;
  /** 世界坐标。 */
  position: SerializedVector3;
  /** 朝向角度。 */
  rotation: number;
  /** 当前生命值。 */
  hp: number;
  /** 最大生命值。 */
  maxHp: number;
  /** 当前法力值。 */
  mp: number;
  /** 最大法力值。 */
  maxMp: number;
  /** 当前移动目标点。 */
  moveTarget: SerializedVector3 | null;
  /** 当前标准动画状态。 */
  animationState: AnimationState;
  /** 当前是否死亡。 */
  dead: boolean;
  /** 当前护盾值。 */
  shield?: number;
  /** 当前流值或特殊资源值。 */
  flowValue?: number;
  /** 当前技能运行时状态表。 */
  skillStates?: Partial<Record<SpellSlot, SkillRuntimeState>>;
  /** 当前正在执行的技能实例 ID。 */
  activeCastInstanceId?: string | null;
  /** 当前技能阶段。 */
  activeCastPhase?: SpellCastPhase;
  /** 当前移动锁定结束时间戳。 */
  movementLockedUntil?: number;
  /** 最近一次进入静止状态的时间戳。 */
  idleStartedAt?: number;
}

/** 正式战斗快照。 */
export interface CombatSnapshot {
  /** 事件唯一 ID。 */
  eventId: string;
  /** 服务端序号。 */
  sequence: number;
  /** 房间 ID。 */
  roomId: string;
  /** 服务端时间戳。 */
  serverTime: number;
  /** 逻辑帧号。 */
  frame: number;
  /** 当前对局总时长。 */
  gameTimer: number;
  /** 英雄实体状态列表。 */
  entities: CombatSnapshotChampion[];
  /** 玩家会话列表。 */
  players?: Array<{
    sessionId: string;
    playerName: string;
    championId: string | null;
    spectator: boolean;
  }>;
  minions?: MinionState[];
  /** 投射物列表。 */
  projectiles: ProjectilePresentationState[];
  /** 区域体列表。 */
  areas: AreaPresentationState[];
  /** 状态列表。 */
  statuses: StatusEffectViewState[];
}

/** 小兵状态 */
export interface MinionState {
  id: string;
  team: Team;
  lane: string;
  minionType: string;
  position: THREE.Vector3;
  rotation: number;
  hp: number;
  maxHp: number;
  moveSpeed: number;
  isDead: boolean;
  animationState: AnimationState;
  targetEntityId?: string | null;
  targetType?: 'minion' | 'champion' | 'structure' | null;
  /** 小兵 3D 模型 CDN 地址（后端下发）。 */
  modelUrl?: string | null;
}

/** 防御塔状态 */
export interface TowerState {
  /** 防御塔实例 ID。 */
  id: string;
  /** 所属队伍。 */
  team: Team;
  /** 世界坐标。 */
  position: THREE.Vector3;
  /** 当前生命值。 */
  hp: number;
  /** 最大生命值。 */
  maxHp: number;
  /** 是否已被摧毁。 */
  isDestroyed: boolean;
  /** 防御塔类型。 */
  type: TowerType;
  /** 攻击范围（来自后端快照，用于攻击范围指示器渲染）。 */
  attackRange?: number;
  /** 当前攻击目标实体 ID（来自后端快照，用于弹道渲染）。 */
  targetEntityId?: string | null;
}

/** 水晶枢纽状态 */
export interface NexusState {
  /** 水晶枢纽实例 ID。 */
  id: string;
  /** 所属队伍。 */
  team: Team;
  /** 世界坐标。 */
  position: THREE.Vector3;
  /** 当前生命值。 */
  hp: number;
  /** 最大生命值。 */
  maxHp: number;
  /** 是否已被摧毁。 */
  isDestroyed: boolean;
}

/** 小水晶（兵营水晶 / Inhibitor）状态 */
export interface InhibitorState {
  /** 小水晶实例 ID。 */
  id: string;
  /** 所属队伍。 */
  team: Team;
  /** 世界坐标。 */
  position: THREE.Vector3;
  /** 当前生命值。 */
  hp: number;
  /** 最大生命值。 */
  maxHp: number;
  /** 是否已被摧毁。 */
  isDestroyed: boolean;
}

/** 生命遗迹状态 */
export interface HealthRelicState {
  /** 遗迹实例 ID。 */
  id: string;
  /** 世界坐标。 */
  position: THREE.Vector3;
  /** 当前是否可拾取。 */
  isAvailable: boolean;
  /** 重新刷新剩余计时，单位秒。 */
  respawnTimer: number;
}

/** 当前场景中激活的表情状态。 */
export interface ActiveEmoteState {
  /** 表情实例 ID。 */
  id: string;
  /** 触发表情的角色 ID。 */
  championId: string;
  /** 触发表情的玩家名称。 */
  playerName: string;
  /** 表情类型 ID。 */
  emoteId: EmoteId;
  /** 创建时间戳。 */
  createdAt: number;
  /** 过期时间戳。 */
  expiresAt: number;
  /** 是否来自本地玩家。 */
  isMe: boolean;
}

/** 当前激活的移动指示器状态。 */
export interface MoveIndicatorState {
  /** 指示器世界坐标。 */
  position: THREE.Vector3;
  /** 指示器创建时间戳。 */
  createdAt: number;
  /** 指示器过期时间戳。 */
  expiresAt: number;
}

/** 地图配置 */
export interface MapConfig {
  /** 地图整体宽度。 */
  width: number;
  /** 地图整体纵深。 */
  depth: number;
  /** 中央桥面的有效宽度（最窄处）。 */
  bridgeWidth: number;
  /** 中央桥面的有效长度。 */
  bridgeLength: number;
  /** 可行走区域边界。 */
  playableBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** 防御塔布局列表。 */
  towers: { position: [number, number, number]; team: Team; type: TowerType }[];
  /** 水晶枢纽布局列表。 */
  nexuses: { position: [number, number, number]; team: Team }[];
  /** 生命遗迹布局列表。 */
  healthRelics: { position: [number, number, number] }[];
  /** 小水晶（兵营水晶 / Inhibitor）布局列表。 */
  inhibitors: { position: [number, number, number]; team: Team }[];
  /** 双方初始编队坐标列表。 */
  spawnLayouts: { blue: [number, number, number][]; red: [number, number, number][] };
}

/** 游戏全局状态 */
export interface GameState {
  /** 当前对局已进行时间，单位秒。 */
  gameTimer: number;
  /** 蓝队总击杀数。 */
  blueKills: number;
  /** 红队总击杀数。 */
  redKills: number;
  /** 全部英雄实例状态。 */
  champions: ChampionState[];
  minions: MinionState[];
  /** 全部防御塔状态。 */
  towers: TowerState[];
  /** 全部水晶枢纽状态。 */
  nexuses: NexusState[];
  /** 全部小水晶（兵营水晶 / Inhibitor）状态。 */
  inhibitors: InhibitorState[];
  /** 全部生命遗迹状态。 */
  healthRelics: HealthRelicState[];
  /** 当前仍在展示中的表情状态。 */
  activeEmotes: ActiveEmoteState[];
  /** 当前右键移动指示器状态。 */
  moveIndicator: MoveIndicatorState | null;
  /** 当前镜头模式。 */
  cameraMode: CameraMode;
  /** 玩家模式下镜头是否锁定跟随本地玩家。 */
  isPlayerCameraLocked: boolean;
  /** 当前导播锁定的目标角色 ID。 */
  spectatorTargetId: string | null;
  /** 是否显示世界坐标调试标签。 */
  showWorldCoordinates: boolean;
}

/** 玩家控制权分配信息。 */
export interface PlayerSessionAssignment {
  /** socket 会话 ID。 */
  socketId: string;
  /** 玩家显示名称。 */
  playerName: string;
  /** 当前分配到的英雄实例 ID。 */
  championId: string | null;
  /** 当前分配到的队伍。 */
  team: Team | null;
  /** 当前是否处于仅观战状态。 */
  isSpectator: boolean;
}

/** 联机诊断状态。 */
export interface MultiplayerDiagnosticsState {
  /** 当前是否启用了联机模式。 */
  enabled: boolean;
  /** 当前渲染帧率。 */
  fps: number;
  /** 最近一次收到的快照序号。 */
  lastReceivedSequence: number;
  /** 最近一次真正应用到状态树的快照序号。 */
  lastAppliedSequence: number;
  /** 因乱序或重复被丢弃的旧快照数量。 */
  droppedSnapshotCount: number;
  snapshotArrivalCount: number;
  /** 最近一次收到快照时的本地时间戳。 */
  lastSnapshotReceivedAt: number | null;
  /** 最近一次快照携带的服务端时间戳。 */
  lastSnapshotServerTime: number | null;
  /** 当前估算的快照到达延迟，单位毫秒。 */
  snapshotLatencyMs: number | null;
  rttMs: number | null;
  /** 当前记录中的快照缓冲数量。 */
  bufferedSnapshotCount: number;
  /** 当前渲染平滑延迟配置，单位毫秒。 */
  renderDelayMs: number;
  lastSentMoveSequence: number;
  lastAckedMoveSequence: number;
  lastMoveCommandSentAt: number | null;
  lastMoveCommandAckAt: number | null;
  pingSampleCount: number;
  timedOutPingCount: number;
  pingTimeoutRatePercent: number;
  snapshotDiscardRatePercent: number;
  networkAnomalyPercent: number;
}

/** 客户端本地联机会话状态。 */
export interface MultiplayerSessionState {
  /** 当前是否启用联机模式。 */
  enabled: boolean;
  /** 连接状态。 */
  status: MultiplayerConnectionStatus;
  /** 当前 socket 会话 ID。 */
  socketId: string | null;
  /** 当前房间 ID。 */
  roomId: string | null;
  /** 当前受控英雄实例 ID。 */
  controlledChampionId: string | null;
  /** 当前分配到的队伍。 */
  assignedTeam: Team | null;
  /** 当前错误信息。 */
  errorMessage: string | null;
  /** 房间内所有在线玩家分配信息。 */
  players: PlayerSessionAssignment[];
  /** 当前是否已完成入房。 */
  hasJoinedRoom: boolean;
  /** 联机诊断状态。 */
  diagnostics: MultiplayerDiagnosticsState;
}

/** 联机同步使用的右键移动输入。 */
export interface MoveCommandPayload {
  /** 当前受控英雄实例 ID。 */
  championId: string;
  /**
   * 旧 Socket.IO 演示链路使用的目标点字段。
   * 传 null 表示停止移动。
   */
  target?: SerializedVector3 | null;
  /**
   * 正式 Netty WebSocket 战斗链路使用的目标点字段。
   * 传 null 表示停止移动。
   */
  targetPoint?: SerializedVector3 | null;
  /** 当前输入来源。 */
  inputMode?: InputMode;
  clientMoveSequence?: number;
  clientTimestamp?: number;
}

/** 正式技能施法输入。 */
export interface CastSpellCommandPayload {
  /** 请求唯一 ID。 */
  requestId: string;
  /** 当前房间 ID。 */
  roomId: string | null;
  /** 当前施法者英雄实例 ID。 */
  casterId: string;
  /** 当前技能槽位。 */
  slot: SpellSlot;
  /** 当前技能定义 ID。 */
  skillId?: string;
  /** 目标实体 ID。 */
  targetEntityId?: string;
  /** 目标点。 */
  targetPoint?: SerializedVector3 | null;
  /** 目标方向。 */
  targetDirection?: SerializedVector3 | null;
  /** 客户端移动序列号（锁移动施法时用于与停止语义对账）。 */
  clientMoveSequence?: number;
  /** 客户端时间戳。 */
  clientTimestamp: number;
  /** 额外上下文。 */
  extraContext?: Record<string, unknown>;
}

/** 入房请求载荷。 */
export interface RoomJoinPayload {
  /** 玩家名称。 */
  playerName?: string;
}

/** 入房成功载荷。 */
export interface RoomJoinedPayload {
  /** 当前房间 ID。 */
  roomId: string;
  /** 当前连接会话 ID。 */
  sessionId: string;
  /** 玩家显示名称。 */
  playerName: string;
  /** 当前分配到的英雄实例 ID。 */
  championId: string | null;
  /** 当前是否为观战者。 */
  spectator: boolean;
}

/** 施法被服务端接受事件。 */
export interface SpellCastAcceptedEvent {
  /** 事件唯一 ID。 */
  eventId: string;
  /** 服务端序号。 */
  sequence: number;
  /** 房间 ID。 */
  roomId: string;
  /** 服务端时间戳。 */
  serverTime: number;
  /** 请求 ID。 */
  requestId?: string;
  /** 技能实例 ID。 */
  castInstanceId: string;
  /** 施法者实体 ID。 */
  casterId: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot: SpellSlot | string;
  /** 本次施法锁定的目标实体 ID。 */
  targetEntityId?: string;
  /** 本次施法锁定的目标点。 */
  targetPoint?: SerializedVector3 | null;
}

/** 施法被服务端拒绝事件。 */
export interface SpellCastRejectedEvent {
  /** 事件唯一 ID。 */
  eventId: string;
  /** 服务端序号。 */
  sequence: number;
  /** 房间 ID。 */
  roomId: string;
  /** 服务端时间戳。 */
  serverTime: number;
  /** 请求 ID。 */
  requestId?: string;
  /** 施法者实体 ID。 */
  casterId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot?: SpellSlot | string;
  /** 拒绝原因码。 */
  reasonCode?: string;
  /** 拒绝原因信息。 */
  reasonMessage?: string;
}

/** 技能阶段变化事件。 */
export interface SpellStageChangedEvent {
  /** 事件唯一 ID。 */
  eventId: string;
  /** 服务端序号。 */
  sequence: number;
  /** 房间 ID。 */
  roomId: string;
  /** 服务端时间戳。 */
  serverTime: number;
  /** 技能实例 ID。 */
  castInstanceId: string;
  /** 施法者实体 ID。 */
  casterId: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot?: SpellSlot | string;
  /** 本次施法锁定的目标实体 ID。 */
  targetEntityId?: string;
  /** 本次施法锁定的目标点。 */
  targetPoint?: SerializedVector3 | null;
  /** 原阶段。 */
  previousStage: SpellCastPhase | string;
  /** 新阶段。 */
  nextStage: SpellCastPhase | string;
}

/** 正式战斗结果事件的公共字段。 */
export interface CombatEventBase {
  /** 事件唯一 ID。 */
  eventId: string;
  /** 服务端序号。 */
  sequence: number;
  /** 房间 ID。 */
  roomId: string;
  /** 服务端时间戳。 */
  serverTime: number;
}

/** 权威伤害结算事件。 */
export interface DamageAppliedEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot?: SpellSlot | string;
  /** 来源实体 ID。 */
  sourceEntityId?: string;
  /** 目标实体 ID。 */
  targetEntityId: string;
  /** 本次总伤害值。 */
  amount: number;
  /** 本次被护盾吸收的伤害值。 */
  absorbedByShield?: number;
  /** 结算后剩余护盾值。 */
  remainingShield?: number;
  /** 结算后当前生命值。 */
  currentHp?: number;
  /** 本次是否导致目标死亡。 */
  targetDied?: boolean;
  /** 用于表现挂点的世界坐标。 */
  position?: SerializedVector3;
}

/** 权威治疗结算事件。 */
export interface HealAppliedEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot?: SpellSlot | string;
  /** 来源实体 ID。 */
  sourceEntityId?: string;
  /** 目标实体 ID。 */
  targetEntityId: string;
  /** 本次治疗值。 */
  amount: number;
  /** 治疗后当前生命值。 */
  currentHp?: number;
  /** 用于表现挂点的世界坐标。 */
  position?: SerializedVector3;
}

/** 权威护盾变化事件。 */
export interface ShieldChangedEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot?: SpellSlot | string;
  /** 来源实体 ID。 */
  sourceEntityId?: string;
  /** 目标实体 ID。 */
  targetEntityId: string;
  /** 本次护盾变化量，负数表示护盾被消耗。 */
  delta: number;
  /** 结算后当前护盾值。 */
  currentShield: number;
  /** 用于表现挂点的世界坐标。 */
  position?: SerializedVector3;
}

/** 权威状态施加事件。 */
export interface StatusAppliedEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot?: SpellSlot | string;
  /** 状态实例 ID。 */
  statusInstanceId: string;
  /** 状态定义 ID。 */
  statusId: string;
  /** 来源实体 ID。 */
  sourceEntityId: string;
  /** 目标实体 ID。 */
  targetEntityId: string;
  /** 当前层数。 */
  stacks: number;
  /** 状态创建时间戳。 */
  createdAt?: number;
  /** 状态持续时长，单位毫秒。 */
  durationMs?: number;
  /** 状态过期时间戳，单位毫秒。 */
  expiresAt?: number;
}

/** 权威状态移除事件。 */
export interface StatusRemovedEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot?: SpellSlot | string;
  /** 状态实例 ID。 */
  statusInstanceId: string;
  /** 状态定义 ID。 */
  statusId: string;
  /** 来源实体 ID。 */
  sourceEntityId?: string;
  /** 目标实体 ID。 */
  targetEntityId: string;
  /** 被移除时的层数。 */
  stacks?: number;
  /** 移除原因。 */
  reason?: string;
}

/** 权威投射物生成事件。 */
export interface ProjectileSpawnedEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 所有者实体 ID。 */
  ownerId: string;
  /** 技能定义 ID。 */
  skillId: string;
  /** 投射物实例 ID。 */
  projectileId: string;
  /** 当前世界坐标。 */
  position: SerializedVector3;
  /** 当前飞行方向。 */
  direction: SerializedVector3;
  /** 当前飞行速度。 */
  speed: number;
  /** 当前碰撞半径。 */
  radius?: number;
  /** 当前是否可被风墙类效果拦截。 */
  blockable?: boolean;
}

/** 权威投射物销毁事件。 */
export interface ProjectileDestroyedEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 所有者实体 ID。 */
  ownerId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 投射物实例 ID。 */
  projectileId: string;
  /** 销毁原因。 */
  destroyReason?: string;
  /** 命中的目标实体 ID 列表。 */
  hitTargetIds?: string[];
  /** 销毁位置。 */
  position?: SerializedVector3;
}

/** 权威区域体创建事件。 */
export interface AreaCreatedEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 所有者实体 ID。 */
  ownerId: string;
  /** 技能定义 ID。 */
  skillId: string;
  /** 区域体实例 ID。 */
  areaId: string;
  /** 区域体类型。 */
  areaType?: string;
  /** 当前中心点。 */
  position: SerializedVector3;
  /** 当前半径。 */
  radius?: number;
  /** 当前朝向角度，单位弧度。 */
  rotationY?: number;
  /** 区域体长度。 */
  length?: number;
  /** 区域体宽度或厚度。 */
  width?: number;
  /** 区域体高度。 */
  height?: number;
  /** 区域体过期时间戳。 */
  expiresAt?: number;
}

/** 权威区域体过期事件。 */
export interface AreaExpiredEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 所有者实体 ID。 */
  ownerId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 区域体实例 ID。 */
  areaId: string;
  /** 区域体类型。 */
  areaType?: string;
  /** 位置。 */
  position?: SerializedVector3;
  /** 过期原因。 */
  reason?: string;
}

/** 权威位移结算事件。 */
export interface DisplacementResolvedEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 来源实体 ID。 */
  sourceEntityId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 目标实体 ID。 */
  targetEntityId: string;
  /** 位移类型。 */
  displaceType?: string;
  /** 位移距离。 */
  distance?: number;
  /** 位移持续时间。 */
  durationMs?: number;
  /** 位移结算后的权威位置。 */
  position?: SerializedVector3;
  /** 移动锁定结束时间戳。 */
  movementLockedUntil?: number;
}

/** 权威死亡事件。 */
export interface DeathOccurredEvent extends CombatEventBase {
  /** 来源技能实例 ID。 */
  castInstanceId?: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot?: SpellSlot | string;
  /** 来源实体 ID。 */
  sourceEntityId?: string;
  /** 目标实体 ID。 */
  targetEntityId: string;
  /** 死亡位置。 */
  position?: SerializedVector3;
}

/** 正式技能施法阶段。 */
export type SpellCastPhase = 'idle' | 'windup' | 'resolve' | 'finished' | 'interrupted';

/** 技能施法目标类型。 */
export type SpellTargetType = 'target_unit' | 'directional' | 'target_point' | 'self_cast';

/**
 * 技能目标筛选规则。
 * 该结构用于前后端统一表达单体技能可命中的目标范围，
 * 例如只能选敌方、只能选己方、是否允许选择自己，以及目标身上的状态门槛。
 */
export interface SpellTargetRules {
  /** 是否仅允许选择敌方单位。 */
  enemyOnly?: boolean;
  /** 是否仅允许选择己方单位。 */
  allyOnly?: boolean;
  /** 是否允许选择施法者自己。 */
  allowSelf?: boolean;
  /** 目标必须具备的状态 ID。 */
  requiresTargetStatusId?: string;
  /** 目标身上禁止存在的状态 ID。 */
  cannotTargetWithStatusId?: string;
}

/**
 * 技能瞄准状态。
 * 当玩家按下技能键但尚未确认施法目标时，进入瞄准模式。
 * 瞄准期间在 3D 场景中渲染范围指示器（SpellAimIndicator）。
 */
export interface SpellAimState {
  /** 当前正在瞄准的技能槽位。 */
  slot: SpellSlot;
  /** 当前施法者实体 ID。 */
  casterId: string;
  /** 技能定义 ID。 */
  skillId: string;
  /** 施法目标类型。 */
  targetType: SpellTargetType;
  /** 施法最大距离。 */
  range: number;
  /** 技能效果半径（AOE 技能，用于在目标点渲染 AOE 范围）。 */
  radius?: number;
  /** 技能线宽（方向型技能，用于渲染矩形范围）。 */
  width?: number;
  /** 单体技能的合法目标筛选规则。 */
  targetRules?: SpellTargetRules | null;
  /** 当前鼠标或射线命中的地面坐标。 */
  cursorWorldPosition?: SerializedVector3 | null;
  /** 经过施法范围裁剪后的有效目标点。 */
  targetPoint?: SerializedVector3 | null;
  /** 当前有效施法方向（单位向量）。 */
  targetDirection?: SerializedVector3 | null;
  /** 当前鼠标悬停到的目标实体 ID。 */
  hoveredTargetEntityId?: string | null;
  /** 当前鼠标悬停目标是否满足规则与距离校验。 */
  hoveredTargetAllowed?: boolean | null;
  /** 当前已确认的目标实体 ID。 */
  targetEntityId?: string | null;
  /** 仅预览模式（悬浮图标时显示范围圆，不可确认施法）。 */
  previewOnly?: boolean;
}

/** 技能运行时状态。 */
export interface SkillRuntimeState {
  /** 技能槽位。 */
  slot: SpellSlot;
  /** 技能定义 ID。 */
  skillId: string;
  /** 技能显示名称。 */
  name: string;
  /** 当前技能等级。 */
  level: number;
  /** 技能最大冷却时长，单位毫秒。 */
  maxCooldownMs: number;
  /** 当前剩余冷却时长，单位毫秒。 */
  remainingCooldownMs: number;
  /** 当前是否可立即释放。 */
  isReady: boolean;
  /** 当前是否资源不足。 */
  insufficientResource: boolean;
  /** 当前是否处于二段技能窗口。 */
  isSecondPhase: boolean;
  /** 当前是否处于施法中。 */
  isCasting: boolean;
}

/** 状态效果表现态。 */
export interface StatusEffectViewState {
  /** 状态实例 ID。 */
  statusInstanceId: string;
  /** 状态定义 ID。 */
  statusId: string;
  /** 来源实体 ID。 */
  sourceEntityId: string;
  /** 目标实体 ID。 */
  targetEntityId: string;
  /** 当前层数。 */
  stacks: number;
  /** 状态持续时长，单位毫秒。 */
  durationMs?: number;
  /** 状态过期时间戳，单位毫秒。 */
  expiresAt?: number;
}

/** 浮动战斗文本表现态。 */
export interface FloatingCombatTextState {
  /** 文本实例唯一 ID。 */
  id: string;
  /** 文本类型。 */
  kind: 'damage' | 'heal' | 'shield';
  /** 关联目标实体 ID。 */
  targetEntityId?: string;
  /** 当前世界坐标。 */
  position: SerializedVector3;
  /** 展示数值。 */
  amount: number;
  /** 关联技能定义 ID。 */
  skillId?: string;
  /** 创建时间戳。 */
  createdAt: number;
  /** 过期时间戳。 */
  expiresAt: number;
}

/** 战斗命中特效表现态。 */
export interface CombatImpactVfxState {
  /** 特效实例唯一 ID。 */
  id: string;
  /** 特效类型。 */
  kind:
    | 'hit_flash'
    | 'slash_arc'
    | 'wind_wall_spawn'
    | 'dash_burst'
    | 'ultimate_burst'
    | 'tornado_cast'
    | 'wind_wall_expand'
    | 'dash_trail'
    | 'ult_impact'
    | 'lux_snare'
    | 'lux_barrier'
    | 'lux_zone'
    | 'lux_beam'
    | 'annie_cone'
    | 'annie_burst'
    | 'ashe_volley'
    | 'jhin_line';
  /** 当前世界坐标。 */
  position: SerializedVector3;
  /** 关联施法者实体 ID。 */
  casterId?: string;
  /** 关联目标实体 ID。 */
  targetEntityId?: string;
  /** 关联目标点，用于方向性/点选技能的专属表现。 */
  targetPoint?: SerializedVector3 | null;
  /** 关联技能定义 ID。 */
  skillId?: string;
  /** 当前朝向角度。 */
  rotation?: number;
  /** 创建时间戳。 */
  createdAt: number;
  /** 过期时间戳。 */
  expiresAt: number;
}

/** 投射物表现态。 */
export interface ProjectilePresentationState {
  /** 投射物实例 ID。 */
  projectileId: string;
  /** 来源技能实例 ID（塔弹道等无施法实例的投射物可为空）。 */
  castInstanceId?: string;
  /** 所有者实体 ID。 */
  ownerId: string;
  /** 技能定义 ID。 */
  skillId: string;
  /** 当前世界坐标。 */
  position: SerializedVector3;
  /** 当前飞行方向。 */
  direction: SerializedVector3;
  /** 当前飞行速度。 */
  speed: number;
  /** 当前碰撞半径。 */
  radius?: number;
  /** 当前是否可被风墙类效果拦截。 */
  blockable?: boolean;
  /** 投射物创建时间戳（毫秒），用于飞行进度计算。 */
  createdAt?: number;
  /** 投射物过期时间戳（毫秒），用于飞行进度计算。 */
  expiresAt?: number;
}

/** 区域体表现态。 */
export interface AreaPresentationState {
  /** 区域体实例 ID。 */
  areaId: string;
  /** 来源技能实例 ID。 */
  castInstanceId: string;
  /** 所有者实体 ID。 */
  ownerId: string;
  /** 技能定义 ID。 */
  skillId: string;
  /** 区域体类型。 */
  areaType?: string;
  /** 当前中心点。 */
  position: SerializedVector3;
  /** 当前半径。 */
  radius: number;
  /** 当前朝向角度，单位弧度。 */
  rotationY?: number;
  /** 区域体长度。 */
  length?: number;
  /** 区域体宽度或厚度。 */
  width?: number;
  /** 区域体高度。 */
  height?: number;
  /** 区域体过期时间戳，单位毫秒。 */
  expiresAt?: number;
}

/** 联机同步使用的动作播放输入。 */
export interface AnimationCommandPayload {
  /** 当前受控英雄实例 ID。 */
  championId: string;
  /** 需要广播的动画请求。 */
  request: SerializedAnimationClipRequest;
}

/** 联机同步使用的表情输入。 */
export interface EmoteCommandPayload {
  /** 当前受控英雄实例 ID。 */
  championId: string;
  /** 表情类型 ID。 */
  emoteId: EmoteId;
  /** 表情显示时长。 */
  durationMs?: number;
}

/** 联机同步使用的语音输入。 */
export interface VoiceCommandPayload {
  /** 当前受控英雄实例 ID。 */
  championId: string;
  /** 语音播放请求。 */
  request: VoicePlaybackRequest;
}

/** 客户端发送给服务端的联机输入事件映射。 */
export interface ClientToServerEvents {
  /** 加入默认房间并申请一个可控制英雄。 */
  'room:join': RoomJoinPayload;
  /** 提交移动输入。 */
  'champion:move': MoveCommandPayload;
  /** 提交动作播放输入。 */
  'champion:animate': AnimationCommandPayload;
  /** 提交表情输入。 */
  'champion:emote': EmoteCommandPayload;
  /** 提交语音输入。 */
  'champion:voice': VoiceCommandPayload;
  /** 提交正式技能施法输入。 */
  'castSpell': CastSpellCommandPayload;
}

/** 服务端发送给客户端的联机事件映射。 */
export interface ServerToClientEvents {
  /** 当前客户端成功加入房间。 */
  'room:joined': RoomJoinedPayload;
  /** 服务端广播最新对局快照。 */
  'game:snapshot': MultiplayerSnapshot;
  /** 服务端广播正式战斗快照。 */
  'combatSnapshot': CombatSnapshot;
  /** 服务端广播施法已被接受。 */
  'spellCastAccepted': SpellCastAcceptedEvent;
  /** 服务端广播施法被拒绝。 */
  'spellCastRejected': SpellCastRejectedEvent;
  /** 服务端广播技能正式开始。 */
  'spellCastStarted': SpellCastStartedEvent;
  /** 服务端广播技能阶段切换。 */
  'spellStageTransition': SpellStageChangedEvent;
  /** 服务端广播技能阶段切换。 */
  'spellStageChanged': SpellStageChangedEvent;
  /** 服务端广播权威伤害结算结果。 */
  'DamageApplied': DamageAppliedEvent;
  /** 服务端广播权威治疗结算结果。 */
  'HealApplied': HealAppliedEvent;
  /** 服务端广播权威护盾变化结果。 */
  'ShieldChanged': ShieldChangedEvent;
  /** 服务端广播权威状态施加结果。 */
  'StatusApplied': StatusAppliedEvent;
  /** 服务端广播权威状态移除结果。 */
  'StatusRemoved': StatusRemovedEvent;
  /** 服务端广播权威投射物生成结果。 */
  'ProjectileSpawned': ProjectileSpawnedEvent;
  /** 服务端广播权威投射物销毁结果。 */
  'projectileDestroyed': ProjectileDestroyedEvent;
  /** 服务端广播权威区域体创建结果。 */
  'AreaCreated': AreaCreatedEvent;
  /** 服务端广播权威区域体过期结果。 */
  'areaExpired': AreaExpiredEvent;
  /** 服务端广播权威位移结算结果。 */
  'DisplacementResolved': DisplacementResolvedEvent;
  /** 服务端广播权威死亡结果。 */
  'DeathOccurred': DeathOccurredEvent;
  /** 服务端广播房间玩家列表变更。 */
  'room:players': PlayerSessionAssignment[];
  /** 服务端错误。 */
  'server:error': { message: string };
}

/** 施法开始事件。 */
export interface SpellCastStartedEvent {
  /** 事件唯一 ID。 */
  eventId: string;
  /** 服务端序号。 */
  sequence: number;
  /** 房间 ID。 */
  roomId: string;
  /** 服务端时间戳。 */
  serverTime: number;
  /** 技能实例 ID。 */
  castInstanceId: string;
  /** 施法者实体 ID。 */
  casterId: string;
  /** 技能定义 ID。 */
  skillId?: string;
  /** 技能槽位。 */
  slot: SpellSlot | string;
}
