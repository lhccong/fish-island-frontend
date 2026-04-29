import React, { useEffect, useState, useMemo } from 'react';
import { history, useModel } from '@umijs/max';
import { useGameStore } from '../store/useGameStore';

/** 倒计时跳转延迟（秒） */
const REDIRECT_DELAY = 12;

const GameEndOverlay: React.FC = () => {
  const gameEnd = useGameStore((s) => s.gameEnd);
  const myTeam = useGameStore((s) => s.multiplayerSession?.assignedTeam);
  const setGameEnd = useGameStore((s) => s.setGameEnd);
  const fishBattleWindow = useModel('fishBattleWindow');
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);
  const [showContent, setShowContent] = useState(false);

  const navigateToResult = (gameId: number | null) => {
    // 跳转前清空 gameEnd 并关闭悬浮窗口
    setGameEnd(null);
    fishBattleWindow.closeWindow();
    if (gameId) {
      history.push(`/fishBattle/result/${gameId}`);
    } else {
      history.push('/fishBattle/lobby');
    }
  };

  const isVictory = useMemo(() => {
    if (!gameEnd || !myTeam) return null;
    return gameEnd.winnerTeam === myTeam;
  }, [gameEnd, myTeam]);

  useEffect(() => {
    if (!gameEnd) return;
    // 延迟显示内容，先播入场动画
    const showTimer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(showTimer);
  }, [gameEnd]);

  useEffect(() => {
    if (!gameEnd) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigateToResult(gameEnd.gameId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameEnd]);

  if (!gameEnd) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'all',
      animation: 'gameEndFadeIn 0.5s ease-out',
    }}>
      {/* 背景遮罩 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: isVictory
          ? 'radial-gradient(ellipse at center, rgba(0,60,120,0.85) 0%, rgba(0,15,40,0.95) 100%)'
          : 'radial-gradient(ellipse at center, rgba(100,15,15,0.85) 0%, rgba(30,0,0,0.95) 100%)',
        backdropFilter: 'blur(4px)',
      }} />

      {/* 顶部光束 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '120%',
        height: '40%',
        background: isVictory
          ? 'radial-gradient(ellipse at 50% 0%, rgba(30,144,255,0.3) 0%, transparent 70%)'
          : 'radial-gradient(ellipse at 50% 0%, rgba(255,50,50,0.3) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* 主内容 */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* 胜负文字 */}
        <div style={{
          fontSize: '72px',
          fontWeight: 900,
          letterSpacing: '12px',
          textTransform: 'uppercase',
          color: isVictory ? '#4FC3F7' : '#FF5252',
          textShadow: isVictory
            ? '0 0 40px rgba(79,195,247,0.6), 0 0 80px rgba(79,195,247,0.3), 0 4px 8px rgba(0,0,0,0.5)'
            : '0 0 40px rgba(255,82,82,0.6), 0 0 80px rgba(255,82,82,0.3), 0 4px 8px rgba(0,0,0,0.5)',
          animation: 'gameEndTitlePulse 2s ease-in-out infinite',
          fontFamily: '"Arial Black", "Impact", sans-serif',
        }}>
          {isVictory === null ? '游戏结束' : isVictory ? '胜 利' : '失 败'}
        </div>

        {/* 副标题 */}
        <div style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: '4px',
          marginTop: '-10px',
        }}>
          {isVictory ? '恭喜你赢得了这场战斗！' : '很遗憾，再接再厉！'}
        </div>

        {/* 分隔装饰线 */}
        <div style={{
          width: '400px',
          height: '2px',
          background: isVictory
            ? 'linear-gradient(90deg, transparent, rgba(79,195,247,0.6), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,82,82,0.6), transparent)',
          margin: '4px 0',
        }} />

        {/* 比分面板 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          padding: '16px 48px',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: '12px',
              color: '#4FC3F7',
              letterSpacing: '2px',
              marginBottom: '4px',
            }}>蓝队</span>
            <span style={{
              fontSize: '42px',
              fontWeight: 800,
              color: '#4FC3F7',
              fontFamily: '"Arial Black", sans-serif',
            }}>{gameEnd.blueKills}</span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '2px',
            }}>VS</span>
            <span style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.35)',
            }}>{formatTime(gameEnd.gameTimer)}</span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: '12px',
              color: '#FF5252',
              letterSpacing: '2px',
              marginBottom: '4px',
            }}>红队</span>
            <span style={{
              fontSize: '42px',
              fontWeight: 800,
              color: '#FF5252',
              fontFamily: '"Arial Black", sans-serif',
            }}>{gameEnd.redKills}</span>
          </div>
        </div>

        {/* 跳转倒计时按钮 */}
        <button
          type="button"
          onClick={() => navigateToResult(gameEnd.gameId)}
          style={{
            marginTop: '12px',
            padding: '12px 48px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#fff',
            background: isVictory
              ? 'linear-gradient(135deg, #1565C0, #1E88E5)'
              : 'linear-gradient(135deg, #C62828, #E53935)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            letterSpacing: '2px',
            boxShadow: isVictory
              ? '0 4px 20px rgba(21,101,192,0.4)'
              : '0 4px 20px rgba(198,40,40,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          查看战绩 ({countdown}s)
        </button>

        {/* 跳过提示 */}
        <div style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '1px',
        }}>
          点击按钮立即跳转，或等待倒计时结束自动跳转
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes gameEndFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gameEndTitlePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
};

export default GameEndOverlay;
