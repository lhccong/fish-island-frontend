// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 授权端点（用户已登录后调用，重定向携带授权码） GET /api/oauth2/authorize */
export async function authorizeUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.authorizeUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<any>('/api/oauth2/authorize', {
    method: 'GET',
    params: {
      // response_type has a default value: code
      response_type: 'code',
      // scope has a default value: read
      scope: 'read',
      ...params,
    },
    ...(options || {}),
  });
}

/** Token 端点（授权码换 access_token） POST /api/oauth2/token */
export async function tokenUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.tokenUsingPOSTParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseOAuth2TokenVO_>('/api/oauth2/token', {
    method: 'POST',
    params: {
      // grant_type has a default value: authorization_code
      grant_type: 'authorization_code',
      ...params,
    },
    ...(options || {}),
  });
}

/** 用户信息端点（Bearer Token） GET /api/oauth2/userinfo */
export async function userInfoUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseOAuth2UserInfoVO_>('/api/oauth2/userinfo', {
    method: 'GET',
    ...(options || {}),
  });
}
