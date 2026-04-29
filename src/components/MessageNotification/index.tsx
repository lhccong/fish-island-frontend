import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Avatar, Badge, Button, Card, Drawer, Empty, Input, List, Modal, Space, Spin, Tag, Tooltip, message, Checkbox, Popconfirm } from 'antd';
import { BellOutlined, CheckCircleOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, EnvironmentOutlined, LoadingOutlined } from '@ant-design/icons';
import { batchDeleteUsingPost, batchSetReadUsingPost, listMyEventRemindByPageUsingPost } from '@/services/backend/eventRemindController';
import { getMomentDetailUsingGet, listCommentsUsingPost, addCommentUsingPost1 } from '@/services/backend/momentsController';
import { history } from '@umijs/max';
import moment from 'moment';
import './index.less';

// 扩展EventRemindVO接口，添加前端需要的属性
interface ExtendedEventRemindVO extends API.EventRemindVO {
  isRead?: boolean;
  title?: string;
  content?: string;
}

interface MessageNotificationProps {
  className?: string;
  onUnreadCountChange?: (count: number) => void;
}

export interface MessageNotificationRef {
  showDrawer: () => void;
}

// 解析[img]标签格式的图片
const parseImgContent = (content: string) => {
  const imgRegex = /\[img\](.*?)\[\/img\]/g;
  
  if (imgRegex.test(content)) {
    // 重置正则表达式状态
    imgRegex.lastIndex = 0;
    
    // 提取图片URL
    const match = imgRegex.exec(content);
    if (match && match[1]) {
      return { isImage: true, imageUrl: match[1], text: '' };
    }
  }
  
  return { isImage: false, imageUrl: '', text: content };
};

const MessageNotification = forwardRef<MessageNotificationRef, MessageNotificationProps>(
  ({ className, onUnreadCountChange }, ref) => {
    const [visible, setVisible] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [messageList, setMessageList] = useState<ExtendedEventRemindVO[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [total, setTotal] = useState<number>(0);
    const pageSize = 10;
    const listRef = useRef<HTMLDivElement>(null);
    const scrollThreshold = 100; // 滚动到距离底部多少px时加载更多
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [deleting, setDeleting] = useState<boolean>(false);
    const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);

    // 动态详情弹窗
    const [detailVisible, setDetailVisible] = useState<boolean>(false);
    const [detailMoment, setDetailMoment] = useState<API.MomentsVO | null>(null);
    const [detailLoading, setDetailLoading] = useState<boolean>(false);
    const [detailComments, setDetailComments] = useState<API.MomentsCommentVO[]>([]);

    // 详情弹窗评论输入
    const [detailCommentInput, setDetailCommentInput] = useState<string>('');
    const [detailReplyTarget, setDetailReplyTarget] = useState<{ commentId: number; userName: string } | null>(null);
    const [detailSubmitting, setDetailSubmitting] = useState<boolean>(false);

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
      showDrawer: () => setVisible(true)
    }));

    // 处理消息数据，根据state判断已读未读，根据action和sourceContent提取标题内容
    const processMessageData = (records: API.EventRemindVO[] = []): ExtendedEventRemindVO[] => {
      return records.map(record => {
        // 假设state为1时表示已读，0表示未读
        const isRead = record.state === 1;
        
        // 根据action类型生成标题
        let title = '系统通知';
        if (record.action === 'comment') {
          title = '新评论提醒';
        } else if (record.action === 'like') {
          title = '点赞提醒';
        } else if (record.action === 'mention') {
          title = '有人提到了你';
        }
        
        // 内容可以从sourceContent或其他字段获取
        const content = record.sourceContent || '查看详情';
        
        return {
          ...record,
          isRead,
          title,
          content
        };
      });
    };

    // 获取消息列表
    const fetchMessageList = async (page = currentPage, resetList = false) => {
      setLoading(true);
      try {
        const res = await listMyEventRemindByPageUsingPost({
          current: page,
          pageSize,
          sortField: 'createTime',
          sortOrder: 'descend',
        });

        if (res.data) {
          const processedData = processMessageData(res.data.records);
          setMessageList(resetList ? processedData : [...messageList, ...processedData]);
          setTotal(res.data.total || 0);
          
          // 计算未读消息数量
          if (resetList) {
            const unread = processedData.filter(item => !item.isRead).length;
            setUnreadCount(unread);
            // 调用回调函数通知父组件未读数量
            if (onUnreadCountChange) {
              onUnreadCountChange(unread);
            }
          }
        }
      } catch (error) {
        console.error('获取消息列表失败', error);
        message.error('获取消息列表失败');
      } finally {
        setLoading(false);
      }
    };

    // 标记单条消息为已读
    const markSingleAsRead = async (id: number) => {
      try {
        const res = await batchSetReadUsingPost({ ids: [id] });
        if (res.data) {
          // 更新消息列表中的已读状态
          setMessageList(messageList.map(item => 
            item.id === id ? { ...item, isRead: true } : item
          ));
          
          // 更新未读消息数量
          setUnreadCount(prev => Math.max(0, prev - 1));
          if (onUnreadCountChange) {
            onUnreadCountChange(Math.max(0, unreadCount - 1));
          }
        }
      } catch (error) {
        console.error('标记已读失败', error);
        message.error('标记消息已读失败');
      }
    };

    // 标记当前列表所有未读消息为已读
    const markAllAsRead = async () => {
      try {
        const ids = messageList
          .filter(item => !item.isRead)
          .map(item => item.id)
          .filter((id): id is number => id !== undefined);
        
        if (ids.length === 0) {
          message.info('没有未读消息');
          return;
        }

        const res = await batchSetReadUsingPost({ ids });
        if (res.data) {
          message.success('已全部标记为已读');
          setUnreadCount(0);
          // 通知父组件未读数量变化
          if (onUnreadCountChange) {
            onUnreadCountChange(0);
          }
          // 更新消息列表中的已读状态
          setMessageList(messageList.map(item => ({ ...item, isRead: true })));
        }
      } catch (error) {
        console.error('标记已读失败', error);
        message.error('标记已读失败');
      }
    };

    // 处理消息项点击，跳转到对应链接或帖子详情页
    const handleMessageClick = async (item: ExtendedEventRemindVO) => {
      try {
        // 如果消息未读，先标记为已读
        if (!item.isRead && item.id) {
          await markSingleAsRead(item.id);
        }

        // sourceType === 4 (MOMENTS) → 直接弹出动态详情
        if (item.sourceType === 4) {
          if (item.sourceId) {
            setDetailLoading(true);
            setDetailMoment(null);
            setDetailComments([]);
            setDetailVisible(true);
            try {
              const [detailRes, commentRes] = await Promise.all([
                getMomentDetailUsingGet({ id: item.sourceId }),
                listCommentsUsingPost({ momentId: item.sourceId, current: 1, pageSize: 50 }),
              ]);
              if (detailRes.data) setDetailMoment(detailRes.data);
              setDetailComments(commentRes.data?.records || []);
            } catch {
              message.error('加载动态详情失败');
              setDetailVisible(false);
            } finally {
              setDetailLoading(false);
            }
          }
          return;
        }
        
        // 如果有自定义URL，则根据URL跳转
        if (item.url) {
          history.push(`/post/${item.url}`);
          return;
        }
        
        // 如果有sourceId并且sourceType为1（帖子），则跳转到帖子详情页
        if (item.sourceId && item.sourceType === 1) {
          history.push(`/post/${item.sourceId}`);
        }
      } catch (error) {
        console.error('处理消息点击失败', error);
      }
    };

    // 阻止事件冒泡
    const stopPropagation = (e: React.MouseEvent) => {
      e.stopPropagation();
    };

    // 监听滚动事件，实现滚动加载更多
    const handleScroll = () => {
      if (loading || messageList.length >= total || !listRef.current) return;

      const scrollContainer = listRef.current;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      
      // 当滚动到接近底部时加载更多
      if (scrollHeight - scrollTop - clientHeight <= scrollThreshold) {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchMessageList(nextPage, false);
      }
    };

    // 选择 / 取消选择单条消息
    const handleSelectItem = (id: number, checked: boolean) => {
      setSelectedIds((prev) => {
        if (checked) {
          if (prev.includes(id)) return prev;
          return [...prev, id];
        }
        return prev.filter((itemId) => itemId !== id);
      });
    };

    // 进入删除模式
    const enterDeleteMode = () => {
      setIsDeleteMode(true);
      setSelectedIds([]);
    };

    // 退出删除模式
    const exitDeleteMode = () => {
      setIsDeleteMode(false);
      setSelectedIds([]);
    };

    // 批量删除消息
    const handleBatchDelete = async () => {
      if (selectedIds.length === 0) {
        message.info('请先选择要删除的消息');
        return;
      }

      try {
        setDeleting(true);
        const res = await batchDeleteUsingPost({ ids: selectedIds });
        if (res.data) {
          message.success('删除成功');
          // 删除后刷新列表并重置选择，退出删除模式
          setCurrentPage(1);
          setSelectedIds([]);
          setIsDeleteMode(false);
          await fetchMessageList(1, true);
        }
      } catch (error) {
        console.error('批量删除消息失败', error);
        message.error('批量删除消息失败');
      } finally {
        setDeleting(false);
      }
    };

    // 初始化加载消息
    useEffect(() => {
      fetchMessageList(1, true);
      
      // 定时刷新未读消息数量，每60秒刷新一次
      const timer = setInterval(() => {
        if (!visible) {
          fetchMessageList(1, true);
        }
      }, 60000);
      
      return () => clearInterval(timer);
    }, [visible]);

    // 监听抽屉显示状态，重置页码和删除模式
    useEffect(() => {
      if (visible) {
        setCurrentPage(1);
        fetchMessageList(1, true);
      } else {
        // 关闭抽屉时退出删除模式
        setIsDeleteMode(false);
        setSelectedIds([]);
      }
    }, [visible]);

    // 获取消息标签类型和颜色
    const getMessageTagInfo = (action?: string) => {
      switch (action) {
        case 'comment':
          return { color: '#1890ff', text: '评论' };
        case 'like':
          return { color: '#ff4d4f', text: '点赞' };
        case 'mention':
          return { color: '#52c41a', text: '提及' };
        default:
          return { color: '#722ed1', text: '通知' };
      }
    };
    
    // 渲染消息内容
    const renderMessageContent = (content: string) => {
      const { isImage, imageUrl, text } = parseImgContent(content);
      
      if (isImage) {
        return (
          <div className="message-image-container">
            <img src={imageUrl} alt="消息图片" className="message-image" />
          </div>
        );
      }
      
      return <div className="message-content-text">{text}</div>;
    };

    // 详情弹窗提交评论
    const handleDetailSubmitComment = async () => {
      const content = detailCommentInput.trim();
      if (!content || !detailMoment?.id) return;
      setDetailSubmitting(true);
      try {
        const res = await addCommentUsingPost1({
          momentId: detailMoment.id,
          content,
          parentId: detailReplyTarget?.commentId,
        });
        if (res.data) {
          message.success('评论成功');
          setDetailCommentInput('');
          setDetailReplyTarget(null);
          // 刷新评论
          const updated = await listCommentsUsingPost({ momentId: detailMoment.id, current: 1, pageSize: 50 });
          setDetailComments(updated.data?.records || []);
        }
      } catch {
        message.error('评论失败');
      } finally {
        setDetailSubmitting(false);
      }
    };

    // 渲染消息项
    const renderItem = (item: ExtendedEventRemindVO) => {
      const isUnread = !item.isRead;
      const senderUser = item.senderUser;
      const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor';
      const tagInfo = getMessageTagInfo(item.action);
      const itemId = item.id;
      const checked = itemId !== undefined && selectedIds.includes(itemId);
      
      return (
        <List.Item 
          className={`message-item ${isUnread ? 'unread' : 'read'}`}
          onClick={() => {
            // 删除模式下点击不跳转
            if (!isDeleteMode) {
              handleMessageClick(item);
            }
          }}
        >
          <Card className="message-card" bordered={false}>
            {isDeleteMode && (
              <div className="message-select">
                <Checkbox
                  checked={checked}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    if (itemId === undefined) return;
                    handleSelectItem(itemId, e.target.checked);
                  }}
                />
              </div>
            )}
            <div className="message-header">
              <div className="message-user-info">
                <Avatar 
                  src={senderUser?.userAvatar || defaultAvatar} 
                  size={36}
                  alt={senderUser?.userName || '系统'}
                />
                <div className="message-user-name">
                  <span>{senderUser?.userName || '系统通知'}</span>
                  {isUnread && <Badge status="processing" />}
                </div>
              </div>
              <Tag color={tagInfo.color}>{tagInfo.text}</Tag>
            </div>
            
            <div className="message-body">
              <div className="message-title">{item.title}</div>
              {renderMessageContent(item.content || '')}
            </div>
            
            <div className="message-footer">
              <span className="message-time">{moment(item.createTime).format('YYYY-MM-DD HH:mm')}</span>
              {isUnread ? (
                <Button 
                  type="link" 
                  size="small" 
                  className="mark-read-button"
                  onClick={(e) => {
                    stopPropagation(e);
                    markSingleAsRead(item.id!);
                  }}
                >
                  标为已读
                </Button>
              ) : (
                <CheckCircleOutlined className="message-read-icon" />
              )}
            </div>
          </Card>
        </List.Item>
      );
    };

    return (
      <>
      <Drawer
        title={
          <div className="drawer-header">
            <Space>
              <BellOutlined />
              <span>消息通知</span>
              {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
            </Space>
            <Space>
              {isDeleteMode ? (
                <>
                  <Popconfirm
                    title="确定删除选中的消息吗？"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={handleBatchDelete}
                    disabled={selectedIds.length === 0}
                  >
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      disabled={selectedIds.length === 0}
                      loading={deleting}
                    >
                      批量删除
                    </Button>
                  </Popconfirm>
                  <Button 
                    size="small"
                    onClick={exitDeleteMode}
                  >
                    取消
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={enterDeleteMode}
                  >
                    删除
                  </Button>
                  <Button 
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    size="small"
                  >
                    全部已读
                  </Button>
                </>
              )}
            </Space>
          </div>
        }
        placement="right"
        onClose={() => setVisible(false)}
        open={visible}
        width={380}
        className="message-notification-drawer"
        footer={null}
      >
        <div 
          className="message-list-container" 
          ref={listRef}
          onScroll={handleScroll}
        >
          {messageList.length > 0 ? (
            <>
              <List
                dataSource={messageList}
                renderItem={renderItem}
                split={false}
              />
              {loading && messageList.length > 0 && (
                <div className="loading-more">
                  <Spin size="small" />
                  <span>加载中...</span>
                </div>
              )}
              {messageList.length >= total && total > 0 && (
                <div className="no-more-data">没有更多消息了</div>
              )}
            </>
          ) : (
            <Empty description="暂无消息" className="empty-message" />
          )}
        </div>
      </Drawer>

      {/* 动态详情弹窗 */}
      <Modal
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetailMoment(null); setDetailCommentInput(''); setDetailReplyTarget(null); }}
        footer={null}
        width={600}
        centered
        destroyOnClose
        title={detailMoment ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={32} src={detailMoment.userAvatar}>{detailMoment.userName?.charAt(0)}</Avatar>
            <span style={{ fontWeight: 600 }}>{detailMoment.userName}</span>
            <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>
              {moment(detailMoment.createTime).fromNow()}
            </span>
          </div>
        ) : '动态详情'}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
          </div>
        ) : detailMoment ? (
          <div style={{ padding: '4px 0' }}>
            {/* 内容 */}
            {detailMoment.content && (
              <div style={{ fontSize: 15, lineHeight: 1.7, color: '#262626', marginBottom: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {detailMoment.content}
              </div>
            )}
            {/* 图片九宫格 */}
            {(() => {
              const images = (detailMoment.mediaJson || []).filter(i => i.type === 'image').map(i => i.url!);
              if (!images.length) return null;
              const cols = images.length === 1 ? 1 : images.length === 2 || images.length === 4 ? 2 : 3;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, maxWidth: cols === 1 ? 300 : 360, marginBottom: 14 }}>
                  {images.slice(0, 9).map((url, i) => (
                    <img key={i} src={url} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                      onClick={() => window.open(url, '_blank')} />
                  ))}
                </div>
              );
            })()}
            {/* 位置 */}
            {detailMoment.location && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1890ff', marginBottom: 12, padding: '4px 10px', background: 'rgba(24,144,255,0.08)', borderRadius: 20 }}>
                <EnvironmentOutlined /><span>{detailMoment.location}</span>
              </div>
            )}
            {/* 评论列表 */}
            {detailComments.length > 0 && (
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4, marginBottom: 12 }}>
                {detailComments.map((comment) => (
                  <div key={comment.id} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <Avatar size={28} src={comment.userAvatar}>{comment.userName?.charAt(0)}</Avatar>
                    <div style={{ flex: 1, fontSize: 14, lineHeight: 1.6 }}>
                      <span style={{ color: '#576b95', fontWeight: 500, marginRight: 6 }}>{comment.userName}</span>
                      <span style={{ color: '#333', wordBreak: 'break-word' }}>{comment.content}</span>
                      <div style={{ fontSize: 12, color: '#bbb', marginTop: 2, display: 'flex', gap: 12 }}>
                        <span>{moment(comment.createTime).fromNow()}</span>
                        <span
                          style={{ color: '#576b95', cursor: 'pointer' }}
                          onClick={() => setDetailReplyTarget({ commentId: comment.id!, userName: comment.userName! })}
                        >回复</span>
                      </div>
                      {/* 子评论 */}
                      {(comment.children || []).map((child) => (
                        <div key={child.id} style={{ display: 'flex', gap: 6, marginTop: 8, marginLeft: 8 }}>
                          <Avatar size={22} src={child.userAvatar}>{child.userName?.charAt(0)}</Avatar>
                          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                            <span style={{ color: '#576b95', fontWeight: 500, marginRight: 4 }}>{child.userName}</span>
                            {child.replyUserName && (
                              <span style={{ color: '#999', marginRight: 4 }}>回复 <span style={{ color: '#576b95' }}>{child.replyUserName}</span></span>
                            )}
                            <span style={{ color: '#333' }}>{child.content}</span>
                            <div style={{ fontSize: 12, color: '#bbb', marginTop: 2, display: 'flex', gap: 12 }}>
                              <span>{moment(child.createTime).fromNow()}</span>
                              <span
                                style={{ color: '#576b95', cursor: 'pointer' }}
                                onClick={() => setDetailReplyTarget({ commentId: comment.id!, userName: child.userName! })}
                              >回复</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* 评论输入区 */}
            <div style={{ borderTop: detailComments.length === 0 ? '1px solid #f0f0f0' : 'none', paddingTop: detailComments.length === 0 ? 12 : 0 }}>
              {detailReplyTarget && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#999', background: '#f5f5f5', padding: '3px 10px', borderRadius: 12, marginBottom: 8 }}>
                  回复 <span style={{ color: '#576b95' }}>{detailReplyTarget.userName}</span>
                  <CloseOutlined style={{ fontSize: 11, cursor: 'pointer' }} onClick={() => setDetailReplyTarget(null)} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  placeholder={detailReplyTarget ? `回复 ${detailReplyTarget.userName}...` : '写评论...'}
                  value={detailCommentInput}
                  onChange={(e) => setDetailCommentInput(e.target.value)}
                  onPressEnter={handleDetailSubmitComment}
                  maxLength={200}
                  style={{ borderRadius: 20, background: '#f7f7f7', borderColor: 'transparent', flex: 1 }}
                />
                <Button
                  type="primary"
                  size="small"
                  loading={detailSubmitting}
                  disabled={!detailCommentInput.trim()}
                  onClick={handleDetailSubmitComment}
                  style={{ borderRadius: 16, background: '#f4ac70', borderColor: '#f4ac70', padding: '0 14px' }}
                >
                  发送
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
    );
  }
);

export default MessageNotification;