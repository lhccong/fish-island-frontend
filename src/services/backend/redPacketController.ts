// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 创建红包 POST /api/redpacket/create */
export async function createRedPacketUsingPost(
  body: API.CreateRedPacketRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseString_>('/api/redpacket/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取红包详情 GET /api/redpacket/detail */
export async function getRedPacketDetailUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getRedPacketDetailUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseRedPacket_>('/api/redpacket/detail', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 抢红包 POST /api/redpacket/grab */
export async function grabRedPacketUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.grabRedPacketUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseInt_>('/api/redpacket/grab', {
    method: 'POST',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取红包抢购记录 GET /api/redpacket/records */
export async function getRedPacketRecordsUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getRedPacketRecordsUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListVO_>('/api/redpacket/records', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 手动标记/取消标记脚本用户（仅管理员） POST /api/redpacket/script/mark */
export async function markScriptUserUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.markScriptUserUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/redpacket/script/mark', {
    method: 'POST',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
