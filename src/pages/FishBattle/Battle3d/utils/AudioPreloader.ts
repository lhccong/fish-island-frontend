/**
 * 音频预加载与缓存播放服务。
 * 使用 Web Audio API (AudioContext + AudioBuffer) 实现：
 *   - 预加载阶段：fetch → decodeAudioData → 内存 Map
 *   - 播放阶段：直接从内存取 AudioBuffer → createBufferSource → 即时播放
 *   - 底层 fetch 走 AssetCacheService，自动获得 Cache API 持久化能力
 *
 * 当 Web Audio API 不可用时，退回 HTML5 <audio> 元素播放。
 */

import { assetCacheService } from './AssetCacheService';

/** 已解码的 AudioBuffer 内存缓存。 */
const bufferCache: Map<string, AudioBuffer> = new Map();

/** 正在进行的解码 Promise，防止重复请求。 */
const pendingLoads: Map<string, Promise<AudioBuffer | null>> = new Map();

/** 全局共享 AudioContext，延迟到首次使用时创建（需要用户交互后才可 resume）。 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContext;
  } catch {
    console.warn('[AudioPreloader] Web Audio API 不可用，将退回 HTML5 Audio');
    return null;
  }
}

/**
 * 确保 AudioContext 处于 running 状态。
 * 某些浏览器要求用户交互后才能 resume。
 */
async function ensureContextResumed(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}

/**
 * 预加载单条音频资源到内存缓存。
 * @returns 解码后的 AudioBuffer，失败时返回 null（不抛异常）。
 */
async function preload(url: string): Promise<AudioBuffer | null> {
  // 已缓存
  if (bufferCache.has(url)) return bufferCache.get(url)!;

  // 避免重复请求
  if (pendingLoads.has(url)) return pendingLoads.get(url)!;

  const task = (async (): Promise<AudioBuffer | null> => {
    const ctx = getAudioContext();
    if (!ctx) return null;

    try {
      const arrayBuffer = await assetCacheService.fetchAsArrayBuffer(url);
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      bufferCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (err) {
      // SPA fallback / 404 类错误静默跳过（资源不存在是常见情况）
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('SPA fallback') && !msg.includes('fetch failed')) {
        console.warn(`[AudioPreloader] 预加载失败: ${url}`, err);
      }
      return null;
    } finally {
      pendingLoads.delete(url);
    }
  })();

  pendingLoads.set(url, task);
  return task;
}

/**
 * 批量预加载音频资源。
 * @param urls 音频 URL 列表
 * @param onProgress 进度回调 (loaded, total)
 * @param concurrency 并发数（默认 4）
 */
async function preloadAll(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void,
  concurrency = 4,
): Promise<void> {
  const unique = [...new Set(urls)];
  const total = unique.length;
  if (total === 0) {
    onProgress?.(0, 0);
    return;
  }

  let loaded = 0;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < unique.length) {
      const url = unique[index++];
      await preload(url);
      loaded++;
      onProgress?.(loaded, total);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, total) },
    () => worker(),
  );

  await Promise.allSettled(workers);
  onProgress?.(total, total);
}

/**
 * 检查指定 URL 是否已解码到内存缓存。
 */
function hasBuffer(url: string): boolean {
  return bufferCache.has(url);
}

/**
 * 使用 Web Audio API 播放缓存的音频。
 * @returns 播放的 AudioBufferSourceNode（可调用 .stop()），失败返回 null。
 */
function play(
  url: string,
  volume = 1,
): AudioBufferSourceNode | null {
  const ctx = getAudioContext();
  const buffer = bufferCache.get(url);
  if (!ctx || !buffer) return null;

  // 确保 context 处于 running（同步尝试）
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, volume));

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);

    return source;
  } catch (err) {
    console.warn(`[AudioPreloader] 播放失败: ${url}`, err);
    return null;
  }
}

/** 3D 坐标简写。 */
interface Vec3 { x: number; y: number; z: number }

/**
 * 使用 Web Audio API 播放带 3D 空间定位的缓存音频（PannerNode）。
 * 音效会根据 sourcePos 与 listenerPos 的距离自动衰减音量，
 * 并通过 PannerNode 产生左右声道差异（立体声定位）。
 *
 * @param url 预加载过的音频资源 URL。
 * @param volume 基础音量（0~1）。
 * @param sourcePos 音源世界坐标。
 * @param listenerPos 听者世界坐标（通常为本机英雄位置）。
 * @param spatialConfig 空间音效参数（innerRadius / outerRadius / distanceModel / rolloffFactor / maxAudioDistance）。
 * @returns 播放的 AudioBufferSourceNode，超距 / 失败时返回 null。
 */
function playSpatial(
  url: string,
  volume: number,
  sourcePos: Vec3,
  listenerPos: Vec3,
  spatialConfig: {
    innerRadius: number;
    outerRadius: number;
    distanceModel: DistanceModelType;
    rolloffFactor: number;
    maxAudioDistance: number;
  },
): AudioBufferSourceNode | null {
  const ctx = getAudioContext();
  const buffer = bufferCache.get(url);
  if (!ctx || !buffer) return null;

  const dx = sourcePos.x - listenerPos.x;
  const dy = (sourcePos.y ?? 0) - (listenerPos.y ?? 0);
  const dz = sourcePos.z - listenerPos.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance > spatialConfig.maxAudioDistance) return null;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, volume));

    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = spatialConfig.distanceModel;
    panner.refDistance = spatialConfig.innerRadius;
    panner.maxDistance = spatialConfig.outerRadius;
    panner.rolloffFactor = spatialConfig.rolloffFactor;
    panner.coneOuterGain = 1;
    panner.positionX.setValueAtTime(sourcePos.x, ctx.currentTime);
    panner.positionY.setValueAtTime(sourcePos.y ?? 0, ctx.currentTime);
    panner.positionZ.setValueAtTime(sourcePos.z, ctx.currentTime);

    const listener = ctx.listener;
    if (listener.positionX) {
      listener.positionX.setValueAtTime(listenerPos.x, ctx.currentTime);
      listener.positionY.setValueAtTime(listenerPos.y ?? 0, ctx.currentTime);
      listener.positionZ.setValueAtTime(listenerPos.z, ctx.currentTime);
    } else if (typeof listener.setPosition === 'function') {
      listener.setPosition(listenerPos.x, listenerPos.y ?? 0, listenerPos.z);
    }

    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(ctx.destination);
    source.start(0);

    return source;
  } catch (err) {
    console.warn(`[AudioPreloader] 空间音效播放失败: ${url}`, err);
    return null;
  }
}

/**
 * 退回方案：使用 HTML5 Audio 元素播放（无缓存加速）。
 */
function playFallback(url: string, volume = 1): HTMLAudioElement | null {
  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.src = url;
    audio.play().catch(() => {});
    return audio;
  } catch {
    return null;
  }
}

/**
 * 释放所有内存缓存。
 */
function disposeAll(): void {
  bufferCache.clear();
  pendingLoads.clear();
}

export const audioPreloader = {
  preload,
  preloadAll,
  hasBuffer,
  play,
  playSpatial,
  playFallback,
  ensureContextResumed,
  disposeAll,
};

export default audioPreloader;
