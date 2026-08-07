/**
 * 手牌组件 - 从左到右按从小到大排序，支持选中效果
 * 支持多副牌场景：每张牌用 (cardId, index) 复合 key 唯一标识
 */
import React from 'react';
import { parsePokerId } from '../utils/pokerUtils';

interface HandCardsProps {
  cards: string[];
  selectedCards: string[];
  onSelectCard: (cardId: string, index: number) => void;
  disabled?: boolean;
}

interface PokerCardComponentProps {
  id: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

const PokerCardComponent: React.FC<PokerCardComponentProps> = ({
  id,
  selected,
  disabled,
  onClick,
  style,
}) => {
  const parsed = parsePokerId(id);
  const displayValue = parsed.displayValue;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        userSelect: 'none',
        width: 55,
        height: 75,
        backgroundColor: parsed.bgColor,
        border: selected ? '3px solid #1890ff' : '2px solid #d9d9d9',
        color: parsed.color,
        marginLeft: -10,
        zIndex: selected ? 1000 : undefined,
        transform: selected ? 'translateY(-16px)' : undefined,
        boxShadow: selected
          ? '0 8px 16px rgba(0,0,0,0.2)'
          : undefined,
        opacity: disabled ? 0.7 : 1,
        ...style,
      }}
    >
      {/* 左上角 */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 6,
          fontSize: 12,
          fontWeight: 'bold',
          lineHeight: 1,
          textAlign: 'center' as const,
        }}
      >
        <div>{parsed.symbol}</div>
        <div style={{ fontSize: 10 }}>{displayValue}</div>
      </div>

      {/* 中心 */}
      <div style={{ fontSize: 20, fontWeight: 'bold' }}>{parsed.symbol}</div>

      {/* 右下角 (镜像) */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 6,
          fontSize: 12,
          fontWeight: 'bold',
          lineHeight: 1,
          textAlign: 'center' as const,
          transform: 'rotate(180deg)',
        }}
      >
        <div>{parsed.symbol}</div>
        <div style={{ fontSize: 10 }}>{displayValue}</div>
      </div>

      {/* 癞子标记 */}
      {parsed.isUniversal && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: '#facc15',
            color: '#000',
            fontSize: 8,
            padding: '2px 4px',
            borderBottomLeftRadius: 8,
            borderTopRightRadius: 8,
            fontWeight: 'bold',
          }}
        >
          癞
        </div>
      )}
    </div>
  );
};

const HandCards: React.FC<HandCardsProps> = ({
  cards = [],
  selectedCards = [],
  onSelectCard,
  disabled = false,
}) => {
  // 后端已在 LandlordsGameService 发牌时按斗地主规则降序排好序（大牌在左、小牌在右），
  // 这里直接使用后端返回的顺序，避免前后端排序逻辑不一致导致顺序错乱。
  const sortedCards = cards;

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
        <div style={{ color: '#9ca3af' }}>暂无手牌</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex' }}>
        {sortedCards.map((cardId, index) => {
          // 用 cardId:index 作为唯一 key，支持多副牌场景下区分同 ID 的不同实例
          const cardKey = `${cardId}:${index}`;
          return (
            <PokerCardComponent
              key={cardKey}
              id={cardId}
              selected={selectedCards.includes(cardKey)}
              disabled={disabled}
              onClick={() => onSelectCard(cardId, index)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default HandCards;
