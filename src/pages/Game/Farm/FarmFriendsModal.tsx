import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Empty, Spin, message } from 'antd';
import {
  CloseOutlined,
  MailOutlined,
  PlusOutlined,
  SearchOutlined,
  CaretDownOutlined,
  GiftOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import { listFriendsUsingGet } from '@/services/backend/farmFriendController';
import { toUserIdString } from '@/utils/farmNavigate';
import './FarmFriendsModal.less';

export type FriendTab = 'play' | 'wechat' | 'invite' | 'visitor';

type SortOrder = 'levelDesc' | 'levelAsc';

const TABS: { key: FriendTab; label: string }[] = [
  { key: 'play', label: '同玩好友' },
  { key: 'wechat', label: '微信好友' },
  { key: 'invite', label: '邀请' },
  { key: 'visitor', label: '访客' },
];

const PLACEHOLDER_TABS: FriendTab[] = ['wechat', 'invite'];

const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=farm-friend';

const STEALER_AVATAR =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=farm-stealer';

const formatStealCooldown = (cooldown?: string): string | null => {
  if (!cooldown) return null;
  const remain = new Date(cooldown).getTime() - Date.now();
  if (remain <= 0) return null;
  const min = Math.ceil(remain / 60000);
  return min >= 60 ? `${Math.ceil(min / 60)}小时` : `${min}分钟`;
};

export const getFriendUserId = (friend: API.FarmFriendListVO): string | undefined =>
  toUserIdString(friend.friendId ?? friend.systemUserId);

export interface FarmFriendsModalProps {
  open: boolean;
  onClose: () => void;
  myLevel?: number;
  myNickname?: string;
  myAvatar?: string;
  initialTab?: FriendTab;
  stolenRecords?: API.FarmStealRecordVO[];
  stolenLoading?: boolean;
  onRefreshStolen?: () => void;
  onVisitFriend?: (friend: API.FarmFriendListVO) => void;
  visitLoadingId?: string | null;
}

const FarmFriendsModal: React.FC<FarmFriendsModalProps> = ({
  open,
  onClose,
  myLevel = 1,
  myNickname = '我',
  myAvatar,
  initialTab = 'play',
  stolenRecords = [],
  stolenLoading = false,
  onRefreshStolen,
  onVisitFriend,
  visitLoadingId = null,
}) => {
  const [activeTab, setActiveTab] = useState<FriendTab>(initialTab);
  const [friends, setFriends] = useState<API.FarmFriendListVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('levelDesc');
  const [sortOpen, setSortOpen] = useState(false);

  const stolenCount = stolenRecords.length;

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFriendsUsingGet();
      if (res.code === 0 && res.data) {
        setFriends(res.data);
      } else {
        message.error(res.message || '加载好友列表失败');
      }
    } catch (e) {
      message.error('加载好友列表失败');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      onRefreshStolen?.();
      if (initialTab === 'play') {
        loadFriends();
      }
    } else {
      setActiveTab('play');
      setSearchText('');
      setSortOpen(false);
    }
  }, [open, initialTab, onRefreshStolen, loadFriends]);

  useEffect(() => {
    if (open && activeTab === 'visitor') {
      onRefreshStolen?.();
    }
    if (open && activeTab === 'play') {
      loadFriends();
    }
  }, [open, activeTab, onRefreshStolen, loadFriends]);

  const filteredFriends = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    let list = [...friends];
    if (keyword) {
      list = list.filter((f) =>
        (f.nickname ?? '').toLowerCase().includes(keyword),
      );
    }
    list.sort((a, b) => {
      const la = a.level ?? 0;
      const lb = b.level ?? 0;
      return sortOrder === 'levelDesc' ? lb - la : la - lb;
    });
    return list;
  }, [friends, searchText, sortOrder]);

  const sortLabel = sortOrder === 'levelDesc' ? '等级 ↓' : '等级 ↑';

  const handleVisit = (friend: API.FarmFriendListVO) => {
    const friendUserId = getFriendUserId(friend);
    if (friendUserId == null) {
      message.warning('好友信息异常');
      return;
    }
    onVisitFriend?.(friend);
  };

  if (!open) return null;

  const renderVisitorContent = () => (
    <div className="farm-friends-visitor">
      <div className="farm-visitor-stolen-head">
        <span className="farm-visitor-stolen-icon">
          <MailOutlined />
        </span>
        <span className="farm-visitor-stolen-title">谁偷了我的菜</span>
        {stolenCount > 0 && (
          <span className="farm-visitor-stolen-count">{stolenCount}</span>
        )}
      </div>

      <div className="farm-visitor-stolen-list-wrap">
        <Spin spinning={stolenLoading}>
          {stolenRecords.length === 0 && !stolenLoading ? (
            <Empty
              className="farm-visitor-stolen-empty"
              description="暂无偷菜记录"
            />
          ) : (
            <ul className="farm-visitor-stolen-list">
              {stolenRecords.map((record) => (
                <li
                  key={record.id ?? `${record.stealerId}-${record.stolenTime}`}
                  className="farm-visitor-stolen-item"
                >
                  <Avatar
                    className="farm-friend-avatar"
                    src={record.stealerAvatar || STEALER_AVATAR}
                    size={40}
                  />
                  <div className="farm-visitor-stolen-info">
                    <span className="farm-friend-name">
                      {record.stealerNickname || '神秘访客'}
                    </span>
                    <span className="farm-visitor-stolen-detail">
                      偷走了
                      {record.cropName ? `「${record.cropName}」` : '作物'}
                      {record.coinGained != null && record.coinGained > 0
                        ? ` · ${record.coinGained} 积分`
                        : ''}
                    </span>
                    {record.stolenTime && (
                      <span className="farm-visitor-stolen-time">
                        {moment(record.stolenTime).format('MM-DD HH:mm')}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Spin>
      </div>
    </div>
  );

  const renderPlayContent = () => (
    <>
      <div className="farm-friends-toolbar">
        <div className="farm-friends-sort-wrap">
          <button
            type="button"
            className="farm-friends-sort"
            onClick={() => setSortOpen((v) => !v)}
          >
            {sortLabel}
            <CaretDownOutlined />
          </button>
          {sortOpen && (
            <div className="farm-friends-sort-menu">
              <button
                type="button"
                onClick={() => {
                  setSortOrder('levelDesc');
                  setSortOpen(false);
                }}
              >
                等级从高到低
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortOrder('levelAsc');
                  setSortOpen(false);
                }}
              >
                等级从低到高
              </button>
            </div>
          )}
        </div>
        <div className="farm-friends-search">
          <SearchOutlined />
          <input
            type="search"
            placeholder="昵称"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      <div className="farm-friends-list-wrap">
        <Spin spinning={loading}>
          {filteredFriends.length === 0 && !loading ? (
            <Empty
              className="farm-friends-empty"
              description={
                searchText ? '没有匹配的好友' : '暂无互关好友，去鱼窝互关吧～'
              }
            />
          ) : (
            <ul className="farm-friends-list">
              {filteredFriends.map((friend) => {
                const friendUserId = getFriendUserId(friend) ?? '';
                const cooldownText = formatStealCooldown(friend.stealCooldown);
                const visiting = visitLoadingId === friendUserId;
                return (
                  <li key={friendUserId} className="farm-friend-item">
                    <span className="farm-friend-rank">
                      {friend.level ?? '-'}
                    </span>
                    <Avatar
                      className="farm-friend-avatar"
                      src={friend.avatar || DEFAULT_AVATAR}
                      size={44}
                    />
                    <div className="farm-friend-info">
                      <span className="farm-friend-name">
                        {friend.nickname || '农场好友'}
                      </span>
                      <div className="farm-friend-meta">
                        <span className="farm-friend-level-tag">
                          Lv.{friend.level ?? 1}
                        </span>
                        {friend.canSteal === true && !cooldownText && (
                          <span
                            className="farm-friend-status can-steal"
                            title="可偷菜"
                          >
                            <GiftOutlined aria-hidden />
                            <span className="farm-friend-status-text">可偷</span>
                          </span>
                        )}
                        {cooldownText && (
                          <span
                            className="farm-friend-status cooldown"
                            title={`偷菜冷却 ${cooldownText}`}
                          >
                            <ClockCircleOutlined aria-hidden />
                            <span className="farm-friend-status-text">
                              {cooldownText}
                            </span>
                          </span>
                        )}
                        {friend.canSteal !== true && !cooldownText && (
                          <span
                            className="farm-friend-status unavailable"
                            title="暂不可偷"
                          >
                            不可偷
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="farm-friend-visit-btn"
                      disabled={visiting || !onVisitFriend}
                      onClick={() => handleVisit(friend)}
                    >
                      {visiting ? '...' : '拜访'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Spin>
      </div>
    </>
  );

  const renderMainContent = () => {
    if (activeTab === 'visitor') return renderVisitorContent();
    if (activeTab === 'play') return renderPlayContent();
    if (PLACEHOLDER_TABS.includes(activeTab)) {
      return (
        <div className="farm-friends-placeholder">
          <Empty description="功能开发中，敬请期待" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="farm-friends-overlay" onClick={onClose} role="presentation">
      <div
        className="farm-friends-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="farm-friends-title"
      >
        <button
          type="button"
          className="farm-friends-close"
          aria-label="关闭"
          onClick={onClose}
        >
          <CloseOutlined />
        </button>

        <h2 id="farm-friends-title" className="farm-friends-title">
          好友
        </h2>

        <div className="farm-friends-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`farm-friends-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.key === 'visitor' && stolenCount > 0 && (
                <span className="farm-friends-tab-badge">{stolenCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="farm-friends-body">{renderMainContent()}</div>

        <div className="farm-friends-footer">
          <div className="farm-friends-self">
            <span className="farm-friend-rank">{myLevel}</span>
            <Avatar
              className="farm-friend-avatar"
              src={myAvatar || DEFAULT_AVATAR}
              size={40}
            />
            <span className="farm-friends-self-name">{myNickname}</span>
          </div>
          <button
            type="button"
            className="farm-friends-apply"
            onClick={() => message.info('好友申请功能开发中')}
          >
            <span className="farm-friends-apply-icon">
              <PlusOutlined />
            </span>
            <span>申请</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FarmFriendsModal;
