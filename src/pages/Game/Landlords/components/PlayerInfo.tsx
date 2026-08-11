/**
 * 玩家信息组件
 *
 * 布局（position 决定）：
 * - left:  [玩家信息（左）| 手牌（右）]   — 横向两列
 *   玩家信息：头像 + 昵称（并排），状态标签在下方
 *   手牌：3张白底蓝边牌堆叠 + 张数（17 张）在下方
 * - right: [手牌（左）| 玩家信息（右）]  — 横向两列（镜像）
 * - bottom: 头像 + 昵称（并排），状态标签在下方  （自己）
 */
import React, { useState, useEffect, useRef } from 'react';
import { Avatar, Tag } from 'antd';
import { Crown } from 'lucide-react';
import CardBack from './CardBack';
import { isWaitingPhase, isPlayingPhase, isRobbingPhase, isEndingPhase } from '../types/phase';

interface PlayerInfoProps {
  player: {
    id?: string;
    userId?: number | string;
    userName?: string;
    avatar?: string;
    userAvatar?: string;
    cardCount?: number;
    isLandlord?: boolean;
    isCurrentPlayer?: boolean;
    isReady?: boolean;
    robScore?: number;
    isOwner?: boolean;
    isOnline?: boolean;
    isRobotControlled?: boolean;
    isMe?: boolean;
  };
  position: 'left' | 'right' | 'bottom';
  cardCount?: number;
  compact?: boolean;
  showOwnerBadge?: boolean;
  showCardCount?: boolean;
  // 倒计时相关
  timeLeft?: number;
  isCurrentTurn?: boolean;
  // 游戏阶段 - 用于控制"已准备"标签显示
  gamePhase?: string;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  position,
  cardCount: propCardCount,
  compact = false,
  showOwnerBadge = true,
  showCardCount = true,
  timeLeft,
  isCurrentTurn,
  gamePhase,
}) => {
  if (!player) return null;

  const {
    userName = '等待中',
    avatar,
    userAvatar,
    isLandlord = false,
    isCurrentPlayer = false,
    isReady = false,
    robScore = 0,
    isOwner = false,
    isOnline = true,
    isRobotControlled = false,
    isMe = false,
  } = player;

  const displayCardCount = propCardCount ?? player.cardCount ?? 0;
  const displayAvatar = avatar || userAvatar;
  const avatarSize = compact ? 40 : 52;

  // 响应式卡片尺寸 - 基于容器宽度计算
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ width: 36, height: 50 });

  useEffect(() => {
    const calculateCardSize = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // 根据可用宽度计算卡片大小（3张卡片 + gap 需要空间）
      // 卡片宽度约为容器宽度的 30%
      let width = Math.min(containerWidth * 0.3, containerHeight * 0.55);
      let height = width * 1.4;

      // 限制最大最小尺寸
      const minWidth = 26;
      const maxWidth = 48;
      width = Math.max(minWidth, Math.min(maxWidth, width));
      height = width * 1.4;

      // 确保高度不会超出容器
      if (height > containerHeight * 0.8) {
        height = containerHeight * 0.8;
        width = height / 1.4;
        width = Math.max(minWidth, Math.min(maxWidth, width));
        height = width * 1.4;
      }

      setCardSize({ width, height });
    };

    calculateCardSize();
    window.addEventListener('resize', calculateCardSize);

    const container = containerRef.current;
    if (container && 'ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => {
        calculateCardSize();
      });
      resizeObserver.observe(container);
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', calculateCardSize);
      };
    }

    return () => window.removeEventListener('resize', calculateCardSize);
  }, []);

  // 整体外壳样式
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    transition: 'all 0.2s',
    borderRadius: 10,
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative', // 支持倒计时绝对定位
    ...(isCurrentPlayer || isCurrentTurn
      ? {
          backgroundColor: '#fff',
          border: '2px solid #f97316',
          boxShadow: '0 0 12px rgba(249,115,22,0.3)',
        }
      : {
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }),
  };

  // 状态标签样式
  const statusTagsStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  };

  // 判断是否应该显示"已准备"标签（仅在等待阶段显示）
  const showReadyTag = isReady && !isLandlord && (!gamePhase || isWaitingPhase(gamePhase));

  // 判断是否应该显示地主标签（仅在地主确定后才显示，即 playing 或 ending 阶段）
  const showLandlordTag =
    isLandlord && !!gamePhase && (isPlayingPhase(gamePhase) || isEndingPhase(gamePhase));

  const tagStyle: React.CSSProperties = {
    fontSize: 12,
    margin: 0,
    padding: '0 6px',
    lineHeight: '20px',
  };

  // 判断是否应该显示农民标签（仅在地主确定后才显示，即 playing 或 ending 阶段，且玩家不是地主）
  const showFarmerTag =
    !isLandlord &&
    player?.isLandlord !== undefined &&
    !!gamePhase &&
    (isPlayingPhase(gamePhase) || isEndingPhase(gamePhase));

  // 头像样式
  const avatarContainerStyle: React.CSSProperties = {
    position: 'relative',
    flexShrink: 0,
  };

  const avatarStyle: React.CSSProperties = {
    border: `2px solid ${
      isCurrentTurn || isCurrentPlayer
        ? '#facc15'  // 当前回合高亮
        : isLandlord
        ? '#ef4444'  // 地主红色
        : '#d1d5db'  // 普通玩家灰色
    }`,
    filter: !isOnline ? 'grayscale(100%) opacity(0.6)' : 'none',
    transition: 'filter 0.3s ease, border 0.2s ease',
  };

  // 玩家信息列样式
  const getPlayerInfoColumnStyle = (align: 'left' | 'right'): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: align === 'left' ? 'flex-start' : 'flex-end',
    gap: 4,
    flex: 1,
    minWidth: 0,
  });

  // 头像+昵称并排样式
  const getAvatarNickRowStyle = (align: 'left' | 'right'): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexDirection: align === 'left' ? 'row' as const : 'row-reverse' as const,
  });

  const nicknameStyle: React.CSSProperties = {
    fontSize: compact ? 12 : 14,
    fontWeight: 'bold',
    color: '#333333',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    opacity: isOnline ? 1 : 0.5,
    transition: 'opacity 0.3s ease',
  };

  // 手牌区样式
  const handCardsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: '0 0 auto',
    minWidth: 0,
    minHeight: 0,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 8,
    maxWidth: '100%',
    overflow: 'hidden',
  };

  // ========== 状态标签 ==========
  const renderStatusTags = () => (
    <div style={statusTagsStyle}>
      {showLandlordTag && (
        <Tag color="red" style={tagStyle}>
          地主
        </Tag>
      )}
      {showOwnerBadge && isOwner && (
        <Tag color="gold" style={{ ...tagStyle, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Crown size={10} /> 房主
        </Tag>
      )}
      {showReadyTag && (
        <Tag color="green" style={tagStyle}>
          已准备
        </Tag>
      )}
      {robScore > 0 && (
        <Tag color="orange" style={tagStyle}>
          叫{robScore}分
        </Tag>
      )}
      {!isOnline && (
        <Tag color="default" style={tagStyle}>
          离线
        </Tag>
      )}
      {isRobotControlled && (
        <Tag color="purple" style={tagStyle}>
          AI托管中
        </Tag>
      )}
      {isCurrentTurn && (
        <Tag color="gold" style={{ ...tagStyle, backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
          等待操作
        </Tag>
      )}
    </div>
  );

  // ========== 倒计时组件 ==========
  const renderTimer = () => {
    // 仅在 playing/robbing 阶段显示计时器
    if (!isCurrentTurn || !timeLeft || timeLeft <= 0) return null;
    if (!gamePhase || (!isPlayingPhase(gamePhase) && !isRobbingPhase(gamePhase))) return null;

    const isUrgent = timeLeft <= 5;
    return (
      <div
        style={{
          position: 'absolute',
          top: compact ? -16 : -20,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: isUrgent ? '#dc2626' : '#f59e0b',
          color: '#fff',
          padding: '2px 10px',
          borderRadius: 12,
          fontSize: compact ? 12 : 14,
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 20,
          minWidth: 32,
          textAlign: 'center',
        }}
      >
        ⏱ {timeLeft}
      </div>
    );
  };

  // ========== 头像组件 ==========
  const renderAvatar = () => (
    <div style={avatarContainerStyle}>
      <Avatar src={displayAvatar} size={avatarSize} style={avatarStyle}>
        {userName.charAt(0)}
      </Avatar>
      {/* 地主标签 */}
      {isLandlord && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: '#ff4d4f',
            color: '#fff',
            fontSize: 10,
            padding: '2px 4px',
            borderRadius: 4,
            fontWeight: 'bold',
            zIndex: 10,
          }}
        >
          地
        </div>
      )}
      {/* 农民标签（仅在游戏开始后、地主确定后显示） */}
      {showFarmerTag && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: '#22c55e',
            color: '#fff',
            fontSize: 10,
            padding: '2px 4px',
            borderRadius: 4,
            fontWeight: 'bold',
            zIndex: 10,
          }}
        >
          农
        </div>
      )}
    </div>
  );

  // ========== 玩家信息区 ==========
  const renderPlayerInfoColumn = (align: 'left' | 'right') => (
    <div style={getPlayerInfoColumnStyle(align)}>
      <div style={getAvatarNickRowStyle(align)}>
        {renderAvatar()}
        <div style={nicknameStyle}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </span>
        </div>
      </div>
      {renderStatusTags()}
    </div>
  );

  // ========== 手牌区（横向排列）==========
  const VISIBLE_BACK_CARDS = 3;
  const CARD_GAP_PERCENT = 0.22;

  const renderHandCards = () => {
    return (
      <div style={handCardsContainerStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          {Array.from({ length: VISIBLE_BACK_CARDS }).map((_, i) => (
            <CardBack
              key={i}
              width={cardSize.width}
              height={cardSize.height}
              style={{
                marginLeft: i === 0 ? 0 : -cardSize.width * CARD_GAP_PERCENT,
                zIndex: VISIBLE_BACK_CARDS - i,
              }}
            />
          ))}
        </div>
        {showCardCount && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: '#f97316',
              whiteSpace: 'nowrap',
              backgroundColor: '#fff7e6',
              padding: '2px 8px',
              borderRadius: 4,
              marginTop: 6,
              border: '1px solid #f97316',
            }}
          >
            {displayCardCount} 张
          </div>
        )}
      </div>
    );
  };

  // ========== 左侧玩家布局 ==========
  if (position === 'left') {
    return (
      <div style={{ ...containerStyle }} ref={containerRef}>
        {renderTimer()}
        {renderPlayerInfoColumn('left')}
        {renderHandCards()}
      </div>
    );
  }

  // ========== 右侧玩家布局 ==========
  if (position === 'right') {
    return (
      <div style={{ ...containerStyle }} ref={containerRef}>
        {renderTimer()}
        {renderHandCards()}
        {renderPlayerInfoColumn('right')}
      </div>
    );
  }

  // ========== 底部玩家布局（与左右玩家一致的样式，包含手牌占位区）==========
  if (position === 'bottom') {
    return (
      <div style={{ ...containerStyle }} ref={containerRef}>
        {renderTimer()}
        {renderPlayerInfoColumn('left')}
        {/* 手牌占位区 - 与顶部左右玩家视觉对齐，固定大小不撑开 */}
        <div style={{ ...handCardsContainerStyle, flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {Array.from({ length: VISIBLE_BACK_CARDS }).map((_, i) => (
              <CardBack
                key={i}
                width={cardSize.width}
                height={cardSize.height}
                style={{
                  marginLeft: i === 0 ? 0 : -cardSize.width * CARD_GAP_PERCENT,
                  zIndex: VISIBLE_BACK_CARDS - i,
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: '#6b7280',
              whiteSpace: 'nowrap',
              backgroundColor: '#e5e7eb',
              padding: '2px 8px',
              borderRadius: 4,
              marginTop: 6,
              border: '1px solid #d1d5db',
            }}
          >
            {displayCardCount} 张
          </div>
        </div>
      </div>
    );
  }
};

export default PlayerInfo;
