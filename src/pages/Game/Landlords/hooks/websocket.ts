/**
 * WebSocket 发送封装
 * 提供带登录态校验与自动重连的发送 hook
 */
import { useCallback, useEffect, useRef } from 'react';
import { message as antMessage } from 'antd';
import { wsService } from '@/services/websocket';
import { useModel } from '@umijs/max';
import { MSG_TYPE, MsgTypeValue } from '../types';

const MAX_CONNECT_ATTEMPTS = 40;
const CONNECT_RETRY_INTERVAL = 50; // ms

/**
 * 发送游戏消息（自动处理未连接情况）
 */
export function useSendGameMessage() {
  const { initialState } = useModel('@@initialState');
  const userId = initialState?.currentUser?.id;
  const hasInitialized = useRef(false);

  useEffect(() => {
    hasInitialized.current = true;
  }, [initialState]);

  const sendGameMessage = useCallback(
    (type: MsgTypeValue | string, data: Record<string, any> = {}): boolean => {

      if (!userId) {
        if (hasInitialized.current) {
          antMessage.error('请先登录');
        }
        return false;
      }

      const doSend = () => {
        wsService.send({
          type: 2,
          userId: String(userId),
          data: JSON.stringify({ type, content: JSON.stringify(data) }),
        });
        return true;
      };

      if (wsService.isConnected()) {
        return doSend();
      }

      // 未连接：尝试连接后发送
      const token = localStorage.getItem('tokenValue');
      if (!token) {
        if (hasInitialized.current) {
          antMessage.error('请先登录');
        }
        return false;
      }
      wsService.connect(token);
      let attempts = 0;
      const checkAndSend = setInterval(() => {
        attempts++;
        if (wsService.isConnected()) {
          clearInterval(checkAndSend);
          doSend();
        } else if (attempts >= MAX_CONNECT_ATTEMPTS) {
          clearInterval(checkAndSend);
          antMessage.error('连接服务器失败');
        }
      }, CONNECT_RETRY_INTERVAL);
      return true;
    },
    [userId],
  );

  return sendGameMessage;
}

/**
 * 注册 WebSocket 消息处理器，自动在卸载时清理
 */
export function useMessageHandlers(
  userId: string | number | undefined,
  enabled: boolean,
  handlers: Record<string, (data: any) => void>,
) {
  useEffect(() => {
    if (!userId || !enabled) return;

    Object.entries(handlers).forEach(([type, handler]) => {
      wsService.addMessageHandler(type, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([type, handler]) => {
        wsService.removeMessageHandler(type, handler);
      });
    };
  }, [userId, enabled, handlers]);
}