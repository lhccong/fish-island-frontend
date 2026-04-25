// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 挑战下一层 POST /api/tower/challenge */
export async function challengeUsingPost1(options?: { [key: string]: any }) {
  return request<API.BaseResponseTowerClimbResultVO_>('/api/tower/challenge', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 查看指定层怪物信息 GET /api/tower/floor */
export async function getFloorMonsterUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getFloorMonsterUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseTowerFloorMonsterVO_>('/api/tower/floor', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取爬塔进度 GET /api/tower/progress */
export async function getProgressUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseTowerProgressVO_>('/api/tower/progress', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 爬塔排行榜（按最高通关层数降序） GET /api/tower/ranking */
export async function getRankingUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getRankingUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListTowerRankVO_>('/api/tower/ranking', {
    method: 'GET',
    params: {
      // limit has a default value: 100
      limit: '100',
      ...params,
    },
    ...(options || {}),
  });
}
