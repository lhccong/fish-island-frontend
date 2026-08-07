/**
 * 地主底牌组件 - 顶部居中展示
 */
import React from 'react';
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
}

const SingleCard: React.FC<SingleCardProps> = ({ id, index }) => {
  const parsed = parsePokerId(id);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        width: 44,
        height: 60,
        backgroundColor: parsed.bgColor,
        border: '1px solid #1e40af',
        color: parsed.color,
        zIndex: index,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s',
      }}
    >
      {/* 左上角 */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: 4,
          fontSize: 10,
          fontWeight: 'bold',
          lineHeight: 1,
          textAlign: 'center' as const,
        }}
      >
        <div>{parsed.symbol}</div>
        <div style={{ fontSize: 8 }}>{parsed.displayValue}</div>
      </div>

      {/* 中心 */}
      <div style={{ fontSize: 18, fontWeight: 'bold' }}>{parsed.symbol}</div>

      {/* 右下角 */}
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          right: 4,
          fontSize: 10,
          fontWeight: 'bold',
          lineHeight: 1,
          textAlign: 'center' as const,
          transform: 'rotate(180deg)',
        }}
      >
        <div>{parsed.symbol}</div>
        <div style={{ fontSize: 8 }}>{parsed.displayValue}</div>
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
            padding: '1px 3px',
            borderBottomLeftRadius: 6,
            borderTopRightRadius: 6,
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
  const displayCards = cards.length > 0 ? cards : ['placeholder', 'placeholder', 'placeholder'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {!hideLabel && (
        <div style={{ fontSize: 14, color: '#1f2937', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              backgroundColor: '#ef4444',
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
            <span style={{ color: '#374151' }}>归属: {landlordName}</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {displayCards.map((card, index) => (
          card === 'placeholder' ? (
            <CardBack key={`placeholder-${index}`} />
          ) : (
            <SingleCard key={`${card}-${index}`} id={card} index={index} />
          )
        ))}
      </div>
    </div>
  );
};

export default LandlordCards;
