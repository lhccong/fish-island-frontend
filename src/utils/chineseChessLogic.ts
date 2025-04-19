import { Board, Piece, Player, Position, PieceType, CheckStatus } from '@/gameChineseChess';

// 棋盘尺寸
export const BOARD_COLS = 9;
export const BOARD_ROWS = 10;

// 添加全局静默模式变量
export let GLOBAL_SILENT_MODE = false;

// 创建空棋盘
export function createEmptyBoard(): Board {
  return Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
}

// 创建初始棋盘，设置所有棋子的初始位置
export function createInitialBoard(): Board {
  const board = createEmptyBoard();

  // 放置红方棋子
  placePiece(board, 'chariot', 'red', 9, 0);
  placePiece(board, 'horse', 'red', 9, 1);
  placePiece(board, 'elephant', 'red', 9, 2);
  placePiece(board, 'advisor', 'red', 9, 3);
  placePiece(board, 'general', 'red', 9, 4);
  placePiece(board, 'advisor', 'red', 9, 5);
  placePiece(board, 'elephant', 'red', 9, 6);
  placePiece(board, 'horse', 'red', 9, 7);
  placePiece(board, 'chariot', 'red', 9, 8);
  placePiece(board, 'cannon', 'red', 7, 1);
  placePiece(board, 'cannon', 'red', 7, 7);
  placePiece(board, 'soldier', 'red', 6, 0);
  placePiece(board, 'soldier', 'red', 6, 2);
  placePiece(board, 'soldier', 'red', 6, 4);
  placePiece(board, 'soldier', 'red', 6, 6);
  placePiece(board, 'soldier', 'red', 6, 8);

  // 放置黑方棋子
  placePiece(board, 'chariot', 'black', 0, 0);
  placePiece(board, 'horse', 'black', 0, 1);
  placePiece(board, 'elephant', 'black', 0, 2);
  placePiece(board, 'advisor', 'black', 0, 3);
  placePiece(board, 'general', 'black', 0, 4);
  placePiece(board, 'advisor', 'black', 0, 5);
  placePiece(board, 'elephant', 'black', 0, 6);
  placePiece(board, 'horse', 'black', 0, 7);
  placePiece(board, 'chariot', 'black', 0, 8);
  placePiece(board, 'cannon', 'black', 2, 1);
  placePiece(board, 'cannon', 'black', 2, 7);
  placePiece(board, 'soldier', 'black', 3, 0);
  placePiece(board, 'soldier', 'black', 3, 2);
  placePiece(board, 'soldier', 'black', 3, 4);
  placePiece(board, 'soldier', 'black', 3, 6);
  placePiece(board, 'soldier', 'black', 3, 8);

  return board;
}

// 在指定位置放置棋子
function placePiece(board: Board, type: PieceType, player: Player, row: number, col: number): void {
  board[row][col] = {
    type,
    player,
    id: `${player}-${type}-${row}-${col}`
  };
}

// 复制棋盘
export function copyBoard(board: Board): Board {
  return board.map(row => [...row]);
}

// 判断位置是否在棋盘内
export function isPositionInBoard(position: Position): boolean {
  return position.row >= 0 && position.row < BOARD_ROWS &&
         position.col >= 0 && position.col < BOARD_COLS;
}

// 判断位置是否在九宫格内
export function isInPalace(position: Position, player: Player): boolean {
  const { row, col } = position;

  // 只检查列的范围（3-5）和行的范围（0-2或7-9）
  const isValidCol = col >= 3 && col <= 5;
  const isValidRow = player === 'red' ?
    (row >= 7 && row <= 9) :
    (row >= 0 && row <= 2);

  return isValidCol && isValidRow;
}

// 判断棋子移动是否合法
export function isValidMove(
  board: Board,
  fromPos: Position,
  toPos: Position,
  currentPlayer: Player,
  silent: boolean = true // 添加静默参数，默认为false
): boolean {
  // 判断是否使用全局静默模式
  const isSilent = GLOBAL_SILENT_MODE || silent;

  // 基本验证
  // 检查起始位置和目标位置是否在棋盘内
  if (!isPositionInBoard(fromPos) || !isPositionInBoard(toPos)) {
    if (!isSilent) console.log(`移动验证失败: 位置超出棋盘范围 (${fromPos.row},${fromPos.col})->(${toPos.row},${toPos.col})`);
    return false;
  }

  // 检查起始位置是否有棋子
  const piece = board[fromPos.row][fromPos.col];
  if (!piece) {
    if (!isSilent) console.log(`移动验证失败: 起始位置没有棋子 (${fromPos.row},${fromPos.col})`);
    return false;
  }

  // 检查是否是当前玩家的棋子
  if (piece.player !== currentPlayer) {
    if (!isSilent) console.log(`移动验证失败: 不是当前玩家的棋子 ${piece.player}!=${currentPlayer}`);
    return false;
  }

  // 如果起始位置和目标位置相同，不是有效移动
  if (fromPos.row === toPos.row && fromPos.col === toPos.col) {
    if (!isSilent) console.log(`移动验证失败: 起始位置和目标位置相同`);
    return false;
  }

  // 检查目标位置是否有己方棋子
  const targetPiece = board[toPos.row][toPos.col];
  if (targetPiece && targetPiece.player === currentPlayer) {
    if (!isSilent) console.log(`移动验证失败: 目标位置有己方棋子`);
    return false;
  }

  // 根据不同棋子类型检查移动规则
  let result = false;
  switch (piece.type) {
    case 'general':
      result = isValidGeneralMove(board, fromPos, toPos, piece.player);
      break;
    case 'advisor':
      result = isValidAdvisorMove(board, fromPos, toPos, piece.player);
      break;
    case 'elephant':
      result = isValidElephantMove(board, fromPos, toPos, piece.player);
      break;
    case 'horse':
      result = isValidHorseMove(board, fromPos, toPos);
      break;
    case 'chariot':
      result = isValidChariotMove(board, fromPos, toPos);
      break;
    case 'cannon':
      result = isValidCannonMove(board, fromPos, toPos);
      break;
    case 'soldier':
      result = isValidSoldierMove(board, fromPos, toPos, piece.player);
      break;
    default:
      if (!isSilent) console.log(`移动验证失败: 未知棋子类型 ${piece.type}`);
      result = false;
      break;
  }

  // 打印调试信息
  if (!result && !isSilent) {
    // console.log(`移动验证失败: ${piece.type}(${fromPos.row},${fromPos.col})->(${toPos.row},${toPos.col}) 不符合该棋子移动规则`);
  }

  return result;
}

// 将/帅的移动规则
function isValidGeneralMove(board: Board, fromPos: Position, toPos: Position, player: Player): boolean {
  // 将帅只能在九宫格内移动
  if (!isInPalace(toPos, player)) return false;

  const rowDiff = Math.abs(toPos.row - fromPos.row);
  const colDiff = Math.abs(toPos.col - fromPos.col);

  // 将帅只能上下左右移动一格
  const normalMove = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

  // 特殊规则：将帅对面时，将可以吃帅，帅可以吃将
  if (!normalMove) {
    // 检查是否是直接面对对方将帅的特殊情况
    const opponent = player === 'red' ? 'black' : 'red';
    const piece = board[toPos.row][toPos.col];

    // 如果目标位置是对方的将帅
    if (piece && piece.player === opponent && piece.type === 'general') {
      // 检查两个将帅是否在同一列上
      if (toPos.col === fromPos.col) {
        // 检查两个将帅之间是否有其他棋子
        let hasObstacle = false;
        const startRow = Math.min(fromPos.row, toPos.row) + 1;
        const endRow = Math.max(fromPos.row, toPos.row);

        for (let row = startRow; row < endRow; row++) {
          if (board[row][fromPos.col] !== null) {
            hasObstacle = true;
            break;
          }
        }

        // 如果没有障碍物，将帅可以相互吃
        if (!hasObstacle) {
          // 允许将帅隔空相吃
          return true;
        }
      }
    }
  }

  return normalMove;
}

// 士/仕的移动规则
function isValidAdvisorMove(board: Board, fromPos: Position, toPos: Position, player: Player): boolean {
  // 士仕只能在九宫格内移动
  if (!isInPalace(toPos, player)) return false;

  const rowDiff = Math.abs(toPos.row - fromPos.row);
  const colDiff = Math.abs(toPos.col - fromPos.col);

  // 士仕只能斜着走一格
  return rowDiff === 1 && colDiff === 1;
}

// 象/相的移动规则
function isValidElephantMove(board: Board, fromPos: Position, toPos: Position, player: Player): boolean {
  // 象相不能过河
  if (player === 'red' && toPos.row < 5) return false;
  if (player === 'black' && toPos.row > 4) return false;

  const rowDiff = Math.abs(toPos.row - fromPos.row);
  const colDiff = Math.abs(toPos.col - fromPos.col);

  // 象相必须走"田"字
  if (rowDiff !== 2 || colDiff !== 2) return false;

  // 检查象眼是否被堵住
  const eyeRow = Math.floor((fromPos.row + toPos.row) / 2);
  const eyeCol = Math.floor((fromPos.col + toPos.col) / 2);

  return board[eyeRow][eyeCol] === null;
}

// 马的移动规则
function isValidHorseMove(board: Board, fromPos: Position, toPos: Position): boolean {
  const rowDiff = Math.abs(toPos.row - fromPos.row);
  const colDiff = Math.abs(toPos.col - fromPos.col);

  // 马走"日"字
  if (!((rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1))) {
    return false;
  }

  // 检查马脚是否被绊住
  if (rowDiff === 2) {
    // 垂直方向上的"拐脚"移动（上或下）
    const legRow = fromPos.row + (toPos.row > fromPos.row ? 1 : -1);
    const legCol = fromPos.col;
    if (board[legRow][legCol] !== null) {
      // 马脚被卡住
      return false;
    }
  } else { // rowDiff === 1 && colDiff === 2
    // 水平方向上的"拐脚"移动（左或右）
    const legRow = fromPos.row;
    const legCol = fromPos.col + (toPos.col > fromPos.col ? 1 : -1);
    if (board[legRow][legCol] !== null) {
      // 马脚被卡住
      return false;
    }
  }

  return true;
}

// 车的移动规则
function isValidChariotMove(board: Board, fromPos: Position, toPos: Position): boolean {
  const rowDiff = Math.abs(toPos.row - fromPos.row);
  const colDiff = Math.abs(toPos.col - fromPos.col);

  // 车只能直线移动（横或竖）
  if (rowDiff > 0 && colDiff > 0) {
    return false;
  }

  // 检查路径上是否有其他棋子
  if (rowDiff > 0) {
    // 竖直移动
    const direction = toPos.row > fromPos.row ? 1 : -1;
    let currentRow = fromPos.row + direction;

    while (currentRow !== toPos.row) {
      if (board[currentRow][fromPos.col] !== null) {
        return false;
      }
      currentRow += direction;
    }
  } else if (colDiff > 0) {
    // 水平移动
    const direction = toPos.col > fromPos.col ? 1 : -1;
    let currentCol = fromPos.col + direction;

    while (currentCol !== toPos.col) {
      if (board[fromPos.row][currentCol] !== null) {
        return false;
      }
      currentCol += direction;
    }
  }

  return true;
}

// 炮的移动规则
function isValidCannonMove(board: Board, fromPos: Position, toPos: Position): boolean {
  const rowDiff = Math.abs(toPos.row - fromPos.row);
  const colDiff = Math.abs(toPos.col - fromPos.col);

  // 炮只能直线移动（横或竖）
  if (rowDiff > 0 && colDiff > 0) {
    return false;
  }

  // 计算路径上的棋子数量
  let piecesInPath = 0;

  if (rowDiff > 0) {
    // 竖直移动
    const direction = toPos.row > fromPos.row ? 1 : -1;
    let currentRow = fromPos.row + direction;

    while (currentRow !== toPos.row) {
      if (board[currentRow][fromPos.col] !== null) {
        piecesInPath++;
      }
      currentRow += direction;
    }
  } else if (colDiff > 0) {
    // 水平移动
    const direction = toPos.col > fromPos.col ? 1 : -1;
    let currentCol = fromPos.col + direction;

    while (currentCol !== toPos.col) {
      if (board[fromPos.row][currentCol] !== null) {
        piecesInPath++;
      }
      currentCol += direction;
    }
  }

  const targetPiece = board[toPos.row][toPos.col];

  // 如果目标位置没有棋子，则不能有翻山（路径上不能有棋子）
  if (targetPiece === null) {
    return piecesInPath === 0;
  }

  // 如果目标位置有棋子，则必须正好翻过一个棋子才能吃子
  return piecesInPath === 1;
}

// 兵/卒的移动规则
function isValidSoldierMove(board: Board, fromPos: Position, toPos: Position, player: Player): boolean {
  const rowDiff = toPos.row - fromPos.row;
  const absRowDiff = Math.abs(rowDiff);
  const colDiff = Math.abs(toPos.col - fromPos.col);

  // 兵只能前进一格或过河后左右移动一格
  if (player === 'red') {
    // 红方兵向上移动
    if (rowDiff > 0) return false; // 不能后退

    // 未过河（在第5行之后）只能向前
    if (fromPos.row > 4) {
      return rowDiff === -1 && colDiff === 0;
    } else {
      // 过河后可以向前或左右
      return (absRowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
  } else {
    // 黑方卒向下移动
    if (rowDiff < 0) return false; // 不能后退

    // 未过河（在第4行之前）只能向前
    if (fromPos.row < 5) {
      return rowDiff === 1 && colDiff === 0;
    } else {
      // 过河后可以向前或左右
      return (absRowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
  }
}

// 找到指定玩家的将/帅的位置
export function findGeneral(board: Board, player: Player): Position | null {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'general' && piece.player === player) {
        return { row, col };
      }
    }
  }
  return null;
}

// 检查是否被将军
export function isInCheck(
  board: Board,
  player: Player,
  silent: boolean = false // 添加silent参数
): CheckStatus {
  // 使用全局静默模式或传入的silent参数
  const isSilent = GLOBAL_SILENT_MODE || silent;

  // 找到将/帅的位置
  const generalPosition = findGeneral(board, player);
  if (!generalPosition) return { inCheck: false, checkedBy: null };

  const opponent: Player = player === 'red' ? 'black' : 'red';
  const checkedBy: Piece[] = [];

  // 检查所有对手棋子是否可以吃掉将/帅
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.player === opponent) {
        const fromPos = { row, col };
        // 使用isValidMove确认对方是否能够攻击将帅
        if (isValidMove(board, fromPos, generalPosition, opponent, isSilent)) {
          checkedBy.push(piece);
          if (!isSilent) {
            console.log(`${player}方将/帅被${opponent}方${piece.type}将军`);
          }
        }
      }
    }
  }

  // 额外检查：将帅是否面对面
  const opponentGeneralPosition = findGeneral(board, opponent);
  if (opponentGeneralPosition && generalPosition.col === opponentGeneralPosition.col) {
    // 检查将帅之间是否有棋子
    let hasObstacle = false;
    const startRow = Math.min(generalPosition.row, opponentGeneralPosition.row) + 1;
    const endRow = Math.max(generalPosition.row, opponentGeneralPosition.row);

    for (let row = startRow; row < endRow; row++) {
      if (board[row][generalPosition.col] !== null) {
        hasObstacle = true;
        break;
      }
    }

    // 如果将帅之间没有棋子，则被对方将军
    if (!hasObstacle) {
      const opponentGeneral = board[opponentGeneralPosition.row][opponentGeneralPosition.col];
      if (opponentGeneral) {
        // 避免重复添加
        if (!checkedBy.some(p => p.id === opponentGeneral.id)) {
          checkedBy.push(opponentGeneral);
          if (!isSilent) {
            console.log(`将帅对面: ${player}方将/帅被${opponent}方将/帅照面，没有中间子阻挡`);
          }
        }
      }
    }
  }

  return {
    inCheck: checkedBy.length > 0,
    checkedBy: checkedBy.length > 0 ? checkedBy : null
  };
}

// 检查移动是否会导致自己被将军
export function isMoveSafeFromCheck(
  board: Board,
  fromPos: Position,
  toPos: Position,
  player: Player,
  silent: boolean = false // 添加silent参数
): boolean {
  // 使用全局静默模式或传入的silent参数
  const isSilent = GLOBAL_SILENT_MODE || silent;

  // 模拟进行移动
  const newBoard = makeMove(board, fromPos, toPos);

  // 检查移动后是否处于被将军状态
  const checkStatus = isInCheck(newBoard, player, isSilent);

  return !checkStatus.inCheck;
}

// 检查是否将死（无合法移动可以解除将军状态）
export function isCheckmate(board: Board, player: Player, silent: boolean = false): boolean {
  // 使用全局静默模式或传入的silent参数
  const isSilent = GLOBAL_SILENT_MODE || silent;

  const checkStatus = isInCheck(board, player, isSilent);
  if (!checkStatus.inCheck) return false;

  // 尝试每个棋子的每个可能移动，看是否能解除将军
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.player === player) {
        const fromPos = { row, col };

        // 使用getPotentialMoves获取可能的移动，减少遍历次数
        const potentialMoves = getPotentialMoves(board, fromPos, piece.type, player, true);
        for (const toPos of potentialMoves) {
          // 如果移动合法且可以解除将军状态
          if (isValidMove(board, fromPos, toPos, player, true) &&
              isMoveSafeFromCheck(board, fromPos, toPos, player, isSilent)) {
            return false; // 找到了一个可以解除将军的移动
          }
        }
      }
    }
  }

  // 没有找到可以解除将军的移动，判定为将死
  return true;
}

// 执行移动，返回移动后的新棋盘
export function makeMove(board: Board, fromPos: Position, toPos: Position): Board {
  const newBoard = copyBoard(board);

  // 获取被吃的棋子（如果有）
  const capturedPiece = newBoard[toPos.row][toPos.col];

  // 移动棋子
  const piece = newBoard[fromPos.row][fromPos.col];
  newBoard[toPos.row][toPos.col] = piece;
  newBoard[fromPos.row][fromPos.col] = null;

  return newBoard;
}

// 获取电脑AI的移动
export function getAIMove(board: Board, player: Player): { from: Position, to: Position } {
  // 启用全局静默模式，抑制所有日志输出
  const previousSilentMode = GLOBAL_SILENT_MODE;
  GLOBAL_SILENT_MODE = true;

  try {
    // 记录开始时间，用于性能分析
    const startTime = Date.now();

    // 使用Alpha-Beta剪枝搜索找到最佳走法
    const possibleMoves: Array<{ from: Position, to: Position, score: number }> = [];
    const opponent = player === 'red' ? 'black' : 'red';

    // 检查当前是否处于将军状态，优先考虑解除将军
    const inCheckStatus = isInCheck(board, player, true);
    let movesChecked = 0;

    // 遍历所有AI棋子
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const piece = board[row][col];
        if (piece && piece.player === player) {
          const fromPos = { row, col };

          // 快速找出可能的目标位置
          const potentialMoves = getPotentialMoves(board, fromPos, piece.type, player, true);

          for (const toPos of potentialMoves) {
            // 检查移动是否合法且安全 - AI必须遵循规则，不能自杀
            if (isValidMove(board, fromPos, toPos, player, true) &&  // 添加silent=true参数
                isMoveSafeFromCheck(board, fromPos, toPos, player, true)) {  // AI必须检查是否会导致自己被将军

              movesChecked++;

              // 模拟移动
              const newBoard = makeMove(board, fromPos, toPos);

              // 优先考虑即时胜利
              if (isImmediateWin(newBoard, toPos, player, opponent)) {
                console.log(`AI找到了立即获胜的走法: ${piece.type} (${fromPos.row},${fromPos.col})->(${toPos.row},${toPos.col})`);
                return { from: fromPos, to: toPos };
              }

              // 使用简单评估进行浅层搜索，减少计算量
              const score = minimax(newBoard, 1, false, -Infinity, Infinity, player, opponent);

              possibleMoves.push({ from: fromPos, to: toPos, score });

              // 如果已经检查了超过100个走法且已运行超过1秒，提前停止
              if (movesChecked > 100 && (Date.now() - startTime) > 1000) {
                console.log(`AI搜索提前停止: 已检查${movesChecked}个走法，耗时${Date.now() - startTime}ms`);
                break;
              }
            }
          }
        }
      }
    }

    // 按分数排序
    possibleMoves.sort((a, b) => b.score - a.score);

    // 计算耗时并记录日志
    const endTime = Date.now();
    const timeSpent = endTime - startTime;

    // 添加调试信息
    if (possibleMoves.length > 0) {
      console.log(`AI考虑了${possibleMoves.length}种走法，耗时${timeSpent}ms，最佳分数: ${possibleMoves[0].score}`);
      // 显示前三个最佳走法供参考
      const topMoves = possibleMoves.slice(0, Math.min(3, possibleMoves.length));
      topMoves.forEach((move, index) => {
        const piece = board[move.from.row][move.from.col];
        if (piece) {
          console.log(`第${index+1}好的走法: ${piece.type} (${move.from.row},${move.from.col})->(${move.to.row},${move.to.col}) 分数: ${move.score}`);
        }
      });
    }

    // 选择最佳走法，但有小概率选择次优走法以增加变化
    if (possibleMoves.length > 0) {
      // 高级AI主要选择最佳走法，仅有小概率选择次优走法
      const randomFactor = Math.random();
      if (randomFactor > 0.9 && possibleMoves.length > 1) {
        // 10%的概率选择第二好的走法
        return possibleMoves[1];
      } else {
        // 90%的概率选择最佳走法
        return possibleMoves[0];
      }
    }

    // 如果没有合法移动（极少情况），返回错误
    throw new Error("AI没有找到有效走法");
  } finally {
    // 恢复之前的静默模式设置
    GLOBAL_SILENT_MODE = previousSilentMode;
  }
}

// 检查是否是立即获胜的走法
function isImmediateWin(board: Board, movePos: Position, player: Player, opponent: Player): boolean {
  // 检查是否吃掉了对方的将/帅
  const targetPiece = board[movePos.row][movePos.col];

  if (targetPiece && targetPiece.type === 'general' && targetPiece.player === opponent) {
    return true;
  }

  // 检查是否将死对方
  return isCheckmate(board, opponent, true);
}

// 极大极小搜索算法 - 优化版
function minimax(board: Board, depth: number, isMaximizing: boolean, alpha: number, beta: number, currentPlayer: Player, opponent: Player): number {
  // 达到搜索深度或游戏结束，评估当前局面
  if (depth === 0) {
    return evaluateBoard(board, currentPlayer, opponent);
  }

  // 为了提高性能，仅考虑最重要的一些移动
  const allMoves: Array<{ fromPos: Position, toPos: Position, score: number }> = [];

  // 快速收集所有可能的移动，并进行初步评估
  const activePlayer = isMaximizing ? currentPlayer : opponent;

  // 遍历棋盘找出所有活跃玩家的棋子
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.player === activePlayer) {
        const fromPos = { row, col };

        // 获取潜在移动
        const potentialMoves = getPotentialMoves(board, fromPos, piece.type, activePlayer, true);

        for (const toPos of potentialMoves) {
          // 仅检查基本移动规则，加速验证过程
          if (isValidMove(board, fromPos, toPos, activePlayer, true)) {  // 使用静默模式
            // 模拟移动并快速评估
            const newBoard = makeMove(board, fromPos, toPos);
            const quickScore = quickEvaluate(newBoard, piece, toPos, currentPlayer, opponent, isMaximizing);

            allMoves.push({ fromPos, toPos, score: quickScore });
          }
        }
      }
    }
  }

  // 对移动进行排序，优先考虑更有希望的移动
  allMoves.sort((a, b) => isMaximizing ? b.score - a.score : a.score - b.score);

  // 只考虑前10个最有希望的移动，以提高性能
  const movesToConsider = allMoves.slice(0, Math.min(10, allMoves.length));

  if (isMaximizing) {
    // AI回合，寻找最大分数
    let maxScore = -Infinity;

    for (const move of movesToConsider) {
      // 检查移动是否安全
      if (isMoveSafeFromCheck(board, move.fromPos, move.toPos, currentPlayer, true)) {  // 使用静默模式
        // 模拟移动
        const newBoard = makeMove(board, move.fromPos, move.toPos);

        // 递归计算分数
        const score = minimax(newBoard, depth - 1, false, alpha, beta, currentPlayer, opponent);
        maxScore = Math.max(maxScore, score);

        // Alpha-Beta剪枝
        alpha = Math.max(alpha, score);
        if (beta <= alpha) {
          break;
        }
      }
    }

    return maxScore === -Infinity ? evaluateBoard(board, currentPlayer, opponent) : maxScore;
  } else {
    // 对手回合，寻找最小分数
    let minScore = Infinity;

    for (const move of movesToConsider) {
      // 检查移动是否安全
      if (isMoveSafeFromCheck(board, move.fromPos, move.toPos, opponent, true)) {  // 使用静默模式
        // 模拟移动
        const newBoard = makeMove(board, move.fromPos, move.toPos);

        // 递归计算分数
        const score = minimax(newBoard, depth - 1, true, alpha, beta, currentPlayer, opponent);
        minScore = Math.min(minScore, score);

        // Alpha-Beta剪枝
        beta = Math.min(beta, score);
        if (beta <= alpha) {
          break;
        }
      }
    }

    return minScore === Infinity ? evaluateBoard(board, currentPlayer, opponent) : minScore;
  }
}

// 快速评估棋盘，用于移动排序
function quickEvaluate(board: Board, piece: Piece, movePos: Position, player: Player, opponent: Player, isMaximizing: boolean): number {
  // 棋子价值表
  const pieceValues: Record<PieceType, number> = {
    'general': 10000,
    'advisor': 200,
    'elephant': 250,
    'horse': 500,
    'chariot': 900,
    'cannon': 450,
    'soldier': 100
  };

  let score = 0;

  // 1. 如果能吃子，加分
  const targetPiece = board[movePos.row][movePos.col];
  if (targetPiece) {
    score += pieceValues[targetPiece.type];

    // 如果能吃将/帅，给极高分数
    if (targetPiece.type === 'general') {
      return isMaximizing ? 9999 : -9999;
    }
  }

  // 2. 如果是兵/卒过河，加分
  if (piece.type === 'soldier') {
    const hasCrossedRiver = (piece.player === 'red' && movePos.row < 5) ||
                          (piece.player === 'black' && movePos.row > 4);
    if (hasCrossedRiver) {
      score += 50;
    }
  }

  // 3. 如果是车/马/炮控制中心，加分
  if (['chariot', 'horse', 'cannon'].includes(piece.type)) {
    // 估计中心控制
    const centerScore = 8 - Math.abs(movePos.col - 4) - Math.abs(movePos.row - 4.5);
    score += centerScore * 5;
  }

  return isMaximizing ? score : -score;
}

// 获取棋子可能的移动位置，减少遍历整个棋盘
function getPotentialMoves(board: Board, fromPos: Position, pieceType: PieceType, player: Player, silent: boolean = true): Position[] {
  const moves: Position[] = [];
  const { row, col } = fromPos;

  switch (pieceType) {
    case 'general': // 将/帅只能在九宫格内移动
      // 上下左右四个方向，每次一格
      const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // 右、下、左、上
      directions.forEach(([dr, dc]) => {
        const toRow = row + dr;
        const toCol = col + dc;
        if (isPositionInBoard({ row: toRow, col: toCol }) && isInPalace({ row: toRow, col: toCol }, player)) {
          moves.push({ row: toRow, col: toCol });
        }
      });

      // 添加将帅对面的特殊情况
      const opponent = player === 'red' ? 'black' : 'red';
      const opponentGeneralPos = findGeneral(board, opponent);
      if (opponentGeneralPos && opponentGeneralPos.col === col) {
        // 检查中间是否有障碍物
        let hasObstacle = false;
        const startRow = Math.min(row, opponentGeneralPos.row);
        const endRow = Math.max(row, opponentGeneralPos.row);

        for (let r = startRow + 1; r < endRow; r++) {
          if (board[r][col] !== null) {
            hasObstacle = true;
            break;
          }
        }

        if (!hasObstacle) {
          moves.push(opponentGeneralPos);
        }
      }
      break;

    case 'advisor': // 士/仕只能在九宫格内斜线移动
      // 四个斜向，每次一格
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
        const toRow = row + dr;
        const toCol = col + dc;
        if (isPositionInBoard({ row: toRow, col: toCol }) && isInPalace({ row: toRow, col: toCol }, player)) {
          moves.push({ row: toRow, col: toCol });
        }
      });
      break;

    case 'elephant': // 象/相的田字移动
      // 四个斜向，每次两格
      [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
        const toRow = row + dr;
        const toCol = col + dc;
        // 添加过河检查：红方象不能过河（不能上到第4行），黑方相不能过河（不能下到第5行）
        const isOverRiver = (player === 'red' && toRow < 5) || (player === 'black' && toRow > 4);
        if (isPositionInBoard({ row: toRow, col: toCol }) && !isOverRiver) {
          // 检查象眼是否被堵住
          const eyeRow = Math.floor((row + toRow) / 2);
          const eyeCol = Math.floor((col + toCol) / 2);
          if (board[eyeRow][eyeCol] === null) {
            moves.push({ row: toRow, col: toCol });
          }
        }
      });
      break;

    case 'horse': // 马走日
      // 八个方向的日字移动
      [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].forEach(([dr, dc]) => {
        const toRow = row + dr;
        const toCol = col + dc;
        if (isPositionInBoard({ row: toRow, col: toCol })) {
          // 检查马脚是否被绊住
          let legRow = row;
          let legCol = col;

          if (Math.abs(dr) === 1) { // 横向移动2格
            legCol += Math.sign(dc);
          } else { // 纵向移动2格
            legRow += Math.sign(dr);
          }

          if (board[legRow][legCol] === null) {
            moves.push({ row: toRow, col: toCol });
          }
        }
      });
      break;

    case 'chariot': // 车可以横向和纵向移动任意格
      // 横向移动
      for (let c = col + 1; c < BOARD_COLS; c++) {
        moves.push({ row, col: c });
        if (board[row][c] !== null) break; // 遇到棋子停止
      }
      for (let c = col - 1; c >= 0; c--) {
        moves.push({ row, col: c });
        if (board[row][c] !== null) break; // 遇到棋子停止
      }

      // 纵向移动
      for (let r = row + 1; r < BOARD_ROWS; r++) {
        moves.push({ row: r, col });
        if (board[r][col] !== null) break; // 遇到棋子停止
      }
      for (let r = row - 1; r >= 0; r--) {
        moves.push({ row: r, col });
        if (board[r][col] !== null) break; // 遇到棋子停止
      }
      break;

    case 'cannon': // 炮的移动与车类似，但吃子时需要翻山
      // 横向移动
      let hasFoundPiece = false;
      for (let c = col + 1; c < BOARD_COLS; c++) {
        if (!hasFoundPiece && board[row][c] === null) {
          moves.push({ row, col: c }); // 没有隔山，可以走到空位
        } else if (!hasFoundPiece && board[row][c] !== null) {
          hasFoundPiece = true; // 找到第一个棋子
        } else if (hasFoundPiece && board[row][c] !== null) {
          moves.push({ row, col: c }); // 已经有一个棋子作为炮架，可以吃这个棋子
          break;
        }
      }

      hasFoundPiece = false;
      for (let c = col - 1; c >= 0; c--) {
        if (!hasFoundPiece && board[row][c] === null) {
          moves.push({ row, col: c }); // 没有隔山，可以走到空位
        } else if (!hasFoundPiece && board[row][c] !== null) {
          hasFoundPiece = true; // 找到第一个棋子
        } else if (hasFoundPiece && board[row][c] !== null) {
          moves.push({ row, col: c }); // 已经有一个棋子作为炮架，可以吃这个棋子
          break;
        }
      }

      // 纵向移动
      hasFoundPiece = false;
      for (let r = row + 1; r < BOARD_ROWS; r++) {
        if (!hasFoundPiece && board[r][col] === null) {
          moves.push({ row: r, col }); // 没有隔山，可以走到空位
        } else if (!hasFoundPiece && board[r][col] !== null) {
          hasFoundPiece = true; // 找到第一个棋子
        } else if (hasFoundPiece && board[r][col] !== null) {
          moves.push({ row: r, col }); // 已经有一个棋子作为炮架，可以吃这个棋子
          break;
        }
      }

      hasFoundPiece = false;
      for (let r = row - 1; r >= 0; r--) {
        if (!hasFoundPiece && board[r][col] === null) {
          moves.push({ row: r, col }); // 没有隔山，可以走到空位
        } else if (!hasFoundPiece && board[r][col] !== null) {
          hasFoundPiece = true; // 找到第一个棋子
        } else if (hasFoundPiece && board[r][col] !== null) {
          moves.push({ row: r, col }); // 已经有一个棋子作为炮架，可以吃这个棋子
          break;
        }
      }
      break;

    case 'soldier': // 兵/卒向前移动，过河后可以左右移动
      const direction = player === 'red' ? -1 : 1; // 红方向上，黑方向下

      // 前进一格
      const forwardRow = row + direction;
      if (isPositionInBoard({ row: forwardRow, col })) {
        moves.push({ row: forwardRow, col });
      }

      // 判断是否过河
      const hasCrossedRiver = (player === 'red' && row < 5) || (player === 'black' && row > 4);
      if (hasCrossedRiver) {
        // 左右移动
        if (col > 0) moves.push({ row, col: col - 1 });
        if (col < BOARD_COLS - 1) moves.push({ row, col: col + 1 });
      }
      break;
  }

  // 过滤掉目标位置有己方棋子的移动
  return moves.filter(toPos => {
    const targetPiece = board[toPos.row][toPos.col];
    return targetPiece === null || targetPiece.player !== player;
  });
}

// 检查棋子是否处于危险中（会被吃掉）
function isPieceEndangered(board: Board, position: Position, player: Player): boolean {
  const opponent = player === 'red' ? 'black' : 'red';

  // 检查对手的每个棋子是否可以吃掉此位置的棋子
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.player === opponent) {
        const fromPos = { row, col };
        if (isValidMove(board, fromPos, position, opponent, true)) {
          return true;
        }
      }
    }
  }

  return false;
}

// 计算一个位置威胁到的敌方棋子数量
function countThreatenedPieces(board: Board, position: Position, player: Player): number {
  let count = 0;
  const opponent = player === 'red' ? 'black' : 'red';

  // 遍历棋盘寻找敌方棋子
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.player === opponent) {
        // 检查是否可以吃到这个敌方棋子
        if (isValidMove(board, position, { row, col }, player, true)) {
          count++;
        }
      }
    }
  }

  return count;
}

// 计算棋子在位置的开放线路数量
function countOpenLines(board: Board, position: Position): number {
  let count = 0;
  const { row, col } = position;

  // 检查上下左右四个方向
  const directions = [
    { dr: -1, dc: 0 }, // 上
    { dr: 1, dc: 0 },  // 下
    { dr: 0, dc: -1 }, // 左
    { dr: 0, dc: 1 }   // 右
  ];

  for (const dir of directions) {
    let openCells = 0;
    let r = row + dir.dr;
    let c = col + dir.dc;

    while (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS) {
      if (board[r][c] === null) {
        openCells++;
      } else {
        break;
      }
      r += dir.dr;
      c += dir.dc;
    }

    // 如果开放线路较长，加分
    if (openCells >= 2) {
      count++;
    }
  }

  return count;
}

// 检查移动后是否可以将军
function canCheckAfterMove(board: Board, fromPos: Position, toPos: Position, player: Player, opponent: Player): boolean {
  const newBoard = makeMove(board, fromPos, toPos);
  const checkStatus = isInCheck(newBoard, opponent, true);
  return checkStatus.inCheck;
}

// 计算一个位置保护的友方重要棋子数量
function countProtectedPieces(board: Board, position: Position, player: Player): number {
  let count = 0;
  const piece = board[position.row][position.col];
  if (!piece) return 0;

  // 遍历棋盘寻找己方棋子
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const targetPiece = board[row][col];
      if (targetPiece && targetPiece.player === player &&
          ['general', 'chariot', 'horse'].includes(targetPiece.type)) {
        // 检查是否在保护范围内
        const distance = Math.abs(position.row - row) + Math.abs(position.col - col);
        if (distance <= 2) {
          count++;
        }
      }
    }
  }

  return count;
}

// 评估移动的分数 - 为兼容旧代码保留此函数，但进行优化
function evaluateMove(board: Board, fromPos: Position, toPos: Position, player: Player, opponent: Player): number {
  // 模拟移动
  const newBoard = makeMove(board, fromPos, toPos);

  // 使用更先进的局面评估
  return evaluateBoard(newBoard, player, opponent);
}

// 评估整个棋盘的分数
function evaluateBoard(board: Board, player: Player, opponent: Player): number {
  let score = 0;

  // 检查是否将军或被将军
  const playerInCheck = isInCheck(board, player);
  const opponentInCheck = isInCheck(board, opponent);

  // 如果对手被将死，返回最高分
  if (isCheckmate(board, opponent)) {
    return 100000;
  }

  // 如果自己被将死，返回最低分
  if (isCheckmate(board, player)) {
    return -100000;
  }

  // 基础分 - 棋子价值
  const pieceValues: Record<PieceType, number> = {
    'general': 10000,  // 将/帅
    'advisor': 200,    // 士/仕
    'elephant': 250,   // 象/相
    'horse': 500,      // 马
    'chariot': 900,    // 车
    'cannon': 450,     // 炮
    'soldier': 100     // 兵/卒
  };

  // 针对不同阶段的棋子价值调整
  const positionValues: Record<PieceType, number[][]> = {
    'chariot': [
      [14, 14, 12, 18, 16, 18, 12, 14, 14],
      [16, 20, 18, 24, 26, 24, 18, 20, 16],
      [12, 12, 12, 18, 18, 18, 12, 12, 12],
      [12, 18, 16, 22, 22, 22, 16, 18, 12],
      [12, 14, 12, 18, 18, 18, 12, 14, 12],
      [12, 16, 14, 20, 20, 20, 14, 16, 12],
      [6, 10, 8, 14, 14, 14, 8, 10, 6],
      [4, 8, 6, 14, 12, 14, 6, 8, 4],
      [8, 4, 8, 16, 8, 16, 8, 4, 8],
      [6, 8, 6, 14, 12, 14, 6, 8, 6]
    ],
    'horse': [
      [4, 8, 16, 12, 4, 12, 16, 8, 4],
      [4, 10, 28, 16, 8, 16, 28, 10, 4],
      [12, 14, 16, 20, 18, 20, 16, 14, 12],
      [8, 24, 18, 24, 20, 24, 18, 24, 8],
      [6, 16, 14, 18, 16, 18, 14, 16, 6],
      [4, 12, 16, 14, 12, 14, 16, 12, 4],
      [2, 6, 8, 6, 10, 6, 8, 6, 2],
      [4, 2, 8, 8, 4, 8, 8, 2, 4],
      [0, 2, 4, 4, -2, 4, 4, 2, 0],
      [0, -4, 0, 0, 0, 0, 0, -4, 0]
    ],
    'soldier': [
      [0, 3, 6, 9, 12, 9, 6, 3, 0],
      [18, 36, 56, 80, 120, 80, 56, 36, 18],
      [14, 26, 42, 60, 80, 60, 42, 26, 14],
      [10, 20, 30, 34, 40, 34, 30, 20, 10],
      [6, 12, 18, 18, 20, 18, 18, 12, 6],
      [2, 0, 8, 0, 8, 0, 8, 0, 2],
      [0, 0, -2, 0, 4, 0, -2, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    // 其他棋子可以根据需要添加
    'general': Array(10).fill(Array(9).fill(0)),
    'advisor': Array(10).fill(Array(9).fill(0)),
    'elephant': Array(10).fill(Array(9).fill(0)),
    'cannon': Array(10).fill(Array(9).fill(0))
  };

  // 计算总物质分数和位置分数
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece) {
        // 基础物质分数
        const materialValue = pieceValues[piece.type];

        // 位置价值
        let positionValue = 0;
        if (positionValues[piece.type]) {
          // 对于红方，使用正常的位置价值；对于黑方，需要翻转棋盘
          const adjustedRow = piece.player === 'red' ? row : (9 - row);
          const adjustedCol = piece.player === 'red' ? col : (8 - col);
          positionValue = positionValues[piece.type][adjustedRow][adjustedCol];
        }

        // 合计分数
        const totalValue = materialValue + positionValue;

        // 根据棋子所属方加减分
        if (piece.player === player) {
          score += totalValue;

          // 额外评估棋子的活动空间和威胁
          if (piece.type === 'chariot' || piece.type === 'horse' || piece.type === 'cannon') {
            const mobilityScore = countOpenLines(board, { row, col }) * 10;
            score += mobilityScore;

            const threatScore = countThreatenedPieces(board, { row, col }, player) * 15;
            score += threatScore;
          }

          // 如果是兵/卒，鼓励过河
          if (piece.type === 'soldier') {
            const hasCrossedRiver = (player === 'red' && row < 5) || (player === 'black' && row > 4);
            if (hasCrossedRiver) {
              score += 50;
            }
          }
        } else {
          score -= totalValue;

          // 考虑是否威胁对方重要棋子
          if (isPieceEndangered(board, { row, col }, opponent)) {
            score += materialValue / 2; // 威胁对方棋子加分
          }
        }
      }
    }
  }

  // 将军加分
  if (opponentInCheck.inCheck) {
    score += 300;
  }

  // 被将军减分
  if (playerInCheck.inCheck) {
    score -= 250;
  }

  return score;
}

// 添加一个包装函数，完全禁用AI思考过程的日志
export function silentGetAIMove(board: Board, player: Player): { from: Position, to: Position } {
  // 保存所有原始控制台方法
  const originalConsole = { ...console };

  // 保存原始静默模式状态
  const originalSilentMode = GLOBAL_SILENT_MODE;

  // 完全禁用所有控制台输出方法
  try {
    // 彻底屏蔽所有的console方法
    Object.keys(console).forEach(key => {
      // @ts-ignore: 动态修改console对象
      console[key] = () => {};
    });

    // 启用全局静默模式
    GLOBAL_SILENT_MODE = true;

    // 调用原始AI移动函数
    return getAIMove(board, player);
  } finally {
    // 完全恢复原始控制台
    Object.keys(originalConsole).forEach(key => {
      // @ts-ignore: 动态恢复console对象
      console[key] = originalConsole[key];
    });

    // 恢复全局静默模式到原始状态
    GLOBAL_SILENT_MODE = originalSilentMode;
  }
}

// 检查玩家移动是否允许 - 新增函数，让玩家可以自由走棋但AI仍遵循规则
export function isPlayerMoveAllowed(
  board: Board,
  fromPos: Position,
  toPos: Position,
  player: Player,
  isPlayerMove: boolean = true, // 默认为玩家移动
  silent: boolean = false
): boolean {
  // 如果是AI移动，需要检查是否会导致自己被将军
  if (!isPlayerMove) {
    return isMoveSafeFromCheck(board, fromPos, toPos, player, silent);
  }

  // 如果是玩家移动，只检查基本走法是否正确
  return isValidMove(board, fromPos, toPos, player, silent);
}
