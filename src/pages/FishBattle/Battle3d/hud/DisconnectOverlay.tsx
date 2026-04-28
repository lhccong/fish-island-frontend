import React, { useEffect, useState } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import { useGameStore } from '../store/useGameStore';

/**
 * 断线遮罩组件（仿英雄联盟断线重连界面）。
 * 当联机模式启用且连接状态为 disconnected / error 时显示全屏半透明遮罩，
 * 展示当前连接状态文案和旋转加载动画，阻断玩家操作以防止无效指令堆积。
 */
const DisconnectOverlay: React.FC = () => {
  const status = useGameStore((s) => s.multiplayerSession.status);
  const errorMessage = useGameStore((s) => s.multiplayerSession.errorMessage);
  const multiplayerEnabled = GAME_CONFIG.multiplayer.enabled;

  /* 断线计时器：显示已断线多少秒 */
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const shouldShow = multiplayerEnabled && (status === 'disconnected' || status === 'error');

  useEffect(() => {
    if (!shouldShow) {
      setElapsedSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  const isError = status === 'error';
  const displayMessage = errorMessage ?? (isError ? '与战场服务器连接异常' : '与战场的连接已中断');

  return (
    <div
      className="absolute inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.9) 100%)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md px-8">
        {/* 旋转加载圆环（重连中） / 错误图标 */}
        {!isError ? (
          <div className="relative w-16 h-16">
            {/* 外圈旋转 */}
            <div
              className="absolute inset-0 rounded-full border-[3px] border-transparent"
              style={{
                borderTopColor: '#c89b3c',
                borderRightColor: 'rgba(200,155,60,0.3)',
                animation: 'spin 1.2s linear infinite',
              }}
            />
            {/* 内圈反向旋转 */}
            <div
              className="absolute inset-2 rounded-full border-[2px] border-transparent"
              style={{
                borderBottomColor: '#0a96aa',
                borderLeftColor: 'rgba(10,150,170,0.3)',
                animation: 'spin 0.9s linear infinite reverse',
              }}
            />
            {/* 中心点 */}
            <div
              className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: '#c89b3c', boxShadow: '0 0 8px rgba(200,155,60,0.6)' }}
            />
          </div>
        ) : (
          /* 错误图标：红色叹号 */
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold"
            style={{
              background: 'rgba(220,38,38,0.15)',
              border: '2px solid rgba(220,38,38,0.5)',
              color: '#ef4444',
              textShadow: '0 0 10px rgba(239,68,68,0.4)',
            }}
          >
            !
          </div>
        )}

        {/* 主标题 */}
        <h2
          className="text-xl font-bold tracking-wider text-center"
          style={{
            color: isError ? '#ef4444' : '#c89b3c',
            textShadow: isError
              ? '0 0 12px rgba(239,68,68,0.3)'
              : '0 0 12px rgba(200,155,60,0.3)',
          }}
        >
          {isError ? '连接中断' : '正在重连战场'}
        </h2>

        {/* 描述文字 */}
        <p className="text-sm text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {displayMessage}
        </p>

        {/* 计时器 */}
        <div
          className="text-xs font-mono tabular-nums"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          已离线 {elapsedSeconds} 秒
        </div>

        {/* 错误状态下的刷新按钮 */}
        {isError && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded text-sm font-medium transition-all duration-200 cursor-pointer"
            style={{
              background: 'linear-gradient(180deg, #c89b3c 0%, #785a28 100%)',
              color: '#0a0a0a',
              border: '1px solid #c89b3c',
              boxShadow: '0 2px 8px rgba(200,155,60,0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(200,155,60,0.5)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(200,155,60,0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            刷新页面
          </button>
        )}

        {/* 底部提示 */}
        <div
          className="text-[10px] text-center mt-2"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          {isError
            ? '请检查网络环境，或稍后重试'
            : '请保持网络畅通，正在自动重连中...'}
        </div>
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DisconnectOverlay;
