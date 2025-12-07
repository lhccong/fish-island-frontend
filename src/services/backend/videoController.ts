import { request } from 'umi';

// 获取小姐姐短视频
export async function getMissVideo() {
  return request<{
    code: number;
    data: {
      code: number;
      msg: string;
      data: string;
      request_id: string;
    };
    message: string;
  }>('/api/miss', {
    method: 'GET',
  });
}

// 获取随机哔哩哔哩视频
export async function getRandomBilibiliVideo() {
  return request<{
    code: number;
    data: {
      bvid: string;
      url: string;
    };
    message: string;
  }>('/api/bilibili/random', {
    method: 'GET',
  });
}
