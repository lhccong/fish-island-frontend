import { useState, useCallback } from 'react';

/** 游戏窗口阶段 */
export type FishBattlePhase = 'heroSelect' | 'loading' | 'battle3d';

/** 阶段中文标签 */
export const PHASE_LABELS: Record<FishBattlePhase, string> = {
  heroSelect: '英雄选择',
  loading: '游戏加载',
  battle3d: '激战中',
};

/** 窗口默认尺寸（16:9 匹配 LOL 原生比例） */
const DEFAULT_SIZE = (() => {
  const ratio = 16 / 9;
  const maxW = Math.min(1280, Math.round(window.innerWidth * 0.85));
  const maxH = Math.min(720, Math.round(window.innerHeight * 0.85));
  let w = maxW;
  let h = Math.round(w / ratio);
  if (h > maxH) {
    h = maxH;
    w = Math.round(h * ratio);
  }
  return { width: w, height: h };
})();

/** 窗口默认位置（居中） */
const getDefaultPosition = () => ({
  x: Math.max(0, Math.round((window.innerWidth - DEFAULT_SIZE.width) / 2)),
  y: Math.max(0, Math.round((window.innerHeight - DEFAULT_SIZE.height) / 2)),
});

const STORAGE_KEY_SIZE = 'fish-battle-window-size';
const STORAGE_KEY_POS = 'fish-battle-window-position';
const STORAGE_KEY_VISIBLE = 'fish-battle-window-visible';

/** 同步检测浮动窗口是否打开（不依赖 React 状态，可在任何地方调用） */
export function isFishBattleWindowOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_VISIBLE) === '1';
  } catch {
    return false;
  }
}

/** 从 localStorage 恢复尺寸/位置 */
const loadPersistedSize = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIZE);
    if (raw) return JSON.parse(raw) as { width: number; height: number };
  } catch { /* ignore */ }
  return DEFAULT_SIZE;
};

const loadPersistedPosition = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POS);
    if (raw) return JSON.parse(raw) as { x: number; y: number };
  } catch { /* ignore */ }
  return getDefaultPosition();
};

/**
 * 摸鱼大乱斗浮动窗口全局状态
 *
 * 使用方式：const { ... } = useModel('fishBattleWindow');
 */
export default () => {
  const [visible, setVisible] = useState(false);
  const [phase, setPhaseState] = useState<FishBattlePhase>('heroSelect');
  const [roomCode, setRoomCode] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [windowSize, setWindowSize] = useState(loadPersistedSize);
  const [windowPosition, setWindowPosition] = useState(loadPersistedPosition);

  /** 打开游戏窗口 */
  const openWindow = useCallback((code: string, initialPhase: FishBattlePhase = 'heroSelect') => {
    setRoomCode(code);
    setPhaseState(initialPhase);
    setIsMinimized(false);
    setIsMaximized(false);
    setVisible(true);
    try { localStorage.setItem(STORAGE_KEY_VISIBLE, '1'); } catch { /* ignore */ }
  }, []);

  /** 关闭游戏窗口 */
  const closeWindow = useCallback(() => {
    setVisible(false);
    setRoomCode('');
    setIsMinimized(false);
    setIsMaximized(false);
    try { localStorage.removeItem(STORAGE_KEY_VISIBLE); } catch { /* ignore */ }
  }, []);

  /** 切换阶段 */
  const setPhase = useCallback((p: FishBattlePhase) => {
    setPhaseState(p);
  }, []);

  /** 最小化 / 还原 */
  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  /** 最大化 / 还原 */
  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);

  /** 更新窗口大小并持久化 */
  const updateSize = useCallback((size: { width: number; height: number }) => {
    setWindowSize(size);
    try {
      localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify(size));
    } catch { /* ignore */ }
  }, []);

  /** 更新窗口位置并持久化 */
  const updatePosition = useCallback((pos: { x: number; y: number }) => {
    setWindowPosition(pos);
    try {
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(pos));
    } catch { /* ignore */ }
  }, []);

  return {
    visible,
    phase,
    roomCode,
    isMinimized,
    isMaximized,
    windowSize,
    windowPosition,
    openWindow,
    closeWindow,
    setPhase,
    toggleMinimize,
    toggleMaximize,
    updateSize,
    updatePosition,
  };
};
