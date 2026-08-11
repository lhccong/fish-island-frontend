/**
 * 玩家位置（房间内三个固定位置）
 */
export type PlayerPosition = 'left' | 'right' | 'bottom';

/**
 * 扑克牌大小
 */
export type CardSize = 'small' | 'normal' | 'large';

/**
 * 玩家状态
 */
export interface PlayerState {
  userId: number | string;
  userName?: string;
  nickname?: string;
  avatar?: string;
  cardCount?: number;
  cards?: string[];
  isLandlord?: boolean;
  isCurrentPlayer?: boolean;
  isReady?: boolean;
  isOnline?: boolean;
  online?: boolean; // 服务器返回的在线状态
  isRobotControlled?: boolean;
  isOwner?: boolean;
  isMe?: boolean;
  robScore?: number;
  role?: string;
  // 当前出的牌（显示在玩家自己的出牌区）
  currentPlayedCards?: string[];
}

/**
 * 游戏状态 - 前端使用
 * 注意: 后端会通过 roomInfo 字段传递房间信息
 */
export interface GameState {
  roomId?: string;
  gameType?: string;
  phase: string;
  landlordId?: number | string;
  landlordName?: string;
  bottomCards?: string[];
  currentPlayerId?: number | string;
  currentPlayerName?: string;
  currentRobPlayerId?: number | string;
  currentRobScore?: number;
  highestRobScore?: number;
  players: PlayerState[];
  handCards?: string[];
  lastPlayedCards?: string[];
  lastPlayedPlayerId?: number | string;
  lastPlayedPlayerName?: string;
  lastPatternDesc?: string;
  gameStarted: boolean;
  ownerId?: number | string;
  timeLeft?: number;
  maxTime?: number;
  currentActionCards?: string[];
  /** 准备阶段开始时间（毫秒）；后端在一局结束/重置房间时下发；为 undefined 表示不在准备阶段 */
  readyPhaseStartTime?: number;
  [key: string]: any;
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string;
  userId: number | string;
  userName: string;
  content: string;
  timestamp: number;
  /** 是否是当前用户自己发的（前端在接收广播时根据当前 userId 标记，避免渲染时再比较出错） */
  isMe?: boolean;
}

/**
 * 游戏结果
 */
export interface GameResult {
  winnerId: number | string;
  winnerName: string;
  isLandlordWin: boolean;
  players: PlayerResult[];
  bombCount?: number;
}

export interface PlayerResult {
  userId: number | string;
  userName: string;
  isWinner: boolean;
  isLandlord: boolean;
  scoreChange: number;
}

/**
 * 房间限制信息
 * 玩家临时离开房间后，在原房间游戏结束前无法加入其他房间
 */
export interface RoomRestriction {
  roomId: string;
  gameType: string;
  state: string;
  reason: string;
}

/**
 * 临时离开信息
 */
export interface TempLeaveInfo {
  tempLeaveRoomId: string;
  message: string;
}