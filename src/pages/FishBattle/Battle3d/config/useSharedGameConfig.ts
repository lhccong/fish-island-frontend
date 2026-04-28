import { useEffect, useState } from 'react';
import { fishBattleGameConfig } from '@/services/backend/fishBattleController';
import { GAME_CONFIG } from './gameConfig';
import { rebuildEmoteCache } from './emoteConfig';

/** 跳过深度合并的 key（文档字段、不需要递归的特殊字段）。 */
const SKIP_KEYS = new Set(['_doc']);

/**
 * 递归深度合并：将 source 中的非 null/undefined 值覆盖到 target 上。
 * - 数组：直接替换（不做元素级合并）。
 * - 纯对象：递归逐 key 合并。
 * - 基本类型：直接覆盖。
 * - _doc 等文档字段跳过。
 */
function deepMerge(target: any, source: any): void {
  if (!source || typeof source !== 'object' || !target || typeof target !== 'object') {
    return;
  }
  for (const key of Object.keys(source)) {
    if (SKIP_KEYS.has(key)) continue;
    const sv = source[key];
    if (sv === null || sv === undefined) continue;

    if (Array.isArray(sv)) {
      // 数组直接替换
      target[key] = sv;
    } else if (typeof sv === 'object' && !Array.isArray(sv)) {
      // 纯对象：如果 target 对应 key 也是对象则递归，否则直接赋值
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        deepMerge(target[key], sv);
      } else {
        target[key] = sv;
      }
    } else {
      // 基本类型直接覆盖
      target[key] = sv;
    }
  }
}

/**
 * 将后端下发的游戏主配置（game_default）全量覆盖到 GAME_CONFIG。
 * 覆盖范围：camera / input / render / audio / vision / hud / emotes / heroes / multiplayer / debug 等所有顶级配置节。
 */
function applyRemoteGameConfig(cfg: any) {
  deepMerge(GAME_CONFIG, cfg);
  // 表情定义可能被覆盖，重建运行时缓存
  rebuildEmoteCache();
}

/**
 * 拉取后端游戏主配置（game_default）并覆盖到 GAME_CONFIG。
 * 返回 { loaded, error } 供加载态显示。
 */
export function useSharedGameConfig() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fishBattleGameConfig()
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data;
        if (data) {
          applyRemoteGameConfig(data);
        } else {
          console.warn('[useSharedGameConfig] data 为空，不覆盖配置');
        }
        setLoaded(true);
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.warn('[useSharedGameConfig] 拉取后端游戏配置失败，使用前端默认值', err);
        setError(err?.message ?? '未知错误');
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  return { loaded, error };
}
