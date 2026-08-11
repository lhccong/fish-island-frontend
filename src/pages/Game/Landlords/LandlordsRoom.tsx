/**
 * 斗地主房间页面
 *
 * 布局：
 * ┌────────────────────────────────────────────────────────────────┐
 * │  顶部导航（高 52）                                                │
 * │  [← 返回]   房间号: <id>   [模式]                                │
 * ├──────────────┬─────────────────────────────┬────────────────────┤
 * │ 左侧 PlayerInfo │   LandlordCards（底牌）   │  右侧 PlayerInfo  │
 * │               ├─────────────────────────────┤                  │
 * │               │       PlayArea              │                  │
 * │               │ (倒计时 + 三玩家出牌区)       │                  │
 * ├──────────────┼─────────────────────────────┼────────────────────┤
 * │ 底部 PlayerInfo│  ActionBar + HandCards      │   ChatPanel      │
 * └──────────────┴─────────────────────────────┴────────────────────┘
 *
 * 业务逻辑全部由 useGameState Hook 提供。
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Button, Tag, message as antdMessage, Alert } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { history, useModel } from '@umijs/max';
import { wsService } from '@/services/websocket';
import PlayerInfo from './components/PlayerInfo';
import LandlordCards from './components/LandlordCards';
import HandCards from './components/HandCards';
import ActionBar from './components/ActionBar';
import PlayArea from './components/PlayArea';
import ChatSidebar from './components/ChatSidebar';
import GameOverModal from './components/GameOverModal';
import { useGameState } from './hooks/useGameState';
import { PlayerState } from './types';
import { isWaitingPhase, isPlayingPhase, isRobbingPhase, canPlayPhase } from './types/phase';
import { GAME_CONFIG } from './constants';

const LandlordsRoom: React.FC = () => {
  const roomId = window.location.pathname.split('/').pop() || '';
  const { initialState } = useModel('@@initialState');
  const currentUserInfo = initialState?.currentUser;

  // 邀请冷却状态
  const [inviteCooldown, setInviteCooldown] = useState<number>(0);
  const inviteCooldownRef = useRef<NodeJS.Timeout | null>(null);

  const userId = currentUserInfo?.id;

  const {
    gameState,
    handCards,
    selectedCards,
    setSelectedCards,
    clearSelected,
    chatMessages,
    gameResult,
    setGameResult,
    timeLeft,
    playerAction,
    playerHints,
    getMyPlayer,
    getLeftPlayer,
    getRightPlayer,
    getPlayerNameById,
    isMyTurn,
    isMyTurnToPlay,
    isMyTurnToRob,
    leftRoom,
    leaveRoom,
    ready,
    startGame,
    playCards,
    pass,
    skipRob,
    robLandlord,
    sendChat,
    cancelRobot,
    setRobot,
    tempLeaveInfo,
  } = useGameState(roomId);

  const currentUser = getMyPlayer();
  const leftPlayer = getLeftPlayer();
  const rightPlayer = getRightPlayer();
  const isOwner = currentUser?.isOwner;
  const isReady = currentUser?.isReady;
  const phase = gameState.phase || 'waiting';

  // 准备倒计时：当房间处于 waiting 阶段且后端已下发 readyPhaseStartTime 时，本地计算剩余秒数
  const [readyCountdown, setReadyCountdown] = useState<number>(0);
  useEffect(() => {
    if (phase !== 'waiting' || !gameState.readyPhaseStartTime) {
      setReadyCountdown(0);
      return;
    }
    const readyTimeoutMs = GAME_CONFIG.readyTimeout * 1000;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((gameState.readyPhaseStartTime! + readyTimeoutMs - Date.now()) / 1000),
      );
      setReadyCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phase, gameState.readyPhaseStartTime]);

  // 至少 playerCount-1 人准备 + playerCount 人在场 + 房主 才可开始
  const readyCount = gameState.players?.filter((p) => p.isReady).length || 0;
  const canStart =
    !!isOwner &&
    readyCount >= GAME_CONFIG.playerCount - 1 &&
    (gameState.players?.length || 0) >= GAME_CONFIG.playerCount;
  const canPlay = isMyTurnToPlay && canPlayPhase(phase);
  const showTimer = timeLeft > 0 && (isPlayingPhase(phase) || isRobbingPhase(phase));

  // 当前操作玩家信息（用于倒计时和等待提示）
  const currentActorId = playerAction?.currentPlayerId || gameState.currentPlayerId || gameState.currentRobPlayerId;
  const currentActorName = gameState.currentPlayerName || getPlayerNameById(currentActorId);
  const currentActorPosition: 'left' | 'right' | 'bottom' =
    currentActorId === leftPlayer?.userId
      ? 'left'
      : currentActorId === rightPlayer?.userId
      ? 'right'
      : 'bottom';

  // 选牌
  const handleSelectCard = useCallback((cardId: string, index: number) => {
    const cardKey = `${cardId}:${index}`;
    setSelectedCards((prev) =>
      prev.includes(cardKey) ? prev.filter((id) => id !== cardKey) : [...prev, cardKey],
    );
  }, [setSelectedCards]);

  // 出牌
  const handlePlay = useCallback(() => {
    if (selectedCards.length === 0) {
      antdMessage.warning('请选择要出的牌');
      return;
    }
    if (!canPlay) {
      antdMessage.warning('还没轮到你出牌');
      return;
    }
    const cardIds = selectedCards.map((k) => k.split(':')[0]);
    playCards(cardIds);
  }, [selectedCards, canPlay, playCards]);

  // 离开 / 返回
  const handleLeave = useCallback(() => {
    localStorage.setItem('landlords_left_room', JSON.stringify({ roomId, timestamp: Date.now() }));
    leaveRoom();
    history.push('/game/landlords');
  }, [leaveRoom, roomId]);

  // 被系统强制移出（房间解散 / 被踢）：标记本地已离开 → 跳列表
  const kickAndLeave = useCallback(
    (reason: string) => {
      antdMessage.warning(reason);
      localStorage.setItem(
        'landlords_left_room',
        JSON.stringify({ roomId, timestamp: Date.now(), force: true }),
      );
      leaveRoom();
      history.push('/game/landlords');
    },
    [leaveRoom, roomId],
  );

  // 房间超时解散（后端定时任务触发：凑不齐人 / 满员没人开始）
  useEffect(() => {
    if (!userId || !roomId) return undefined;

    const handler = (data: any) => {
      const payload = data?.data ?? data;
      if (payload?.roomId && String(payload.roomId) === String(roomId)) {
        kickAndLeave(payload?.reason || '房间已解散');
      }
    };

    wsService.addMessageHandler('gameRoomClosed', handler);
    return () => {
      wsService.removeMessageHandler('gameRoomClosed', handler);
    };
  }, [userId, roomId, kickAndLeave]);

  // 玩家被踢（准备超时等）：STATE_UPDATE 通道，event === 'playerKicked'
  // 收到后弹提示，跳转回房间列表
  useEffect(() => {
    if (!userId || !roomId) return undefined;

    const handler = (data: any) => {
      const payload = data?.data ?? data;
      if (payload?.event !== 'playerKicked') return;
      // 房间匹配 + 是踢我本人 → 才跳转
      if (payload?.roomId && String(payload.roomId) !== String(roomId)) return;
      if (payload?.userId && String(payload.userId) !== String(userId)) return;
      kickAndLeave(payload?.reason || '你因超时被移出房间');
    };

    wsService.addMessageHandler('gameStateUpdate', handler);
    return () => {
      wsService.removeMessageHandler('gameStateUpdate', handler);
    };
  }, [userId, roomId, kickAndLeave]);

  // 发送邀请到鱼窝
  const handleSendInvite = useCallback(() => {
    if (!currentUserInfo?.id) {
      antdMessage.error('请先登录！');
      return;
    }

    if (inviteCooldown > 0) {
      antdMessage.warning(`请等待 ${inviteCooldown} 秒后再发送邀请`);
      return;
    }

    if (!roomId) {
      antdMessage.error('房间不存在，无法发送邀请');
      return;
    }

    // 创建邀请消息
    const inviteMessage = `[invite/landlords]${roomId}[/invite]`;

    // 使用全局 WebSocket 服务发送消息
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: {
          message: {
            id: `${Date.now()}`,
            content: inviteMessage,
            sender: {
              id: String(currentUserInfo.id),
              name: currentUserInfo.userName || '游客',
              avatar: currentUserInfo.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
              level: currentUserInfo.level || 1,
              isAdmin: currentUserInfo.userRole === 'admin',
            },
            timestamp: new Date(),
          },
        },
      },
    });

    // 设置冷却时间
    setInviteCooldown(60);

    // 启动倒计时
    if (inviteCooldownRef.current) {
      clearInterval(inviteCooldownRef.current);
    }

    inviteCooldownRef.current = setInterval(() => {
      setInviteCooldown((prev) => {
        if (prev <= 1) {
          if (inviteCooldownRef.current) {
            clearInterval(inviteCooldownRef.current);
            inviteCooldownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    antdMessage.success('邀请已发送到聊天室');
  }, [currentUserInfo, roomId, inviteCooldown]);

  // 清理冷却计时器
  useEffect(() => {
    return () => {
      if (inviteCooldownRef.current) {
        clearInterval(inviteCooldownRef.current);
      }
    };
  }, []);

  // 临时离开（UI 由下方 tempLeaveInfo 渲染，这里不再留空 effect）
  // UI 兜底（不污染 normalizePlayer）：座位为空时显示「等待加入...」
  const placeholderPlayer: PlayerState = {
    userId: 0,
    userName: '等待加入...',
  };
  const leftPlayerView = leftPlayer ?? placeholderPlayer;
  const rightPlayerView = rightPlayer ?? placeholderPlayer;

  return (
    <div
      style={{
        position: 'fixed',
        top: 52,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* 顶部导航 */}
      <header
        style={{
          flex: '0 0 auto',
          height: 52,
          backgroundColor: '#1f2937',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={handleLeave}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.3)',
              color: '#fff',
            }}
          >
            返回
          </Button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>房间号: {roomId}</span>
          <Tag color="blue" style={{ margin: 0 }}>
            {gameState.gameType === 'LANDLORDS_CLASSIC' ? '经典模式' : '斗地主'}
          </Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>
            {gameState.players?.length || 0}/{GAME_CONFIG.playerCount} 玩家
          </span>
          {readyCountdown > 0 && (
            <Tag color={readyCountdown <= 5 ? 'red' : 'orange'} style={{ margin: 0 }}>
              准备倒计时 {readyCountdown}s
            </Tag>
          )}
          {tempLeaveInfo && <Tag color="warning">临时离开</Tag>}
        </div>
      </header>

      {/* 临时离开提示 */}
      {tempLeaveInfo && (
        <Alert
          message="临时离开"
          description={tempLeaveInfo.message}
          type="info"
          showIcon
          closable
          style={{ margin: 8 }}
        />
      )}

      {/* 准备阶段倒计时提示 */}
      {readyCountdown > 0 && !isReady && (
        <Alert
          message={`本局已结束，请点击「准备」继续（剩余 ${readyCountdown}s，超时将被移出房间）`}
          type={readyCountdown <= 5 ? 'error' : 'warning'}
          showIcon
          style={{ margin: 8 }}
        />
      )}

      {/* 中部主区 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          backgroundColor: '#ffffff',
        }}
      >
        {/* 左侧玩家 18% */}
        <div
          style={{
            flex: '0 0 18%',
            backgroundColor: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 12,
            borderRight: '1px solid #e5e7eb',
          }}
        >
          <PlayerInfo
            player={leftPlayerView}
            position="left"
            isCurrentTurn={showTimer ? currentActorId === leftPlayer?.userId : undefined}
            gamePhase={phase}
          />
        </div>

        {/* 中间 60% */}
        <div
          style={{
            flex: '1 1 60%',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            backgroundColor: '#ffffff',
          }}
        >
          {/* 底牌区 */}
          {(isRobbingPhase(phase) || isPlayingPhase(phase)) && (
            <div
              style={{
                flex: '0 0 25%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <LandlordCards
                cards={gameState.bottomCards || []}
                landlordName={gameState.landlordName}
                hideLabel={!gameState.landlordName}
              />
            </div>
          )}

          {/* 出牌区域 */}
          <PlayArea
            leftPlayer={leftPlayer}
            rightPlayer={rightPlayer}
            bottomPlayer={currentUser}
            playerHints={playerHints}
            timeLeft={timeLeft}
            maxTime={playerAction?.timeout || 30}
            currentActorId={currentActorId}
            currentActorName={currentActorName}
            currentActorPosition={currentActorPosition}
            gamePhase={phase}
          />
        </div>

        {/* 右侧玩家 18% */}
        <div
          style={{
            flex: '0 0 18%',
            backgroundColor: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 12,
            borderLeft: '1px solid #e5e7eb',
          }}
        >
          <PlayerInfo
            player={rightPlayerView}
            position="right"
            isCurrentTurn={showTimer ? currentActorId === rightPlayer?.userId : undefined}
            gamePhase={phase}
          />
        </div>
      </div>

      {/* 下方 30% */}
      <div
        style={{
          flex: '0 0 30%',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* 我的信息 18% */}
        <div
          style={{
            flex: '0 0 18%',
            backgroundColor: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 12,
            borderRight: '1px solid #e5e7eb',
          }}
        >
          <PlayerInfo
            player={currentUser ?? placeholderPlayer}
            position="bottom"
            showCardCount={false}
            isCurrentTurn={showTimer ? currentActorId === currentUser?.userId : undefined}
            gamePhase={phase}
          />
        </div>

        {/* 中间区域 60% */}
        <div
          style={{
            flex: '1 1 60%',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            borderLeft: '1px solid #f3f4f6',
            backgroundColor: '#ffffff',
          }}
        >
          {/* 操作区 */}
          <div
            style={{
              flex: '0 0 56px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              borderBottom: '1px solid #f3f4f6',
              padding: '0 12px',
            }}
          >
            <ActionBar
              phase={phase}
              isOwner={isOwner}
              isReady={isReady}
              canStart={canStart}
              canPlay={canPlay}
              selectedCount={selectedCards.length}
              isMyTurnToRob={isMyTurnToRob}
              highestRobScore={gameState.highestRobScore}
              isRobotControlled={currentUser?.isRobotControlled}
              waitForName={currentActorName}
              waitForAction={isRobbingPhase(phase) ? 'rob' : 'play'}
              onReady={ready}
              onStart={startGame}
              onPlay={handlePlay}
              onPass={pass}
              onReselect={clearSelected}
              onSkipRob={skipRob}
              onRobLandlord={(score) => {
                robLandlord(score);
                antdMessage.info(`你叫了${score}分`);
              }}
              onCancelRobot={cancelRobot}
              onSetRobot={setRobot}
              onLeave={handleLeave}
              roomId={roomId}
              inviteCooldown={inviteCooldown}
              onSendInvite={handleSendInvite}
              playerCount={gameState.players?.length || 0}
              maxPlayers={GAME_CONFIG.playerCount}
            />
          </div>

          {/* 手牌区域 */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#16a34a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '8px 12px',
              minHeight: 0,
            }}
          >
            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              我的牌 ({handCards.length}张)
            </div>
            <HandCards
              cards={handCards}
              selectedCards={selectedCards}
              onSelectCard={handleSelectCard}
              disabled={false}
            />
          </div>
        </div>

        {/* 右侧聊天 18% */}
        <div
          style={{
            flex: '0 0 18%',
            backgroundColor: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            padding: 12,
            minHeight: 0,
            overflow: 'hidden',
            borderLeft: '1px solid #e5e7eb',
          }}
        >
          <ChatSidebar
            messages={chatMessages}
            onSend={sendChat}
            currentUserId={currentUserInfo?.id ?? currentUser?.userId}
          />
        </div>
      </div>

      {/* 游戏结束弹窗 */}
      <GameOverModal
        visible={!!gameResult}
        result={gameResult}
        onClose={() => setGameResult(null)}
        onPlayAgain={() => {
          setGameResult(null);
          ready();
        }}
        onBack={() => {
          setGameResult(null);
          handleLeave();
        }}
      />
    </div>
  );
};

export default LandlordsRoom;