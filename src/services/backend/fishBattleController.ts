import { request } from '@umijs/max';

/**
 * 摸鱼大乱斗 REST API 服务
 */

/* ==================== 英雄 ==================== */

/** 获取英雄列表 GET /fishBattle/hero/list */
export async function fishBattleHeroList() {
  return request<API.BaseResponseListObject>('/api/fishBattle/hero/list', {
    method: 'GET',
  });
}

/* ==================== 房间 ==================== */

/** 创建房间 POST /fishBattle/room/create */
export async function fishBattleRoomCreate(body: {
  roomName?: string;
  gameMode?: string;
  aiFillEnabled?: boolean;
}) {
  return request<API.BaseResponseObject>('/api/fishBattle/room/create', {
    method: 'POST',
    data: body,
  });
}

/** 获取等待中的房间列表 GET /fishBattle/room/list */
export async function fishBattleRoomList() {
  return request<API.BaseResponseListObject>('/api/fishBattle/room/list', {
    method: 'GET',
  });
}

/** 分页查询活跃房间（等待中+对局中） GET /fishBattle/room/page */
export async function fishBattleRoomPage(params: { current?: number; pageSize?: number }) {
  return request<API.BaseResponseObject>('/api/fishBattle/room/page', {
    method: 'GET',
    params,
  });
}

/** 获取房间详情 GET /fishBattle/room/:roomCode */
export async function fishBattleRoomDetail(roomCode: string) {
  return request<API.BaseResponseObject>(`/api/fishBattle/room/${roomCode}`, {
    method: 'GET',
  });
}

/** 加入房间（选择队伍和位置） POST /fishBattle/room/join */
export async function fishBattleRoomJoin(body: {
  roomCode: string;
  team: string;
  slotIndex: number;
}) {
  return request<API.BaseResponseObject>('/api/fishBattle/room/join', {
    method: 'POST',
    data: body,
  });
}

/** 切换队伍/位置 POST /fishBattle/room/switchTeam */
export async function fishBattleRoomSwitchTeam(body: {
  roomCode: string;
  team: string;
  slotIndex: number;
}) {
  return request<API.BaseResponseObject>('/api/fishBattle/room/switchTeam', {
    method: 'POST',
    data: body,
  });
}

/** 查询当前用户是否有进行中的对局（断线重连用） GET /fishBattle/room/myActiveRoom */
export async function fishBattleRoomMyActiveRoom() {
  return request<API.BaseResponseObject>('/api/fishBattle/room/myActiveRoom', {
    method: 'GET',
  });
}

/** 查询进行中的房间列表 GET /fishBattle/room/inProgress */
export async function fishBattleRoomInProgress() {
  return request<API.BaseResponseListObject>('/api/fishBattle/room/inProgress', {
    method: 'GET',
  });
}

/* ==================== 对局 ==================== */

/** 获取对局详情 GET /fishBattle/game/:gameId */
export async function fishBattleGameDetail(gameId: number) {
  return request<API.BaseResponseObject>(`/api/fishBattle/game/${gameId}`, {
    method: 'GET',
  });
}

/** 点赞玩家 POST /fishBattle/game/like */
export async function fishBattleGameLike(body: {
  gameId: number;
  targetUserId: number;
}) {
  return request<API.BaseResponseBoolean>('/api/fishBattle/game/like', {
    method: 'POST',
    data: body,
  });
}

/* ==================== 游戏配置 ==================== */

/** 获取地图场景配置 GET /fishBattle/config/map */
export async function fishBattleMapConfig() {
  return request<API.BaseResponseObject>('/api/fishBattle/config/map', {
    method: 'GET',
  });
}

/** 获取游戏主配置 GET /fishBattle/config/game */
export async function fishBattleGameConfig() {
  return request<API.BaseResponseObject>('/api/fishBattle/config/game', {
    method: 'GET',
  });
}

/** 根据configKey获取配置 GET /fishBattle/config/:configKey */
export async function fishBattleConfig(configKey: string) {
  return request<API.BaseResponseObject>(`/api/fishBattle/config/${configKey}`, {
    method: 'GET',
  });
}

/* ==================== 统计 ==================== */

/** 获取个人总体统计 GET /fishBattle/stats/user */
export async function fishBattleStatsUser() {
  return request<API.BaseResponseObject>('/api/fishBattle/stats/user', {
    method: 'GET',
  });
}

/** 获取对局历史 GET /fishBattle/stats/history */
export async function fishBattleStatsHistory(params: {
  current?: number;
  pageSize?: number;
}) {
  return request<API.BaseResponseObject>('/api/fishBattle/stats/history', {
    method: 'GET',
    params,
  });
}

/** 获取排行榜 GET /fishBattle/stats/leaderboard */
export async function fishBattleStatsLeaderboard(params?: { limit?: number }) {
  return request<API.BaseResponseListObject>('/api/fishBattle/stats/leaderboard', {
    method: 'GET',
    params,
  });
}

/** 获取概览数据 GET /fishBattle/stats/overview */
export async function fishBattleStatsOverview() {
  return request<API.BaseResponseObject>('/api/fishBattle/stats/overview', {
    method: 'GET',
  });
}
