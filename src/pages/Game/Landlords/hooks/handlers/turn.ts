/**
 * 消息处理器：统一流程消息（TurnNotify / ActionResult）
 */
import { message as antMessage } from 'antd';
import { GameState, TurnNotify, ActionResult } from '../../types';
import { GameEvent, GameAction } from '../../types/enums/game';
import { normalizePhase } from '../../types/phase';
import { getActionDisplayText } from '../../types/enums/action';

/**
 * 创建 GAME_TURN_NOTIFY 处理器
 * 使用普通函数而非 useCallback，确保稳定的引用
 */
export const createTurnNotifyHandler = (
  setPlayerAction: React.Dispatch<React.SetStateAction<any>>,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  setPlayerHints: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setTimeLeft: (n: number) => void,
) => {
  return (
    payload: any,
    totalTimeRef?: React.MutableRefObject<number>,
    startTimeRef?: React.MutableRefObject<number | null>,
  ) => {
    const data: TurnNotify = payload?.data ?? payload;
    console.debug('[landlords] turnNotify', data);

    setPlayerAction({
      canRob: data.action === GameAction.ROB,
      canPlay: data.action === GameAction.PLAY,
      canPass: data.canPass ?? false,
      robOptions: data.actionOptions ?? [],
      timeout: data.timeout ?? 30,
      currentPlayerId: data.currentPlayerId ?? null,
      action: data.action ?? '',
    });

    setGameState((prev) => ({
      ...prev,
      currentPlayerId: data.currentPlayerId,
      currentRobPlayerId: data.action === GameAction.ROB ? data.currentPlayerId : prev.currentRobPlayerId,
      phase: normalizePhase(data.phase),
      highestRobScore: data.highestScore ?? prev.highestRobScore,
      landlordId: data.landlordId ?? prev.landlordId,
      landlordName: data.landlordName ?? prev.landlordName,
      ...(data.landlordId
        ? {
            players: prev.players.map((p) => ({
              ...p,
              isLandlord: String(p.userId) === String(data.landlordId),
            })),
          }
        : {}),
    }));

    if (data.currentPlayerId) {
      setPlayerHints((prev) => {
        const next = { ...prev };
        delete next[String(data.currentPlayerId)];
        return next;
      });
    }

    if (data.timeout) {
      if (totalTimeRef) totalTimeRef.current = data.timeout;
      setTimeLeft(data.timeout);
      if (startTimeRef) startTimeRef.current = data.startTime ?? Date.now();
    }

    console.debug('[landlords] turn notify message:', data.message);
  };
};

/**
 * 创建 GAME_ACTION_RESULT 处理器
 */
export const createActionResultHandler = (
  userId: string | number | undefined,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  setPlayerHints: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setSelectedCards: React.Dispatch<React.SetStateAction<string[]>>,
  setGameResult: (r: any) => void,
) => {
  return (payload: any) => {
    const data: ActionResult = payload?.data ?? payload;
    console.debug('[landlords] actionResult', data, 'event:', data.event);

    // ===== 处理 GAME_OVER 事件 =====
    if (data.event === GameEvent.GAME_OVER) {
      console.debug('[landlords] 游戏结束事件', data);

      // 游戏结果由后端推送的 GameStateUpdate（buildGameState）处理
      // 后端已经清空了赢家的手牌
      // 前端只需要设置弹窗数据

      setGameResult(data);
      if (data.winnerId) {
        antMessage.info(String(data.winnerId) === String(userId) ? '恭喜获胜！' : '很遗憾，你输了');
      }
      return;
    }

    setGameState((prev) => {
      const hasActionPlayer = data.playerId !== null && data.playerId !== undefined;
      const actionPlayerId = hasActionPlayer ? String(data.playerId) : null;
      const playedCards =
        data.event === GameEvent.PLAY_RESULT && Array.isArray(data.pokerIds)
          ? data.pokerIds.filter(
              (cardId): cardId is string => typeof cardId === 'string' && cardId.length > 0,
            )
          : null;
      const shouldClearPlayedCards = data.event === GameEvent.PASS_RESULT;
      const hasLandlord = data.landlordId !== null && data.landlordId !== undefined;
      const isRobotEnabled = data.event === GameEvent.ROBOT_ENABLED;
      const isRobotDisabled = data.event === GameEvent.ROBOT_DISABLED;

      return {
        ...prev,
        phase: normalizePhase(data.phase),
        highestRobScore: data.highestScore ?? prev.highestRobScore,
        landlordId: data.landlordId ?? prev.landlordId,
        landlordName: data.landlordName ?? prev.landlordName,
        players: prev.players.map((player) => {
          const isActionPlayer =
            actionPlayerId !== null && String(player.userId) === actionPlayerId;
          let newRobotControlled = player.isRobotControlled;
          if (isActionPlayer) {
            if (isRobotEnabled) newRobotControlled = true;
            else if (isRobotDisabled) newRobotControlled = false;
          }
          return {
            ...player,
            isRobotControlled: newRobotControlled,
            ...(isActionPlayer && playedCards ? { currentPlayedCards: playedCards } : {}),
            ...(isActionPlayer && shouldClearPlayedCards ? { currentPlayedCards: [] } : {}),
            ...(hasLandlord
              ? { isLandlord: String(player.userId) === String(data.landlordId) }
              : {}),
          };
        }),
      };
    });

    const hintText = getActionDisplayText(data.event, data.message);
    if (hintText && data.playerId) {
      const playerId = String(data.playerId);
      setPlayerHints((prev) => ({ ...prev, [playerId]: hintText }));
    }
    if (data.event === GameEvent.PLAY_RESULT && data.isBomb && data.playerId) {
      const playerId = String(data.playerId);
      setPlayerHints((prev) => ({ ...prev, [playerId]: '💥 炸弹！' }));
    }
    if ((data.event === GameEvent.ROBOT_ENABLED || data.event === GameEvent.ROBOT_DISABLED) && data.message) {
      antMessage.info(data.message);
    }
    if (data.event === GameEvent.PLAY_RESULT && data.playerId && String(data.playerId) === String(userId)) {
      setSelectedCards([]);
    }
  };
};
