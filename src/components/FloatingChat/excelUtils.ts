import { parseLuckyBagInline } from '@/components/LuckyBagMessage';
import { parseRedPacketInline } from '@/components/RedPacketMessage';

const UNDERCOVER_REGEX = /<undercover>[\s\S]*?<\/undercover>/gi;
const IMG_TAG_REGEX = /\[img\][\s\S]*?\[\/img\]/gi;
const IMAGE_REGEX = /!\[[^\]]*\]\([^)]+\)/g;
const LINK_REGEX = /\[([^\]]+)\]\([^)]+\)/g;
const HTML_TAG_REGEX = /<[^>]+>/g;
const MARKDOWN_NOISE_REGEX = /[#*_~`>|]/g;

export type ExcelCellPart = { type: 'text'; value: string } | { type: 'image'; url: string };

function isSpecialExcelMessage(content: string): boolean {
  return Boolean(parseRedPacketInline(content) || parseLuckyBagInline(content));
}

function stripExcelTextSegment(segment: string): string {
  let text = segment
    .replace(UNDERCOVER_REGEX, '[游戏邀请]')
    .replace(IMG_TAG_REGEX, '')
    .replace(IMAGE_REGEX, '')
    .replace(LINK_REGEX, '$1')
    .replace(HTML_TAG_REGEX, '')
    .replace(MARKDOWN_NOISE_REGEX, '')
    .replace(/\n+/g, ' ')
    .trim();
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

/** 将聊天内容转为 Excel 单元格中的纯文本（不展示图片） */
export function contentToExcelCell(content: string): string {
  const redPacket = parseRedPacketInline(content);
  if (redPacket) {
    return redPacket.prefix ? `${redPacket.prefix} [红包]` : '[红包]';
  }

  const luckyBag = parseLuckyBagInline(content);
  if (luckyBag) {
    return luckyBag.prefix ? `${luckyBag.prefix} [福袋]` : '[福袋]';
  }

  const text = stripExcelTextSegment(content);
  if (!text && (/\[img\][\s\S]*?\[\/img\]/i.test(content) || /!\[[^\]]*\]\([^)]+\)/.test(content))) {
    return '[图片]';
  }

  return text;
}

/** 解析 Excel 单元格内容（可含图片） */
export function parseExcelCellParts(content: string): ExcelCellPart[] {
  if (isSpecialExcelMessage(content)) {
    const text = contentToExcelCell(content);
    return text ? [{ type: 'text', value: text }] : [];
  }

  const combined = /\[img\]([\s\S]*?)\[\/img\]|!\[[^\]]*\]\(([^)]+)\)/gi;
  const parts: ExcelCellPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = stripExcelTextSegment(content.slice(lastIndex, match.index));
      if (text) parts.push({ type: 'text', value: text });
    }
    const url = (match[1] || match[2] || '').trim();
    if (url) parts.push({ type: 'image', url });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = stripExcelTextSegment(content.slice(lastIndex));
    if (text) parts.push({ type: 'text', value: text });
  }

  if (parts.length === 0) {
    const text = contentToExcelCell(content);
    return text ? [{ type: 'text', value: text }] : [];
  }

  return parts;
}

export function toMessageDate(value: unknown): Date {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function formatExcelTime(value: unknown): string {
  const date = toMessageDate(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const EXCEL_COLUMNS = [
  { key: 'A', label: '时间' },
  { key: 'B', label: '发言人' },
  { key: 'C', label: '内容' },
] as const;

/** 表格行高（含边框） */
export const EXCEL_ROW_HEIGHT = 21;

export type ExcelLayoutVariant = 'full' | 'compact' | 'mini';

export interface ExcelLayoutMetrics {
  rowNumWidth: number;
  colA: number;
  colB: number;
  colCMin: number;
  extraColWidth: number;
  maxExtraCols: number;
}

const EXTRA_COL_LETTERS = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const LAYOUT_METRICS: Record<ExcelLayoutVariant, ExcelLayoutMetrics> = {
  full: { rowNumWidth: 40, colA: 76, colB: 80, colCMin: 200, extraColWidth: 64, maxExtraCols: 24 },
  compact: { rowNumWidth: 36, colA: 56, colB: 60, colCMin: 100, extraColWidth: 48, maxExtraCols: 0 },
  mini: { rowNumWidth: 28, colA: 46, colB: 50, colCMin: 60, extraColWidth: 40, maxExtraCols: 0 },
};

export function getExcelLayoutMetrics(variant: ExcelLayoutVariant = 'full'): ExcelLayoutMetrics {
  return LAYOUT_METRICS[variant];
}

/** 根据可视区域宽度计算需渲染的扩展列数 */
export function getExcelExtraColumnCount(
  viewportWidth: number,
  variant: ExcelLayoutVariant = 'full',
): number {
  const m = getExcelLayoutMetrics(variant);
  if (m.maxExtraCols <= 0 || viewportWidth <= 0) return 0;
  const baseWidth = m.rowNumWidth + m.colA + m.colB + m.colCMin;
  const count = Math.ceil((viewportWidth - baseWidth) / m.extraColWidth);
  return Math.min(m.maxExtraCols, Math.max(0, count));
}

export function getExcelExtraColumnKeys(count: number): string[] {
  return EXTRA_COL_LETTERS.slice(0, Math.min(count, EXTRA_COL_LETTERS.length));
}

/** 根据可视区域高度计算空白填充行数 */
export function getExcelFillerRowCount(viewportHeight: number, dataRowCount: number): number {
  if (viewportHeight <= 0) return 25;
  const bodyHeight = Math.max(0, viewportHeight - EXCEL_ROW_HEIGHT);
  const visibleRows = Math.ceil(bodyHeight / EXCEL_ROW_HEIGHT);
  const dataRows = Math.max(1, dataRowCount);
  return Math.max(0, visibleRows - dataRows + 2);
}

export const EXCEL_RIBBON_TABS = ['文件', '开始', '插入', '页面布局', '公式', '数据', '审阅', '视图'] as const;

export const EXCEL_SHEET_TABS = ['消息记录', '汇总', 'Sheet3'] as const;

const DEFAULT_WORKBOOK_BASE = '工作簿1';

/** 将窗口标题映射为 Excel 工作簿文件名 */
export function getExcelWorkbookTitle(displayTitle: string): string {
  const trimmed = displayTitle.trim();
  if (!trimmed || trimmed === '鱼窝' || trimmed === '摸鱼室') {
    return `${DEFAULT_WORKBOOK_BASE}.xlsx`;
  }
  if (/\.xlsx?$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}.xlsx`;
}

export function getExcelWindowCaption(workbookTitle: string): string {
  return `${workbookTitle.replace(/\.xlsx?$/i, '')} - Excel`;
}

/** 根据消息行数计算当前编辑单元格（内容列 C） */
export function getExcelActiveCell(rowCount: number): string {
  return `C${Math.max(1, rowCount + 1)}`;
}
