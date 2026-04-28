import type { FacilityModelConfig, Team, TowerType } from '../types/game';
import { GAME_CONFIG } from './gameConfig';
import { MAP_CONFIG } from './mapConfig';

/** 场景设施资源配置。 */
export type FacilityAssetConfig = FacilityModelConfig;

/** 草丛配置。 */
export interface BushConfig {
  /** 草丛唯一标识。 */
  id: string;
  /** 草丛中心点坐标。 */
  position: [number, number, number];
  /** 草丛占位尺寸。 */
  size: [number, number, number];
  /** 草丛资源配置。 */
  asset: FacilityAssetConfig;
}

/** 防御塔视觉配置。 */
export interface TowerVisualConfig {
  /** 所属队伍。 */
  team: Team;
  /** 塔类型：外塔、内塔或门牙塔。 */
  type: TowerType;
  /** 塔资源配置。 */
  asset: FacilityAssetConfig;
  destroyedAsset?: FacilityAssetConfig;
}

/** 水晶枢纽视觉配置。 */
export interface NexusVisualConfig {
  /** 所属队伍。 */
  team: Team;
  /** 枢纽资源配置。 */
  asset: FacilityAssetConfig;
  destroyedAsset?: FacilityAssetConfig;
}

/** 小水晶（兵营水晶 / Inhibitor）视觉配置。 */
export interface InhibitorVisualConfig {
  /** 所属队伍。 */
  team: Team;
  /** 小水晶资源配置。 */
  asset: FacilityAssetConfig;
  destroyedAsset?: FacilityAssetConfig;
}

/** 生命遗迹视觉配置。 */
export interface RelicVisualConfig {
  /** 遗迹资源配置。 */
  asset: FacilityAssetConfig;
}

/** 中央遗迹视觉配置。 */
export interface RuinsVisualConfig {
  /** 遗迹资源配置。 */
  asset: FacilityAssetConfig;
}

/** 泉水视觉配置。 */
export interface FountainVisualConfig {
  /** 所属队伍。 */
  team: Team;
  /** 泉水中心点。 */
  position: [number, number, number];
  /** 泉水地面半径。 */
  radius: number;
  /** 泉水资源配置。 */
  asset: FacilityAssetConfig;
}

/** 根据单组草丛配置展开出前后两片草丛。 */
function createBushPair(
  prefix: string,
  group: {
    x: number;
    wallInset: number;
    size: [number, number, number];
    modelPath?: string;
    targetHeight: number;
    modelScale?: number;
    groundOffsetY?: number;
    rotationY?: number;
    animations?: FacilityModelConfig['animations'];
  },
): BushConfig[] {
  const wallZ = MAP_CONFIG.bridgeWidth / 2 - group.wallInset;
  return [
    {
      /** 草丛唯一标识。 */
      id: `${prefix}_front`,
      /** 草丛放置坐标。 */
      position: [group.x, 0, -wallZ],
      /** 草丛占位尺寸。 */
      size: group.size,
      /** 草丛资源配置。 */
      asset: {
        modelPath: group.modelPath,
        targetHeight: group.targetHeight,
        modelScale: group.modelScale,
        groundOffsetY: group.groundOffsetY,
        rotationY: group.rotationY,
        animations: group.animations,
      },
    },
    {
      id: `${prefix}_back`,
      position: [group.x, 0, wallZ],
      size: group.size,
      asset: {
        modelPath: group.modelPath,
        targetHeight: group.targetHeight,
        modelScale: group.modelScale,
        groundOffsetY: group.groundOffsetY,
        rotationY: group.rotationY,
        animations: group.animations,
      },
    },
  ];
}

/** 草丛配置列表（惰性求值，确保读取 overlay 后的值）。 */
export function getBushesConfig(): BushConfig[] {
  return [
    ...createBushPair('bush_left', GAME_CONFIG.environment.bushes.left),
    ...createBushPair('bush_center', GAME_CONFIG.environment.bushes.center),
    ...createBushPair('bush_right', GAME_CONFIG.environment.bushes.right),
  ];
}

/** 防御塔资源配置表（惰性求值，确保读取 overlay 后的值）。 */
export function getTowerAssetConfig(): Record<string, TowerVisualConfig> {
  return {
  blue_outer: {
    /** 蓝队。 */
    team: 'blue',
    /** 外塔。 */
    type: 'outer',
    /** 模型目标高度。 */
    asset: {
      modelPath: GAME_CONFIG.environment.towers.blueOuterModelPath,
      targetHeight: GAME_CONFIG.environment.towers.outerTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.outerModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.outerGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.blueRotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.towers.outerIdleClip,
        deathClip: GAME_CONFIG.environment.towers.outerDeathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.towers.blueOuterDestroyedModelPath,
      targetHeight: GAME_CONFIG.environment.towers.outerDestroyedTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.outerDestroyedModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.outerDestroyedGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.blueRotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.towers.outerDeathClip,
      },
    },
  },
  blue_inner: {
    team: 'blue',
    type: 'inner',
    asset: {
      modelPath: GAME_CONFIG.environment.towers.blueInnerModelPath,
      targetHeight: GAME_CONFIG.environment.towers.innerTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.innerModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.innerGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.blueRotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.towers.innerIdleClip,
        deathClip: GAME_CONFIG.environment.towers.innerDeathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.towers.blueInnerDestroyedModelPath,
      targetHeight: GAME_CONFIG.environment.towers.innerDestroyedTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.innerDestroyedModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.innerDestroyedGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.blueRotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.towers.innerDeathClip,
      },
    },
  },
  blue_nexusGuard: {
    team: 'blue',
    type: 'nexusGuard',
    asset: {
      modelPath: GAME_CONFIG.environment.towers.blueNexusGuardModelPath,
      targetHeight: GAME_CONFIG.environment.towers.nexusGuardTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.nexusGuardModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.nexusGuardGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.blueRotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.towers.nexusGuardIdleClip,
        deathClip: GAME_CONFIG.environment.towers.nexusGuardDeathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.towers.blueNexusGuardDestroyedModelPath,
      targetHeight: GAME_CONFIG.environment.towers.nexusGuardDestroyedTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.nexusGuardDestroyedModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.nexusGuardDestroyedGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.blueRotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.towers.nexusGuardDeathClip,
      },
    },
  },
  red_outer: {
    team: 'red',
    type: 'outer',
    asset: {
      modelPath: GAME_CONFIG.environment.towers.redOuterModelPath,
      targetHeight: GAME_CONFIG.environment.towers.outerTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.outerModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.outerGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.redRotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.towers.outerIdleClip,
        deathClip: GAME_CONFIG.environment.towers.outerDeathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.towers.redOuterDestroyedModelPath,
      targetHeight: GAME_CONFIG.environment.towers.outerDestroyedTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.outerDestroyedModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.outerDestroyedGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.redRotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.towers.outerDeathClip,
      },
    },
  },
  red_inner: {
    team: 'red',
    type: 'inner',
    asset: {
      modelPath: GAME_CONFIG.environment.towers.redInnerModelPath,
      targetHeight: GAME_CONFIG.environment.towers.innerTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.innerModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.innerGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.redRotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.towers.innerIdleClip,
        deathClip: GAME_CONFIG.environment.towers.innerDeathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.towers.redInnerDestroyedModelPath,
      targetHeight: GAME_CONFIG.environment.towers.innerDestroyedTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.innerDestroyedModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.innerDestroyedGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.redRotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.towers.innerDeathClip,
      },
    },
  },
  red_nexusGuard: {
    team: 'red',
    type: 'nexusGuard',
    asset: {
      modelPath: GAME_CONFIG.environment.towers.redNexusGuardModelPath,
      targetHeight: GAME_CONFIG.environment.towers.nexusGuardTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.nexusGuardModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.nexusGuardGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.redRotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.towers.nexusGuardIdleClip,
        deathClip: GAME_CONFIG.environment.towers.nexusGuardDeathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.towers.redNexusGuardDestroyedModelPath,
      targetHeight: GAME_CONFIG.environment.towers.nexusGuardDestroyedTargetHeight,
      modelScale: GAME_CONFIG.environment.towers.nexusGuardDestroyedModelScale,
      groundOffsetY: GAME_CONFIG.environment.towers.nexusGuardDestroyedGroundOffsetY,
      rotationY: GAME_CONFIG.environment.towers.redRotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.towers.nexusGuardDeathClip,
      },
    },
  },
  };
}

/** 水晶枢纽资源配置表（惰性求值）。 */
export function getNexusAssetConfig(): Record<Team, NexusVisualConfig> {
  return {
  blue: {
    /** 蓝队枢纽。 */
    team: 'blue',
    /** 模型目标高度。 */
    asset: {
      modelPath: GAME_CONFIG.environment.nexus.blueModelPath,
      targetHeight: GAME_CONFIG.environment.nexus.targetHeight,
      modelScale: GAME_CONFIG.environment.nexus.modelScale,
      groundOffsetY: GAME_CONFIG.environment.nexus.groundOffsetY,
      rotationY: GAME_CONFIG.environment.nexus.blueRotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.nexus.idleClip,
        damagedClip: GAME_CONFIG.environment.nexus.damagedClip,
        criticalClip: GAME_CONFIG.environment.nexus.criticalClip,
        deathClip: GAME_CONFIG.environment.nexus.deathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.nexus.blueDestroyedModelPath,
      targetHeight: GAME_CONFIG.environment.nexus.targetHeight,
      modelScale: GAME_CONFIG.environment.nexus.modelScale,
      groundOffsetY: GAME_CONFIG.environment.nexus.groundOffsetY,
      rotationY: GAME_CONFIG.environment.nexus.blueRotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.nexus.deathClip,
      },
    },
  },
  red: {
    /** 红队枢纽。 */
    team: 'red',
    /** 模型目标高度。 */
    asset: {
      modelPath: GAME_CONFIG.environment.nexus.redModelPath,
      targetHeight: GAME_CONFIG.environment.nexus.targetHeight,
      modelScale: GAME_CONFIG.environment.nexus.modelScale,
      groundOffsetY: GAME_CONFIG.environment.nexus.groundOffsetY,
      rotationY: GAME_CONFIG.environment.nexus.redRotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.nexus.idleClip,
        damagedClip: GAME_CONFIG.environment.nexus.damagedClip,
        criticalClip: GAME_CONFIG.environment.nexus.criticalClip,
        deathClip: GAME_CONFIG.environment.nexus.deathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.nexus.redDestroyedModelPath,
      targetHeight: GAME_CONFIG.environment.nexus.targetHeight,
      modelScale: GAME_CONFIG.environment.nexus.modelScale,
      groundOffsetY: GAME_CONFIG.environment.nexus.groundOffsetY,
      rotationY: GAME_CONFIG.environment.nexus.redRotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.nexus.deathClip,
      },
    },
  },
  };
}

/** 小水晶（兵营水晶 / Inhibitor）资源配置表（惰性求值）。 */
export function getInhibitorAssetConfig(): Record<Team, InhibitorVisualConfig> {
  return {
  blue: {
    /** 蓝队小水晶。 */
    team: 'blue',
    asset: {
      modelPath: GAME_CONFIG.environment.inhibitor.blue.modelPath,
      targetHeight: GAME_CONFIG.environment.inhibitor.blue.targetHeight,
      modelScale: GAME_CONFIG.environment.inhibitor.blue.modelScale,
      groundOffsetY: GAME_CONFIG.environment.inhibitor.blue.groundOffsetY,
      rotationY: GAME_CONFIG.environment.inhibitor.blue.rotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.inhibitor.blue.idleClip,
        deathClip: GAME_CONFIG.environment.inhibitor.blue.deathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.inhibitor.blue.destroyedModelPath,
      targetHeight: GAME_CONFIG.environment.inhibitor.blue.targetHeight,
      modelScale: GAME_CONFIG.environment.inhibitor.blue.modelScale,
      groundOffsetY: GAME_CONFIG.environment.inhibitor.blue.groundOffsetY,
      rotationY: GAME_CONFIG.environment.inhibitor.blue.rotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.inhibitor.blue.deathClip,
      },
    },
  },
  red: {
    /** 红队小水晶。 */
    team: 'red',
    asset: {
      modelPath: GAME_CONFIG.environment.inhibitor.red.modelPath,
      targetHeight: GAME_CONFIG.environment.inhibitor.red.targetHeight,
      modelScale: GAME_CONFIG.environment.inhibitor.red.modelScale,
      groundOffsetY: GAME_CONFIG.environment.inhibitor.red.groundOffsetY,
      rotationY: GAME_CONFIG.environment.inhibitor.red.rotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.inhibitor.red.idleClip,
        deathClip: GAME_CONFIG.environment.inhibitor.red.deathClip,
      },
    },
    destroyedAsset: {
      modelPath: GAME_CONFIG.environment.inhibitor.red.destroyedModelPath,
      targetHeight: GAME_CONFIG.environment.inhibitor.red.targetHeight,
      modelScale: GAME_CONFIG.environment.inhibitor.red.modelScale,
      groundOffsetY: GAME_CONFIG.environment.inhibitor.red.groundOffsetY,
      rotationY: GAME_CONFIG.environment.inhibitor.red.rotationY,
      animations: {
        deathClip: GAME_CONFIG.environment.inhibitor.red.deathClip,
      },
    },
  },
  };
}

/** 生命遗迹资源配置（惰性求值）。 */
export function getRelicAssetConfig(): RelicVisualConfig {
  return {
  /** 模型目标高度。 */
  asset: {
    modelPath: GAME_CONFIG.environment.relic.modelPath,
    targetHeight: GAME_CONFIG.environment.relic.targetHeight,
    rotationY: GAME_CONFIG.environment.relic.rotationY,
    animations: {
      idleClip: GAME_CONFIG.environment.relic.idleClip,
    },
  },
  };
}

/** 中央遗迹资源配置（惰性求值）。 */
export function getRuinsAssetConfig(): RuinsVisualConfig {
  return {
  asset: {
    modelPath: GAME_CONFIG.environment.ruins.modelPath,
    targetHeight: GAME_CONFIG.environment.ruins.targetHeight,
    rotationY: GAME_CONFIG.environment.ruins.rotationY,
    animations: {
      idleClip: GAME_CONFIG.environment.ruins.idleClip,
    },
  },
  };
}

/** 泉水配置表（惰性求值）。 */
export function getFountainAssetConfig(): Record<Team, FountainVisualConfig> {
  return {
  blue: {
    team: 'blue',
    position: GAME_CONFIG.environment.fountain.blue.position,
    radius: GAME_CONFIG.environment.fountain.blue.radius,
    asset: {
      modelPath: GAME_CONFIG.environment.fountain.blue.modelPath,
      targetHeight: GAME_CONFIG.environment.fountain.blue.targetHeight,
      rotationY: GAME_CONFIG.environment.fountain.blue.rotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.fountain.blue.idleClip,
      },
    },
  },
  red: {
    team: 'red',
    position: GAME_CONFIG.environment.fountain.red.position,
    radius: GAME_CONFIG.environment.fountain.red.radius,
    asset: {
      modelPath: GAME_CONFIG.environment.fountain.red.modelPath,
      targetHeight: GAME_CONFIG.environment.fountain.red.targetHeight,
      rotationY: GAME_CONFIG.environment.fountain.red.rotationY,
      animations: {
        idleClip: GAME_CONFIG.environment.fountain.red.idleClip,
      },
    },
  },
  };
}
