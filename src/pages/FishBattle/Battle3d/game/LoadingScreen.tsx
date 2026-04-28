import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

const LoadingScreen: React.FC = () => {
  const isLoading = useGameStore((s) => s.isLoading);
  const progress = useGameStore((s) => s.loadingProgress);
  const loadingError = useGameStore((s) => s.loadingError);
  const allScenesReady = useGameStore((s) => s.allScenesReady);

  const shouldHide = !isLoading && allScenesReady;
  const [fadingOut, setFadingOut] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    if (!shouldHide) return;
    setFadingOut(true);
    const timer = setTimeout(() => setUnmounted(true), 900);
    return () => clearTimeout(timer);
  }, [shouldHide]);

  if (unmounted) return null;

  const isWaitingForOthers = !isLoading && !allScenesReady;

  return (
    <div
      className="absolute inset-0 z-[40] flex flex-col items-center justify-center transition-opacity duration-800"
      style={{ background: '#080c18', opacity: fadingOut ? 0 : 1 }}
    >
      <div
        className="text-4xl font-extrabold mb-2"
        style={{
          background: 'linear-gradient(135deg, #64b5f6, #ce93d8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        摸鱼大乱斗
      </div>
      <div className="text-xs text-white/30 mb-5">
        {isWaitingForOthers ? '等待其他玩家加载完成...' : '嚎哭深渊 · 3D战场加载中...'}
      </div>
      <div className="w-72 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-400"
          style={{
            width: `${Math.floor(progress)}%`,
            background: isWaitingForOthers
              ? 'linear-gradient(90deg, #81c784, #4caf50)'
              : 'linear-gradient(90deg, #64b5f6, #ce93d8)',
          }}
        />
      </div>
      <div className="text-xs text-white/25 mt-3">
        {isWaitingForOthers ? '本地资源已就绪' : `${Math.floor(progress)}%`}
      </div>
      {loadingError ? <div className="text-[11px] text-white/20 mt-2">部分场景或英雄模型加载失败，已自动降级显示</div> : null}
    </div>
  );
};

export default LoadingScreen;
