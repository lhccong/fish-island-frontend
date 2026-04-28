import type { MapConfig } from '../types/game';
import { GAME_CONFIG } from './gameConfig';

/** 地图主配置导出，统一来自总配置表。 */
export const MAP_CONFIG: MapConfig = GAME_CONFIG.map;

/**
 * 队伍配色表。
 * 用于头顶 HUD、建筑、提示文本和选中色等视觉元素复用。
 */
export const TEAM_COLORS = {
  blue: {
    /** 蓝队主色。 */
    primary: 0x4488ff,
    /** 蓝队高亮色。 */
    light: 0x88bbff,
    /** 蓝队 CSS 颜色字符串。 */
    css: '#64b5f6',
  },
  red: {
    /** 红队主色。 */
    primary: 0xff4444,
    /** 红队高亮色。 */
    light: 0xff8888,
    /** 红队 CSS 颜色字符串。 */
    css: '#ef5350',
  },
  me: {
    /** 本地玩家强调主色。 */
    primary: 0xddaa00,
    /** 本地玩家 CSS 颜色字符串。 */
    css: '#fde047',
  },
};
