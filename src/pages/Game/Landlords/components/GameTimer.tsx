/**
 * 倒计时组件 - 支持朝向（左/右/下指当前玩家）
 */
import React from 'react';
import { AlarmClock } from 'lucide-react';

interface GameTimerProps {
  timeLeft: number;
  maxTime?: number;
  isMyTurn?: boolean;
  playerName?: string;
  showProgress?: boolean;
  size?: 'small' | 'normal' | 'large';
  /** 朝向：left | right | bottom | normal，用于控制样式（中央模式由外部布局决定） */
  direction?: 'left' | 'right' | 'bottom' | 'normal';
  onTimeout?: () => void;
}

const GameTimer: React.FC<GameTimerProps> = ({
  timeLeft,
  maxTime = 30,
  isMyTurn = false,
  playerName,
  showProgress = true,
  size = 'normal',
  direction = 'normal',
  onTimeout,
}) => {
  React.useEffect(() => {
    if (timeLeft === 0 && onTimeout) {
      onTimeout();
    }
  }, [timeLeft, onTimeout]);

  const getTimerColor = () => {
    if (timeLeft <= 5) return { text: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
    if (timeLeft <= 10) return { text: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
    return { text: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' };
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { fontSize: '16px', padding: '4px 8px', progressWidth: '120px' };
      case 'large':
        return { fontSize: '32px', padding: '12px 24px', progressWidth: '200px' };
      default:
        return { fontSize: '24px', padding: '6px 16px', progressWidth: '160px' };
    }
  };

  const colors = getTimerColor();
  const config = getSizeConfig();
  const progress = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));

  const getText = () => {
    return `${timeLeft}`;
  };

  const isDanger = timeLeft <= 5;
  const isFlipped = direction === 'left'; // 进度条从右向左填充

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* 倒计时文字 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 'bold',
          fontSize: config.fontSize,
          padding: '4px 12px',
          color: colors.text,
        }}
      >
        <AlarmClock size={Number(config.fontSize.replace('px', '')) * 1.2} />
        {getText()}
      </div>

      {/* 进度条 */}
      {showProgress && (
        <div
          style={{
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            width: config.progressWidth,
            backgroundColor: '#e5e7eb',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              borderRadius: 4,
              transition: 'width 1s linear',
              width: `${progress}%`,
              backgroundColor: colors.text,
              ...(isFlipped ? { right: 0, left: 'auto' } : {}),
            }}
          />
        </div>
      )}
    </div>
  );
};

export default GameTimer;