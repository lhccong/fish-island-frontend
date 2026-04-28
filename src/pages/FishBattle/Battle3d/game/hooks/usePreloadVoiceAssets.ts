/**
 * 语音资源预加载 Hook。
 * 在游戏加载阶段收集当前对局所有英雄的语音 URL，
 * 通过 AudioPreloader 批量预加载到内存（Web Audio API AudioBuffer），
 * 后续 Champion.tsx 播放语音时直接命中内存缓存，实现 0 延迟播放。
 */

import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { getHeroVoiceConfig } from '../../config/heroConfig';
import { audioPreloader } from '../../utils/AudioPreloader';
import type { HeroVoiceConfig, HeroVoiceSlot } from '../../types/game';

/** 需要收集的技能语音槽位。 */
const VOICE_SLOTS: HeroVoiceSlot[] = ['basicAttack', 'q', 'w', 'e', 'r', 'recall', 'idle'];

/**
 * 从英雄语音配置中收集所有语音 URL。
 */
function collectVoiceUrls(voiceConfig: HeroVoiceConfig | undefined): string[] {
  if (!voiceConfig) return [];

  const urls: string[] = [];

  // 技能语音
  for (const slot of VOICE_SLOTS) {
    const slotUrls = voiceConfig[slot];
    if (slotUrls?.length) {
      urls.push(...slotUrls);
    }
  }

  // T轮盘自定义语音
  if (voiceConfig.customWheel?.length) {
    for (const wheel of voiceConfig.customWheel) {
      if (wheel.voiceUrls?.length) {
        urls.push(...wheel.voiceUrls);
      }
    }
  }

  return urls;
}

export function usePreloadVoiceAssets() {
  /** 收集当前对局中所有英雄 ID（去重排序，稳定引用）。 */
  const heroIds = useGameStore(useShallow((s) =>
    Array.from(new Set(s.champions.map((c) => c.heroId))).sort(),
  ));

  /** 汇总所有需要预加载的语音 URL（去重）。 */
  const allVoiceUrls = useMemo(() => {
    const urls: string[] = [];
    for (const heroId of heroIds) {
      const voiceConfig = getHeroVoiceConfig(heroId);
      urls.push(...collectVoiceUrls(voiceConfig));
    }
    return Array.from(new Set(urls));
  }, [heroIds]);

  useEffect(() => {
    let cancelled = false;

    if (allVoiceUrls.length === 0) return;

    audioPreloader.preloadAll(
      allVoiceUrls,
      (loaded, total) => {
        if (cancelled) return;
        if (loaded === total) {
          return;
        }
      },
      4, // 并发数
    ).catch((err) => {
      if (!cancelled) {
        console.warn('[usePreloadVoiceAssets] 语音预加载出错:', err);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [allVoiceUrls]);

  return allVoiceUrls;
}
