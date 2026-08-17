/**
 * WebSocket 协议相关定义
 * - MSG_TYPE: 消息类型常量（匹配后端 MessageTypeEnum）
 * - TurnNotify / ActionResult: 统一流程消息的负载类型
 */
import type { PlayerResult } from './state';

/**
 * WebSocket 消息类型常量
 */
export const MSG_TYPE = {
  // 房间管理
  GAME_ROOM_LIST: 'gameRoomList',
  GAME_ROOM_STATE: 'gameRoomState',  // 统一房间状态（创建/加入/玩家变化都用这个）
  GAME_ROOM_ADDED: 'gameRoomAdded',
  GAME_ROOM_REMOVED: 'gameRoomRemoved',
  GAME_LEAVE_ROOM: 'gameLeaveRoom',
  // 请求消息（后端返回统一用 gameRoomState）
  GAME_CREATE_ROOM: 'gameCreateRoom',
  GAME_JOIN_ROOM: 'gameJoinRoom',

  // 游戏
  GAME_READY: 'gameReady',
  GAME_START: 'gameStart',
  GAME_DEAL_CARDS: 'gameDealCards',
  GAME_ROB_LANDLORD: 'gameRobLandlord',
  GAME_PLAY_CARDS: 'gamePlayCards',
  GAME_PASS: 'gamePass',
  GAME_OVER: 'gameOver',
  GAME_STATE_UPDATE: 'gameStateUpdate',
  GAME_CHAT: 'gameChat',

  // 统一流程消息
  GAME_TURN_NOTIFY: 'gameTurnNotify',
  GAME_ACTION_RESULT: 'gameActionResult',

  // AI托管
  GAME_CANCEL_ROBOT: 'gameCancelRobot',
  GAME_SET_ROBOT: 'gameSetRobot',

  // 错误
  ERROR: 'error',

  // 被踢（复用 STATE_UPDATE 通道，这里仅做类型注解，避免误删）
  GAME_PLAYER_KICKED: 'gamePlayerKicked',
} as const;

export type MsgTypeValue = (typeof MSG_TYPE)[keyof typeof MSG_TYPE];

/**
 * 统一房间状态响应
 * 对应后端 RoomStateResp
 */
export interface RoomStateResp {
  /** 操作类型: CREATE, JOIN, RECONNECT, PLAYER_JOIN, PLAYER_LEAVE, STATE_UPDATE */
  action: string;
  /** 房间ID */
  roomId: string;
  /** 游戏类型 */
  gameType: string;
  /** 当前玩家ID */
  playerId: number | string;
  /** 玩家列表 */
  players: PlayerInfo[];
  /** 房间状态码 */
  state: number;
  /** 地主ID */
  landlordId?: number | string;
  /** 手牌 */
  handCards?: string[];
  /** 底牌 */
  bottomCards?: string[];
  /** 通用值（如癞子值） */
  universalValue?: number;
  /** 准备阶段开始时间 */
  readyPhaseStartTime?: number;
  /** 是否成功 */
  success: boolean;
  /** 错误消息 */
  message?: string;
}

/**
 * 玩家信息
 */
export interface PlayerInfo {
  userId: number | string;
  userName: string;
  avatar?: string;
  cardCount?: number;
  isLandlord?: boolean;
  isCurrentPlayer?: boolean;
  ready?: boolean;
  role?: 'OWNER' | 'PLAYER';
  online?: boolean;
  robotControlled?: boolean;
  robScore?: number;
}

/**
 * 操作选项（叫分可选分数）
 */
export interface ActionOption {
  value: number;
  name: string;
  enabled: boolean;
  hint?: string;
}

/**
 * 回合通知 - 告诉所有人轮到谁了
 * 对应后端 TurnNotifyResp
 *
 * 注意：roomState 已废弃，由 phase 替代
 */
export interface TurnNotify {
  event: string;
  phase: string;
  roomState?: string; // 已废弃，优先使用 phase
  phaseDesc?: string;
  currentPlayerId?: number | string;
  currentPlayerName?: string;
  isCurrentPlayerMe?: boolean;
  action?: string;
  actionOptions?: ActionOption[];
  canPass?: boolean;
  canPlay?: boolean;
  timeout?: number;
  startTime?: number;
  message?: string;
  highestScore?: number;
  landlordId?: number | string;
  landlordName?: string;
}

/**
 * 操作结果 - 告诉所有人某个玩家做了什么
 * 对应后端 ActionResultResp
 *
 * 注意：roomState 已废弃，由 phase 替代
 */
export interface ActionResult {
  event: string;
  phase: string;
  roomState?: string; // 已废弃，优先使用 phase
  playerId?: number | string;
  playerName?: string;
  action: string;
  actionValue?: number;
  result: string;
  message?: string;
  pokerIds?: string[];
  patternDesc?: string;
  isBomb?: boolean;
  highestScore?: number;
  robScoreDesc?: string;
  landlordId?: number | string;
  landlordName?: string;
  winnerId?: number | string;
  winnerName?: string;
  isLandlordWin?: boolean;
  winTeam?: string;
  players?: PlayerResult[];
}

/**
 * 当前玩家可执行的操作状态
 */
export interface PlayerActionState {
  canRob: boolean;
  canPlay: boolean;
  canPass: boolean;
  robOptions: ActionOption[];
  timeout: number;
  currentPlayerId: number | string | null;
}