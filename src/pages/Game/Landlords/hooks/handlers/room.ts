/**
 * 消息处理器：房间/准备/离开
 */
import { message as antMessage } from 'antd';
import { history } from '@@/core/history';
import { GameState, TempLeaveInfo } from '../../types';
import { normalizePhase } from '../../types/phase';
import { PlayerRole } from '../../types/enums/player';

/**
 * 创建 GAME_JOIN_ROOM 处理器（处理重连恢复 + 房间信息）
 * 使用普通函数而非 useCallback，确保稳定的引用
 */
export const createJoinRoomHandler = (
  userId: string | number | undefined,
  handleGameStateUpdate: (payload: any) => void,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  setLoading: (loading: boolean) => void,
  setGameResult: (r: any) => void,
  roomId: string,
) => {
  return (payload: any) => {
    console.debug('[landlords] 收到 gameJoinRoom:', JSON.stringify(payload)?.substring(0, 500));
    const data = payload?.data ?? payload;

    setGameResult(null);

    // 加入房间失败 - 自动跳转回房间列表并显示错误
    if (data.success === false) {
      antMessage.error(data.message || '加入房间失败');
      setLoading(false);
      history.push('/game/landlords');
      return;
    }

    if (data.gameState) {
      handleGameStateUpdate(data.gameState);
      setLoading(false);
      return;
    }

    if (data.roomInfo) {
      const roomInfo = data.roomInfo;
      const currentUserId = userId;
      const roomPlayers = Array.isArray(roomInfo.players) ? roomInfo.players : [];
      setGameState((prev) => ({
        ...prev,
        roomId: roomInfo.roomId || prev.roomId,
        gameType: roomInfo.gameType || prev.gameType,
        phase: normalizePhase(roomInfo.state),
        landlordId: roomInfo.landlordId || prev.landlordId,
        players: roomPlayers.map((p: any) => {
          const prevPlayer = (prev.players || []).find(
            (pp) => String(pp.userId) === String(p.userId),
          );
          return {
            userId: p.userId,
            userName: p.userName || '未知',
            avatar: p.avatar || '',
            cardCount: p.cardCount || 0,
            isLandlord:
              p.isLandlord ||
              (roomInfo.landlordId && String(p.userId) === String(roomInfo.landlordId)),
            isCurrentPlayer: p.isCurrentPlayer || false,
            isReady: p.ready || false,
            isOwner: p.role === PlayerRole.OWNER || p.role === 'owner',
            isOnline: prevPlayer?.isOnline ?? p.online ?? true,
            isMe: currentUserId ? String(p.userId) === String(currentUserId) : false,
            robScore: p.robScore || 0,
            isRobotControlled:
              prevPlayer?.isRobotControlled ?? p.isRobotControlled ?? false,
            currentPlayedCards: prevPlayer?.currentPlayedCards ?? [],
          };
        }),
      }));
      setLoading(false);
    }
  };
};

/**
 * 创建 GAME_READY 处理器
 */
export const createReadyHandler = (
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
) => {
  return (payload: any) => {
    const data = payload?.data ?? payload;
    console.debug('[landlords] ready', data);

    if (data.players && Array.isArray(data.players)) {
      setGameState((prev) => ({
        ...prev,
        players: (prev.players || []).map((p) => {
          const serverPlayer = data.players.find(
            (sp: any) => Number(sp.userId) === Number(p.userId),
          );
          return serverPlayer ? { ...p, isReady: serverPlayer.ready } : p;
        }),
      }));
    }
  };
};

/**
 * 创建 GAME_LEAVE_ROOM 处理器（含临时离开信息）
 */
export const createLeaveRoomHandler = (
  setTempLeaveInfo: (info: TempLeaveInfo | null) => void,
) => {
  return (payload: any) => {
    const data = payload?.data ?? payload;
    console.debug('[landlords] 收到离开房间响应:', data);

    if (data?.tempLeaveRoomId) {
      setTempLeaveInfo({
        tempLeaveRoomId: data.tempLeaveRoomId,
        message: data.message || '游戏仍在进行中，你可以随时回来',
      });
      if (data.message) {
        antMessage.info(data.message);
      }
    }
  };
};
