// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 挑战指定位数（无排名或排名更低才可挑战） POST /api/pet/tournament/challenge */
export async function challengeUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.challengeUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseTournamentChallengeResultVO_>('/api/pet/tournament/challenge', {
    method: 'POST',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取当日武道大会排行榜 GET /api/pet/tournament/leaderboard */
export async function getLeaderboardUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListTournamentRankVO_>('/api/pet/tournament/leaderboard', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取我的当前排名（无排名返回null） GET /api/pet/tournament/my/rank */
export async function getMyRankUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseInt_>('/api/pet/tournament/my/rank', {
    method: 'GET',
    ...(options || {}),
  });
}
