import React, { useEffect, useRef } from 'react';
import { GAME_CONFIG } from './config/gameConfig';
import BattleCanvas from './game/BattleCanvas';
import HUD from './hud/HUD';

import { useBattleWsSync } from './network/useBattleWsSync';
import { useGameStore } from './store/useGameStore';

interface AppProps {
  playerName?: string;
}

const App: React.FC<AppProps> = ({ playerName = 'Player' }) => {
  const battleRootRef = useRef<HTMLDivElement>(null);
  const multiplayerEnabled = GAME_CONFIG.multiplayer.enabled;

  const isLoading = useGameStore((s) => s.isLoading);
  const setAllScenesReady = useGameStore((s) => s.setAllScenesReady);

  /* Socket.IO 同步 Hook：连接 → battle:join → battle:state */
  useBattleWsSync(
    multiplayerEnabled,
    playerName,
  );

  /* 单机模式下，资产加载完毕后自动标记场景就绪。
   * 联机模式下由 useBattleWsSync 监听 battle:allSceneReady 屏障事件设置。 */
  useEffect(() => {
    if (!multiplayerEnabled && !isLoading) {
      setAllScenesReady(true);
    }
  }, [multiplayerEnabled, isLoading, setAllScenesReady]);

  return (
    <div ref={battleRootRef} className="relative w-full h-full overflow-hidden select-none">
      <BattleCanvas />
      <HUD viewportRef={battleRootRef} />
    </div>
  );
};

export default App;
