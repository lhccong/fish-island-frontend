/**
 * 游戏阶段枚举（小写，后端 GamePhaseEnum）
 * 表示当前游戏进行到哪个阶段
 */
export enum GamePhase {
  WAITING = 'waiting',
  DEALING = 'dealing',
  ROBBING = 'robbing',
  LANDLORD_CONFIRMED = 'landlord_confirmed',
  PLAYING = 'playing',
  ENDING = 'ending',
  CLOSED = 'closed',
}

/**
 * 游戏事件枚举（后端 GameEventEnum）
 * 回合通知、操作结果、AI托管、房间事件等
 */
export enum GameEvent {
  // 回合通知
  TURN_START = 'TURN_START',
  TURN_END = 'TURN_END',
  PHASE_CHANGE = 'PHASE_CHANGE',
  // 游戏流程
  GAME_START = 'GAME_START',
  GAME_OVER = 'GAME_OVER',
  GAME_FORCE_END = 'GAME_FORCE_END',
  // 操作结果
  ROB_RESULT = 'ROB_RESULT',
  PLAY_RESULT = 'PLAY_RESULT',
  PASS_RESULT = 'PASS_RESULT',
  LANDLORD_CONFIRMED = 'LANDLORD_CONFIRMED',
  // AI托管
  ROBOT_ENABLED = 'ROBOT_ENABLED',
  ROBOT_DISABLED = 'ROBOT_DISABLED',
  // 房间事件（小写驼峰）
  PLAYER_JOIN = 'playerJoin',
  PLAYER_LEAVE = 'playerLeave',
  PLAYER_STATUS_CHANGE = 'playerStatusChange',
  PLAYER_RECONNECT = 'playerReconnect',
}

/**
 * 游戏操作类型枚举（后端 GameActionEnum）
 * 当前玩家可以执行的操作类型
 */
export enum GameAction {
  ROB = 'ROB',
  PLAY = 'PLAY',
  PASS = 'PASS',
  LANDLORD = 'LANDLORD',
  DOUBLE = 'DOUBLE',
  ROBOT = 'ROBOT',
}