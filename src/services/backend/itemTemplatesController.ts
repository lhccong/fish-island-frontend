// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 添加物品 POST /api/itemTemplates/add */
export async function addItemTemplateUsingPost(
  body: API.ItemTemplateAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseLong_>('/api/itemTemplates/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除物品模板 POST /api/itemTemplates/delete */
export async function deleteItemTemplateUsingPost(
  body: API.DeleteRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/itemTemplates/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 编辑物品模板信息（管理员） POST /api/itemTemplates/edit */
export async function editItemTemplateUsingPost(
  body: API.ItemTemplateEditRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseItemTemplateVO_>('/api/itemTemplates/edit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 根据ID获取物品模板详情 POST /api/itemTemplates/get/vo */
export async function getItemTemplateVoByIdUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getItemTemplateVOByIdUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseItemTemplateVO_>('/api/itemTemplates/get/vo', {
    method: 'POST',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 分页获取物品模板列表 POST /api/itemTemplates/list/page/vo */
export async function listItemTemplatesVoByPageUsingPost(
  body: API.ItemTemplateQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageItemTemplateVO_>('/api/itemTemplates/list/page/vo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
