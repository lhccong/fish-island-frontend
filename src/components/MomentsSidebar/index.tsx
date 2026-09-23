import { externalImageProps } from '@/constants';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Button, Image, Spin, Empty, Tooltip, Popover, Radio, Card } from 'antd';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
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
  SmileOutlined,
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
  const collapsedStorageKey = `fish_circle_collapsed_${position}`;
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(collapsedStorageKey);
    if (saved === null) return false;
    try {
      return JSON.parse(saved) === true;
    } catch {
      return false;
    }
  });
  const currentPageRef = useRef(1);
  const loadingRef = useRef(false);
  const listRef = useRef<VirtuosoHandle>(null);
  const atTopRef = useRef(true);
  const [imagePreview, setImagePreview] = useState<{ urls: string[]; current: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(collapsedStorageKey, JSON.stringify(collapsed));
  }, [collapsed, collapsedStorageKey]);

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
  const expandIcon = position === 'left' ? <LeftOutlined /> : <RightOutlined />;
  const [publishVisible, setPublishVisible] = useState(false);
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
    setLoading(true);

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
          setMoments((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            return [...prev, ...records.filter((item) => !existingIds.has(item.id))];
          });
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

  // Only poll at the first page's top; never reset pagination while browsing history.
  const silentRefresh = useCallback(async () => {
    if (loadingRef.current || refreshing) return;
    if (collapsed || document.hidden || !atTopRef.current || currentPageRef.current !== 1) return;
    if (detailMomentId !== null || publishVisible || imagePreview !== null) return;
    loadingRef.current = true;
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
          if (JSON.stringify(prev) === JSON.stringify(records)) return prev;
          return records;
        });
        currentPageRef.current = 1;
        setHasMore(10 < total);
      }
    } catch {
      // 静默失败，不提示
    } finally {
      loadingRef.current = false;
    }
  }, [refreshing, detailMomentId, publishVisible, collapsed, imagePreview]);

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
    listRef.current?.scrollTo({ top: 0 });
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
        <div className={styles.list}>
          {loading && moments.length === 0 ? (
            <div className={styles.center}>
              <Spin />
            </div>
          ) : moments.length === 0 ? (
            <div className={styles.center}>
              <Empty description="暂无动态" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <Virtuoso
              ref={listRef}
              style={{ height: '100%' }}
              data={moments}
              computeItemKey={(_, item) => item.id!}
              defaultItemHeight={200}
              increaseViewportBy={100}
              endReached={() => fetchMoments(true)}
              atTopStateChange={(atTop) => { atTopRef.current = atTop; }}
              components={{
                Footer: () => loading ? (
                  <div className={styles.center}><Spin size="small" /></div>
                ) : !hasMore ? (
                  <div className={styles.noMore}>没有更多了</div>
                ) : null,
              }}
              itemContent={(_, item) => {
                const imageUrls = (item.mediaJson || [])
                  .filter((media) => media.type === 'image' && media.url)
                  .map((media) => media.url!);
                return (
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

                  {imageUrls.length > 0 && (
                    <div className={styles.images} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            key={imageUrls[0]}
                            className={styles.imageButton}
                            aria-label="查看第 1 张图片"
                            title={imageUrls.length > 1 ? `查看全部 ${imageUrls.length} 张图片` : '查看原图'}
                            onClick={() => setImagePreview({ urls: imageUrls, current: 0 })}
                          >
                            <span className={styles.imagePlaceholder} aria-hidden="true">
                              <span className={styles.placeholderFace}><SmileOutlined /></span>
                              <span className={styles.placeholderLabel}>点开瞅瞅</span>
                            </span>
                              <img
                                {...externalImageProps}
                                src={imageUrls[0]}
                                alt=""
                                width={72}
                                height={72}
                                loading="lazy"
                                decoding="async"
                                className={styles.thumb}
                                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                              />
                            {imageUrls.length > 1 && (
                              <span className={styles.imageCount} aria-hidden="true">
                                <PictureOutlined />
                                {imageUrls.length}
                              </span>
                            )}
                          </button>
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
                );
              }}
            />
          )}
        </div>
      </div>
      )}

      {imagePreview && (
        <Image.PreviewGroup
          items={imagePreview.urls.map((src) => ({ src, ...externalImageProps }))}
          preview={{
            visible: true,
            current: imagePreview.current,
            onChange: (current) => setImagePreview((prev) => prev && { ...prev, current }),
            onVisibleChange: (visible) => { if (!visible) setImagePreview(null); },
          }}
        />
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

export default React.memo(MomentsSidebar);
