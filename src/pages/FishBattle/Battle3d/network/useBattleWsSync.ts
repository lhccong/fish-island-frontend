/**
 * 战斗 Socket.IO 同步 Hook（精简版）。
 * 职责：
 *   1. 管理 Socket.IO 连接生命周期（随组件挂载/卸载自动连接/断开）
 *   2. 发送 battle:join 并监听 battle:state 获取初始英雄站位
 *   3. 将服务端下发的英雄数据映射到 useGameStore
 *
 * 用法：在 App 组件顶层调用 useBattleWsSync()。
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import {
  connectToBattleSocket,
  disconnectBattleSocket,
  getSocketClient,
  getBattleRoomCode,
} from './socketClient';
import { GAME_CONFIG } from '../config/gameConfig';
import { useGameStore } from '../store/useGameStore';
import { getHeroConfig } from '../config/heroConfig';
import type { ChampionState } from '../types/game';

/** 服务端 battle:state 中的单个英雄字段 */
interface BattleStateChampion {
  odm: number;
  playerName: string;
  heroId: string;
  team: string;
  skinId?: string;
  heroModelUrl?: string;
  positionX: number;
  positionY: number;
  positionZ: number;
}

/** 服务端 battle:state 载荷 */
interface BattleStatePayload {
  roomCode: string;
  champions: BattleStateChampion[];
  serverTime: number;
}

/**
 * 将服务端 battle:state 的英雄列表映射到 useGameStore 中的 champions。
 */
function mapBattleStateToChampions(
  serverChampions: BattleStateChampion[],
  currentUserId: number | undefined,
): ChampionState[] {
  const now = Date.now();

  return serverChampions.map((sc, index) => {
    const hero = getHeroConfig(sc.heroId);
    const isMe = currentUserId != null && sc.odm === currentUserId;
    const baseHp = hero?.baseHp ?? 1000;
    const baseMp = hero?.baseMp ?? 500;

    return {
      id: `${sc.team}_${index}`,
      heroId: sc.heroId,
      skin: sc.skinId,
      modelUrl: sc.heroModelUrl,
      playerName: isMe ? `${sc.playerName}(我)` : sc.playerName,
      team: sc.team as 'blue' | 'red',
      position: new THREE.Vector3(sc.positionX, sc.positionY, sc.positionZ),
      rotation: sc.team === 'blue' ? 0 : Math.PI,
      hp: baseHp,
      maxHp: baseHp,
      mp: baseMp,
      maxMp: baseMp,
      level: 1,
      kills: 0,
      deaths: 0,
      assists: 0,
      isDead: false,
      respawnTimer: 0,
      animationState: 'idle' as const,
      animationClipRequest: null,
      isMe,
      moveSpeed: hero?.moveSpeed ?? 300,
      moveTarget: null,
      inputMode: 'idle' as const,
      movementLockedUntil: 0,
      idleStartedAt: now,
      lastVoiceRequest: null,
      shield: 0,
      flowValue: 0,
      skillStates: {} as ChampionState['skillStates'],
      statusEffects: [],
      activeCastInstanceId: null,
      activeCastPhase: 'idle' as const,
    } as ChampionState;
  });
}

/**
 * 精简版战斗 WS 同步 Hook。
 * 连接 socket → 发送 battle:join → 接收 battle:state → 更新 store 英雄。
 */
export function useBattleWsSync(
  enabled: boolean,
  playerName: string,
) {
  useEffect(() => {
    if (!enabled) return;

    /* 对齐原项目：立即将联机状态切为 connecting，
     * 清除上一局可能残留的 error/disconnected 状态，
     * 防止 DisconnectOverlay 因陈旧状态误显示。 */
    useGameStore.getState().setMultiplayerConnectionStatus('connecting');

    // ⚠️ 先注册监听器，再连接/发送 battle:join，
    // 否则 socket 已连接时 connectToBattleSocket 会立即 emit battle:join，
    // 服务端瞬间响应 battle:state 但此时监听器尚未注册，事件丢失。
    const client = getSocketClient();

    const handleBattleState = (payload: BattleStatePayload) => {
      console.log('[useBattleWsSync] battle:state received', payload);
      const store = useGameStore.getState();

      // 尝试从 initialState 获取当前用户 ID
      let currentUserId: number | undefined;
      try {
        // @ts-ignore - UmiJS global model
        const initialState = (window as any).__UMI_INITIAL_STATE__?.currentUser;
        currentUserId = initialState?.id ? Number(initialState.id) : undefined;
      } catch {
        // ignore
      }

      const champions = mapBattleStateToChampions(payload.champions, currentUserId);

      // 更新 store 中的英雄
      useGameStore.setState({ champions });

      // 设置联机会话状态
      const myChampion = champions.find((c) => c.isMe);
      if (myChampion) {
        store.setMultiplayerConnectionStatus('connected');
        store.setMultiplayerAssignment(
          {
            odm: currentUserId ?? 0,
            championId: myChampion.id,
            team: myChampion.team,
            playerName: myChampion.playerName,
          },
          client.id ?? '',
          payload.roomCode,
        );
      }

      console.log('[useBattleWsSync] champions updated from battle:state');
    };

    const handleError = (data: { error?: string }) => {
      console.warn('[useBattleWsSync] battle:error:', data?.error);
    };

    /* 后端 sendError 发送到 room:error（非 battle:error），需同时监听 */
    const handleRoomError = (data: { error?: string }) => {
      console.warn('[useBattleWsSync] room:error:', data?.error);
    };

    /* 全员 3D 场景就绪屏障：收到 battle:allSceneReady 后才真正开始游戏 */
    const handleAllSceneReady = () => {
      console.log('[useBattleWsSync] battle:allSceneReady received');
      useGameStore.getState().setAllScenesReady(true);
    };

    /* 场景就绪标记 */
    const sceneReadySentRef = { sent: false };

    /* 房间不存在：后端重启或对局已结束，原房间内存已丢失 */
    const handleRoomNotFound = (payload: { reason?: string }) => {
      const reason = payload?.reason || '对局已结束或服务器已重启';
      console.warn('[useBattleWsSync] 房间不存在:', reason);
      useGameStore.getState().setMultiplayerConnectionStatus('error', reason);
    };

    /* 会话被取代：同一账号在其他标签页/设备进入战斗 */
    const handleSessionSuperseded = (payload: { reason?: string }) => {
      const reason = payload?.reason || '该账号已在其他地方进入战斗';
      console.warn('[useBattleWsSync] 会话被取代:', reason);
      useGameStore.getState().setMultiplayerConnectionStatus('error', reason);
    };

    /* ========== Socket.IO 传输层事件 ==========
     *
     * 状态机：connecting → connected → disconnected ⇄ (重连中) → error（终端）
     *
     * connect_error 不改变状态——它只是单次重连失败的信号，
     * 由 reconnect_attempt / reconnect_failed 统一管理状态流转，
     * 避免 error ↔ disconnected 快速翻转导致遮罩闪烁和重复弹窗。
     */

    const handleDisconnect = (reason: string) => {
      const isIntentional = reason === 'io client disconnect';
      if (!isIntentional) {
        useGameStore.getState().setMultiplayerConnectionStatus('disconnected', '召唤师，与战场的连接中断了，正在尝试重新连接...');
      } else {
        useGameStore.getState().setMultiplayerConnectionStatus('disconnected', '已离开战场');
      }
    };

    const handleConnectError = (err: Error) => {
      /* 仅记录日志，不改变状态。reconnect_attempt / reconnect_failed 负责状态。 */
      console.warn('[useBattleWsSync] 连接异常:', err.message);
    };

    const handleReconnect = () => {
      console.log('[useBattleWsSync] 重连成功');
      useGameStore.getState().setMultiplayerConnectionStatus('connecting');
      sceneReadySentRef.sent = false;
    };

    const handleReconnectAttempt = (attempt: number) => {
      useGameStore.getState().setMultiplayerConnectionStatus('disconnected', `正在重新连接战场 (第${attempt}次尝试)...`);
    };

    const handleReconnectFailed = () => {
      useGameStore.getState().setMultiplayerConnectionStatus('error', '无法连接到战场服务器，请刷新页面重新进入战场');
    };

    /* ========== 注册事件 ========== */

    client.on('disconnect', handleDisconnect);
    client.on('connect_error', handleConnectError);
    client.io.on('reconnect', handleReconnect);
    client.io.on('reconnect_attempt', handleReconnectAttempt);
    client.io.on('reconnect_failed', handleReconnectFailed);
    client.on('battle:state', handleBattleState);
    client.on('battle:error', handleError);
    client.on('room:error', handleRoomError);
    client.on('battle:allSceneReady', handleAllSceneReady);
    client.on('battle:roomNotFound', handleRoomNotFound);
    client.on('session:superseded', handleSessionSuperseded);

    /* 监听本地加载完成：当 isLoading 变为 false 时发送 battle:sceneReady */
    const checkAndEmitSceneReady = () => {
      if (sceneReadySentRef.sent) return;
      const { isLoading } = useGameStore.getState();
      if (!isLoading) {
        sceneReadySentRef.sent = true;
        const roomCode = getBattleRoomCode();
        client.emit('battle:sceneReady', { roomCode });
        console.log('[useBattleWsSync] battle:sceneReady emitted');
      }
    };
    const sceneReadyUnsubscribe = useGameStore.subscribe((state) => {
      if (!state.isLoading && !sceneReadySentRef.sent) {
        checkAndEmitSceneReady();
      }
    });
    // 组件挂载时也检查一次（可能资产已经加载完成）
    checkAndEmitSceneReady();

    // 注册完监听器后再连接/发送 battle:join
    connectToBattleSocket(playerName);

    return () => {
      sceneReadyUnsubscribe();
      client.off('disconnect', handleDisconnect);
      client.off('connect_error', handleConnectError);
      client.io.off('reconnect', handleReconnect);
      client.io.off('reconnect_attempt', handleReconnectAttempt);
      client.io.off('reconnect_failed', handleReconnectFailed);
      client.off('battle:state', handleBattleState);
      client.off('battle:error', handleError);
      client.off('room:error', handleRoomError);
      client.off('battle:allSceneReady', handleAllSceneReady);
      client.off('battle:roomNotFound', handleRoomNotFound);
      client.off('session:superseded', handleSessionSuperseded);
      disconnectBattleSocket();
    };
  }, [enabled, playerName]);
}
