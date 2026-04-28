import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { getHeroConfig } from '../../config/heroConfig';
import { getHeroModelPath } from '../../utils/heroModel';
import { threejsHelper } from '../../utils/ThreejsHelper';

export function usePreloadHeroModels() {
  const heroModelKeys = useGameStore(useShallow((s) => Array.from(new Set(
    s.champions.map((champion) => `${champion.heroId}|${champion.skin ?? ''}`),
  )).sort()));
  const beginAssetLoading = useGameStore((s) => s.beginAssetLoading);
  const updateAssetLoading = useGameStore((s) => s.updateAssetLoading);
  const finishAssetLoading = useGameStore((s) => s.finishAssetLoading);
  const setLoadingError = useGameStore((s) => s.setLoadingError);

  const heroModelUrls = useMemo(() => {
    return Array.from(new Set(heroModelKeys.map((item) => {
      const [heroId, ...skinParts] = item.split('|');
      const skin = skinParts.join('|') || undefined;
      const heroConfig = getHeroConfig(heroId);
      return getHeroModelPath(heroId, {
        skin,
        overridePath: skin ? undefined : heroConfig?.modelPath,
      });
    })));
  }, [heroModelKeys]);

  useEffect(() => {
    let cancelled = false;

    if (heroModelUrls.length === 0) {
      finishAssetLoading();
      return () => {
        cancelled = true;
      };
    }

    beginAssetLoading(heroModelUrls.length);
    setLoadingError(null);

    let settledCount = 0;
    let firstErrorMessage: string | null = null;

    Promise.allSettled(
      heroModelUrls.map((url) => {
        return threejsHelper.loadGLTF(url).catch((error) => {
          if (!firstErrorMessage) {
            firstErrorMessage = error instanceof Error ? error.message : String(error);
          }
          throw error;
        }).finally(() => {
          settledCount += 1;
          if (!cancelled) {
            updateAssetLoading(settledCount, heroModelUrls.length);
          }
        });
      }),
    ).then(() => {
      if (cancelled) return;
      setLoadingError(firstErrorMessage);
      finishAssetLoading();
    });

    return () => {
      cancelled = true;
    };
  }, [beginAssetLoading, finishAssetLoading, heroModelUrls, setLoadingError, updateAssetLoading]);

  return heroModelUrls;
}
