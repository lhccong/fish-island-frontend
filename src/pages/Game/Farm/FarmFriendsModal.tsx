import React, { useEffect, useState } from 'react';
import { Avatar, Empty, Spin, message } from 'antd';
import { CloseOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons';
import moment from 'moment';
import './FarmFriendsModal.less';

export type FriendTab = 'play' | 'wechat' | 'invite' | 'visitor';

const TABS: { key: FriendTab; label: string }[] = [
  { key: 'play', label: '同玩好友' },
  { key: 'wechat', label: '微信好友' },
  { key: 'invite', label: '邀请' },
  { key: 'visitor', label: '访客' },
];

const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=farm-friend';

const STEALER_AVATAR =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=farm-stealer';

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
}) => {
  const [activeTab, setActiveTab] = useState<FriendTab>(initialTab);

  const stolenCount = stolenRecords.length;

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      onRefreshStolen?.();
    } else {
      setActiveTab('play');
    }
  }, [open, initialTab, onRefreshStolen]);

  useEffect(() => {
    if (open && activeTab === 'visitor') {
      onRefreshStolen?.();
    }
  }, [open, activeTab, onRefreshStolen]);

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

      <Spin spinning={stolenLoading}>
        <div className="farm-visitor-stolen-list-wrap">
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
        </div>
      </Spin>
    </div>
  );

  const renderMainContent = () => {
    if (activeTab === 'visitor') {
      return renderVisitorContent();
    }

    return (
      <div className="farm-friends-placeholder">
        <Empty description="功能开发中，敬请期待" />
      </div>
    );
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

        {renderMainContent()}

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
