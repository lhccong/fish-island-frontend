// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取活跃投票列表 GET /api/vote/active/list */
export async function getActiveVoteIdsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListString_>('/api/vote/active/list', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建投票 POST /api/vote/create */
export async function createVoteUsingPost(
  body: API.VoteAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseString_>('/api/vote/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除投票 POST /api/vote/delete/${param0} */
export async function deleteVoteUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteVoteUsingPOSTParams,
  options?: { [key: string]: any },
) {
  const { voteId: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean_>(`/api/vote/delete/${param0}`, {
    method: 'POST',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 参与投票 POST /api/vote/record */
export async function voteUsingPost1(
  body: API.VoteRecordRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/vote/record', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取投票结果 GET /api/vote/result/${param0} */
export async function getVoteResultUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getVoteResultUsingGETParams,
  options?: { [key: string]: any },
) {
  const { voteId: param0, ...queryParams } = params;
  return request<API.BaseResponseVoteVO_>(`/api/vote/result/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  });
}
