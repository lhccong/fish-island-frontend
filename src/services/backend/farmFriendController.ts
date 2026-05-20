// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 检查是否可以偷菜（需互相关注） GET /api/farm/friend/can-steal */
export async function canStealUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.canStealUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/farm/friend/can-steal', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取互关好友数量 GET /api/farm/friend/count */
export async function getFriendCountUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseInt_>('/api/farm/friend/count', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取互关好友农场列表（含偷菜状态） GET /api/farm/friend/list */
export async function getMyFriendsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListFarmFriendListVO_>('/api/farm/friend/list', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 访问互关好友农场（含地块详情） POST /api/farm/friend/visit */
export async function visitFriendFarmUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.visitFriendFarmUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseFarmFriendFarmVO_>('/api/farm/friend/visit', {
    method: 'POST',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取互关好友访问信息（不含地块） GET /api/farm/friend/visit-info */
export async function visitFriendUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.visitFriendUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseFarmFriendVisitVO_>('/api/farm/friend/visit-info', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
