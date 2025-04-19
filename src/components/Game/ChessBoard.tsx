import React, { useRef, useEffect, useState } from 'react';
import { ChessPiece } from './ChessPiece';
import { Board, Position, COLUMNS, ROWS, Piece } from '@/gameChineseChess';
import { BOARD_COLS, BOARD_ROWS } from '@/utils/chineseChessLogic';

// 定义中国象棋棋盘的网格线颜色和背景色
const BOARD_BG_COLOR = "#f0f7ff";
const GRID_LINE_COLOR = "#000000";

interface ChessBoardProps {
  board: Board;
  onPieceSelect: (position: Position | null) => void;
  onMoveSelect: (position: Position) => void;
  selectedPosition: Position | null;
  validMoves: Position[];
  lastMove: { from: Position, to: Position } | null;
  checkPosition: Position | null;
  disabled: boolean;
}

export function ChessBoard({
  board,
  onPieceSelect,
  onMoveSelect,
  selectedPosition,
  validMoves,
  lastMove,
  checkPosition,
  disabled
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(60);
  const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 计算棋盘单元格大小
  useEffect(() => {
    const calculateCellSize = () => {
      if (!boardRef.current) return;

      // 获取容器宽度
      const containerWidth = boardRef.current.parentElement?.clientWidth || 600;

      // 计算棋盘的可用空间，减去边距
      const availableSpace = containerWidth - 60;

      // 根据可用空间和棋盘大小(9x10)计算单元格大小，稍微减小一点
      const newCellSize = Math.floor(availableSpace / (BOARD_COLS + 1.5)) - 2;

      setCellSize(newCellSize);
    };

    calculateCellSize();
    window.addEventListener('resize', calculateCellSize);

    return () => window.removeEventListener('resize', calculateCellSize);
  }, []);

  // 初始化Canvas和绘制棋盘
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    setCanvasContext(context);

    // 设置Canvas尺寸，增加额外空间用于标记显示
    const boardWidth = cellSize * (BOARD_COLS - 1);
    const boardHeight = cellSize * (BOARD_ROWS - 1);
    canvas.width = boardWidth + cellSize * 2; // 增加水平边距
    canvas.height = boardHeight + cellSize * 2.6; // 调整垂直边距，保持平衡

    // 绘制棋盘
    drawBoard(context, cellSize);
  }, [cellSize]);

  // 绘制棋盘的函数
  const drawBoard = (ctx: CanvasRenderingContext2D, cellSize: number) => {
    // 增加边距，为标记留出足够空间
    const margin = cellSize;
    const boardWidth = cellSize * (BOARD_COLS - 1);
    const boardHeight = cellSize * (BOARD_ROWS - 1);

    // 清除画布
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 绘制棋盘背景
    ctx.fillStyle = BOARD_BG_COLOR;
    ctx.fillRect(margin, margin, boardWidth, boardHeight);

    // 绘制网格线
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;

    // 绘制水平线
    for (let row = 0; row < BOARD_ROWS; row++) {
      const y = margin + row * cellSize;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(margin + boardWidth, y);
      ctx.stroke();
    }

    // 绘制垂直线
    for (let col = 0; col < BOARD_COLS; col++) {
      const x = margin + col * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, margin + boardHeight);
      ctx.stroke();
    }

    // 绘制中间的"楚河汉界"
    ctx.save();
    ctx.fillStyle = BOARD_BG_COLOR;
    ctx.fillRect(margin, margin + 4 * cellSize, boardWidth, cellSize);
    ctx.font = `${cellSize / 2.5}px Arial`;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("楚 河", margin + 2 * cellSize, margin + 4.5 * cellSize);
    ctx.fillText("汉 界", margin + 7 * cellSize, margin + 4.5 * cellSize);
    ctx.restore();

    // 绘制九宫格斜线 - 黑方（上方）
    ctx.beginPath();
    ctx.moveTo(margin + 3 * cellSize, margin);
    ctx.lineTo(margin + 5 * cellSize, margin + 2 * cellSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(margin + 5 * cellSize, margin);
    ctx.lineTo(margin + 3 * cellSize, margin + 2 * cellSize);
    ctx.stroke();

    // 绘制九宫格斜线 - 红方（下方）
    ctx.beginPath();
    ctx.moveTo(margin + 3 * cellSize, margin + 7 * cellSize);
    ctx.lineTo(margin + 5 * cellSize, margin + 9 * cellSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(margin + 5 * cellSize, margin + 7 * cellSize);
    ctx.lineTo(margin + 3 * cellSize, margin + 9 * cellSize);
    ctx.stroke();

    // 添加传统记谱法的纵线标记
    ctx.save();
    ctx.font = `bold ${cellSize / 3}px Arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#333";

    // 黑方（顶部）：阿拉伯数字1-9，从左到右
    for (let col = 0; col < BOARD_COLS; col++) {
      const x = margin + col * cellSize;
      const num = col + 1; // 从左到右，1到9
      ctx.fillText(num.toString(), x, margin / 2); // 放在棋盘上方中间位置
    }

    // 红方（底部）：中文数字一至九，从右到左
    const chineseNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
    for (let col = 0; col < BOARD_COLS; col++) {
      const x = margin + col * cellSize;
      const index = BOARD_COLS - col - 1; // 从右到左，一到九
      ctx.fillText(chineseNumbers[index], x, margin + boardHeight + margin * 0.8); // 调整距离，使其与顶部保持平衡
    }
    ctx.restore();

    // 绘制兵/卒位置的标记
    const drawPositionMark = (x: number, y: number) => {
      const markSize = cellSize / 10;

      // 右上
      if (x < BOARD_COLS - 1) {
        ctx.beginPath();
        ctx.moveTo(margin + x * cellSize + markSize, margin + y * cellSize);
        ctx.lineTo(margin + x * cellSize + markSize * 3, margin + y * cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(margin + x * cellSize, margin + y * cellSize + markSize);
        ctx.lineTo(margin + x * cellSize, margin + y * cellSize + markSize * 3);
        ctx.stroke();
      }

      // 左上
      if (x > 0) {
        ctx.beginPath();
        ctx.moveTo(margin + x * cellSize - markSize, margin + y * cellSize);
        ctx.lineTo(margin + x * cellSize - markSize * 3, margin + y * cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(margin + x * cellSize, margin + y * cellSize + markSize);
        ctx.lineTo(margin + x * cellSize, margin + y * cellSize + markSize * 3);
        ctx.stroke();
      }

      // 右下
      if (x < BOARD_COLS - 1 && y < BOARD_ROWS - 1) {
        ctx.beginPath();
        ctx.moveTo(margin + x * cellSize + markSize, margin + y * cellSize);
        ctx.lineTo(margin + x * cellSize + markSize * 3, margin + y * cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(margin + x * cellSize, margin + y * cellSize - markSize);
        ctx.lineTo(margin + x * cellSize, margin + y * cellSize - markSize * 3);
        ctx.stroke();
      }

      // 左下
      if (x > 0 && y < BOARD_ROWS - 1) {
        ctx.beginPath();
        ctx.moveTo(margin + x * cellSize - markSize, margin + y * cellSize);
        ctx.lineTo(margin + x * cellSize - markSize * 3, margin + y * cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(margin + x * cellSize, margin + y * cellSize - markSize);
        ctx.lineTo(margin + x * cellSize, margin + y * cellSize - markSize * 3);
        ctx.stroke();
      }
    };

    // 绘制炮位置的标记
    drawPositionMark(1, 2);
    drawPositionMark(7, 2);
    drawPositionMark(1, 7);
    drawPositionMark(7, 7);

    // 绘制兵/卒位置的标记
    drawPositionMark(0, 3);
    drawPositionMark(2, 3);
    drawPositionMark(4, 3);
    drawPositionMark(6, 3);
    drawPositionMark(8, 3);
    drawPositionMark(0, 6);
    drawPositionMark(2, 6);
    drawPositionMark(4, 6);
    drawPositionMark(6, 6);
    drawPositionMark(8, 6);
  };

  // 判断是否是有效移动位置
  const isValidMove = (row: number, col: number): boolean => {
    return validMoves.some(pos => pos.row === row && pos.col === col);
  };

  // 判断是否是最后一步移动的位置
  const isLastMovePosition = (row: number, col: number): boolean => {
    if (!lastMove) return false;
    return (lastMove.from.row === row && lastMove.from.col === col) ||
           (lastMove.to.row === row && lastMove.to.col === col);
  };

  // 处理点击位置
  const handlePositionClick = (row: number, col: number) => {
    if (disabled) return;

    const piece = board[row][col];

    // 如果点击的是已选中的位置，取消选中
    if (selectedPosition && selectedPosition.row === row && selectedPosition.col === col) {
      onPieceSelect(null);
      return;
    }

    // 如果已经选中了棋子，并且点击的是有效移动位置，执行移动
    if (selectedPosition && isValidMove(row, col)) {
      onMoveSelect({ row, col });
      return;
    }

    // 如果点击的是己方棋子，选中它
    if (piece) {
      onPieceSelect({ row, col });
      return;
    }

    // 其他情况，清除选中状态
    onPieceSelect(null);
  };

  // 计算位置样式
  const getPositionStyle = (row: number, col: number): React.CSSProperties => {
    const margin = cellSize; // 使用与绘制棋盘时相同的边距
    // 棋子放在格子交叉点上
    const top = margin + row * cellSize;
    const left = margin + col * cellSize;

    return {
      position: 'absolute' as 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      transform: 'translate(-50%, -50%)',
      width: `${cellSize * 0.75}px`, // 减小棋子大小
      height: `${cellSize * 0.75}px`, // 减小棋子大小
      zIndex: 5
    };
  };

  return (
    <div ref={boardRef} className="relative inline-block bg-blue-50 p-8 rounded-xl mx-auto flex justify-center">
      <canvas ref={canvasRef} className="block" />

      {/* 最后移动的位置指示器 */}
      {lastMove && (
        <>
          <div
            className="absolute rounded-full bg-yellow-500 bg-opacity-30 pointer-events-none"
            style={{
              ...getPositionStyle(lastMove.from.row, lastMove.from.col),
              width: cellSize * 0.85, // 调整指示器大小
              height: cellSize * 0.85,
              zIndex: 2 // 降低z-index，确保不会阻挡点击
            }}
          />
          <div
            className="absolute rounded-full bg-yellow-600 animate-pulse pointer-events-none"
            style={{
              ...getPositionStyle(lastMove.to.row, lastMove.to.col),
              width: cellSize * 0.85, // 调整指示器大小
              height: cellSize * 0.85,
              boxShadow: '0 0 10px 2px rgba(234, 179, 8, 0.6)',
              zIndex: 2 // 降低z-index，确保不会阻挡点击
            }}
          />
          {/* 添加连接线指示移动方向 */}
          <svg
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1 // 确保z-index比棋子和可移动位置低
            }}
          >
            <line
              x1={cellSize + lastMove.from.col * cellSize}
              y1={cellSize + lastMove.from.row * cellSize}
              x2={cellSize + lastMove.to.col * cellSize}
              y2={cellSize + lastMove.to.row * cellSize}
              stroke="rgba(234, 179, 8, 0.8)"
              strokeWidth="3"
              strokeDasharray="7,3"
              pointerEvents="none"
              markerEnd="url(#arrowhead)"
            />
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
                pointerEvents="none"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="rgba(234, 179, 8, 0.8)"
                  pointerEvents="none"
                />
              </marker>
            </defs>
          </svg>
        </>
      )}

      {/* 将军位置指示器 */}
      {checkPosition && (
        <div
          className="absolute rounded-full bg-red-500 bg-opacity-50 animate-pulse pointer-events-none"
          style={{
            ...getPositionStyle(checkPosition.row, checkPosition.col),
            width: cellSize * 0.85, // 调整指示器大小
            height: cellSize * 0.85,
            zIndex: 2 // 降低z-index，确保不会阻挡点击
          }}
        />
      )}

      {/* 可移动位置指示器 - 确保这个在最顶层 */}
      {validMoves.map(({ row, col }) => (
        <div
          key={`valid-${row}-${col}`}
          className="absolute rounded-full cursor-pointer hover:bg-blue-400 transition-all duration-150"
          style={{
            ...getPositionStyle(row, col),
            width: cellSize / 3, // 调整有效移动指示器大小
            height: cellSize / 3,
            backgroundColor: 'rgba(59, 130, 246, 0.5)', // 半透明蓝色
            boxShadow: '0 0 5px 1px rgba(59, 130, 246, 0.7)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            zIndex: 30, // 确保最高层级，一定可以点击
            animation: 'validMoveIndicator 1.5s infinite' // 使用动画让点点更醒目
          }}
          onClick={() => handlePositionClick(row, col)}
        />
      ))}

      {/* 添加CSS动画样式 */}
      <style>{`
        @keyframes validMoveIndicator {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.7; }
        }
      `}</style>

      {/* 棋子渲染 - 确保在有效点上方，但可能在可移动指示器下方 */}
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          if (!piece) return null;

          return (
            <div
              key={piece.id}
              style={{
                ...getPositionStyle(rowIndex, colIndex),
                zIndex: 20 // 保证比背景高，但比可点击指示器低
              }}
              onClick={() => handlePositionClick(rowIndex, colIndex)}
            >
              <ChessPiece
                piece={piece}
                size={cellSize * 0.75} // 调整棋子大小
                isSelected={selectedPosition?.row === rowIndex && selectedPosition?.col === colIndex}
                isStartPosition={false}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
