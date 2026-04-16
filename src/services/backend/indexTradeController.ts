// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 买入指数 POST /api/index/trade/buy */
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
export async function getPositionUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseIndexPositionVO_>('/api/index/trade/position', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 卖出指数 POST /api/index/trade/sell */
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
