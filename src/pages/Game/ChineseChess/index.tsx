import { ChessBoard } from '@/components/Game/ChessBoard';
import { Move, Piece, PieceType, PIECE_NAMES, Player, Position, WinInfo } from '@/gameChineseChess';
import { wsService } from '@/services/websocket';
import {
  createInitialBoard,
  findGeneral,
  getAIMove,
  isCheckmate,
  isInCheck,
  isValidMove,
  makeMove,
} from '@/utils/chineseChessLogic';
import { useModel } from '@@/exports';
import { Button, Input, message } from 'antd';
import { ArrowLeft, MessageSquare, RotateCcw, Timer, Trophy, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './index.css';

// 添加消息类型定义
interface ChatMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
    level: number;
    isAdmin: boolean;
  };
  timestamp: Date;
}

// 添加玩家信息格式化函数 - 页面顶部，App组件之前
function formatPlayerInfo(user: any) {
  return {
    id: String(user?.id || ''),
    name: user?.userName || '游客',
    avatar:
      user?.userAvatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'visitor'}`,
    level: user?.level || 1,
    isAdmin: user?.userRole === 'admin',
  };
}

function App() {
  // 新增类型定义
  type GameMode = 'single' | 'online' | 'self';
  type OnlineStatus = 'connecting' | 'waiting' | 'playing';
  type GameType = 'normal' | 'hidden'; // 添加游戏类型

  // 中国象棋使用 'red' 和 'black' 作为内部变量名，并在UI中显示为红黑棋子：
  // - 'red' 在UI中显示为"红棋"（先手）
  // - 'black' 在UI中显示为"黑棋"（后手）

  // 在App组件中新增状态
  const { initialState, setInitialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const [gameMode, setGameMode] = useState<GameMode>('single');
  const [gameType, setGameType] = useState<GameType>('normal'); // 添加游戏类型状态
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>('connecting');
  const [roomId, setRoomId] = useState<string>('');
  const [opponentColor, setOpponentColor] = useState<Player>('black');
  const [opponentUserId, setOpponentUserId] = useState<string>('');
  const [opponentInfo, setOpponentInfo] = useState<{
    id: string;
    name: string;
    avatar: string;
    level: number;
  } | null>(null);
  const [playerColor, setPlayerColor] = useState<Player>('red');
  const [selectedColor, setSelectedColor] = useState<Player>('red'); // 添加默认选择颜色状态
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 游戏状态
  const [board, setBoard] = useState<(Piece | null)[][]>(createInitialBoard(gameType));
  // 添加一个ref来保存最新的棋盘状态
  const boardRef = useRef<(Piece | null)[][]>(board);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('red'); // 红方先行
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [checkPosition, setCheckPosition] = useState<Position | null>(null);
  const [winInfo, setWinInfo] = useState<WinInfo | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  // 添加游戏结束弹框状态
  const [showGameEndModal, setShowGameEndModal] = useState(false);

  // 添加吃子和将军特效状态
  const [capturedPieceEffect, setCapturedPieceEffect] = useState<{
    position: Position;
    piece: Piece;
    player: Player;
    timestamp: number;
    eatingPiece?: Piece; // 添加吃子的棋子
  } | null>(null);
  const [isCheck, setIsCheck] = useState(false);
  const [checkEffectVisible, setCheckEffectVisible] = useState(false);

  // 添加聊天相关的状态
  const [showChat, setShowChat] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [hasSentInvitation, setHasSentInvitation] = useState(false);
  const [invitationCooldown, setInvitationCooldown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 添加一个标志位，用于跟踪是否已经发送了同步请求
  const [hasSentSyncRequest, setHasSentSyncRequest] = useState<boolean>(false);

  // 添加一个标志位，用于跟踪是否已经完成了初始化
  const wsInitialized = useRef<boolean>(false);

  // App组件中的状态定义部分添加新的状态变量
  const [forceBoardFlip, setForceBoardFlip] = useState<boolean>(false);

  // 同步更新ref中的棋盘状态
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // 添加保存游戏状态的函数
  const saveGameState = useCallback(() => {
    if (gameMode === 'online') {
      setInitialState((s) => ({
        ...s,
        chessGameState: {
          mode: gameMode,
          onlineStatus,
          roomId,
          opponentColor,
          opponentUserId,
          opponentInfo,
          playerColor,
          gameStarted,
          board: JSON.parse(JSON.stringify(board)),
          moveHistory: [...moveHistory],
          lastMove: lastMove ? { ...lastMove } : null,
          currentPlayer,
          checkPosition: checkPosition ? { ...checkPosition } : null,
          isCheck,
        },
      }));
    }
  }, [
    gameMode,
    onlineStatus,
    roomId,
    opponentColor,
    opponentUserId,
    opponentInfo,
    playerColor,
    gameStarted,
    board,
    moveHistory,
    lastMove,
    currentPlayer,
    checkPosition,
    isCheck,
    setInitialState,
  ]);

  // 在组件卸载时保存状态
  useEffect(() => {
    return () => {
      saveGameState();
    };
  }, [saveGameState]);

  // 添加从路由获取房间号和尝试恢复游戏状态的逻辑
  useEffect(() => {
    const location = window.location;
    const searchParams = new URLSearchParams(location.search);
    const roomIdFromUrl = searchParams.get('roomId');
    const modeFromUrl = searchParams.get('mode');

    // 尝试恢复之前的游戏状态
    // const savedState = initialState && (initialState as any).chessGameState;
    // if (savedState && !wsInitialized.current) {
    //   // 尝试恢复游戏状态
    //   const restored = restoreOnlineGameState(savedState);
    //
    //   // 如果恢复成功并且游戏状态有效，尝试重新连接
    //   if (restored && (savedState.onlineStatus === 'playing' || savedState.onlineStatus === 'waiting')) {
    //     console.log('尝试重新连接WebSocket，恢复游戏...');
    //
    //     // 延迟一点以确保其他状态已设置
    //     setTimeout(() => {
    //       initWebSocket(() => {
    //         // 根据角色采取不同动作
    //         const isJoiner = localStorage.getItem('chess_is_joiner') === 'true';
    //
    //         if (isJoiner) {
    //           // 加入者重新加入房间
    //           sendJoinRoomRequest(savedState.roomId);
    //         } else if (savedState.onlineStatus === 'waiting') {
    //           // 房主重新创建房间
    //           sendCreateRoomRequest();
    //         }
    //       });
    //     }, 500);
    //   }
    // }

    // 处理URL参数
    if (roomIdFromUrl && !wsInitialized.current) {
      // URL中有房间号，说明是加入者
      setRoomId(roomIdFromUrl);
      setGameMode('online');

      console.log('从URL获取房间号，作为加入者:', roomIdFromUrl);

      // 重置棋盘和状态
      setBoard(createInitialBoard(gameType));
      setCurrentPlayer('red'); // 红方总是先行
      setWinInfo(null);
      setMoveHistory([]);
      setLastMove(null);
      setCheckPosition(null);
      setSelectedPosition(null);
      setValidMoves([]);

      // 加入者固定为黑方(后手)
      setPlayerColor('black');
      setOpponentColor('red');

      // 设置状态为连接中
      setOnlineStatus('connecting');

      // 记录我们是加入者
      localStorage.setItem('chess_is_joiner', 'true');

      // 初始化WebSocket并连接
      initWebSocket(() => {
        // WebSocket连接成功后发送加入房间请求
        sendJoinRoomRequest(roomIdFromUrl);
      });

      // 标记为已初始化
      wsInitialized.current = true;
    } else if (!roomIdFromUrl && !wsInitialized.current) {
      // 清除加入者标记
      localStorage.removeItem('chess_is_joiner');

      // 如果之前有WS连接，确保断开
      cleanupWebSocketHandlers();
    }

    if (modeFromUrl) {
      setGameMode(modeFromUrl as GameMode);
    }

    // 组件卸载时清理
    return () => {
      cleanupWebSocketHandlers();
      saveGameState();
    };
  }, []);

  // 添加检测WebSocket连接状态的机制
  useEffect(() => {
    // 仅在联机模式和游戏已开始时检测连接状态
    if (gameMode !== 'online' || !gameStarted) return;

    // 检查WebSocket连接是否断开的周期性任务
    const checkConnectionInterval = setInterval(() => {
      if (!wsService.isConnected() && (onlineStatus === 'playing' || onlineStatus === 'waiting')) {
        console.log('检测到WebSocket连接断开，尝试重连...');
        messageApi.warning('连接断开，正在尝试重连...');

        // 尝试重连
        initWebSocket(() => {
          console.log('重连成功，尝试恢复游戏状态');
          messageApi.success('重连成功');

          // 根据角色尝试恢复游戏
          const isJoiner = localStorage.getItem('chess_is_joiner') === 'true';
          if (isJoiner && roomId) {
            sendJoinRoomRequest(roomId);
          } else if (roomId && onlineStatus === 'waiting') {
            sendCreateRoomRequest();
          }
        });
      }
    }, 15000); // 每15秒检查一次

    return () => {
      clearInterval(checkConnectionInterval);
    };
  }, [gameMode, gameStarted, onlineStatus, roomId]);

  // 新增: 统一初始化WebSocket连接
  const initWebSocket = useCallback((callback?: () => void) => {
    console.log('检查WebSocket连接...');

    // 设置WebSocket处理器
    setupWebSocketHandlers();

    // 获取token
    const token = localStorage.getItem('tokenValue');
    if (!token) {
      messageApi.error('请先登录！');
      return;
    }

    // 如果已经连接，直接执行回调
    if (wsService.isConnected()) {
      console.log('WebSocket已连接，直接执行回调');
      callback?.();
      return;
    }

    // 添加一次性连接处理器
    const handleOneTimeConnect = (data: any) => {
      if (data.type === 1) {
        // 登录连接响应
        console.log('WebSocket连接成功');
        wsService.removeMessageHandler('connected', handleOneTimeConnect);

        // 延迟执行回调确保连接稳定
        setTimeout(() => {
          callback?.();
        }, 500);
      }
    };

    // 添加连接成功处理器
    wsService.addMessageHandler('connected', handleOneTimeConnect);

    // 连接WebSocket
    wsService.connect(token);

    // 设置连接超时检查
    setTimeout(() => {
      if (!wsService.isConnected()) {
        messageApi.error('连接服务器超时，请刷新页面重试');
      }
    }, 10000);
  }, []);

  // 新增：设置WebSocket处理器
  const setupWebSocketHandlers = useCallback(() => {
    console.log('设置WebSocket消息处理器');

    // 先清理可能存在的旧处理器
    cleanupWebSocketHandlers();

    // 添加各种消息处理器
    wsService.addMessageHandler('chat', handleChatMessage);
    wsService.addMessageHandler('joinSuccess', handleJoinSuccess);
    wsService.addMessageHandler('createChessRoom', handleCreateChessRoom);
    wsService.addMessageHandler('moveChess', handleMoveChess);
    wsService.addMessageHandler('requestBoardSync', handleRequestBoardSync);
    wsService.addMessageHandler('boardSync', handleBoardSync);
    wsService.addMessageHandler('gameEnd', handleGameEnd);

    // 添加错误处理器
    wsService.addMessageHandler('error', (data: any) => {
      // console.error('收到WebSocket错误:', data);
      // messageApi.error(data.data?.message || '连接错误');
    });
  }, []);

  // 新增：清理WebSocket处理器
  const cleanupWebSocketHandlers = useCallback(() => {
    console.log('清理WebSocket消息处理器');
    try {
      wsService.clearMessageHandlers();
    } catch (e) {
      console.error('清理WebSocket处理器出错:', e);
    }
  }, []);

  // 修改：发送加入房间请求
  const sendJoinRoomRequest = useCallback(
    (roomIdToJoin: string) => {
      console.log('发送加入房间请求, 房间ID:', roomIdToJoin);

      if (!wsService.isConnected()) {
        console.log('WebSocket未连接，等待连接后再发送请求');
        return;
      }

      // 记录我们是加入者
      localStorage.setItem('chess_is_joiner', 'true');

      // 加入者固定为黑方(后手)
      setPlayerColor('black');
      setOpponentColor('red');

      wsService.send({
        type: 2,
        userId: -1,
        data: {
          type: 'joinRoom',
          content: roomIdToJoin,
          playerInfo: formatPlayerInfo(currentUser),
        },
      });

      // console.log('正在加入房间，你将执黑后手');
    },
    [currentUser],
  );

  // 修改：发送创建房间请求
  const sendCreateRoomRequest = useCallback(() => {
    console.log('发送创建房间请求');

    if (!wsService.isConnected()) {
      console.log('WebSocket未连接，等待连接后再发送请求');
      return;
    }

    // 清除加入者标记
    localStorage.removeItem('chess_is_joiner');

    // 创建新房间，房主固定为红方(先手)
    setPlayerColor('red');
    setOpponentColor('black');

    // 获取当前游戏类型并确保它是正确的
    const currentGameType = gameType;
    console.log(`正在创建房间，你将执红先手，使用游戏类型: ${currentGameType}`);

    // 发送创建房间请求，包含游戏类型
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'createChessRoom',
        content: JSON.stringify({ gameType: currentGameType }), // 将对象转换为JSON字符串
        playerInfo: formatPlayerInfo(currentUser),
      },
    });
  }, [currentUser, gameType]); // 添加gameType依赖

  // 修改：请求同步棋盘
  const requestBoardSync = useCallback(
    (attempt = 1, maxAttempts = 3) => {
      if (attempt > maxAttempts) {
        console.log(`已发送${maxAttempts}次同步请求，停止尝试`);
        return;
      }

      console.log(`发送棋盘同步请求，第${attempt}次尝试`);

      if (!wsService.isConnected()) {
        console.log('WebSocket未连接，等待连接后再请求同步');

        // 延迟重试
        setTimeout(() => {
          if (roomId && onlineStatus === 'playing' && !hasSynchronized.current) {
            requestBoardSync(attempt, maxAttempts);
          }
        }, 2000);
        return;
      }

      wsService.send({
        type: 2,
        userId: -1,
        data: {
          type: 'requestBoardSync',
          content: {
            roomId: roomId,
          },
        },
      });

      // 递增等待时间后重试
      const nextDelay = 2000 + attempt * 1000;
      setTimeout(() => {
        // 只有在同步还未成功时才重试
        if (roomId && onlineStatus === 'playing' && !hasSynchronized.current) {
          requestBoardSync(attempt + 1, maxAttempts);
        }
      }, nextDelay);
    },
    [roomId, onlineStatus],
  );

  // 添加跟踪同步状态的ref
  const hasSynchronized = useRef(false);
  const hasSyncRequestSent = useRef(false);

  // 处理棋子选择
  const handlePieceSelect = useCallback(
    (position: Position | null) => {
      // 判断是否是玩家的回合
      const isPlayerTurn = currentPlayer === playerColor;

      // 联机模式，但不是玩家回合，不允许选择
      if (gameMode === 'online' && !isPlayerTurn) {
        return;
      }

      // 自对弈模式下，允许选择任何颜色的棋子，只要是当前回合颜色
      if (gameMode === 'self' && position) {
        const piece = board[position.row][position.col];
        if (piece && piece.player !== currentPlayer) {
          return;
        }
      }

      setSelectedPosition(position);

      if (position) {
        const piece = board[position.row][position.col];

        // 只能选择当前玩家颜色的棋子（自对弈模式下是当前回合的颜色）
        if (piece && piece.player === currentPlayer) {
          // 计算有效移动位置
          const moves: Position[] = [];

          // 遍历棋盘所有位置
          for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
              // 检查移动是否符合棋子走法规则
              if (isValidMove(board, position, { row, col }, gameType)) {
                moves.push({ row, col });
              }
            }
          }

          // 特殊检查：如果是将/帅，额外检查将帅相对情况
          if (piece.type === 'general') {
            const opponent = currentPlayer === 'red' ? 'black' : 'red';
            const opponentGeneralPos = findGeneral(board, opponent);

            if (opponentGeneralPos && opponentGeneralPos.col === position.col) {
              // 检查将帅之间是否有棋子
              let hasObstacle = false;
              const startRow = Math.min(position.row, opponentGeneralPos.row) + 1;
              const endRow = Math.max(position.row, opponentGeneralPos.row);

              for (let r = startRow; r < endRow; r++) {
                if (board[r][position.col] !== null) {
                  hasObstacle = true;
                  break;
                }
              }

              // 如果将帅之间没有棋子，则可以相互吃
              if (!hasObstacle) {
                // 确保没有重复添加
                if (
                  !moves.some(
                    (move) =>
                      move.row === opponentGeneralPos.row && move.col === opponentGeneralPos.col,
                  )
                ) {
                  moves.push(opponentGeneralPos);
                }
              }
            }
          }

          setValidMoves(moves);
        } else {
          setValidMoves([]);
        }
      } else {
        setValidMoves([]);
      }
    },
    [board, currentPlayer, gameMode, playerColor, gameType],
  );

  // 处理棋子移动
const handleMoveSelect = useCallback(
  (toPosition: Position) => {
    // 确保有选中的棋子，并且在联机模式下是当前玩家的回合
    if (!selectedPosition) return;
    if (gameMode === 'online' && currentPlayer !== playerColor) {
      console.log('不是你的回合，无法移动棋子');
      return;
    }

    // 检查移动是否有效
    if (validMoves.some((move) => move.row === toPosition.row && move.col === toPosition.col)) {
      // 根据游戏模式采用不同的处理逻辑
      const isSingleOrSelfMode = gameMode === 'single' || gameMode === 'self';

      if (isSingleOrSelfMode) {
        // 单机模式和自对弈模式逻辑
        // 获取移动的棋子和可能被吃掉的棋子
        const movingPiece = board[selectedPosition.row][selectedPosition.col];
        const capturedPiece = board[toPosition.row][toPosition.col];

        if (!movingPiece) return;

        // 执行移动
        const newBoard = makeMove(board, selectedPosition, toPosition, gameType);
        setBoard(newBoard);

        // 更新移动历史
        setMoveHistory((prev) => [
          ...prev,
          {
            from: selectedPosition,
            to: toPosition,
            piece: movingPiece,
            capturedPiece: capturedPiece || null,
            number: prev.length + 1,
          },
        ]);

        // 设置最后移动
        setLastMove({ from: selectedPosition, to: toPosition });

        // 如果有棋子被吃掉，显示吃子特效
        if (capturedPiece) {
          setCapturedPieceEffect({
            position: toPosition,
            piece: capturedPiece,
            player: currentPlayer,
            timestamp: Date.now(),
            eatingPiece: movingPiece,
          });

          // 如果吃掉了对方的将/帅，直接获胜
          if (capturedPiece.type === 'general') {
            setWinInfo({
              winner: currentPlayer,
              reason: 'capture',
            });
            // 游戏结束时显示弹框
            setShowGameEndModal(true);
            return;
          }

          // 延迟清除吃子特效
          setTimeout(() => {
            setCapturedPieceEffect(null);
          }, 3000);
        }

        // 检查将军状态
        const nextPlayer = currentPlayer === 'red' ? 'black' : 'red';
        const checkStatus = isInCheck(newBoard, nextPlayer, false, gameType);

        if (checkStatus.inCheck) {
          // 设置将军特效
          setIsCheck(true);
          setCheckEffectVisible(true);
          setCheckPosition(findGeneral(newBoard, nextPlayer));

          // 检查是否将死
          if (isCheckmate(newBoard, nextPlayer, false, gameType)) {
            setWinInfo({
              winner: currentPlayer,
              reason: 'checkmate',
            });
            // 游戏结束时显示弹框
            setShowGameEndModal(true);
            return;
          }

          // 延迟关闭将军特效
          setTimeout(() => {
            setCheckEffectVisible(false);
          }, 2000);
        } else {
          setIsCheck(false);
          setCheckPosition(null);
        }

        // 更新游戏状态
        setCurrentPlayer(nextPlayer);
        setSelectedPosition(null);
        setValidMoves([]);

        // 在单机模式下，AI轮次
        if (gameMode === 'single' && !winInfo) {
          setIsThinking(true);
        }
      } else {
        // 联机模式逻辑
        if (onlineStatus !== 'playing') {
          messageApi.open({
            type: 'info',
            content: '对手还没加入呢，请耐心等待～',
          });
          return;
        }

        // 获取移动的棋子和可能被吃掉的棋子
        const movingPiece = board[selectedPosition.row][selectedPosition.col];
        const capturedPiece = board[toPosition.row][toPosition.col];

        if (!movingPiece) return;

        console.log('发送移动棋子请求:', {
          from: selectedPosition,
          to: toPosition,
          player: playerColor,
          pieceType: movingPiece.type,
        });

        // 使用深拷贝创建新棋盘状态，避免引用问题
        const newBoard = JSON.parse(JSON.stringify(board));
        let updatedPiece;

        // 检查是否是揭棋模式下的暗子
        if (gameType === 'hidden' && (movingPiece as any).isHidden) {
          console.log('[发送-本地] 处理暗棋移动:', {
            原棋子: JSON.stringify(movingPiece),
            位置: `从(${selectedPosition.row},${selectedPosition.col})到(${toPosition.row},${toPosition.col})`,
            玩家: playerColor
          });
          
          // 清除原位置
          newBoard[selectedPosition.row][selectedPosition.col] = null;
          
          // 移除isHidden和originalPosition属性，创建明子
          const { isHidden, originalPosition, ...revealedPiece } = movingPiece as any;
          
          // 创建带有唯一ID的移动棋子
          updatedPiece = {
            ...revealedPiece,
            id: `${playerColor}-${movingPiece.type}-${selectedPosition.row}-${selectedPosition.col}-${toPosition.row}-${toPosition.col}`,
          };
          
          console.log('[发送-本地] 创建的明子:', JSON.stringify(updatedPiece));
          
          // 在新位置放置明子
          newBoard[toPosition.row][toPosition.col] = updatedPiece;
        } else {
          // 普通模式或已翻开的棋子
          // 创建带有唯一ID的移动棋子
          updatedPiece = {
            ...movingPiece,
            id: `${playerColor}-${movingPiece.type}-${selectedPosition.row}-${selectedPosition.col}-${toPosition.row}-${toPosition.col}`,
          };

          // 清除原位置，在新位置放置棋子
          newBoard[selectedPosition.row][selectedPosition.col] = null;
          newBoard[toPosition.row][toPosition.col] = updatedPiece;
        }

        // 更新本地棋盘状态（使用函数式更新确保状态的正确性）
        setBoard(newBoard);
        // 立即更新ref中的状态，确保网络回调能获取到最新的棋盘状态
        boardRef.current = newBoard;

        // 检查是否是揭棋模式下的暗子
        const isHiddenPiece = gameType === 'hidden' && (movingPiece as any).isHidden;
        
        console.log('[发送] 移动棋子详细信息:', {
          gameType,
          isHiddenPiece,
          movingPiece: JSON.stringify(movingPiece),
          from: selectedPosition,
          to: toPosition,
          player: playerColor
        });
        
        // 使用全局 WebSocket 服务发送消息
        wsService.send({
          type: 2,
          userId: opponentUserId,
          data: {
            type: 'moveChess',
            content: {
              roomId: roomId,
              from: selectedPosition,
              to: toPosition,
              player: playerColor,
              pieceType: movingPiece.type,
              isHiddenPiece: isHiddenPiece, // 添加是否为暗棋的标志
              // 如果是暗棋，发送完整的棋子信息，包括类型和玩家
              pieceInfo: isHiddenPiece ? {
                type: movingPiece.type,
                player: playerColor
              } : undefined,
              playerInfo: {
                id: currentUser?.id,
                name: currentUser?.userName,
                avatar: currentUser?.userAvatar,
                level: currentUser?.level,
              },
            },
          },
        });
        
        console.log('[发送] WebSocket消息已发送:', {
          isHiddenPiece,
          pieceType: movingPiece.type,
          player: playerColor
        });

        // 更新移动历史
        setMoveHistory((prev) => [
          ...prev,
          {
            from: selectedPosition,
            to: toPosition,
            piece: updatedPiece,
            capturedPiece: capturedPiece || null,
            number: prev.length + 1,
          },
        ]);

        // 设置最后移动
        setLastMove({ from: selectedPosition, to: toPosition });

        // 如果有棋子被吃掉，显示吃子特效
        if (capturedPiece) {
          setCapturedPieceEffect({
            position: toPosition,
            piece: capturedPiece,
            player: currentPlayer,
            timestamp: Date.now(),
            eatingPiece: updatedPiece,
          });

          // 如果吃掉了对方的将/帅，直接获胜
          if (capturedPiece.type === 'general') {
            setWinInfo({
              winner: currentPlayer,
              reason: 'capture',
            });
            // 游戏结束时显示弹框
            setShowGameEndModal(true);
            // 向对方发送游戏结束通知
            wsService.send({
              type: 2,
              userId: opponentUserId,
              data: {
                type: 'gameEnd',
                content: {
                  roomId: roomId,
                  winner: currentPlayer,
                  reason: 'capture',
                },
              },
            });
            return;
          }

          // 延迟清除吃子特效
          setTimeout(() => {
            setCapturedPieceEffect(null);
          }, 3000);
        }

        // 计算下一个回合的玩家
        const nextPlayer = currentPlayer === 'red' ? 'black' : 'red';

        // 检查将军状态
        const checkStatus = isInCheck(newBoard, nextPlayer, false, gameType);

        if (checkStatus.inCheck) {
          // 设置将军特效
          setIsCheck(true);
          setCheckEffectVisible(true);
          setCheckPosition(findGeneral(newBoard, nextPlayer));

          // 检查是否将死
          if (isCheckmate(newBoard, nextPlayer, false, gameType)) {
            setWinInfo({
              winner: currentPlayer,
              reason: 'checkmate',
            });
            // 游戏结束时显示弹框
            setShowGameEndModal(true);
            // 向对方发送游戏结束通知
            wsService.send({
              type: 2,
              userId: opponentUserId,
              data: {
                type: 'gameEnd',
                content: {
                  roomId: roomId,
                  winner: currentPlayer,
                  reason: 'checkmate',
                },
              },
            });
            return;
          }

          // 延迟关闭将军特效
          setTimeout(() => {
            setCheckEffectVisible(false);
          }, 2000);
        } else {
          setIsCheck(false);
          setCheckPosition(null);
        }

        // 更新游戏状态
        setCurrentPlayer(nextPlayer);
        setSelectedPosition(null);
        setValidMoves([]);

        // 记录游戏状态
        saveGameState();
      }
    }
  },
  [
    board,
    selectedPosition,
    validMoves,
    currentPlayer,
    gameMode,
    onlineStatus,
    playerColor,
    opponentUserId,
    roomId,
    messageApi,
    saveGameState,
    currentUser,
    winInfo,
    gameType,
  ],
);

  // 添加聊天相关的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 在消息列表更新时自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // 重构后的消息处理函数
  const handleChatMessage = (data: any) => {
    const otherUserMessage = data.data.message;
    if (otherUserMessage.sender.id !== String(currentUser?.id)) {
      setChatMessages((prev) => [...prev, { ...otherUserMessage }]);
    }
  };

  const handleJoinSuccess = (data: any) => {
    // 检查我们是加入者还是房主
    const isJoiner = localStorage.getItem('chess_is_joiner') === 'true';

    // 获取游戏类型
    const receivedGameType = data.data.gameType || 'normal';
    console.log(`收到加入成功消息，游戏类型: ${receivedGameType}`);
    console.log(`当前游戏类型: ${gameType}, 将更新为: ${receivedGameType}`);
    setGameType(receivedGameType as GameType);

    // 如果是房主，保持颜色不变
    if (!isJoiner) {
      // 房主接收到消息，但颜色保持不变，只更新对手信息
      setOpponentColor('black'); // 房主是红方，对手是黑方
      setPlayerColor('red'); // 确保房主颜色是红色
      setOnlineStatus('playing');
      setOpponentUserId(data.data.playerId);
      setOpponentInfo(data.data.playerInfo);
      messageApi.open({
        type: 'success',
        content: `对手已加入，战斗开始！！！(${receivedGameType === 'hidden' ? '揭棋模式' : '普通模式'})`,
      });
    } else {
      // 加入者处理
      setOpponentColor('red'); // 加入者对手是红方
      setPlayerColor('black'); // 加入者是黑方
      setOnlineStatus('playing');
      setGameStarted(true);
      setOpponentUserId(data.data.playerId);
      setOpponentInfo(data.data.playerInfo);
      // 确保当前玩家是红方（游戏总是从红方开始）
      setCurrentPlayer('red');
      messageApi.open({
        type: 'success',
        content: `战斗开始！！！(${receivedGameType === 'hidden' ? '揭棋模式' : '普通模式'})`,
      });

      // 加入者需要请求同步棋盘状态
      console.log('加入房间成功，请求同步棋盘');

      // 设置延迟确保房主有时间处理
      setTimeout(() => {
        if (roomId && !hasSynchronized.current) {
          // 发送同步请求
          wsService.send({
            type: 2,
            userId: -1,
            data: {
              type: 'requestBoardSync',
              content: {
                roomId: roomId,
              },
            },
          });
          // 标记已发送同步请求
          hasSyncRequestSent.current = true;
        }
      }, 1000);
    }

    // 根据游戏类型重新创建棋盘
    console.log(`使用游戏类型 ${receivedGameType} 创建初始棋盘`);
    const newBoard = createInitialBoard(receivedGameType as GameType);
    setBoard(newBoard);
    saveGameState();
  };

  const handleCreateChessRoom = (data: any) => {
    console.log('创建房间成功', data.data);
    
    // 处理新的响应格式，包含房间号和游戏类型
    let roomId = '';
    let receivedGameType = gameType; // 默认使用当前游戏类型
    
    if (typeof data.data === 'object' && data.data !== null) {
      // 新格式：{roomId: "xxx", gameType: "xxx"}
      roomId = data.data.roomId || '';
      receivedGameType = data.data.gameType || gameType;
      console.log(`收到服务器返回的游戏类型: ${receivedGameType}`);
      
      // 更新游戏类型状态
      if (receivedGameType !== gameType) {
        console.log(`更新游戏类型从 ${gameType} 到 ${receivedGameType}`);
        setGameType(receivedGameType as GameType);
      }
    } else {
      // 兼容旧格式：直接是房间号字符串
      roomId = data.data;
    }
    
    setRoomId(roomId);
    setOnlineStatus('waiting');
    // 确保创建房间时不会触发将军特效
    setIsCheck(false);
    setCheckEffectVisible(false);
    setCheckPosition(null);
    
    // 使用服务器返回的游戏类型创建棋盘
    console.log(`创建房间使用游戏类型: ${receivedGameType}`);
    
    // 重新创建棋盘，确保使用正确的游戏类型
    const newBoard = createInitialBoard(receivedGameType as GameType);
    setBoard(newBoard);

    messageApi.open({
      type: 'success',
      content: `房间创建成功啦 (${receivedGameType === 'hidden' ? '揭棋模式' : '普通模式'})`,
    });
    setGameStarted(true);
    saveGameState();
  };

  // 声明处理棋盘同步请求的空函数，以避免lint错误
  const handleRequestBoardSync = useCallback(
    (data: any) => {
      // 收到同步请求意味着有人需要我们的棋盘状态
      console.log('收到棋盘同步请求');

      // 只有房主(红方)处理同步请求
      if (playerColor === 'red' && roomId && onlineStatus === 'playing') {
        // 发送当前棋盘状态
        wsService.send({
          type: 2,
          userId: opponentUserId,
          data: {
            type: 'boardSync',
            content: {
              roomId: roomId,
              board: board,
              currentPlayer: currentPlayer,
              moveHistory: moveHistory,
              lastMove: lastMove,
              checkPosition: checkPosition,
              isCheck: isCheck,
              gameType: gameType, // 添加游戏类型
            },
          },
        });
        console.log('已发送棋盘同步数据');
      }
    },
    [
      board,
      currentPlayer,
      isCheck,
      moveHistory,
      lastMove,
      checkPosition,
      opponentUserId,
      onlineStatus,
      playerColor,
      roomId,
      gameType, // 添加gameType依赖
    ],
  );

  const handleBoardSync = useCallback(
    (data: any) => {
      // 加入者(黑方)处理同步数据
      console.log('收到棋盘同步数据', data.data);

      const syncData = data.data;
      if (!syncData || playerColor === 'red') return;

      // 设置游戏类型
      if (syncData.gameType) {
        const receivedGameType = syncData.gameType as GameType;
        console.log(`收到游戏类型: ${receivedGameType}`);
        setGameType(receivedGameType);
        
        // 根据游戏类型重新创建棋盘
        const newBoard = syncData.board || createInitialBoard(receivedGameType);
        console.log(`使用游戏类型 ${receivedGameType} 设置棋盘`);
        setBoard(newBoard);
      } else {
        // 应用同步的棋盘状态，使用默认类型
        setBoard(syncData.board || createInitialBoard('normal'));
      }
      
      setCurrentPlayer(syncData.currentPlayer || 'red');
      setMoveHistory(syncData.moveHistory || []);

      if (syncData.lastMove) {
        setLastMove(syncData.lastMove);
      }

      if (syncData.checkPosition) {
        setCheckPosition(syncData.checkPosition);
        setIsCheck(syncData.isCheck || false);
      } else {
        setCheckPosition(null);
        setIsCheck(false);
      }

      // 标记同步已完成
      hasSynchronized.current = true;
      console.log('棋盘同步完成');
    },
    [playerColor],
  );

  const handleMoveChess = (data: any) => {
    // 解析数据
    const { from, to, player, pieceType, isHiddenPiece, pieceInfo } = data.data;

    // 确保isHiddenPiece是布尔值
    const isHidden = isHiddenPiece === true;

    // 如果收到暗棋移动请求，但当前不是揭棋模式，强制更新游戏类型
    if (isHidden && gameType !== 'hidden') {
      console.log('[接收] 警告: 收到暗棋移动请求，但当前游戏类型是:', gameType);
      console.log('[接收] 强制更新游戏类型为 hidden');
      setGameType('hidden');
    }

    console.log('[接收] 收到对方移动棋子请求:', JSON.stringify(data.data));
    console.log(
      `[接收] 对方请求移动: 从(${from.row},${from.col})到(${to.row},${to.col}), 玩家: ${player}, 是否为暗棋: ${isHidden ? 'true' : 'false'}, 棋子类型: ${pieceType}`,
    );
    console.log('[接收] 当前游戏类型:', gameType);
    console.log('[接收] 接收到的pieceInfo:', pieceInfo);
    console.log('[接收] isHiddenPiece原始值:', isHiddenPiece, '类型:', typeof isHiddenPiece);

    // 使用ref中的最新棋盘状态创建新棋盘的深拷贝
    const newBoard = JSON.parse(JSON.stringify(boardRef.current));

    // 获取目标位置可能存在的棋子（可能被吃掉）
    const capturedPiece = newBoard[to.row][to.col];
    
    // 获取源位置的棋子
    const sourcePiece = newBoard[from.row] && newBoard[from.row][from.col];
    console.log('[接收] 源位置棋子:', sourcePiece ? JSON.stringify(sourcePiece) : '无');

    // 清除源位置
    if (sourcePiece && sourcePiece.player === player) {
      // 获取要移动的原棋子
      const originalPiece = newBoard[from.row][from.col];
      newBoard[from.row][from.col] = null;

      // 检查是否是暗棋移动 - 不再依赖gameType，只要isHidden为true就视为暗棋
      if (isHidden) {
        console.log('[接收] 处理揭棋模式下的暗子翻转 - 强制执行');
        console.log('[接收] 原始棋子:', JSON.stringify(originalPiece));
        console.log('[接收] 标准化后的isHidden值:', isHidden);
        
        // 创建新的明子，使用接收到的pieceInfo
        const newPiece = {
          type: pieceType as PieceType,
          player: player,
          id: `${player}-${pieceType}-${from.row}-${from.col}-${to.row}-${to.col}`,
        };
        
        console.log('[接收] 创建的新明子:', JSON.stringify(newPiece));
        newBoard[to.row][to.col] = newPiece;
      } else {
        console.log('[接收] 处理普通棋子移动');
        
        // 检查是否是暗棋，如果是则需要移除isHidden属性
        if (originalPiece.isHidden) {
          console.log('[接收] 检测到暗棋，但未标记为isHiddenPiece，强制翻转');
          
          // 移除isHidden和originalPosition属性
          const { isHidden, originalPosition, ...revealedProps } = originalPiece;
          
          // 创建新的明子
          const movedPiece = {
            ...revealedProps,
            type: pieceType as PieceType,
            player: player,
            id: `${player}-${pieceType}-${from.row}-${from.col}-${to.row}-${to.col}`,
          };
          
          console.log('[接收] 强制翻转后的棋子:', JSON.stringify(movedPiece));
          newBoard[to.row][to.col] = movedPiece;
          return;
        }
        
        // 在目标位置放置移动的棋子，保留原来的属性并添加唯一标识
        const movedPiece = {
          ...originalPiece,
          id: `${player}-${pieceType}-${from.row}-${from.col}-${to.row}-${to.col}`,
        };
        
        console.log('[接收] 移动后的棋子:', JSON.stringify(movedPiece));
        newBoard[to.row][to.col] = movedPiece;
      }
    } else {
      console.log(`[接收] 源位置(${from.row},${from.col})没有找到对应的棋子，创建新棋子`);
      console.log('[接收] 棋盘状态检查:', {
        gameType,
        isHiddenPiece,
        pieceInfo,
        sourcePieceExists: !!newBoard[from.row] && !!newBoard[from.row][from.col],
        sourcePiecePlayer: newBoard[from.row] && newBoard[from.row][from.col] ? newBoard[from.row][from.col].player : 'none'
      });

      // 如果标记为暗棋移动 - 不再依赖gameType
      if (isHidden) {
        console.log('[接收] 创建暗棋翻转后的明子 - 强制执行');
        console.log('[接收] 标准化后的isHidden值:', isHidden);
        
        // 创建一个新的明子 - 使用pieceInfo中的信息
        const newPiece = {
          // 优先使用pieceInfo中的信息，如果没有则使用传递的参数
          type: (pieceInfo && pieceInfo.type) ? pieceInfo.type as PieceType : pieceType as PieceType,
          player: (pieceInfo && pieceInfo.player) ? pieceInfo.player : player,
          id: `${player}-${pieceType}-${from.row}-${from.col}-${to.row}-${to.col}`,
        };
        
        console.log('[接收] 新创建的明子:', JSON.stringify(newPiece));
        newBoard[to.row][to.col] = newPiece;
      } else {
        console.log('[接收] 创建普通棋子');
        
        // 普通情况，创建一个新棋子
        const newPiece = {
          type: pieceType as PieceType,
          player: player,
          id: `${player}-${pieceType}-${from.row}-${from.col}-${to.row}-${to.col}`,
        };
        
        console.log('[接收] 新创建的普通棋子:', JSON.stringify(newPiece));
        newBoard[to.row][to.col] = newPiece;
      }
    }

    console.log(`[接收] 更新棋盘: ${player}方 ${pieceType} 放置在 (${to.row},${to.col})`);
    console.log('[接收] 目标位置的新棋子:', JSON.stringify(newBoard[to.row][to.col]));

    // 更新棋盘状态
    setBoard(newBoard);
    // 立即更新ref中的状态
    boardRef.current = newBoard;
    
    // 延迟检查棋盘状态，确认更新成功
    setTimeout(() => {
      const currentBoard = boardRef.current;
      console.log('[接收] 更新后的棋子状态:', {
        位置: `(${to.row},${to.col})`,
        棋子: currentBoard[to.row][to.col] ? JSON.stringify(currentBoard[to.row][to.col]) : '无',
        是否为暗棋: currentBoard[to.row][to.col] && (currentBoard[to.row][to.col] as any).isHidden ? '是' : '否'
      });
    }, 100);
    // 更新移动历史
    setMoveHistory((prev) => [
      ...prev,
      {
        from,
        to,
        piece: newBoard[to.row][to.col],
        capturedPiece: capturedPiece || null,
        number: prev.length + 1,
      },
    ]);

    // 设置最后移动
    setLastMove({ from, to });

    // 如果有棋子被吃掉，显示吃子特效
    if (capturedPiece) {
      setCapturedPieceEffect({
        position: to,
        piece: capturedPiece,
        player,
        timestamp: Date.now(),
        eatingPiece: newBoard[to.row][to.col],
      });

      // 如果吃掉了对方的将/帅，直接获胜
      if (capturedPiece.type === 'general') {
        setWinInfo({
          winner: player,
          reason: 'capture',
        });
        // 游戏结束时显示弹框
        setShowGameEndModal(true);
        return;
      }

      // 延迟清除吃子特效
      setTimeout(() => {
        setCapturedPieceEffect(null);
      }, 3000);
    }

    // 计算下一个回合的玩家
    const nextPlayer = player === 'red' ? 'black' : 'red';

    // 检查将军状态
    const checkStatus = isInCheck(newBoard, nextPlayer, false, gameType);

    if (checkStatus.inCheck) {
      // 设置将军特效
      setIsCheck(true);
      setCheckEffectVisible(true);
      const generalPos = findGeneral(newBoard, nextPlayer);
      if (generalPos) {
        setCheckPosition(generalPos);
      }

      // 检查是否将死
      if (isCheckmate(newBoard, nextPlayer, false, gameType)) {
        setWinInfo({
          winner: player,
          reason: 'checkmate',
        });
        // 游戏结束时显示弹框
        setShowGameEndModal(true);
        return;
      }

      // 延迟关闭将军特效
      setTimeout(() => {
        setCheckEffectVisible(false);
      }, 2000);
    } else {
      setIsCheck(false);
      setCheckPosition(null);
    }

    // 更新游戏状态
    setCurrentPlayer(nextPlayer);
    setSelectedPosition(null);
    setValidMoves([]);

    // 更新对手信息
    if (data.data.playerInfo) {
      setOpponentInfo(data.data.playerInfo);
    }

    // 记录游戏状态
    saveGameState();
  };

  // 处理吃子特效的辅助函数
  const handleCaptureEffect = (position: Position, capturedPiece: Piece, movingPiece: Piece) => {
    // 显示吃子特效
    setCapturedPieceEffect({
      position,
      piece: capturedPiece,
      player: movingPiece.player,
      timestamp: Date.now(),
      eatingPiece: movingPiece,
    });

    // 如果吃掉了对方的将/帅，直接获胜
    if (capturedPiece.type === 'general') {
      setWinInfo({
        winner: movingPiece.player,
        reason: 'capture',
      });
      // 游戏结束时显示弹框
      setShowGameEndModal(true);
    }

    // 延迟清除吃子特效
    setTimeout(() => {
      setCapturedPieceEffect(null);
    }, 3000);
  };

  // 添加游戏结束通知处理函数
  const handleGameEnd = useCallback((data: any) => {
    const { winner, reason } = data.data.content;

    // 设置胜利信息
    setWinInfo({
      winner,
      reason,
    });

    // 显示游戏结束弹框
    setShowGameEndModal(true);
  }, []);
  
  // 添加WebSocket消息拦截器，用于调试
  useEffect(() => {
    const originalAddHandler = wsService.addMessageHandler;
    
    // 重写addMessageHandler方法，添加调试日志
    wsService.addMessageHandler = function(type, handler) {
      const wrappedHandler = (data: any) => {
        if (type === 'moveChess') {
          console.log('[WebSocket拦截器] 收到moveChess消息:', JSON.stringify(data));
          console.log('[WebSocket拦截器] isHiddenPiece值:', data.data.isHiddenPiece);
          console.log('[WebSocket拦截器] pieceInfo值:', data.data.pieceInfo);
        }
        return handler(data);
      };
      
      return originalAddHandler.call(wsService, type, wrappedHandler);
    };
    
    return () => {
      // 恢复原始方法
      wsService.addMessageHandler = originalAddHandler;
    };
  }, []);

  // 在组件卸载时清理WebSocket资源
  useEffect(() => {
    return () => {
      // 移除WebSocket消息处理器
      wsService.removeMessageHandler('chat', handleChatMessage);
      wsService.removeMessageHandler('joinSuccess', handleJoinSuccess);
      wsService.removeMessageHandler('createChessRoom', handleCreateChessRoom);
      wsService.removeMessageHandler('moveChess', handleMoveChess);
      wsService.removeMessageHandler('requestBoardSync', handleRequestBoardSync);
      wsService.removeMessageHandler('boardSync', handleBoardSync);
      wsService.removeMessageHandler('gameEnd', handleGameEnd);
    };
  }, []);

  // 在游戏模式改变时建立WebSocket连接
  useEffect(() => {
    if (gameMode === 'online') {
      const token = localStorage.getItem('tokenValue');
      if (!token || !currentUser?.id) {
        messageApi.error('请先登录！');
        return;
      }

      // 添加消息处理器
      wsService.addMessageHandler('chat', handleChatMessage);
      wsService.addMessageHandler('joinSuccess', handleJoinSuccess);
      wsService.addMessageHandler('createChessRoom', handleCreateChessRoom);
      wsService.addMessageHandler('moveChess', handleMoveChess);
      wsService.addMessageHandler('requestBoardSync', handleRequestBoardSync);
      wsService.addMessageHandler('boardSync', handleBoardSync);
      wsService.addMessageHandler('gameEnd', handleGameEnd);

      // 连接WebSocket
      wsService.connect(token);

      return () => {
        // 移除消息处理器
        wsService.removeMessageHandler('chat', handleChatMessage);
        wsService.removeMessageHandler('joinSuccess', handleJoinSuccess);
        wsService.removeMessageHandler('createChessRoom', handleCreateChessRoom);
        wsService.removeMessageHandler('moveChess', handleMoveChess);
        wsService.removeMessageHandler('requestBoardSync', handleRequestBoardSync);
        wsService.removeMessageHandler('boardSync', handleBoardSync);
        wsService.removeMessageHandler('gameEnd', handleGameEnd);
      };
    }
  }, [gameMode, currentUser?.id]);

  // 添加 handleChatSend 函数
  const handleChatSend = () => {
    if (!chatInputValue.trim()) return;
    if (!currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    const newMessage: ChatMessage = {
      id: `${Date.now()}`,
      content: chatInputValue,
      sender: {
        id: String(currentUser.id),
        name: currentUser.userName || '游客',
        avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
        level: currentUser.level || 1,
        isAdmin: currentUser.userRole === 'admin',
      },
      timestamp: new Date(),
    };

    // 使用全局 WebSocket 服务发送消息
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: {
          message: newMessage,
        },
      },
    });

    // 更新消息列表
    setChatMessages((prev) => [...prev, newMessage]);
    setChatInputValue('');
  };

  // 添加发送邀请的函数
  const handleSendInvitation = () => {
    if (!currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    if (hasSentInvitation) {
      messageApi.warning('你已经发送过邀请了，请等待60秒后再试');
      return;
    }

    // 发送邀请消息到聊天室
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: {
          message: {
            id: `${Date.now()}`,
            content: `[invite/chineseChess]${roomId}[/invite]`,
            sender: {
              id: String(currentUser.id),
              name: currentUser.userName || '游客',
              avatar:
                currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
              level: currentUser.level || 1,
              isAdmin: currentUser.userRole === 'admin',
            },
            timestamp: new Date(),
          },
        },
      },
    });

    setHasSentInvitation(true);
    setInvitationCooldown(60);
    messageApi.success('邀请已发送到聊天室');

    // 设置60秒冷却时间
    const timer = setInterval(() => {
      setInvitationCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setHasSentInvitation(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 添加退出房间函数
  const handleExitRoom = () => {
    setGameStarted(false);
    setGameMode('single');
    setBoard(createInitialBoard());
    setCurrentPlayer('red');
    setWinInfo(null);
    setMoveHistory([]);
    setLastMove(null);
    setCheckPosition(null);
    setSelectedPosition(null);
    setValidMoves([]);
    setIsCheck(false);
    setCapturedPieceEffect(null);
    setChatMessages([]);
    setChatInputValue('');
    setRoomId('');
    setShowGameEndModal(false);
  };

  // 添加继续游戏函数
  const handleContinueGame = () => {
    setShowGameEndModal(false);
  };

  // AI逻辑 - 计算机走棋
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const makeAIMove = () => {
      try {
        const aiMove = getAIMove(board, currentPlayer);
        if (!aiMove) {
          setIsThinking(false);
          return;
        }

        const newBoard = makeMove(board, aiMove.from, aiMove.to, gameType);
        const capturedPiece = board[aiMove.to.row][aiMove.to.col];
        const piece = board[aiMove.from.row][aiMove.from.col];

        if (!piece) {
          setIsThinking(false);
          return;
        }

        // 更新棋盘状态
        setBoard(newBoard);
        setLastMove({ from: aiMove.from, to: aiMove.to });

        // 如果AI吃掉了棋子，显示吃子特效
        if (capturedPiece) {
          setCapturedPieceEffect({
            position: aiMove.to,
            piece: capturedPiece,
            player: currentPlayer,
            timestamp: Date.now(),
            eatingPiece: piece,
          });

          // 如果吃掉了对方的将/帅，直接获胜
          if (capturedPiece.type === 'general') {
            setWinInfo({
              winner: currentPlayer,
              reason: 'capture',
            });
            setIsThinking(false);
            return;
          }

          // 3秒后清除吃子特效
          setTimeout(() => {
            setCapturedPieceEffect(null);
          }, 3000);
        }

        // 更新移动历史
        setMoveHistory((prev) => [
          ...prev,
          {
            from: aiMove.from,
            to: aiMove.to,
            piece: piece,
            capturedPiece: capturedPiece || null,
            number: prev.length + 1,
          },
        ]);

        // 检查将军状态
        const nextPlayer = currentPlayer === 'red' ? 'black' : 'red';
        const checkStatus = isInCheck(newBoard, nextPlayer);

        if (checkStatus.inCheck) {
          // 设置将军特效
          setIsCheck(true);
          setCheckEffectVisible(true);
          setCheckPosition(findGeneral(newBoard, nextPlayer));

          // 检查是否将死
          if (isCheckmate(newBoard, nextPlayer)) {
            setWinInfo({
              winner: currentPlayer,
              reason: 'checkmate',
            });
            setIsThinking(false);
            return;
          }

          // 延迟关闭将军特效
          setTimeout(() => {
            setCheckEffectVisible(false);
          }, 2000);
        } else {
          setIsCheck(false);
          setCheckPosition(null);
        }

        // 切换到玩家回合
        setCurrentPlayer(nextPlayer);
        setIsThinking(false);
      } catch (error) {
        console.error('AI move error:', error);
        setIsThinking(false);
      }
    };

    if (gameMode === 'single' && gameStarted && currentPlayer !== playerColor && !winInfo) {
      setIsThinking(true);
      timer = setTimeout(makeAIMove, 800);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [gameMode, gameStarted, currentPlayer, board, winInfo, playerColor, gameType]);

  // 开始游戏
  const startGame = (color: Player) => {
    // 重置所有游戏状态
    setPlayerColor(color);
    setGameStarted(true);
    setIsThinking(false);
    setBoard(createInitialBoard(gameType));
    setCurrentPlayer('red'); // 红方先行
    setWinInfo(null);
    setMoveHistory([]);
    setLastMove(null);
    setCheckPosition(null);
    setSelectedPosition(null);
    setValidMoves([]);
    setIsCheck(false);
    setCheckEffectVisible(false);
    setCapturedPieceEffect(null);
    setChatMessages([]);
    setChatInputValue('');
    setRoomId('');

    const initialBoard = createInitialBoard(gameType);

    // 如果玩家选择黑方，AI先行（仅在单机模式下）
    if (color === 'black' && gameMode === 'single') {
      setIsThinking(true);
      setTimeout(() => {
        try {
          const aiMove = getAIMove(initialBoard, 'red');
          if (aiMove) {
            const newBoard = makeMove(initialBoard, aiMove.from, aiMove.to, gameType);
            setBoard(newBoard);
            setLastMove({ from: aiMove.from, to: aiMove.to });
            const piece = initialBoard[aiMove.from.row][aiMove.from.col];
            if (piece) {
              setMoveHistory([
                {
                  from: aiMove.from,
                  to: aiMove.to,
                  piece: piece,
                  capturedPiece: initialBoard[aiMove.to.row][aiMove.to.col] || null,
                  number: 1,
                },
              ]);
            }
            setCurrentPlayer('black'); // 切换到黑方（玩家）回合
          }
        } catch (error) {
          console.error('AI move error:', error);
        } finally {
          setIsThinking(false);
        }
      }, 500);
    }
  };

  // 优化游戏模式切换逻辑
  const switchToOnlineMode = () => {
    // 确保没有活跃的游戏
    if (gameMode === 'online' && gameStarted) {
      messageApi.warning('已有进行中的对局，请先结束当前游戏');
      return;
    }

    // 重置棋盘和游戏状态
    setBoard(createInitialBoard());
    setCurrentPlayer('red'); // 默认红方先行
    setWinInfo(null);
    setMoveHistory([]);
    setLastMove(null);
    setCheckPosition(null);
    setSelectedPosition(null);
    setValidMoves([]);
    setChatMessages([]);

    // 切换到联机模式
    setGameMode('online');
    setGameStarted(false);
    setOnlineStatus('connecting');

    // 清除房间相关标记
    setRoomId('');
    localStorage.removeItem('chess_is_joiner');

    messageApi.info('已切换到联机模式，请创建或加入房间');
  };

  // 优化恢复游戏状态逻辑
  const restoreOnlineGameState = useCallback((savedState: any) => {
    if (!savedState || savedState.mode !== 'online' || !savedState.roomId) {
      return false;
    }

    try {
      console.log('恢复之前的游戏状态', savedState);

      // 恢复基本游戏状态
      setGameMode('online');
      setRoomId(savedState.roomId);
      setOnlineStatus(savedState.onlineStatus || 'waiting');
      setPlayerColor(savedState.playerColor || 'red');
      setOpponentColor(savedState.opponentColor || 'black');
      setOpponentUserId(savedState.opponentUserId || '');
      setOpponentInfo(savedState.opponentInfo || null);

      // 恢复棋盘和游戏状态
      if (savedState.board) setBoard(savedState.board);
      if (savedState.moveHistory) setMoveHistory(savedState.moveHistory);
      if (savedState.lastMove) setLastMove(savedState.lastMove);
      if (savedState.currentPlayer) setCurrentPlayer(savedState.currentPlayer);
      if (savedState.checkPosition) setCheckPosition(savedState.checkPosition);
      if (savedState.isCheck !== undefined) setIsCheck(savedState.isCheck);

      // 设置游戏已开始
      setGameStarted(true);

      return true;
    } catch (error) {
      console.error('恢复游戏状态失败:', error);
      return false;
    }
  }, []);

  // 添加键盘事件处理器
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  // 格式化移动记录
  const formatMove = (move: Move) => {
    if (!move.piece) return '';

    const pieceName = PIECE_NAMES[move.piece.player][move.piece.type];
    // 中国象棋的坐标表示为"列行"
    const fromCol = move.from.col + 1; // 列号从1开始
    const fromRow = move.from.row + 1; // 行号从1开始
    const toCol = move.to.col + 1;
    const toRow = move.to.row + 1;

    // 将数字转为中文数字（传统记谱法）- 只用于红方
    const numberToChinese = (num: number): string => {
      const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
      return chineseNumbers[num - 1] || String(num);
    };

    // 根据棋子移动方式格式化
    let moveDesc;

    // 红方和黑方采用不同的记谱方式
    if (move.piece.player === 'red') {
      // 红方从右到左记为"一"到"九"，所以要反转坐标
      const redFromCol = 10 - fromCol;
      const redToCol = 10 - toCol;

      if (fromCol === toCol) {
        // 上下移动
        const direction = toRow > fromRow ? '进' : '退';
        const steps = Math.abs(toRow - fromRow);
        moveDesc = `${numberToChinese(redFromCol)}${direction}${numberToChinese(steps)}`;
      } else if (fromRow === toRow) {
        // 左右移动
        moveDesc = `${numberToChinese(redFromCol)}平${numberToChinese(redToCol)}`;
      } else {
        // 斜向移动（马、象、士）
        moveDesc = `${numberToChinese(redFromCol)}${toRow > fromRow ? '进' : '退'}${numberToChinese(
          redToCol,
        )}`;
      }
    } else {
      // 黑方从左到右记为数字"1"到"9"
      if (fromCol === toCol) {
        // 上下移动
        const direction = toRow > fromRow ? '进' : '退';
        const steps = Math.abs(toRow - fromRow);
        moveDesc = `${fromCol}${direction}${steps}`;
      } else if (fromRow === toRow) {
        // 左右移动
        moveDesc = `${fromCol}平${toCol}`;
      } else {
        // 斜向移动（马、象、士）
        moveDesc = `${fromCol}${toRow > fromRow ? '进' : '退'}${toCol}`;
      }
    }

    return `${move.number}. ${pieceName}${moveDesc}`;
  };

  // 添加悔棋函数
  const undoMove = () => {
    if (
      (gameMode === 'single' && moveHistory.length < 2) ||
      (gameMode === 'self' && moveHistory.length < 1) ||
      isThinking ||
      winInfo
    )
      return;

    // 确定要回退的步数
    const stepsToUndo = gameMode === 'single' ? 2 : 1;

    // 移除最后的步数（单人模式下是玩家和AI的走棋，自我对弈模式下只移除一步）
    const newMoveHistory = moveHistory.slice(0, -stepsToUndo);
    setMoveHistory(newMoveHistory);

    // 重建棋盘
    const newBoard = createInitialBoard(gameType);
    newMoveHistory.forEach((move) => {
      newBoard[move.to.row][move.to.col] = move.piece;
      newBoard[move.from.row][move.from.col] = null;
    });

    setBoard(newBoard);

    // 在单人模式下，始终回到玩家回合；在自我对弈模式下，切换到上一步的对手
    if (gameMode === 'single') {
      setCurrentPlayer(playerColor);
    } else {
      // 在自我对弈模式下，切换到上一步的对手
      setCurrentPlayer(currentPlayer === 'red' ? 'black' : 'red');
    }

    setLastMove(
      newMoveHistory.length > 0
        ? {
            from: newMoveHistory[newMoveHistory.length - 1].from,
            to: newMoveHistory[newMoveHistory.length - 1].to,
          }
        : null,
    );

    // 重新检查将军状态
    const checkStatus = isInCheck(newBoard, currentPlayer);
    if (checkStatus.inCheck) {
      const generalPosition = findGeneral(newBoard, currentPlayer);
      setCheckPosition(generalPosition);
    } else {
      setCheckPosition(null);
    }

    // 清除特效
    setIsCheck(false);
    setCheckEffectVisible(false);
    setCapturedPieceEffect(null);
  };

  // 添加联机时创建房间的函数
  const handleCreateOrJoinRoom = () => {
    if (!currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    // 设置状态为连接中
    setOnlineStatus('connecting');
    
    // 记录当前选择的游戏类型，确保后续使用正确的类型
    const currentGameType = gameType;
    console.log(`准备创建/加入房间，当前游戏类型: ${currentGameType}`);

    // 重置同步状态
    hasSynchronized.current = false;
    hasSyncRequestSent.current = false;

    // 初始化WebSocket并连接
    initWebSocket(() => {
      if (roomId) {
        // 有房间ID则加入房间
        joinExistingRoom();
      } else {
        // 没有房间ID则创建新房间
        // 确保使用之前记录的游戏类型
        if (gameType !== currentGameType) {
          console.log(`游戏类型发生变化，从 ${gameType} 恢复为 ${currentGameType}`);
          setGameType(currentGameType);
        }
        createNewRoom();
      }
    });
  };

  // 加入现有房间
  const joinExistingRoom = () => {
    // 发送加入请求
    sendJoinRoomRequest(roomId);
  };

  // 创建新房间
  const createNewRoom = () => {
    // 清除加入者标记
    localStorage.removeItem('chess_is_joiner');

    // 创建新房间，房主固定为红方(先手)
    setPlayerColor('red');
    setOpponentColor('black');

    console.log(`正在创建房间，你将执红先手，游戏类型: ${gameType}`);

    // 发送创建房间请求
    sendCreateRoomRequest();
  };

  // 切换颜色重新开始游戏
  const switchColor = () => {
    const newColor: Player = playerColor === 'red' ? 'black' : 'red';

    // 重置所有游戏状态
    setPlayerColor(newColor);
    setIsThinking(false);
    setBoard(createInitialBoard(gameType));
    setCurrentPlayer('red'); // 红方先行
    setWinInfo(null);
    setMoveHistory([]);
    setLastMove(null);
    setCheckPosition(null);
    setSelectedPosition(null);
    setValidMoves([]);
    setIsCheck(false);
    setCheckEffectVisible(false);
    setCapturedPieceEffect(null);
    setShowRestartModal(false);

    const initialBoard = createInitialBoard(gameType);

    // 如果玩家选择黑方，AI先行
    if (newColor === 'black' && gameMode === 'single') {
      setIsThinking(true);
      setTimeout(() => {
        try {
          const aiMove = getAIMove(initialBoard, 'red');
          if (aiMove) {
            const newBoard = makeMove(initialBoard, aiMove.from, aiMove.to, gameType);
            setBoard(newBoard);
            setLastMove({ from: aiMove.from, to: aiMove.to });
            const piece = initialBoard[aiMove.from.row][aiMove.from.col];
            if (piece) {
              setMoveHistory([
                {
                  from: aiMove.from,
                  to: aiMove.to,
                  piece: piece,
                  capturedPiece: initialBoard[aiMove.to.row][aiMove.to.col] || null,
                  number: 1,
                },
              ]);
            }
            setCurrentPlayer('black'); // 切换到黑方（玩家）回合
          }
        } catch (error) {
          console.error('AI move error:', error);
        } finally {
          setIsThinking(false);
        }
      }, 500);
    }
  };

  // 保持同样的颜色重新开始
  const continueWithSameColor = () => {
    // 重置所有游戏状态
    setIsThinking(false);
    setBoard(createInitialBoard(gameType));
    setCurrentPlayer('red'); // 红方先行
    setWinInfo(null);
    setMoveHistory([]);
    setLastMove(null);
    setCheckPosition(null);
    setSelectedPosition(null);
    setValidMoves([]);
    setIsCheck(false);
    setCheckEffectVisible(false);
    setCapturedPieceEffect(null);
    setShowRestartModal(false);

    const initialBoard = createInitialBoard(gameType);

    // 如果玩家选择黑方，AI先行
    if (playerColor === 'black' && gameMode === 'single') {
      setIsThinking(true);
      setTimeout(() => {
        try {
          const aiMove = getAIMove(initialBoard, 'red');
          if (aiMove) {
            const newBoard = makeMove(initialBoard, aiMove.from, aiMove.to, gameType);
            setBoard(newBoard);
            setLastMove({ from: aiMove.from, to: aiMove.to });
            const piece = initialBoard[aiMove.from.row][aiMove.from.col];
            if (piece) {
              setMoveHistory([
                {
                  from: aiMove.from,
                  to: aiMove.to,
                  piece: piece,
                  capturedPiece: initialBoard[aiMove.to.row][aiMove.to.col] || null,
                  number: 1,
                },
              ]);
            }
            setCurrentPlayer('black'); // 切换到黑方（玩家）回合
          }
        } catch (error) {
          console.error('AI move error:', error);
        } finally {
          setIsThinking(false);
        }
      }, 500);
    }
  };

  // 修改游戏开始前的UI
  if (!gameStarted) {
    // 添加调试日志，帮助排查问题
    console.log(
      '当前状态: gameMode=',
      gameMode,
      ', gameStarted=',
      gameStarted,
      ', onlineStatus=',
      onlineStatus,
    );

    return (
      <div className="min-h-screen bg-gradient-to-br to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-2xl shadow-xl max-w-lg w-full text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            中国象棋
          </h1>
          <p className="text-gray-600 mb-12">千年传统文化，智慧的对决</p>
          <div className="mb-8">
            <h2 className="text-xl font-medium mb-4">选择游戏模式</h2>
            <div className="flex gap-4 justify-center">
              <button
                type={'button'}
                className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"
                onClick={() => setGameMode('single')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    style={{
                      backgroundColor: gameMode === 'single' ? 'rgba(172,229,178,0.95)' : 'white',
                      color: 'white',
                    }}
                    className="w-5 h-5 rounded-full border-2 border-gray-800"
                  ></div>
                  <span className="font-medium text-gray-800">单人 VS AI</span>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-600">本地对弈</span>
              </button>

              <button
                type={'button'}
                onClick={() => setGameMode('self')}
                className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    style={{
                      backgroundColor: gameMode === 'self' ? 'rgba(172,229,178,0.95)' : 'white',
                      color: 'white',
                    }}
                    className="w-5 h-5 rounded-full border-2 border-gray-800"
                  ></div>
                  <span className="font-medium text-gray-800">自我对弈</span>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-600">本地对弈</span>
              </button>

              <button
                type={'button'}
                onClick={switchToOnlineMode}
                className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    style={{
                      backgroundColor: gameMode === 'online' ? 'rgba(172,229,178,0.95)' : 'white',
                      color: 'white',
                    }}
                    className="w-5 h-5 rounded-full border-2 border-gray-800"
                  ></div>
                  <span className="font-medium text-gray-800">联机对战</span>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-600">在线对弈</span>
              </button>
            </div>
          </div>
          {contextHolder}
          {/* 联机模式下的额外UI */}
          {gameMode === 'online' && (
            <div className="mb-8">
              <h2 className="text-xl font-medium mb-4">选择游戏类型</h2>
              <div className="flex gap-4 justify-center">
                <button
                  type={'button'}
                  className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"
                  onClick={() => setGameType('normal')}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      style={{
                        backgroundColor: gameType === 'normal' ? 'rgba(172,229,178,0.95)' : 'white',
                        color: 'white',
                      }}
                      className="w-5 h-5 rounded-full border-2 border-gray-800"
                    ></div>
                    <span className="font-medium text-gray-800">普通模式</span>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-600">传统玩法</span>
                </button>
                <button
                  type={'button'}
                  className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"
                  onClick={() => setGameType('hidden')}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      style={{
                        backgroundColor: gameType === 'hidden' ? 'rgba(172,229,178,0.95)' : 'white',
                        color: 'white',
                      }}
                      className="w-5 h-5 rounded-full border-2 border-gray-800"
                    ></div>
                    <span className="font-medium text-gray-800">揭棋模式</span>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-600">暗棋玩法</span>
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                {gameType === 'normal' ? (
                  <p>传统中国象棋玩法，双方轮流移动棋子。</p>
                ) : (
                  <p>揭棋模式：所有棋子初始为暗棋，移动时翻开，按规则移动。</p>
                )}
              </div>
              <div className="mt-6">
                <Input
                  type="text"
                  placeholder="输入房间号（留空创建新房间）"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="border p-2 rounded-lg mb-4 w-full"
                />
                <Button onClick={handleCreateOrJoinRoom} type="primary" className="w-full">
                  {roomId ? '加入房间' : '创建房间'}
                </Button>
              </div>
            </div>
          )}

          {(gameMode === 'single' || gameMode === 'self') && (
            <div className="mb-8">
              <h2 className="text-xl font-medium mb-4">选择游戏类型</h2>
              <div className="flex gap-4 justify-center">
                <button
                  type={'button'}
                  className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"
                  onClick={() => setGameType('normal')}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      style={{
                        backgroundColor: gameType === 'normal' ? 'rgba(172,229,178,0.95)' : 'white',
                        color: 'white',
                      }}
                      className="w-5 h-5 rounded-full border-2 border-gray-800"
                    ></div>
                    <span className="font-medium text-gray-800">普通模式</span>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-600">传统玩法</span>
                </button>
                <button
                  type={'button'}
                  className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"
                  onClick={() => setGameType('hidden')}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      style={{
                        backgroundColor: gameType === 'hidden' ? 'rgba(172,229,178,0.95)' : 'white',
                        color: 'white',
                      }}
                      className="w-5 h-5 rounded-full border-2 border-gray-800"
                    ></div>
                    <span className="font-medium text-gray-800">揭棋模式</span>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-600">暗棋玩法</span>
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                {gameType === 'normal' ? (
                  <p>传统中国象棋玩法，双方轮流移动棋子。</p>
                ) : (
                  <p>揭棋模式：所有棋子初始为暗棋，移动时翻开，按规则移动。</p>
                )}
              </div>
            </div>
          )}

          {(gameMode === 'single' || gameMode === 'self') && (
            <div>
              <h2 className="text-xl font-medium mb-8 text-gray-800">选择您的执子颜色</h2>
              <div className="flex gap-6 justify-center mb-6">
                <button
                  type={'button'}
                  onClick={() => {
                    setSelectedColor('red');
                    startGame('red');
                  }}
                  style={{ backgroundColor: '#c12c1f' }}
                  className="group px-8 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-gray-700"
                      style={{ backgroundColor: '#c12c1f', borderColor: '#dd7694' }}
                    ></div>
                    <span className="font-medium">执红先手</span>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-300">
                    First Move
                  </span>
                </button>
                <button
                  type={'button'}
                  onClick={() => {
                    setSelectedColor('black');
                    startGame('black');
                  }}
                  className="group px-8 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-5 h-5 rounded-full bg-black border-2 border-gray-700"></div>
                    <span className="font-medium">执黑后手</span>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-600">
                    Second Move
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 添加一个切换棋盘方向的函数
  const toggleBoardDirection = () => {
    setForceBoardFlip(!forceBoardFlip);
  };

  return (
    <div className="min-h-screen bg-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-xl p-4">
              {gameMode === 'online' && (
                <div className="mb-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          onlineStatus === 'playing' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                      />
                      <span className="text-sm text-purple-800">
                        {onlineStatus === 'connecting' && '连接中...'}
                        {onlineStatus === 'waiting' && `等待对手加入 (房间号🏠: ${roomId})`}
                        {onlineStatus === 'playing' &&
                          `对战中 - 你执${playerColor === 'red' ? '红先手' : '黑后手'}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* 添加发送邀请按钮 */}
                      {onlineStatus === 'waiting' && (
                        <Button
                          type="primary"
                          size="small"
                          onClick={handleSendInvitation}
                          disabled={hasSentInvitation}
                          className="bg-purple-500 hover:bg-purple-600"
                        >
                          {hasSentInvitation ? `冷却中 (${invitationCooldown}s)` : '发送邀请'}
                        </Button>
                      )}
                      {/* 对手信息 */}
                      {(onlineStatus === 'playing' || onlineStatus === 'waiting') && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img
                              src={
                                opponentInfo?.avatar ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${
                                  opponentUserId || 'opponent'
                                }`
                              }
                              alt="对手头像"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-800">
                              {onlineStatus === 'waiting'
                                ? '等待对手...'
                                : opponentInfo?.name ||
                                  (opponentUserId
                                    ? `对手 ${opponentUserId.slice(-4)}`
                                    : '等待对手...')}
                            </div>
                            <div
                              className="text-xs font-medium"
                              style={{ color: opponentColor === 'red' ? '#dc2626' : '#000000' }}
                            >
                              执{opponentColor === 'red' ? '红先手' : '黑后手'}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* 分隔线 */}
                      {(onlineStatus === 'playing' || onlineStatus === 'waiting') && (
                        <div className="w-px h-8 bg-gray-200"></div>
                      )}
                      {/* 玩家信息 */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-800">
                            {currentUser?.userName || '游客'}
                          </div>
                          <div
                            className="text-xs font-medium"
                            style={{ color: playerColor === 'red' ? '#dc2626' : '#000000' }}
                          >
                            执{playerColor === 'red' ? '红先手' : '黑后手'}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <img
                            src={
                              currentUser?.userAvatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${
                                currentUser?.id || 'visitor'
                              }`
                            }
                            alt="玩家头像"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {contextHolder}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    setGameStarted(false);
                    setGameMode('single');
                    setBoard(createInitialBoard());
                    setCurrentPlayer('red');
                    setWinInfo(null);
                    setMoveHistory([]);
                    setLastMove(null);
                    setCheckPosition(null);
                    setChatMessages([]);
                    setChatInputValue('');
                    setRoomId('');
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">返回</span>
                </button>
                {gameMode === 'single' && (
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">中国象棋</h1>
                    <div className="mt-1 flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isThinking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-600">
                        {isThinking ? 'AI 思考中...' : '等待落子'}
                      </span>
                    </div>
                  </div>
                )}
                {gameMode === 'self' && (
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">中国象棋</h1>
                    <div className="mt-1 flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          currentPlayer === 'red' ? 'bg-red-500' : 'bg-black'
                        }`}
                      />
                      <span className="text-sm text-gray-600">
                        {currentPlayer === 'red' ? '红方回合' : '黑方回合'}
                      </span>
                    </div>
                  </div>
                )}
                {(gameMode === 'single' || gameMode === 'self') && (
                  <div className="flex gap-3">
                    {gameType !== 'hidden' && (
                      <button
                        type={'button'}
                        onClick={undoMove}
                        disabled={moveHistory.length < 1 || isThinking || !!winInfo}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          moveHistory.length < 1 || isThinking || winInfo
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                        } transition-colors`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-medium">悔棋</span>
                      </button>
                    )}
                    <button
                      type={'button'}
                      onClick={() => setShowRestartModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="font-medium">重新开始</span>
                    </button>
                  </div>
                )}
              </div>

              {winInfo && (
                <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-center gap-3">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                  <span className="text-lg font-medium text-yellow-800">
                    {gameMode === 'self'
                      ? `${winInfo.winner === 'red' ? '红方' : '黑方'}获胜！`
                      : winInfo.winner === playerColor
                      ? '恭喜你赢了！'
                      : gameMode === 'online'
                      ? '对手小胜，再接再厉'
                      : 'AI 赢了，再接再厉！'}
                  </span>
                </div>
              )}

              {!winInfo && (
                <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full ${
                        currentPlayer === playerColor || gameMode === 'self' ? 'animate-pulse' : ''
                      }`}
                      style={{
                        backgroundColor: currentPlayer === 'red' ? '#dc2626' : '#000000',
                        boxShadow:
                          currentPlayer === playerColor || gameMode === 'self'
                            ? '0 0 8px 3px rgba(59, 130, 246, 0.5)'
                            : 'none',
                      }}
                    />
                    <div>
                      <div
                        className={`font-medium text-gray-900 flex items-center gap-2 ${
                          currentPlayer === playerColor || gameMode === 'self'
                            ? 'text-blue-600'
                            : ''
                        }`}
                      >
                        {currentPlayer === playerColor || gameMode === 'self' ? (
                          <>
                            <span className="relative flex h-3 w-3 mr-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                            </span>
                            <span>
                              {gameMode === 'self'
                                ? `${currentPlayer === 'red' ? '红方' : '黑方'}回合`
                                : '你的回合'}
                            </span>
                            {isInCheck(board, currentPlayer).inCheck && (
                              <span className="text-red-500 text-xs ml-2">
                                （
                                {gameMode === 'self'
                                  ? `${currentPlayer === 'red' ? '红方' : '黑方'}`
                                  : '你'}
                                正在被将军！）
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-gray-500">
                              {gameMode === 'online' ? '对手回合' : 'AI回合'}
                            </span>
                            {lastMove && (
                              <span className="text-xs text-gray-500 italic ml-1">
                                {gameMode === 'online' ? '等待对方落子...' : 'AI思考中...'}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center">⏱️</span>
                      <span>回合 {moveHistory.length + 1}</span>
                    </div>
                    {gameMode === 'single' && (
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center">🧠</span>
                        <span>AI 难度: 小学生</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center w-full">
                <div className="flex justify-center w-full">
                  <ChessBoard
                    board={board}
                    onPieceSelect={handlePieceSelect}
                    onMoveSelect={handleMoveSelect}
                    selectedPosition={selectedPosition}
                    validMoves={validMoves}
                    lastMove={lastMove}
                    checkPosition={checkPosition}
                    disabled={
                      gameMode === 'self'
                        ? !!winInfo
                        : isThinking || currentPlayer !== playerColor || !!winInfo
                    }
                    isFlipped={playerColor === 'black' ? !forceBoardFlip : forceBoardFlip} // 根据玩家颜色和手动翻转设置决定是否翻转棋盘
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleBoardDirection}
                  className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9 16H15V10H21L12 2L3 10H9V16Z" fill="currentColor" />
                    <path
                      d="M15 8H9V14H3L12 22L21 14H15V8Z"
                      fill="currentColor"
                      fillOpacity="0.3"
                    />
                  </svg>
                  <span className="font-medium">切换棋盘方向</span>
                </button>
              </div>

              {/* 吃子特效 */}
              {capturedPieceEffect && capturedPieceEffect.eatingPiece && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-center">
                  <div className="animate-capture">
                    <span
                      className="text-4xl font-bold"
                      style={{
                        color: capturedPieceEffect.player === 'red' ? '#dc2626' : '#000000',
                        textShadow:
                          '0 0 15px rgba(255, 255, 255, 0.8), 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 165, 0, 0.6)',
                      }}
                    >
                      {
                        PIECE_NAMES[capturedPieceEffect.player][
                          capturedPieceEffect.eatingPiece.type
                        ]
                      }
                      吃
                      {
                        PIECE_NAMES[capturedPieceEffect.piece.player][
                          capturedPieceEffect.piece.type
                        ]
                      }
                      ！
                    </span>
                  </div>
                </div>
              )}

              {/* 将军特效 - 添加中央显示 */}
              {isCheck && checkEffectVisible && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-center">
                  <div className="animate-check-text">
                    <span
                      className="text-4xl font-bold"
                      style={{
                        color: currentPlayer === playerColor ? '#000000' : '#dc2626',
                        textShadow:
                          '0 0 15px rgba(255, 255, 255, 0.8), 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 0, 0, 0.6)',
                      }}
                    >
                      将军！
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧面板：对战记录和聊天窗口 */}
          {(gameMode === 'online' || gameMode === 'single') && (
            <div className="lg:w-96 w-full flex items-center">
              <div
                className="bg-white rounded-2xl shadow-xl p-6 flex flex-col w-full"
                style={{ height: 'min(calc(100vh - 6rem), 800px)' }}
              >
                {/* Tab 切换按钮 - 仅在联机模式下显示 */}
                {gameMode === 'online' && (
                  <div className="flex border-b mb-6">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`flex-1 py-3 px-4 text-center font-medium transition-all duration-200 ${
                        activeTab === 'chat'
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>聊天室</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex-1 py-3 px-4 text-center font-medium transition-all duration-200 ${
                        activeTab === 'history'
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Timer className="w-4 h-4" />
                        <span>对战记录</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* 聊天窗口 - 仅在联机模式下显示 */}
                {gameMode === 'online' && activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div
                      className="h-[500px] overflow-y-auto mb-4 space-y-4 px-2"
                      style={{ height: '500px' }}
                    >
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            currentUser?.id && String(msg.sender.id) === String(currentUser.id)
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[85%] ${
                              currentUser?.id && String(msg.sender.id) === String(currentUser.id)
                                ? 'order-2'
                                : 'order-1'
                            }`}
                          >
                            <div
                              className={`flex items-center gap-2 mb-1.5 ${
                                currentUser?.id && String(msg.sender.id) === String(currentUser.id)
                                  ? 'justify-end'
                                  : 'justify-start'
                              }`}
                            >
                              <span className="text-sm text-gray-800 font-medium">
                                {msg.sender.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-2.5 ${
                                currentUser?.id && String(msg.sender.id) === String(currentUser.id)
                                  ? 'bg-blue-50 text-gray-800 rounded-br-none border border-blue-100'
                                  : 'bg-gray-50 text-gray-800 rounded-bl-none border border-gray-100'
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="flex gap-3 mt-auto pt-4 pb-4 border-t">
                      <Input.TextArea
                        value={chatInputValue}
                        onChange={(e) => setChatInputValue(e.target.value)}
                        onKeyDown={handleChatKeyDown}
                        placeholder="输入消息..."
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        className="flex-1"
                      />
                      <Button type="primary" onClick={handleChatSend} className="px-6">
                        发送
                      </Button>
                    </div>
                  </div>
                )}

                {/* 对战记录 - 在所有模式下显示 */}
                {(gameMode === 'single' || (gameMode === 'online' && activeTab === 'history')) && (
                  <div className="flex-1 overflow-y-auto">
                    {moveHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                          <Timer className="w-8 h-8" />
                        </div>
                        <p>暂无落子</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {moveHistory.map((move, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              index === moveHistory.length - 1
                                ? 'bg-blue-50 border border-blue-100 shadow-sm'
                                : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-5 h-5 rounded-full"
                                style={{
                                  backgroundColor:
                                    move.piece?.player === 'red' ? '#dc2626' : '#000000',
                                }}
                              />
                              <span className="font-medium text-gray-800">{formatMove(move)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restart Modal */}
      {showRestartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">重新开始</h3>
              {/* eslint-disable-next-line react/button-has-type */}
              <button
                onClick={() => setShowRestartModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">请选择重新开始的方式：</p>
            <div className="space-y-3">
              <button
                type={'button'}
                onClick={continueWithSameColor}
                className={`w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 ${
                  playerColor === 'red'
                    ? 'ring-2 ring-gray-400'
                    : playerColor === 'black'
                    ? 'ring-2 ring-gray-600'
                    : ''
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: playerColor === 'red' ? '#dc2626' : '#000000' }}
                ></div>
                <span className="font-medium">
                  继续{playerColor === 'red' ? '执红先手' : '执黑后手'}
                </span>
              </button>
              <button
                type={'button'}
                onClick={switchColor}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: playerColor === 'red' ? '#000000' : '#dc2626' }}
                ></div>
                <span className="font-medium text-gray-800">
                  改为{playerColor === 'red' ? '执黑后手' : '执红先手'}
                </span>
              </button>
              {gameMode === 'single' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 mb-3">
                  <p>在此版本中您可以自由走棋，即使会被将军。AI仍会遵循标准规则不会自杀。</p>
                </div>
              )}
              <button
                type={'button'}
                onClick={() => setShowRestartModal(false)}
                className="w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 游戏结束弹框 */}
      {showGameEndModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">游戏结束</h3>
              {/* eslint-disable-next-line react/button-has-type */}
              <button
                onClick={() => setShowGameEndModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-3 mb-6">
              <Trophy className="w-8 h-8 text-yellow-600" />
              <span className="text-lg font-medium text-gray-800">
                {winInfo?.winner === playerColor ? '恭喜你赢了！' : '对手小胜，再接再厉'}
              </span>
            </div>
            <div className="space-y-3">
              <button
                type={'button'}
                onClick={handleExitRoom}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <span className="font-medium text-gray-800">退出房间</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
