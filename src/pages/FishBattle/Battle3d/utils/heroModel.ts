import { getHeroAssetConfig } from '../config/heroConfig';
import { getAssetDirectory, resolveAssetUrl } from './assetUrl';

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

  if (options?.skin) {
    if (options.skin.startsWith('http://') || options.skin.startsWith('https://')) {
      return options.skin;
    }
    const skinModelPath = `/models/heroes/${heroId}/${options.skin}.glb`;
    return resolveAssetUrl(skinModelPath) ?? skinModelPath;
  }

  const assetConfig = getHeroAssetConfig(heroId);
  // 没有 asset 配置（后端未下发）或 modelPath 为空 → 返回空字符串，走程序化降级渲染
  if (!assetConfig || !assetConfig.modelPath) {
    return '';
  }
  return assetConfig.modelPath;
}

export function getHeroTextureBasePath(heroId: string, skin?: string): string {
  const modelPath = getHeroModelPath(heroId, { skin });
  return getHeroAssetConfig(heroId)?.textureBasePath
    || getAssetDirectory(modelPath)
    || resolveAssetUrl(`/models/heroes/${heroId}/`)
    || `/models/heroes/${heroId}/`;
}
