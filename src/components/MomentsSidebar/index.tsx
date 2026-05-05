import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Button, Image, Spin, Empty, Tooltip, Popover, Radio, Card } from 'antd';
import {
  HeartFilled,
  HeartOutlined,
  MessageOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  LeftOutlined,
  RightOutlined,
  EnvironmentOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { listMomentsUsingPost, toggleLikeUsingPost } from '@/services/backend/momentsController';
import PublishMomentModal from '@/components/PublishMomentModal';
import MomentDetailModal from '@/components/MomentDetailModal';
import { useModel } from '@umijs/max';
import moment from 'moment';
import styles from './index.less';

const MomentsSidebar: React.FC<{ position?: 'left' | 'right' }> = ({ position = 'left' }) => {
  const [moments, setMoments] = useState<API.MomentsVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const currentPageRef = useRef(1);
  const loadingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 位置设置（本地维护，保存到 siteConfig）
  const [settingPosition, setSettingPosition] = useState<'left' | 'right'>(position);
  const [settingPopoverOpen, setSettingPopoverOpen] = useState(false);

  const handleSavePosition = (val: 'left' | 'right') => {
    setSettingPosition(val);
    const raw = localStorage.getItem('siteConfig');
    const config = raw ? JSON.parse(raw) : {};
    config.fishCirclePosition = val;
    localStorage.setItem('siteConfig', JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('siteConfigChange'));
    setSettingPopoverOpen(false);
  };

  // 收起时给 chatPageWrapper 加 class，让聊天室居中
  useEffect(() => {
    const wrapper = document.querySelector('[class*="chatPageWrapper"]') as HTMLElement | null;
    if (!wrapper) return;
    if (collapsed) {
      wrapper.style.justifyContent = 'center';
      wrapper.style.maxWidth = '1200px';
    } else {
      wrapper.style.justifyContent = '';
      wrapper.style.maxWidth = '';
    }
  }, [collapsed]);

  // 收起时的展开箭头：左侧栏收起显示右箭头，右侧栏收起显示左箭头
  const collapseIcon = position === 'left' ? <RightOutlined /> : <LeftOutlined />;
  // 展开时的收起箭头：左侧栏显示左箭头，右侧栏显示右箭头
  const expandIcon = position === 'left' ? <LeftOutlined /> : <RightOutlined />;  const [publishVisible, setPublishVisible] = useState(false);
  const [detailMomentId, setDetailMomentId] = useState<number | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};

  // ── 数据加载 ──────────────────────────────────────────────
  const fetchMoments = useCallback(async (isLoadMore = false) => {
    if (loadingRef.current) return;
    if (isLoadMore && !hasMore) return;

    const nextPage = isLoadMore ? currentPageRef.current + 1 : 1;
    loadingRef.current = true;
    if (!isLoadMore) setLoading(true);

    try {
      const res = await listMomentsUsingPost({
        current: nextPage,
        pageSize: 10,
        sortField: 'createTime',
        sortOrder: 'descend',
      });
      if (res.data) {
        const records = res.data.records || [];
        const total = res.data.total || 0;
        if (isLoadMore) {
          setMoments((prev) => [...prev, ...records]);
        } else {
          setMoments(records);
        }
        currentPageRef.current = nextPage;
        setHasMore(nextPage * 10 < total);
      }
    } catch (e) {
      // ignore
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore]);

  useEffect(() => {
    fetchMoments(false);
  }, []);

  // 10 秒静默轮询：只刷新第一页，不触发 loading 状态，弹窗打开时暂停
  const silentRefresh = useCallback(async () => {
    if (loadingRef.current || refreshing) return;
    if (detailMomentId !== null || publishVisible) return; // 弹窗打开时跳过
    try {
      const res = await listMomentsUsingPost({
        current: 1,
        pageSize: 10,
        sortField: 'createTime',
        sortOrder: 'descend',
      });
      if (res.data) {
        const records = res.data.records || [];
        const total = res.data.total || 0;
        setMoments((prev) => {
          // 仅当第一条 id 不同时才更新，避免无意义重渲染
          if (records.length > 0 && prev[0]?.id === records[0]?.id &&
              records.length === prev.slice(0, 10).length) return prev;
          return records;
        });
        currentPageRef.current = 1;
        setHasMore(10 < total);
      }
    } catch {
      // 静默失败，不提示
    }
  }, [refreshing, detailMomentId, publishVisible]);

  useEffect(() => {
    autoRefreshRef.current = setInterval(silentRefresh, 10000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [silentRefresh]);

  // 刷新（回到第一页）
  const handleRefresh = async () => {
    if (refreshing || loadingRef.current) return;
    setRefreshing(true);
    loadingRef.current = true;
    // 滚动回顶部
    if (containerRef.current) containerRef.current.scrollTop = 0;
    try {
      const res = await listMomentsUsingPost({
        current: 1,
        pageSize: 10,
        sortField: 'createTime',
        sortOrder: 'descend',
      });
      if (res.data) {
        const records = res.data.records || [];
        const total = res.data.total || 0;
        setMoments(records);
        currentPageRef.current = 1;
        setHasMore(1 * 10 < total);
      }
    } catch (e) {
      // ignore
    } finally {
      loadingRef.current = false;
      setRefreshing(false);
    }
  };

  // 滚动加载更多
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      fetchMoments(true);
    }
  }, [fetchMoments]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ── 点赞（列表内快捷点赞，不打开详情） ────────────────────
  const handleLike = async (e: React.MouseEvent, momentId: number, liked: boolean) => {
    e.stopPropagation(); // 阻止冒泡，不触发打开详情
    if (!currentUser) return;
    try {
      const res = await toggleLikeUsingPost({ momentId });
      if (res.code === 0) {
        setMoments((prev) =>
          prev.map((item) => {
            if (item.id !== momentId) return item;
            const userName = currentUser.userName || '';
            let names = (item.likeUserNames || '').split(',').filter(Boolean);
            if (liked) {
              names = names.filter((n) => n !== userName);
            } else {
              if (!names.includes(userName)) names.push(userName);
            }
            return {
              ...item,
              liked: !liked,
              likeNum: (item.likeNum || 0) + (liked ? -1 : 1),
              likeUserNames: names.join(','),
            };
          })
        );
      }
    } catch (e) {
      // ignore
    }
  };

  // 详情弹窗回调：同步点赞状态到列表
  const handleDetailLikeChange = (momentId: number, liked: boolean, likeNum: number) => {
    setMoments((prev) =>
      prev.map((item) => (item.id === momentId ? { ...item, liked, likeNum } : item))
    );
  };

  // 详情弹窗回调：同步评论数到列表
  const handleDetailCommentCountChange = (momentId: number, count: number) => {
    setMoments((prev) =>
      prev.map((item) => (item.id === momentId ? { ...item, commentNum: count } : item))
    );
  };

  // ── 渲染 ──────────────────────────────────────────────────
  return (
    <>
      {collapsed ? (
        <Tooltip title="展开鱼小圈" placement="top">
          <div className={styles.toggleBtn} onClick={() => setCollapsed(false)}>
            {collapseIcon}
          </div>
        </Tooltip>
      ) : (
      <div className={`${styles.sidebar} ${position === 'left' ? styles.sidebarLeft : ''}`}>
        {/* 头部：标题 + 刷新 + 发布 + 设置 + 收起 */}
        <div className={styles.header}>
          <span className={styles.title}><TeamOutlined /> 鱼小圈</span>
          <div className={styles.headerActions}>
            <Tooltip title="刷新">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={handleRefresh}
                className={styles.iconBtn}
              />
            </Tooltip>
            <Tooltip title="发布动态">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setPublishVisible(true)}
                className={styles.iconBtn}
              />
            </Tooltip>
            <Popover
              open={settingPopoverOpen}
              onOpenChange={setSettingPopoverOpen}
              trigger="click"
              placement="bottomRight"
              arrow={false}
              overlayClassName="moments-sidebar-setting-popover"
              content={
                <Card>
                  <span>显示位置：</span>
                  <Radio.Group
                    value={settingPosition}
                    onChange={(e) => handleSavePosition(e.target.value)}
                    className="settingRadioGroup"
                    buttonStyle="solid"
                  >
                    <Radio.Button value="left">⬅ 左侧</Radio.Button>
                    <Radio.Button value="right">右侧 ➡</Radio.Button>
                  </Radio.Group>
                </Card>
              }
            >
              <Tooltip title="设置" open={settingPopoverOpen ? false : undefined}>
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  className={`${styles.iconBtn} ${settingPopoverOpen ? styles.iconBtnActive : ''}`}
                />
              </Tooltip>
            </Popover>
            <Tooltip title="收起">
              <Button
                type="text"
                size="small"
                icon={expandIcon}
                onClick={() => setCollapsed(true)}
                className={styles.iconBtn}
              />
            </Tooltip>
          </div>
        </div>

        {/* 列表 */}
        <div className={styles.list} ref={containerRef}>
          {loading && moments.length === 0 ? (
            <div className={styles.center}>
              <Spin />
            </div>
          ) : moments.length === 0 ? (
            <div className={styles.center}>
              <Empty description="暂无动态" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <>
              {moments.map((item) => (
                <div
                  key={item.id}
                  className={styles.item}
                  onClick={() => setDetailMomentId(item.id!)}
                >
                  <div className={styles.itemHeader}>
                    <Avatar
                      src={item.userAvatar}
                      size={34}
                      className={styles.avatar}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/moments/fish-circle?userId=${item.userId}`, '_blank');
                      }}
                    />
                    <div className={styles.meta}>
                      <span
                        className={styles.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/moments/fish-circle?userId=${item.userId}`, '_blank');
                        }}
                      >
                        {item.userName}
                      </span>
                      <span className={styles.time}>{moment(item.createTime).fromNow()}</span>
                    </div>
                  </div>

                  {item.content && (
                    <div className={styles.content}>{item.content}</div>
                  )}

                  {item.location && (
                    <div className={styles.location}>
                      <EnvironmentOutlined />
                      <span>{item.location}</span>
                    </div>
                  )}

                  {item.mediaJson && item.mediaJson.length > 0 && (
                    <div className={styles.images} onClick={(e) => e.stopPropagation()}>
                      <Image.PreviewGroup>
                        {item.mediaJson.slice(0, 3).map((media, idx) =>
                          media.type === 'image' && media.url ? (
                            <Image
                              key={idx}
                              src={media.url}
                              className={styles.thumb}
                              preview={{ src: media.url }}
                            />
                          ) : null
                        )}
                        {item.mediaJson.length > 3 && (
                          <div className={styles.moreImages}>
                            <PictureOutlined />
                            <span>+{item.mediaJson.length - 3}</span>
                          </div>
                        )}
                      </Image.PreviewGroup>
                    </div>
                  )}

                  <div className={styles.actions}>
                    <Tooltip title={item.likeUserNames || ''}>
                      <span
                        className={`${styles.action} ${item.liked ? styles.liked : ''}`}
                        onClick={(e) => handleLike(e, item.id!, !!item.liked)}
                      >
                        {item.liked ? <HeartFilled /> : <HeartOutlined />}
                        <span>{item.likeNum || 0}</span>
                      </span>
                    </Tooltip>
                    <span className={styles.action}>
                      <MessageOutlined />
                      <span>{item.commentNum || 0}</span>
                    </span>
                  </div>
                </div>
              ))}

              {!loading && hasMore && (
                <div className={styles.center} style={{ padding: '8px 0' }}>
                  <Spin size="small" />
                </div>
              )}
              {!hasMore && moments.length > 0 && (
                <div className={styles.noMore}>没有更多了</div>
              )}
            </>
          )}
        </div>
      </div>
      )}

      {/* 复用鱼小圈发布弹窗 */}
      <PublishMomentModal
        open={publishVisible}
        onCancel={() => setPublishVisible(false)}
        onSuccess={handleRefresh}
      />

      {/* 动态详情弹窗（复用消息通知里的逻辑） */}
      <MomentDetailModal
        momentId={detailMomentId}
        onClose={() => setDetailMomentId(null)}
        onLikeChange={handleDetailLikeChange}
        onCommentCountChange={handleDetailCommentCountChange}
      />
    </>
  );
};

export default MomentsSidebar;
