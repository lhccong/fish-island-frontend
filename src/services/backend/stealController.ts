// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 偷菜（支持批量） POST /api/steal */
export async function stealUsingPost(body: API.StealRequest, options?: { [key: string]: any }) {
  return request<API.BaseResponseListFarmStealRecord_>('/api/steal', {
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

/** 偷菜记录一键已读 POST /api/steal/my-stolen/read-all */
export async function markAllStolenRecordsAsReadUsingPost(options?: { [key: string]: any }) {
  return request<API.BaseResponseBoolean_>('/api/steal/my-stolen/read-all', {
    method: 'POST',
    ...(options || {}),
  });
}
