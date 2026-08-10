/**
 * 房间状态枚举（大写，后端 RoomStateEnum）
 * 表示房间级别的状态
 */
export enum RoomState {
  WAITING = 'WAITING',
  READY = 'READY',
  ROBBING = 'ROBBING',
  PLAYING = 'PLAYING',
}

/**
 * 房间状态枚举（后端原始枚举，含发牌中/结束/关闭）
 * 主要用于房间列表页
 */
export enum RoomStateBackend {
  WAITING = 'WAITING',
  READY = 'READY',
  DISTRIBUTING = 'DISTRIBUTING',
  ROBBING = 'ROBBING',
  PLAYING = 'PLAYING',
  ENDING = 'ENDING',
  CLOSED = 'CLOSED',
}