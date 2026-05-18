export type FloatingChatMode = 'minimized' | 'small' | 'normal';

/** 悬浮窗标题最大长度 */
export const FLOATING_CHAT_TITLE_MAX_LENGTH = 20;

/** 旧版默认标题，加载时迁移为「鱼窝」 */
const LEGACY_DEFAULT_TITLE = '摸鱼室';

export const FLOATING_CHAT_DEFAULT_TITLE = '鱼窝';

export interface FloatingChatSettings {
  mode: FloatingChatMode;
  title: string;
  pos: { x: number; y: number };
  /** 窗口不透明度 30–100，100 为完全不透明 */
  opacity: number;
  /** 消息列表隐藏用户头像 */
  hideAvatar: boolean;
  /** 默认收起消息中的图片 */
  collapseImages: boolean;
  /** 暗黑模式 */
  darkMode: boolean;
}

/** 独立小窗页 body 暗黑模式 class */
export const FLOATING_CHAT_BODY_DARK_CLASS = 'floating-chat-body-dark';

function parseBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

const MIN_OPACITY = 30;
const MAX_OPACITY = 100;

export function clampFloatingChatOpacity(value: unknown): number {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : MAX_OPACITY;
  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, Math.round(n)));
}

const STORAGE_KEY = 'floatingChatSetting';

export function normalizeFloatingChatTitle(value: unknown): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed || trimmed === LEGACY_DEFAULT_TITLE) {
    return FLOATING_CHAT_DEFAULT_TITLE;
  }
  return trimmed.slice(0, FLOATING_CHAT_TITLE_MAX_LENGTH);
}

export function getFloatingChatDisplayTitle(title: string): string {
  return normalizeFloatingChatTitle(title);
}

const DEFAULT_SETTINGS: FloatingChatSettings = {
  mode: 'minimized',
  title: FLOATING_CHAT_DEFAULT_TITLE,
  pos: { x: 0, y: 0 },
  opacity: MAX_OPACITY,
  hideAvatar: false,
  collapseImages: false,
  darkMode: false,
};

export function loadFloatingChatSettings(): FloatingChatSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<FloatingChatSettings>;
    const rawTitle = typeof parsed.title === 'string' ? parsed.title : undefined;
    const settings: FloatingChatSettings = {
      mode:
        parsed.mode === 'minimized' || parsed.mode === 'small' || parsed.mode === 'normal'
          ? parsed.mode
          : DEFAULT_SETTINGS.mode,
      title: rawTitle !== undefined ? normalizeFloatingChatTitle(rawTitle) : DEFAULT_SETTINGS.title,
      pos: {
        x: typeof parsed.pos?.x === 'number' ? parsed.pos.x : 0,
        y: typeof parsed.pos?.y === 'number' ? parsed.pos.y : 0,
      },
      opacity: clampFloatingChatOpacity(parsed.opacity),
      hideAvatar: parseBool(parsed.hideAvatar, DEFAULT_SETTINGS.hideAvatar),
      collapseImages: parseBool(parsed.collapseImages, DEFAULT_SETTINGS.collapseImages),
      darkMode: parseBool(parsed.darkMode, DEFAULT_SETTINGS.darkMode),
    };
    if (rawTitle !== undefined && rawTitle !== settings.title) {
      saveFloatingChatSettings(settings);
    }
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveFloatingChatSettings(settings: FloatingChatSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const FLOATING_CHAT_EVENT = 'floatingChatChange';

export function emitFloatingChatChange(detail?: Partial<FloatingChatSettings>) {
  window.dispatchEvent(new CustomEvent(FLOATING_CHAT_EVENT, { detail }));
}
