// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** getRandomHero GET /api/hero/get/random */
export async function getRandomHero(
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseHeroVO_>('/api/hero/get/random', {
    method: 'GET',
    ...(options || {}),
  });
}

/** getNewHero GET /api/hero/get/new */
export async function getNewHero(
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseHeroVO_>('/api/hero/get/new', {
    method: 'GET',
    ...(options || {}),
  });
}

/** listSimpleHero GET /api/hero/list/simple */
export async function listSimpleHero(
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListSimpleHeroVO_>('/api/hero/list/simple', {
    method: 'GET',
    ...(options || {}),
  });
}

/** getHeroById GET /api/hero/get */
export async function getHeroById(
  params: {
    id: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseHeroVO_>('/api/hero/get', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 记录猜对英雄次数 POST /api/hero/guess/success */
export async function recordGuessSuccess(
  params: {
    heroId: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/hero/guess/success', {
    method: 'POST',
    params: {
      ...params,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    ...(options || {}),
  });
}

/** 获取猜对英雄次数 GET /api/hero/guess/count */
export async function getGuessCount(
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseInt_>('/api/hero/guess/count', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取英雄排行榜 GET /api/hero/guess/ranking */
export async function getGuessRanking(
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListHeroRankingVO_>('/api/hero/guess/ranking', {
    method: 'GET',
    ...(options || {}),
  });
}
