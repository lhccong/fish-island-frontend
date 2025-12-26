import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Avatar, Badge, Button, Card, Drawer, Empty, List, Space, Spin, Tag, Tooltip, message, Checkbox, Popconfirm } from 'antd';
import { BellOutlined, CheckCircleOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { batchDeleteUsingPost, batchSetReadUsingPost, listMyEventRemindByPageUsingPost } from '@/services/backend/eventRemindController';
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
    );
  }
);

export default MessageNotification; 