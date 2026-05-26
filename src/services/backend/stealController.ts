// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 偷菜 POST /api/steal */
export async function stealUsingPost(body: API.StealRequest, options?: { [key: string]: any }) {
  return request<API.BaseResponseFarmStealRecord_>('/api/steal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 谁偷了我的菜 GET /api/steal/my-stolen */
export async function getMyStolenRecordsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListFarmStealRecordVO_>('/api/steal/my-stolen', {
    method: 'GET',
    ...(options || {}),
  });
}
