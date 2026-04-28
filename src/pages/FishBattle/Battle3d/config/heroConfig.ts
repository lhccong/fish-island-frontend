import { GAME_CONFIG } from './gameConfig';
import type { HeroActionSlot, HeroAnimationConfig, HeroAssetConfig, HeroConfig } from '../types/game';
import type { FishBattleHero } from '../../types';

/**
 * 英雄基础静态配置表。
 * 每个英雄对象中的字段依次表示：
 * `heroId` 英雄唯一 ID，`name` 中文名，`nameEn` 英文名，`emoji` 识别图标，`role` 职业类型，
 * `baseHp/baseMp` 基础生命与法力，`baseAd/baseAp` 基础物理与法术伤害，
 * `baseArmor/baseMr` 基础双抗，`moveSpeed` 移速，`attackRange` 攻击距离，
 * `attackSpeed` 攻速，`bodyColor/accentColor` 程序化降级模型的主体色与强调色。
 */
const BASE_HEROES: Omit<HeroConfig, 'asset'>[] = [
  // {
  //   heroId: 'braum',
  //   name: '布隆',
  //   nameEn: 'Braum',
  //   emoji: '🛡️',
  //   role: 'tank',
  //   baseHp: 1200,
  //   baseMp: 400,
  //   baseAd: 55,
  //   baseAp: 0,
  //   baseArmor: 50,
  //   baseMr: 40,
  //   moveSpeed: 280,
  //   attackRange: 3,
  //   attackSpeed: 0.8,
  //   bodyColor: 0x2266cc,
  //   accentColor: 0x88bbff,
  // },
  // {
  //   heroId: 'darius',
  //   name: '诺手',
  //   nameEn: 'Darius',
  //   emoji: '🪓',
  //   role: 'tank',
  //   baseHp: 1100,
  //   baseMp: 350,
  //   baseAd: 70,
  //   baseAp: 0,
  //   baseArmor: 45,
  //   baseMr: 35,
  //   moveSpeed: 290,
  //   attackRange: 3.5,
  //   attackSpeed: 0.9,
  //   bodyColor: 0x882222,
  //   accentColor: 0xff6644,
  // },
  // {
  //   heroId: 'yasuo',
  //   name: '亚索',
  //   nameEn: 'Yasuo',
  //   emoji: '⚔️',
  //   role: 'fighter',
  //   baseHp: 900,
  //   baseMp: 0,
  //   baseAd: 65,
  //   baseAp: 0,
  //   baseArmor: 35,
  //   baseMr: 30,
  //   moveSpeed: 320,
  //   attackRange: 3,
  //   attackSpeed: 1.1,
  //   bodyColor: 0x3355aa,
  //   accentColor: 0x77aaff,
  // },
  // {
  //   heroId: 'vi',
  //   name: '蔚',
  //   nameEn: 'Vi',
  //   emoji: '👊',
  //   role: 'fighter',
  //   baseHp: 950,
  //   baseMp: 400,
  //   baseAd: 60,
  //   baseAp: 0,
  //   baseArmor: 40,
  //   baseMr: 32,
  //   moveSpeed: 310,
  //   attackRange: 3,
  //   attackSpeed: 1.0,
  //   bodyColor: 0xcc4488,
  //   accentColor: 0xff88bb,
  // },
  // {
  //   heroId: 'lux',
  //   name: '拉克丝',
  //   nameEn: 'Lux',
  //   emoji: '🔮',
  //   role: 'mage',
  //   baseHp: 800,
  //   baseMp: 600,
  //   baseAd: 45,
  //   baseAp: 85,
  //   baseArmor: 25,
  //   baseMr: 30,
  //   moveSpeed: 300,
  //   attackRange: 8,
  //   attackSpeed: 0.7,
  //   bodyColor: 0xccaa44,
  //   accentColor: 0xffdd88,
  // },
  // {
  //   heroId: 'annie',
  //   name: '安妮',
  //   nameEn: 'Annie',
  //   emoji: '🔥',
  //   role: 'mage',
  //   baseHp: 750,
  //   baseMp: 550,
  //   baseAd: 40,
  //   baseAp: 90,
  //   baseArmor: 22,
  //   baseMr: 30,
  //   moveSpeed: 295,
  //   attackRange: 7,
  //   attackSpeed: 0.7,
  //   bodyColor: 0xcc3322,
  //   accentColor: 0xff6644,
  // },
  // {
  //   heroId: 'ashe',
  //   name: '艾希',
  //   nameEn: 'Ashe',
  //   emoji: '🏹',
  //   role: 'marksman',
  //   baseHp: 700,
  //   baseMp: 500,
  //   baseAd: 70,
  //   baseAp: 0,
  //   baseArmor: 22,
  //   baseMr: 25,
  //   moveSpeed: 310,
  //   attackRange: 10,
  //   attackSpeed: 1.0,
  //   bodyColor: 0x4488cc,
  //   accentColor: 0x88ccff,
  // },
  // {
  //   heroId: 'jhin',
  //   name: '烬',
  //   nameEn: 'Jhin',
  //   emoji: '🎭',
  //   role: 'marksman',
  //   baseHp: 720,
  //   baseMp: 450,
  //   baseAd: 80,
  //   baseAp: 0,
  //   baseArmor: 24,
  //   baseMr: 25,
  //   moveSpeed: 300,
  //   attackRange: 10,
  //   attackSpeed: 0.6,
  //   bodyColor: 0x884466,
  //   accentColor: 0xcc88aa,
  // },
  // {
  //   heroId: 'soraka',
  //   name: '索拉卡',
  //   nameEn: 'Soraka',
  //   emoji: '💚',
  //   role: 'support',
  //   baseHp: 750,
  //   baseMp: 650,
  //   baseAd: 35,
  //   baseAp: 60,
  //   baseArmor: 20,
  //   baseMr: 35,
  //   moveSpeed: 305,
  //   attackRange: 7,
  //   attackSpeed: 0.6,
  //   bodyColor: 0x44aa66,
  //   accentColor: 0x88ffaa,
  // },
  // {
  //   heroId: 'lulu',
  //   name: '璐璐',
  //   nameEn: 'Lulu',
  //   emoji: '🌿',
  //   role: 'support',
  //   baseHp: 700,
  //   baseMp: 600,
  //   baseAd: 35,
  //   baseAp: 55,
  //   baseArmor: 22,
  //   baseMr: 35,
  //   moveSpeed: 310,
  //   attackRange: 7,
  //   attackSpeed: 0.6,
  //   bodyColor: 0x8844cc,
  //   accentColor: 0xbb88ff,
  // },
];

const STATIC_HERO_MAP = new Map<string, HeroConfig>(BASE_HEROES.map((hero) => {
  const asset = GAME_CONFIG.heroes.assets[hero.heroId];
  return [
    hero.heroId,
    {
      ...hero,
      asset,
      modelPath: hero.modelPath ?? asset?.modelPath,
      texturePath: hero.texturePath ?? asset?.textureBasePath,
    },
  ];
}));

const runtimeHeroMap = new Map<string, HeroConfig>();

function getFallbackPalette(heroId: string) {
  const seed = Array.from(heroId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const bodyHue = seed % 360;
  const accentHue = (bodyHue + 42) % 360;
  return {
    bodyColor: Number(`0x${hslToHex(bodyHue, 58, 48)}`),
    accentColor: Number(`0x${hslToHex(accentHue, 72, 66)}`),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = h / 360;
  const ss = s / 100;
  const ll = l / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const r = hue2rgb(p, q, hh + 1 / 3);
  const g = hue2rgb(p, q, hh);
  const b = hue2rgb(p, q, hh - 1 / 3);
  return [r, g, b]
    .map((value) => Math.round(value * 255).toString(16).padStart(2, '0'))
    .join('');
}

function mergeAnimationConfig(
  fallbackConfig?: HeroAnimationConfig,
  runtimeConfig?: Partial<HeroAnimationConfig>,
): HeroAnimationConfig {
  return {
    ...fallbackConfig,
    ...runtimeConfig,
    stateAliases: {
      ...(fallbackConfig?.stateAliases ?? {}),
      ...(runtimeConfig?.stateAliases ?? {}),
    },
    stateClips: {
      ...(fallbackConfig?.stateClips ?? {}),
      ...(runtimeConfig?.stateClips ?? {}),
    },
    actionClips: {
      ...(fallbackConfig?.actionClips ?? {}),
      ...(runtimeConfig?.actionClips ?? {}),
    },
    actionPlaybackRates: {
      ...(fallbackConfig?.actionPlaybackRates ?? {}),
      ...(runtimeConfig?.actionPlaybackRates ?? {}),
    },
    actionDurationsMs: {
      ...(fallbackConfig?.actionDurationsMs ?? {}),
      ...(runtimeConfig?.actionDurationsMs ?? {}),
    },
    actionMovementLocks: {
      ...(fallbackConfig?.actionMovementLocks ?? {}),
      ...(runtimeConfig?.actionMovementLocks ?? {}),
    },
  };
}

function parseRuntimeAssetConfig(assetConfig?: string): Partial<HeroAssetConfig> | null {
  if (!assetConfig) {
    return null;
  }
  try {
    const parsed = JSON.parse(assetConfig) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Partial<HeroAssetConfig> : null;
  } catch (error) {
    console.warn('[heroConfig] Failed to parse assetConfig:', error);
    return null;
  }
}

function mergeHeroAssetConfig(
  heroId: string,
  assetConfig?: string,
  fallbackAsset?: HeroAssetConfig,
): HeroAssetConfig | undefined {
  const runtimeAsset = parseRuntimeAssetConfig(assetConfig);
  if (!runtimeAsset && !fallbackAsset) {
    return undefined;
  }
  return {
    label: runtimeAsset?.label ?? fallbackAsset?.label ?? heroId,
    modelPath: runtimeAsset?.modelPath ?? fallbackAsset?.modelPath ?? '',
    textureBasePath: runtimeAsset?.textureBasePath ?? fallbackAsset?.textureBasePath,
    modelScale: runtimeAsset?.modelScale ?? fallbackAsset?.modelScale,
    groundOffsetY: runtimeAsset?.groundOffsetY ?? fallbackAsset?.groundOffsetY,
    animations: mergeAnimationConfig(fallbackAsset?.animations, runtimeAsset?.animations),
    voices: runtimeAsset?.voices ?? fallbackAsset?.voices,
    overhead: runtimeAsset?.overhead ?? fallbackAsset?.overhead,
  };
}

function buildRuntimeHeroConfig(hero: FishBattleHero): HeroConfig {
  const staticHero = STATIC_HERO_MAP.get(hero.heroId);
  const fallbackAsset = staticHero?.asset ?? GAME_CONFIG.heroes.assets[hero.heroId];
  const asset = mergeHeroAssetConfig(hero.heroId, hero.assetConfig, fallbackAsset);
  const fallbackPalette = getFallbackPalette(hero.heroId);
  return {
    heroId: hero.heroId,
    name: hero.name || staticHero?.name || hero.heroId,
    nameEn: hero.nameEn || staticHero?.nameEn || hero.heroId,
    emoji: hero.emoji || staticHero?.emoji || '🐟',
    role: (hero.role as HeroConfig['role']) || staticHero?.role || 'fighter',
    baseHp: Number(hero.baseHp ?? staticHero?.baseHp ?? 0),
    baseMp: Number(hero.baseMp ?? staticHero?.baseMp ?? 0),
    baseAd: Number(hero.baseAd ?? staticHero?.baseAd ?? 0),
    baseAp: Number(hero.baseAp ?? staticHero?.baseAp ?? 0),
    baseArmor: Number(hero.baseArmor ?? staticHero?.baseArmor ?? 0),
    baseMr: Number(hero.baseMr ?? staticHero?.baseMr ?? 0),
    moveSpeed: Number(hero.moveSpeed ?? staticHero?.moveSpeed ?? 300),
    attackRange: Number(hero.attackRange ?? staticHero?.attackRange ?? 0),
    attackSpeed: Number(hero.attackSpeed ?? staticHero?.attackSpeed ?? 0),
    modelPath: hero.modelUrl || staticHero?.modelPath || asset?.modelPath,
    texturePath: staticHero?.texturePath ?? asset?.textureBasePath,
    asset,
    bodyColor: staticHero?.bodyColor ?? fallbackPalette.bodyColor,
    accentColor: staticHero?.accentColor ?? fallbackPalette.accentColor,
  };
}

function mergeHeroConfig(staticHero?: HeroConfig, runtimeHero?: HeroConfig): HeroConfig | undefined {
  if (!staticHero && !runtimeHero) {
    return undefined;
  }
  if (!runtimeHero) {
    return staticHero;
  }
  if (!staticHero) {
    return runtimeHero;
  }
  return {
    ...staticHero,
    ...runtimeHero,
    asset: runtimeHero.asset ?? staticHero.asset,
    modelPath: runtimeHero.modelPath ?? staticHero.modelPath,
    texturePath: runtimeHero.texturePath ?? staticHero.texturePath,
  };
}

export function registerRuntimeHeroes(heroes: FishBattleHero[]): void {
  runtimeHeroMap.clear();
  heroes.forEach((hero) => {
    runtimeHeroMap.set(hero.heroId, buildRuntimeHeroConfig(hero));
  });
}

export function listHeroConfigs(): HeroConfig[] {
  const mergedHeroes = new Map<string, HeroConfig>();
  STATIC_HERO_MAP.forEach((hero, heroId) => {
    mergedHeroes.set(heroId, hero);
  });
  runtimeHeroMap.forEach((hero, heroId) => {
    mergedHeroes.set(heroId, mergeHeroConfig(mergedHeroes.get(heroId), hero) ?? hero);
  });
  return Array.from(mergedHeroes.values());
}

/**
 * 最终英雄配置表。
 * 这里会把基础数值配置与 `GAME_CONFIG.heroes.assets` 中的单资源模型/动画/语音配置合并。
 */
export function getHeroConfigs(): HeroConfig[] {
  return listHeroConfigs();
}

/** 根据英雄 ID 获取完整英雄配置。 */
export function getHeroConfig(heroId: string): HeroConfig | undefined {
  return mergeHeroConfig(STATIC_HERO_MAP.get(heroId), runtimeHeroMap.get(heroId));
}

/** 根据英雄 ID 获取资源配置。 */
export function getHeroAssetConfig(heroId: string): HeroAssetConfig | undefined {
  return getHeroConfig(heroId)?.asset;
}

/** 根据英雄 ID 获取动画映射配置。 */
export function getHeroAnimationConfig(heroId: string): HeroAnimationConfig | undefined {
  return getHeroAssetConfig(heroId)?.animations;
}

/** 根据英雄 ID 获取语音配置。 */
export function getHeroVoiceConfig(heroId: string) {
  return getHeroAssetConfig(heroId)?.voices;
}

/** 根据英雄 ID 获取头顶 HUD 挂点配置。 */
export function getHeroOverheadConfig(heroId: string) {
  return getHeroAssetConfig(heroId)?.overhead;
}

/** 根据英雄 ID 和动作槽位获取完整动作配置。 */
export function getHeroActionConfig(heroId: string, slot: HeroActionSlot) {
  const animationConfig = getHeroAnimationConfig(heroId);
  return {
    /** 当前触发的动作槽位。 */
    actionSlot: slot,
    /** 对应动作片段名。 */
    clipName: animationConfig?.actionClips?.[slot],
    /** 对应动作播放速率倍率。 */
    playbackRate: animationConfig?.actionPlaybackRates?.[slot],
    /** 对应动作持续时长。 */
    durationMs: animationConfig?.actionDurationsMs?.[slot],
    /** 对应动作是否锁定移动。 */
    lockMovement: animationConfig?.actionMovementLocks?.[slot],
  };
}
