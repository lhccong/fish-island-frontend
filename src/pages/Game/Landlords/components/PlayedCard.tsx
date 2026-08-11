/**
 * 只读扑克牌组件 - 用于显示上一手牌/出牌区域
 * 响应式设计：根据视口宽度自动调整牌面大小
 */
import React, { useState, useEffect } from 'react';
import { parsePokerId } from '../utils/pokerUtils';

interface PlayedCardProps {
  id: string;
  style?: React.CSSProperties;
}

const PlayedCard: React.FC<PlayedCardProps> = ({ id, style }) => {
  const [cardSize, setCardSize] = useState({ width: 72, height: 100 });

  useEffect(() => {
    const calculateCardSize = () => {
      const viewportWidth = window.innerWidth;
      // 牌面宽度根据视口宽度计算，范围 36-72
      const minWidth = 36;
      const maxWidth = 72;
      const width = Math.max(minWidth, Math.min(maxWidth, viewportWidth * 0.045));
      setCardSize({ width, height: width * 1.4 });
    };

    calculateCardSize();
    window.addEventListener('resize', calculateCardSize);
    return () => window.removeEventListener('resize', calculateCardSize);
  }, []);

  if (!id || typeof id !== 'string') {
    return null;
  }

  const parsed = parsePokerId(id);
  const displayValue = parsed.displayValue;
  const { width, height } = cardSize;
  const borderRadius = width * 0.14;
  // 左上角角标：放大 50%（相对于 width）
  const cornerFontSize = width * 0.32;
  // 中间图案：缩小 25%
  const symbolSize = width * 0.28;
  const cornerPadding = width * 0.06;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius,
        width,
        height,
        backgroundColor: parsed.bgColor,
        border: '2px solid #d9d9d9',
        color: parsed.color,
        boxShadow: `0 ${height * 0.04}px ${height * 0.08}px rgba(0,0,0,0.2)`,
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
          textAlign: 'center',
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
          textAlign: 'center',
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
            fontSize: width * 0.14,
            padding: `${width * 0.04}px ${width * 0.08}px`,
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

export default PlayedCard;
