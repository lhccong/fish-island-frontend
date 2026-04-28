/**
 * 轻量级单例注册表，持有 ClockSync / SnapshotBuffer / LocalPlayerPredictor 实例引用。
 *
 * useBattleWsSync 在初始化时写入实例，
 * Champion.tsx 的 useFrame 中读取以驱动本地玩家预测和远端英雄插值。
 *
 * 使用模块级变量而非 React Context，因为 useFrame 中频繁访问
 * Context 会引入额外的订阅开销，而这些实例在整个对战生命周期内是稳定的。
 */

import type { ClockSync } from './ClockSync';
import type { SnapshotBuffer, Timestamped } from './SnapshotBuffer';
import type { LocalPlayerPredictor } from './LocalPlayerPredictor';

let _clockSync: ClockSync | null = null;
let _snapshotBuffer: SnapshotBuffer<Timestamped> | null = null;
let _localPredictor: LocalPlayerPredictor | null = null;
let _remoteChampionFrameCacheKey: string | null = null;
let _remoteChampionFrameCache: Map<string, {
  position: { x: number; y: number; z: number };
  rotation: number;
}> = new Map();
let _remoteMinionFrameCacheKey: string | null = null;
let _remoteMinionFrameCache: Map<string, {
  position: { x: number; y: number; z: number };
  rotation: number;
}> = new Map();

export function registerSyncInstances(
  clockSync: ClockSync,
  snapshotBuffer: SnapshotBuffer<Timestamped>,
  localPredictor: LocalPlayerPredictor,
): void {
  _clockSync = clockSync;
  _snapshotBuffer = snapshotBuffer;
  _localPredictor = localPredictor;
}

export function unregisterSyncInstances(): void {
  _clockSync = null;
  _snapshotBuffer = null;
  _localPredictor = null;
  _remoteChampionFrameCacheKey = null;
  _remoteChampionFrameCache = new Map();
  _remoteMinionFrameCacheKey = null;
  _remoteMinionFrameCache = new Map();
}

export function getClockSync(): ClockSync | null {
  return _clockSync;
}

export function getSnapshotBuffer(): SnapshotBuffer<Timestamped> | null {
  return _snapshotBuffer;
}

export function getLocalPredictor(): LocalPlayerPredictor | null {
  return _localPredictor;
}

export function getRemoteChampionFrameCache(cacheKey: string): Map<string, {
  position: { x: number; y: number; z: number };
  rotation: number;
}> | null {
  return _remoteChampionFrameCacheKey === cacheKey ? _remoteChampionFrameCache : null;
}

export function setRemoteChampionFrameCache(
  cacheKey: string,
  cache: Map<string, {
    position: { x: number; y: number; z: number };
    rotation: number;
  }>,
): void {
  _remoteChampionFrameCacheKey = cacheKey;
  _remoteChampionFrameCache = cache;
}

export function getRemoteMinionFrameCache(cacheKey: string): Map<string, {
  position: { x: number; y: number; z: number };
  rotation: number;
}> | null {
  return _remoteMinionFrameCacheKey === cacheKey ? _remoteMinionFrameCache : null;
}

export function setRemoteMinionFrameCache(
  cacheKey: string,
  cache: Map<string, {
    position: { x: number; y: number; z: number };
    rotation: number;
  }>,
): void {
  _remoteMinionFrameCacheKey = cacheKey;
  _remoteMinionFrameCache = cache;
}
