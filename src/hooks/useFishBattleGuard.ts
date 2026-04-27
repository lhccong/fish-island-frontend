/**
 * 摸鱼大乱斗游戏流程守卫 Hook
 *
 * 被动校验方案：不主动发送 room:getInfo，而是由页面将已获取的房间数据传入。
 * 避免与页面自身的 room:info 监听产生冲突。
 *
 * 游戏页面（HeroSelect / Loading / Battle3d）现在只在浮动窗口中运行，
 * 不再使用独立路由。守卫负责根据房间状态切换浮动窗口阶段或关闭窗口。
 *
 * Room 页面仍然通过路由守卫保护。
 */
import { useEffect, useRef } from 'react';
import { history } from '@umijs/max';
import { message } from 'antd';

/** 当前页面允许的房间状态 */
type AllowedPage = 'room' | 'heroSelect' | 'loading' | 'battle3d';

interface GuardOptions {
  /** 当前页面类型 */
  page: AllowedPage;
  /** 房间编码 */
  roomCode?: string;
  /** 当前用户 ID */
  userId?: number;
  /** 房间状态（从页面自身的 room:info 回调中获取） */
  roomStatus?: number | null;
  /** 房间玩家列表（从页面自身的 room:info 回调中获取） */
  roomPlayers?: any[] | null;
  /** 是否处于加载阶段（从 room:info 的 room.isLoadingPhase 获取） */
  isLoadingPhase?: boolean;
  /** 浮动窗口模式下的阶段切换回调 */
  onPhaseChange?: (phase: 'heroSelect' | 'loading' | 'battle3d') => void;
  /** 浮动窗口模式下的关闭窗口回调 */
  onClose?: () => void;
}

/** 页面允许的房间状态映射 */
const PAGE_ALLOWED_STATUS: Record<AllowedPage, number[]> = {
  room: [0],          // 等待中
  heroSelect: [1],    // 选英雄中
  loading: [1, 2],    // 选英雄→对局过渡
  battle3d: [2],      // 对局中
};

/** 根据房间状态切换浮动窗口阶段或关闭窗口 */
function navigateToCorrectPhase(
  status: number,
  currentPage: AllowedPage,
  isLoadingPhase: boolean | undefined,
  onPhaseChange?: (phase: 'heroSelect' | 'loading' | 'battle3d') => void,
  onClose?: () => void,
) {
  switch (status) {
    case 0: // 等待中 → 关闭窗口（回到大厅可从房间列表重新进入）
      if (currentPage !== 'room') {
        onClose?.();
      }
      break;
    case 1:
      if (isLoadingPhase) {
        if (currentPage !== 'loading') onPhaseChange?.('loading');
      } else {
        if (currentPage !== 'heroSelect') onPhaseChange?.('heroSelect');
      }
      break;
    case 2:
      if (currentPage !== 'loading' && currentPage !== 'battle3d') onPhaseChange?.('loading');
      break;
    default:
      onClose?.();
      break;
  }
}

export function useFishBattleGuard(options: GuardOptions) {
  const { page, roomCode, userId, roomStatus, roomPlayers, isLoadingPhase, onPhaseChange, onClose } = options;
  const guardChecked = useRef(false);

  // 被动校验：当页面传入的 roomStatus/roomPlayers 变化时执行一次性校验
  useEffect(() => {
    if (!roomCode || !userId) return;
    // 等待页面获取到房间数据后再校验
    if (roomStatus === undefined || roomStatus === null) return;
    // 避免重复校验
    if (guardChecked.current) return;
    guardChecked.current = true;

    const allowedStatuses = PAGE_ALLOWED_STATUS[page];

    // 检查当前用户是否在房间内（Room页面允许不在房间内，因为要加入）
    if (page !== 'room' && roomPlayers) {
      const isInRoom = roomPlayers.some((p: any) => String(p.userId) === String(userId));
      if (!isInRoom) {
        message.warning('你不在此房间中');
        if (page === 'room') {
          history.replace('/fishBattle/lobby');
        } else {
          onClose?.();
        }
        return;
      }
    }

    // 检查房间状态是否允许当前页面
    const isAllowed = allowedStatuses.includes(roomStatus) ||
      (roomStatus === 1 && isLoadingPhase && page === 'loading');
    if (!isAllowed) {
      if (page === 'room') {
        // Room 页面仍走路由守卫
        if (roomStatus === 1 || roomStatus === 2) {
          // 游戏已开始但不在窗口中 → 跳大厅（大厅会检测活跃对局）
          history.replace('/fishBattle/lobby');
        } else {
          history.replace('/fishBattle/lobby');
        }
      } else {
        // 游戏页面（浮动窗口内）→ 切换阶段或关闭窗口
        navigateToCorrectPhase(roomStatus, page, isLoadingPhase, onPhaseChange, onClose);
      }
    }
  }, [roomStatus, roomPlayers, roomCode, userId, page]);

  // Room 页面防止浏览器回退（游戏页面在浮动窗口内，不需要此逻辑）
  useEffect(() => {
    if (!roomCode || page !== 'room') return;

    window.history.pushState({ guard: page }, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState({ guard: page }, '', window.location.href);
      message.info('游戏进行中，无法回退');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [roomCode, page]);
}

export default useFishBattleGuard;
