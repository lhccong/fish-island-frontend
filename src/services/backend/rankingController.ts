// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取今日防守排行榜 GET /api/ranking/defense/today */
export async function getTodayDefenseRankingUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListRankingDTO_>('/api/ranking/defense/today', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取累计防守排行榜 GET /api/ranking/defense/total */
export async function getTotalDefenseRankingUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListRankingDTO_>('/api/ranking/defense/total', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取今日偷取次数排行榜 GET /api/ranking/steal/count/today */
export async function getTodayStealCountRankingUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListRankingDTO_>('/api/ranking/steal/count/today', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取累计偷取次数排行榜 GET /api/ranking/steal/count/total */
export async function getTotalStealCountRankingUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListRankingDTO_>('/api/ranking/steal/count/total', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取今日偷取经验排行榜 GET /api/ranking/steal/exp/today */
export async function getTodayStealExpRankingUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListRankingDTO_>('/api/ranking/steal/exp/today', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取累计偷取经验排行榜 GET /api/ranking/steal/exp/total */
export async function getTotalStealExpRankingUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListRankingDTO_>('/api/ranking/steal/exp/total', {
    method: 'GET',
    ...(options || {}),
  });
}
