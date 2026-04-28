import { GAME_CONFIG } from './gameConfig';

/**
 * 质量档位预设参数表。
 * 根据 qualityPreset 覆盖 GAME_CONFIG.render 中的对应字段，
 * 使低端设备可以通过切换档位获得流畅体验。
 */
/** 宽松的渲染配置类型，允许覆盖 as const 的字面量约束。 */
type RenderConfigOverrides = {
  [K in keyof typeof GAME_CONFIG.render]?: K extends 'dpr'
    ? [number, number]
    : K extends 'qualityPreset'
      ? string
      : (typeof GAME_CONFIG.render)[K] extends number ? number
        : (typeof GAME_CONFIG.render)[K] extends boolean ? boolean
          : (typeof GAME_CONFIG.render)[K];
};

const QUALITY_PRESETS: Record<string, RenderConfigOverrides> = {
  low: {
    dpr: [1, 1],
    enableShadows: false,
    shadowMapSize: 256,
    enableBloom: false,
    enableSnow: false,
    snowCount: 0,
  },
  medium: {
    dpr: [1, 1.5],
    enableShadows: true,
    shadowMapSize: 384,
    enableBloom: false,
    enableSnow: false,
    snowCount: 0,
  },
  high: {
    /* high 档不覆盖，直接使用 gameConfig 中的默认值 */
  },
  ultra: {
    dpr: [1, 2],
    shadowMapSize: 2048,
    snowCount: 2000,
  },
};

/**
 * 渲染配置导出。
 * 根据 qualityPreset 自动应用对应的质量档位参数覆盖，
 * 未覆盖的字段保留 GAME_CONFIG.render 的默认值。
 */
export const RENDER_CONFIG = {
  ...GAME_CONFIG.render,
  ...(QUALITY_PRESETS[GAME_CONFIG.render.qualityPreset] ?? {}),
};
