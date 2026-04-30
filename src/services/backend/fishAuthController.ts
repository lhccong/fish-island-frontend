// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 创建应用（自动生成 clientId / clientSecret） POST /api/auth/app/create */
export async function createAppUsingPost(
  body: API.FishAuthAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseFishAuthDetailVO_>('/api/auth/app/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除应用 POST /api/auth/app/delete */
export async function deleteAppUsingPost(
  body: API.DeleteRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/auth/app/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取应用详情（含 clientSecret） GET /api/auth/app/detail */
export async function getAppDetailUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getAppDetailUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseFishAuthDetailVO_>('/api/auth/app/detail', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 根据 clientId 查询应用公开信息（任何人可访问） GET /api/auth/app/info */
export async function getAppByClientIdUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getAppByClientIdUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseFishAuthVO_>('/api/auth/app/info', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 查询我的应用列表 GET /api/auth/app/list/my */
export async function listMyAppsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListFishAuthVO_>('/api/auth/app/list/my', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 重置 clientSecret POST /api/auth/app/reset-secret */
export async function resetSecretUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.resetSecretUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseString_>('/api/auth/app/reset-secret', {
    method: 'POST',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新应用信息 POST /api/auth/app/update */
export async function updateAppUsingPost(
  body: API.FishAuthUpdateRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/auth/app/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
