// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 新增数据源 Cookie（管理员） POST /api/datasource/cookie/add */
export async function addUsingPost(
  body: API.DataSourceCookieAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseLong_>('/api/datasource/cookie/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除数据源 Cookie（管理员） POST /api/datasource/cookie/delete */
export async function deleteUsingPost(body: API.DeleteRequest, options?: { [key: string]: any }) {
  return request<API.BaseResponseBoolean_>('/api/datasource/cookie/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 根据 ID 获取数据源 Cookie（管理员） GET /api/datasource/cookie/get */
export async function getByIdUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getByIdUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseDataSourceCookieVO_>('/api/datasource/cookie/get', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取可选数据源 Key 列表（管理员） GET /api/datasource/cookie/keys */
export async function listKeysUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListDataSourceKeyOptionVO_>('/api/datasource/cookie/keys', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 分页查询数据源 Cookie（管理员） POST /api/datasource/cookie/list/page */
export async function listPageUsingPost(
  body: API.DataSourceCookieQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageDataSourceCookieVO_>('/api/datasource/cookie/list/page', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 解析生效 Cookie（数据库优先，配置兜底，管理员） GET /api/datasource/cookie/resolve */
export async function resolveUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.resolveUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseMapStringString_>('/api/datasource/cookie/resolve', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新数据源 Cookie（管理员） POST /api/datasource/cookie/update */
export async function updateUsingPost(
  body: API.DataSourceCookieUpdateRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/datasource/cookie/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
