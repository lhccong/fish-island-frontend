// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 创建兑换码（管理员） POST /api/redeemCode/admin/add */
export async function addRedeemCodeUsingPost(
  body: API.RedeemCodeAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListString_>('/api/redeemCode/admin/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除兑换码（管理员） DELETE /api/redeemCode/admin/delete/${param0} */
export async function deleteRedeemCodeUsingDelete(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteRedeemCodeUsingDELETEParams,
  options?: { [key: string]: any },
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean_>(`/api/redeemCode/admin/delete/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 分页查询兑换码（管理员） GET /api/redeemCode/admin/list */
export async function listRedeemCodePageUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listRedeemCodePageUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageRedeemCodeVO_>('/api/redeemCode/admin/list', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 使用兑换码 POST /api/redeemCode/use */
export async function useRedeemCodeUsingPost(
  body: API.RedeemCodeUseRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseRedeemCodeUseResultVO_>('/api/redeemCode/use', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
