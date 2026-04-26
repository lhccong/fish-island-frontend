// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 查询单件装备锻造详情 返回指定装备槽的词条属性、当前等级，以及本次升级所需积分和成功概率 POST /api/pet/forge/detail */
export async function getForgeDetailUsingPost(
  body: API.ForgeDetailRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePetEquipForgeDetailVO_>('/api/pet/forge/detail', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取宠物装备列表 根据宠物ID查询该宠物所有装备槽的锻造信息 GET /api/pet/forge/list */
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

/** 锁定/解锁词条 指定需要锁定的词条序号（1~4），未在列表中的词条将被解锁，传空列表表示解锁全部 POST /api/pet/forge/lock */
export async function lockEntriesUsingPost(
  body: API.ForgeLockRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePetEquipForgeVO_>('/api/pet/forge/lock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 刷新装备词条 基础消耗 100 积分，每有一条词条处于锁定状态额外 +50 积分，锁定的词条不会被刷新 POST /api/pet/forge/refresh */
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

/** 装备升级 消耗积分随等级递增，成功概率随等级递减，返回是否升级成功 POST /api/pet/forge/upgrade */
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
