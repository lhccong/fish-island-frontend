import React, {useState, useCallback, useEffect, useRef} from 'react';
import {Board as BoardComponent} from '@/components/Game/Board';
import {Board, Player, Position, Move, COLUMNS, ROWS, WinningLine} from '@/game';
import {createEmptyBoard, checkWin, getAIMove} from '@/utils/gameLogic';
import {Trophy, RotateCcw, ArrowLeft, ChevronDown, Brain, Timer, X, MessageSquare} from 'lucide-react';
import "./index.css"
import {Button, Input, message, Modal} from "antd";
import {BACKEND_HOST_WS} from "@/constants";
import {useModel} from "@@/exports";
import styles from './index.less';
import { wsService } from '@/services/websocket';

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

function App() {
  // 新增类型定义
  type GameMode = 'single' | 'online';
  type OnlineStatus = 'connecting' | 'waiting' | 'playing';
  // 在App组件中新增状态
  const {initialState, setInitialState} = useModel('@@initialState');
  const {currentUser} = initialState || {};
  const [gameMode, setGameMode] = useState<GameMode>(initialState?.gameState?.mode || 'single');
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>(initialState?.gameState?.onlineStatus || 'connecting');
  const [roomId, setRoomId] = useState<string>(initialState?.gameState?.roomId || '');
  const [opponentColor, setOpponentColor] = useState<Player>(initialState?.gameState?.opponentColor || 'white');
  const [opponentUserId, setOpponentUserId] = useState<string>(initialState?.gameState?.opponentUserId || '');
  const [opponentInfo, setOpponentInfo] = useState<{
    id: string;
    name: string;
    avatar: string;
    level: number;
  } | null>(initialState?.gameState?.opponentInfo || null);
  const [playerColor, setPlayerColor] = useState<Player>(initialState?.gameState?.playerColor || 'black');
  const [gameStarted, setGameStarted] = useState<boolean>(initialState?.gameState?.gameStarted || false);
  const [messageApi, contextHolder] = message.useMessage();
  //原有单机模式
  const [currentPlayer, setCurrentPlayer] = useState<Player>('black');
  const [winner, setWinner] = useState<Player | null>(initialState?.gameState?.winner || null);
  const [isThinking, setIsThinking] = useState(false);
  const [moves, setMoves] = useState<Move[]>(initialState?.gameState?.moves || []);
  const [lastMove, setLastMove] = useState<Position | null>(initialState?.gameState?.lastMove || null);
  const [opponentLastMove, setOpponentLastMove] = useState<Position | null>(initialState?.gameState?.opponentLastMove || null);
  const [winningLine, setWinningLine] = useState<WinningLine | null>(initialState?.gameState?.winningLine || null);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [joinStatus, setJoinStatus] = useState(localStorage.getItem('piece_join_status') || "old");
  const [board, setBoard] = useState<Board>(joinStatus === "old" ? initialState?.gameState?.board || createEmptyBoard() : createEmptyBoard());
  // 添加游戏结束弹框状态
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  // 添加超时提示相关状态
  const [opponentTimeout, setOpponentTimeout] = useState<boolean>(false);
  const [playerTimeout, setPlayerTimeout] = useState<boolean>(false);
  const [opponentTimeoutModalVisible, setOpponentTimeoutModalVisible] = useState<boolean>(false);
  const [playerTimeoutModalVisible, setPlayerTimeoutModalVisible] = useState<boolean>(false);
  const [opponentLastMoveTime, setOpponentLastMoveTime] = useState<number>(Date.now());
  const [playerLastMoveTime, setPlayerLastMoveTime] = useState<number>(Date.now());
  const opponentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const TIMEOUT_DURATION = 30000; // 30秒超时

  // 添加聊天相关的状态
  const [showChat, setShowChat] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [hasSentInvitation, setHasSentInvitation] = useState(false);
  const [invitationCooldown, setInvitationCooldown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 添加从路由获取房间号的逻辑
  useEffect(() => {
    const location = window.location;
    const searchParams = new URLSearchParams(location.search);
    const roomIdFromUrl = searchParams.get('roomId');
    const modeFromUrl = searchParams.get('mode');

    if (roomIdFromUrl) {
      setRoomId(roomIdFromUrl);
      setGameMode('online');
      // 发送加入房间请求
      wsService.send({
        type: 2,
        userId: -1,
        data: {
          type: 'joinRoom',
          content: roomIdFromUrl
        }
      });
    }

    if (modeFromUrl) {
      setGameMode(modeFromUrl as GameMode);
    }
  }, []);

  // 添加保存游戏状态的函数
  const saveGameState = useCallback(() => {
    if (gameMode === 'online') {
      setInitialState((s) => ({
        ...s,
        gameState: {
          mode: gameMode,
          onlineStatus,
          roomId,
          opponentColor,
          opponentUserId,
          opponentInfo,
          playerColor,
          gameStarted,
          board,
          moves,
          lastMove,
          opponentLastMove,
          winningLine,
          winner,
        },
      }));
    }
  }, [gameMode, onlineStatus, roomId, opponentColor, opponentUserId, opponentInfo, playerColor, gameStarted, board, moves, lastMove, opponentLastMove, winningLine, winner, setInitialState]);

  // 在组件卸载时保存状态
  useEffect(() => {
    return () => {
      saveGameState();
    };
  }, [saveGameState]);

  // start 原有单机
  const addMove = (position: Position, player: Player) => {
    setMoves(prev => [...prev, {
      ...position,
      player,
      number: prev.length + 1
    }]);
  };

  // 处理远程对手的移动
  const handleRemoteMove = (position: Position, player: any) => {
    const newBoard = [...board];
    setOpponentColor(player);
    newBoard[position.row][position.col] = player;
    setBoard(newBoard);
    addMove(position, player);
    setOpponentLastMove(position);
    // 重置对手超时状态
    setOpponentTimeout(false);
    setOpponentLastMoveTime(Date.now());
    // 清除对手超时计时器
    if (opponentTimeoutRef.current) {
      clearTimeout(opponentTimeoutRef.current);
      opponentTimeoutRef.current = null;
    }

    // 检查胜利
    const winResult = checkWin(newBoard, position, player);
    if (winResult) {
      setWinner(player);
      setWinningLine(winResult);
      // 游戏结束时显示弹框
      if (gameMode === 'online') {
        setShowGameEndModal(true);
      }
    } else {
      setPlayerColor(player === 'black' ? 'white' : 'black')
      setCurrentPlayer(player === 'black' ? 'white' : 'black'); // 切换回本地玩家回合
      // 设置玩家超时计时器
      setPlayerLastMoveTime(Date.now());
      if (playerTimeoutRef.current) {
        clearTimeout(playerTimeoutRef.current);
      }
      playerTimeoutRef.current = setTimeout(() => {
        setPlayerTimeout(true);
        setPlayerTimeoutModalVisible(true);
      }, TIMEOUT_DURATION);
    }
    saveGameState();
  };

  //end 原有单机

  // 添加聊天相关的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 在消息列表更新时自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleChatMessage = (data: any) => {
    const otherUserMessage = data.data.message;
    if (otherUserMessage.sender.id !== String(currentUser?.id)) {
      setChatMessages(prev => [...prev, {...otherUserMessage}]);
    }
  };

  const handleJoinSuccess = (data: any) => {
    localStorage.setItem('piece_join_status', 'old');
    // 清除其他状态数据
    setWinner(null);
    setMoves([]);
    setLastMove(null);
    setOpponentLastMove(null);
    setWinningLine(null);
    setOpponentTimeout(false);
    setPlayerTimeout(false);
    setOpponentTimeoutModalVisible(false);
    setPlayerTimeoutModalVisible(false);
    setOpponentLastMoveTime(Date.now());
    setPlayerLastMoveTime(Date.now());

    if (opponentTimeoutRef.current) {
      clearTimeout(opponentTimeoutRef.current);
      opponentTimeoutRef.current = null;
    }
    if (playerTimeoutRef.current) {
      clearTimeout(playerTimeoutRef.current);
      playerTimeoutRef.current = null;
    }

    // 设置新的游戏状态
    setOpponentColor(data.data.opponentColor);
    setPlayerColor(data.data.yourColor);
    setOnlineStatus('playing');
    setGameStarted(true);
    setOpponentUserId(data.data.playerId);
    setOpponentInfo(data.data.playerInfo);

    // 如果是创建房间的用户（执黑），保持棋盘状态不变
    // 如果是加入房间的用户（执白），重置棋盘
    if (data.data.yourColor === 'white') {
      setBoard(createEmptyBoard());
      setCurrentPlayer('black');
      // 设置对手超时计时器
      setOpponentLastMoveTime(Date.now());
      if (opponentTimeoutRef.current) {
        clearTimeout(opponentTimeoutRef.current);
      }
      opponentTimeoutRef.current = setTimeout(() => {
        setOpponentTimeout(true);
        setOpponentTimeoutModalVisible(true);
      }, TIMEOUT_DURATION);
    } else {
      // 设置玩家超时计时器
      setPlayerLastMoveTime(Date.now());
      if (playerTimeoutRef.current) {
        clearTimeout(playerTimeoutRef.current);
      }
      playerTimeoutRef.current = setTimeout(() => {
        setPlayerTimeout(true);
        setPlayerTimeoutModalVisible(true);
      }, TIMEOUT_DURATION);
    }

    messageApi.open({
      type: 'success',
      content: '战斗开始！！！',
    });
    saveGameState();
  };

  const handleCreateChessRoom = (data: any) => {
    console.log('创建房间成功', data.data);
    
    // 处理不同格式的返回数据
    let roomId = '';
    if (typeof data.data === 'object' && data.data !== null) {
      // 新格式：{roomId: "xxx", gameType: "xxx"}
      roomId = data.data.roomId || '';
      console.log(`收到服务器返回的房间ID: ${roomId}`);
    } else {
      // 兼容旧格式：直接是房间号字符串
      roomId = String(data.data);
    }
    
    setRoomId(roomId);
    setOnlineStatus('waiting');
    messageApi.open({
      type: 'success',
      content: '房间创建成功啦',
    });
    setGameStarted(true);
    saveGameState();
  };

  const handleMoveChess = (data: any) => {
    setPlayerColor(data.data.player === 'black' ? 'white' : 'black');
    handleRemoteMove(data.data.position, data.data.player);
    if (data.data.playerInfo) {
      setOpponentInfo(data.data.playerInfo);
    }
    saveGameState();
  };

  // 处理对手超时
  const handleOpponentTimeout = (shouldExit: boolean = false) => {
    setOpponentTimeoutModalVisible(false);
    setOpponentTimeout(false);
    // 如果用户点击了"退出房间"按钮，则调用handleExitRoom函数
    if (shouldExit) {
      handleExitRoom();
    }
  };

  // 处理玩家超时
  const handlePlayerTimeout = () => {
    setPlayerTimeoutModalVisible(false);
    setPlayerTimeout(false);
    // 可以在这里添加其他处理逻辑，比如提示玩家
  };

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

      // 连接WebSocket
      wsService.connect(token);

      return () => {
        // 移除消息处理器
        wsService.removeMessageHandler('chat', handleChatMessage);
        wsService.removeMessageHandler('joinSuccess', handleJoinSuccess);
        wsService.removeMessageHandler('createChessRoom', handleCreateChessRoom);
        wsService.removeMessageHandler('moveChess', handleMoveChess);
      };
    }
  }, [gameMode, currentUser?.id]);

  //原有单机
  const handleMove = useCallback((position: Position) => {
    if (gameMode === 'single') {
      // 原有单机逻辑...
      if (winner || board[position.row][position.col]) return;

      const newBoard = board.map(row => [...row]);
      newBoard[position.row][position.col] = currentPlayer;
      setBoard(newBoard);
      setLastMove(position);

      addMove(position, currentPlayer);

      const winResult = checkWin(newBoard, position, currentPlayer);
      if (winResult) {
        setWinner(currentPlayer);
        setWinningLine(winResult);
        saveGameState();
        return;
      }

      setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
    } else {
      if (onlineStatus !== 'playing') {
        messageApi.open({
          type: 'info',
          content: '对手还没加入呢，请耐心等待～',
        });
        return;
      }
      if (currentPlayer !== playerColor || winner) return;

      // 重置玩家超时状态
      setPlayerTimeout(false);
      setPlayerLastMoveTime(Date.now());
      // 清除玩家超时计时器
      if (playerTimeoutRef.current) {
        clearTimeout(playerTimeoutRef.current);
        playerTimeoutRef.current = null;
      }

      // 设置对手超时计时器
      setOpponentLastMoveTime(Date.now());
      if (opponentTimeoutRef.current) {
        clearTimeout(opponentTimeoutRef.current);
      }
      opponentTimeoutRef.current = setTimeout(() => {
        setOpponentTimeout(true);
        setOpponentTimeoutModalVisible(true);
      }, TIMEOUT_DURATION);

      // 使用全局 WebSocket 服务发送消息
      wsService.send({
        type: 2,
        userId: opponentUserId,
        data: {
          type: 'moveChess',
          content: {
            roomId: roomId,
            position,
            player: playerColor,
            playerInfo: {
              id: currentUser?.id,
              name: currentUser?.userName,
              avatar: currentUser?.userAvatar,
              level: currentUser?.level
            }
          }
        },
      });

      // 本地更新棋盘
      const newBoard = [...board];
      newBoard[position.row][position.col] = playerColor;
      setBoard(newBoard);
      addMove(position, playerColor);

      // 检查胜利
      const winResult = checkWin(newBoard, position, playerColor);
      if (winResult) {
        setWinner(playerColor);
        setWinningLine(winResult);
        // 游戏结束时显示弹框
        setShowGameEndModal(true);
      }

      setCurrentPlayer(opponentColor); // 切换回合显示
      saveGameState();
    }
  }, [board, winner, onlineStatus, gameMode, currentPlayer, playerColor, opponentColor, roomId, messageApi, saveGameState, currentUser, opponentUserId, opponentTimeoutRef, playerTimeoutRef, TIMEOUT_DURATION]);

  useEffect(() => {
    if (gameStarted && currentPlayer !== playerColor && !winner) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board);
        handleMove(aiMove);
        setIsThinking(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameMode, roomId, currentPlayer, board, winner, opponentColor, playerColor, gameStarted, handleMove]);

  const switchColor = () => {
    const newColor: Player = playerColor === 'black' ? 'white' : 'black';

    if (newColor === 'white') {
      const center = Math.floor(board.length / 2);
      handleMove({row: center, col: center})
      // setTimeout(() => , 0);
    }

    setPlayerColor(newColor);
    setBoard(createEmptyBoard());
    setCurrentPlayer('black');
    setWinner(null);
    setIsThinking(false);
    setMoves([]);
    setLastMove(null);
    setOpponentLastMove(null);
    setWinningLine(null);
    setShowRestartModal(false);


  };

  const continueWithSameColor = () => {
    setBoard(createEmptyBoard());

    setCurrentPlayer('black');
    setWinner(null);
    setIsThinking(false);
    setMoves([]);
    setLastMove(null);
    setOpponentLastMove(null);
    setWinningLine(null);
    setShowRestartModal(false);

    if (playerColor === 'white') {
      const center = Math.floor(board.length / 2);
      setTimeout(() => handleMove({row: center, col: center}), 0);
    }
  };

  const undoMove = () => {
    if (moves.length < 2 || isThinking || winner) return;
    const newMoves = moves.slice(0, -2);
    setMoves(newMoves);
    const newBoard = createEmptyBoard();
    newMoves.forEach(move => {
      newBoard[move.row][move.col] = move.player;
    });

    setBoard(newBoard);
    setCurrentPlayer(playerColor);
    setLastMove(newMoves.length > 0 ? newMoves[newMoves.length - 1] : null);
  };

  const startGame = (color: Player) => {
    setPlayerColor(color);
    setGameStarted(true);

    setBoard(createEmptyBoard());
    setCurrentPlayer('black');
    setWinner(null);
    setMoves([]);
    setLastMove(null);
    setOpponentLastMove(null);
    setWinningLine(null);

    if (color === 'white' && gameMode === 'single') {
      const center = Math.floor(board.length / 2);
      handleMove({row: center, col: center});
    }
  };

  const formatMove = (move: Move) => {
    const col = COLUMNS[move.col];
    const row = ROWS[move.row];
    return `${move.number}. ${move.player === 'black' ? '●' : '○'} ${col}${row}`;
  };

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
          message: newMessage
        }
      }
    });

    // 更新消息列表
    setChatMessages(prev => [...prev, newMessage]);
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
            content: `[invite/chess]${roomId}[/invite]`,
            sender: {
              id: String(currentUser.id),
              name: currentUser.userName || '游客',
              avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
              level: currentUser.level || 1,
              isAdmin: currentUser.userRole === 'admin',
            },
            timestamp: new Date(),
          }
        }
      }
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
    setBoard(createEmptyBoard());
    setCurrentPlayer('black');
    setWinner(null);
    setMoves([]);
    setLastMove(null);
    setOpponentLastMove(null);
    setWinningLine(null);
    setChatMessages([]);
    setChatInputValue('');
    setRoomId('');
    setShowGameEndModal(false);
  };

  // 添加继续游戏函数
  const handleContinueGame = () => {
    setShowGameEndModal(false);
  };

  // 在组件卸载时清除计时器
  useEffect(() => {
    return () => {
      if (opponentTimeoutRef.current) {
        clearTimeout(opponentTimeoutRef.current);
      }
      if (playerTimeoutRef.current) {
        clearTimeout(playerTimeoutRef.current);
      }
    };
  }, []);

  // 在游戏开始时设置初始计时器
  useEffect(() => {
    if (gameMode === 'online' && gameStarted && onlineStatus === 'playing') {
      if (currentPlayer === playerColor) {
        // 玩家回合，设置玩家超时计时器
        setPlayerLastMoveTime(Date.now());
        if (playerTimeoutRef.current) {
          clearTimeout(playerTimeoutRef.current);
        }
        playerTimeoutRef.current = setTimeout(() => {
          setPlayerTimeout(true);
          setPlayerTimeoutModalVisible(true);
        }, TIMEOUT_DURATION);
      } else {
        // 对手回合，设置对手超时计时器
        setOpponentLastMoveTime(Date.now());
        if (opponentTimeoutRef.current) {
          clearTimeout(opponentTimeoutRef.current);
        }
        opponentTimeoutRef.current = setTimeout(() => {
          setOpponentTimeout(true);
          setOpponentTimeoutModalVisible(true);
        }, TIMEOUT_DURATION);
      }
    }
  }, [gameMode, gameStarted, onlineStatus, currentPlayer, playerColor, opponentTimeoutRef, playerTimeoutRef, TIMEOUT_DURATION]);

  // 在游戏结束时清除计时器
  useEffect(() => {
    if (winner) {
      if (opponentTimeoutRef.current) {
        clearTimeout(opponentTimeoutRef.current);
        opponentTimeoutRef.current = null;
      }
      if (playerTimeoutRef.current) {
        clearTimeout(playerTimeoutRef.current);
        playerTimeoutRef.current = null;
      }
    }
  }, [winner, opponentTimeoutRef, playerTimeoutRef]);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br  to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-2xl shadow-xl max-w-lg w-full text-center">
          <h1
            className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            五子棋 Gomoku
          </h1>
          <p className="text-gray-600 mb-12">挑战AI，展现你的棋艺</p>
          <div className="mb-8">
            <h2 className="text-xl font-medium mb-4">选择游戏模式</h2>
            <div className="flex gap-4 justify-center">
              <button
                type={"button"}
                className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"
                onClick={() => setGameMode('single')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div style={{
                    backgroundColor: gameMode === 'single' ? 'rgba(172,229,178,0.95)' : 'white',
                    color: 'white'
                  }} className="w-5 h-5 rounded-full border-2 border-gray-800"></div>
                  <span className="font-medium text-gray-800">单人 VS AI</span>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-600">Local Game</span>
              </button>
              <button
                type={"button"}
                onClick={() => setGameMode('online')}
                className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"

              >
                <div className="flex items-center gap-3 mb-2">
                  <div style={{
                    backgroundColor: gameMode === 'online' ? 'rgba(172,229,178,0.95)' : 'white',
                    color: 'white'
                  }}
                       className="w-5 h-5 rounded-full border-2 border-gray-800"></div>
                  <span className="font-medium text-gray-800">联机对战</span>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-600"> Online Game</span>
              </button>
            </div>
          </div>
          {contextHolder}
          {/* 联机模式下的额外UI */}
          {gameMode === 'online' && (

            <div className="mb-8">
              <Input
                type="text"
                placeholder="输入房间号（留空创建新房间）"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="border p-2 rounded-lg mb-4"
              />
              <Button
                onClick={() => {
                  if (roomId) {
                    // 发送加入房间请求
                    wsService.send({
                      type: 2,
                      userId: -1,
                      data: {
                        type: 'joinRoom',
                        content: roomId
                      }
                    });
                  } else {
                    // 发送创建房间请求
                    wsService.send({
                      type: 2,
                      userId: -1,
                      data: {
                        type: 'createChessRoom',
                        content: JSON.stringify({ gameType: 'normal' }) // 添加游戏类型信息
                      }
                    });
                  }
                }}
              >
                {roomId ? '加入房间' : '创建房间'}
              </Button>
            </div>
          )}
          {gameMode === 'single' && (
            <div>
              <h2 className="text-xl font-medium mb-8 text-gray-800">选择您的执子颜色</h2>
              <div className="flex gap-6 justify-center">
                <button
                  type={"button"}
                  onClick={() => startGame('black')}
                  className="group px-8 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-5 h-5 rounded-full bg-black border-2 border-gray-700"></div>
                    <span className="font-medium">执黑先手</span>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-300">First Move</span>
                </button>
                <button
                  type={"button"}
                  onClick={() => startGame('white')}
                  className="group px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-800"></div>
                    <span className="font-medium text-gray-800">执白后手</span>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-600">Second Move</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-xl p-4">
              {gameMode === 'online' && (
                <div className="mb-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        onlineStatus === 'playing' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}/>
                      <span className="text-sm text-purple-800">
                        {onlineStatus === 'connecting' && '连接中...'}
                        {onlineStatus === 'waiting' && (
                          <span>
                            等待对手加入 {roomId && <span className="font-medium">(房间号🏠: {roomId})</span>}
                          </span>
                        )}
                        {onlineStatus === 'playing' && `对战中 - 你执${playerColor === 'black' ? '黑' : '白'}棋`}
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
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <img
                            src={opponentInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${opponentUserId || 'opponent'}`}
                            alt="对手头像"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-800">
                            {opponentInfo?.name || (opponentUserId ? `对手 ${opponentUserId.slice(-4)}` : '等待对手...')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {opponentColor === 'black' ? '执黑先手' : '执白后手'}
                          </div>
                        </div>
                      </div>
                      {/* 分隔线 */}
                      <div className="w-px h-8 bg-gray-200"></div>
                      {/* 玩家信息 */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-800">
                            {currentUser?.userName || '游客'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {playerColor === 'black' ? '执黑先手' : '执白后手'}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <img
                            src={currentUser?.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id || 'visitor'}`}
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
                    setBoard(createEmptyBoard());
                    setCurrentPlayer('black');
                    setWinner(null);
                    setMoves([]);
                    setLastMove(null);
                    setOpponentLastMove(null);
                    setWinningLine(null);
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
                    <h1 className="text-2xl font-bold text-gray-800">五子棋 Gomoku</h1>
                    <div className="mt-1 flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${isThinking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}/>
                      <span className="text-sm text-gray-600">
                      {isThinking ? 'AI 思考中...' : '等待落子'}
                    </span>
                    </div>
                  </div>
                )}
                {gameMode === 'single' && (
                  <div className="flex gap-3">
                    <button
                      type={"button"}
                      onClick={undoMove}
                      disabled={moves.length < 2 || isThinking || !!winner}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                        moves.length < 2 || isThinking || winner
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      } transition-colors`}
                    >
                      <ArrowLeft className="w-4 h-4"/>
                      <span className="font-medium">悔棋</span>
                    </button>
                    <button
                      type={"button"}
                      onClick={() => setShowRestartModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4"/>
                      <span className="font-medium">重新开始</span>
                    </button>
                  </div>
                )}
              </div>

              {winner && (
                <div
                  className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-center gap-3">
                  <Trophy className="w-6 h-6 text-yellow-600"/>
                  <span className="text-lg font-medium text-yellow-800">
                    {winner === playerColor ? '恭喜你赢了！' : gameMode === "online"
                      ? "对手小胜，再接再厉" : 'AI 赢了，再接再厉！'}
                  </span>
                </div>
              )}

              {!winner && (
                <div
                  className="mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${
                      currentPlayer === 'black'
                        ? 'bg-gray-900'
                        : 'bg-white border-2 border-gray-900'
                    }`}/>
                    <div>
                      <div className="font-medium text-gray-900">
                        {currentPlayer === playerColor ? '你的回合' : '对手 回合'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {currentPlayer === 'black' ? '黑棋' : '白棋'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5"/>
                      <span>回合 {moves.length + 1}</span>
                    </div>
                    {gameMode === 'single' && (
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5"/>
                        <span>AI 难度: 高级</span>
                      </div>)}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <BoardComponent
                  board={board}
                  onMove={handleMove}
                  disabled={isThinking || currentPlayer !== playerColor || !!winner}
                  lastMove={lastMove}
                  opponentLastMove={opponentLastMove}
                  winningLine={winningLine}
                />
              </div>
            </div>
          </div>

          {/* 右侧面板：对战记录和聊天窗口 */}
          {(gameMode === 'online' || gameMode === 'single') && (
            <div className="lg:w-96 w-full flex items-center">
              <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col w-full" style={{ height: 'min(calc(100vh - 6rem), 800px)' }}>
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
                    <div className="h-[500px] overflow-y-auto mb-4 space-y-4 px-2" style={{ height: '500px' }}>
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            currentUser?.id && String(msg.sender.id) === String(currentUser.id)
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div className={`max-w-[85%] ${
                            currentUser?.id && String(msg.sender.id) === String(currentUser.id)
                              ? 'order-2'
                              : 'order-1'
                          }`}>
                            <div className={`flex items-center gap-2 mb-1.5 ${
                              currentUser?.id && String(msg.sender.id) === String(currentUser.id)
                                ? 'justify-end'
                                : 'justify-start'
                            }`}>
                              <span className="text-sm text-gray-800 font-medium">{msg.sender.name}</span>
                              <span className="text-xs text-gray-400">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className={`rounded-2xl px-4 py-2.5 ${
                              currentUser?.id && String(msg.sender.id) === String(currentUser.id)
                                ? 'bg-blue-50 text-gray-800 rounded-br-none border border-blue-100'
                                : 'bg-gray-50 text-gray-800 rounded-bl-none border border-gray-100'
                            }`}>
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleChatSend();
                          }
                        }}
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
                    {moves.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                          <Timer className="w-8 h-8"/>
                        </div>
                        <p>暂无落子</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {moves.map((move, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              index === moves.length - 1
                                ? 'bg-blue-50 border border-blue-100 shadow-sm'
                                : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'
                            }`}
                            onClick={() => {
                              // 这里可以添加点击落子记录时的处理逻辑
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full ${
                                move.player === 'black'
                                  ? 'bg-gray-900'
                                  : 'bg-white border-2 border-gray-900'
                              }`}/>
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
                <X className="w-5 h-5"/>
              </button>
            </div>
            <p className="text-gray-600 mb-6">请选择重新开始的方式：</p>
            <div className="space-y-3">
              <button
                type={"button"}
                onClick={continueWithSameColor}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <div className={`w-4 h-4 rounded-full ${
                  playerColor === 'black'
                    ? 'bg-gray-900'
                    : 'bg-white border-2 border-gray-900'
                }`}/>
                <span className="font-medium">继续{playerColor === 'black' ? '执黑先手' : '执白后手'}</span>
              </button>
              <button
                type={"button"}
                onClick={switchColor}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <div className={`w-4 h-4 rounded-full ${
                  playerColor === 'black'
                    ? 'bg-white border-2 border-gray-900'
                    : 'bg-gray-900'
                }`}/>
                <span className="font-medium text-gray-800">
                  改为{playerColor === 'black' ? '执白后手' : '执黑先手'}
                </span>
              </button>
              <button
                type={"button"}
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
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="flex items-center justify-center gap-3 mb-6">
              <Trophy className="w-8 h-8 text-yellow-600"/>
              <span className="text-lg font-medium text-gray-800">
                {winner === playerColor ? '恭喜你赢了！' : '对手小胜，再接再厉'}
              </span>
            </div>
            <div className="space-y-3">
              <button
                type={"button"}
                onClick={handleExitRoom}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <span className="font-medium text-gray-800">退出房间</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对手超时提示弹窗 */}
      <Modal
        title="对手可能已离开"
        open={opponentTimeoutModalVisible}
        onOk={() => handleOpponentTimeout(true)}
        onCancel={() => handleOpponentTimeout(false)}
        okText="退出房间"
        cancelText="继续等待"
      >
        <p>对手已经超过30秒没有下子，是否退出房间？</p>
      </Modal>

      {/* 玩家超时提示弹窗 */}
      <Modal
        title="请下子"
        open={playerTimeoutModalVisible}
        onOk={handlePlayerTimeout}
        onCancel={handlePlayerTimeout}
        okText="收到马上下"
      >
        <p>您已经超过30秒没有下子，请尽快下子！</p>
      </Modal>
    </div>
  );
}

export default App;
