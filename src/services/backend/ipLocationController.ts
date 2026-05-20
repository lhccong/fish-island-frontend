// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前用户 IP 地理位置 GET /api/ip/location */
export async function getLocationUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseIP_>('/api/ip/location', {
    method: 'GET',
    ...(options || {}),
  });
}
