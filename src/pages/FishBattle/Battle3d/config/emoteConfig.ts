import { GAME_CONFIG } from './gameConfig';
import type { EmoteDefinition } from '../types/game';

/** 表情定义列表。 */
export const EMOTES: EmoteDefinition[] = GAME_CONFIG.emotes.definitions as EmoteDefinition[];

/** 按表情 ID 建立查表结构，方便运行时 O(1) 获取表情定义。 */
export const EMOTE_MAP = Object.fromEntries(EMOTES.map((emote) => [emote.id, emote])) as Record<EmoteDefinition['id'], EmoteDefinition>;
