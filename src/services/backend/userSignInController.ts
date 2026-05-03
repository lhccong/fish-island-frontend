// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 补签 每月最多补签3次，每次消耗20积分，只能补签最近7天内的未签到日期 POST /api/sign/makeup */
export async function makeUpSignInUsingPost(
  body: API.MakeUpSignInRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseSignInVO_>('/api/sign/makeup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 月度签到日历 返回指定月份每天签到状态和奖励，year/month 不传默认当前月 GET /api/sign/month */
export async function getMonthSignInUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getMonthSignInUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseMonthSignInVO_>('/api/sign/month', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 查询签到状态 返回今日签到状态、连续天数、本周期进度、可补签日期列表 GET /api/sign/status */
export async function getSignInStatusUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseSignInStatusVO_>('/api/sign/status', {
    method: 'GET',
    ...(options || {}),
  });
}
