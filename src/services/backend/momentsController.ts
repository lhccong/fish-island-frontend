// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 发表评论 POST /api/moments/comment/add */
export async function addCommentUsingPost1(
  body: API.MomentsCommentAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseLong_>('/api/moments/comment/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除评论 POST /api/moments/comment/delete */
export async function deleteCommentUsingPost(
  body: API.DeleteRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/moments/comment/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取动态评论列表（顶级评论分页，子评论全量挂载） POST /api/moments/comment/list */
export async function listCommentsUsingPost(
  body: API.MomentsCommentQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageMomentsCommentVO_>('/api/moments/comment/list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除朋友圈动态 POST /api/moments/delete */
export async function deleteMomentUsingPost(
  body: API.DeleteRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/moments/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 点赞或取消点赞 POST /api/moments/like */
export async function toggleLikeUsingPost(
  body: API.MomentsLikeRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/moments/like', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页查询朋友圈动态 POST /api/moments/list */
export async function listMomentsUsingPost(
  body: API.MomentsQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageMomentsVO_>('/api/moments/list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 发布朋友圈动态 POST /api/moments/publish */
export async function publishMomentUsingPost(
  body: API.MomentsAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseLong_>('/api/moments/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
