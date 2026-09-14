// @ts-ignore
/* eslint-disable */
// 农场成就任务（PRD v2.1）：与后端 FarmAchievementController 对齐
import { request } from '@umijs/max';

/** 农场成就任务 */
export interface FarmAchievementTaskVO {
  taskId: number;
  name: string;
  description?: string;
  type: string;
  targetCount: number;
  rewardValue: number;
  /** 0-进行中 1-已完成未领取 2-已领取 */
  status: number;
  completedTime?: string;
}

export interface BaseResponseFarmAchievementTaskVOList_ {
  code?: number;
  data?: FarmAchievementTaskVO[];
  message?: string;
}

/** 我的农场成就任务 GET /api/achievement/list */
export async function listFarmAchievementsUsingGet(options?: {
  [key: string]: any;
}) {
  return request<BaseResponseFarmAchievementTaskVOList_>('/api/achievement/list', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 领取成就奖励 POST /api/achievement/claim */
export async function claimFarmAchievementUsingPost(
  body: { taskId: number },
  options?: { [key: string]: any },
) {
  return request<BaseResponseBoolean_>('/api/achievement/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: body,
    ...(options || {}),
  });
}
