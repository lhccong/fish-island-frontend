// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 分页获取打赏明细列表 按打赏时间倒序，每次打赏独立展示，不累加 POST /api/donation/detail/list/page/vo */
export async function listDetailVoByPageUsingPost(
  body: API.DonationDetailRecordsQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageDonationDetailRecordsVO_>(
    '/api/donation/detail/list/page/vo',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
      ...(options || {}),
    },
  );
}
