/**
 * 斗地主游戏类型统一导出
 * 推荐按需从子文件导入：
 *   import { GameState, PlayerState } from '../types/state';
 *   import { GamePhase, GameEvent } from '../types/enums/game';
 * 同时保留从 '../types' 整体导入的兼容方式
 */

export * from './enums/room';
export * from './enums/game';
export * from './enums/player';
export * from './enums/action';
export * from './phase';
export * from './state';
export * from './protocol';