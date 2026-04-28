import React, { useEffect, useState } from 'react';
import { useParams, useModel } from '@umijs/max';
import { message } from 'antd';
import { fishBattleHeroList } from '@/services/backend/fishBattleController';
import App from './App';
import './index.css';
import type { FishBattleHero } from '../types';
import { registerRuntimeHeroes } from './config/heroConfig';
import { setBattleRoomCode } from './network/socketClient';
import { useGameStore } from './store/useGameStore';
import { useSharedMapConfig } from './config/useSharedMapConfig';

/**
 * 3D 对战页面入口。
 * 由 UmiJS 路由 /fishBattle/battle3d/:roomCode 映射到此组件。
 */
interface Battle3dPageProps {
  roomCode?: string;
}

const Battle3dPage: React.FC<Battle3dPageProps> = (props) => {
  const params = useParams<{ roomCode: string }>();
  const roomCode = props.roomCode || params.roomCode;
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const playerName = currentUser?.userName || '玩家';
  const fishBattleWindow = useModel('fishBattleWindow');
  const multiplayerStatus = useGameStore((s) => s.multiplayerSession.status);
  const errorMessage = useGameStore((s) => s.multiplayerSession.errorMessage);
  const [heroRegistryReady, setHeroRegistryReady] = useState(false);
  const { loaded: mapConfigLoaded } = useSharedMapConfig(roomCode);

  // 同步设置 roomCode（在渲染阶段执行，先于所有子组件 useEffect）
  // 确保 useBattleWsSync 中 connectToBattleSocket 读取到正确的 roomCode
  setBattleRoomCode(roomCode);

  useEffect(() => {
    return () => {
      setBattleRoomCode(undefined);
    };
  }, [roomCode]);

  useEffect(() => {
    let cancelled = false;
    const bootstrapHeroes = async () => {
      try {
        const res = await fishBattleHeroList();
        const heroes = (res?.data || []) as FishBattleHero[];
        if (!cancelled) {
          registerRuntimeHeroes(heroes);
        }
      } catch (error) {
        console.warn('[Battle3d] Failed to load runtime heroes:', error);
      } finally {
        if (!cancelled) {
          setHeroRegistryReady(true);
        }
      }
    };
    bootstrapHeroes();
    return () => {
      cancelled = true;
    };
  }, []);

  // 两个异步依赖都就绪后再初始化游戏状态，
  // 确保 MAP_CONFIG 已被 useSharedMapConfig 覆盖了正确坐标，建筑不会出现在原点。
  useEffect(() => {
    if (heroRegistryReady && mapConfigLoaded) {
      useGameStore.getState().initGameState();
    }
  }, [heroRegistryReady, mapConfigLoaded]);

  // 检测不可恢复的错误（房间不存在、会话被取代），自动关闭浮动窗口
  useEffect(() => {
    if (multiplayerStatus === 'error' && errorMessage) {
      message.error(errorMessage);
      const timer = setTimeout(() => {
        fishBattleWindow.closeWindow();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [multiplayerStatus, errorMessage]);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {heroRegistryReady && mapConfigLoaded ? <App playerName={playerName} /> : null}
    </div>
  );
};

export default Battle3dPage;
