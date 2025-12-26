// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 添加帖子 POST /api/post/add */
export async function addPostUsingPost(body: API.PostAddRequest, options?: { [key: string]: any }) {
  return request<API.BaseResponseLong_>('/api/post/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除帖子 POST /api/post/delete */
export async function deletePostUsingPost1(
  body: API.DeleteRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/post/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 编辑（用户） POST /api/post/edit */
export async function editPostUsingPost(
  body: API.PostEditRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/post/edit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 设置帖子加精状态（仅管理员） POST /api/post/featured */
export async function setFeaturedStatusUsingPost(
  body: API.PostFeaturedRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/post/featured', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 根据 id 获取 GET /api/post/get/vo */
export async function getPostVoByIdUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getPostVoByIdUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePostVO_>('/api/post/get/vo', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 分页获取列表（仅管理员） POST /api/post/list/page */
export async function listPostByPageUsingPost(
  body: API.PostQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePagePost_>('/api/post/list/page', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页获取列表（封装类） POST /api/post/list/page/vo */
export async function listPostVoByPageUsingPost(
  body: API.PostQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePagePostVO_>('/api/post/list/page/vo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页获取当前用户收藏的帖子 POST /api/post/my/favour/list/page/vo */
export async function listMyFavourPostVoByPageUsingPost(
  body: API.PostQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePagePostVO_>('/api/post/my/favour/list/page/vo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页获取当前用户创建的资源列表 POST /api/post/my/list/page/vo */
export async function listMyPostVoByPageUsingPost(
  body: API.PostQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePagePostVO_>('/api/post/my/list/page/vo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 从帖子点赞列表中随机抽取一个用户（仅帖子创建用户可使用） POST /api/post/random/thumb/user */
export async function randomThumbUserUsingPost(
  body: API.PostRandomThumbRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseUserRewardVO_>('/api/post/random/thumb/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取帖子兑奖加密token GET /api/post/reward/token */
export async function getPostRewardTokenUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getPostRewardTokenUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePostRewardTokenVO_>('/api/post/reward/token', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取当前中奖用户 GET /api/post/reward/user */
export async function getCurrentRewardUserUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getCurrentRewardUserUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseUserRewardVO_>('/api/post/reward/user', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新（仅管理员） POST /api/post/update */
export async function updatePostUsingPost(
  body: API.PostUpdateRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/post/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
