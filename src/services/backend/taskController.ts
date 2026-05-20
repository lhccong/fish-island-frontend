// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 领取任务奖励 POST /api/task/claim/${param0} */
export async function claimRewardUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.claimRewardUsingPOSTParams,
  options?: { [key: string]: any },
) {
  const { taskId: param0, ...queryParams } = params;
  return request<API.BaseResponseInt_>(`/api/task/claim/${param0}`, {
    method: 'POST',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取每日任务列表 GET /api/task/daily */
export async function getDailyTasksUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListTaskDTO_>('/api/task/daily', {
    method: 'GET',
    ...(options || {}),
  });
}
