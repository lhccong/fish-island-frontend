// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取好友地块列表（与我的地块数据结构一致） GET /api/farm/friend/lands */
export async function getFriendLandsUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getFriendLandsUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListLandDTO_>('/api/farm/friend/lands', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取农场好友列表（互相关注） GET /api/farm/friend/list */
export async function listFriendsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListFarmFriendListVO_>('/api/farm/friend/list', {
    method: 'GET',
    ...(options || {}),
  });
}
