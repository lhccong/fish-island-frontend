import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Spin, message, Pagination, Modal } from 'antd';
import { history, useModel, useLocation } from '@umijs/max';
import { fishBattleStatsUser, fishBattleRoomMyActiveRoom } from '@/services/backend/fishBattleController';
import type { FishBattleRoom, FishBattleOverview, FishBattleUserStats } from '../types';
import { FISH_BATTLE_ROOM_STATUS } from '@/constants';
import { useFishBattleSocket } from '@/hooks/useFishBattleSocket';
import {
  Fish, Gamepad2, Home, CircleDot, Swords, RefreshCw, Plus, Bot,
  Zap, BarChart3, Flag, X as XIcon, Eye, Lock,
} from 'lucide-react';
import { isFishBattleWindowOpen } from '@/models/fishBattleWindow';
import './index.less';

const FishBattleLobby: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const fishBattleWindow = useModel('fishBattleWindow');
  const { connect, disconnect, emit, on, off, isConnected } = useFishBattleSocket();

  // 辅助函数：根据房间状态打开浮动窗口
  const openGameWindow = useCallback((roomCode: string, status: number, isLoadingPhase?: boolean) => {
    // 如果浮动窗口已打开且是同一房间，不重置阶段，仅还原窗口
    if (fishBattleWindow.visible && fishBattleWindow.roomCode === roomCode) {
      if (fishBattleWindow.isMinimized) {
        fishBattleWindow.toggleMinimize();
      }
      return;
    }
    if (status === 1 && !isLoadingPhase) {
      fishBattleWindow.openWindow(roomCode, 'heroSelect');
    } else {
      // status=2 也走 loading 中转：Loading 会发送 room:rejoin 恢复在线状态，
      // 然后 syncLoadingState 检测到 status=2 && !isLoadingPhase 自动跳转 battle3d
      fishBattleWindow.openWindow(roomCode, 'loading');
    }
  }, [fishBattleWindow]);
  const location = useLocation();
  const [rooms, setRooms] = useState<FishBattleRoom[]>([]);
  const [overview, setOverview] = useState<FishBattleOverview>({ onlineCount: 0, totalGames: 0, fightingCount: 0, fightingPlayers: [] });
  const [userStats, setUserStats] = useState<FishBattleUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [aiFill, setAiFill] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [myActiveRooms, setMyActiveRooms] = useState<Record<string, { status: number; isLoadingPhase?: boolean }>>({});
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_REFRESH_INTERVAL = 30_000;

  // 断线重连检查：进入大厅时检查是否有未结束的对局
  // 如果浮动窗口已打开（刚从 Room 跳过来），跳过弹窗
  useEffect(() => {
    if (!currentUser) return;
    fishBattleRoomMyActiveRoom().then((res) => {
      const data = (res?.data || []) as any[];
      if (Array.isArray(data) && data.length > 0) {
        const nextActiveRooms: Record<string, { status: number; isLoadingPhase?: boolean }> = {};
        data.forEach((item) => {
          if (item?.roomCode) {
            nextActiveRooms[item.roomCode] = { status: item.status, isLoadingPhase: !!item.isLoadingPhase };
          }
        });
        setMyActiveRooms(nextActiveRooms);

        // 浮动窗口已打开时，不弹窗打扰（用户已在游戏中）
        // 使用 localStorage 同步检测，避免 React 状态更新时序问题
        if (isFishBattleWindowOpen()) return;

        if (data.length === 1) {
          // 只有一场：直接弹窗确认
          const room = data[0];
          const isLoading = room.status === 1 && room.isLoadingPhase;
          const statusText = isLoading ? '加载中' : room.status === 1 ? '选英雄中' : '对局中';
          Modal.confirm({
            title: '你有一场进行中的对局',
            content: `房间「${room.roomName || room.roomCode}」正在${statusText}，是否重新进入？`,
            okText: '重新进入',
            cancelText: '留在大厅',
            onOk: () => {
              openGameWindow(room.roomCode, room.status, room.isLoadingPhase);
            },
          });
        } else {
          // 多场对局：逐个弹窗让用户选择
          let idx = 0;
          const showNext = () => {
            if (idx >= data.length) return;
            const room = data[idx];
            const isLoading2 = room.status === 1 && room.isLoadingPhase;
            const statusText = isLoading2 ? '加载中' : room.status === 1 ? '选英雄中' : '对局中';
            Modal.confirm({
              title: `进行中的对局 (${idx + 1}/${data.length})`,
              content: `房间「${room.roomName || room.roomCode}」正在${statusText}，是否重新进入？`,
              okText: '进入此房间',
              cancelText: idx < data.length - 1 ? '查看下一场' : '留在大厅',
              onOk: () => {
                openGameWindow(room.roomCode, room.status, room.isLoadingPhase);
              },
              onCancel: () => {
                idx++;
                showNext();
              },
            });
          };
          showNext();
        }
      }
    }).catch(() => {});
  }, [currentUser]);

  // 请求大厅数据（全部走Socket）
  const fetchLobbyData = useCallback((silent = false) => {
    if (!silent) {
      setLoading(true);
      // 超时兗底：5秒内未收到数据则取消loading，避免无限转圈
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = setTimeout(() => {
        setLoading(false);
      }, 5000);
    }
    emit('lobby:getRooms', {});
    emit('lobby:getOverview', {});
    // 个人统计仍走REST（这是用户自己的DB数据）
    fishBattleStatsUser().then((res) => {
      if (res?.data) setUserStats(res.data as FishBattleUserStats);
    }).catch(console.error);
  }, [emit]);

  // 手动刷新（带防抖 + 旋转动画）
  const handleManualRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    fetchLobbyData();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshing, fetchLobbyData]);

  // 路由变化时连接Socket
  useEffect(() => {
    if (!currentUser) {
      message.warning('请先登录后再进入游戏大厅');
      history.push('/fishBattle/home');
      return;
    }
    connect();
    return () => {
      emit('lobby:leave', {});
      // 不在此处 disconnect — socket 连接在游戏流程中应保持单例复用
      // 仅退出大厅频道，避免销毁后重建连接导致的竞态问题
    };
  }, [location.key]);

  // Socket断连时取消loading
  useEffect(() => {
    if (!isConnected && loading) {
      setLoading(false);
    }
  }, [isConnected]);

  // 定时静默刷新（30秒一次，作为实时推送的兗底）
  useEffect(() => {
    if (!isConnected) return;
    autoRefreshRef.current = setInterval(() => {
      fetchLobbyData(true);
    }, AUTO_REFRESH_INTERVAL);
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [isConnected, fetchLobbyData]);

  // Socket连接成功后加入大厅并拉取数据
  useEffect(() => {
    if (!isConnected || !currentUser) return;

    // 加入大厅频道
    emit('lobby:join', {});

    // 监听大厅数据响应
    const handleRoomList = (data: { rooms: FishBattleRoom[]; total: number }) => {
      setRooms(data.rooms || []);
      setCurrentPage(1);
      setLoading(false);
      if (loadingTimerRef.current) { clearTimeout(loadingTimerRef.current); loadingTimerRef.current = null; }
    };

    const handleOverview = (data: { onlineCount: number; roomCount: number; fightingCount: number; fightingPlayers: { userId: number; userName: string }[] }) => {
      setOverview({
        onlineCount: data.onlineCount || 0,
        totalGames: data.roomCount || 0,
        fightingCount: data.fightingCount || 0,
        fightingPlayers: data.fightingPlayers || [],
      });
    };

    // 监听大厅实时推送
    const handleRoomCreated = (data: { room: FishBattleRoom }) => {
      if (data.room) {
        setRooms((prev) => {
          if (prev.some((r) => r.roomCode === data.room.roomCode)) {
            return prev.map((r) => r.roomCode === data.room.roomCode ? data.room : r);
          }
          return [data.room, ...prev];
        });
      }
    };

    const handleRoomUpdated = (data: { room: FishBattleRoom }) => {
      if (data.room) {
        setRooms((prev) =>
          prev.map((r) => r.roomCode === data.room.roomCode ? data.room : r),
        );
      }
    };

    const handleRoomRemoved = (data: { roomCode: string }) => {
      if (data.roomCode) {
        setRooms((prev) => prev.filter((r) => r.roomCode !== data.roomCode));
      }
    };

    on('lobby:roomList', handleRoomList);
    on('lobby:overview', handleOverview);
    on('lobby:roomCreated', handleRoomCreated);
    on('lobby:roomUpdated', handleRoomUpdated);
    on('lobby:roomRemoved', handleRoomRemoved);

    // 拉取初始数据
    fetchLobbyData();

    return () => {
      off('lobby:roomList', handleRoomList);
      off('lobby:overview', handleOverview);
      off('lobby:roomCreated', handleRoomCreated);
      off('lobby:roomUpdated', handleRoomUpdated);
      off('lobby:roomRemoved', handleRoomRemoved);
    };
  }, [isConnected]);

  // 创建房间（Socket）
  useEffect(() => {
    if (!isConnected) return;

    const handleRoomCreatedForMe = (data: { roomCode: string }) => {
      if (data.roomCode) {
        setCreating(false);
        setCreateModalOpen(false);
        setRoomName('');
        message.success('房间创建成功！');
        history.push(`/fishBattle/room/${data.roomCode}`);
      }
    };

    const handleError = (data: { error: string; existingRoomCode?: string; existingRoomStatus?: number; existingRoomName?: string }) => {
      setCreating(false);
      if (data.existingRoomCode) {
        const roomCode = data.existingRoomCode;
        const status = data.existingRoomStatus ?? 0;
        const roomName = data.existingRoomName || roomCode;
        const statusText = status === 1 ? '选英雄中' : status === 2 ? '对局中' : '等待中';
        Modal.confirm({
          title: '你已在其他房间中',
          content: `房间「${roomName}」(#${roomCode}) 当前${statusText}，是否前往该房间？`,
          okText: '前往房间',
          cancelText: '留在大厅',
          onOk: () => {
            if (status === 0) {
              history.push(`/fishBattle/room/${roomCode}`);
            } else {
              openGameWindow(roomCode, status);
            }
          },
        });
      } else {
        message.error(data.error || '操作失败');
      }
    };

    on('room:created', handleRoomCreatedForMe);
    on('room:error', handleError);

    return () => {
      off('room:created', handleRoomCreatedForMe);
      off('room:error', handleError);
    };
  }, [isConnected]);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      message.warning('请输入房间名称');
      return;
    }
    setCreating(true);
    emit('room:create', {
      roomName: roomName.trim(),
      gameMode: 'classic',
      aiFillEnabled: aiFill,
      userId: currentUser?.id,
      userName: currentUser?.userName || '未知玩家',
    });
  };

  // 前端分页 + 搜索 + 过滤（数据全在内存）
  const filteredRooms = rooms.filter((r) => {
    const matchSearch = !searchText || r.roomName?.includes(searchText) || r.roomCode?.includes(searchText.toUpperCase());
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'waiting' && r.status === FISH_BATTLE_ROOM_STATUS.WAITING)
      || (filterStatus === 'playing' && (r.status === FISH_BATTLE_ROOM_STATUS.PLAYING || r.status === FISH_BATTLE_ROOM_STATUS.HERO_PICKING));
    return matchSearch && matchStatus;
  });
  const totalFiltered = filteredRooms.length;
  const pagedRooms = filteredRooms.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getRoomStatusText = (status: number) => {
    if (status === FISH_BATTLE_ROOM_STATUS.WAITING) return '等待中';
    if (status === FISH_BATTLE_ROOM_STATUS.HERO_PICKING) return '选英雄中';
    if (status === FISH_BATTLE_ROOM_STATUS.PLAYING) return '对局中';
    return '已结束';
  };

  const getRoomStatusClass = (status: number) => {
    if (status === FISH_BATTLE_ROOM_STATUS.WAITING) return 'status-waiting';
    if (status === FISH_BATTLE_ROOM_STATUS.HERO_PICKING || status === FISH_BATTLE_ROOM_STATUS.PLAYING) return 'status-playing';
    return 'status-ended';
  };

  const winRate = userStats && userStats.totalGames > 0
    ? Math.round((userStats.wins / userStats.totalGames) * 100)
    : 0;

  return (
    <Spin spinning={loading}>
      <div className="fish-battle-lobby">
        <div className="lobby-main">
          {/* Header */}
          <div className="lobby-header">
            <div className="lobby-header-left">
              <h2 className="lobby-title"><Gamepad2 size={22} className="title-icon" /> 游戏大厅</h2>
              <div className="lobby-stats">
                <span className="lobby-stat-badge rooms">
                  <Home size={14} /> {rooms.length} 个房间
                </span>
                <span className="lobby-stat-badge games">
                  <CircleDot size={14} /> 在线 {overview.onlineCount} 人
                </span>
                <span className="lobby-stat-badge fighting">
                  <Swords size={14} /> {overview.fightingCount} 人战斗中
                </span>
              </div>
            </div>
            <div className="lobby-header-right">
              <button className="btn-refresh" onClick={handleManualRefresh} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} /> {refreshing ? '刷新中...' : '刷新'}</button>
              <button className="btn-create-room" onClick={() => setCreateModalOpen(true)}>
                <Plus size={14} /> 创建房间
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-box">
              <input
                type="text"
                placeholder="搜索房间号或房间名..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="filter-chips">
              <button
                className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                全部
              </button>
              <button
                className={`filter-chip ${filterStatus === 'waiting' ? 'active' : ''}`}
                onClick={() => setFilterStatus('waiting')}
              >
                等待中
              </button>
              <button
                className={`filter-chip ${filterStatus === 'playing' ? 'active' : ''}`}
                onClick={() => setFilterStatus('playing')}
              >
                对局中
              </button>
            </div>
          </div>

          <div className="lobby-content">
            {/* Room List */}
            <div className="room-list-area">
              {filteredRooms.length === 0 ? (
                <div className="lobby-empty">
                  <div className="empty-icon"><Fish size={48} /></div>
                  <div className="empty-text">暂无可加入的房间</div>
                  <button className="btn-create-first" onClick={() => setCreateModalOpen(true)}>
                    <Plus size={14} /> 创建第一个房间
                  </button>
                </div>
              ) : (
                <div className="room-list">
                  {(() => {
                    const waitingRooms = pagedRooms.filter((r) => r.status === FISH_BATTLE_ROOM_STATUS.WAITING);
                    const inProgressRooms = pagedRooms.filter((r) => r.status === FISH_BATTLE_ROOM_STATUS.HERO_PICKING || r.status === FISH_BATTLE_ROOM_STATUS.PLAYING);

                    const renderRoomCard = (room: FishBattleRoom) => {
                      const isWaiting = room.status === FISH_BATTLE_ROOM_STATUS.WAITING;
                      const isHeroPicking = room.status === FISH_BATTLE_ROOM_STATUS.HERO_PICKING;
                      const isInGame = room.status === FISH_BATTLE_ROOM_STATUS.PLAYING;
                      const isActive = isHeroPicking || isInGame;
                      const statusCls = isWaiting ? 'waiting' : isActive ? 'playing' : 'ended';
                      const isFull = room.currentPlayers >= room.maxPlayers;
                      const canJoin = isWaiting && !isFull;

                      const myActiveRoomInfo = myActiveRooms[room.roomCode];
                      const isMyActiveRoom = myActiveRoomInfo !== undefined;

                      const handleCardClick = () => {
                        if (isMyActiveRoom) {
                          openGameWindow(room.roomCode, myActiveRoomInfo.status, myActiveRoomInfo.isLoadingPhase);
                        } else if (canJoin) {
                          history.push(`/fishBattle/room/${room.roomCode}`);
                        } else if (isActive) {
                          message.info('该房间正在游戏中，无法加入');
                        } else if (isFull) {
                          message.info('房间已满');
                        }
                      };

                      return (
                        <div
                          key={room.roomCode}
                          className={`room-card ${statusCls} ${!canJoin && !isMyActiveRoom ? 'disabled' : ''} ${isMyActiveRoom ? 'my-active' : ''}`}
                          onClick={handleCardClick}
                        >
                          <div className="room-card-icon">
                            {isWaiting ? <Fish size={20} /> : isActive ? <Swords size={20} /> : <Flag size={20} />}
                          </div>
                          <div className="room-card-info">
                            <div className="room-card-name">
                              {room.roomName}
                              <span className={`room-card-status status-${statusCls}`}>
                                {isActive && <Lock size={10} style={{ marginRight: 3 }} />}
                                {getRoomStatusText(room.status)}
                              </span>
                            </div>
                            <div className="room-card-meta">
                              <span>房间号: #{room.roomCode}</span>
                              <span>房主: {room.creatorName || `玩家${room.creatorId}`}</span>
                              {room.aiFillEnabled ? <span><Bot size={12} /> AI补位</span> : null}
                            </div>
                          </div>
                          <div className="room-card-actions">
                            <div className="room-card-players">
                              <span className="current">{room.currentPlayers}</span>
                              <span className="max">/ {room.maxPlayers}</span>
                            </div>
                            {isMyActiveRoom ? (
                              <button
                                className="btn-rejoin"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openGameWindow(room.roomCode, myActiveRoomInfo?.status ?? 1, myActiveRoomInfo?.isLoadingPhase);
                                }}
                              >
                                <Zap size={12} /> 重新加入
                              </button>
                            ) : isInGame ? (
                              <button
                                className="btn-spectate"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  message.info('观战功能即将开放');
                                }}
                              >
                                <Eye size={12} /> 观战
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {waitingRooms.length > 0 && (
                          <>
                            <div className="room-section-title"><Fish size={16} /> 等待中的房间 ({waitingRooms.length})</div>
                            {waitingRooms.map(renderRoomCard)}
                          </>
                        )}
                        {inProgressRooms.length > 0 && (
                          <>
                            <div className="room-section-title in-progress"><Swords size={16} /> 进行中的对局 ({inProgressRooms.length})</div>
                            {inProgressRooms.map(renderRoomCard)}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {/* 分页 */}
              <div className="room-pagination">
                <Pagination
                  current={currentPage}
                  total={totalFiltered}
                  pageSize={pageSize}
                  onChange={(page, size) => {
                    setCurrentPage(page);
                    if (size && size !== pageSize) {
                      setPageSize(size);
                      setCurrentPage(1);
                    }
                  }}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 个房间`}
                  pageSizeOptions={['5', '10', '20', '50']}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="lobby-sidebar">
              {/* Quick Match */}
              <div className="sidebar-card">
                <h3 className="sidebar-card-title"><Zap size={16} /> 快速匹配</h3>
                <p className="sidebar-card-desc">自动加入可用房间或创建新房间</p>
                <button className="btn-quick-match">开始匹配</button>
              </div>

              {/* My Stats Mini */}
              <div className="sidebar-card">
                <h3 className="sidebar-card-title"><BarChart3 size={16} /> 我的战绩</h3>
                <div className="mini-stats">
                  <div className="mini-stat-item">
                    <span className="mini-stat-value">{userStats?.totalGames || 0}</span>
                    <span className="mini-stat-label">总场次</span>
                  </div>
                  <div className="mini-stat-item">
                    <span className="mini-stat-value win">{userStats?.wins || 0}</span>
                    <span className="mini-stat-label">胜场</span>
                  </div>
                  <div className="mini-stat-item">
                    <span className="mini-stat-value">{winRate}%</span>
                    <span className="mini-stat-label">胜率</span>
                  </div>
                </div>
                <button className="btn-view-profile" onClick={() => history.push('/fishBattle/profile')}>
                  查看详情 →
                </button>
              </div>

              {/* 战斗中玩家 */}
              <div className="sidebar-card">
                <h3 className="sidebar-card-title"><Swords size={16} /> 战斗中玩家 ({overview.fightingCount})</h3>
                <div className="online-players-list">
                  {overview.fightingPlayers.length > 0 ? (
                    overview.fightingPlayers.map((p) => (
                      <div key={p.userId} className="online-player">
                        <div className="online-player-avatar"><Swords size={14} /></div>
                        <span className="online-player-name">{p.userName}</span>
                        <span className="online-player-status fighting">战斗中</span>
                      </div>
                    ))
                  ) : (
                    <div className="online-player empty-hint">暂无玩家在战斗中</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Room Modal */}
        {createModalOpen && (
          <div className="modal-overlay" onClick={() => setCreateModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Plus size={16} /> 创建新房间</h3>
                <button className="modal-close" onClick={() => setCreateModalOpen(false)}><XIcon size={16} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>房间名称</label>
                  <input
                    type="text"
                    placeholder="给你的房间起个名字..."
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="form-group">
                  <label>游戏模式</label>
                  <div className="mode-selector">
                    <div className="mode-option active">
                      <span className="mode-icon"><Swords size={18} /></span>
                      <span className="mode-name">经典5v5</span>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <div className="toggle-row">
                    <div>
                      <label>AI补位</label>
                      <span className="form-hint">开启后空位将由AI自动填补</span>
                    </div>
                    <div
                      className={`toggle-switch ${aiFill ? 'on' : ''}`}
                      onClick={() => setAiFill(!aiFill)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-modal-cancel" onClick={() => setCreateModalOpen(false)}>取消</button>
                <button
                  className="btn-modal-confirm"
                  onClick={handleCreateRoom}
                  disabled={creating}
                >
                  {creating ? '创建中...' : '创建房间'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Spin>
  );
};

export default FishBattleLobby;
