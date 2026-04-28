import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { getHeroConfig } from '../../config/heroConfig';
import { getBushesConfig, getFountainAssetConfig, getInhibitorAssetConfig, getNexusAssetConfig, getRelicAssetConfig, getTowerAssetConfig } from '../../config/environmentConfig';
import { getHeroModelPath } from '../../utils/heroModel';
import { threejsHelper } from '../../utils/ThreejsHelper';

export function usePreloadSceneModels() {
  const heroModelKeys = useGameStore(useShallow((s) => Array.from(new Set(
    s.champions.map((champion) => `${champion.heroId}|${champion.skin ?? ''}`),
  )).sort()));
  const beginAssetLoading = useGameStore((s) => s.beginAssetLoading);
  const updateAssetLoading = useGameStore((s) => s.updateAssetLoading);
  const finishAssetLoading = useGameStore((s) => s.finishAssetLoading);
  const setLoadingError = useGameStore((s) => s.setLoadingError);

  const sceneModelUrls = useMemo(() => {
    const heroUrls = Array.from(new Set(heroModelKeys.map((item) => {
      const [heroId, ...skinParts] = item.split('|');
      const skin = skinParts.join('|') || undefined;
      const heroConfig = getHeroConfig(heroId);
      return getHeroModelPath(heroId, {
        skin,
        overridePath: skin ? undefined : heroConfig?.modelPath,
      });
    })));

    /** 收集所有场景设施模型路径，包含草丛、防御塔、水晶枢纽、小水晶、泉水和补血道具。 */
    const facilityUrls = [
      ...getBushesConfig().map((item) => item.asset.modelPath),
      ...Object.values(getTowerAssetConfig()).flatMap((item) => [item.asset.modelPath, item.destroyedAsset?.modelPath]),
      ...Object.values(getNexusAssetConfig()).map((item) => item.asset.modelPath),
      ...Object.values(getInhibitorAssetConfig()).map((item) => item.asset.modelPath),
      ...Object.values(getFountainAssetConfig()).map((item) => item.asset.modelPath),
      getRelicAssetConfig().asset.modelPath,
    ];

    return Array.from(new Set([...heroUrls, ...facilityUrls].filter((url): url is string => Boolean(url))));
  }, [heroModelKeys]);

  useEffect(() => {
    let cancelled = false;

    if (sceneModelUrls.length === 0) {
      finishAssetLoading();
      return () => {
        cancelled = true;
      };
    }

    setLoadingError(null);

    Promise.all(sceneModelUrls.map((url) => threejsHelper.canLoadGLTF(url))).then((availability) => {
      if (cancelled) return;

      const availableUrls = sceneModelUrls.filter((_, index) => availability[index]);
      const missingCount = sceneModelUrls.length - availableUrls.length;

      if (availableUrls.length === 0) {
        if (missingCount > 0) {
          setLoadingError('部分模型资源缺失，已自动降级显示');
        }
        finishAssetLoading();
        return;
      }

      beginAssetLoading(availableUrls.length);

      let settledCount = 0;
      let firstErrorMessage: string | null = missingCount > 0 ? '部分模型资源缺失，已自动降级显示' : null;

      Promise.allSettled(
        availableUrls.map((url) => {
          return threejsHelper.loadGLTF(url).catch((error) => {
            if (!firstErrorMessage) {
              firstErrorMessage = error instanceof Error ? error.message : String(error);
            }
            throw error;
          }).finally(() => {
            settledCount += 1;
            if (!cancelled) {
              updateAssetLoading(settledCount, availableUrls.length);
            }
          });
        }),
      ).then(() => {
        if (cancelled) return;
        setLoadingError(firstErrorMessage);
        finishAssetLoading();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [beginAssetLoading, finishAssetLoading, sceneModelUrls, setLoadingError, updateAssetLoading]);

  return sceneModelUrls;
}
