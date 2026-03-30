// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 添加基金 POST /api/fund/add */
export async function addFundUsingPost(body: API.AddFundRequest, options?: { [key: string]: any }) {
  return request<API.BaseResponseBoolean_>('/api/fund/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除基金 POST /api/fund/delete */
export async function deleteFundUsingPost(
  body: API.DeleteFundRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/fund/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 编辑基金 POST /api/fund/edit */
export async function editFundUsingPost(
  body: API.EditFundRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/fund/edit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取国内主要指数行情 GET /api/fund/indices */
export async function getMajorIndicesUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListMarketIndexVO_>('/api/fund/indices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取基金持仓列表 GET /api/fund/list */
export async function getFundListUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseFundListVO_>('/api/fund/list', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 管理员更新基金 POST /api/fund/update */
export async function updateFundUsingPost(
  body: API.UpdateFundRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/fund/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
