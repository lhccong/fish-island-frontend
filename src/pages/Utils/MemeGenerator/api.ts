// 表情包生成器 API 请求层
import type { MemeInfo, UploadImageResponse, ImageResponse, ErrorResponse } from './types';

const STORAGE_KEY = 'meme-generator-backend-url';
const DEFAULT_BASE = 'https://emoticon.xiaojingge.com';
const CACHE_PREFIX = 'meme_cache_';
const INFOS_CACHE_KEY = `${CACHE_PREFIX}infos`;
const INFOS_CACHE_TTL = 24 * 60 * 60 * 1000;

/** 获取当前后端地址 */
export function getBackendUrl(): string {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE;
}

/** 设置后端地址 */
export function setBackendUrl(url: string) {
  const trimmed = url.replace(/\/+$/, '').trim();
  if (trimmed && trimmed !== DEFAULT_BASE) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  clearMemeCaches();
}

/** 是否为自定义后端地址 */
export function isCustomBackend(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

/** 自定义错误类 */
export class MemeError extends Error {
  code: number;
  data: any;

  constructor(code: number, message: string, data: any = null) {
    super(message);
    this.name = 'MemeError';
    this.code = code;
    this.data = data;
  }
}

/** 排序方式 */
export type SortBy = 'key' | 'keywords' | 'keywords_pinyin' | 'date_created' | 'date_modified';

/** 请求去重：同 key 并发请求共享同一个 Promise */
const pendingMap = new Map<string, Promise<any>>();
function dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (pendingMap.has(key)) return pendingMap.get(key) as Promise<T>;
  const promise = fetcher().finally(() => pendingMap.delete(key));
  pendingMap.set(key, promise);
  return promise;
}

/** localStorage 缓存读取 */
function cacheGet<T>(key: string): { data: T; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** localStorage 缓存写入 */
function cacheSet(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* quota exceeded, ignore */ }
}

/** stale-while-revalidate：有缓存立即返回，后台静默刷新 */
async function staleWhileRevalidate<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    fetcher().then((fresh) => cacheSet(key, fresh)).catch(() => {});
    return cached.data;
  }
  const fresh = await fetcher();
  cacheSet(key, fresh);
  return fresh;
}

/** 清除所有 meme 相关缓存 */
function clearMemeCaches(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/** 通用请求方法 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const BASE = getBackendUrl();
  const res = await fetch(`${BASE}${url}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body && 'code' in body) {
      const err = body as ErrorResponse;
      throw new MemeError(err.code, err.message, err.data);
    }
    throw new MemeError(0, `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/** 获取表情包列表信息（带 localStorage 缓存，TTL 30分钟） */
export async function getMemeInfos(sortBy?: SortBy, sortReverse = false): Promise<MemeInfo[]> {
  const params = new URLSearchParams();
  if (sortBy) params.set('sort_by', sortBy);
  if (sortReverse) params.set('sort_reverse', 'true');
  const qs = params.toString();
  const cacheKey = qs ? `${INFOS_CACHE_KEY}_${qs}` : INFOS_CACHE_KEY;
  return staleWhileRevalidate<MemeInfo[]>(cacheKey, INFOS_CACHE_TTL, () =>
    request<MemeInfo[]>(`/meme/infos${qs ? `?${qs}` : ''}`),
  );
}

/** 获取单个表情包信息 */
export async function getMemeInfo(key: string): Promise<MemeInfo> {
  return request<MemeInfo>(`/memes/${key}/info`);
}

/** 搜索表情包 */
export async function searchMemes(query: string, includeTags = false): Promise<string[]> {
  const params = new URLSearchParams({ query });
  if (includeTags) params.set('include_tags', 'true');
  return request<string[]>(`/meme/search?${params}`);
}

/** 获取表情包预览（带请求去重 + sessionStorage 缓存） */
export async function getMemePreview(
  key: string,
  options?: Record<string, any>,
): Promise<ImageResponse> {
  const hasOptions = options && Object.keys(options).length > 0;
  const dedupeKey = `preview_${key}_${hasOptions ? JSON.stringify(options) : 'default'}`;
  const sessionKey = `${CACHE_PREFIX}preview_${key}`;

  if (!hasOptions) {
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) {
      try { return JSON.parse(cached); } catch {}
    }
  }

  const result = await dedupe(dedupeKey, () => {
    if (hasOptions) {
      return request<ImageResponse>(`/memes/${key}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options }),
      });
    }
    return request<ImageResponse>(`/memes/${key}/preview`);
  });

  if (!hasOptions) {
    try { sessionStorage.setItem(sessionKey, JSON.stringify(result)); } catch {}
  }

  return result;
}

/** 上传图片 */
export async function uploadImage(file: File): Promise<UploadImageResponse> {
  const BASE = getBackendUrl();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/image/upload/multipart`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Upload failed: ${res.statusText}`);
  }
  return res.json();
}

/** 生成表情包 */
export async function generateMeme(
  key: string,
  images: { name: string; id: string }[],
  texts: string[],
  options: Record<string, any>,
): Promise<ImageResponse> {
  return request<ImageResponse>(`/memes/${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, texts, options }),
  });
}

/** 获取图片URL */
export function getImageUrl(imageId: string): string {
  const BASE = getBackendUrl();
  return `${BASE}/image/${imageId}`;
}

const IMAGE_CACHE_NAME = `${CACHE_PREFIX}images`;

/** 获取缓存的图片 URL（优先 Cache API，回退到直接 URL） */
export async function getCachedImageUrl(imageId: string): Promise<string> {
  const url = getImageUrl(imageId);
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cached = await cache.match(url);
    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }
    const resp = await fetch(url);
    if (resp.ok) {
      cache.put(url, resp.clone());
      const blob = await resp.blob();
      return URL.createObjectURL(blob);
    }
  } catch { /* fall through */ }
  return url;
}

/** 获取后端版本 */
export async function getVersion(): Promise<string> {
  const BASE = getBackendUrl();
  const res = await fetch(`${BASE}/meme/version`);
  return res.text();
}
