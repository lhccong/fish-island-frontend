// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前用户分身配置 GET /api/userAiAvatar/get */
export async function getAvatarUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseUserAiAvatar_>('/api/userAiAvatar/get', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 保存分身配置 POST /api/userAiAvatar/save */
export async function saveAvatarUsingPost(
  body: API.UserAiAvatarSaveRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseBoolean_>('/api/userAiAvatar/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
