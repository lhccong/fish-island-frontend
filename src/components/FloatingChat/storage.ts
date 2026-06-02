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
  /** Excel 表格伪装模式 */
  excelMode: boolean;
  /** Excel 占满整个浏览器视口（隐藏站点菜单等背景） */
  excelViewportFullscreen: boolean;
  /** Excel 模式是否在单元格内展示图片，默认不展示 */
  excelShowImages: boolean;
}

/** 独立小窗页 body 暗黑模式 class */
export const FLOATING_CHAT_BODY_DARK_CLASS = 'floating-chat-body-dark';

/** 独立小窗页 Excel 全屏模式 class */
export const FLOATING_CHAT_EXCEL_FULLSCREEN_CLASS = 'floating-chat-excel-fullscreen';

/** 当前页 Excel 视口铺满 class（隐藏页面滚动与站点布局） */
export const FLOATING_CHAT_EXCEL_VIEWPORT_CLASS = 'floating-chat-excel-viewport';

function parseBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

const MIN_OPACITY = 30;
const MAX_OPACITY = 100;

export function clampFloatingChatOpacity(value: unknown): number {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : MAX_OPACITY;
  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, Math.round(n)));
}

/** 悬浮窗锚点距视口右下角的偏移（与 .popupCrWrapper 的 bottom/right 一致） */
export const FLOATING_CHAT_ANCHOR_OFFSET = 24;

/** 将悬浮窗 translate 偏移限制在视口内，避免拖出屏幕后无法操作 */
export function clampFloatingChatPos(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  anchor = FLOATING_CHAT_ANCHOR_OFFSET,
  inset = 8,
): { x: number; y: number } {
  const minX = inset - viewport.width + anchor + size.width;
  const maxX = anchor - inset;
  const minY = inset - viewport.height + anchor + size.height;
  const maxY = anchor - inset;

  return {
    x: Math.min(maxX, Math.max(minX, pos.x)),
    y: Math.min(maxY, Math.max(minY, pos.y)),
  };
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

export const FLOATING_CHAT_DEFAULT_POS = { x: 0, y: 0 };

export const FLOATING_CHAT_RESET_POSITION_EVENT = 'resetFloatingChatPosition';

const DEFAULT_SETTINGS: FloatingChatSettings = {
  mode: 'minimized',
  title: FLOATING_CHAT_DEFAULT_TITLE,
  pos: { ...FLOATING_CHAT_DEFAULT_POS },
  opacity: MAX_OPACITY,
  hideAvatar: false,
  collapseImages: false,
  darkMode: false,
  excelMode: false,
  excelViewportFullscreen: false,
  excelShowImages: false,
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
      excelMode: parseBool(parsed.excelMode, DEFAULT_SETTINGS.excelMode),
      excelViewportFullscreen: parseBool(
        parsed.excelViewportFullscreen,
        DEFAULT_SETTINGS.excelViewportFullscreen,
      ),
      excelShowImages: parseBool(parsed.excelShowImages, DEFAULT_SETTINGS.excelShowImages),
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

/** 重置悬浮窗位置为默认右下角，并通知各实例应用边界校正 */
export function resetFloatingChatPosition() {
  const current = loadFloatingChatSettings();
  const next = { ...current, pos: { ...FLOATING_CHAT_DEFAULT_POS } };
  saveFloatingChatSettings(next);
  emitFloatingChatChange({ pos: next.pos });
  window.dispatchEvent(new CustomEvent(FLOATING_CHAT_RESET_POSITION_EVENT));
}
