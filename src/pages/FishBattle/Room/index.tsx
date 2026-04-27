import React, { useEffect, useState, useRef } from 'react';
import { Spin, message } from 'antd';
import { history, useModel, useParams } from '@umijs/max';
import type { FishBattlePhase } from '@/models/fishBattleWindow';
import { useFishBattleSocket } from '@/hooks/useFishBattleSocket';
import { useFishBattleGuard } from '@/hooks/useFishBattleGuard';
import type { FishBattleRoomDetail as RoomDetailType, FishBattleRoomPlayer, Team } from '../types';
import {
  Bot, CheckCircle2, Clock, LogOut, X as XIcon, ArrowLeft,
  Paperclip, Copy, MessageCircle, Bell, Shield, Heart, Play, User,
} from 'lucide-react';
import './index.less';

interface ChatMessage {
  type: 'system' | 'player';
  sender?: string;
  content: string;
  time: string;
  highlightName?: string;
}


const FishBattleRoom: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const fishBattleWindow = useModel('fishBattleWindow');
  const { connect, emit, on, off, isConnected } = useFishBattleSocket();

  const [roomDetail, setRoomDetail] = useState<RoomDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { type: 'system', content: '欢迎来到房间！等待所有玩家准备...', time: '' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigatingToGameRef = useRef(false);
  const leavingRef = useRef(false);
  // 路由守卫：校验房间状态 + 防止回退（被动模式，等 roomDetail 加载后校验）
  useFishBattleGuard({
    page: 'room',
    roomCode,
    userId: currentUser?.id,
    roomStatus: roomDetail?.room?.status ?? null,
    roomPlayers: roomDetail?.players ?? null,
    isLoadingPhase: !!(roomDetail?.room as any)?.isLoadingPhase,
  });

  useEffect(() => {
    if (!currentUser) {
      message.warning('请先登录后再进入房间');
      history.replace('/fishBattle/home');
      return;
    }
  }, [currentUser]);

  useEffect(() => {
    if (!roomCode || !currentUser) return;
    connect();
    // 不在此处 disconnect — socket 连接在游戏流程中保持（Room → HeroSelect → Loading）
    return () => {
      // 安全网：页面卸载时若不是跳转到游戏（选英雄），则自动发送 room:leave
      // 防止“返回大厅”、浏览器后退等导航产生幽灵玩家
      if (!navigatingToGameRef.current && !leavingRef.current) {
        emit('room:leave', {});
      }
    };
  }, [roomCode, currentUser]);

  useEffect(() => {
    if (!isConnected) return;

    // 监听房间详情响应（从Socket内存获取）
    const handleRoomInfo = (data: { room: any; players: FishBattleRoomPlayer[]; serverTime: number }) => {
      if (data.room) {
        setRoomDetail({ room: data.room, players: data.players || [] });
        setLoading(false);
      }
    };

    // 核心：监听服务端推送的实时玩家列表快照（所有操作都会触发此事件）
    const handlePlayersUpdate = (data: { players: FishBattleRoomPlayer[]; serverTime: number }) => {
      setRoomDetail((prev) => {
        if (prev) {
          return { ...prev, players: data.players };
        }
        return null;
      });
      // 同步当前用户的就绪状态（切换位置等操作后服务端可能重置 isReady）
      if (currentUser?.id) {
        const me = data.players.find((p) => Number(p.userId) === Number(currentUser.id));
        if (me) {
          setIsReady(!!me.isReady);
        }
      }
    };

    const handleChatMessage = (data: { userId: number; playerName: string; message: string; serverTime: number }) => {
      const time = new Date(data.serverTime).toLocaleTimeString();
      setChatMessages((prev) => [...prev, {
        type: 'player',
        sender: data.playerName,
        content: data.message,
        time,
      }]);
    };

    const handlePlayerJoined = (data: { userId: number; playerName: string; serverTime: number }) => {
      const time = new Date(data.serverTime).toLocaleTimeString();
      setChatMessages((prev) => [...prev, {
        type: 'system',
        content: '加入了房间',
        highlightName: data.playerName,
        time,
      }]);
    };

    const handlePlayerLeft = (data: { userId: number; playerName: string; serverTime: number }) => {
      const time = new Date(data.serverTime).toLocaleTimeString();
      setChatMessages((prev) => [...prev, {
        type: 'system',
        content: '离开了房间',
        highlightName: data.playerName,
        time,
      }]);
    };

    const handleGameStart = (data: { roomCode: string }) => {
      navigatingToGameRef.current = true;
      const code = data.roomCode || roomCode;
      fishBattleWindow.openWindow(code!, 'heroSelect');
      // 打开浮动窗口后跳回大厅，避免 Room 页面仍可操作
      history.replace('/fishBattle/lobby');
    };

    const handleCountdown = (data: { seconds: number }) => {
      setCountdown(data.seconds);
    };

    const handleJoined = () => {};

    const handleError = (data: { error: string }) => {
      message.error(data.error);
    };

    const handleOwnerChanged = (data: { newOwnerId: number; newOwnerName: string; serverTime: number }) => {
      const time = new Date(data.serverTime).toLocaleTimeString();
      setChatMessages((prev) => [...prev, {
        type: 'system',
        content: '成为了新房主',
        highlightName: data.newOwnerName,
        time,
      }]);
      // 同步更新 roomDetail 中的 creatorId，使房主标识实时刷新
      setRoomDetail((prev) => {
        if (prev) {
          return { ...prev, room: { ...prev.room, creatorId: Number(data.newOwnerId) } };
        }
        return prev;
      });
    };

    on('room:info', handleRoomInfo);
    on('room:joined', handleJoined);
    on('room:playersUpdate', handlePlayersUpdate);
    on('room:chatMessage', handleChatMessage);
    on('room:playerJoined', handlePlayerJoined);
    on('room:playerLeft', handlePlayerLeft);
    on('room:ownerChanged', handleOwnerChanged);
    on('room:error', handleError);
    on('game:heroPickStart', handleGameStart);
    on('countdown', handleCountdown);

    // 请求房间详情（从内存获取）
    emit('room:getInfo', { roomCode });

    // 加入房间（不指定 team/slot，后端自动分配）
    emit('room:join', { roomCode, userId: currentUser?.id, playerName: currentUser?.userName || '未知玩家' });

    return () => {
      off('room:info', handleRoomInfo);
      off('room:joined', handleJoined);
      off('room:playersUpdate', handlePlayersUpdate);
      off('room:chatMessage', handleChatMessage);
      off('room:playerJoined', handlePlayerJoined);
      off('room:playerLeft', handlePlayerLeft);
      off('room:ownerChanged', handleOwnerChanged);
      off('room:error', handleError);
      off('game:heroPickStart', handleGameStart);
      off('countdown', handleCountdown);
    };
  }, [isConnected, roomCode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatMessages]);

  const handleReady = () => {
    const newReady = !isReady;
    setIsReady(newReady);
    emit('room:ready', { isReady: newReady });
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    emit('room:chat', {
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  const handleCopyInvite = () => {
    const link = `${window.location.origin}/fishBattle/room/${roomCode}`;
    navigator.clipboard.writeText(link);
    message.success('邀请链接已复制！');
  };

  const handleLeaveRoom = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    // 监听服务端确认后再跳转，避免与大厅拉取数据产生竞态
    const handleLeft = () => {
      off('room:left', handleLeft);
      history.push('/fishBattle/lobby');
    };
    on('room:left', handleLeft);
    emit('room:leave', {});
    // 兜底：500ms 内未收到确认也跳转
    setTimeout(() => {
      off('room:left', handleLeft);
      history.push('/fishBattle/lobby');
    }, 500);
  };

  const bluePlayers = roomDetail?.players.filter((p) => p.team === 'blue') || [];
  const redPlayers = roomDetail?.players.filter((p) => p.team === 'red') || [];

  // 当前玩家是否已在房间中
  const myPlayer = roomDetail?.players.find((p) => Number(p.userId) === Number(currentUser?.id));

  // 是否是房主
  const isOwner = Number(currentUser?.id) === Number(roomDetail?.room?.creatorId);

  // 是否满足开始条件：两队各至少1人 + 所有人已准备
  const allPlayers = roomDetail?.players || [];
  const canStart = allPlayers.length >= 2
    && bluePlayers.length >= 1
    && redPlayers.length >= 1
    && allPlayers.every((p) => p.isReady);

  const handleStartGame = () => {
    if (!canStart) {
      message.warning('两队各需至少1人且全部准备就绪才能开始游戏');
      return;
    }
    emit('game:start', {});
  };

  const handleSlotClick = (team: Team, slotIndex: number) => {
    if (!roomCode || !currentUser) return;
    // 纯 Socket 操作，无DB调用
    emit('room:switchSlot', { team, slotIndex });
  };

  const renderPlayerSlot = (players: FishBattleRoomPlayer[], team: Team, index: number) => {
    const player = players.find((p) => p.slotIndex === index);
    if (!player) {
      return (
        <div
          className={`player-slot empty ${team} clickable`}
          onClick={() => handleSlotClick(team, index)}
          title={myPlayer ? '点击切换到此位置' : '点击加入此位置'}
        >
          <div className="slot-avatar empty-avatar">+</div>
          <div className="slot-info">
            <span className="slot-name">{myPlayer ? '点击切换' : '点击加入'}</span>
          </div>
        </div>
      );
    }
    const isMe = Number(player.userId) === Number(currentUser?.id);
    const isOwner = Number(player.userId) === Number(roomDetail?.room.creatorId);
    return (
      <div className={`player-slot ${team} ${player.isReady ? 'ready' : ''} ${isMe ? 'me' : ''}`}>
        <div className="slot-avatar">
          <span className="slot-avatar-inner">
            {player.isAi ? <Bot size={20} /> : (
              player.userAvatar ? (
                <img
                  src={player.userAvatar}
                  alt={player.playerName || '玩家头像'}
                  className="slot-avatar-img"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <User size={20} />
              )
            )}
          </span>
          {isOwner ? <span className="badge-owner-tag" title="房主">房主</span> : <span className="badge-player-tag" title="玩家">玩家</span>}
          {isMe && <span className="badge-me-tag" title="我">我</span>}
        </div>
        <div className="slot-info">
          <span className="slot-name">
            {player.isAi ? `AI-${player.slotIndex + 1}` : (isMe ? (currentUser?.userName || '我') : (player.playerName || `玩家${player.userId}`))}
          </span>
          <span className="slot-meta">Lv.{Math.floor(Math.random() * 20) + 1} · 胜率 {Math.floor(Math.random() * 40) + 40}%</span>
        </div>
        <div className="slot-status">
          {player.isReady ? (
            <span className="status-ready"><CheckCircle2 size={14} /> 已准备</span>
          ) : (
            <span className="status-waiting"><Clock size={14} /> 等待中</span>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="fish-battle-room"><Spin size="large" className="room-loading" /></div>;

  return (
    <div className="fish-battle-room">
      <div className="room-main">
        {/* Header */}
        <div className="room-header">
          <div className="room-header-left">
            <button type="button" className="btn-back" onClick={handleLeaveRoom}><ArrowLeft size={14} /> 返回大厅</button>
            <h2 className="room-title">{roomDetail?.room.roomName || '房间'}</h2>
            <span
              className="room-code copyable"
              title="点击复制房间号"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(roomCode || '');
                message.success('房间号已复制');
              }}
            >#{roomCode}</span>
          </div>
        </div>

        {/* Invite Bar */}
        <div className="invite-bar">
          <span className="invite-icon"><Paperclip size={16} /></span>
          <span className="invite-label">邀请链接：</span>
          <span className="invite-link">{`${window.location.origin}/fishBattle/room/${roomCode}`}</span>
          <button type="button" className="btn-copy" onClick={handleCopyInvite}><Copy size={14} /> 复制链接</button>
        </div>

        {/* Teams Area */}
        <div className="teams-area">
          {/* Blue Team */}
          <div className="team-card blue">
            <div className="team-label"><Shield size={18} className="icon-blue" /> 蓝队</div>
            <div className="team-slots">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i}>{renderPlayerSlot(bluePlayers, 'blue', i)}</div>
              ))}
            </div>
          </div>

          {/* VS Separator */}
          <div className="vs-separator">
            <span className="vs-text">VS</span>
          </div>

          {/* Red Team */}
          <div className="team-card red">
            <div className="team-label"><Heart size={18} className="icon-red" /> 红队</div>
            <div className="team-slots">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i}>{renderPlayerSlot(redPlayers, 'red', i)}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          <button type="button" className="btn-leave" onClick={handleLeaveRoom}><LogOut size={16} /> 离开房间</button>
          <button
            type="button"
            className={`btn-ready ${isReady ? 'is-ready' : ''}`}
            onClick={handleReady}
          >
            {isReady ? <><XIcon size={16} /> 取消准备</> : <><CheckCircle2 size={16} /> 准备就绪</>}
          </button>
          {isOwner && (
            <button
              type="button"
              className={`btn-start ${canStart ? '' : 'disabled'}`}
              onClick={handleStartGame}
              disabled={!canStart}
            >
              <Play size={16} /> 开始游戏
            </button>
          )}
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          <div className="chat-header"><MessageCircle size={16} /> 房间聊天</div>
          <div className="chat-messages">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`chat-msg ${msg.type === 'system' ? 'system-msg' : 'player-msg'}`}
              >
                {msg.type === 'system' && <span className="chat-sys-icon"><Bell size={14} /></span>}
                {msg.type === 'player' && <span className="chat-sender">{msg.sender}:</span>}
                {msg.highlightName && <strong className="chat-highlight-name">{msg.highlightName}</strong>}
                {msg.highlightName && ' '}
                <span className="chat-content">{msg.content}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-bar">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="输入消息..."
            />
            <button type="button" className="btn-send" onClick={handleSendChat}>发送</button>
          </div>
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-content">
            <div className="countdown-title">游戏即将开始！</div>
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-hint">所有玩家已准备就绪</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FishBattleRoom;
