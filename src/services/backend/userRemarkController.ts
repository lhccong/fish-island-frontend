// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前用户备注 GET /api/userRemark/get */
export async function getRemarkUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseUserRemark_>('/api/userRemark/get', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 保存备注 POST /api/userRemark/save */
export async function saveRemarkUsingPost(
  body: API.UserRemarkAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/userRemark/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
