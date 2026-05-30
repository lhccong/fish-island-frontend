// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 买入指数 支持 sh000001(上证)、sz399001(深证成指)、sz399006(创业板指)、sh000300(沪深300)、sh000016(上证50) POST /api/index/trade/buy */
export async function buyIndexUsingPost(
  body: API.IndexBuyRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseIndexTradeResultVO_>('/api/index/trade/buy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取用户持仓信息 GET /api/index/trade/position */
export async function getPositionUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getPositionUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseIndexPositionVO_>('/api/index/trade/position', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取用户全部指数持仓 GET /api/index/trade/positions */
export async function getPositionsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListIndexPositionVO_>('/api/index/trade/positions', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 卖出指数 支持 sh000001(上证)、sz399001(深证成指)、sz399006(创业板指)、sh000300(沪深300)、sh000016(上证50) POST /api/index/trade/sell */
export async function sellIndexUsingPost(
  body: API.IndexSellRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseIndexTradeResultVO_>('/api/index/trade/sell', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取交易记录列表 POST /api/index/trade/transactions */
export async function getTransactionsUsingPost(
  body: API.IndexTransactionQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageIndexTransactionVO_>('/api/index/trade/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
