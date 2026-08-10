/**
 * 出牌区域组件
 * - 显示三个玩家（左/右/自己）的当前出牌 + 提示文字
 * - 内嵌 GameTimer 倒计时
 * - 支持自定义朝向（左侧/右侧/下方玩家被轮到时进度条指向该玩家）
 */
import React from 'react';
import GameTimer from './GameTimer';
import PlayedCard from './PlayedCard';
import { PlayerState } from '../types';

export interface PlayAreaProps {
  // 三个位置的玩家
  leftPlayer?: PlayerState | null;
  rightPlayer?: PlayerState | null;
  bottomPlayer?: PlayerState | null;
  // 玩家提示（叫分/不出等）
  playerHints?: Record<string, string>;
  // 倒计时
  timeLeft?: number;
  maxTime?: number;
  // 当前操作玩家 userId
  currentActorId?: number | string | null;
  currentActorName?: string;
  // 当前操作玩家的位置
  currentActorPosition?: 'left' | 'right' | 'bottom';
  // 游戏阶段 - 用于控制计时器显示
  gamePhase?: string;
}

const PlayArea: React.FC<PlayAreaProps> = ({
  leftPlayer,
  rightPlayer,
  bottomPlayer,
  playerHints = {},
  timeLeft = 0,
  maxTime = 30,
  currentActorId,
  currentActorName,
  currentActorPosition = 'bottom',
  gamePhase,
}) => {
  // 判断是否应该显示计时器（仅在 playing 或 robbing 阶段）
  const shouldShowTimer = timeLeft > 0 && gamePhase && (gamePhase === 'playing' || gamePhase === 'PLAYING' || gamePhase === 'robbing' || gamePhase === 'ROBBING');
  const renderPlayerCards = (
    player: PlayerState | null | undefined,
    align: 'left' | 'right' | 'center',
  ) => {
    if (!player?.userId) return null;
    const hint = playerHints[String(player.userId)];
    const cards = player.currentPlayedCards || [];
    const isCurrentActor =
      currentActorId != null && String(player.userId) === String(currentActorId);
    return (
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems:
            align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
          gap: 4,
        }}
      >
        {hint && (
          <div
            style={{
              fontSize: align === 'center' ? 18 : 16,
              color: '#1f2937',
              fontWeight: 600,
              padding: align === 'center' ? '6px 16px' : '4px 12px',
              background: align === 'center' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.85)',
              borderRadius: align === 'center' ? 8 : 6,
              boxShadow: align === 'center' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 1px 4px rgba(0, 0, 0, 0.08)',
            }}
          >
            {hint}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            maxWidth: align === 'center' ? 280 : 160,
            gap: '4px 0',
            justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
          }}
        >
          {cards.map((card: any, i: number) => (
            <PlayedCard
              key={`${card.id || card}-${i}`}
              id={card.id || card}
              style={{
                [align === 'right' ? 'marginLeft' : 'marginRight']: i === 0 ? 0 : 2,
              }}
            />
          ))}
        </div>
        {isCurrentActor && align === 'center' && cards.length > 0 && null}
      </div>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 16px',
        minHeight: 0,
        position: 'relative',
      }}
    >
      {/* 中央倒计时 - 仅在 playing/robbing 阶段显示 */}
      {shouldShowTimer && (
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
          }}
        >
          <GameTimer
            timeLeft={timeLeft}
            maxTime={maxTime}
            isMyTurn={currentActorPosition === 'bottom'}
            playerName={currentActorName}
            direction={currentActorPosition}
            showProgress={false}
          />
        </div>
      )}

      {/* 左边玩家 */}
      <div style={{ position: 'absolute', left: 24, top: '35%', transform: 'translateY(-50%)' }}>
        {renderPlayerCards(leftPlayer, 'left')}
      </div>

      {/* 右边玩家 */}
      <div style={{ position: 'absolute', right: 24, top: '35%', transform: 'translateY(-50%)' }}>
        {renderPlayerCards(rightPlayer, 'right')}
      </div>

      {/* 我（下边玩家） */}
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)' }}>
        {renderPlayerCards(bottomPlayer, 'center')}
      </div>
    </div>
  );
};

export default PlayArea;