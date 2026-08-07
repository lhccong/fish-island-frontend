/**
 * 阶段别名 - 兼容代码中可能使用的大小写
 */
export const PHASE = {
  WAITING: 'waiting',
  ROBBING: 'robbing',
  PLAYING: 'playing',
} as const;

/**
 * 标准化阶段为小写
 * 兼容后端传回大写或小写阶段值
 */
export const normalizePhase = (phase: string | undefined): string => {
  if (!phase) return 'waiting';
  const upper = phase.toUpperCase();
  if (upper === 'WAITING') return 'waiting';
  if (upper === 'DEALING') return 'dealing';
  if (upper === 'ROBBING') return 'robbing';
  if (upper === 'LANDLORD_CONFIRMED') return 'landlord_confirmed';
  if (upper === 'PLAYING') return 'playing';
  if (upper === 'ENDING') return 'ending';
  if (upper === 'CLOSED') return 'closed';
  return 'waiting';
};

// 检查阶段是否在等待中
export const isWaitingPhase = (phase: string): boolean => {
  return phase === 'waiting' || phase === 'WAITING';
};

// 检查阶段是否在游戏中
export const isPlayingPhase = (phase: string): boolean => {
  return phase === 'playing' || phase === 'PLAYING';
};

// 检查阶段是否在叫地主
export const isRobbingPhase = (phase: string): boolean => {
  return phase === 'robbing' || phase === 'ROBBING';
};

// 检查阶段是否在确定地主（显示底牌）
export const isLandlordConfirmedPhase = (phase: string): boolean => {
  return phase === 'landlord_confirmed';
};

// 检查阶段是否可以出牌（地主确定后或出牌中）
export const canPlayPhase = (phase: string): boolean => {
  return isPlayingPhase(phase) || isLandlordConfirmedPhase(phase);
};

// 阶段联合类型
export type GamePhaseType = 'waiting' | 'robbing' | 'playing' | 'ending';