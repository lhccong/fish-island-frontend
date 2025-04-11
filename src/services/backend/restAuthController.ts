// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取GitHub授权地址重定向 GET /api/oauth/render */
export async function renderAuthUsingGet(source: string, options?: { [key: string]: any }) {
  return request<any>(`/api/oauth/render/${source}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/* 解绑 */
export async function unbindPlatform(source: string, options?: { [key: string]: any }) {
  return request<any>(`/api/oauth/unbind/${source}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}