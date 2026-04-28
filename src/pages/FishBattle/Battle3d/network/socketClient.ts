/**
 * 统一 Socket.IO 客户端（对接 battle-3d-demo-server 的 netty-socketio 网关）。
 * 职责：
 *   1. 管理 Socket.IO 连接生命周期（连接、断开、自动重连）
 *   2. 发送战斗消息（移动、停止、施法、普攻、动画、表情、语音）
 *   3. 暴露底层 Socket 实例供上层 Hook 注册事件监听
 *
 * 传输层仅使用 WebSocket，跳过 HTTP 长轮询以降低延迟。
 */

import { type Socket } from 'socket.io-client';
import { GAME_CONFIG } from '../config/gameConfig';
import { getFishBattleSocket, connectFishBattleSocket } from '@/services/fishBattleSocket';
import type {
  AnimationCommandPayload,
  EmoteCommandPayload,
  MoveCommandPayload,
  VoiceCommandPayload,
} from '../types/game';

// ==================== 施法请求载荷类型 ====================

/** 施法请求载荷（从 battleWsClient.ts 迁移） */
export interface CastSpellPayload {
  /** 请求 ID（客户端生成，用于追踪施法结果） */
  requestId: string;
  /** 施法者 ID */
  casterId: string;
  /** 技能槽位（如 Q/W/E/R/basicAttack） */
  slot: string;
  /** 技能定义 ID（可选） */
  skillId?: string;
  /** 目标实体 ID（单体技能） */
  targetEntityId?: string;
  /** 目标点坐标（方向/范围技能） */
  targetPoint?: { x: number; y: number; z: number };
  /** 目标方向（方向技能） */
  targetDirection?: { x: number; y: number; z: number };
  /** 客户端移动序列号（锁移动施法时用于与停止语义对账） */
  clientMoveSequence?: number;
  /** 客户端时间戳 */
  clientTimestamp?: number;
  /** 客户端视觉位置（锁移动施法时携带，用于后端位置修正） */
  clientPosition?: { x: number; z: number };
}

// ==================== 内部状态 ====================

/** 当前进入的 roomCode，用于 battle:join 时传递 */
let currentBattleRoomCode: string | undefined;
/** 待入房玩家名（用于 connect 回调自动发 battle:join） */
let pendingJoinPlayerName: string | undefined;
/** 是否已注册 connect 回调（避免重复绑定） */
let joinBindingInitialized = false;

/**
 * connect 事件的具名回调（供注册/移除使用）。
 * 连接或重连成功后自动发送 battle:join。
 */
function handleConnectForJoin() {
  if (!GAME_CONFIG.multiplayer.enabled) {
    return;
  }
  const client = getSocketClient();
  // 同步大厅侧 FishBattleRoomManager 的玩家在线状态（重连场景下必要）
  if (currentBattleRoomCode) {
    client.emit('room:rejoin', { roomCode: currentBattleRoomCode });
  }
  client.emit('battle:join', { playerName: pendingJoinPlayerName, roomCode: currentBattleRoomCode });
}

/**
 * 内部辅助：仅在已连接且联机启用时发送事件。
 */
function emitWhenConnected<T extends unknown[]>(eventName: string, ...args: T): boolean {
  if (!GAME_CONFIG.multiplayer.enabled) {
    return false;
  }

  const client = getSocketClient();
  if (!client.connected) {
    return false;
  }

  client.emit(eventName, ...args);
  return true;
}

// ==================== 连接管理 ====================

/**
 * 获取 Socket.IO 客户端单例。
 * 复用主项目已认证的 fishBattleSocket 连接，不创建独立连接。
 */
export function getSocketClient(): Socket {
  return getFishBattleSocket();
}

/**
 * 设置当前战斗房间号（供 battle:join 使用）。
 */
export function setBattleRoomCode(roomCode: string | undefined) {
  currentBattleRoomCode = roomCode;
}

/**
 * 获取当前战斗房间号。
 */
export function getBattleRoomCode(): string | undefined {
  return currentBattleRoomCode;
}

/**
 * 连接到战斗 Socket.IO 服务器。
 * 复用主项目已认证的 fishBattleSocket 连接。
 * 对齐 demo：注册 connect 回调，确保连接/重连后自动发送 battle:join。
 */
export function connectToBattleSocket(playerName?: string) {
  if (!GAME_CONFIG.multiplayer.enabled) {
    return null;
  }

  const client = getSocketClient();
  pendingJoinPlayerName = playerName;

  if (!joinBindingInitialized) {
    // 幂等注册：先移除可能残留的旧回调，再注册新回调
    client.off('connect', handleConnectForJoin);
    client.on('connect', handleConnectForJoin);
    joinBindingInitialized = true;
  }

  if (client.connected) {
    // 同步大厅侧玩家在线状态（与 handleConnectForJoin 逻辑一致）
    if (currentBattleRoomCode) {
      client.emit('room:rejoin', { roomCode: currentBattleRoomCode });
    }
    client.emit('battle:join', { playerName, roomCode: currentBattleRoomCode });
  } else {
    // 刷新页面等场景下 socket 尚未连接（autoConnect: false），需显式建立连接
    connectFishBattleSocket();
  }
  return client;
}

/**
 * 断开战斗 Socket.IO 连接。
 * 不断开主项目 socket（由主项目生命周期管理），仅清理内部状态。
 */
export function disconnectBattleSocket() {
  // 移除 connect 事件回调，避免后续重连时触发过时的 battle:join
  if (joinBindingInitialized) {
    const client = getSocketClient();
    client.off('connect', handleConnectForJoin);
    joinBindingInitialized = false;
  }
  pendingJoinPlayerName = undefined;
  currentBattleRoomCode = undefined;
}

// ==================== 战斗命令 ====================

/** 发送英雄移动指令 */
export function emitMoveCommand(payload: MoveCommandPayload): boolean {
  return emitWhenConnected('champion:move', payload);
}

/** 发送英雄停止指令 */
export function emitStopCommand(payload: {
  championId: string;
  clientMoveSequence?: number;
  clientTimestamp?: number;
  clientPosition?: { x: number; z: number };
}): boolean {
  return emitWhenConnected('champion:stop', payload);
}

/** 发送施法指令 */
export function emitCastSpell(payload: CastSpellPayload): boolean {
  return emitWhenConnected('castSpell', payload);
}

/** 发送普攻指令 */
export function emitBasicAttack(payload: CastSpellPayload): boolean {
  return emitWhenConnected('basicAttack', payload);
}

/** 发送动画指令 */
export function emitAnimationCommand(payload: AnimationCommandPayload) {
  emitWhenConnected('champion:animate', payload);
}

/** 发送表情指令 */
export function emitEmoteCommand(payload: EmoteCommandPayload) {
  emitWhenConnected('champion:emote', payload);
}

/** 发送语音指令 */
export function emitVoiceCommand(payload: VoiceCommandPayload) {
  emitWhenConnected('champion:voice', payload);
}
