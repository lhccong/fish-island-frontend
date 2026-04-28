import { useEffect, useState } from 'react';
import { fishBattleMapConfig } from '@/services/backend/fishBattleController';
import { GAME_CONFIG } from './gameConfig';

/* ──────── 辅助：安全覆盖 ──────── */
const s = <T,>(v: T | null | undefined, fallback: T): T => (v != null ? v : fallback);

/**
 * 将后端下发的共享地图配置（battle-map-config.json）覆盖到 GAME_CONFIG。
 * 所有 _doc 字段在 JS 中自然被忽略。
 */
/** 递归移除 readonly 修饰符，用于运行时覆盖 as-const 配置。 */
type DeepMutable<T> = { -readonly [K in keyof T]: DeepMutable<T[K]> };

function applySharedConfig(cfg: any) {
  const gc = GAME_CONFIG as DeepMutable<typeof GAME_CONFIG>;
  const map = gc.map;
  const env = gc.environment;

  /* ── 地图边界 ── */
  const pb = cfg.map?.playableBounds;
  if (pb) {
    map.playableBounds.minX = pb.minX;
    map.playableBounds.maxX = pb.maxX;
    map.playableBounds.minZ = pb.minZ;
    map.playableBounds.maxZ = pb.maxZ;
  }

  /* ── 防御塔位置 + 血量 ── */
  const towers: any[] = cfg.structures?.towers ?? [];
  towers.forEach((t: any, i: number) => {
    if (map.towers[i]) map.towers[i].position = t.position;
  });
  const tv = cfg.structures?.towerVisual;
  if (tv) {
    /* 模型路径 */
    if (tv.blue) {
      env.towers.blueOuterModelPath      = s(tv.blue.outerModelPath, env.towers.blueOuterModelPath);
      env.towers.blueOuterDestroyedModelPath = s(tv.blue.outerDestroyedModelPath, env.towers.blueOuterDestroyedModelPath);
      env.towers.blueInnerModelPath      = s(tv.blue.innerModelPath, env.towers.blueInnerModelPath);
      env.towers.blueInnerDestroyedModelPath = s(tv.blue.innerDestroyedModelPath, env.towers.blueInnerDestroyedModelPath);
      env.towers.blueNexusGuardModelPath = s(tv.blue.nexusGuardModelPath, env.towers.blueNexusGuardModelPath);
      env.towers.blueNexusGuardDestroyedModelPath = s(tv.blue.nexusGuardDestroyedModelPath, env.towers.blueNexusGuardDestroyedModelPath);
      env.towers.blueRotationY           = s(tv.blue.rotationY, env.towers.blueRotationY);
    }
    if (tv.red) {
      env.towers.redOuterModelPath      = s(tv.red.outerModelPath, env.towers.redOuterModelPath);
      env.towers.redOuterDestroyedModelPath = s(tv.red.outerDestroyedModelPath, env.towers.redOuterDestroyedModelPath);
      env.towers.redInnerModelPath      = s(tv.red.innerModelPath, env.towers.redInnerModelPath);
      env.towers.redInnerDestroyedModelPath = s(tv.red.innerDestroyedModelPath, env.towers.redInnerDestroyedModelPath);
      env.towers.redNexusGuardModelPath = s(tv.red.nexusGuardModelPath, env.towers.redNexusGuardModelPath);
      env.towers.redNexusGuardDestroyedModelPath = s(tv.red.nexusGuardDestroyedModelPath, env.towers.redNexusGuardDestroyedModelPath);
      env.towers.redRotationY           = s(tv.red.rotationY, env.towers.redRotationY);
    }
    /* 各子类型视觉参数 */
    for (const sub of ['outer', 'inner', 'nexusGuard'] as const) {
      const src = tv[sub];
      if (!src) continue;
      const prefix = sub as string;
      (env.towers as any)[`${prefix}TargetHeight`]   = s(src.targetHeight, (env.towers as any)[`${prefix}TargetHeight`]);
      (env.towers as any)[`${prefix}ModelScale`]      = s(src.modelScale, (env.towers as any)[`${prefix}ModelScale`]);
      (env.towers as any)[`${prefix}GroundOffsetY`]   = s(src.groundOffsetY, (env.towers as any)[`${prefix}GroundOffsetY`]);
      (env.towers as any)[`${prefix}DestroyedTargetHeight`] = s(src.destroyedTargetHeight, (env.towers as any)[`${prefix}DestroyedTargetHeight`]);
      (env.towers as any)[`${prefix}DestroyedModelScale`] = s(src.destroyedModelScale, (env.towers as any)[`${prefix}DestroyedModelScale`]);
      (env.towers as any)[`${prefix}DestroyedGroundOffsetY`] = s(src.destroyedGroundOffsetY, (env.towers as any)[`${prefix}DestroyedGroundOffsetY`]);
      (env.towers as any)[`${prefix}IdleClip`]        = s(src.idleClip, (env.towers as any)[`${prefix}IdleClip`]);
      (env.towers as any)[`${prefix}DeathClip`]       = s(src.deathClip, (env.towers as any)[`${prefix}DeathClip`]);
    }
    /* 血量（从 towers 数组里取第一个匹配的 subType） */
    const byType: Record<string, any> = {};
    towers.forEach((t: any) => { if (!byType[t.subType]) byType[t.subType] = t; });
    if (byType.outer)      env.towers.outerMaxHp      = byType.outer.maxHp;
    if (byType.inner)      env.towers.innerMaxHp      = byType.inner.maxHp;
    if (byType.nexusGuard) env.towers.nexusGuardMaxHp = byType.nexusGuard.maxHp;
  }

  /* ── 水晶枢纽 ── */
  const nexuses: any[] = cfg.structures?.nexuses ?? [];
  nexuses.forEach((n: any, i: number) => {
    if (map.nexuses[i]) map.nexuses[i].position = n.position;
  });
  const nv = cfg.structures?.nexusVisual;
  if (nv) {
    env.nexus.blueModelPath = s(nv.blueModelPath, env.nexus.blueModelPath);
    env.nexus.blueDestroyedModelPath = s(nv.blueDestroyedModelPath, env.nexus.blueDestroyedModelPath);
    env.nexus.redModelPath  = s(nv.redModelPath, env.nexus.redModelPath);
    env.nexus.redDestroyedModelPath = s(nv.redDestroyedModelPath, env.nexus.redDestroyedModelPath);
    env.nexus.targetHeight  = s(nv.targetHeight, env.nexus.targetHeight);
    env.nexus.modelScale    = s(nv.modelScale, env.nexus.modelScale);
    env.nexus.groundOffsetY = s(nv.groundOffsetY, env.nexus.groundOffsetY);
    env.nexus.blueRotationY = s(nv.blueRotationY, env.nexus.blueRotationY);
    env.nexus.redRotationY  = s(nv.redRotationY, env.nexus.redRotationY);
    env.nexus.idleClip      = s(nv.idleClip, env.nexus.idleClip);
    env.nexus.damagedClip   = s(nv.damagedClip, env.nexus.damagedClip);
    env.nexus.criticalClip  = s(nv.criticalClip, env.nexus.criticalClip);
    env.nexus.deathClip     = s(nv.deathClip, env.nexus.deathClip);
    env.nexus.maxHp         = s(nexuses[0]?.maxHp, env.nexus.maxHp);
    env.nexus.damagedThreshold  = s(nv.damagedThreshold, env.nexus.damagedThreshold);
    env.nexus.criticalThreshold = s(nv.criticalThreshold, env.nexus.criticalThreshold);
  }

  /* ── 兵营水晶 ── */
  const inhibitors: any[] = cfg.structures?.inhibitors ?? [];
  inhibitors.forEach((inh: any, i: number) => {
    if (map.inhibitors?.[i]) map.inhibitors[i].position = inh.position;
  });
  const iv = cfg.structures?.inhibitorVisual;
  if (iv) {
    for (const team of ['blue', 'red'] as const) {
      const src = iv[team];
      const dst = env.inhibitor[team];
      if (!src || !dst) continue;
      dst.destroyedModelPath = s(src.destroyedModelPath, dst.destroyedModelPath);
      dst.modelPath     = s(src.modelPath, dst.modelPath);
      dst.targetHeight  = s(src.targetHeight, dst.targetHeight);
      dst.modelScale    = s(src.modelScale, dst.modelScale);
      dst.groundOffsetY = s(src.groundOffsetY, dst.groundOffsetY);
      dst.rotationY     = s(src.rotationY, dst.rotationY);
      dst.idleClip      = s(src.idleClip, dst.idleClip);
      dst.deathClip     = s(src.deathClip, dst.deathClip);
    }
    env.inhibitor.maxHp = s(inhibitors[0]?.maxHp, env.inhibitor.maxHp);
  }

  /* ── 补血道具 ── */
  const relicItems: any[] = cfg.healthRelics?.items ?? [];
  relicItems.forEach((r: any, i: number) => {
    if (map.healthRelics[i]) map.healthRelics[i].position = r.position;
  });
  const rv = cfg.healthRelics?.visual;
  if (rv) {
    env.relic.modelPath      = s(rv.modelPath, env.relic.modelPath);
    env.relic.targetHeight   = s(rv.targetHeight, env.relic.targetHeight);
    env.relic.rotationY      = s(rv.rotationY, env.relic.rotationY);
    env.relic.idleClip       = s(rv.idleClip, env.relic.idleClip);
    env.relic.floatHeight    = s(rv.floatHeight, env.relic.floatHeight);
    env.relic.bobAmplitude   = s(rv.bobAmplitude, env.relic.bobAmplitude);
    env.relic.bobSpeed       = s(rv.bobSpeed, env.relic.bobSpeed);
    env.relic.ringOuterRadius = s(rv.ringOuterRadius, env.relic.ringOuterRadius);
    env.relic.ringInnerRadius = s(rv.ringInnerRadius, env.relic.ringInnerRadius);
  }

  /* ── 草丛视觉 ── */
  const bv = cfg.bushes?.visual;
  if (bv) {
    for (const zone of ['left', 'center', 'right'] as const) {
      const src = bv[zone];
      const dst = env.bushes[zone];
      if (!src || !dst) continue;
      if (src.x != null) dst.x = src.x;
      if (src.wallInset != null) dst.wallInset = src.wallInset;
      if (src.size) dst.size = src.size;
      if (src.modelPath !== undefined) dst.modelPath = src.modelPath;
      if (src.targetHeight != null) dst.targetHeight = src.targetHeight;
      if (src.rotationY != null) dst.rotationY = src.rotationY;
    }
  }
  const gv = cfg.bushes?.grass;
  if (gv) {
    env.grass.modelPath     = s(gv.modelPath, env.grass.modelPath);
    env.grass.count         = s(gv.count, env.grass.count);
    env.grass.scaleMin      = s(gv.scaleMin, env.grass.scaleMin);
    env.grass.scaleMax      = s(gv.scaleMax, env.grass.scaleMax);
    env.grass.heightScale   = s(gv.heightScale, env.grass.heightScale);
    env.grass.swayIntensity = s(gv.swayIntensity, env.grass.swayIntensity);
  }

  /* ── 小兵模型 + 视觉 ── */
  const mc = cfg.minions;
  if (mc) {
    for (const type of ['melee', 'caster'] as const) {
      const src = mc[type];
      if (!src) continue;
      const dst = env.minion[type];
      /* 模型 URL */
      if (src.modelUrl?.blue) dst.blue.modelPath = src.modelUrl.blue;
      if (src.modelUrl?.red)  dst.red.modelPath  = src.modelUrl.red;
      /* 视觉参数 */
      const sv = src.visual;
      if (sv) {
        for (const team of ['blue', 'red'] as const) {
          const ts = sv[team];
          const td = dst[team];
          if (!ts || !td) continue;
          if (ts.targetHeight != null)  td.targetHeight  = ts.targetHeight;
          if (ts.modelScale != null)    td.modelScale    = ts.modelScale;
          if (ts.groundOffsetY != null) td.groundOffsetY = ts.groundOffsetY;
          if (ts.rotationY != null)     td.rotationY     = ts.rotationY;
        }
        if (sv.idleClip !== undefined)   dst.idleClip   = sv.idleClip;
        if (sv.runClip !== undefined)    dst.runClip    = sv.runClip;
        if (sv.attackClip !== undefined) dst.attackClip = sv.attackClip;
        if (sv.deathClip !== undefined)  dst.deathClip  = sv.deathClip;
      }
    }
    /* 血条 */
    const hb = mc.healthBar;
    if (hb) {
      env.minion.healthBarWidth   = s(hb.width, env.minion.healthBarWidth);
      env.minion.healthBarHeight  = s(hb.height, env.minion.healthBarHeight);
      env.minion.healthBarOffsetY = s(hb.offsetY, env.minion.healthBarOffsetY);
    }
  }

  /* ── 泉水 ── */
  for (const team of ['blue', 'red'] as const) {
    const src = cfg.fountain?.[team];
    if (!src) continue;
    const dst = env.fountain[team];
    if (src.position) dst.position = src.position;
    const fv = src.visual;
    if (fv) {
      dst.modelPath    = s(fv.modelPath, dst.modelPath);
      dst.targetHeight = s(fv.targetHeight, dst.targetHeight);
      dst.rotationY    = s(fv.rotationY, dst.rotationY);
      dst.idleClip     = s(fv.idleClip, dst.idleClip);
    }
  }

  /* ── 中央遗迹 ── */
  const ru = cfg.ruins;
  if (ru) {
    env.ruins.modelPath    = s(ru.modelPath, env.ruins.modelPath);
    env.ruins.targetHeight = s(ru.targetHeight, env.ruins.targetHeight);
    env.ruins.rotationY    = s(ru.rotationY, env.ruins.rotationY);
    env.ruins.idleClip     = s(ru.idleClip, env.ruins.idleClip);
  }
}

/**
 * 拉取后端共享地图配置并覆盖到 GAME_CONFIG。
 * 返回 { loaded, error } 供加载态显示。
 */
export function useSharedMapConfig(refreshKey?: string | number) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false);
    setError(null);
    let cancelled = false;
    fishBattleMapConfig()
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data;
        if (data) {
          applySharedConfig(data);
        } else {
          console.warn('[useSharedMapConfig] data 为空，不覆盖配置');
        }
        setLoaded(true);
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.warn('[useSharedMapConfig] 拉取后端地图配置失败，使用前端默认值', err);
        setError(err?.message ?? '未知错误');
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return { loaded, error };
}
