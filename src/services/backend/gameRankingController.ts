// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 排行榜条目 */
interface GameRankingItemVO {
  rank?: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
  totalGames: number;
  winGames: number;
  loseGames: number;
  totalScore: number;
  winRate: number;
  extraStats?: string;
}

/** 排序选项 */
interface SortOptionVO {
  code: string;
  label: string;
  extKey?: string;
}

/** 通用响应 */
interface BaseResponse<T> {
  code: number;
  data: T;
  message?: string;
}

/** 获取游戏排行榜 GET /api/ranking/list */
export async function getRanking(
  gameType: number,
  sortBy?: string,
  topN: number = 50,
  minGames: number = 5,
  options?: { [key: string]: any },
): Promise<BaseResponse<GameRankingItemVO[]>> {
  return request<BaseResponse<GameRankingItemVO[]>>(`/api/ranking/list`, {
    method: 'GET',
    params: {
      gameType,
      sortBy,
      topN,
      minGames,
      ...options,
    },
  });
}

/** 获取当前用户的游戏战绩 GET /api/ranking/my */
export async function getMyStats(
  gameType: number,
  options?: { [key: string]: any },
): Promise<BaseResponse<any>> {
  return request<BaseResponse<any>>(`/api/ranking/my`, {
    method: 'GET',
    params: {
      gameType,
      ...options,
    },
  });
}

/** 获取游戏支持的排序选项 GET /api/ranking/options */
export async function getSortOptions(
  gameType: number,
  options?: { [key: string]: any },
): Promise<BaseResponse<SortOptionVO[]>> {
  return request<BaseResponse<SortOptionVO[]>>(`/api/ranking/options`, {
    method: 'GET',
    params: {
      gameType,
      ...options,
    },
  });
}

export const gameRankingService = {
  getRanking,
  getMyStats,
  getSortOptions,
};
