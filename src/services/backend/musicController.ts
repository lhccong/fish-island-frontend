import { request } from 'umi';
import { BACKEND_HOST_LOCAL, BACKEND_HOST_PROD } from '@/constants';

// 歌词适配 · 网易云解析（通过后端中转到 gecishipei）
export async function parseNeteaseByGeciShipei(input: string | number) {
  return request<{
    code: number;
    data: {
      // 透传目标站响应
      code?: number;
      data?: any[];
      msg?: string;
      [key: string]: any;
    } | { data?: string };
    message: string;
  }>(
    '/api/proxy/wy/wy/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      data: `input=${encodeURIComponent(String(input))}&filter=id&type=netease&page=1`,
    },
  );
}


// B站 · 解析视频链接音频信息（后端 ApiController /bilibili/audio）
export async function getBilibiliAudio(videoUrl: string) {
  return request<{
    code: number;
    data: {
      title?: string;
      audioUrl?: string;
      cover?: string;
      currentPage?: any;
      pages?: any[];
      isMultiPart?: boolean;
      totalPages?: number;
      currentPageNumber?: number;
      videoId?: string;
      deadline?: string;
      headers?: Record<string, string>;
      owner?: any;
    };
    message: string;
  }>(
    '/api/bilibili/audio',
    {
      method: 'GET',
      params: { url: videoUrl },
    },
  );
}

// B站 · 获取分P（歌单）信息（后端 ApiController /bilibili/pages）
export async function getBilibiliPages(bvid: string) {
  return request<{
    code: number;
    data: {
      title?: string;
      bvid?: string;
      pic?: string;
      pages?: any[];
      owner?: any;
      isMultiPart?: boolean;
      totalPages?: number;
    };
    message: string;
  }>(
    '/api/bilibili/pages',
    {
      method: 'GET',
      params: { bvid },
    },
  );
}


// 生成 B站音频代理播放地址（走后端 /proxy/audio）
export function getBilibiliAudioProxyUrl(audioUrl: string, referer = 'https://www.bilibili.com/') {
  const isDev = process.env.NODE_ENV === 'development';
  const base = isDev ? BACKEND_HOST_LOCAL : BACKEND_HOST_PROD;
  return `${base}/api/proxy/audio?url=${encodeURIComponent(audioUrl)}&referer=${encodeURIComponent(referer)}`;
}

// 生成 B站封面代理地址（走后端 /proxy/image）
export function getBilibiliImageProxyUrl(imageUrl?: string) {
  if (!imageUrl) return imageUrl;
  const isDev = process.env.NODE_ENV === 'development';
  const base = isDev ? BACKEND_HOST_LOCAL : BACKEND_HOST_PROD;
  return `${base}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
}

// 通用音频代理播放地址（指定 referer）
export function getProxyAudioUrl(audioUrl: string, referer: string) {
  const isDev = process.env.NODE_ENV === 'development';
  const base = isDev ? BACKEND_HOST_LOCAL : BACKEND_HOST_PROD;
  return `${base}/api/proxy/audio?url=${encodeURIComponent(audioUrl)}&referer=${encodeURIComponent(referer)}`;
}

// 抖音 · 解析视频为音频信息（后端 ApiController /douyin/parse）
export async function parseDouyinVideo(inputUrl: string) {
  return request<{
    code: number;
    data: {
      title?: string;
      audioUrl?: string;
      cover?: string;
      headers?: Record<string, string>;
    };
    message: string;
  }>(
    '/api/douyin/parse',
    {
      method: 'POST',
      data: { url: inputUrl },
    },
  );
}


// QQ 音乐 · 搜索（后端 /qq/search）
export async function qqSearch(keyword: string, page = 1, size = 20) {
  return request<{
    code: number;
    data: any;
    message: string;
  }>(
    '/api/qq/search',
    {
      method: 'GET',
      params: { q: keyword, p: page, n: size },
    },
  );
}

// QQ 音乐 · 歌词（支持 songmid 或 musicid）（后端 /qq/lyric）
export async function qqLyric(params: { songmid?: string; musicid?: string }) {
  return request<{
    code: number;
    data: { lyric?: string; trans?: string; raw?: any };
    message: string;
  }>(
    '/api/qq/lyric',
    {
      method: 'GET',
      params,
    },
  );
}

// QQ 音乐 · 播放直链（后端 /qq/play）
export async function qqPlay(songmid: string, albumMid?: string) {
  return request<{
    code: number;
    data: { audioUrl?: string; cover?: string; headers?: Record<string, string> };
    message: string;
  }>(
    '/api/qq/play',
    {
      method: 'GET',
      params: { songmid, albumMid },
    },
  );
}


