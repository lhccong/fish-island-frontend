/**
 * 玩家在线状态枚举（后端 PlayerStatusEnum）
 */
export enum PlayerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  RECONNECTING = 'reconnecting',
}

/**
 * 玩家角色枚举（后端 PlayerRoleEnum）
 */
export enum PlayerRole {
  PLAYER = 'PLAYER',
  OWNER = 'OWNER',
  SPECTATOR = 'SPECTATOR',
}