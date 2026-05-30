// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前进行中的福袋列表 GET /api/luckybag/active */
export async function getActiveLuckyBagsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListLuckyBag_>('/api/luckybag/active', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建福袋 POST /api/luckybag/create */
export async function createLuckyBagUsingPost(
  body: API.CreateLuckyBagRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseString_>('/api/luckybag/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取福袋详情 GET /api/luckybag/detail */
export async function getLuckyBagDetailUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getLuckyBagDetailUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseLuckyBag_>('/api/luckybag/detail', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 参与福袋 POST /api/luckybag/join */
export async function joinLuckyBagUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.joinLuckyBagUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/luckybag/join', {
    method: 'POST',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取福袋中奖记录 GET /api/luckybag/records */
export async function getLuckyBagWinRecordsUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getLuckyBagWinRecordsUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListVO_>('/api/luckybag/records', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
