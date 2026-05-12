import React, { useState } from 'react';
import { Avatar, Button, Modal, Spin, Tooltip } from 'antd';
import { BugOutlined, TeamOutlined } from '@ant-design/icons';
import { getUserVoByIdUsingGet } from '@/services/backend/userController';
import { isFollowingUsingGet, toggleFollowUsingGet } from '@/services/backend/userFollowController';
import { useModel, history } from '@umijs/max';
import { getLevelEmoji, getTitleTagProperties } from '@/utils/titleUtils';
import styles from './index.less';

interface UserDetailModalUser {
  id: string | number;
  name?: string;
  userName?: string;
  avatar?: string;
  userAvatar?: string;
  level?: number;
  isAdmin?: boolean;
  vip?: boolean;
  isVip?: boolean;
  points?: number;
  region?: string;
  country?: string;
  avatarFramerUrl?: string;
  titleId?: number;
  titleIdList?: string;
  momentsBgUrl?: string;
  followerCount?: number;
  followingCount?: number;
  status?: string;
}

interface UserDetailModalProps {
  user: UserDetailModalUser | null;
  open: boolean;
  onClose: () => void;
}

interface Title {
  id: number;
  name: string;
  description: string;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, open, onClose }) => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  const [selectedUser, setSelectedUser] = useState<UserDetailModalUser | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);
  const [loading, setLoading] = useState(false);

  // 当 open 变为 true 时拉取完整用户信息
  React.useEffect(() => {
    if (open && user) {
      setSelectedUser(user);
      setIsFollowing(false);
      setLoading(true);

      const userId = String(user.id);

      // 拉取完整用户信息，全量合并后端返回的所有字段
      getUserVoByIdUsingGet({ id: user.id as any })
        .then((voRes) => {
          if (voRes.code === 0 && voRes.data) {
            const data = voRes.data as any;
            setSelectedUser((prev) =>
              prev
                ? {
                    ...prev,
                    // UserVO 标准字段
                    momentsBgUrl: data.momentsBgUrl,
                    followerCount: data.followerCount,
                    followingCount: data.followingCount,
                    // 后端可能额外返回的字段
                    level: data.level ?? prev.level,
                    points: data.points ?? prev.points,
                    isAdmin: data.isAdmin ?? prev.isAdmin,
                    titleId: data.titleId ?? prev.titleId,
                    titleIdList: data.titleIdList ?? prev.titleIdList,
                    avatarFramerUrl: data.avatarFramerUrl ?? prev.avatarFramerUrl,
                    region: data.region ?? prev.region,
                    country: data.country ?? prev.country,
                    vip: data.vip ?? prev.vip,
                    isVip: data.isVip ?? prev.isVip,
                  }
                : prev,
            );
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      // 查询是否已关注
      if (currentUser && String(currentUser.id) !== userId) {
        isFollowingUsingGet({ followUserId: userId })
          .then((res) => {
            if (res.code === 0) setIsFollowing(!!res.data);
          })
          .catch(() => {});
      }
    }
  }, [open, user]);

  const handleToggleFollow = async () => {
    if (!selectedUser || !currentUser) return;
    setFollowLoading(true);
    try {
      const res = await toggleFollowUsingGet({ followUserId: String(selectedUser.id) });
      if (res.code === 0) {
        const nowFollowing = !!res.data;
        setIsFollowing(nowFollowing);
        setSelectedUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            followerCount: Math.max(0, (prev.followerCount ?? 0) + (nowFollowing ? 1 : -1)),
          };
        });
      }
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  };

  const getAdminTag = (isAdmin: boolean, level: number, titleId?: number) => {
    const { tagText, tagEmoji, tagClass: baseTagClass, titleImg } = getTitleTagProperties(
      isAdmin,
      level,
      titleId,
    );
    const tagClass = styles[baseTagClass];

    if (titleId !== undefined && titleId !== 0) {
      const titles: Title[] = require('@/config/titles.json').titles;
      const title = titles.find((t: Title) => String(t.id) === String(titleId));
      if (title) {
        if (titleImg) {
          return (
            <span className={styles.titleImageContainer}>
              <img src={titleImg} alt={title.name} className={styles.titleImage} />
              <span className={styles.titleSweepLight}></span>
              <span className={styles.titleStar1}>✨</span>
              <span className={styles.titleStar2}>✨</span>
            </span>
          );
        }
        return (
          <span className={`${styles.adminTag} ${tagClass}`}>
            {tagEmoji}
            <span className={styles.adminText}>{title.name}</span>
          </span>
        );
      }
    }

    return (
      <span className={`${styles.adminTag} ${tagClass}`}>
        {tagEmoji}
        <span className={styles.adminText}>{tagText}</span>
      </span>
    );
  };

  const displayUser = selectedUser ?? user;
  if (!displayUser) return null;

  const displayName = displayUser.name || displayUser.userName || '未知用户';
  const avatar = displayUser.avatar || displayUser.userAvatar;
  const userId = String(displayUser.id);
  const isSelf = currentUser && String(currentUser.id) === userId;

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={
        <div className={styles.userDetailActions}>
          <Button onClick={onClose}>关闭</Button>
        </div>
      }
      width={displayUser.momentsBgUrl ? 680 : 420}
      styles={{ body: { padding: 0 } }}
    >
      {loading && !selectedUser ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin />
        </div>
      ) : (
        <div className={styles.userDetailModal}>
          <div className={styles.userDetailBody}>
            {/* 左侧：信息区 */}
            <div
              className={styles.userDetailLeft}
              style={!displayUser.momentsBgUrl ? { alignItems: 'center' } : undefined}
            >
              {/* 头像 + 名字行 */}
              <div className={styles.userDetailTopRow}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatarWithFrame}>
                    <Avatar src={avatar} size={60} />
                    {displayUser.avatarFramerUrl && (
                      <img
                        src={displayUser.avatarFramerUrl}
                        className={styles.avatarFrame}
                        alt="avatar-frame"
                      />
                    )}
                  </div>
                </div>
                <div className={styles.userNameBlock}>
                  <div className={styles.userDetailName}>
                    <span>{displayName}</span>
                    {(displayUser.vip || displayUser.isVip) && (
                      <span className={styles.vipBadge}>V</span>
                    )}
                  </div>

                  {/* 关注按钮（不显示自己） */}
                  {!isSelf && (
                    <Button
                      size="small"
                      loading={followLoading}
                      onClick={handleToggleFollow}
                      onMouseEnter={() => isFollowing && setIsHoveringFollow(true)}
                      onMouseLeave={() => setIsHoveringFollow(false)}
                      className={isFollowing ? styles.followBtnActive : styles.followBtnDefault}
                    >
                      {isFollowing ? (isHoveringFollow ? '取消关注' : '✓ 已关注') : '+ 关注'}
                    </Button>
                  )}
                </div>
              </div>

              {/* 关注数 / 粉丝数 */}
              <div className={styles.userFollowStats}>
                <div className={styles.followStatItem}>
                  <span className={styles.followStatNum}>{displayUser.followingCount ?? '-'}</span>
                  <span className={styles.followStatLabel}>关注</span>
                </div>
                <div className={styles.followStatDivider} />
                <div className={styles.followStatItem}>
                  <span className={styles.followStatNum}>{displayUser.followerCount ?? '-'}</span>
                  <span className={styles.followStatLabel}>粉丝</span>
                </div>
              </div>

              {/* 称号标签 */}
              <div className={styles.userDetailTags}>
                <div
                  style={{
                    display: 'inline-flex',
                    transform: 'scale(0.85)',
                    transformOrigin: 'left center',
                  }}
                >
                  {getAdminTag(
                    displayUser.isAdmin ?? false,
                    displayUser.level ?? 0,
                    displayUser.titleId,
                  )}
                </div>
                {displayUser.titleIdList &&
                  JSON.parse(displayUser.titleIdList || '[]')
                    .filter(
                      (id: number) => id !== displayUser.titleId && id !== 0,
                    )
                    .map((titleId: number) => (
                      <div
                        key={titleId}
                        style={{
                          display: 'inline-flex',
                          transform: 'scale(0.85)',
                          transformOrigin: 'left center',
                        }}
                      >
                        {getAdminTag(
                          displayUser.isAdmin ?? false,
                          displayUser.level ?? 0,
                          titleId,
                        )}
                      </div>
                    ))}
              </div>

              {/* 信息列表 */}
              <div
                className={styles.userDetailContent}
                style={!displayUser.momentsBgUrl ? { width: '100%' } : undefined}
              >
                <div className={styles.userDetailItem}>
                  <span className={styles.itemLabel}>等级</span>
                  <span className={styles.itemValue}>
                    {getLevelEmoji(displayUser.level ?? 0)} {displayUser.level ?? 0}
                  </span>
                </div>
                <div className={styles.userDetailItem}>
                  <span className={styles.itemLabel}>积分</span>
                  <span className={styles.itemValue}>{displayUser.points ?? 0}</span>
                </div>
                {displayUser.region && (
                  <div className={styles.userDetailItem}>
                    <span className={styles.itemLabel}>地区</span>
                    <span className={styles.itemValue}>
                      {displayUser.country
                        ? `${displayUser.country} · ${displayUser.region}`
                        : displayUser.region}
                    </span>
                  </div>
                )}
                <div className={styles.userDetailItem}>
                  <span className={styles.itemLabel}>上次活跃</span>
                  <span className={styles.itemValue}>刚刚</span>
                </div>
                <div className={styles.userDetailItem}>
                  <span className={styles.itemLabel}>状态</span>
                  <span className={styles.itemValue}>{displayUser.status || '在线'}</span>
                </div>
                <div className={styles.userDetailItem}>
                  <span className={styles.itemLabel}>更多</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Tooltip title="查看鱼小圈">
                      <Button
                        size="small"
                        shape="circle"
                        icon={<TeamOutlined />}
                        style={{
                          background: 'linear-gradient(135deg, #36d1dc, #5b86e5)',
                          border: 'none',
                          color: '#fff',
                        }}
                        onClick={() => {
                          onClose();
                          history.push(`/moments/fish-circle?userId=${userId}`);
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：朋友圈背景图 */}
            {displayUser.momentsBgUrl && (
              <div className={styles.userDetailRight}>
                <img
                  src={displayUser.momentsBgUrl}
                  className={styles.momentsBg}
                  alt="moments-bg"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default UserDetailModal;
