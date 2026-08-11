/**
 * 消息处理器：游戏状态/阶段相关
 * - handleGameStateUpdate
 * - handleGameStart
 * - handleGameOver
 */
import { message as antMessage } from 'antd';
import { GameState, GameEvent, PlayerStatus, GameResult, ChatMessage } from '../../types';
import { GamePhase } from '../../types/enums/game';
import { RoomStateBackend } from '../../types/enums/room';
import {
  extractCardIds,
  normalizePlayer,
  mergePlayers,
  mergeGameState,
} from '../state';

// 阶段白名单（仅用于判定消息是否携带有效 phase / roomState 字段）
// 真实 phase 永远经 normalizePhase 归一为小写；
// roomState 来自后端 RoomStateEnum 永远是大写 —— 故两个白名单不能合并
const VALID_GAME_PHASES: readonly string[] = Object.values(GamePhase) as readonly string[];
const VALID_ROOM_STATES: readonly string[] = Object.values(RoomStateBackend) as readonly string[];

/**
 * 创建 GAME_STATE_UPDATE 处理器
 * 使用普通函数而非 useCallback，确保稳定的引用
 */
export const createGameStateUpdateHandler = (
  userId: string | number | undefined,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  setHandCards: React.Dispatch<React.SetStateAction<string[]>>,
  setLoading: (loading: boolean) => void,
) => {
  // 闭包捕获稳定的引用
  return (payload: any) => {
    if (!userId) return;
    
    let data = payload;

    if (payload?.data) {
      try {
        const innerData = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
        if (innerData.roomInfo?.players) {
          data = {
            ...innerData,
            players: innerData.roomInfo.players,
            // 从 roomInfo 中提取 readyPhaseStartTime 用于倒计时
            readyPhaseStartTime: innerData.roomInfo.readyPhaseStartTime,
          };
        } else if (innerData.gameState) {
          data = innerData.gameState;
        } else if (innerData.players) {
          data = innerData;
        } else {
          data = innerData;
        }
      } catch (e) {
        console.debug('[landlords] parse error:', e);
      }
    }

    const hasValidPhase = data?.phase && VALID_GAME_PHASES.includes(data.phase);
    const hasValidRoomState = data?.roomState && VALID_ROOM_STATES.includes(data.roomState);
    const isPlayerJoinEvent = data?.event === GameEvent.PLAYER_JOIN || data?.players;
    const isPlayerStatusChangeEvent =
      data?.event === GameEvent.PLAYER_STATUS_CHANGE || data?.status;
    const isPlayerReconnectEvent = data?.event === GameEvent.PLAYER_RECONNECT;
    const hasReadyPhaseTimer = data?.readyPhaseStartTime != null;
    if (!hasValidPhase && !hasValidRoomState && !isPlayerJoinEvent && !isPlayerStatusChangeEvent && !isPlayerReconnectEvent && !hasReadyPhaseTimer) {
      console.debug('[landlords] 忽略无效状态更新消息:', data?.event || 'no event');
      return;
    }

    // 处理重连事件 - 需要更新所有玩家的在线状态
    if (isPlayerReconnectEvent && data?.players && Array.isArray(data.players)) {
      const reconnectUserId = String(data.reconnectUserId);

      setGameState((prev) => {

        // 直接使用服务器返回的 players 数组，但保留临时状态
        const mergedPlayers = data.players.map((serverPlayer: any) => {
          // 在 prev 中找到对应的玩家，保留临时状态
          const prevPlayer = (prev.players || []).find(
            (p: any) => String(p.userId) === String(serverPlayer.userId || serverPlayer.id)
          );

          // 重连玩家设置为在线，其他玩家使用服务器返回的状态
          const isReconnectPlayer = String(serverPlayer.userId || serverPlayer.id) === reconnectUserId;
          const serverOnline = serverPlayer.online ?? serverPlayer.isOnline ?? true;
          const finalOnline = isReconnectPlayer ? true : serverOnline;


          return {
            ...serverPlayer,
            userId: serverPlayer.userId || serverPlayer.id,
            id: serverPlayer.userId || serverPlayer.id,
            // 保留临时状态
            isRobotControlled: prevPlayer?.isRobotControlled ?? serverPlayer.isRobotControlled ?? false,
            currentPlayedCards: prevPlayer?.currentPlayedCards ?? serverPlayer.currentPlayedCards ?? [],
            // 更新在线状态
            isOnline: finalOnline,
          };
        });


        return {
          ...prev,
          players: mergedPlayers,
        };
      });
      return;
    }

    if (isPlayerStatusChangeEvent && data?.userId && data?.status) {
      const targetUserId = String(data.userId);
      const newStatus = data.status;
      console.debug('[landlords] 玩家状态变更:', targetUserId, newStatus);
      setGameState((prev) => ({
        ...prev,
        players: (prev.players || []).map((player) => {
          if (String(player.userId) === targetUserId) {
            if (newStatus === PlayerStatus.OFFLINE) {
              return { ...player, isOnline: false };
            } else if (newStatus === PlayerStatus.ONLINE) {
              return { ...player, isOnline: true };
            }
          }
          return player;
        }),
      }));
      return;
    }

    let normalizedPlayers: any[] | null = null;
    if (data?.players && Array.isArray(data.players)) {
      const mapped = data.players.map((p: any) => normalizePlayer(p, data.landlordId));
      const myPlayer = mapped.find(
        (p: any) => String(p.id || p.userId) === String(userId),
      );
      const handCards = myPlayer?.handCards;
      if (Array.isArray(handCards)) {
        setHandCards(handCards);
      }
      normalizedPlayers = mapped;
    }

    let bottomCardIds: string[] = [];
    if (data?.bottomCards && Array.isArray(data.bottomCards)) {
      bottomCardIds = extractCardIds(data.bottomCards);
    }
    let handCardIds: string[] = [];
    if (data?.handCards && Array.isArray(data.handCards)) {
      const extracted = extractCardIds(data.handCards);
      handCardIds = Array.isArray(extracted) ? extracted : [];
      setHandCards(handCardIds);
    }

    setGameState((prev: GameState) => {
      const merged = normalizedPlayers
        ? mergePlayers(prev.players || [], normalizedPlayers, data.landlordId)
        : prev.players;
      return mergeGameState(prev, data, merged, bottomCardIds, handCardIds);
    });

    setLoading(false);
  };
};

/**
 * 创建 GAME_START 处理器
 */
export const createGameStartHandler = (
  handleGameStateUpdate: (payload: any) => void,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  setGameResult: (r: GameResult | null) => void,
  setPlayerHints: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setSelectedCards: React.Dispatch<React.SetStateAction<string[]>>,
) => {
  return (payload: any) => {
    console.debug('[landlords] gameStart', payload);
    handleGameStateUpdate(payload);
    setGameResult(null);
    setGameState((prev) => ({
      ...prev,
      players: (prev.players || []).map((p: any) => ({ ...p, currentPlayedCards: [] })),
    }));
    setPlayerHints({});
    setSelectedCards([]);
  };
};

/**
 * 创建 GAME_CHAT 处理器
 * @param setChatMessages 设置聊天消息列表
 * @param getCurrentUserId 获取当前用户 ID 的函数（handler 可能晚于组件挂载创建，用 getter 保证最新值）
 */
export const createGameChatHandler = (
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  getCurrentUserId: () => string | number | null | undefined = () => null,
) => {
  return (payload: any) => {
    const data = payload?.data ?? payload;
    const currentUserId = getCurrentUserId();
    const isMe =
      currentUserId != null && String(data.userId) === String(currentUserId);
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        userId: data.userId,
        userName: data.userName || '',
        content: data.content || '',
        timestamp: Date.now(),
        isMe,
      },
    ]);
  };
};

/**
 * 创建 error 处理器
 */
export const createErrorHandler = (setLoading: (loading: boolean) => void) => {
  return (payload: any) => {
    antMessage.error(payload?.data || payload?.message || '发生错误');
    setLoading(false);
  };
};
