// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 提交举报 POST /api/report/add */
export async function addReportUsingPost(
  body: API.ReportAddRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseLong_>('/api/report/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 处理举报（管理员） POST /api/report/admin/handle */
export async function handleReportUsingPost(
  body: API.ReportHandleRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/report/admin/handle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页查询举报记录（管理员） GET /api/report/admin/list */
export async function listReportPageUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listReportPageUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageReportVO_>('/api/report/admin/list', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取举报原因选项 GET /api/report/reasons */
export async function listReasonOptionsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListReportReasonOptionVO_>('/api/report/reasons', {
    method: 'GET',
    ...(options || {}),
  });
}
