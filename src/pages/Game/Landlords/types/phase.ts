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

// 调用方在 setGameState 入口统一过 normalizePhase，
// 故 isXxxPhase 只判断小写 —— 无需再写大写 OR
export const isWaitingPhase = (phase: string): boolean => phase === 'waiting';
export const isPlayingPhase = (phase: string): boolean => phase === 'playing';
export const isRobbingPhase = (phase: string): boolean => phase === 'robbing';
export const isEndingPhase = (phase: string): boolean => phase === 'ending';

export const isLandlordConfirmedPhase = (phase: string): boolean => phase === 'landlord_confirmed';

export const canPlayPhase = (phase: string): boolean => {
  return isPlayingPhase(phase) || isLandlordConfirmedPhase(phase);
};

// 阶段联合类型
export type GamePhaseType = 'waiting' | 'robbing' | 'playing' | 'ending';