import React from 'react';
import { Piece, PIECE_NAMES } from '@/gameChineseChess';

interface ChessPieceProps {
  piece: Piece;
  size: number;
  isSelected?: boolean;
  isStartPosition?: boolean;
}

export function ChessPiece({
  piece,
  size,
  isSelected = false,
  isStartPosition = false
}: ChessPieceProps) {
  const { type, player } = piece;
  const pieceName = PIECE_NAMES[player][type];

  // 棋子样式 - 红色为字体红色，黑色为字体黑色
  const textColor = player === 'red' ? '#C41E3A' : '#000000';
  const bgColor = player === 'red' ? '#FFFFE0' : '#FFFDD0';

  // 选中效果使用高亮边框
  const selectedStyle = isSelected ? {
    border: `3px solid #3B82F6`,
    boxShadow: `0 0 10px 2px rgba(59, 130, 246, 0.6)`,
  } : {
    border: `2px solid ${textColor}`,
  };

  return (
    <div
      className={`
        rounded-full flex items-center justify-center
        transition-transform transform hover:scale-105
        cursor-pointer shadow-md
      `}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        ...selectedStyle
      }}
    >
      <span
        className="font-bold select-none"
        style={{
          color: textColor,
          fontSize: Math.floor(size * 0.6),
          lineHeight: 1,
        }}
      >
        {pieceName}
      </span>
    </div>
  );
}
