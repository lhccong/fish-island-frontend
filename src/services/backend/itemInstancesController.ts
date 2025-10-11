// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 添加物品 POST /api/itemInstances/add */
export async function addItemInstanceUsingPost(
  body: API.ItemInstanceAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseLong_>('/api/itemInstances/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除物品 POST /api/itemInstances/delete */
export async function deleteItemInstanceUsingPost(
  body: API.DeleteRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/itemInstances/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 编辑物品实例信息（管理员） POST /api/itemInstances/edit */
export async function editItemInstanceUsingPost(
  body: API.ItemInstanceEditRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseItemInstanceVO_>('/api/itemInstances/edit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 根据 id 获取物品实例） GET /api/itemInstances/get */
export async function getItemInstanceByIdUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getItemInstanceByIdUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseItemInstances_>('/api/itemInstances/get', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 分页获取物品列表 POST /api/itemInstances/list/page */
export async function listItemInstancesByPageUsingPost(
  body: API.ItemInstanceQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageItemInstances_>('/api/itemInstances/list/page', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页获取物品列表（封装类） POST /api/itemInstances/list/page/vo */
export async function listItemInstancesVoByPageUsingPost(
  body: API.ItemInstanceQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageItemInstanceVO_>('/api/itemInstances/list/page/vo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页获取当前用户的物品列表（封装类） POST /api/itemInstances/my/list/page/vo */
export async function listMyItemInstancesByPageUsingPost(
  body: API.ItemInstanceQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageItemInstanceVO_>('/api/itemInstances/my/list/page/vo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新物品信息（用户） POST /api/itemInstances/update */
export async function updateItemInstanceUsingPost(
  body: API.ItemInstanceUpdateRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/itemInstances/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
