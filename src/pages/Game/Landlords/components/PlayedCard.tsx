/**
 * 只读扑克牌组件 - 用于显示上一手牌/出牌区域
 */
import React from 'react';
import { parsePokerId } from '../utils/pokerUtils';

interface PlayedCardProps {
  id: string;
  style?: React.CSSProperties;
}

const PlayedCard: React.FC<PlayedCardProps> = ({ id, style }) => {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const parsed = parsePokerId(id);
  const displayValue = parsed.displayValue;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        width: 56,
        height: 76,
        backgroundColor: parsed.bgColor,
        border: '2px solid #d9d9d9',
        color: parsed.color,
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        ...style,
      }}
    >
      {/* 左上角 */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 5,
          fontSize: 12,
          fontWeight: 'bold',
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        <div>{parsed.symbol}</div>
        <div style={{ fontSize: 10 }}>{displayValue}</div>
      </div>

      {/* 中心 */}
      <div style={{ fontSize: 22, fontWeight: 'bold' }}>{parsed.symbol}</div>

      {/* 右下角 (镜像) */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 5,
          fontSize: 12,
          fontWeight: 'bold',
          lineHeight: 1,
          textAlign: 'center',
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
            fontSize: 7,
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

export default PlayedCard;
