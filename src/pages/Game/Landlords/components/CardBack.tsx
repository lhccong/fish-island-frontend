/**
 * 扑克牌背组件 - 与顶部底牌区域统一样式
 */
import React from 'react';

interface CardBackProps {
  style?: React.CSSProperties;
  className?: string;
}

const CardBack: React.FC<CardBackProps> = ({ style, className }) => (
  <div
    style={{
      width: 44,
      height: 60,
      backgroundColor: '#fff',
      border: '1px solid #1e40af',
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#1e40af',
      fontWeight: 700,
      fontSize: 18,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      ...style,
    }}
    className={className}
  >
    ?
  </div>
);

export default CardBack;
