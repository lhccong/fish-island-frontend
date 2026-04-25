// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取宠物装备列表 GET /api/pet/forge/list */
export async function listByPetIdUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listByPetIdUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListPetEquipForgeVO_>('/api/pet/forge/list', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 刷新装备词条 POST /api/pet/forge/refresh */
export async function refreshEntriesUsingPost(
  body: API.ForgeRefreshRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePetEquipForgeVO_>('/api/pet/forge/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 装备升级 POST /api/pet/forge/upgrade */
export async function upgradeEquipUsingPost(
  body: API.ForgeUpgradeRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/pet/forge/upgrade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
