/**
 * 摸鱼大乱斗前端类型定义
 */

/** 英雄职业 */
export type HeroRole = 'tank' | 'fighter' | 'mage' | 'marksman' | 'support';

/** 队伍 */
export type Team = 'blue' | 'red';

/** 英雄信息 */
export interface FishBattleHero {
  id: number;
  heroId: string;
  name: string;
  nameEn: string;
  role: HeroRole;
  baseHp: number;
  baseMp: number;
  baseAd: number;
  moveSpeed: number;
  attackRange: number;
  attackSpeed: number;
  avatarUrl?: string;
  splashArt?: string;
  modelUrl?: string;
  assetConfig?: string;
  skills?: string;
  status: number;
}

/** 英雄技能JSON结构 */
export interface HeroSkill {
  name: string;
  icon: string;
  description: string;
}

/** 英雄技能映射 */
export interface HeroSkills {
  q: HeroSkill;
  w: HeroSkill;
  e: HeroSkill;
  r: HeroSkill;
}

/** 房间信息 */
export interface FishBattleRoom {
  id: number;
  roomCode: string;
  roomName: string;
  status: number;
  gameMode: string;
  maxPlayers: number;
  currentPlayers: number;
  aiFillEnabled: number;
  creatorId: number;
  creatorName?: string;
  createTime: string;
  source?: 'memory' | 'db'; // memory=内存等待中房间, db=DB进行中房间
}

/** 房间玩家 */
export interface FishBattleRoomPlayer {
  id: number;
  roomId: number;
  userId?: number;
  playerName?: string;
  userAvatar?: string;
  team: Team;
  isReady: number | boolean;
  isOnline?: number | boolean;
  isAi: number | boolean;
  heroId?: string;
  selectedHeroId?: string;
  heroConfirmed?: boolean;
  heroName?: string;
  heroEmoji?: string;
  heroAvatarUrl?: string;
  heroSplashArt?: string;
  heroRole?: string;
  heroSkills?: string;
  skinId?: string;
  skinSplashArt?: string;
  skinModelUrl?: string;
  spell1?: string;
  spell2?: string;
  loadingProgress?: number;
  loaded?: boolean;
  slotIndex: number;
}

/** 对局记录 */
export interface FishBattleGame {
  id: number;
  roomId: number;
  gameMode: string;
  winningTeam?: Team;
  blueKills: number;
  redKills: number;
  durationSeconds: number;
  endReason?: string;
  mvpUserId?: number;
  startTime?: string;
  endTime?: string;
}

/** 玩家对局统计（单局） */
export interface FishBattlePlayerStats {
  id: number;
  gameId: number;
  userId: number;
  heroId: string;
  team: Team;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  damageTaken: number;
  healing: number;
  isMvp: number;
  isWin: number;
  likes: number;
  pointsEarned: number;
}

/** 玩家总体统计 */
export interface FishBattleUserStats {
  id: number;
  userId: number;
  totalGames: number;
  wins: number;
  losses: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  mvpCount: number;
  currentStreak: number;
  maxStreak: number;
  todayGames: number;
  todayDate?: string;
  dailyLimit: number;
}

/** 房间详情（含玩家列表） */
export interface FishBattleRoomDetail {
  room: FishBattleRoom;
  players: FishBattleRoomPlayer[];
}

/** 对局详情（含玩家统计） */
export interface FishBattleGameDetail {
  game: FishBattleGame;
  playerStats: FishBattlePlayerStats[];
}

/** 概览数据 */
export interface FishBattleOverview {
  onlineCount: number;
  totalGames: number;
  fightingCount: number;
  fightingPlayers: { userId: number; userName: string; userAvatar?: string }[];
}

/** 选英雄阶段 — 玩家选择状态 */
export interface HeroPickPlayer {
  userId: number;
  playerName: string;
  userAvatar?: string;
  team: Team;
  slotIndex: number;
  selectedHeroId?: string;
  heroConfirmed: boolean;
  heroName?: string;
  heroEmoji?: string;
  heroAvatarUrl?: string;
  heroSplashArt?: string;
  heroRole?: string;
  skinId?: string;
  skinSplashArt?: string;
  skinModelUrl?: string;
  spell1?: string;
  spell2?: string;
  loadingProgress?: number;
  loaded?: boolean;
}

/** 召唤师技能 */
export interface SummonerSpell {
  spellId: string;
  name: string;
  icon: string;
  description: string;
  cooldown: number;
  assetConfig?: string;
}

/** 英雄皮肤 */
export interface HeroSkin {
  skinId: string;
  skinName: string;
  splashArt?: string;
  modelUrl?: string;
  isDefault: number;
}

/** 选英雄开始事件payload */
export interface HeroPickStartPayload {
  roomCode: string;
  heroes: FishBattleHero[];
  duration: number;
  players: HeroPickPlayer[];
  serverTime: number;
}

/** 选英雄更新事件payload */
export interface HeroPickUpdatePayload {
  players: HeroPickPlayer[];
  serverTime: number;
}

/** 选英雄完成事件payload */
export interface HeroPickCompletePayload {
  roomCode: string;
  players: HeroPickPlayer[];
  serverTime: number;
}
