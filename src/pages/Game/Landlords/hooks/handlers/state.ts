/**
 * 消息处理器：游戏状态/阶段相关
 * - handleGameStateUpdate
 * - handleGameStart
 * - handleGameOver
 */
import { message as antMessage } from 'antd';
import { GameState, GameEvent, PlayerStatus, GameResult, ChatMessage } from '../../types';
import {
  extractCardIds,
  normalizePlayer,
  mergePlayers,
  mergeGameState,
} from '../state';

const VALID_PHASES: readonly string[] = [
  'waiting', 'dealing', 'robbing', 'landlord_confirmed', 'playing', 'ending', 'closed',
  'WAITING', 'READY', 'ROBBING', 'PLAYING', 'DISTRIBUTING', 'ENDING', 'CLOSED',
];

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
          data = { ...innerData, players: innerData.roomInfo.players };
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

    const hasValidPhase = data?.phase && VALID_PHASES.includes(data.phase);
    const hasValidRoomState = data?.roomState && VALID_PHASES.includes(data.roomState);
    const isPlayerJoinEvent = data?.event === GameEvent.PLAYER_JOIN || data?.players;
    const isPlayerStatusChangeEvent =
      data?.event === GameEvent.PLAYER_STATUS_CHANGE || data?.status;
    const isPlayerReconnectEvent = data?.event === GameEvent.PLAYER_RECONNECT;
    if (!hasValidPhase && !hasValidRoomState && !isPlayerJoinEvent && !isPlayerStatusChangeEvent && !isPlayerReconnectEvent) {
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
 */
export const createGameChatHandler = (
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
) => {
  return (payload: any) => {
    const data = payload?.data ?? payload;
    console.debug('[landlords] chat', data);
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        userId: data.userId,
        userName: data.userName || '未知',
        content: data.content || '',
        timestamp: Date.now(),
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
