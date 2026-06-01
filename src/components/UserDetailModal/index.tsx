import React, { useState } from 'react';
import { Avatar, Button, Empty, Modal, Spin, Tooltip, message } from 'antd';
import { BugOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons';
import { navigateToUserFarm } from '@/utils/farmNavigate';
import { getUserVoByIdUsingGet } from '@/services/backend/userController';
import {
  isFollowingUsingGet,
  toggleFollowUsingGet,
  listMyFollowersUsingGet,
  listMyFollowingUsingGet,
} from '@/services/backend/userFollowController';
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
  const [followListVisible, setFollowListVisible] = useState(false);
  const [followListType, setFollowListType] = useState<'following' | 'followers'>('following');
  const [followListData, setFollowListData] = useState<API.UserFollowVO[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListToggleLoadingId, setFollowListToggleLoadingId] = useState<string | null>(null);
  const [followListHoverId, setFollowListHoverId] = useState<string | null>(null);

  React.useEffect(() => {
    if (open && user) {
      setSelectedUser(user);
      setIsFollowing(false);
      setLoading(true);

      const userId = String(user.id);

      getUserVoByIdUsingGet({ id: user.id as any })
        .then((voRes) => {
          if (voRes.code === 0 && voRes.data) {
            const data = voRes.data as any;
            setSelectedUser((prev) =>
              prev
                ? {
                    ...prev,
                    userName: data.userName ?? prev.userName,
                    userAvatar: data.userAvatar ?? prev.userAvatar,
                    momentsBgUrl: data.momentsBgUrl,
                    followerCount: data.followerCount,
                    followingCount: data.followingCount,
                    level: data.level ?? prev.level,
                    points: data.points ?? prev.points,
                    isAdmin: data.userRole === 'admin' || !!data.isAdmin || !!prev.isAdmin,
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

      if (currentUser && String(currentUser.id) !== userId) {
        isFollowingUsingGet({ followUserId: userId })
          .then((res) => {
            if (res.code === 0) setIsFollowing(!!res.data);
          })
          .catch(() => {});
      }
    }
  }, [open, user, currentUser?.id]);

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
        message.success(nowFollowing ? '关注成功' : '已取消关注');
      }
    } catch {
      message.error('操作失败，请稍后重试');
    } finally {
      setFollowLoading(false);
      setIsHoveringFollow(false);
    }
  };

  const handleOpenFollowList = async (type: 'following' | 'followers') => {
    if (!currentUser || !selectedUser) return;
    if (String(currentUser.id) !== String(selectedUser.id)) {
      message.info('暂时只支持查看自己的关注/粉丝列表');
      return;
    }
    setFollowListType(type);
    setFollowListVisible(true);
    setFollowListLoading(true);
    setFollowListData([]);
    try {
      const fn = type === 'following' ? listMyFollowingUsingGet : listMyFollowersUsingGet;
      const res = await fn({ current: 1, pageSize: 50 });
      if (res.code === 0 && res.data?.records) {
        setFollowListData(res.data.records);
      }
    } catch {
      message.error('获取列表失败');
    } finally {
      setFollowListLoading(false);
    }
  };

  const isFollowListItemFollowing = (item: API.UserFollowVO) =>
    followListType === 'following' ? true : !!item.isMutual;

  const handleFollowListToggle = async (item: API.UserFollowVO) => {
    if (!item.userId || followListToggleLoadingId) return;
    setFollowListToggleLoadingId(item.userId);
    try {
      const res = await toggleFollowUsingGet({ followUserId: item.userId });
      if (res.code === 0) {
        const nowFollowing = !!res.data;
        message.success(nowFollowing ? '关注成功' : '已取消关注');
        setFollowListData((prev) => {
          if (followListType === 'following') {
            return nowFollowing ? prev : prev.filter((u) => u.userId !== item.userId);
          }
          return prev.map((u) =>
            u.userId === item.userId ? { ...u, isMutual: nowFollowing } : u,
          );
        });
        if (selectedUser && String(currentUser?.id) === String(selectedUser.id)) {
          setSelectedUser((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              followingCount: Math.max(0, (prev.followingCount ?? 0) + (nowFollowing ? 1 : -1)),
            };
          });
        }
      }
    } catch {
      message.error('操作失败，请稍后重试');
    } finally {
      setFollowListToggleLoadingId(null);
      setFollowListHoverId(null);
    }
  };

  const getAdminTag = (isAdmin: boolean, level: number, titleId?: number) => {
    const { tagText, tagEmoji, tagClass: baseTagClass, titleImg } = getTitleTagProperties(
      isAdmin,
      level,
      titleId,
    );
    const tagClass = styles[baseTagClass as keyof typeof styles];

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
          <span className={`${styles.adminTag} ${tagClass || ''}`}>
            {tagEmoji}
            <span className={styles.adminText}>{title.name}</span>
          </span>
        );
      }
    }

    return (
      <span className={`${styles.adminTag} ${tagClass || ''}`}>
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
    <>
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
              <div
                className={styles.userDetailLeft}
                style={!displayUser.momentsBgUrl ? { alignItems: 'center' } : undefined}
              >
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

                <div className={styles.userFollowStats}>
                  <div
                    className={`${styles.followStatItem} ${isSelf ? styles.followStatClickable : ''}`}
                    onClick={() => isSelf && handleOpenFollowList('following')}
                  >
                    <span className={styles.followStatNum}>{displayUser.followingCount ?? '-'}</span>
                    <span className={styles.followStatLabel}>关注</span>
                  </div>
                  <div className={styles.followStatDivider} />
                  <div
                    className={`${styles.followStatItem} ${isSelf ? styles.followStatClickable : ''}`}
                    onClick={() => isSelf && handleOpenFollowList('followers')}
                  >
                    <span className={styles.followStatNum}>{displayUser.followerCount ?? '-'}</span>
                    <span className={styles.followStatLabel}>粉丝</span>
                  </div>
                </div>

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
                      .filter((id: number) => id !== displayUser.titleId && id !== 0)
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
                  {currentUser?.userRole === 'admin' && (
                    <div className={styles.userDetailItem}>
                      <span className={styles.itemLabel}>管理员</span>
                      <span className={styles.itemValue}>{displayUser.isAdmin ? '是' : '否'}</span>
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
                      {isSelf && (
                        <Tooltip title="查看宠物（前往鱼窝）">
                          <Button
                            size="small"
                            shape="circle"
                            icon={<BugOutlined />}
                            style={{
                              background: 'linear-gradient(135deg, #f7971e, #ffd200)',
                              border: 'none',
                              color: '#fff',
                            }}
                            onClick={() => {
                              sessionStorage.setItem('openPetUserId', userId);
                              onClose();
                              history.push('/chat');
                            }}
                          />
                        </Tooltip>
                      )}
                      <Tooltip title={isSelf ? '我的农场' : '查看农场'}>
                        <Button
                          size="small"
                          shape="circle"
                          icon={<EnvironmentOutlined />}
                          style={{
                            background: 'linear-gradient(135deg, #73d13d, #389e0d)',
                            border: 'none',
                            color: '#fff',
                          }}
                          onClick={() => {
                            navigateToUserFarm(userId, {
                              isSelf: !!isSelf,
                              nickname: displayName,
                              avatar: avatar,
                              onBeforeNavigate: onClose,
                            });
                          }}
                        />
                      </Tooltip>
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

      <Modal
        title={followListType === 'following' ? '我的关注' : '我的粉丝'}
        open={followListVisible}
        onCancel={() => setFollowListVisible(false)}
        footer={null}
        width={360}
        zIndex={1100}
      >
        {followListLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin />
          </div>
        ) : followListData.length === 0 ? (
          <Empty description={followListType === 'following' ? '还没有关注任何人' : '还没有粉丝'} />
        ) : (
          <div className={styles.followListContainer}>
            {followListData.map((item) => {
              const isFollowingItem = isFollowListItemFollowing(item);
              const isHoveringItem = followListHoverId === item.userId;
              return (
                <div key={item.userId} className={styles.followListItem}>
                  <div className={styles.followListAvatar}>
                    <Avatar src={item.userAvatar} size={42} />
                    {item.avatarFramerUrl && (
                      <img
                        src={item.avatarFramerUrl}
                        className={styles.followListAvatarFrame}
                        alt=""
                      />
                    )}
                  </div>
                  <div className={styles.followListInfo}>
                    <div className={styles.followListName}>
                      {item.userName}
                      {item.isMutual && (
                        <span className={styles.mutualBadge}>互相关注</span>
                      )}
                    </div>
                    {item.userProfile && (
                      <div className={styles.followListProfile}>{item.userProfile}</div>
                    )}
                  </div>
                  <Button
                    size="small"
                    loading={followListToggleLoadingId === item.userId}
                    disabled={
                      !!followListToggleLoadingId && followListToggleLoadingId !== item.userId
                    }
                    onClick={() => handleFollowListToggle(item)}
                    onMouseEnter={() =>
                      isFollowingItem && setFollowListHoverId(item.userId ?? null)
                    }
                    onMouseLeave={() => setFollowListHoverId(null)}
                    className={
                      isFollowingItem ? styles.followListBtnActive : styles.followListBtnDefault
                    }
                  >
                    {isFollowingItem
                      ? isHoveringItem
                        ? '取消关注'
                        : '✓ 已关注'
                      : '+ 关注'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
};

export default UserDetailModal;
