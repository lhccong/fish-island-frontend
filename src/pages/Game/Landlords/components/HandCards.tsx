/**
 * 手牌组件 - 从左到右按从小到大排序，支持选中效果
 * 支持多副牌场景：每张牌用 (cardId, index) 复合 key 唯一标识
 * 响应式设计：根据视口宽度和可用空间自动调整牌面大小
 */
import React, { useState, useEffect, useRef } from 'react';
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
  cardWidth: number;
  cardHeight: number;
}

const PokerCardComponent: React.FC<PokerCardComponentProps> = ({
  id,
  selected,
  disabled,
  onClick,
  style,
  cardWidth,
  cardHeight,
}) => {
  const parsed = parsePokerId(id);
  const displayValue = parsed.displayValue;
  // 左上角角标：放大 50%（相对于 cardWidth）
  const cornerFontSize = cardWidth * 0.32;
  // 中间图案：缩小 25%
  const symbolSize = cardWidth * 0.28;
  const cornerPadding = cardWidth * 0.06;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: cardWidth * 0.14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        userSelect: 'none',
        width: cardWidth,
        height: cardHeight,
        backgroundColor: parsed.bgColor,
        border: selected ? `3px solid #f97316` : '2px solid #d9d9d9',
        color: parsed.color,
        marginLeft: -cardWidth * 0.17,
        zIndex: selected ? 1000 : undefined,
        transform: selected ? `translateY(-${cardHeight * 0.2}px)` : undefined,
        boxShadow: selected
          ? `0 ${cardHeight * 0.1}px ${cardHeight * 0.2}px rgba(249,115,22,0.3)`
          : `0 ${cardHeight * 0.03}px ${cardHeight * 0.08}px rgba(0,0,0,0.1)`,
        opacity: disabled ? 0.7 : 1,
        ...style,
      }}
    >
      {/* 左上角 */}
      <div
        style={{
          position: 'absolute',
          top: cornerPadding,
          left: cornerPadding,
          fontSize: cornerFontSize,
          fontWeight: 'bold',
          lineHeight: 1,
          textAlign: 'center' as const,
        }}
      >
        <div>{parsed.symbol}</div>
        <div style={{ fontSize: cornerFontSize * 0.75 }}>{displayValue}</div>
      </div>

      {/* 中心 */}
      <div style={{ fontSize: symbolSize, fontWeight: 'bold' }}>{parsed.symbol}</div>

      {/* 右下角 (镜像) */}
      <div
        style={{
          position: 'absolute',
          bottom: cornerPadding,
          right: cornerPadding,
          fontSize: cornerFontSize,
          fontWeight: 'bold',
          lineHeight: 1,
          textAlign: 'center' as const,
          transform: 'rotate(180deg)',
        }}
      >
        <div>{parsed.symbol}</div>
        <div style={{ fontSize: cornerFontSize * 0.75 }}>{displayValue}</div>
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
            fontSize: cardWidth * 0.14,
            padding: `${cardWidth * 0.04}px ${cardWidth * 0.08}px`,
            borderBottomLeftRadius: cardWidth * 0.14,
            borderTopRightRadius: cardWidth * 0.14,
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
  const containerRef = useRef<HTMLDivElement>(null);

  // 响应式牌面大小计算 - 根据容器实际可用空间计算
  const [cardSize, setCardSize] = useState({ width: 60, height: 84 });

  useEffect(() => {
    const calculateCardSize = () => {
      // 获取手牌区域的可用空间
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // 牌数（斗地主最多20张牌，癞子可能增加）
      const cardCount = cards.length || 17;

      // 每张牌重叠约17%，有效宽度占比 = 0.17 + cardCount * 0.83
      const effectiveWidthRatio = 0.17 + cardCount * 0.83;

      // 根据宽度计算单张牌宽度
      const widthFromWidth = containerWidth / effectiveWidthRatio;

      // 根据高度计算单张牌高度（需要留出选中时上移的空间，约20%）
      const heightForCard = containerHeight * 0.75; // 留25%空间给选中上移
      const widthFromHeight = heightForCard / 1.4; // 按牌面比例

      // 取两者中较小的值，确保不溢出
      let cardWidth = Math.min(widthFromWidth, widthFromHeight);

      // 限制最大最小尺寸
      const minWidth = 32;
      const maxWidth = 72;
      cardWidth = Math.max(minWidth, Math.min(maxWidth, cardWidth));

      const cardHeight = cardWidth * 1.4;

      setCardSize({ width: cardWidth, height: cardHeight });
    };

    calculateCardSize();
    window.addEventListener('resize', calculateCardSize);

    // 使用 ResizeObserver 监听容器大小变化
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
  }, [cards.length]);

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div style={{ color: '#9ca3af' }}>暂无手牌</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
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
              cardWidth={cardSize.width}
              cardHeight={cardSize.height}
            />
          );
        })}
      </div>
    </div>
  );
};

export default HandCards;
