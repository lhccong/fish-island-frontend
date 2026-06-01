// 表情包生成器 API 请求层
import type { MemeInfo, UploadImageResponse, ImageResponse, ErrorResponse } from './types';

const STORAGE_KEY = 'meme-generator-backend-url';
const DEFAULT_BASE = 'https://emoticon.xiaojingge.com';

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

/** 获取表情包列表信息 */
export async function getMemeInfos(sortBy?: SortBy, sortReverse = false): Promise<MemeInfo[]> {
  const params = new URLSearchParams();
  if (sortBy) params.set('sort_by', sortBy);
  if (sortReverse) params.set('sort_reverse', 'true');
  const qs = params.toString();
  return request<MemeInfo[]>(`/meme/infos${qs ? `?${qs}` : ''}`);
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

/** 获取表情包预览 */
export async function getMemePreview(
  key: string,
  options?: Record<string, any>,
): Promise<ImageResponse> {
  if (options && Object.keys(options).length > 0) {
    return request<ImageResponse>(`/memes/${key}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options }),
    });
  }
  return request<ImageResponse>(`/memes/${key}/preview`);
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

/** 获取后端版本 */
export async function getVersion(): Promise<string> {
  const BASE = getBackendUrl();
  const res = await fetch(`${BASE}/meme/version`);
  return res.text();
}
