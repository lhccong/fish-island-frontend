/**
 * 摸鱼大乱斗 Socket.IO 连接管理 Hook
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  getFishBattleSocket,
  connectFishBattleSocket,
  disconnectFishBattleSocket,
  emitFishBattleEvent,
} from '@/services/fishBattleSocket';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useFishBattleSocket() {
  const [status, setStatus] = useState<ConnectionStatus>(() => {
    const socket = getFishBattleSocket();
    return socket.connected ? 'connected' : 'disconnected';
  });
  const listenersRef = useRef<Array<() => void>>([]);

  /** 连接 */
  const connect = useCallback(() => {
    const socket = getFishBattleSocket();
    if (socket.connected) {
      setStatus('connected');
      return;
    }
    setStatus('connecting');
    connectFishBattleSocket();
  }, []);

  /** 断开 */
  const disconnect = useCallback(() => {
    disconnectFishBattleSocket();
    setStatus('disconnected');
  }, []);

  /** 发送事件 */
  const emit = useCallback((event: string, data?: unknown) => {
    emitFishBattleEvent(event, data);
  }, []);

  /** 监听事件 */
  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const socket = getFishBattleSocket();
    socket.on(event, handler);
    const cleanup = () => {
      socket.off(event, handler);
    };
    listenersRef.current.push(cleanup);
    return cleanup;
  }, []);

  /** 取消监听事件 */
  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    const socket = getFishBattleSocket();
    socket.off(event, handler);
  }, []);

  const isConnected = status === 'connected';

  useEffect(() => {
    const socket = getFishBattleSocket();

    const handleConnect = () => setStatus('connected');
    const handleDisconnect = () => setStatus('disconnected');
    const handleConnectError = () => setStatus('error');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      // 清理所有事件监听
      listenersRef.current.forEach((cleanup) => cleanup());
      listenersRef.current = [];
    };
  }, []);

  return { status, connect, disconnect, emit, on, off, isConnected };
}
