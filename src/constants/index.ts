/**
 * 本地后端地址
 */
// export const BACKEND_HOST_LOCAL = 'http://localhost:8123';
export const BACKEND_HOST_LOCAL = 'https://api.yucoder.cn';

/**
 * 线上后端地址
 */
export const BACKEND_HOST_PROD = 'https://api.yucoder.cn';

/**
 * 验证码地址
 */
export const BACKEND_HOST_CODE = BACKEND_HOST_LOCAL + '/api';
export const BACKEND_HOST_WS = 'wss://api.yucoder.cn/ws/?token=';
// export const BACKEND_HOST_WS = 'ws://127.0.0.1:8090?token=';


export const SYSTEM_LOGO =
  'https://oss.cqbo.com/moyu/moyu.png';

/**
 * 谁是卧底房间状态常量
 */
export const UNDERCOVER_ROOM_STATUS = {
  WAITING: 'WAITING',  // 等待中
  PLAYING: 'PLAYING',  // 游戏中
  ENDED: 'ENDED'       // 已结束
};

/**
 * 谁是卧底小红点通知状态
 */
export const UNDERCOVER_NOTIFICATION = {
  NONE: 'NONE',        // 无通知
  NEW_ROOM: 'NEW_ROOM' // 新房间通知
};
