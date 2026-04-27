import React, { useEffect } from 'react';
import { useParams, useModel, history } from '@umijs/max';
import { Spin } from 'antd';
import type { FishBattlePhase } from '@/models/fishBattleWindow';

/**
 * 路由兼容包装器
 *
 * 当用户通过 URL 直接访问游戏页面路由时（如 /fishBattle/heroSelect/:roomCode），
 * 自动打开浮动窗口并导航到 Room 页面或大厅。
 *
 * 用法：在原有路由配置中作为组件替代使用。
 */
interface RouteRedirectProps {
  phase: FishBattlePhase;
}

const FishBattleRouteRedirect: React.FC<RouteRedirectProps> = ({ phase }) => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { visible, openWindow } = useModel('fishBattleWindow');

  useEffect(() => {
    if (roomCode && !visible) {
      // 打开浮动窗口并设置对应阶段
      openWindow(roomCode, phase);
      // 导航回 Room 页面（如果存在）或大厅
      history.replace(`/fishBattle/room/${roomCode}`);
    } else if (roomCode && visible) {
      // 窗口已打开，返回 Room 或大厅
      history.replace(`/fishBattle/room/${roomCode}`);
    } else {
      // 没有 roomCode，跳回大厅
      history.replace('/fishBattle/lobby');
    }
  }, [roomCode]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: '#7a8ea0',
      }}
    >
      <Spin size="large" tip="正在打开游戏窗口..." />
    </div>
  );
};

/** 英雄选择路由重定向 */
export const HeroSelectRouteRedirect: React.FC = () => (
  <FishBattleRouteRedirect phase="heroSelect" />
);

/** 游戏加载路由重定向 */
export const LoadingRouteRedirect: React.FC = () => (
  <FishBattleRouteRedirect phase="loading" />
);

/** 3D对战路由重定向 */
export const Battle3dRouteRedirect: React.FC = () => (
  <FishBattleRouteRedirect phase="battle3d" />
);

export default FishBattleRouteRedirect;
