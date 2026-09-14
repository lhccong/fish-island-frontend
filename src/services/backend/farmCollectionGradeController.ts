// @ts-ignore
/* eslint-disable */
// 作物图鉴（PRD v2.1）：与后端 FarmCollectionGradeController 对齐
import { request } from '@umijs/max';

/** 图鉴条目：某作物某品级的唯一记录（只保留该品级最大重量） */
export interface CollectionGradeEntryVO {
  grade: number;
  gradeIcon?: string;
  maxWeight: number;
  firstObtainedTime: string;
}

/** 按作物分组的图鉴 */
export interface CollectionGradeGroupVO {
  cropId: number;
  cropName: string;
  cropIcon?: string;
  entries: CollectionGradeEntryVO[];
  unlockedCount: number;
  completePercent: number;
}

export interface BaseResponseCollectionGradeGroupVOList_ {
  code?: number;
  data?: CollectionGradeGroupVO[];
  message?: string;
}

/** 我的作物图鉴 GET /api/collection/my */
export async function getMyCollectionUsingGet(options?: { [key: string]: any }) {
  return request<BaseResponseCollectionGradeGroupVOList_>('/api/collection/my', {
    method: 'GET',
    ...(options || {}),
  });
}
