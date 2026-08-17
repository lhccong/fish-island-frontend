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
 * 兼容后端传回大写/小写阶段值，或数字状态码
 */
export const normalizePhase = (phase: string | number | undefined): string => {
  if (phase === undefined || phase === null) return 'waiting';
  if (typeof phase === 'number') {
    // 数字状态码映射（后端 GameRoom.RoomState）
    // 1=WAITING, 2=READY, 3=DISTRIBUTING, 4=ROBBING, 5=PLAYING
    const map: Record<number, string> = {
      1: 'waiting',
      2: 'waiting',  // 已准备但仍在等待开始
      3: 'dealing',
      4: 'robbing',
      5: 'playing',
      6: 'ending',
    };
    return map[phase] ?? 'waiting';
  }
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