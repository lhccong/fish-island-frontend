import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Avatar, Image, message, Spin, Empty, Divider, Tooltip, Modal, Input, Upload, Button, Space } from 'antd';
import {
  HeartOutlined,
  HeartFilled,
  MessageOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  LoadingOutlined,
  PlusOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import {
  listMomentsUsingPost,
  toggleLikeUsingPost,
  deleteMomentUsingPost,
  publishMomentUsingPost,
  listCommentsUsingPost,
  addCommentUsingPost1,
  deleteCommentUsingPost,
} from '@/services/backend/momentsController';
import { getLoginUserUsingGet } from '@/services/backend/userController';
import { uploadFileByMinioUsingPost } from '@/services/backend/fileController';
import moment from 'moment';
import './index.less';

const FishCirclePage: React.FC = () => {
  const [moments, setMoments] = useState<API.MomentsVO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<API.LoginUserVO>();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  
  // 发布弹窗状态
  const [publishModalVisible, setPublishModalVisible] = useState<boolean>(false);
  const [publishContent, setPublishContent] = useState<string>('');
  const [publishImages, setPublishImages] = useState<string[]>([]);
  const [publishLocation, setPublishLocation] = useState<string>('');
  const [publishing, setPublishing] = useState<boolean>(false);

  // 评论状态
  const [commentsMap, setCommentsMap] = useState<Record<number, API.MomentsCommentVO[]>>({});
  const [commentInputMap, setCommentInputMap] = useState<Record<number, string>>({});
  const [showInputId, setShowInputId] = useState<number | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ commentId: number; userName: string; momentId: number } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  const [expandedRepliesMap, setExpandedRepliesMap] = useState<Record<number, boolean>>({}); // 子评论展开状态
  const [expandedCommentsMap, setExpandedCommentsMap] = useState<Record<number, boolean>>({}); // 评论列表展开状态
  
  const scrollRef = useRef<HTMLDivElement>(null); // kept for potential future use
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const res = await getLoginUserUsingGet();
      if (res.data) {
        setCurrentUser(res.data);
      }
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  };

  // 获取朋友圈列表
  const fetchMoments = useCallback(async (isLoadMore = false) => {
    if (loading || loadingMore) return;
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params: API.MomentsQueryRequest = {
        current: isLoadMore ? pagination.current + 1 : 1,
        pageSize: pagination.pageSize,
        sortField: 'createTime',
        sortOrder: 'descend',
      };

      const result = await listMomentsUsingPost(params);
      if (result.data) {
        const newRecords = result.data.records || [];
        if (isLoadMore) {
          setMoments((prev) => [...prev, ...newRecords]);
          setPagination((prev) => ({ ...prev, current: prev.current + 1 }));
        } else {
          setMoments(newRecords);
          setPagination({
            current: 1,
            pageSize: pagination.pageSize,
            total: result.data.total || 0,
          });
        }

        // 批量加载评论
        newRecords.forEach(async (m) => {
          if (m.id) {
            try {
              const res = await listCommentsUsingPost({ momentId: m.id, current: 1, pageSize: 50 });
              setCommentsMap((prev) => ({ ...prev, [m.id!]: res.data?.records || [] }));
            } catch {}
          }
        });

        // 判断是否还有更多数据
        const totalLoaded = isLoadMore 
          ? (pagination.current + 1) * pagination.pageSize 
          : pagination.pageSize;
        setHasMore(totalLoaded < (result.data.total || 0));
      }
    } catch (error) {
      console.error('获取朋友圈列表失败:', error);
      message.error('获取朋友圈列表失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pagination.current, pagination.pageSize]);

  // 处理点赞
  const handleLike = async (momentId: number, currentLiked: boolean) => {
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }

    try {
      const res = await toggleLikeUsingPost({ momentId });
      if (res.data) {
        setMoments((prev) =>
          prev.map((item) => {
            if (item.id === momentId) {
              return {
                ...item,
                liked: !currentLiked,
                likeNum: (item.likeNum || 0) + (currentLiked ? -1 : 1),
              };
            }
            return item;
          })
        );
      }
    } catch (error) {
      console.error('点赞失败:', error);
      message.error('操作失败');
    }
  };

  // 删除动态
  const handleDelete = async (momentId: number) => {
    try {
      const res = await deleteMomentUsingPost({ id: String(momentId) });
      if (res.data) {
        message.success('删除成功');
        setMoments((prev) => prev.filter((item) => item.id !== momentId));
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 展开/收起评论输入框
  const handleToggleComments = async (momentId: number) => {
    setShowInputId((prev) => (prev === momentId ? null : momentId));
    setReplyTarget(null);
    if (!commentsMap[momentId]) {
      try {
        const res = await listCommentsUsingPost({ momentId, current: 1, pageSize: 50 });
        setCommentsMap((prev) => ({ ...prev, [momentId]: res.data?.records || [] }));
      } catch {
        message.error('加载评论失败');
      }
    }
  };

  // 提交评论
  const handleSubmitComment = async (momentId: number) => {
    const content = commentInputMap[momentId]?.trim();
    if (!content) return;
    if (!currentUser) { message.warning('请先登录'); return; }
    setCommentSubmitting(true);
    try {
      const res = await addCommentUsingPost1({
        momentId,
        content,
        parentId: replyTarget?.commentId,
        replyUserId: replyTarget ? undefined : undefined,
      });
      if (res.data) {
        message.success('评论成功');
        setCommentInputMap((prev) => ({ ...prev, [momentId]: '' }));
        setReplyTarget(null);
        // 刷新评论列表
        const updated = await listCommentsUsingPost({ momentId, current: 1, pageSize: 50 });
        setCommentsMap((prev) => ({ ...prev, [momentId]: updated.data?.records || [] }));
        // 更新评论数
        setMoments((prev) => prev.map((m) => m.id === momentId ? { ...m, commentNum: (m.commentNum || 0) + 1 } : m));
      }
    } catch {
      message.error('评论失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: number, momentId: number) => {
    try {
      const res = await deleteCommentUsingPost({ id: String(commentId) });
      if (res.data) {
        message.success('删除成功');
        setCommentsMap((prev) => ({
          ...prev,
          [momentId]: (prev[momentId] || []).filter((c) => c.id !== commentId).map((c) => ({
            ...c,
            children: (c.children || []).filter((child) => child.id !== commentId),
          })),
        }));
        setMoments((prev) => prev.map((m) => m.id === momentId ? { ...m, commentNum: Math.max((m.commentNum || 1) - 1, 0) } : m));
      }
    } catch {
      message.error('删除失败');
    }
  };

  // 滚动加载更多
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loadingMore && !loading) {
      fetchMoments(true);
    }
  }, [hasMore, loadingMore, loading, fetchMoments]);

  // 格式化时间（类似微信：几分钟前、几小时前、昨天、日期）
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    const time = moment(timeString);
    const now = moment();
    const diffMinutes = now.diff(time, 'minutes');
    const diffHours = now.diff(time, 'hours');
    const diffDays = now.diff(time, 'days');

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return time.format('MM月DD日');
  };

  // 处理粘贴图片
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(
      (item) => item.type.indexOf('image') !== -1
    );

    if (imageItems.length === 0) return;

    e.preventDefault();

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;

      try {
        const res = await uploadFileByMinioUsingPost({ biz: 'user_file' }, {}, file, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data) {
          setPublishImages((prev) => [...prev, res.data!]);
          message.success('图片上传成功');
        }
      } catch (error) {
        console.error('图片上传失败:', error);
        message.error('图片上传失败');
      }
    }
  }, []);

  // 处理文件选择上传
  const handleFileSelect = async (file: File) => {
    try {
      const res = await uploadFileByMinioUsingPost({ biz: 'user_post' }, {}, file, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data) {
        setPublishImages((prev) => [...prev, res.data!]);
        message.success('图片上传成功');
      }
    } catch (error) {
      console.error('图片上传失败:', error);
      message.error('图片上传失败');
    }
    return false; // 阻止默认上传行为
  };

  // 移除已选择的图片
  const handleRemoveImage = (index: number) => {
    setPublishImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 发布动态
  const handlePublish = async () => {
    if (!publishContent.trim() && publishImages.length === 0) {
      message.warning('请输入内容或上传图片');
      return;
    }

    if (!currentUser) {
      message.warning('请先登录');
      return;
    }

    setPublishing(true);
    try {
      const mediaJson: API.MediaItem[] = publishImages.map((url) => ({
        type: 'image',
        url,
      }));

      const res = await publishMomentUsingPost({
        content: publishContent.trim(),
        mediaJson,
        location: publishLocation.trim() || undefined,
        visibility: 0, // 默认所有朋友可见
      });

      if (res.data) {
        message.success('发布成功');
        // 重置状态
        setPublishContent('');
        setPublishImages([]);
        setPublishLocation('');
        setPublishModalVisible(false);
        // 刷新列表
        fetchMoments();
      }
    } catch (error) {
      console.error('发布失败:', error);
      message.error('发布失败');
    } finally {
      setPublishing(false);
    }
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setPublishModalVisible(false);
    setPublishContent('');
    setPublishImages([]);
    setPublishLocation('');
  };

  // 初始化
  useEffect(() => {
    fetchCurrentUser();
    fetchMoments();
  }, []);

  // 添加滚动监听
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 渲染九宫格图片
  const renderMediaGrid = (mediaJson?: API.MediaItem[]) => {
    if (!mediaJson || mediaJson.length === 0) return null;

    const images = mediaJson.filter(item => item.type === 'image').map(item => item.url);
    const count = images.length;
    
    if (count === 0) return null;

    // 单张大图
    if (count === 1) {
      return (
        <div className="media-grid single">
          <Image
            src={images[0]}
            alt="图片"
            className="grid-image"
            preview={{ src: images[0] }}
          />
        </div>
      );
    }

    // 2张图片，每行2列
    if (count === 2) {
      return (
        <div className="media-grid grid-2">
          {images.map((url, index) => (
            <Image
              key={index}
              src={url}
              alt={`图片${index + 1}`}
              className="grid-image"
              preview={{ src: url }}
            />
          ))}
        </div>
      );
    }

    // 4张图片，2x2网格
    if (count === 4) {
      return (
        <div className="media-grid grid-4">
          {images.map((url, index) => (
            <Image
              key={index}
              src={url}
              alt={`图片${index + 1}`}
              className="grid-image"
              preview={{ src: url }}
            />
          ))}
        </div>
      );
    }

    // 其他数量（3,5-9张），3列网格
    return (
      <div className="media-grid grid-3">
        {images.slice(0, 9).map((url, index) => (
          <Image
            key={index}
            src={url}
            alt={`图片${index + 1}`}
            className="grid-image"
            preview={{ src: url }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fish-circle-page">
      {/* 头部封面 */}
      <div className="cover-header">
        <div className="cover-bg" />
        <div className="user-info">
          <span className="user-name">{currentUser?.userName || '摸鱼用户'}</span>
          <Avatar 
            size={80} 
            src={currentUser?.userAvatar} 
            className="user-avatar"
          >
            {currentUser?.userName?.charAt(0) || '摸'}
          </Avatar>
        </div>
      </div>

      {/* 主体两栏布局 */}
      <div className="main-layout">
        {/* 朋友圈列表 */}
        <div className="moments-container">
          {loading && moments.length === 0 ? (
          <div className="loading-container">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
            <p>加载中...</p>
          </div>
        ) : moments.length === 0 ? (
          <Empty description="还没有动态，快来发布第一条朋友圈吧~" />
        ) : (
          <>
            {moments.map((moment, index) => (
              <div key={moment.id} className="moment-item">
                <div className="moment-content">
                  {/* 用户头像 */}
                  <Avatar 
                    size={44} 
                    src={moment.userAvatar} 
                    className="moment-avatar"
                  >
                    {moment.userName?.charAt(0) || '摸'}
                  </Avatar>
                  
                  <div className="moment-body">
                    {/* 用户名 */}
                    <div className="moment-user">{moment.userName}</div>
                    
                    {/* 文字内容 */}
                    {moment.content && (
                      <div className="moment-text">{moment.content}</div>
                    )}
                    
                    {/* 九宫格图片 */}
                    {renderMediaGrid(moment.mediaJson)}
                    
                    {/* 位置信息 */}
                    {moment.location && (
                      <div className="moment-location">
                        <EnvironmentOutlined />
                        <span>{moment.location}</span>
                      </div>
                    )}
                    
                    {/* 时间和操作 */}
                    <div className="moment-footer">
                      <span className="moment-time">{formatTime(moment.createTime)}</span>
                      
                      <div className="moment-actions">
                        <Tooltip title={moment.liked ? '取消点赞' : '点赞'}>
                          <span 
                            className={`action-btn like-btn ${moment.liked ? 'liked' : ''}`}
                            onClick={() => handleLike(moment.id!, moment.liked || false)}
                          >
                            {moment.liked ? <HeartFilled /> : <HeartOutlined />}
                            {(moment.likeNum || 0) > 0 && <span className="count">{moment.likeNum}</span>}
                          </span>
                        </Tooltip>
                        
                        <Tooltip title="评论">
                          <span
                            className="action-btn comment-btn"
                            onClick={() => handleToggleComments(moment.id!)}
                          >
                            <MessageOutlined />
                            {(moment.commentNum || 0) > 0 && <span className="count">{moment.commentNum}</span>}
                          </span>
                        </Tooltip>
                        {currentUser?.id === moment.userId && (
                          <Tooltip title="删除">
                            <span 
                              className="action-btn delete-btn"
                              onClick={() => {
                                Modal.confirm({
                                  title: '确认删除',
                                  content: '删除后无法恢复，确定要删除这条动态吗？',
                                  okText: '删除',
                                  okType: 'danger',
                                  cancelText: '取消',
                                  onOk: () => handleDelete(moment.id!),
                                });
                              }}
                            >
                              <DeleteOutlined />
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 评论区 */}
                {((commentsMap[moment.id!] || []).length > 0 || showInputId === moment.id) && (
                  <div className="comment-section">
                    {/* 评论列表 - 始终展示 */}
                    {(commentsMap[moment.id!] || []).length > 0 && (() => {
                      const allComments = commentsMap[moment.id!] || [];
                      const isExpanded = expandedCommentsMap[moment.id!];
                      const visibleComments = isExpanded ? allComments : allComments.slice(0, 3);
                      return (
                        <div className="comment-list">
                          {visibleComments.map((comment) => (
                            <div key={comment.id} className="comment-item">
                              <Avatar size={28} src={comment.userAvatar} className="comment-avatar">
                                {comment.userName?.charAt(0)}
                              </Avatar>
                              <div className="comment-body">
                                <span className="comment-username">{comment.userName}</span>
                                <span className="comment-content">{comment.content}</span>
                                <div className="comment-meta">
                                  <span className="comment-time">{formatTime(comment.createTime)}</span>
                                  <span className="comment-reply-btn" onClick={() => { setReplyTarget({ commentId: comment.id!, userName: comment.userName!, momentId: moment.id! }); setShowInputId(moment.id!); }}>回复</span>
                                  {currentUser?.id === comment.userId && (
                                    <span className="comment-delete-btn" onClick={() => handleDeleteComment(comment.id!, moment.id!)}>删除</span>
                                  )}
                                </div>
                                {/* 子评论 - 默认折叠 */}
                                {(comment.children || []).length > 0 && (
                                  <>
                                    {!expandedRepliesMap[comment.id!] ? (
                                      <span
                                        className="expand-replies-btn"
                                        onClick={() => setExpandedRepliesMap((prev) => ({ ...prev, [comment.id!]: true }))}
                                      >
                                        查看 {comment.children!.length} 条回复
                                      </span>
                                    ) : (
                                      <>
                                        {comment.children!.map((child) => (
                                          <div key={child.id} className="comment-item child">
                                            <Avatar size={22} src={child.userAvatar} className="comment-avatar">
                                              {child.userName?.charAt(0)}
                                            </Avatar>
                                            <div className="comment-body">
                                              <span className="comment-username">{child.userName}</span>
                                              {child.replyUserName && <span className="comment-reply-to">回复 <span>{child.replyUserName}</span></span>}
                                              <span className="comment-content">{child.content}</span>
                                              <div className="comment-meta">
                                                <span className="comment-time">{formatTime(child.createTime)}</span>
                                                <span className="comment-reply-btn" onClick={() => { setReplyTarget({ commentId: comment.id!, userName: child.userName!, momentId: moment.id! }); setShowInputId(moment.id!); }}>回复</span>
                                                {currentUser?.id === child.userId && (
                                                  <span className="comment-delete-btn" onClick={() => handleDeleteComment(child.id!, moment.id!)}>删除</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        <span
                                          className="expand-replies-btn"
                                          onClick={() => setExpandedRepliesMap((prev) => ({ ...prev, [comment.id!]: false }))}
                                        >
                                          收起回复
                                        </span>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                          {/* 加载更多评论 */}
                          {!isExpanded && allComments.length > 3 && (
                            <span
                              className="load-more-comments"
                              onClick={() => setExpandedCommentsMap((prev) => ({ ...prev, [moment.id!]: true }))}
                            >
                              查看更多 {allComments.length - 3} 条评论
                            </span>
                          )}
                          {isExpanded && allComments.length > 3 && (
                            <span
                              className="load-more-comments"
                              onClick={() => setExpandedCommentsMap((prev) => ({ ...prev, [moment.id!]: false }))}
                            >
                              收起
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    {/* 输入框 - 点击评论按钮才显示 */}
                    {showInputId === moment.id && (
                      <div className="comment-input-area">
                        {replyTarget && replyTarget.momentId === moment.id && (
                          <div className="reply-hint">
                            回复 <span>{replyTarget.userName}</span>
                            <CloseOutlined onClick={() => setReplyTarget(null)} />
                          </div>
                        )}
                        <div className="comment-input-row">
                          <Input
                            autoFocus
                            placeholder={replyTarget?.momentId === moment.id ? `回复 ${replyTarget.userName}...` : '写评论...'}
                            value={commentInputMap[moment.id!] || ''}
                            onChange={(e) => setCommentInputMap((prev) => ({ ...prev, [moment.id!]: e.target.value }))}
                            onPressEnter={() => handleSubmitComment(moment.id!)}
                            maxLength={200}
                            className="comment-input"
                          />
                          <Button
                            type="primary"
                            size="small"
                            loading={commentSubmitting}
                            disabled={!(commentInputMap[moment.id!]?.trim())}
                            onClick={() => handleSubmitComment(moment.id!)}
                            className="comment-send-btn"
                          >
                            发送
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}


              </div>
            ))}
            
            {/* 加载更多 */}
            {loadingMore && (
              <div className="loading-more">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                <span>加载更多...</span>
              </div>
            )}
            
            {/* 没有更多数据 */}
            {!hasMore && moments.length > 0 && (
              <div className="no-more">
                <Divider>没有更多动态了</Divider>
              </div>
            )}
          </>
        )}
        </div>

        {/* 右侧置顶帖 */}
        <div className="sidebar">
          <div className="sidebar-card">
            <div className="sidebar-card-title">📌 置顶公告</div>
            {[
              { id: 1, user: '管理员', avatar: '', content: '🎉 欢迎来到摸鱼朋友圈！请文明发言，互相尊重。', time: '3天前' },
              { id: 2, user: '小助手', avatar: '', content: '📢 每周五下午茶时间，大家一起来摸鱼吧～', time: '1周前' },
              { id: 3, user: '管理员', avatar: '', content: '🔔 有问题可以私信管理员，我们会尽快处理。', time: '2周前' },
            ].map((post) => (
              <div key={post.id} className="pinned-post">
                <div className="pinned-post-header">
                  <Avatar size={28} style={{ background: '#1890ff', fontSize: 12 }}>
                    {post.user[0]}
                  </Avatar>
                  <span className="pinned-post-user">{post.user}</span>
                  <span className="pinned-post-time">{post.time}</span>
                </div>
                <div className="pinned-post-content">{post.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 发布按钮 */}
      <div 
        className="publish-btn"
        onClick={() => setPublishModalVisible(true)}
      >
        <PlusOutlined className="plus-icon" />
      </div>

      {/* 发布弹窗 */}
      <Modal
        title="发布朋友圈"
        open={publishModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={520}
        centered
        destroyOnClose
      >
        <div className="publish-modal-content">
          <Input.TextArea
            ref={textareaRef}
            placeholder="分享新鲜事..."
            value={publishContent}
            onChange={(e) => setPublishContent(e.target.value)}
            onPaste={handlePaste}
            autoSize={{ minRows: 4, maxRows: 8 }}
            className="publish-textarea"
            maxLength={500}
            showCount
          />
          
          {/* 图片预览区域 */}
          {publishImages.length > 0 && (
            <div className="publish-images-preview">
              {publishImages.map((url, index) => (
                <div key={index} className="preview-item">
                  <img src={url} alt={`预览${index + 1}`} />
                  <span 
                    className="remove-btn"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <CloseOutlined />
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* 上传区域 */}
          <div className="publish-actions">
            <Space>
              <Upload
                accept="image/*"
                beforeUpload={handleFileSelect}
                showUploadList={false}
                disabled={publishImages.length >= 9}
              >
                <Button 
                  icon={<PlusOutlined />}
                  disabled={publishImages.length >= 9}
                >
                  添加图片
                </Button>
              </Upload>
              <span className="upload-hint">
                {publishImages.length > 0 
                  ? `已选择 ${publishImages.length}/9 张图片，可直接粘贴图片` 
                  : '可直接粘贴图片上传'}
              </span>
            </Space>
          </div>
          
          {/* 位置输入 */}
          <div className="publish-location">
            <Input
              prefix={<EnvironmentOutlined style={{ color: '#aaa' }} />}
              placeholder="添加位置（选填）"
              value={publishLocation}
              onChange={(e) => setPublishLocation(e.target.value)}
              maxLength={50}
              allowClear
            />
          </div>

          {/* 发布按钮 */}
          <div className="publish-footer">
            <Button onClick={handleCloseModal}>取消</Button>
            <Button
              type="primary"
              onClick={handlePublish}
              loading={publishing}
              disabled={!publishContent.trim() && publishImages.length === 0}
            >
              发布
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FishCirclePage;
