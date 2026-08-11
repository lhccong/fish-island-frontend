/**
 * 扑克牌工具模块 - 统一导出
 * 提供牌面解析、排序、牌型判断等公共方法
 */

// 扑克牌花色枚举
export type CardSuit = 'SPADE' | 'HEART' | 'CLUB' | 'DIAMOND' | 'JOKER';
export type CardValue = number;

// 解析扑克牌 ID
export interface ParsedCard {
  value: number;           // 点数值 3-17
  suit: CardSuit | null;   // 花色
  isUniversal: boolean;    // 是否癞子
  displayValue: string;    // 显示文本
  symbol: string;          // 花色符号
  isRed: boolean;         // 是否红色
  color: string;           // 文字颜色
  bgColor: string;         // 背景颜色
}

// 牌值到显示文本映射
const VALUE_DISPLAY_MAP: Record<number, string> = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
  16: '小王', 17: '大王',
};

// 牌值到点值映射
const RANK_TO_VALUE: Record<string, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'j': 11, 'J': 11, 'q': 12, 'Q': 12, 'k': 13, 'K': 13,
  'a': 14, 'A': 14, '2': 15,
};

// 花色符号映射
const SUIT_SYMBOL: Record<CardSuit, string> = {
  SPADE: '♠',
  HEART: '♥',
  CLUB: '♣',
  DIAMOND: '♦',
  JOKER: '🃏',
};

// 花色顺序映射 (用于排序)
const SUIT_ORDER: Record<string, number> = {
  's': 0, 'S': 0,  // 黑桃
  'h': 1, 'H': 1,  // 红心
  'c': 2, 'C': 2,  // 梅花
  'd': 3, 'D': 3,  // 方块
};

/**
 * 解析扑克牌 ID，返回解析后的卡片信息
 * 支持格式:
 * - "♠3" / "♥K" -> 黑桃3 / 红心K (后端格式)
 * - "s3" / "hK" -> 黑桃3 / 红心K (前端格式)
 * - "s" / "sx" / "sj" -> 小王
 * - "x" / "dx" / "bj" -> 大王
 * - "*" -> 癞子
 * - "♠3#1" / "s3#2" -> 带序号后缀（支持多副牌），序号不参与解析，只用于标识区分
 */
export function parsePokerId(id: string): ParsedCard {
  if (!id) {
    return {
      value: 3,
      suit: 'SPADE',
      isUniversal: false,
      displayValue: '?',
      symbol: '?',
      isRed: false,
      color: '#888888',
      bgColor: '#f5f5f5',
    };
  }

  const idStr = id.toString();
  // 去掉序号后缀（如 "#1", "#2"），只解析牌面本身
  const baseId = idStr.split('#')[0];
  const idLower = baseId.toLowerCase();

  // 癞子牌
  if (baseId.startsWith('*')) {
    return {
      value: 14,
      suit: null,
      isUniversal: true,
      displayValue: '癞',
      symbol: '★',
      isRed: false,
      color: '#faad14',
      bgColor: '#fffbe6',
    };
  }

  // 小王 - 支持多种格式
  if (idLower === 's' || idLower === 'sx' || idLower === 'sj' || baseId === '🃏小王') {
    return {
      value: 16,
      suit: 'JOKER',
      isUniversal: false,
      displayValue: '小王',
      symbol: '🃏',
      isRed: false,
      color: '#888888',
      bgColor: '#f5f5f5',
    };
  }

  // 大王 - 支持多种格式
  if (idLower === 'x' || idLower === 'dx' || idLower === 'bj' || baseId === '🃏大王') {
    return {
      value: 17,
      suit: 'JOKER',
      isUniversal: false,
      displayValue: '大王',
      symbol: '🃏',
      isRed: true,
      color: '#ff4d4f',
      bgColor: '#fff1f0',
    };
  }

  // 解析花色和点数
  // 后端格式: ♠3, ♥K, ♣A, ♦2 (使用 Unicode 符号)
  // 前端格式: s3, hK, cA, d2 (使用小写字母)
  const firstChar = baseId[0];
  const remainingStr = baseId.substring(1);

  // 映射花色字符到花色类型
  let suit: CardSuit | null = null;
  let isRed = false;
  let suitChar = ''; // 用于显示的花色符号

  // 后端格式：使用 Unicode 符号
  if (firstChar === '♠' || firstChar === '♣') {
    suit = firstChar === '♠' ? 'SPADE' : 'CLUB';
    isRed = false;
    suitChar = firstChar;
  } else if (firstChar === '♥' || firstChar === '♦') {
    suit = firstChar === '♥' ? 'HEART' : 'DIAMOND';
    isRed = true;
    suitChar = firstChar;
  } else {
    // 前端格式：使用小写字母
    switch (firstChar.toLowerCase()) {
      case 's':
        suit = 'SPADE';
        isRed = false;
        suitChar = '♠';
        break;
      case 'h':
        suit = 'HEART';
        isRed = true;
        suitChar = '♥';
        break;
      case 'c':
        suit = 'CLUB';
        isRed = false;
        suitChar = '♣';
        break;
      case 'd':
        suit = 'DIAMOND';
        isRed = true;
        suitChar = '♦';
        break;
    }
  }

  if (suit) {
    const value = RANK_TO_VALUE[remainingStr.toLowerCase()] || parseInt(remainingStr, 10) || 0;
    return {
      value,
      suit,
      isUniversal: false,
      displayValue: VALUE_DISPLAY_MAP[value] || remainingStr,
      symbol: suitChar,
      isRed,
      color: isRed ? '#ef4444' : '#1f2937',
      // 牌面背景统一使用浅色，不管红黑花色
      bgColor: '#f9fafb',
    };
  }

  // 默认返回最小值
  return {
    value: 3,
    suit: 'SPADE',
    isUniversal: false,
    displayValue: '3',
    symbol: '♠',
    isRed: false,
    color: '#1f2937',
    bgColor: '#f9fafb',
  };
}

/**
 * 获取牌的排序值（用于手牌排序）
 * 返回值越小，牌越小
 */
export function getSortValue(cardId: string): number {
  const parsed = parsePokerId(cardId);
  return parsed.value;
}

/**
 * 判断是否是对子
 */
export function isPair(cards: string[]): boolean {
  if (cards.length !== 2) return false;
  const values = cards.map(c => parsePokerId(c).value);
  return values[0] === values[1];
}

/**
 * 判断是否是三张
 */
export function isTriple(cards: string[]): boolean {
  if (cards.length !== 3) return false;
  const values = cards.map(c => parsePokerId(c).value);
  return values[0] === values[1] && values[1] === values[2];
}

/**
 * 判断是否是炸弹（四张相同点数）
 */
export function isBomb(cards: string[]): boolean {
  if (cards.length !== 4) return false;
  const values = cards.map(c => parsePokerId(c).value);
  return values[0] === values[1] && values[1] === values[2] && values[2] === values[3];
}

/**
 * 判断是否是王炸
 */
export function isJokerBomb(cards: string[]): boolean {
  if (cards.length !== 2) return false;
  const values = cards.map(c => parsePokerId(c).value);
  return values.includes(16) && values.includes(17);
}

/**
 * 获取牌型描述
 */
export function getPatternDesc(cards: string[]): string {
  if (cards.length === 0) return '';
  if (isJokerBomb(cards)) return '王炸';
  if (isBomb(cards)) return '炸弹';
  if (isTriple(cards)) return '三张';
  if (isPair(cards)) return '对子';
  if (cards.length === 1) return '单张';

  // 检查顺子
  const values = cards.map(c => parsePokerId(c).value).sort((a, b) => a - b);
  if (values.length >= 5) {
    let isConsecutive = true;
    for (let i = 1; i < values.length; i++) {
      if (values[i] - values[i - 1] !== 1) {
        isConsecutive = false;
        break;
      }
    }
    if (isConsecutive) {
      return `${values.length}张顺子`;
    }
  }

  return `${cards.length}张`;
}

/**
 * 排序手牌（从小到大，按花色分组）
 * 排序规则：黑桃 → 红心 → 梅花 → 方块 → 大王 → 小王
 * 每组内按点数从小到大排列
 */
export function sortHandCards(cards: string[]): string[] {
  // 获取点数值
  const getValue = (card: string): number => {
    const cardLower = card.toLowerCase();

    // 癞子牌 - 癞子最大（排在最后）
    if (cardLower.startsWith('*')) return 100;
    // 小王
    if (cardLower === 's' || cardLower === 'sx' || cardLower === 'sj' || card === '🃏小王') return 16;
    // 大王
    if (cardLower === 'x' || cardLower === 'dx' || cardLower === 'bj' || card === '🃏大王') return 17;

    // 普通牌 - 去掉花色前缀获取点数
    let valueStr = card.substring(1).toLowerCase();
    // 处理后端格式 ♠3 等
    if (card[0] && '♠♥♣♦'.includes(card[0])) {
      valueStr = card.substring(1).toLowerCase();
    }

    // 数字牌直接转换
    const num = parseInt(valueStr, 10);
    if (!isNaN(num)) return num;

    // J/Q/K/A/2
    return RANK_TO_VALUE[valueStr] || 0;
  };

  // 获取花色优先级
  const getSuitOrder = (card: string): number => {
    const firstChar = card[0]?.toLowerCase();
    // 后端格式: ♠, ♥, ♣, ♦
    // 前端格式: s, h, c, d
    if (firstChar === '♠' || firstChar === 's') return 0;
    if (firstChar === '♥' || firstChar === 'h') return 1;
    if (firstChar === '♣' || firstChar === 'c') return 2;
    if (firstChar === '♦' || firstChar === 'd') return 3;
    return 4; // 大小王或其他
  };

  return [...cards].sort((a, b) => {
    // 先按点数排序（小的在前）
    const valueA = getValue(a);
    const valueB = getValue(b);
    if (valueA !== valueB) {
      return valueA - valueB;
    }
    // 同点数按花色排序
    return getSuitOrder(a) - getSuitOrder(b);
  });
}

/**
 * 获取扑克牌的 CSS 样式
 */
export function getCardStyle(cardId: string, size: 'small' | 'normal' | 'large' = 'normal') {
  const sizes = {
    small: { width: 40, height: 56, fontSize: 12 },
    normal: { width: 55, height: 75, fontSize: 16 },
    large: { width: 70, height: 96, fontSize: 20 },
  };

  const { width, height, fontSize } = sizes[size];
  const parsed = parsePokerId(cardId);

  return {
    width,
    height,
    backgroundColor: parsed.bgColor,
    color: parsed.color,
    fontSize,
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    border: '2px solid #d9d9d9',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };
}

/**
 * 渲染扑克牌内容
 */
export function renderCardContent(cardId: string, showBack = false) {
  if (showBack) {
    return {
      symbol: '?',
      displayValue: '',
      bgColor: '#1e40af',
      color: '#ffffff',
    };
  }

  const parsed = parsePokerId(cardId);
  return {
    symbol: parsed.symbol,
    displayValue: parsed.displayValue,
    bgColor: parsed.bgColor,
    color: parsed.color,
  };
}

/**
 * 判断牌能否打过上家出的牌
 */
export function canBeat(lastPlayed: string[], currentPlayed: string[]): boolean {
  if (!lastPlayed || lastPlayed.length === 0) return true;
  
  // 王炸最大
  if (isJokerBomb(currentPlayed)) return true;
  if (isJokerBomb(lastPlayed)) return false;
  
  // 普通炸弹
  if (isBomb(currentPlayed)) {
    if (!isBomb(lastPlayed)) return true;
    // 两个炸弹比较
    const currentValue = parsePokerId(currentPlayed[0]).value;
    const lastValue = parsePokerId(lastPlayed[0]).value;
    return currentValue > lastValue;
  }
  
  if (isBomb(lastPlayed)) return false;
  
  // 牌数必须相同
  if (currentPlayed.length !== lastPlayed.length) return false;
  
  // 比较点数
  const currentMax = Math.max(...currentPlayed.map(c => parsePokerId(c).value));
  const lastMax = Math.max(...lastPlayed.map(c => parsePokerId(c).value));
  
  return currentMax > lastMax;
}
