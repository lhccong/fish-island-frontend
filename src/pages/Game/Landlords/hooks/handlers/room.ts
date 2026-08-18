/**
 * 消息处理器：统一房间状态
 */
import { message as antMessage } from 'antd';
import { history } from '@@/core/history';
import { GameState, TempLeaveInfo } from '../../types';
import { normalizePhase } from '../../types/phase';
import { PlayerRole } from '../../types/enums/player';
import type { RoomStateResp, PlayerInfo } from '../../types/protocol';

/**
 * 创建统一房间状态处理器
 * 处理: CREATE, JOIN, RECONNECT 等消息
 */
export const createRoomStateHandler = (
  userId: string | number | undefined,
  handleGameStateUpdate: (payload: any) => void,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  setLoading: (loading: boolean) => void,
  setGameResult: (r: any) => void,
  roomId?: string,
) => {
  return (payload: any) => {
    console.debug('[landlords] 收到 roomState:', JSON.stringify(payload)?.substring(0, 500));
    const data: RoomStateResp = payload?.data ?? payload;

    // 统一处理失败情况
    if (data.success === false) {
      antMessage.error(data.message || '操作失败');
      setLoading(false);
      history.push('/game/landlords');
      return;
    }

    setGameResult(null);

    // 根据 action 类型决定处理逻辑
    const action = data.action;

    // 1. CREATE: 创建房间成功，跳转到房间页
    if (action === 'CREATE') {
      console.debug('[landlords] CREATE action, roomId:', data.roomId);
      if (data.roomId) {
        history.push(`/game/landlords/${data.roomId}`);
      }
      return;
    }

    // 2. JOIN / RECONNECT: 进入房间，更新游戏状态
    if (action === 'JOIN' || action === 'RECONNECT') {
      console.debug('[landlords] JOIN/RECONNECT action, players:', data.players?.length);

      const currentUserId = data.playerId ?? userId;
      const roomPlayers = Array.isArray(data.players) ? data.players : [];

      setGameState((prev) => ({
        ...prev,
        roomId: data.roomId || prev.roomId,
        gameType: data.gameType || prev.gameType,
        phase: normalizePhase(data.state),
        landlordId: data.landlordId || prev.landlordId,
        readyPhaseStartTime: data.readyPhaseStartTime
          ? Number(data.readyPhaseStartTime)
          : undefined,
        players: roomPlayers.map((p: PlayerInfo) => {
          const prevPlayer = (prev.players || []).find(
            (pp) => String(pp.userId) === String(p.userId),
          );
          return {
            userId: p.userId,
            userName: p.userName || '未知',
            avatar: p.avatar || '',
            cardCount: p.cardCount || 0,
            isLandlord: Boolean(
              p.isLandlord ||
              (data.landlordId && String(p.userId) === String(data.landlordId)),
            ),
            isCurrentPlayer: p.isCurrentPlayer || false,
            isReady: p.ready || false,
            isOwner: p.role === PlayerRole.OWNER || false,
            isOnline: prevPlayer?.isOnline ?? p.online ?? true,
            isMe: currentUserId ? String(p.userId) === String(currentUserId) : false,
            robScore: p.robScore || 0,
            isRobotControlled:
              prevPlayer?.isRobotControlled ?? p.robotControlled ?? false,
            currentPlayedCards: prevPlayer?.currentPlayedCards ?? [],
          };
        }),
      }));
      console.debug('[landlords] players after JOIN/RECONNECT:', roomPlayers.length);
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
