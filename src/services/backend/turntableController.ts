// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取转盘详情 GET /api/turntable/detail/${param0} */
export async function getTurntableDetailUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getTurntableDetailUsingGETParams,
  options?: { [key: string]: any },
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseTurntableVO_>(`/api/turntable/detail/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 执行抽奖 POST /api/turntable/draw */
export async function drawUsingPost(body: API.DrawRequest, options?: { [key: string]: any }) {
  return request<API.BaseResponseDrawResultVO_>('/api/turntable/draw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取激活的转盘列表 GET /api/turntable/list */
export async function listTurntablesUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listTurntablesUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListTurntableVO_>('/api/turntable/list', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 查询抽奖记录 GET /api/turntable/records */
export async function listDrawRecordsUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listDrawRecordsUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageDrawRecordVO_>('/api/turntable/records', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
