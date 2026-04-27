import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, history } from '@umijs/max';
import { useModel } from '@umijs/max';
import type { FishBattlePhase } from '@/models/fishBattleWindow';
import { Spin, message, Tooltip } from 'antd';
import { Search, Check, Shield, Heart, Swords, Clock, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useFishBattleSocket } from '@/hooks/useFishBattleSocket';
import { useFishBattleGuard } from '@/hooks/useFishBattleGuard';
import { getFishBattleSocket } from '@/services/fishBattleSocket';
import { FISH_BATTLE_HERO_ROLES } from '@/constants';
import HeroModelViewer from '@/components/FishBattle/HeroModelViewer';
import type {
  FishBattleHero,
  HeroPickPlayer,
  HeroPickStartPayload,
  HeroPickUpdatePayload,
  HeroPickCompletePayload,
  HeroSkills,
  SummonerSpell,
  HeroSkin,
} from '../types';
import './index.less';

interface HeroSelectPageProps {
  roomCode?: string;
}

const HeroSelectPage: React.FC<HeroSelectPageProps> = (props) => {
  const params = useParams<{ roomCode: string }>();
  const roomCode = props.roomCode || params.roomCode;

  const fishBattleWindow = useModel('fishBattleWindow');
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const { connect, disconnect, emit, on, off, isConnected } = useFishBattleSocket();

  const [guardRoomStatus, setGuardRoomStatus] = useState<number | null>(null);
  const [guardPlayers, setGuardPlayers] = useState<any[] | null>(null);
  const [guardIsLoadingPhase, setGuardIsLoadingPhase] = useState(false);

  // 路由守卫：被动模式，等页面获取到房间数据后校验
  useFishBattleGuard({
    page: 'heroSelect',
    roomCode,
    userId: currentUser?.id,
    roomStatus: guardRoomStatus,
    roomPlayers: guardPlayers,
    isLoadingPhase: guardIsLoadingPhase,
    onPhaseChange: fishBattleWindow.setPhase,
    onClose: fishBattleWindow.closeWindow,
  });

  // 连接管理
  useEffect(() => {
    if (!currentUser) {
      message.warning('请先登录');
      fishBattleWindow.closeWindow();
      return;
    }
    connect();
    // 不在此处 disconnect — socket 连接在游戏流程中保持
  }, [currentUser]);

  // 超时保护：15秒内仍在 loading 且未收到任何数据，跳回大厅
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && guardRoomStatus === null) {
        message.warning('连接超时，返回大厅');
        fishBattleWindow.closeWindow();
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading, guardRoomStatus]);

  // 核心状态
  const [heroes, setHeroes] = useState<FishBattleHero[]>([]);
  const [players, setPlayers] = useState<HeroPickPlayer[]>([]);
  const [countdown, setCountdown] = useState(60);
  const [duration, setDuration] = useState(60);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completeCountdown, setCompleteCountdown] = useState(5);
  const [loading, setLoading] = useState(true);

  // 皮肤和召唤师技能
  const [summonerSpells, setSummonerSpells] = useState<SummonerSpell[]>([]);
  const [heroSkins, setHeroSkins] = useState<Record<string, HeroSkin[]>>({});
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(null);
  const [selectedSpell1, setSelectedSpell1] = useState<string>('flash');
  const [selectedSpell2, setSelectedSpell2] = useState<string>('heal');
  const [editingSpellSlot, setEditingSpellSlot] = useState<1 | 2 | null>(null);

  // 动画轮播
  const [heroAnimations, setHeroAnimations] = useState<string[]>([]);
  const [activeAnimIdx, setActiveAnimIdx] = useState(0);

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const countdownRef = useRef<NodeJS.Timer | null>(null);
  const serverTimeRef = useRef<number>(0);
  const deadlineRef = useRef<number>(0);

  const myUserId = currentUser?.id;

  // 获取我的玩家信息
  const myPlayer = useMemo(
    () => players.find((p) => p.userId === myUserId),
    [players, myUserId],
  );

  // 我方队伍
  const myTeam = useMemo(() => myPlayer?.team || 'blue', [myPlayer]);

  // 只显示我方队伍的玩家
  const myTeamPlayers = useMemo(
    () =>
      players
        .filter((p) => p.team === myTeam)
        .sort((a, b) => a.slotIndex - b.slotIndex),
    [players, myTeam],
  );

  // 当前选中的英雄详情
  const selectedHero = useMemo(
    () => heroes.find((h) => h.heroId === selectedHeroId),
    [heroes, selectedHeroId],
  );

  // 解析技能JSON
  const selectedHeroSkills: HeroSkills | null = useMemo(() => {
    if (!selectedHero?.skills) return null;
    try {
      return JSON.parse(selectedHero.skills);
    } catch {
      return null;
    }
  }, [selectedHero]);

  // 当前英雄可用皮肤
  const currentSkins = useMemo(
    () => (selectedHeroId ? heroSkins[selectedHeroId] || [] : []),
    [selectedHeroId, heroSkins],
  );

  // 当前选中的皮肤
  const currentSkin = useMemo(
    () => currentSkins.find((s) => s.skinId === selectedSkinId) || currentSkins[0] || null,
    [currentSkins, selectedSkinId],
  );

  // 确认后展示的立绘：皮肤立绘 > 英雄立绘 > 英雄头像
  const displaySplashArt = useMemo(() => {
    if (currentSkin?.splashArt) return currentSkin.splashArt;
    if (selectedHero?.splashArt) return selectedHero.splashArt;
    if (selectedHero?.avatarUrl) return selectedHero.avatarUrl;
    return null;
  }, [currentSkin, selectedHero]);

  const displayModelUrl = useMemo(() => {
    if (currentSkin?.modelUrl) return currentSkin.modelUrl;
    return selectedHero?.modelUrl;
  }, [currentSkin, selectedHero]);

  // 筛选英雄列表
  const filteredHeroes = useMemo(() => {
    return heroes.filter((h) => {
      const matchSearch =
        !searchText ||
        h.name.toLowerCase().includes(searchText.toLowerCase()) ||
        h.nameEn?.toLowerCase().includes(searchText.toLowerCase()) ||
        h.heroId.toLowerCase().includes(searchText.toLowerCase());
      const matchRole = filterRole === 'all' || h.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [heroes, searchText, filterRole]);

  // 倒计时逻辑
  const startCountdown = useCallback((durationSec: number, serverTime: number) => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    serverTimeRef.current = serverTime;
    deadlineRef.current = serverTime + durationSec * 1000;
    setDuration(durationSec);

    const tick = () => {
      const now = Date.now();
      const timeDiff = now - serverTimeRef.current;
      const adjustedNow = serverTimeRef.current + timeDiff;
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - adjustedNow) / 1000));
      setCountdown(remaining);
      if (remaining <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };

    tick();
    countdownRef.current = setInterval(tick, 1000);
  }, []);

  // 请求房间信息的方法
  const requestRoomInfo = useCallback(() => {
    const socket = getFishBattleSocket();
    if (socket.connected) {
      socket.emit('room:getInfo', { roomCode });
    }
  }, [roomCode]);

  // Socket 事件处理 — 不依赖 isConnected，直接操作底层 socket
  useEffect(() => {
    const socket = getFishBattleSocket();

    // 处理 room:info 回调 — 页面加载时主动请求，恢复选英雄状态
    const handleRoomInfo = (data: any) => {
      // 提供给守卫校验
      if (data.room) {
        setGuardRoomStatus(data.room.status);
        if (data.room.isLoadingPhase) setGuardIsLoadingPhase(true);
      }
      if (data.players) setGuardPlayers(data.players);

      // 房间不在选英雄阶段（status!=1），守卫会自动跳转，无需继续处理
      if (data.room && data.room.status !== 1) {
        return;
      }

      if (data.heroes && data.heroes.length > 0) {
        setHeroes(data.heroes);
        const pickPlayers = data.heroPickPlayers || data.players || [];
        setPlayers(pickPlayers);
        const remainSec = data.heroPickRemainSeconds ?? 60;
        const totalDuration = data.heroPickDuration ?? 60;
        setDuration(totalDuration);
        setCountdown(remainSec);
        startCountdown(remainSec, Date.now());
        // 召唤师技能和皮肤数据
        if (data.summonerSpells) setSummonerSpells(data.summonerSpells);
        if (data.heroSkins) setHeroSkins(data.heroSkins);
        if (myUserId) {
          const me = pickPlayers.find((p: any) => p.userId === myUserId);
          if (me?.selectedHeroId) setSelectedHeroId(me.selectedHeroId);
          setMyConfirmed(!!me?.heroConfirmed);
          if (me?.skinId) setSelectedSkinId(me.skinId);
          if (me?.spell1) setSelectedSpell1(me.spell1);
          if (me?.spell2) setSelectedSpell2(me.spell2);
        }
        setLoading(false);
      }
    };

    const handleHeroPickStart = (data: HeroPickStartPayload) => {
      setGuardRoomStatus(1); // 选英雄阶段
      setHeroes(data.heroes || []);
      setPlayers(data.players || []);
      startCountdown(data.duration, data.serverTime);
      setLoading(false);
    };

    const handleHeroPickUpdate = (data: HeroPickUpdatePayload) => {
      setPlayers(data.players || []);
      if (myUserId) {
        const me = (data.players || []).find((p) => p.userId === myUserId);
        if (me) {
          setMyConfirmed(!!me.heroConfirmed);
        }
      }
    };

    const handleHeroPickComplete = (data: HeroPickCompletePayload) => {
      setPlayers(data.players || []);
      setIsComplete(true);
      setCompleteCountdown(5);
      let remaining = 5;
      const interval = setInterval(() => {
        remaining -= 1;
        setCompleteCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          fishBattleWindow.setPhase('loading');
        }
      }, 1000);
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

    // 连接成功后先重连房间再请求房间信息
    const handleConnect = () => {
      socket.emit('room:rejoin', { roomCode });
      socket.emit('room:getInfo', { roomCode });
    };

    socket.on('connect', handleConnect);
    socket.on('room:info', handleRoomInfo);
    socket.on('game:heroPickStart', handleHeroPickStart);
    socket.on('hero:pickUpdate', handleHeroPickUpdate);
    socket.on('game:heroPickComplete', handleHeroPickComplete);
    socket.on('room:error', handleError);

    // 如果已经连接，立即请求（先rejoin再getInfo）
    if (socket.connected) {
      socket.emit('room:rejoin', { roomCode });
      socket.emit('room:getInfo', { roomCode });
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('room:info', handleRoomInfo);
      socket.off('game:heroPickStart', handleHeroPickStart);
      socket.off('hero:pickUpdate', handleHeroPickUpdate);
      socket.off('game:heroPickComplete', handleHeroPickComplete);
      socket.off('room:error', handleError);
    };
  }, [myUserId, roomCode, startCountdown]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // 选择英雄
  const handleSelectHero = useCallback(
    (hero: FishBattleHero) => {
      if (myConfirmed) return;
      setSelectedHeroId(hero.heroId);
      setHeroAnimations([]);
      setActiveAnimIdx(0);
      // 自动选择默认皮肤
      const skins = heroSkins[hero.heroId] || [];
      const defaultSkin = skins.find((s) => s.isDefault === 1) || skins[0];
      setSelectedSkinId(defaultSkin?.skinId || null);
      emit('hero:select', {
        heroId: hero.heroId,
        heroName: hero.name,
        heroAvatarUrl: hero.avatarUrl || '',
        heroSplashArt: hero.splashArt || '',
        heroRole: hero.role,
        heroSkills: hero.skills || '',
      });
      if (defaultSkin) {
        emit('hero:selectSkin', {
          skinId: defaultSkin.skinId,
          skinSplashArt: defaultSkin.splashArt || '',
          skinModelUrl: defaultSkin.modelUrl || '',
        });
      }
    },
    [emit, myConfirmed, heroSkins],
  );

  // 选择皮肤
  const handleSelectSkin = useCallback(
    (skin: HeroSkin) => {
      if (myConfirmed) return;
      setSelectedSkinId(skin.skinId);
      setHeroAnimations([]);
      setActiveAnimIdx(0);
      emit('hero:selectSkin', {
        skinId: skin.skinId,
        skinSplashArt: skin.splashArt || '',
        skinModelUrl: skin.modelUrl || '',
      });
    },
    [emit, myConfirmed],
  );

  // 选择召唤师技能
  const handleSelectSpell = useCallback(
    (spellId: string) => {
      if (!editingSpellSlot) return;
      let newSpell1 = selectedSpell1;
      let newSpell2 = selectedSpell2;
      if (editingSpellSlot === 1) {
        if (spellId === selectedSpell2) {
          newSpell2 = selectedSpell1;
        }
        newSpell1 = spellId;
      } else {
        if (spellId === selectedSpell1) {
          newSpell1 = selectedSpell2;
        }
        newSpell2 = spellId;
      }
      setSelectedSpell1(newSpell1);
      setSelectedSpell2(newSpell2);
      setEditingSpellSlot(null);
      emit('hero:selectSpells', { spell1: newSpell1, spell2: newSpell2 });
    },
    [emit, editingSpellSlot, selectedSpell1, selectedSpell2],
  );

  // 确认锁定英雄
  const handleConfirmHero = useCallback(() => {
    if (!selectedHeroId) return;
    if (myConfirmed) {
      // 解除锁定
      emit('hero:unconfirm', {});
      setMyConfirmed(false);
    } else {
      // 锁定英雄
      emit('hero:confirm', {});
      setMyConfirmed(true);
    }
  }, [emit, selectedHeroId, myConfirmed]);

  // 渲染玩家槽位
  const renderPickSlot = (player: HeroPickPlayer, side: 'blue' | 'red') => {
    const isMe = player.userId === myUserId;
    const slotClass = [
      'pick-slot',
      isMe ? 'is-me' : '',
      player.heroConfirmed ? 'confirmed' : '',
      !player.heroConfirmed && player.selectedHeroId ? 'selecting' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div key={`${side}-${player.slotIndex}`} className={slotClass}>
        <div className="pick-slot-avatar">
          {player.heroAvatarUrl ? (
            <img src={player.heroAvatarUrl} alt={player.heroName || ''} />
          ) : player.heroEmoji ? (
            <span>{player.heroEmoji}</span>
          ) : (
            <span style={{ color: '#444', fontSize: '1rem' }}>?</span>
          )}
          {player.heroConfirmed && (
            <div className="confirmed-badge">
              <Check size={10} color="#fff" />
            </div>
          )}
        </div>
        <div className="pick-slot-info">
          <div className="pick-slot-name">
            {player.playerName || '等待中...'}
            {isMe && <span className="me-tag">我</span>}
          </div>
          <div className="pick-slot-hero">
            {player.heroName || '未选择英雄'}
          </div>
        </div>
        <div className="pick-slot-status">
          {player.heroConfirmed ? (
            <span className="status-confirmed">
              <Check size={12} /> 已锁定
            </span>
          ) : player.selectedHeroId ? (
            <span className="status-picking">选择中</span>
          ) : null}
        </div>
      </div>
    );
  };

  // 获取召唤师技能信息
  const getSpellInfo = useCallback(
    (spellId: string) => summonerSpells.find((s) => s.spellId === spellId),
    [summonerSpells],
  );

  // Loading
  if (loading) {
    return (
      <div className="hero-select-loading">
        <Spin size="large" tip="等待选英雄阶段..." />
      </div>
    );
  }

  const teamLabel = myTeam === 'blue' ? '蓝色方' : '红色方';
  const TeamIcon = myTeam === 'blue' ? Shield : Heart;

  return (
    <div className="hero-select-page">
      {/* 顶部倒计时 */}
      <div className="pick-timer-bar">
        <div className="pick-phase-label">
          <Swords size={14} style={{ marginRight: 6 }} />
          英雄选择
        </div>
        <div className={`pick-timer-text ${countdown <= 10 ? 'urgent' : ''}`}>
          {countdown}
        </div>
        <div
          className={`pick-timer-progress ${countdown <= 10 ? 'urgent' : ''}`}
          style={{ width: `${(countdown / duration) * 100}%` }}
        />
      </div>

      {/* 主内容区：三栏布局 */}
      <div className="pick-main">
        {/* 左侧：我方队伍 */}
        <div className={`team-sidebar ${myTeam}`}>
          <div className="team-sidebar-title">
            <TeamIcon size={16} />
            {teamLabel}
          </div>
          {myTeamPlayers.map((p) => renderPickSlot(p, myTeam))}
          {Array.from({ length: Math.max(0, 5 - myTeamPlayers.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="pick-slot" style={{ opacity: 0.3 }}>
              <div className="pick-slot-avatar">
                <span style={{ color: '#333', fontSize: '1rem' }}>?</span>
              </div>
              <div className="pick-slot-info">
                <div className="pick-slot-name" style={{ color: '#555' }}>空位</div>
              </div>
            </div>
          ))}
        </div>

        {/* 中间：3D 模型展示区 */}
        <div className="pick-center">
          <div className="pick-model-area">
            {selectedHero ? (
              <>
                <HeroModelViewer
                  modelUrl={displayModelUrl}
                  fallbackImage={displaySplashArt || undefined}
                  heroName={selectedHero.name}
                  heroEmoji={'🐟'}
                  autoRotate={!myConfirmed}
                  enableZoom
                  activeAnimation={heroAnimations[activeAnimIdx]}
                  onAnimationsLoaded={(names) => { setHeroAnimations(names); setActiveAnimIdx(0); }}
                />
                {heroAnimations.length > 1 && (
                  <button
                    className="anim-cycle-btn"
                    onClick={() => setActiveAnimIdx((prev) => (prev + 1) % heroAnimations.length)}
                    title="切换动画"
                  >
                    <RefreshCw size={14} /> 切换动画
                  </button>
                )}
                <div className="model-hero-info">
                  <div className="model-hero-name">{selectedHero.name}</div>
                  <div className="model-hero-role">
                    {FISH_BATTLE_HERO_ROLES[selectedHero.role] || selectedHero.role}
                  </div>
                  {currentSkin && currentSkin.skinName && (
                    <div className="model-hero-skin">{currentSkin.skinName}</div>
                  )}
                </div>
                {/* 技能预览（模型区下方） */}
                {selectedHeroSkills && (
                  <div className="model-skills">
                    {(['q', 'w', 'e', 'r'] as const).map((key) => {
                      const skill = selectedHeroSkills[key];
                      return skill ? (
                        <Tooltip key={key} title={`${skill.name}: ${skill.description}`}>
                          <div className="pick-skill">
                            {skill.icon && skill.icon.startsWith('http') ? (
                              <img src={skill.icon} alt={skill.name} className="pick-skill-icon" />
                            ) : (
                              skill.icon || key.toUpperCase()
                            )}
                            <span className="pick-skill-key">{key.toUpperCase()}</span>
                          </div>
                        </Tooltip>
                      ) : null;
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="pick-model-empty">
                <div className="pick-model-empty-icon">🐟</div>
                <div className="pick-model-empty-text">选择英雄查看3D模型</div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：英雄选择网格 */}
        <div className="pick-grid-panel">
          <div className="hero-grid-toolbar">
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input
                className="hero-search-input"
                style={{ paddingLeft: 36 }}
                placeholder="搜索英雄..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="hero-role-filters">
              <button className={`role-filter-btn ${filterRole === 'all' ? 'active' : ''}`} onClick={() => setFilterRole('all')}>全部</button>
              {Object.entries(FISH_BATTLE_HERO_ROLES).map(([key, label]) => (
                <button key={key} className={`role-filter-btn ${filterRole === key ? 'active' : ''}`} onClick={() => setFilterRole(key)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="hero-grid-scroll">
            {filteredHeroes.length === 0 ? (
              <div className="no-hero-hint">没有找到匹配的英雄</div>
            ) : (
              <div className="hero-grid">
                {filteredHeroes.map((hero) => (
                  <div
                    key={hero.heroId}
                    className={`hero-grid-item ${selectedHeroId === hero.heroId ? 'selected' : ''} ${myConfirmed ? 'disabled' : ''}`}
                    onClick={() => handleSelectHero(hero)}
                  >
                    <div className="hero-grid-avatar">
                      {hero.avatarUrl ? <img src={hero.avatarUrl} alt={hero.name} /> : <span>{'🐟'}</span>}
                    </div>
                    <div className="hero-grid-name">{hero.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="pick-bottom">
        {/* 皮肤切换区 */}
        <div className="pick-skin-area">
          {currentSkins.length > 0 ? (
            <>
              <div className="skin-area-title">皮肤</div>
              <div className="skin-list">
                {currentSkins.map((skin) => (
                  <Tooltip key={skin.skinId} title={skin.skinName}>
                    <div
                      className={`skin-item ${selectedSkinId === skin.skinId ? 'active' : ''} ${myConfirmed ? 'disabled' : ''}`}
                      onClick={() => handleSelectSkin(skin)}
                    >
                      {skin.splashArt ? (
                        <img src={skin.splashArt} alt={skin.skinName} />
                      ) : (
                        <span className="skin-item-text">{skin.skinName?.slice(0, 2)}</span>
                      )}
                    </div>
                  </Tooltip>
                ))}
              </div>
            </>
          ) : (
            <div className="skin-area-empty">
              {selectedHero ? '暂无可用皮肤' : '选择英雄查看皮肤'}
            </div>
          )}
        </div>

        {/* 召唤师技能选择区 */}
        <div className="pick-spell-area">
          <div className="spell-area-title">召唤师技能</div>
          <div className="spell-slots">
            <Tooltip title={getSpellInfo(selectedSpell1)?.name || selectedSpell1} placement="bottom">
              <div
                className={`spell-slot ${editingSpellSlot === 1 ? 'editing' : ''}`}
                onClick={() => setEditingSpellSlot(editingSpellSlot === 1 ? null : 1)}
              >
                {getSpellInfo(selectedSpell1)?.icon?.startsWith('http') ? (
                  <img src={getSpellInfo(selectedSpell1)?.icon} alt="" className="spell-slot-img" />
                ) : (
                  <span className="spell-slot-icon">{getSpellInfo(selectedSpell1)?.icon || '⚡'}</span>
                )}
                <span className="spell-slot-key">D</span>
              </div>
            </Tooltip>
            <Tooltip title={getSpellInfo(selectedSpell2)?.name || selectedSpell2} placement="bottom">
              <div
                className={`spell-slot ${editingSpellSlot === 2 ? 'editing' : ''}`}
                onClick={() => setEditingSpellSlot(editingSpellSlot === 2 ? null : 2)}
              >
                {getSpellInfo(selectedSpell2)?.icon?.startsWith('http') ? (
                  <img src={getSpellInfo(selectedSpell2)?.icon} alt="" className="spell-slot-img" />
                ) : (
                  <span className="spell-slot-icon">{getSpellInfo(selectedSpell2)?.icon || '💚'}</span>
                )}
                <span className="spell-slot-key">F</span>
              </div>
            </Tooltip>
          </div>
          {editingSpellSlot && (
            <div className="spell-picker">
              {summonerSpells.map((spell) => (
                <Tooltip key={spell.spellId} title={`${spell.name}: ${spell.description}`} placement="bottom">
                  <div
                    className={`spell-picker-item ${
                      spell.spellId === selectedSpell1 || spell.spellId === selectedSpell2 ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectSpell(spell.spellId)}
                  >
                    {spell.icon?.startsWith('http') ? (
                      <img src={spell.icon} alt={spell.name} className="spell-picker-img" />
                    ) : (
                      <span>{spell.icon}</span>
                    )}
                  </div>
                </Tooltip>
              ))}
            </div>
          )}
        </div>

        {/* 确认按钮 */}
        <div className="pick-confirm-area">
          <button
            className={`btn-confirm-hero ${myConfirmed ? 'confirmed' : ''} ${!selectedHeroId ? 'disabled' : ''}`}
            onClick={handleConfirmHero}
            disabled={!selectedHeroId}
          >
            {myConfirmed ? (
              <><Check size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />已锁定</>
            ) : (
              '锁定英雄'
            )}
          </button>
          <div className="confirm-hint">
            {myConfirmed
              ? '点击上方按钮可解除锁定'
              : selectedHeroId
                ? '点击锁定确认你的英雄'
                : '请先选择一个英雄'}
          </div>
        </div>
      </div>

      {/* 选择完成过渡动画 */}
      {isComplete && (
        <div className="pick-complete-overlay">
          <div className="pick-complete-countdown">{completeCountdown}</div>
          <div className="pick-complete-text">英雄选择完毕</div>
          <div className="pick-complete-sub">游戏即将开始...</div>
        </div>
      )}
    </div>
  );
};

export default HeroSelectPage;
