// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取自动喂食配置 获取当前用户指定宠物的自动喂食配置，未配置则返回null GET /api/pet/autoFeed/config */
export async function getConfigUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getConfigUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePetAutoFeedConfigVO_>('/api/pet/autoFeed/config', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 保存/更新自动喂食配置 设置宠物自动喂食的食物类型和触发阈值，同一宠物只有一条配置 POST /api/pet/autoFeed/config */
export async function saveOrUpdateConfigUsingPost(
  body: API.PetAutoFeedConfigRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePetAutoFeedConfigVO_>('/api/pet/autoFeed/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 开启/关闭自动喂食 enabled=1 开启，enabled=0 关闭；需先保存配置 POST /api/pet/autoFeed/toggle */
export async function toggleAutoFeedUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.toggleAutoFeedUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePetAutoFeedConfigVO_>('/api/pet/autoFeed/toggle', {
    method: 'POST',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
