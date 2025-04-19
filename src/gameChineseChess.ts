// 中国象棋的游戏类型定义

// 玩家类型
export type Player = 'red' | 'black';

// 棋子类型
export type PieceType = 
  | 'general' // 将/帅
  | 'advisor' // 士/仕
  | 'elephant' // 象/相
  | 'horse' // 马
  | 'chariot' // 车
  | 'cannon' // 炮
  | 'soldier'; // 兵/卒

// 棋子完整信息
export interface Piece {
  type: PieceType;
  player: Player;
  id: string; // 用于标识唯一的棋子
}

// 棋盘坐标
export interface Position {
  row: number;
  col: number;
}

// 记录移动历史
export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece: Piece | null;
  number: number;
}

// 棋盘类型 - 9x10的二维数组
export type Board = (Piece | null)[][];

// 棋盘的列和行标记
export const COLUMNS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const ROWS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// 中文棋盘标记
export const CHINESE_COLUMNS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
export const CHINESE_ROWS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// 棋子中文名称
export const PIECE_NAMES: Record<Player, Record<PieceType, string>> = {
  red: {
    general: '帅',
    advisor: '仕',
    elephant: '相',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '兵'
  },
  black: {
    general: '将',
    advisor: '士',
    elephant: '象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '卒'
  }
};

// 胜利信息
export interface WinInfo {
  winner: Player;
  reason: 'checkmate' | 'resignation' | 'timeout' | 'capture';
}

// 将军状态
export interface CheckStatus {
  inCheck: boolean;
  checkedBy: Piece[] | null;
} 