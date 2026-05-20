// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 根据系统用户ID批量获取农场用户信息 POST /api/farm/user/get-by-ids */
export async function getFarmUsersByUserIdsUsingPost(
  body: number[],
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListFarmUserVO_>('/api/farm/user/get-by-ids', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取我的农场用户信息 GET /api/farm/user/info */
export async function getMyFarmUserUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseFarmUserVO_>('/api/farm/user/info', {
    method: 'GET',
    ...(options || {}),
  });
}
