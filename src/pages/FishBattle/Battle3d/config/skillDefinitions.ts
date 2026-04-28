/**
 * 技能施法参数定义（精简版：仅保留普攻 + 召唤师技能）。
 * 英雄技能（Q/W/E/R）已移除，所有伤害来源于普攻。
 */

import type { SpellSlot, SpellTargetRules, SpellTargetType } from '../types/game';
import { useGameStore } from '../store/useGameStore';

/** 可作为技能目标的实体（champion 或 minion）的最小字段集。 */
export interface TargetableEntity {
  id: string;
  team: 'blue' | 'red';
  isDead: boolean;
  position: { x: number; y: number; z: number; distanceTo: (other: { x: number; y: number; z: number }) => number };
  statusEffects?: { statusId: string }[];
}

/** 单个技能的施法参数定义。 */
export interface SkillCastDefinition {
  /** 技能定义 ID。 */
  skillId: string;
  /** 技能槽位。 */
  slot: SpellSlot;
  /** 技能显示名称。 */
  name: string;
  /** 施法目标类型。 */
  targetType: SpellTargetType;
  /** 施法最大距离（单位：游戏世界坐标）。 */
  range: number;
  /** 技能效果半径，用于 target_point 类型的 AOE 指示器。 */
  radius?: number;
  /** 技能线宽，用于 directional 类型的线性指示器。 */
  width?: number;
  /** 单体技能目标筛选规则。 */
  targetRules?: SpellTargetRules;
}

/** 英雄 ID → 普攻施法参数定义 的映射表（仅 basicAttack）。 */
const HERO_BASIC_ATTACK_DEFINITIONS: Record<string, SkillCastDefinition> = {
  annie: { skillId: 'annie_basic_attack', slot: 'basicAttack', name: '普攻', targetType: 'target_unit', range: 7, targetRules: { enemyOnly: true, allowSelf: false } },
};

const SUMMONER_SPELL_DEFINITIONS: Record<string, SkillCastDefinition> = {
  flash: { skillId: 'flash', slot: 'summonerD', name: '闪现', targetType: 'target_point', range: 10 },
  ghost: { skillId: 'ghost', slot: 'summonerD', name: '疾跑', targetType: 'self_cast', range: 0 },
  heal: { skillId: 'heal', slot: 'summonerD', name: '治疗', targetType: 'self_cast', range: 0 },
};

/** 通用后备普攻定义。 */
const FALLBACK_BASIC_ATTACK: SkillCastDefinition = {
  skillId: 'generic_basic_attack',
  slot: 'basicAttack',
  name: '普攻',
  targetType: 'target_unit',
  range: 3.5,
  targetRules: { enemyOnly: true, allowSelf: false },
};

/**
 * 获取指定英雄指定技能槽位的施法参数定义。
 * 仅支持 basicAttack / summonerD / summonerF 槽位。
 */
export function getSkillCastDefinition(
  heroId: string,
  slot: SpellSlot,
  runtimeSkillId?: string | null,
): SkillCastDefinition | null {
  if ((slot === 'summonerD' || slot === 'summonerF') && runtimeSkillId) {
    const summonerDefinition = SUMMONER_SPELL_DEFINITIONS[runtimeSkillId];
    if (summonerDefinition) {
      return { ...summonerDefinition, slot };
    }
  }
  /* 优先从 store 读取后端下发的技能施法参数（单一数据源） */
  const serverDefs = useGameStore.getState().heroSkillCastDefs[heroId];
  if (serverDefs?.[slot]) {
    return serverDefs[slot];
  }
  if (slot === 'basicAttack') {
    return HERO_BASIC_ATTACK_DEFINITIONS[heroId] ?? FALLBACK_BASIC_ATTACK;
  }
  return null;
}

/**
 * 判断指定技能槽位是否需要进入瞄准模式。
 * self_cast 和 passive 类型不需要瞄准，直接释放。
 */
export function requiresAiming(heroId: string, slot: SpellSlot, runtimeSkillId?: string | null): boolean {
  if (slot === 'passive' || slot === 'recall') {
    return false;
  }
  const def = getSkillCastDefinition(heroId, slot, runtimeSkillId);
  if (!def) {
    return false;
  }
  return def.targetType !== 'self_cast';
}

/**
 * 判断某个候选目标是否满足当前技能的单体目标规则。
 * 该方法仅负责前端输入阶段的合法性过滤，最终结论仍以服务端权威校验为准。
 */
export function isTargetAllowedByRules(
  caster: TargetableEntity,
  target: TargetableEntity,
  rules?: SpellTargetRules | null,
): boolean {
  if (!caster || !target) {
    return false;
  }
  if (target.isDead) {
    return false;
  }
  const allowSelf = rules?.allowSelf ?? false;
  if (target.id === caster.id) {
    return allowSelf;
  }
  if (rules?.enemyOnly && target.team === caster.team) {
    return false;
  }
  if (rules?.allyOnly && target.team !== caster.team) {
    return false;
  }
  const targetStatuses = target.statusEffects ?? [];
  if (rules?.requiresTargetStatusId && !targetStatuses.some((status) => status.statusId === rules.requiresTargetStatusId)) {
    return false;
  }
  if (rules?.cannotTargetWithStatusId && targetStatuses.some((status) => status.statusId === rules.cannotTargetWithStatusId)) {
    return false;
  }
  return true;
}
