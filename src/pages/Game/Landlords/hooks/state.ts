/**
 * 游戏状态管理（state）
 * - 默认状态
 * - 玩家数据标准化
 * - 状态合并
 */
import { GameState, PlayerState, PlayerRole } from '../types';
import { normalizePhase, isPlayingPhase } from '../types/phase';

export const defaultGameState: GameState = {
  roomId: '',
  gameType: 'LANDLORDS_CLASSIC',
  phase: 'waiting',
  bottomCards: [],
  currentPlayerId: '',
  currentRobScore: 0,
  highestRobScore: 0,
  players: [],
  handCards: [],
  lastPlayedCards: [],
  gameStarted: false,
};

/**
 * 从任意卡片数据中提取 cardId 数组
 * 支持 PokerCardVO 对象数组或字符串数组
 */
export const extractCardIds = (cards: any[]): string[] => {
  if (!cards || !Array.isArray(cards)) return [];
  return cards
    .map((card) => {
      if (card && typeof card === 'object' && card.id) return card.id;
      if (typeof card === 'string') return card;
      return '';
    })
    .filter(Boolean);
};

/**
 * 标准化单个玩家数据
 */
export const normalizePlayer = (
  p: any,
  landlordId: string | number | undefined,
): PlayerState & { id: string | number } => {
  let handCardIds: string[] = [];
  if (p.cards && Array.isArray(p.cards)) {
    handCardIds = extractCardIds(p.cards);
  }
  let currentPlayedCardIds: string[] = [];
  if (p.currentPlayedCards && Array.isArray(p.currentPlayedCards)) {
    currentPlayedCardIds = p.currentPlayedCards.map((card: any) =>
      typeof card === 'string' ? card : card?.id,
    );
  }
  const isLandlord =
    p.isLandlord || (landlordId && String(p.userId || p.id) === String(landlordId));
  return {
    ...p,
    id: p.id || p.userId,
    userId: p.id || p.userId,
    userName: p.userName || p.nickname || '未知玩家',
    cardCount: handCardIds.length || p.cardCount || 0,
    handCards: handCardIds,
    isOwner: p.role === PlayerRole.OWNER || p.role === 'owner',
    isReady: p.ready || p.isReady || false,
    isLandlord,
    isOnline: p.online ?? p.isOnline ?? true,
    currentPlayedCards: currentPlayedCardIds,
  };
};

/**
 * 合并玩家列表：保留前一次的临时状态（isRobotControlled / currentPlayedCards / isOnline）
 */
export const mergePlayers = (
  prevPlayers: PlayerState[] | undefined,
  incomingPlayers: any[] | null | undefined,
  landlordId?: string | number,
): PlayerState[] => {
  if (!prevPlayers || !incomingPlayers || !Array.isArray(incomingPlayers)) {
    return prevPlayers || [];
  }
  return incomingPlayers.map((incomingPlayer) => {
    const prevPlayer = prevPlayers.find(
      (p) => String(p.userId) === String(incomingPlayer.userId),
    );
    return {
      ...incomingPlayer,
      isRobotControlled:
        prevPlayer?.isRobotControlled ?? incomingPlayer.isRobotControlled ?? false,
      currentPlayedCards:
        prevPlayer?.currentPlayedCards ?? incomingPlayer.currentPlayedCards ?? [],
      isOnline: prevPlayer?.isOnline ?? incomingPlayer.isOnline ?? true,
    };
  });
};

/**
 * 取数字字段：data 中提供则使用 data；否则保留 prev
 * 后端可用 0/null 显式清除（如退出准备阶段时清空 readyPhaseStartTime）
 */
const numField = (data: any, key: string, prev: number | undefined): number | undefined => {
  if (!data || !(key in data)) return prev;
  const v = data[key];
  return typeof v === 'number' ? v : prev;
};

/**
 * 从服务器推送的 data payload 中提取标准化的 game state
 */
export const mergeGameState = (
  prev: GameState,
  data: any,
  normalizedPlayers: PlayerState[] | null,
  bottomCardIds: string[] | undefined | null,
  handCardIds: string[] | undefined | null,
): GameState => {
  const incomingPhase = data?.phase;
  const safeBottomCards = Array.isArray(bottomCardIds) ? bottomCardIds : [];
  const safeHandCards = Array.isArray(handCardIds) ? handCardIds : [];
  return {
    ...prev,
    ...data,
    phase: incomingPhase ? normalizePhase(incomingPhase) : prev.phase,
    gameStarted: incomingPhase ? isPlayingPhase(incomingPhase) : prev.gameStarted,
    players: (normalizedPlayers || prev.players || []) as PlayerState[],
    bottomCards: safeBottomCards.length > 0 ? safeBottomCards : (prev.bottomCards || []),
    currentPlayerId:
      data?.currentPlayerId || data?.currentRobPlayerId || prev.currentPlayerId,
    currentRobPlayerId: data?.currentRobPlayerId || prev.currentRobPlayerId,
    highestRobScore: data?.highestRobScore ?? data?.highestScore ?? prev.highestRobScore,
    landlordId: data?.landlordId || prev.landlordId,
    lastPlayedCards: data?.lastPlayedCards || data?.pokers || prev.lastPlayedCards,
    lastPlayedPlayerId:
      data?.lastPlayerId || data?.lastPlayedPlayerId || prev.lastPlayedPlayerId,
    lastPatternDesc: data?.lastPatternDesc || data?.pattern || prev.lastPatternDesc,
    readyPhaseStartTime: numField(data, 'readyPhaseStartTime', prev.readyPhaseStartTime),
  };
};