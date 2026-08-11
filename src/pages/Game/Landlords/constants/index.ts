/**
 * 斗地主游戏常量定义
 */

// 颜色主题 - 橙色摸鱼岛风格
export const COLORS = {
  // 游戏主色调
  gamePrimary: '#f97316',
  gameSecondary: '#f5f5f5',

  // 扑克牌颜色
  cardRed: '#dc2626',
  cardBlack: '#333333',
  cardBack: '#f97316',

  // 玩家角色
  landlordColor: '#ff4d4f',
  farmerColor: '#52c41a',

  // 状态颜色 - 橙色风格
  turnColor: '#f97316',
  timerDanger: '#ff4d4f',
  timerNormal: '#f97316',

  // 背景 - 白色主题
  gameBg: '#ffffff',
  tableBg: '#f5f5f5',

  // UI 颜色
  overlayBg: 'rgba(0, 0, 0, 0.85)',
  cardBg: '#ffffff',
  panelBg: '#ffffff',
  borderColor: '#e8e8e8',
  textPrimary: '#333333',
  textSecondary: '#999999',
};

// 布局尺寸
export const LAYOUT = {
  // 侧边玩家区域宽度
  sidePlayerWidth: 180,

  // 扑克牌尺寸（缩小以更适配合适布局）
  card: {
    small: { width: 38, height: 52 },
    normal: { width: 52, height: 72 },
    large: { width: 68, height: 92 },
  },

  // 间距
  padding: {
    small: 8,
    medium: 16,
    large: 24,
  },

  // 圆角
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
  },
};

// 动画时长 (毫秒)
export const ANIMATION = {
  cardSelect: 200,
  cardPlay: 300,
  dealCard: 100,
  fadeIn: 300,
  slideIn: 400,
};

// 游戏配置
export const GAME_CONFIG = {
  // 游戏人数
  playerCount: 3,

  // 初始手牌数
  initialHandCards: 17,

  // 底牌数
  bottomCardCount: 3,

  // 叫地主超时 (秒)
  robTimeout: 30,

  // 出牌超时 (秒)
  playTimeout: 30,

  // 准备超时（秒）：与后端 GameConstants.READY_TIMEOUT_MS 保持一致
  readyTimeout: 30,
};

// 叫地主分数选项
export const ROB_SCORES = [
  { value: 0, label: '不叫' },
  { value: 1, label: '1分' },
  { value: 2, label: '2分' },
  { value: 3, label: '3分' },
];

// 玩家状态标签
export const PLAYER_STATUS = {
  landlord: { label: '地主', color: 'red' },
  owner: { label: '房主', color: 'gold' },
  turn: { label: '轮到', color: 'yellow' },
  offline: { label: '离线', color: 'gray' },
  ready: { label: '已准备', color: 'green' },
  托管: { label: '托管中', color: 'orange' },
};
