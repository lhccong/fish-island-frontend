// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 根据ID获取作物详情 GET /api/crop/${param0} */
export async function getCropByIdUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getCropByIdUsingGETParams,
  options?: { [key: string]: any },
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseCropDTO_>(`/api/crop/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取所有作物列表 GET /api/crop/all */
export async function getAllCropsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListCropDTO_>('/api/crop/all', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取所有作物分类 GET /api/crop/categories */
export async function getCategoriesUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListCropCategoryVO_>('/api/crop/categories', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 根据分类获取作物列表 GET /api/crop/category */
export async function getCropsByCategoryUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getCropsByCategoryUsingGETParams,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponseListCropDTO_>('/api/crop/category', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
