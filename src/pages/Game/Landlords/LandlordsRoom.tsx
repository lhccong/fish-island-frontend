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
import React, { useCallback, useState, useEffect } from 'react';
import { Button, Tag, message as antdMessage, Alert } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { history } from '@umijs/max';
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

const LandlordsRoom: React.FC = () => {
  const roomId = window.location.pathname.split('/').pop() || '';

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

  // 至少 2 人准备 + 3 人在场 + 房主 才可开始
  const readyCount = gameState.players?.filter((p) => p.isReady).length || 0;
  const canStart = !!isOwner && readyCount >= 2 && (gameState.players?.length || 0) >= 3;
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

  // 临时离开
  useEffect(() => {
    if (tempLeaveInfo) {
    }
  }, [tempLeaveInfo]);

  // 标准化玩家数据
  const formatPlayer = (player: PlayerState | null): PlayerState => ({
    userId: player?.userId || 0,
    userName: player?.userName || player?.nickname || '等待加入...',
    avatar: player?.avatar || '',
    cardCount: player?.cardCount || 0,
    isLandlord: player?.isLandlord || false,
    isCurrentPlayer: player?.isCurrentPlayer || false,
    isReady: player?.isReady || false,
    isOwner: player?.isOwner || false,
    isOnline: player?.isOnline ?? true,
    isRobotControlled: player?.isRobotControlled || false,
    isMe: player?.isMe || false,
    currentPlayedCards: player?.currentPlayedCards || [],
  });

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
            {gameState.players?.length || 0}/3 玩家
          </span>
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
            player={formatPlayer(leftPlayer)}
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
            player={formatPlayer(rightPlayer)}
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
            player={formatPlayer(currentUser)}
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
            borderLeft: '1px solid #e5e7eb',
          }}
        >
          <ChatSidebar
            messages={chatMessages}
            onSend={sendChat}
            currentUserId={currentUser?.userId}
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