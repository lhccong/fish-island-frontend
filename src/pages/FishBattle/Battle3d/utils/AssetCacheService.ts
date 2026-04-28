/**
 * 统一资源缓存服务。
 * 基于浏览器 Cache API 实现持久化二级缓存：
 *   L1 — 内存 Map（同局 0 延迟）
 *   L2 — Cache API（跨会话持久化）
 *   L3 — 网络请求（CDN/本地静态服务）
 *
 * 当 Cache API 不可用时（隐私模式 / 旧浏览器）自动退回纯网络。
 */

/** 缓存桶名称，带版本号便于未来做缓存升级清理。 */
export const CACHE_BUCKET = 'fish-battle-assets-v1';

/**
 * 检测响应是否是 SPA fallback 返回的 HTML 页面。
 * UmiJS / CRA 等开发服务器对不存在的静态资源会返回 200 + text/html，
 * 必须拦截以避免把 HTML 当作二进制资源缓存。
 */
function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes('text/html');
}

/** 内存级 Response 副本缓存（ArrayBuffer），避免在同一会话中重复解码。 */
const memoryCache: Map<string, ArrayBuffer> = new Map();

/** 标记 Cache API 是否可用，只检测一次。 */
let cacheApiAvailable: boolean | null = null;

async function isCacheApiAvailable(): Promise<boolean> {
  if (cacheApiAvailable !== null) return cacheApiAvailable;
  try {
    if (typeof caches === 'undefined') {
      cacheApiAvailable = false;
    } else {
      // 尝试打开一次以确认权限
      await caches.open(CACHE_BUCKET);
      cacheApiAvailable = true;
    }
  } catch {
    cacheApiAvailable = false;
  }
  return cacheApiAvailable;
}

/**
 * 带持久化缓存的资源请求。
 * 优先级：内存 → Cache API → 网络。
 * 返回资源的 ArrayBuffer 副本。
 */
async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  // ── L1：内存缓存 ──
  const memHit = memoryCache.get(url);
  if (memHit) {
    return memHit.slice(0); // 返回副本，防止外部 detach
  }

  // ── L2：Cache API ──
  const useCache = await isCacheApiAvailable();
  if (useCache) {
    try {
      const cache = await caches.open(CACHE_BUCKET);
      const cached = await cache.match(url);
      if (cached) {
        // 校验已缓存的 Content-Type，防止之前错误缓存的 HTML 被继续使用
        const cachedType = cached.headers.get('Content-Type');
        if (isHtmlContentType(cachedType)) {
          // 清除无效缓存条目
          await cache.delete(url).catch(() => {});
        } else {
          const buffer = await cached.arrayBuffer();
          memoryCache.set(url, buffer);
          return buffer.slice(0);
        }
      }
    } catch {
      // Cache API 读取失败，继续走网络
    }
  }

  // ── L3：网络请求 ──
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`[AssetCacheService] fetch failed: ${url} (${response.status})`);
  }

  // 检测 SPA fallback：开发服务器对不存在的资源可能返回 200 + text/html
  const contentType = response.headers.get('Content-Type');
  if (isHtmlContentType(contentType)) {
    throw new Error(`[AssetCacheService] SPA fallback detected (text/html): ${url}`);
  }

  const buffer = await response.arrayBuffer();

  // 回写缓存
  memoryCache.set(url, buffer);

  if (useCache) {
    try {
      const cache = await caches.open(CACHE_BUCKET);
      await cache.put(url, new Response(buffer.slice(0), {
        status: 200,
        headers: { 'Content-Type': contentType || 'application/octet-stream' },
      }));
    } catch {
      // 写入失败不阻塞主流程
    }
  }

  return buffer.slice(0);
}

/**
 * 检查指定 URL 是否已被缓存（内存或 Cache API）。
 */
async function has(url: string): Promise<boolean> {
  if (memoryCache.has(url)) return true;
  const useCache = await isCacheApiAvailable();
  if (useCache) {
    try {
      const cache = await caches.open(CACHE_BUCKET);
      const cached = await cache.match(url);
      if (!cached) return false;
      // 校验 Content-Type，跳过之前错误缓存的 HTML
      if (isHtmlContentType(cached.headers.get('Content-Type'))) {
        await cache.delete(url).catch(() => {});
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 清除所有缓存（含内存 + Cache API）。
 */
async function clearAll(): Promise<void> {
  memoryCache.clear();
  const useCache = await isCacheApiAvailable();
  if (useCache) {
    try {
      await caches.delete(CACHE_BUCKET);
    } catch {
      // ignore
    }
  }
}

/**
 * 删除旧版本缓存桶（用于版本升级时清理）。
 */
async function clearOldVersions(currentBucket: string = CACHE_BUCKET): Promise<void> {
  const useCache = await isCacheApiAvailable();
  if (!useCache) return;
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      if (key.startsWith('fish-battle-assets-') && key !== currentBucket) {
        await caches.delete(key);
      }
    }
  } catch {
    // ignore
  }
}

export const assetCacheService = {
  fetchAsArrayBuffer,
  has,
  clearAll,
  clearOldVersions,
};

export default assetCacheService;
