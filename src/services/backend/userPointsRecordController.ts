// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前登录用户的积分记录总数 GET /api/user/points/record/count/my */
export async function countMyPointsRecordsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseLong_>('/api/user/points/record/count/my', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取当前登录用户的积分记录列表 GET /api/user/points/record/list/my */
export async function listMyPointsRecordsUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listMyPointsRecordsUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageVO_>('/api/user/points/record/list/my', {
    method: 'GET',
    params: {
      // current has a default value: 1
      current: '1',
      // pageSize has a default value: 10
      pageSize: '10',
      ...params,
    },
    ...(options || {}),
  });
}

/** 根据来源类型获取当前登录用户的积分记录列表 GET /api/user/points/record/list/my/by-source */
export async function listMyPointsRecordsBySourceUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listMyPointsRecordsBySourceUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageVO_>('/api/user/points/record/list/my/by-source', {
    method: 'GET',
    params: {
      // current has a default value: 1
      current: '1',
      // pageSize has a default value: 10
      pageSize: '10',
      ...params,
    },
    ...(options || {}),
  });
}

/** 根据用户ID获取积分记录列表（仅管理员） GET /api/user/points/record/list/user */
export async function listUserPointsRecordsUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listUserPointsRecordsUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageVO_>('/api/user/points/record/list/user', {
    method: 'GET',
    params: {
      // current has a default value: 1
      current: '1',
      // pageSize has a default value: 10
      pageSize: '10',
      ...params,
    },
    ...(options || {}),
  });
}
