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
  GAME_CREATE_ROOM: 'gameCreateRoom',
  GAME_ROOM_ADDED: 'gameRoomAdded',
  GAME_ROOM_REMOVED: 'gameRoomRemoved',
  GAME_JOIN_ROOM: 'gameJoinRoom',
  GAME_LEAVE_ROOM: 'gameLeaveRoom',

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
} as const;

export type MsgTypeValue = (typeof MSG_TYPE)[keyof typeof MSG_TYPE];

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