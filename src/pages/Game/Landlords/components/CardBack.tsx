/**
 * 扑克牌背组件 - 与顶部底牌区域统一样式
 * 响应式设计：支持自定义尺寸
 */
import React from 'react';

interface CardBackProps {
  style?: React.CSSProperties;
  className?: string;
  width?: number;
  height?: number;
}

const CardBack: React.FC<CardBackProps> = ({
  style,
  className,
  width = 52,
  height = 72,
}) => {
  const borderRadius = width * 0.15;
  const fontSize = width * 0.42;
  const boxShadowSpread = width * 0.12;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#fff',
        border: `2px solid #f97316`,
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f97316',
        fontWeight: 700,
        fontSize,
        boxShadow: `0 ${width * 0.04}px ${width * 0.12}px rgba(249,115,22,0.3)`,
        ...style,
      }}
      className={className}
    >
      ?
    </div>
  );
};

export default CardBack;
