// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取我的收集册信息 GET /api/collection/my */
export async function getMyCollectionsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListCollectionDTO_>('/api/collection/my', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取收集册统计信息 GET /api/collection/stats */
export async function getCollectionStatsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseCollectionStatsVO_>('/api/collection/stats', {
    method: 'GET',
    ...(options || {}),
  });
}
