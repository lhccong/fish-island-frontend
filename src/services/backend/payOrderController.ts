// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 发起支付 创建支付订单，返回二维码地址（PC端）和跳转链接（手机端） POST /api/pay/create */
export async function createPayOrderUsingPost(
  body: API.PayCreateRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePayOrderVO_>('/api/pay/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 支付回调（虎皮椒服务器调用） 虎皮椒支付成功后的异步通知接口，无需登录 POST /api/pay/notify */
export async function payNotifyUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.payNotifyUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<string>('/api/pay/notify', {
    method: 'POST',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 查询订单状态 根据商户订单号查询支付状态 GET /api/pay/query */
export async function queryOrderUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.queryOrderUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePayOrderVO_>('/api/pay/query', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
