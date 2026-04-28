import { GAME_CONFIG } from './gameConfig';
import type { EmoteDefinition } from '../types/game';

/** 表情定义列表（可被后端配置覆盖后重建）。 */
export let EMOTES: EmoteDefinition[] = GAME_CONFIG.emotes.definitions as EmoteDefinition[];

/** 按表情 ID 建立查表结构，方便运行时 O(1) 获取表情定义。 */
export let EMOTE_MAP = Object.fromEntries(EMOTES.map((emote) => [emote.id, emote])) as Record<EmoteDefinition['id'], EmoteDefinition>;

/**
 * 在 GAME_CONFIG.emotes.definitions 被后端配置覆盖后调用，
 * 重建 EMOTES 列表和 EMOTE_MAP 查表结构。
 */
export function rebuildEmoteCache(): void {
  EMOTES = GAME_CONFIG.emotes.definitions as EmoteDefinition[];
  EMOTE_MAP = Object.fromEntries(EMOTES.map((emote) => [emote.id, emote])) as Record<EmoteDefinition['id'], EmoteDefinition>;
}
