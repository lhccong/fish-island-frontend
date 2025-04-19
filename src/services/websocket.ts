import { BACKEND_HOST_WS } from "@/constants";
import { message } from "antd";

class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private isManuallyClosed = false;

  private constructor() {
    // 添加默认的错误消息处理器
    this.addMessageHandler('error', (data) => {
      message.error(data.data || '发生错误');
    });
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public connect(token: string) {
    if (this.isManuallyClosed) {
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(BACKEND_HOST_WS + token);

    this.ws.onopen = () => {
      console.log('WebSocket连接成功');
      this.reconnectAttempts = 0;
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws?.send(JSON.stringify({
          type: 1, // 登录连接
        }));
      } else {
        message.error('WebSocket连接失败');
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket连接关闭');
      this.ws = null;

      if (!this.isManuallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(token);
        }, timeout);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const handlers = this.messageHandlers.get(data.type) || [];
        handlers.forEach(handler => handler(data));
      } catch (error) {
        console.error('处理WebSocket消息失败:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      message.error('连接发生错误');
    };

    // 定期发送心跳消息
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 4, // 心跳消息类型
        }));
      }
    }, 25000);
  }

  public disconnect() {
    this.isManuallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      message.error('WebSocket连接已断开');
    }
  }

  public addMessageHandler(type: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)?.push(handler);
  }

  public removeMessageHandler(type: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  public clearMessageHandlers() {
    // 清空所有消息处理器，但保留error默认处理器
    const errorHandlers = this.messageHandlers.get('error') || [];
    this.messageHandlers.clear();
    this.messageHandlers.set('error', errorHandlers);
  }
}

export const wsService = WebSocketService.getInstance(); 