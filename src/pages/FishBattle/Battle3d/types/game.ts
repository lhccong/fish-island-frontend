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
  /** 动作槽位语音（后端兼容字段）。 */
  q?: string[];
  w?: string[];
  e?: string[];
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
  damageDealt: number;
  damageTaken: number;
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
  /** 当前攻击移动目标点。 */
  attackMoveTarget?: THREE.Vector3 | null;
  /** 当前自动攻击锁定目标实体 ID。 */
  currentAttackTargetId?: string | null;
  /** 当前自动攻击锁定目标实体类型。 */
  currentAttackTargetType?: 'champion' | 'minion' | 'structure' | null;
  /** 是否在最新服务端快照中可见（用于视野系统：不可见的保留英雄应隐藏）。 */
  visibleInSnapshot: boolean;
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
  level?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  damageDealt?: number;
  damageTaken?: number;
  respawnTimer?: number;
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
  /** 当前攻击移动目标点。 */
  attackMoveTarget?: SerializedVector3 | null;
  /** 当前自动攻击锁定目标实体 ID。 */
  currentAttackTargetId?: string | null;
  /** 当前自动攻击锁定目标实体类型。 */
  currentAttackTargetType?: 'champion' | 'minion' | 'structure' | null;
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
  killerId?: string;
  killerTeam?: Team;
  victimTeam?: Team;
  assistIds?: string[];
  respawnAt?: number;
}

export interface KillFeedEntry {
  id: string;
  killerId?: string;
  killerName?: string;
  killerTeam?: Team;
  victimId: string;
  victimName?: string;
  victimTeam?: Team;
  assistIds?: string[];
  createdAt: number;
  expiresAt: number;
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
  targetType?: 'champion' | 'minion' | 'structure' | string;
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
    | 'dash_burst'
    | string;
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
  targetEntityId?: string;
  targetType?: 'champion' | 'minion' | 'structure' | string;
  visualType?: 'hero' | 'tower' | 'minion' | string;
  tracking?: 'linear' | 'homing';
  /** 技能定义 ID。 */
  skillId: string;
  /** 当前世界坐标。 */
  position: SerializedVector3;
  impactPosition?: SerializedVector3;
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
  /** 服务端广播游戏结束。 */
  'battle:gameEnd': GameEndPayload;
  /** 服务端错误。 */
  'server:error': { message: string };
}

/** 游戏结束事件负载。 */
export interface GameEndPayload {
  /** 获胜队伍。 */
  winnerTeam: 'blue' | 'red';
  /** 结束原因。 */
  reason: string;
  /** 对局时长（秒）。 */
  gameTimer: number;
  /** 蓝队击杀数。 */
  blueKills: number;
  /** 红队击杀数。 */
  redKills: number;
  /** 服务端时间戳。 */
  serverTime: number;
  /** 对局记录 ID，用于跳转结算页。 */
  gameId: number | null;
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
