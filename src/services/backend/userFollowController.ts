// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 查询我的粉丝列表 分页返回关注当前用户的人 GET /api/follow/followers */
export async function listMyFollowersUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listMyFollowersUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageUserFollowVO_>('/api/follow/followers', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 查询我的关注列表 分页返回当前用户关注的人 GET /api/follow/following */
export async function listMyFollowingUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listMyFollowingUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageUserFollowVO_>('/api/follow/following', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 是否已关注 判断当前用户是否已关注指定用户 GET /api/follow/is-following */
export async function isFollowingUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.isFollowingUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/follow/is-following', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 关注/取消关注 已关注则取消，未关注则新增 GET /api/follow/toggle */
export async function toggleFollowUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.toggleFollowUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/follow/toggle', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
