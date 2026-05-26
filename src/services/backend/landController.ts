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
