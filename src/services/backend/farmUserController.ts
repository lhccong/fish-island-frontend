// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取我的农场用户信息 GET /api/farm/user/info */
export async function getMyFarmUserUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseFarmUserVO_>('/api/farm/user/info', {
    method: 'GET',
    ...(options || {}),
  });
}
