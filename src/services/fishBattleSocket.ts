/**
 * 摸鱼大乱斗 Socket.IO 客户端服务
 * 单例管理，对标 3D 对战 demo 的 socketClient.ts
 */
import { io, Socket } from 'socket.io-client';
import { FISH_BATTLE_SOCKET_URL_LOCAL } from '@/constants';

let socket: Socket | null = null;

/**
 * 获取或创建 Socket.IO 连接实例
 */
export function getFishBattleSocket(): Socket {
  if (!socket) {
    const tokenName = localStorage.getItem('tokenName') || '';
    const tokenValue = localStorage.getItem('tokenValue') || '';
    socket = io(FISH_BATTLE_SOCKET_URL_LOCAL, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      query: {
        tokenName,
        tokenValue,
      },
    });
  }
  return socket;
}

/**
 * 连接 Socket.IO 服务器
 */
export function connectFishBattleSocket(): void {
  const s = getFishBattleSocket();
  if (!s.connected) {
    s.connect();
  }
}

/**
 * 断开 Socket.IO 连接
 */
export function disconnectFishBattleSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * 发送事件
 */
export function emitFishBattleEvent(event: string, data?: unknown): void {
  const s = getFishBattleSocket();
  if (s.connected) {
    s.emit(event, data);
  }
}

/**
 * 监听事件（返回取消监听函数）
 */
export function onFishBattleEvent(event: string, handler: (...args: any[]) => void): () => void {
  const s = getFishBattleSocket();
  s.on(event, handler);
  return () => {
    s.off(event, handler);
  };
}

export default {
  getFishBattleSocket,
  connectFishBattleSocket,
  disconnectFishBattleSocket,
  emitFishBattleEvent,
  onFishBattleEvent,
};
