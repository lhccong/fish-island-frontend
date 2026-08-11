/**
 * 地主底牌组件 - 顶部居中展示
 * 响应式设计：根据视口宽度自动调整牌面大小
 */
import React, { useState, useEffect } from 'react';
import CardBack from './CardBack';
import { parsePokerId } from '../utils/pokerUtils';

interface LandlordCardsProps {
  cards: string[];
  landlordName?: string;
  hideLabel?: boolean;
}

interface SingleCardProps {
  id: string;
  index: number;
  cardWidth: number;
  cardHeight: number;
}

const SingleCard: React.FC<SingleCardProps> = ({ id, index, cardWidth, cardHeight }) => {
  const parsed = parsePokerId(id);
  const borderRadius = cardWidth * 0.14;
  const fontSize = cardWidth * 0.23;
  const symbolSize = cardWidth * 0.4;
  const cornerPadding = cardWidth * 0.08;
  const cornerFontSize = cardWidth * 0.17;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius,
        width: cardWidth,
        height: cardHeight,
        backgroundColor: parsed.bgColor,
        border: '2px solid #f97316',
        color: parsed.color,
        zIndex: index,
        boxShadow: `0 ${cardWidth * 0.05}px ${cardWidth * 0.13}px rgba(249,115,22,0.25)`,
        transition: 'transform 0.2s',
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
        <div style={{ fontSize: cornerFontSize * 0.7 }}>{parsed.displayValue}</div>
      </div>

      {/* 中心 */}
      <div style={{ fontSize: symbolSize, fontWeight: 'bold' }}>{parsed.symbol}</div>

      {/* 右下角 */}
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
        <div style={{ fontSize: cornerFontSize * 0.7 }}>{parsed.displayValue}</div>
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
            fontSize: cardWidth * 0.17,
            padding: `${cardWidth * 0.04}px ${cardWidth * 0.07}px`,
            borderBottomLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
            fontWeight: 'bold',
          }}
        >
          癞
        </div>
      )}
    </div>
  );
};

const LandlordCards: React.FC<LandlordCardsProps> = ({ cards = [], landlordName, hideLabel }) => {
  const [cardSize, setCardSize] = useState({ width: 60, height: 84 });

  useEffect(() => {
    const calculateCardSize = () => {
      const viewportWidth = window.innerWidth;
      const minWidth = 36;
      const maxWidth = 60;
      const width = Math.max(minWidth, Math.min(maxWidth, viewportWidth * 0.05));
      setCardSize({ width, height: width * 1.4 });
    };

    calculateCardSize();
    window.addEventListener('resize', calculateCardSize);
    return () => window.removeEventListener('resize', calculateCardSize);
  }, []);

  const displayCards = cards.length > 0 ? cards : ['placeholder', 'placeholder', 'placeholder'];
  const gap = cardSize.width * 0.13;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {!hideLabel && (
        <div style={{ fontSize: 14, color: '#333333', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              backgroundColor: '#ff4d4f',
              color: '#fff',
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 'bold',
            }}
          >
            地
          </span>
          <span style={{ fontWeight: 'bold' }}>底牌</span>
          {landlordName && (
            <span style={{ color: '#f97316' }}>归属: {landlordName}</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: cardSize.width * 0.13 }}>
        {displayCards.map((card, index) => (
          card === 'placeholder' ? (
            <CardBack key={`placeholder-${index}`} width={cardSize.width} height={cardSize.height} />
          ) : (
            <SingleCard key={`${card}-${index}`} id={card} index={index} cardWidth={cardSize.width} cardHeight={cardSize.height} />
          )
        ))}
      </div>
    </div>
  );
};

export default LandlordCards;
