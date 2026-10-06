// @ts-ignore
/* eslint-disable */
// 农场 buff 道具（PRD v2.1）：与后端 FarmBuffController 对齐
import { request } from '@umijs/max';

/** 农场 buff 道具状态 */
export interface FarmBuffVO {
  buffType: number;
  name: string;
  owned: boolean;
  level: number;
  maxLevel: number;
  effectDesc?: string;
  nextEffectDesc?: string;
  unlockQualified: boolean;
  unlockDesc: string;
  purchaseCost: number;
  upgradeCost?: number;
  upgradeGradeThreshold?: number;
  upgradeThresholdSatisfied?: boolean;
}

export interface BaseResponseFarmBuffVOList_ {
  code?: number;
  data?: FarmBuffVO[];
  message?: string;
}

export interface BaseResponseFarmUserBuff_ {
  code?: number;
  data?: {
    id: number;
    userId: number;
    buffType: number;
    level: number;
    unlockTime: string;
    updateTime: string;
  };
  message?: string;
}

/** 我的农场 buff 道具状态 GET /api/buff/my */
export async function getMyBuffsUsingGet(options?: { [key: string]: any }) {
  return request<BaseResponseFarmBuffVOList_>('/api/buff/my', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 购买农场 buff 道具 POST /api/buff/purchase */
export async function purchaseBuffUsingPost(
  body: { buffType: number },
  options?: { [key: string]: any },
) {
  return request<BaseResponseFarmUserBuff_>('/api/buff/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: body,
    ...(options || {}),
  });
}

/** 升级农场 buff 道具 POST /api/buff/upgrade */
export async function upgradeBuffUsingPost(
  body: { buffType: number },
  options?: { [key: string]: any },
) {
  return request<BaseResponseFarmUserBuff_>('/api/buff/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: body,
    ...(options || {}),
  });
}
