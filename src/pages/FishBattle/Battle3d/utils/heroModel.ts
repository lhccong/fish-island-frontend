import { getHeroAssetConfig } from '../config/heroConfig';
import { getAssetDirectory, isHttpUrl } from './assetUrl';

export function getHeroModelPath(
  heroId: string,
  options?: {
    skin?: string;
    overridePath?: string;
  },
): string {
  if (options?.overridePath) {
    return options.overridePath;
  }

  // skin 为在线 URL 时直接使用
  if (options?.skin && isHttpUrl(options.skin)) {
    return options.skin;
  }

  // 非 URL skin（显示名称）或无 skin → 走 assetConfig（CDN URL）
  const assetConfig = getHeroAssetConfig(heroId);
  if (!assetConfig || !assetConfig.modelPath) {
    return '';
  }
  return assetConfig.modelPath;
}

export function getHeroTextureBasePath(heroId: string, skin?: string): string {
  const assetConfig = getHeroAssetConfig(heroId);
  if (assetConfig?.textureBasePath) {
    return assetConfig.textureBasePath;
  }
  const modelPath = getHeroModelPath(heroId, { skin });
  return getAssetDirectory(modelPath) || '';
}
