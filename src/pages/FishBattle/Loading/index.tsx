import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useModel, history } from '@umijs/max';
import { message } from 'antd';
import type { FishBattlePhase } from '@/models/fishBattleWindow';
import { useFishBattleSocket } from '@/hooks/useFishBattleSocket';
import { useFishBattleGuard } from '@/hooks/useFishBattleGuard';
import type { FishBattleRoomPlayer, HeroPickPlayer, SummonerSpell, Team } from '../types';
import { Swords, User } from 'lucide-react';
import './index.less';

const tipTexts = [
  '技巧：团战中优先集火脆皮英雄！',
  '技巧：坦克英雄站在前排吸收伤害！',
  '技巧：辅助英雄记得给队友加血！',
  '技巧：射手英雄保持安全距离输出！',
  '技巧：法师英雄在团战中释放AOE技能！',
  '技巧：连胜可以获得额外积分奖励！',
  '技巧：MVP可以额外获得10积分！',
];

const DEFAULT_SPLASH_ART = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22280%22 height=%22280%22 viewBox=%220 0 280 280%22%3E%3Crect width=%22280%22 height=%22280%22 fill=%22%23081620%22/%3E%3Cpath d=%22M40 220 L140 48 L240 220 Z%22 fill=%22%23153045%22 stroke=%22%233a7ca5%22 stroke-width=%224%22/%3E%3Ccircle cx=%22140%22 cy=%22124%22 r=%2232%22 fill=%22%232a6a8a%22/%3E%3C/svg%3E';

type LoadingSlot = HeroPickPlayer & { isPlaceholder?: boolean };

interface FishBattleLoadingProps {
  roomCode?: string;
}

const FishBattleLoading: React.FC<FishBattleLoadingProps> = (props) => {
  const params = useParams<{ roomCode: string }>();
  const roomCode = props.roomCode || params.roomCode;

  const fishBattleWindow = useModel('fishBattleWindow');
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const { status, connect, emit, on, off } = useFishBattleSocket();
  const [tip] = useState(() => tipTexts[Math.floor(Math.random() * tipTexts.length)]);
  const [players, setPlayers] = useState<HeroPickPlayer[]>([]);
  const [spellsMap, setSpellsMap] = useState<Record<string, SummonerSpell>>({});
  const [guardRoomStatus, setGuardRoomStatus] = useState<number | null>(null);
  const [guardPlayers, setGuardPlayers] = useState<FishBattleRoomPlayer[] | null>(null);
  const [guardIsLoadingPhase, setGuardIsLoadingPhase] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const latestPlayersRef = useRef<HeroPickPlayer[]>([]);
  const hasSentLoadedRef = useRef(false);

  // 从玩家列表构建阵容
  const buildTeamSlots = (team: Team): LoadingSlot[] => {
    const teamPlayers = players
      .filter((player) => player.team === team)
      .sort((a, b) => a.slotIndex - b.slotIndex);
    const slotMap = new Map(teamPlayers.map((player) => [player.slotIndex, player]));

    return Array.from({ length: 5 }, (_, slotIndex) => {
      const player = slotMap.get(slotIndex);
      if (player) {
        return player;
      }
      return {
        userId: -1 - slotIndex,
        playerName: '等待玩家',
        userAvatar: '',
        team,
        slotIndex,
        heroConfirmed: false,
        loadingProgress: 0,
        loaded: false,
        isPlaceholder: true,
      };
    });
  };

  const blueTeamSlots = useMemo(() => buildTeamSlots('blue'), [players]);
  const redTeamSlots = useMemo(() => buildTeamSlots('red'), [players]);
  const myPlayer = useMemo(
    () => players.find((player) => Number(player.userId) === Number(currentUser?.id)) || null,
    [players, currentUser?.id],
  );
  const loadingSummaryText = totalPlayers > 0 ? `🐟 房间加载进度 ${loadedCount}/${totalPlayers} 🐟` : '🐟 全员战斗加成 · 随机皮肤已激活 🐟';

  const syncLoadingState = (data: {
    room?: { status?: number; isLoadingPhase?: boolean };
    players?: HeroPickPlayer[];
    summonerSpells?: SummonerSpell[];
    loadedCount?: number;
    totalPlayers?: number;
  }) => {
    const nextPlayers = Array.isArray(data.players) ? data.players : [];
    setPlayers(nextPlayers);
    setGuardPlayers(nextPlayers as FishBattleRoomPlayer[]);
    if (data.room && typeof data.room.status === 'number') {
      setGuardRoomStatus(data.room.status);
      // 断线重连：status=2 且不在加载阶段 — 暂时停留在加载界面
      // TODO: 恢复跳转 fishBattleWindow.setPhase('battle3d');
      if (data.room.status === 2 && !data.room.isLoadingPhase) {
        console.log('[Loading] reconnect status=2 — 暂停跳转');
        return;
      }
    }
    if (data.room?.isLoadingPhase) {
      setGuardIsLoadingPhase(true);
    }
    if (Array.isArray(data.summonerSpells)) {
      const nextSpellMap = data.summonerSpells.reduce<Record<string, SummonerSpell>>((acc, spell) => {
        acc[spell.spellId] = spell;
        return acc;
      }, {});
      setSpellsMap(nextSpellMap);
    }
    setLoadedCount(
      typeof data.loadedCount === 'number'
        ? data.loadedCount
        : nextPlayers.filter((player) => player.loaded).length,
    );
    setTotalPlayers(typeof data.totalPlayers === 'number' ? data.totalPlayers : nextPlayers.length);
  };

  const handleAvatarError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.display = 'none';
  };

  const handleSplashError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (target.src !== DEFAULT_SPLASH_ART) {
      target.src = DEFAULT_SPLASH_ART;
    }
  };

  const getSpellFallbackText = (spell?: SummonerSpell, spellId?: string, index?: number) => {
    if (spell?.name) {
      return spell.name.slice(0, 1);
    }
    if (spellId) {
      return spellId.slice(0, 1).toUpperCase();
    }
    return index === 0 ? 'D' : 'F';
  };

  const renderSpellIcon = (spellId?: string, index = 0) => {
    const spell = spellId ? spellsMap[spellId] : undefined;
    const fallbackText = getSpellFallbackText(spell, spellId, index);

    return (
      <div key={`${spellId || 'empty'}-${index}`} className="spell-icon" title={spell?.name || '召唤师技能'}>
        {spell?.icon ? (
          <img
            src={spell.icon}
            alt={spell.name}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <span className={`spell-fallback-text ${spell?.icon ? 'has-icon' : ''}`}>{fallbackText}</span>
      </div>
    );
  };

  const renderPlayerCard = (player: LoadingSlot, side: Team) => {
    const splashArt = player.skinSplashArt || player.heroSplashArt || player.heroAvatarUrl || DEFAULT_SPLASH_ART;
    const progress = Math.max(0, Math.min(100, Math.round(player.loadingProgress || 0)));
    const isMe = !player.isPlaceholder && Number(player.userId) === Number(currentUser?.id);
    const cardClassName = `summoner-card ${player.isPlaceholder ? 'placeholder-card' : ''} ${isMe ? 'my-summoner-card' : ''}`;

    return (
      <div key={`${side}-${player.slotIndex}`} className={cardClassName}>
        <div className="champion-splash">
          {player.isPlaceholder ? (
            <div className="placeholder-splash">等待玩家</div>
          ) : (
            <img src={splashArt} alt={player.heroName || player.playerName} onError={handleSplashError} />
          )}
        </div>
        <div className="summoner-details">
          <div className="summoner-name-row">
            <div className="summoner-avatar">
              {player.isPlaceholder ? null : (
                player.userAvatar ? (
                  <img
                    src={player.userAvatar}
                    alt={player.playerName}
                    onError={handleAvatarError}
                  />
                ) : (
                  <User size={14} />
                )
              )}
            </div>
            <span className="summoner-name">{player.playerName || '等待玩家'}</span>
            {isMe ? <span className="my-player-badge">我</span> : null}
            <span className="champion-name">{player.heroName || '未选定'}</span>
          </div>
          {!player.isPlaceholder && (
            <div className="spells-runes">
              <div className="summoner-spells">
                {renderSpellIcon(player.spell1 || 'flash', 0)}
                {renderSpellIcon(player.spell2 || 'heal', 1)}
              </div>
              <div className="runes" />
            </div>
          )}
          <div className="loading-progress">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${player.isPlaceholder ? 0 : progress}%` }} />
            </div>
            <span className="progress-percent">{player.isPlaceholder ? '--%' : `${progress}%`}</span>
          </div>
          {isMe ? <div className="my-player-hint">当前操控：{side === 'blue' ? '蓝色方' : '红色方'}</div> : null}
        </div>
      </div>
    );
  };

  // 路由守卫：被动模式，等页面获取到房间数据后校验
  useFishBattleGuard({
    page: 'loading',
    roomCode,
    userId: currentUser?.id,
    roomStatus: guardRoomStatus,
    roomPlayers: guardPlayers,
    isLoadingPhase: guardIsLoadingPhase,
    onPhaseChange: fishBattleWindow.setPhase,
    onClose: fishBattleWindow.closeWindow,
  });

  useEffect(() => {
    latestPlayersRef.current = players;
  }, [players]);

  useEffect(() => {
    hasSentLoadedRef.current = false;
  }, [roomCode, currentUser?.id]);

  useEffect(() => {
    if (!currentUser) {
      message.warning('请先登录');
      fishBattleWindow.closeWindow();
      return;
    }
    // 确保 socket 已连接（断线重连场景下可能 socket 尚未连接）
    connect();
  }, [currentUser]);

  useEffect(() => {
    if (status !== 'connected' || !roomCode) return;

    // 请求房间信息获取英雄阵容
    const handleRoomInfo = (data: {
      room?: { status?: number };
      players?: HeroPickPlayer[];
      summonerSpells?: SummonerSpell[];
      loadedCount?: number;
      totalPlayers?: number;
    }) => {
      syncLoadingState(data);
    };

    const handleLoadingProgressUpdate = (data: {
      players?: HeroPickPlayer[];
      loadedCount?: number;
      totalPlayers?: number;
    }) => {
      syncLoadingState(data);
    };

    const handleAllPlayersLoaded = () => {
      // 全员加载完成 — 暂时停留在加载界面，不跳转
      // TODO: 恢复跳转 fishBattleWindow.setPhase('battle3d');
      console.log('[Loading] allPlayersLoaded — 暂停跳转');
    };

    const handleError = (data: { error: string }) => {
      if (data?.error) {
        message.error(data.error);
        // 房间不存在或不在房间中时，自动跳回大厅
        if (data.error.includes('返回大厅') || data.error.includes('不存在') || data.error.includes('已关闭')) {
          setTimeout(() => {
            fishBattleWindow.closeWindow();
          }, 1500);
        }
      }
    };

    on('room:info', handleRoomInfo);
    on('room:error', handleError);
    on('game:loadingProgressUpdate', handleLoadingProgressUpdate);
    on('game:allPlayersLoaded', handleAllPlayersLoaded);
    // 先重连房间（断线重连场景），再请求房间信息
    emit('room:rejoin', { roomCode });
    emit('room:getInfo', { roomCode });

    return () => {
      off('room:info', handleRoomInfo);
      off('room:error', handleError);
      off('game:loadingProgressUpdate', handleLoadingProgressUpdate);
      off('game:allPlayersLoaded', handleAllPlayersLoaded);
    };
  }, [status, roomCode]);

  useEffect(() => {
    if (status !== 'connected' || !roomCode || !currentUser?.id || !myPlayer || myPlayer.loaded || hasSentLoadedRef.current) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const current = latestPlayersRef.current.find((player) => Number(player.userId) === Number(currentUser.id));
      if (!current || current.loaded) {
        window.clearInterval(timer);
        return;
      }
      const currentProgress = current.loadingProgress || 0;
      const increment = currentProgress >= 90
        ? Math.floor(Math.random() * 4) + 2
        : Math.floor(Math.random() * 14) + 6;
      const nextProgress = Math.min(100, currentProgress + increment);
      emit('game:loadingProgress', { roomCode, progress: nextProgress });
      if (nextProgress >= 100 && !hasSentLoadedRef.current) {
        hasSentLoadedRef.current = true;
        emit('game:loaded', { roomCode });
        window.clearInterval(timer);
      }
    }, 700);

    return () => {
      window.clearInterval(timer);
    };
  }, [status, roomCode, currentUser?.id, myPlayer?.userId, myPlayer?.loaded]);

  return (
    <div className="fish-battle-loading-wrapper">
    <div className="fish-battle-loading">
      {/* Grid background */}
      <div className="loading-grid-bg" />

      {/* Particles */}
      <div className="loading-particles">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="l-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="loading-content">
        {/* My Hero Card */}
        <div className="loading-screen">
          <div className="loading-header">
            <div className="loading-mode-info">
              <div className="loading-mode-icon">
                <Swords size={22} />
              </div>
              <div className="loading-mode-text">
                摸鱼大乱斗
              </div>
            </div>
            <div className="loading-connection-status">
              <div className="loading-ping">{status === 'connected' ? `🐟 已连接 · ${loadedCount}/${totalPlayers || 0}` : '🐟 连接中'}</div>
              <div className="loading-spinner" />
            </div>
          </div>

          {/* Team Lineups */}
          <div className="teams-rows">
            <div className="team-row blue-team">
              <div className="team-header">
                <span className="team-name">⚔️ 蓝色方</span>
                {myPlayer?.team === 'blue' ? <span className="my-team-chip">我方阵营</span> : null}
              </div>
              <div className="player-grid">
                {blueTeamSlots.map((player) => renderPlayerCard(player, 'blue'))}
              </div>
            </div>
            <div className="team-row red-team">
              <div className="team-header">
                <span className="team-name">🔥 红色方</span>
                {myPlayer?.team === 'red' ? <span className="my-team-chip">我方阵营</span> : null}
              </div>
              <div className="player-grid">
                {redTeamSlots.map((player) => renderPlayerCard(player, 'red'))}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="loading-footer">
            <div className="loading-tip">{loadedCount >= totalPlayers && totalPlayers > 0 ? loadingSummaryText : `🐟 ${tip} 🐟`}</div>
            <div>摸鱼大乱斗 · v1.0</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default FishBattleLoading;
