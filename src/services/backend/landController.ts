// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 批量收获作物 POST /api/land/harvest */
export async function harvestUsingPost(body: API.HarvestRequest, options?: { [key: string]: any }) {
  return request<API.BaseResponseListLandDTO_>('/api/land/harvest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取我的地块列表 GET /api/land/my */
export async function getMyLandsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListLandDTO_>('/api/land/my', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 批量种植作物 POST /api/land/plant */
export async function plantUsingPost(body: API.PlantRequest, options?: { [key: string]: any }) {
  return request<API.BaseResponseListLandDTO_>('/api/land/plant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 按农场等级解锁地块 第1–8块默认解锁；第9–12块需达到对应等级、消耗可用积分，且按顺序解锁 POST /api/land/unlock */
export async function unlockUsingPost(
  body: API.UnlockLandRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseLandDTO_>('/api/land/unlock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
