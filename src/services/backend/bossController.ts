// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 对战Boss（10个回合，每天只能挑战一次） GET /api/boss/battle */
export async function battleUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.battleUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListBattleResultVO_>('/api/boss/battle', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取Boss对战信息（包含当前用户的宠物信息和Boss信息） GET /api/boss/battle/info */
export async function getBossBattleInfoUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getBossBattleInfoUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBossBattleInfoVO_>('/api/boss/battle/info', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取Boss列表 GET /api/boss/list */
export async function getBossListUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListBossVO_>('/api/boss/list', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取当前缓存中的Boss列表数据（包含实时血量） GET /api/boss/list/cache */
export async function getBossListWithCacheUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListBossVO_>('/api/boss/list/cache', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取Boss挑战排行榜 GET /api/boss/ranking */
export async function getBossChallengeRankingUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getBossChallengeRankingUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListBossChallengeRankingVO_>('/api/boss/ranking', {
    method: 'GET',
    params: {
      // limit has a default value: 10
      limit: '10',
      ...params,
    },
    ...(options || {}),
  });
}
