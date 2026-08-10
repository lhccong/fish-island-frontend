/**
 * 玩家信息派生（自己/其他/左/右/查找）
 */
import { PlayerState } from '../types';

/**
 * 创建玩家信息查询函数集合（普通函数，非 Hook）
 */
export function createPlayerQueries(
  gameState: { players?: PlayerState[] },
  userId: string | number | undefined,
) {
  const getMyPlayer = (): PlayerState | null => {
    if (!gameState.players || !userId) return null;
    return gameState.players.find((p) => String(p.userId) === String(userId)) || null;
  };

  const getOtherPlayers = (): PlayerState[] => {
    if (!gameState.players || !userId) return [];
    const myIndex = gameState.players.findIndex(
      (p) => String(p.userId) === String(userId),
    );
    if (myIndex === -1) return [];
    const rotated = [
      ...gameState.players.slice(myIndex),
      ...gameState.players.slice(0, myIndex),
    ];
    return rotated.slice(1);
  };

  const getLeftPlayer = (): PlayerState | null => {
    const others = getOtherPlayers();
    if (others.length >= 2) return others[1];
    return null;
  };

  const getRightPlayer = (): PlayerState | null => {
    const others = getOtherPlayers();
    if (others.length >= 1) return others[0];
    return null;
  };

  const getPlayerNameById = (playerId: number | string | null | undefined): string => {
    if (!playerId || !gameState.players) return '未知玩家';
    const player = gameState.players.find(
      (p) => String(p.userId) === String(playerId),
    );
    return player?.userName || player?.nickname || '未知玩家';
  };

  return {
    getMyPlayer,
    getOtherPlayers,
    getLeftPlayer,
    getRightPlayer,
    getPlayerNameById,
  };
}