/**
 * 技能施法参数定义（前端瞄准指示器使用）。
 * 职责：
 *   1. 为 SpellAimIndicator 提供每个技能的施法目标类型、射程、宽度、半径等参数
 *   2. 运行时优先使用后端通过 room:info 下发的技能施法参数（单一数据源）
 *   3. 本文件硬编码表仅作为离线/未加载时的兜底回退
 *
 * 施法目标类型说明：
 *   - target_unit：需要选中敌方单位（如亚索 E / R、普攻）
 *   - directional：面向鼠标方向释放（如亚索 Q / W）
 *   - target_point：选择地面目标点释放（如 AOE 技能）
 *   - self_cast：自身施法，无需瞄准（如加速 Buff）
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

/** 英雄 ID → 技能槽位 → 施法参数定义 的映射表。 */
const HERO_SKILL_DEFINITIONS: Record<string, Partial<Record<SpellSlot, SkillCastDefinition>>> = {
  /* ========== 亚索 ========== */
  yasuo: {
    basicAttack: {
      skillId: 'yasuo_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 5,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'yasuo_q_steel_tempest',
      slot: 'q',
      name: '斩钢闪',
      targetType: 'directional',
      range: 10,
      width: 1.1,
    },
    w: {
      skillId: 'yasuo_w_wind_wall',
      slot: 'w',
      name: '风之障壁',
      targetType: 'directional',
      range: 5,
    },
    e: {
      skillId: 'yasuo_e_sweeping_blade',
      slot: 'e',
      name: '踏前斩',
      targetType: 'target_unit',
      range: 6,
      targetRules: { enemyOnly: true, allowSelf: false, cannotTargetWithStatusId: 'yasuo_e_target_mark' },
    },
    r: {
      skillId: 'yasuo_r_last_breath',
      slot: 'r',
      name: '狂风绝息斩',
      targetType: 'target_unit',
      range: 12,
      targetRules: { enemyOnly: true, allowSelf: false, requiresTargetStatusId: 'yasuo_last_breath_window' },
    },
  },

  /* ========== 布隆（坦克/辅助） ========== */
  braum: {
    basicAttack: {
      skillId: 'braum_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 3,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'braum_q_winters_bite',
      slot: 'q',
      name: '寒冬之咬',
      targetType: 'directional',
      range: 9,
      width: 1.0,
    },
    w: {
      skillId: 'braum_w_stand_behind_me',
      slot: 'w',
      name: '坚不可摧',
      targetType: 'self_cast',
      range: 0,
    },
    e: {
      skillId: 'braum_e_unbreakable',
      slot: 'e',
      name: '不屈之盾',
      targetType: 'self_cast',
      range: 0,
    },
    r: {
      skillId: 'braum_r_glacial_fissure',
      slot: 'r',
      name: '冰川裂缝',
      targetType: 'directional',
      range: 12,
      width: 2.0,
    },
  },

  /* ========== 诺手（坦克/战士） ========== */
  darius: {
    basicAttack: {
      skillId: 'darius_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 3.5,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'darius_q_decimate',
      slot: 'q',
      name: '大杀四方',
      targetType: 'self_cast',
      range: 0,
    },
    w: {
      skillId: 'darius_w_crippling_strike',
      slot: 'w',
      name: '致残打击',
      targetType: 'target_unit',
      range: 3.5,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    e: {
      skillId: 'darius_e_apprehend',
      slot: 'e',
      name: '强力牵引',
      targetType: 'directional',
      range: 5,
      width: 2.5,
    },
    r: {
      skillId: 'darius_r_noxian_guillotine',
      slot: 'r',
      name: '诺克萨斯断头台',
      targetType: 'target_unit',
      range: 5,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
  },

  /* ========== 蔚（战士） ========== */
  vi: {
    basicAttack: {
      skillId: 'vi_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 3,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'vi_q_vault_breaker',
      slot: 'q',
      name: '破坏冲拳',
      targetType: 'directional',
      range: 8,
      width: 1.2,
    },
    w: {
      skillId: 'vi_w_denting_blows',
      slot: 'w',
      name: '碎裂打击',
      targetType: 'self_cast',
      range: 0,
    },
    e: {
      skillId: 'vi_e_relentless_force',
      slot: 'e',
      name: '过度驱动',
      targetType: 'self_cast',
      range: 0,
    },
    r: {
      skillId: 'vi_r_assault_and_battery',
      slot: 'r',
      name: '突袭拘捕',
      targetType: 'target_unit',
      range: 10,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
  },

  /* ========== 拉克丝（法师） ========== */
  lux: {
    basicAttack: {
      skillId: 'lux_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 8,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'lux_q_light_binding',
      slot: 'q',
      name: '光之束缚',
      targetType: 'directional',
      range: 10,
      width: 0.8,
    },
    w: {
      skillId: 'lux_w_prismatic_barrier',
      slot: 'w',
      name: '棱光屏障',
      targetType: 'directional',
      range: 10,
      width: 0.6,
    },
    e: {
      skillId: 'lux_e_lucent_singularity',
      slot: 'e',
      name: '光辉奇点',
      targetType: 'target_point',
      range: 9,
      radius: 2.5,
    },
    r: {
      skillId: 'lux_r_final_spark',
      slot: 'r',
      name: '终极闪光',
      targetType: 'directional',
      range: 30,
      width: 1.5,
    },
  },

  /* ========== 安妮（法师） ========== */
  annie: {
    basicAttack: {
      skillId: 'annie_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 7,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'annie_q_disintegrate',
      slot: 'q',
      name: '碎裂之火',
      targetType: 'target_unit',
      range: 7,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    w: {
      skillId: 'annie_w_incinerate',
      slot: 'w',
      name: '焚烧',
      targetType: 'directional',
      range: 6,
      width: 3.0,
    },
    e: {
      skillId: 'annie_e_molten_shield',
      slot: 'e',
      name: '熔岩护盾',
      targetType: 'self_cast',
      range: 0,
    },
    r: {
      skillId: 'annie_r_summon_tibbers',
      slot: 'r',
      name: '提伯斯之怒',
      targetType: 'target_point',
      range: 8,
      radius: 3,
    },
  },

  /* ========== 艾希（射手） ========== */
  ashe: {
    basicAttack: {
      skillId: 'ashe_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 10,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'ashe_q_rangers_focus',
      slot: 'q',
      name: '游侠集中',
      targetType: 'self_cast',
      range: 0,
    },
    w: {
      skillId: 'ashe_w_volley',
      slot: 'w',
      name: '万箭齐发',
      targetType: 'directional',
      range: 10,
      width: 3.5,
    },
    e: {
      skillId: 'ashe_e_hawkshot',
      slot: 'e',
      name: '鹰击长空',
      targetType: 'directional',
      range: 25,
      width: 0.5,
    },
    r: {
      skillId: 'ashe_r_enchanted_crystal_arrow',
      slot: 'r',
      name: '魔法水晶箭',
      targetType: 'directional',
      range: 30,
      width: 1.2,
    },
  },

  /* ========== 烬（射手） ========== */
  jhin: {
    basicAttack: {
      skillId: 'jhin_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 10,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'jhin_q_dancing_grenade',
      slot: 'q',
      name: '跳弹奇兵',
      targetType: 'target_unit',
      range: 8,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    w: {
      skillId: 'jhin_w_deadly_flourish',
      slot: 'w',
      name: '致命绽放',
      targetType: 'directional',
      range: 25,
      width: 0.6,
    },
    e: {
      skillId: 'jhin_e_captive_audience',
      slot: 'e',
      name: '迷魅之雷',
      targetType: 'target_point',
      range: 10,
      radius: 1.0,
    },
    r: {
      skillId: 'jhin_r_curtain_call',
      slot: 'r',
      name: '美如画',
      targetType: 'directional',
      range: 25,
      width: 1.8,
    },
  },

  /* ========== 索拉卡（辅助） ========== */
  soraka: {
    basicAttack: {
      skillId: 'soraka_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 7,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'soraka_q_starcall',
      slot: 'q',
      name: '星之呼唤',
      targetType: 'target_point',
      range: 8,
      radius: 2.5,
    },
    w: {
      skillId: 'soraka_w_astral_infusion',
      slot: 'w',
      name: '星辉注入',
      targetType: 'target_unit',
      range: 7,
      targetRules: { allyOnly: true, allowSelf: false },
    },
    e: {
      skillId: 'soraka_e_equinox',
      slot: 'e',
      name: '昼夜交替',
      targetType: 'target_point',
      range: 9,
      radius: 2.0,
    },
    r: {
      skillId: 'soraka_r_wish',
      slot: 'r',
      name: '祈愿',
      targetType: 'self_cast',
      range: 0,
    },
  },

  /* ========== 璐璐（辅助） ========== */
  lulu: {
    basicAttack: {
      skillId: 'lulu_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 7,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'lulu_q_glitterlance',
      slot: 'q',
      name: '闪耀之矛',
      targetType: 'directional',
      range: 9,
      width: 0.8,
    },
    w: {
      skillId: 'lulu_w_whimsy',
      slot: 'w',
      name: '异想天开',
      targetType: 'target_unit',
      range: 7,
      targetRules: { allyOnly: true, allowSelf: true },
    },
    e: {
      skillId: 'lulu_e_help_pix',
      slot: 'e',
      name: '仙灵祝福',
      targetType: 'target_unit',
      range: 7,
      targetRules: { allyOnly: true, allowSelf: true },
    },
    r: {
      skillId: 'lulu_r_wild_growth',
      slot: 'r',
      name: '狂野生长',
      targetType: 'target_unit',
      range: 8,
      targetRules: { allyOnly: true, allowSelf: true },
    },
  },

  /* ========== 基础英雄模板（后备默认） ========== */
  template_basic_hero: {
    basicAttack: {
      skillId: 'template_basic_attack',
      slot: 'basicAttack',
      name: '普攻',
      targetType: 'target_unit',
      range: 4,
      targetRules: { enemyOnly: true, allowSelf: false },
    },
    q: {
      skillId: 'template_q_skill',
      slot: 'q',
      name: 'Q 技能模板',
      targetType: 'directional',
      range: 8,
      width: 1.1,
    },
    w: {
      skillId: 'template_w_skill',
      slot: 'w',
      name: 'W 技能模板',
      targetType: 'self_cast',
      range: 0,
    },
    e: {
      skillId: 'template_e_skill',
      slot: 'e',
      name: 'E 技能模板',
      targetType: 'target_point',
      range: 7,
    },
    r: {
      skillId: 'template_r_skill',
      slot: 'r',
      name: 'R 技能模板',
      targetType: 'target_point',
      range: 12,
      radius: 3,
    },
  },
};

const SUMMONER_SPELL_DEFINITIONS: Record<string, SkillCastDefinition> = {
  flash: {
    skillId: 'flash',
    slot: 'summonerD',
    name: '闪现',
    targetType: 'target_point',
    range: 10,
  },
  ghost: {
    skillId: 'ghost',
    slot: 'summonerD',
    name: '疾跑',
    targetType: 'self_cast',
    range: 0,
  },
  heal: {
    skillId: 'heal',
    slot: 'summonerD',
    name: '治疗',
    targetType: 'self_cast',
    range: 0,
  },
};

/** 通用后备定义：当英雄或槽位未注册时使用的默认参数。 */
const FALLBACK_DEFINITIONS: Partial<Record<SpellSlot, SkillCastDefinition>> = {
  basicAttack: {
    skillId: 'generic_basic_attack',
    slot: 'basicAttack',
    name: '普攻',
    targetType: 'target_unit',
    range: 3.5,
  },
  q: {
    skillId: 'generic_q',
    slot: 'q',
    name: 'Q',
    targetType: 'directional',
    range: 7,
    width: 1,
  },
  w: {
    skillId: 'generic_w',
    slot: 'w',
    name: 'W',
    targetType: 'self_cast',
    range: 0,
  },
  e: {
    skillId: 'generic_e',
    slot: 'e',
    name: 'E',
    targetType: 'target_point',
    range: 6,
  },
  r: {
    skillId: 'generic_r',
    slot: 'r',
    name: 'R',
    targetType: 'target_point',
    range: 10,
    radius: 3,
  },
};

/**
 * 获取指定英雄指定技能槽位的施法参数定义。
 * 查找顺序：英雄专属定义 → 通用后备定义 → null。
 */
export function getSkillCastDefinition(
  heroId: string,
  slot: SpellSlot,
  runtimeSkillId?: string | null,
): SkillCastDefinition | null {
  if ((slot === 'summonerD' || slot === 'summonerF') && runtimeSkillId) {
    const summonerDefinition = SUMMONER_SPELL_DEFINITIONS[runtimeSkillId];
    if (summonerDefinition) {
      return {
        ...summonerDefinition,
        slot,
      };
    }
  }
  /* 优先从 store 读取后端下发的技能施法参数（单一数据源） */
  const serverDefs = useGameStore.getState().heroSkillCastDefs[heroId];
  if (serverDefs?.[slot]) {
    return serverDefs[slot];
  }
  /* 回退：前端硬编码英雄专属定义（离线/未加载兜底） */
  const heroDefs = HERO_SKILL_DEFINITIONS[heroId];
  if (heroDefs?.[slot]) {
    return heroDefs[slot]!;
  }
  /* 后备定义 */
  return FALLBACK_DEFINITIONS[slot] ?? null;
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
