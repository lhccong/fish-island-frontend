// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取宠物对战信息（双方宠物详情及剩余挑战次数） GET /api/pet/battle/info */
export async function getPetBattleInfoUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getPetBattleInfoUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePetBattleInfoVO_>('/api/pet/battle/info', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 宠物对战（不限次数） GET /api/pet/battle/start */
export async function battleUsingGet1(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.battleUsingGET1Params,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListPetBattleResultVO_>('/api/pet/battle/start', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
