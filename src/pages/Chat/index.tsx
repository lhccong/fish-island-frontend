import React, {useEffect, useRef, useState} from 'react';
import {Alert, Avatar, Button, Input, message, Popover, Spin, Popconfirm, Modal} from 'antd';
import COS from 'cos-js-sdk-v5';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  SendOutlined,
  SmileOutlined,
  SoundOutlined,
  DeleteOutlined,
  PaperClipOutlined
} from '@ant-design/icons';
import styles from './index.less';
import {useModel} from "@@/exports";
import {BACKEND_HOST_WS} from "@/constants";
import {getOnlineUserListUsingGet, listMessageVoByPageUsingPost} from "@/services/backend/chatController";
import MessageContent from '@/components/MessageContent';
import EmoticonPicker from '@/components/EmoticonPicker';
import {getCosCredentialUsingGet, uploadTo111666UsingPost} from "@/services/backend/fileController";
import {uploadFileByMinioUsingPost} from "@/services/backend/fileController";
import { wsService } from '@/services/websocket';
import { history } from '@umijs/max';

interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: Date;
  quotedMessage?: Message;
  mentionedUsers?: User[];
  region?: string;
  country?: string;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  level: number;
  isAdmin: boolean;
  status?: string;
  points?: number;
  region?: string;
  country?: string;
  avatarFramerUrl?: string;
}

const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isEmoticonPickerVisible, setIsEmoticonPickerVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [isUserListCollapsed, setIsUserListCollapsed] = useState(false);
  const {initialState} = useModel('@@initialState');
  const {currentUser} = initialState || {};
  const [messageApi, contextHolder] = message.useMessage();
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isManuallyClosedRef = useRef(false);

  // 分页相关状态
  const [current, setCurrent] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const pageSize = 10;
  // 添加已加载消息ID的集合
  const [loadedMessageIds] = useState<Set<string>>(new Set());

  const [announcement, setAnnouncement] = useState<string>('欢迎来到摸鱼聊天室！🎉 这里是一个充满快乐的地方~。致谢：感谢玄德大佬、yovvis大佬 赞助的对象存储服务🌟');
  const [showAnnouncement, setShowAnnouncement] = useState<boolean>(true);

  const [isComponentMounted, setIsComponentMounted] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);

  const [notifications, setNotifications] = useState<Message[]>([]);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userIpInfo, setUserIpInfo] = useState<{ region: string; country: string } | null>(null);

  const inputRef = useRef<any>(null);  // 添加输入框的ref

  // 修改 getIpInfo 函数
  const getIpInfo = async () => {
    try {
      // 先获取用户的 IP 地址
      const ipResponse = await fetch('https://ip.renfei.net/?lang=zh-CN');
      const ipData = await ipResponse.json();
      const userIp = ipData.clientIP;

      // 使用 allorigins.win 作为代理访问 ip-api.com
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`http://ip-api.com/json/${userIp}?lang=zh-CN`)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (data.status === 'success') {
        console.log('IP信息:', {
          IP: data.query,
          '国家': data.country,
          '省份': data.regionName,
          '城市': data.city,
          '运营商': data.isp,
          '经纬度': `${data.lat}, ${data.lon}`
        });

        // 保存省份和国家信息
        setUserIpInfo({
          region: data.regionName,
          country: data.country
        });
      }
    } catch (error) {
      console.error('获取IP信息失败:', error);
    }
  };

  // 在组件加载时获取IP信息
  useEffect(() => {
    getIpInfo();
  }, []);

  // 获取在线用户列表
  const fetchOnlineUsers = async () => {
    try {
      const response = await getOnlineUserListUsingGet();
      if (response.data) {
        const onlineUsersList = response.data.map(user => ({
          id: String(user.id),
          name: user.name || '未知用户',
          avatar: user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
          level: user.level || 1,
          isAdmin: user.isAdmin || false,
          status: '在线',
          points: user.points || 0,
          avatarFramerUrl: user.avatarFramerUrl,
        }));

        // 添加机器人用户
        const botUser = {
          id: '-1',
          name: '摸鱼助手',
          avatar: 'https://codebug-1309318075.cos.ap-shanghai.myqcloud.com/fishMessage/34eaba5c-3809-45ef-a3bd-dd01cf97881b_478ce06b6d869a5a11148cf3ee119bac.gif',
          level: 1,
          isAdmin: false,
          status: '在线',
          points: 9999,
          region: '鱼塘',
          country: '摸鱼岛',
          avatarFramerUrl: '',
        };
        onlineUsersList.unshift(botUser);

        // 如果当前用户已登录且不在列表中，将其添加到列表
        if (currentUser?.id && !onlineUsersList.some(user => user.id === String(currentUser.id))) {
          onlineUsersList.push({
            id: String(currentUser.id),
            name: currentUser.userName || '未知用户',
            avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
            level: currentUser.level || 1,
            isAdmin: currentUser.userRole === 'admin',
            status: '在线',
            points: currentUser.points || 0,
            avatarFramerUrl: currentUser.avatarFramerUrl,
          });
        }

        setOnlineUsers(onlineUsersList);
      }
    } catch (error) {
      console.error('获取在线用户列表失败:', error);
      messageApi.error('获取在线用户列表失败');
    }
  };

  // 初始化时获取在线用户列表
  useEffect(() => {
    fetchOnlineUsers();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  };
  const loadHistoryMessages = async (page: number, isFirstLoad = false) => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      const response = await listMessageVoByPageUsingPost({
        current: page,
        pageSize,
        roomId: -1,
        sortField: 'createTime',
        sortOrder: 'desc'
      });
      if (response.data?.records) {
        const historyMessages = response.data.records
          .map(record => ({
            id: String(record.messageWrapper?.message?.id),
            content: record.messageWrapper?.message?.content || '',
            sender: {
              id: String(record.userId),
              name: record.messageWrapper?.message?.sender?.name || '未知用户',
              avatar: record.messageWrapper?.message?.sender?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
              level: record.messageWrapper?.message?.sender?.level || 1,
              points: record.messageWrapper?.message?.sender?.points || 0,
              isAdmin: record.messageWrapper?.message?.sender?.isAdmin || false,
              region: record.messageWrapper?.message?.sender?.region || '未知地区',
              country: record.messageWrapper?.message?.sender?.country ,
              avatarFramerUrl: record.messageWrapper?.message?.sender?.avatarFramerUrl,
            },
            timestamp: new Date(record.messageWrapper?.message?.timestamp || Date.now()),
            quotedMessage: record.messageWrapper?.message?.quotedMessage ? {
              id: String(record.messageWrapper.message.quotedMessage.id),
              content: record.messageWrapper.message.quotedMessage.content || '',
              sender: {
                id: String(record.messageWrapper.message.quotedMessage.sender?.id),
                name: record.messageWrapper.message.quotedMessage.sender?.name || '未知用户',
                avatar: record.messageWrapper.message.quotedMessage.sender?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
                level: record.messageWrapper.message.quotedMessage.sender?.level || 1,
                points: record.messageWrapper.message.quotedMessage.sender?.points || 0,
                isAdmin: record.messageWrapper.message.quotedMessage.sender?.isAdmin || false,
                region: record.messageWrapper?.message.quotedMessage?.sender?.region || '未知地区',
                avatarFramerUrl: record.messageWrapper?.message.quotedMessage?.sender?.avatarFramerUrl,
              },
              timestamp: new Date(record.messageWrapper.message.quotedMessage.timestamp || Date.now())
            } : undefined,
            region: userIpInfo?.region || '未知地区'
          }))
          .filter(msg => !loadedMessageIds.has(msg.id));

        // 将新消息的ID添加到已加载集合中
        historyMessages.forEach(msg => loadedMessageIds.add(msg.id));

        // 处理历史消息，确保正确的时间顺序（旧消息在上，新消息在下）
        if (isFirstLoad) {
          // 首次加载时，反转消息顺序，使最旧的消息在上面
          setMessages(historyMessages.reverse());
        } else {
          // 加载更多历史消息时，新的历史消息应该在当前消息的上面
          // 只有在有新消息时才更新状态
          if (historyMessages.length > 0) {
            setMessages(prev => [...historyMessages.reverse(), ...prev]);
          }
        }

        setTotal(response.data.total || 0);

        // 更新是否还有更多消息
        // 考虑实际加载的消息数量，而不是页码计算
        const currentTotal = loadedMessageIds.size;
        setHasMore(currentTotal < (response.data.total || 0));

        // 只有在成功加载新消息时才更新页码
        if (historyMessages.length > 0) {
          setCurrent(page);
        }

        // 如果是首次加载，将滚动条设置到底部
        if (isFirstLoad) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
    } catch (error) {
      messageApi.error('加载历史消息失败');
      console.error('加载历史消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查是否在底部
  const checkIfNearBottom = () => {
    const container = messageContainerRef.current;
    if (!container) return;

    // 只有完全在底部时才返回true
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight === 0;
    setIsNearBottom(isAtBottom);
  };

  // 监听滚动事件
  const handleScroll = () => {
    const container = messageContainerRef.current;
    if (!container || loading || !hasMore) return;

    // 检查是否在底部
    checkIfNearBottom();

    // 当滚动到顶部时加载更多
    if (container.scrollTop === 0) {
      // 更新当前页码，加载下一页
      const nextPage = current + 1;
      if (hasMore) {
        loadHistoryMessages(nextPage);
      }
    }
  };

  // 初始化时加载历史消息
  useEffect(() => {
    loadHistoryMessages(1, true);
  }, []);

  // 添加滚动监听
  useEffect(() => {
    const container = messageContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loading, hasMore, current]);

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);

      // 如果文件大小超过 1MB，进行压缩
      if (file.size > 1024 * 1024) {
        const compressedFile = await compressImage(file);
        if (compressedFile) {
          file = compressedFile;
        }
      }

      const res = await uploadTo111666UsingPost(
        {},  // body 参数
        file,  // 文件参数
        {  // 其他选项
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!res.data) {
        throw new Error('图片上传失败');
      }

      // 设置预览图片
      setPendingImageUrl(res.data);

    } catch (error) {
      messageApi.error(`上传失败：${error}`);
    } finally {
      setUploading(false);
    }
  };

  // 添加图片压缩函数
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 如果图片尺寸过大，先缩小尺寸
          const maxDimension = 2000; // 最大尺寸
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建画布上下文'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // 尝试不同的质量级别，直到文件大小小于 1MB
          let quality = 0.9;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          while (compressedDataUrl.length > 1024 * 1024 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // 将 DataURL 转换回 File 对象
          const arr = compressedDataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);

          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }

          const compressedFile = new File([u8arr], file.name, { type: mime || 'image/jpeg' });
          resolve(compressedFile);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
    });
  };

  // 处理粘贴事件
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
        break;
      }
    }
  };

  // 在 handleSend 函数之前添加取消引用的函数
  const handleCancelQuote = () => {
    setQuotedMessage(null);
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    try {
      setUploadingFile(true);

      // 调用后端上传接口
      const res = await uploadFileByMinioUsingPost(
        { biz: 'user_file' },  // 业务标识参数
        {},               // body 参数
        file,            // 文件参数
        {                // 其他选项
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!res.data) {
        throw new Error('文件上传失败');
      }

      // 获取文件的访问URL
      const fileUrl = res.data;
      console.log('文件上传地址：', fileUrl);
      setPendingFileUrl(fileUrl);

      messageApi.success('文件上传成功');
    } catch (error) {
      messageApi.error(`文件上传失败：${error}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // 移除待发送的文件
  const handleRemoveFile = () => {
    setPendingFileUrl(null);
  };

  // 添加滚动到指定消息的函数
  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({behavior: 'smooth', block: 'center'});
      // 添加高亮效果
      messageElement.classList.add(styles.highlighted);
      setTimeout(() => {
        messageElement.classList.remove(styles.highlighted);
      }, 2000);
    }
  };

  // 添加处理@消息的函数
  const handleMentionNotification = (message: Message) => {
    if (message.mentionedUsers?.some(user => user.id === String(currentUser?.id))) {
      messageApi.info({
        content: (
          <div onClick={() => scrollToMessage(message.id)}>
            {message.sender.name} 在消息中提到了你
          </div>
        ),
        duration: 5,
        key: message.id,
      });
      setNotifications(prev => [...prev, message]);
    }
  };

  // 添加 WebSocket 消息处理函数
  const handleChatMessage = (data: any) => {
    const otherUserMessage = data.data.message;
    if (otherUserMessage.sender.id !== String(currentUser?.id)) {
      setMessages(prev => {
        // 添加新消息
        const newMessages = [...prev, {...otherUserMessage}];

        // 检查是否在底部
        const container = messageContainerRef.current;
        if (container) {
          const threshold = 30; // 30px的阈值
          const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
          const isNearBottom = distanceFromBottom <= threshold;

          // 只有在底部时才限制消息数量
          if (isNearBottom && newMessages.length > 25) {
            return newMessages.slice(-25);
          }
        }
        return newMessages;
      });

      handleMentionNotification(otherUserMessage);

      // 实时检查是否在底部
      const container = messageContainerRef.current;
      if (container) {
        const threshold = 30; // 30px的阈值，在底部附近就会自动滚动
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom <= threshold) {
          setTimeout(scrollToBottom, 100);
        }
      }
    }
  };

  const handleUserMessageRevoke = (data: any) => {
    setMessages(prev => prev.filter(msg => msg.id !== data.data));
    setTotal(prev => Math.max(0, prev - 1));
  };

  const handleUserOnline = (data: any) => {
    setOnlineUsers(prev => [
      ...prev,
      ...data.data.filter((newUser: { id: string; }) => !prev.some(user => user.id === newUser.id))
    ]);
  };

  const handleUserOffline = (data: any) => {
    setOnlineUsers(prev => prev.filter(user => user.id !== data.data));
  };

  // 修改 WebSocket 连接逻辑
  useEffect(() => {
    setIsComponentMounted(true);
    isManuallyClosedRef.current = false;

    // 只有当用户已登录时才建立WebSocket连接
    if (currentUser?.id) {
      const token = localStorage.getItem('tokenValue');
      if (!token) {
        messageApi.error('请先登录！');
        return;
      }

      // 添加消息处理器
      wsService.addMessageHandler('chat', handleChatMessage);
      wsService.addMessageHandler('userMessageRevoke', handleUserMessageRevoke);
      wsService.addMessageHandler('userOnline', handleUserOnline);
      wsService.addMessageHandler('userOffline', handleUserOffline);

      // 连接WebSocket
      wsService.connect(token);

      return () => {
        setIsComponentMounted(false);
        isManuallyClosedRef.current = true;
        // 移除消息处理器
        wsService.removeMessageHandler('chat', handleChatMessage);
        wsService.removeMessageHandler('userMessageRevoke', handleUserMessageRevoke);
        wsService.removeMessageHandler('userOnline', handleUserOnline);
        wsService.removeMessageHandler('userOffline', handleUserOffline);
      };
    }
  }, [currentUser?.id]);

  // 修改 handleSend 函数
  const handleSend = (customContent?: string) => {
    let content = customContent || inputValue;

    // 检查是否包含 iframe 标签
    const iframeRegex = /<iframe[^>]*>.*?<\/iframe>/gi;
    if (iframeRegex.test(content)) {
      messageApi.warning('为了安全考虑，不支持 iframe 标签');
      return;
    }

    // 如果有待发送的图片，将其添加到消息内容中
    if (pendingImageUrl) {
      content = `[img]${pendingImageUrl}[/img]${content}`;
    }

    // 如果有待发送的文件，将其添加到消息内容中
    if (pendingFileUrl) {
      content = `[file]${pendingFileUrl}[/file]${content}`;
    }

    if (!content.trim() && !pendingImageUrl && !pendingFileUrl) {
      message.warning('请输入消息内容');
      return;
    }

    if (!currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    // 解析@用户
    const mentionedUsers: User[] = [];
    const mentionRegex = /@([^@\s]+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1];
      const mentionedUser = onlineUsers.find(user => user.name === mentionedName);
      if (mentionedUser) {
        mentionedUsers.push(mentionedUser);
      }
    }

    const newMessage: Message = {
      id: `${Date.now()}`,
      content: content,
      sender: {
        id: String(currentUser.id),
        name: currentUser.userName || '游客',
        avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
        level: currentUser.level || 1,
        points: currentUser.points || 0,
        isAdmin: currentUser.userRole === 'admin',
        region: userIpInfo?.region || '未知地区',
        country: userIpInfo?.country || '未知国家',
        avatarFramerUrl: currentUser.avatarFramerUrl,
      },
      timestamp: new Date(),
      quotedMessage: quotedMessage || undefined,
      mentionedUsers: mentionedUsers.length > 0 ? mentionedUsers : undefined,
      region: userIpInfo?.region || '未知地区',
      country: userIpInfo?.country || '未知国家'
    };

    // 使用全局 WebSocket 服务发送消息
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: {
          message: newMessage
        }
      }
    });

    // 更新消息列表
    setMessages(prev => [...prev, newMessage]);
    setTotal(prev => prev + 1);
    setHasMore(true);

    // 清空输入框、预览图片、文件和引用消息
    setInputValue('');
    setPendingImageUrl(null);
    setPendingFileUrl(null);
    setQuotedMessage(null);

    // 滚动到底部
    setTimeout(scrollToBottom, 100);
  };

  // 移除待发送的图片
  const handleRemoveImage = () => {
    setPendingImageUrl(null);
  };

  // 添加撤回消息的处理函数
  const handleRevokeMessage = (messageId: string) => {
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'userMessageRevoke',
        content: messageId
      }
    });

    messageApi.info('消息已撤回');
  };

  // 修改handleMentionUser函数
  const handleMentionUser = (user: User) => {
    const mentionText = `@${user.name} `;
    setInputValue(prev => {
      // 如果当前输入框已经有这个@，就不重复添加
      if (prev.includes(mentionText)) {
        return prev;
      }
      return prev + mentionText;
    });
    // 让输入框获得焦点
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const UserInfoCard: React.FC<{ user: User }> = ({user}) => {
    return (
      <div className={styles.userInfoCard}>
        <div className={styles.userInfoCardHeader}>
          <div
            className={styles.avatarWrapper}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleMentionUser(user);
            }}
          >
            <div className={styles.avatarWithFrame}>
              <Avatar src={user.avatar} size={48}/>
              {user.avatarFramerUrl && (
                <img
                  src={user.avatarFramerUrl}
                  className={styles.avatarFrame}
                  alt="avatar-frame"
                />
              )}
            </div>
            <div className={styles.floatingFish}>🐟</div>
          </div>
          <div className={styles.userInfoCardTitle}>
            <div className={styles.userInfoCardNameRow}>
              <span className={styles.userInfoCardName}>{user.name}</span>
              <span className={styles.userInfoCardLevel}>
                <span className={styles.levelEmoji}>{getLevelEmoji(user.level)}</span>
                <span className={styles.levelText}>{user.level}</span>
              </span>
            </div>
            <div className={styles.userInfoCardAdminTag}>
              {getAdminTag(user.isAdmin, user.level)}
            </div>
            <div className={styles.userInfoCardPoints}>
              <span className={styles.pointsEmoji}>✨</span>
              <span className={styles.pointsText}>积分: {user.points || 0}</span>
            </div>
            {user.id === String(currentUser?.id) ? (
              userIpInfo && (
                <div className={styles.userInfoCardLocation}>
                  <span className={styles.locationEmoji}>📍</span>
                  <span className={styles.locationText}>{userIpInfo.country} · {userIpInfo.region}</span>
                </div>
              )
            ) : (
              user.region && (
                <div className={styles.userInfoCardLocation}>
                  <span className={styles.locationEmoji}>📍</span>
                  <span className={styles.locationText}>{user.country ? `${user.country} · ${user.region}` : user.region}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  // 在 return 语句之前添加引用消息的处理函数
  const handleQuoteMessage = (message: Message) => {
    setQuotedMessage(message);
  };

  const getLevelEmoji = (level: number) => {
    switch (level) {
      case 7:
        return '👑';  // 最高级
      case 6:
        return '🛏';
      case 5:
        return '🏖';
      case 4:
        return '🎣';
      case 3:
        return '⭐';
      case 2:
        return '🐣';
      case 1:
        return '💦';
      default:
        return '💦';  // 默认显示
    }
  };

  // 新增管理员标识函数
  const getAdminTag = (isAdmin: boolean, level: number) => {
    // if (isAdmin) {
    //   // 随机选择一个摸鱼表情
    //   const fishEmojis = ['🐟', '🐠', '🐡', '🎣'];
    //   const randomFish = fishEmojis[Math.floor(Math.random() * fishEmojis.length)];
    //   return (
    //     <span className={styles.adminTag}>
    //       {randomFish}
    //       <span className={styles.adminText}>摸鱼官</span>
    //     </span>
    //   );
    // } else {
    // 根据等级返回不同的标签
    let tagText = '';
    let tagEmoji = '';
    let tagClass = '';

    switch (level) {
      case 7:
        tagText = '摸鱼皇帝';
        tagEmoji = '👑';
        tagClass = styles.levelTagMaster;
        break;
      case 6:
        tagText = '躺平宗师';
        tagEmoji = '🛏';
        tagClass = styles.levelTagExpert;
        break;
      case 5:
        tagText = '摆烂大师';
        tagEmoji = '🏖️';
        tagClass = styles.levelTagPro;
        break;
      case 4:
        tagText = '摸鱼专家 ';
        tagEmoji = '🎣';
        tagClass = styles.levelTagAdvanced;
        break;
      case 3:
        tagText = '水群达人';
        tagEmoji = '⭐';
        tagClass = styles.levelTagBeginner;
        break;
      case 2:
        tagText = '摸鱼学徒';
        tagEmoji = '🐣';
        tagClass = styles.levelTagNewbie;
        break;
      default:
        tagText = '划水新秀';
        tagEmoji = '💦';
        tagClass = styles.levelTagNewbie;
    }

    return (
      <span className={`${styles.adminTag} ${tagClass}`}>
          {tagEmoji}
        <span className={styles.adminText}>{tagText}</span>
        </span>
    );
    // }
  };

  const handleEmojiClick = (emoji: any) => {
    setInputValue(prev => prev + emoji.native);
    setIsEmojiPickerVisible(false);
    // 让输入框获得焦点
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const emojiPickerContent = (
    <div className={styles.emojiPicker}>
      <Picker
        data={data}
        onEmojiSelect={handleEmojiClick}
        theme="light"
        locale="zh"
        previewPosition="none"
        skinTonePosition="none"
      />
    </div>
  );

  const handleEmoticonSelect = (url: string) => {
    // 将图片URL作为消息内容发送
    const imageMessage = `[img]${url}[/img]`;
    setInputValue(imageMessage);

    // 直接使用新的消息内容发送，而不是依赖 inputValue 的状态更新
    if (!wsService.isConnected()) {
      return;
    }

    if (!currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    const newMessage: Message = {
      id: `${Date.now()}`,
      content: imageMessage,
      sender: {
        id: String(currentUser.id),
        name: currentUser.userName || '游客',
        avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
        level: currentUser.level || 1,
        isAdmin: currentUser.userRole === 'admin',
        avatarFramerUrl: currentUser.avatarFramerUrl,
      },
      timestamp: new Date(),
    };

    // 新发送的消息添加到列表末尾
    setMessages(prev => [...prev, newMessage]);
    // 更新总消息数和分页状态
    setTotal(prev => prev + 1);
    setHasMore(true);

    // 发送消息到服务器
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: {
          message: newMessage
        }
      }
    });

    setInputValue('');
    setIsEmoticonPickerVisible(false);
    // 发送消息后滚动到底部
    setTimeout(scrollToBottom, 100);
  };

  // 修改 handleInviteClick 函数
  const handleInviteClick = (roomId: string) => {
    // 跳转到游戏页面并设置房间号
    history.push(`/game/piece?roomId=${roomId}&mode=online`);
  };

  // 修改 MessageContent 组件的渲染逻辑
  const renderMessageContent = (content: string) => {
    // 检查是否是邀请消息
    const inviteMatch = content.match(/\[invite\](.*?)\[\/invite\]/);
    if (inviteMatch) {
      const roomId = inviteMatch[1];
      return (
        <div className={styles.inviteMessage}>
          <div className={styles.inviteContent}>
            <span className={styles.inviteText}>🎮 五子棋对战邀请</span>
            <Button
              type="primary"
              size="small"
              onClick={() => handleInviteClick(roomId)}
              className={styles.inviteButton}
            >
              加入对战
            </Button>
          </div>
        </div>
      );
    }
    return <MessageContent content={content} />;
  };

  return (
    <div className={`${styles.chatRoom} ${isUserListCollapsed ? styles.collapsed : ''}`}>
      {contextHolder}
      {showAnnouncement && (
        <Alert
          message={
            <div className={styles.announcementContent}>
              <SoundOutlined className={styles.announcementIcon}/>
              <span>{announcement}</span>
            </div>
          }
          type="info"
          showIcon={false}
          closable
          onClose={() => setShowAnnouncement(false)}
          className={styles.announcement}
        />
      )}
      <div className={styles['floating-fish'] + ' ' + styles.fish1}>🐟</div>
      <div className={styles['floating-fish'] + ' ' + styles.fish2}>🐠</div>
      <div className={styles['floating-fish'] + ' ' + styles.fish3}>🐡</div>
      <div className={styles['floating-fish'] + ' ' + styles.bubble1}>💭</div>
      <div className={styles['floating-fish'] + ' ' + styles.bubble2}>💭</div>
      <div
        className={styles.messageContainer}
        ref={messageContainerRef}
        onScroll={handleScroll}
      >
        {loading && <div className={styles.loadingWrapper}><Spin/></div>}
        {messages.map((msg) => (
          <div
            key={msg.id}
            id={`message-${msg.id}`}
            className={`${styles.messageItem} ${
              currentUser?.id && String(msg.sender.id) === String(currentUser.id) ? styles.self : ''
            } ${notifications.some(n => n.id === msg.id) ? styles.mentioned : ''}`}
          >
            <div className={styles.messageHeader}>
              <div
                className={styles.avatar}
                onClick={() => handleMentionUser(msg.sender)}
                style={{cursor: 'pointer'}}
              >
                <Popover
                  content={<UserInfoCard user={msg.sender}/>}
                  trigger="hover"
                  placement="top"
                >
                  <div className={styles.avatarWithFrame}>
                    <Avatar src={msg.sender.avatar} size={32}/>
                    {msg.sender.avatarFramerUrl && (
                      <img
                        src={msg.sender.avatarFramerUrl}
                        className={styles.avatarFrame}
                        alt="avatar-frame"
                      />
                    )}
                  </div>
                </Popover>
              </div>
              <div className={styles.senderInfo}>
                <span className={styles.senderName}>
                  {msg.sender.name}
                  {getAdminTag(msg.sender.isAdmin, msg.sender.level)}
                  <span className={styles.levelBadge}>
                    {getLevelEmoji(msg.sender.level)} {msg.sender.level}
                  </span>
                </span>
              </div>
            </div>
            <div className={styles.messageContent}>
              {msg.quotedMessage && (
                <div className={styles.quotedMessage}>
                  <div className={styles.quotedMessageHeader}>
                    <span className={styles.quotedMessageSender}>{msg.quotedMessage.sender.name}</span>
                    <span className={styles.quotedMessageTime}>
                      {new Date(msg.quotedMessage.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.quotedMessageContent}>
                    {renderMessageContent(msg.quotedMessage.content)}
                  </div>
                </div>
              )}
              {renderMessageContent(msg.content)}
            </div>
            <div className={styles.messageFooter}>
              <span className={styles.timestamp}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              {(currentUser?.id && String(msg.sender.id) === String(currentUser.id)) || currentUser?.userRole === 'admin' ? (
                <Popconfirm
                  title="确定要撤回这条消息吗？"
                  onConfirm={() => handleRevokeMessage(msg.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <span className={styles.revokeText}>撤回</span>
                </Popconfirm>
              ) : null}
              <span
                className={styles.quoteText}
                onClick={() => handleQuoteMessage(msg)}
              >
                引用
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef}/>
      </div>

      <div className={styles.userList}>
        <div
          className={styles.collapseButton}
          onClick={() => setIsUserListCollapsed(!isUserListCollapsed)}
        >
          {isUserListCollapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
        </div>
        <div className={styles.userListHeader}>
          在线成员 ({onlineUsers.length})
        </div>
        {[...onlineUsers]
          .sort((a, b) => (b.points || 0) - (a.points || 0))
          .map(user => (
            <div
              key={user.id}
              className={styles.userItem}
              onClick={() => handleMentionUser(user)}
              style={{cursor: 'pointer'}}
            >
              <div className={styles.avatarWrapper}>
                <Popover
                  content={<UserInfoCard user={user}/>}
                  trigger="hover"
                  placement="right"
                >
                  <div className={styles.avatarWithFrame}>
                    <Avatar src={user.avatar} size={28}/>
                  </div>
                </Popover>
              </div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {user.name}
                </div>
                <div className={styles.userStatus}>{user.status}</div>
              </div>
              <span className={styles.levelBadge}>
              {getLevelEmoji(user.level)}
            </span>
            </div>
          ))}
      </div>

      <div className={styles.inputArea}>
        {quotedMessage && (
          <div className={styles.quotePreview}>
            <div className={styles.quotePreviewContent}>
              <span className={styles.quotePreviewSender}>{quotedMessage.sender.name}:</span>
              <span className={styles.quotePreviewText}>
                {renderMessageContent(quotedMessage.content)}
              </span>
            </div>
            <Button
              type="text"
              icon={<DeleteOutlined/>}
              className={styles.removeQuote}
              onClick={handleCancelQuote}
            />
          </div>
        )}
        {pendingImageUrl && (
          <div className={styles.imagePreview}>
            <div className={styles.previewWrapper}>
              <img
                src={pendingImageUrl}
                alt="预览图片"
                className={styles.previewImage}
                onClick={() => {
                  setPreviewImage(pendingImageUrl);
                  setIsPreviewVisible(true);
                }}
              />
              <Button
                type="text"
                icon={<DeleteOutlined/>}
                className={styles.removeImage}
                onClick={handleRemoveImage}
              />
            </div>
          </div>
        )}
        {pendingFileUrl && (
          <div className={styles.filePreview}>
            <div className={styles.previewWrapper}>
              <div className={styles.fileInfo}>
                <PaperClipOutlined className={styles.fileIcon}/>
                <span className={styles.fileName}>
                  {pendingFileUrl.split('/').pop()}
                </span>
              </div>
              <Button
                type="text"
                icon={<DeleteOutlined/>}
                className={styles.removeFile}
                onClick={handleRemoveFile}
              />
            </div>
          </div>
        )}
        <div className={styles.inputRow}>
          <input
            type="file"
            ref={fileInputRef}
            style={{display: 'none'}}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
              }
            }}
            disabled={uploadingFile}
          />
          <Popover
            content={emojiPickerContent}
            trigger="click"
            visible={isEmojiPickerVisible}
            onVisibleChange={setIsEmojiPickerVisible}
            placement="topLeft"
            overlayClassName={styles.emojiPopover}
          >
            <Button
              icon={<SmileOutlined/>}
              className={styles.emojiButton}
            />
          </Popover>
          <Popover
            content={<EmoticonPicker onSelect={handleEmoticonSelect}/>}
            trigger="click"
            visible={isEmoticonPickerVisible}
            onVisibleChange={setIsEmoticonPickerVisible}
            placement="topLeft"
            overlayClassName={styles.emoticonPopover}
          >
            <Button
              icon={<PictureOutlined/>}
              className={styles.emoticonButton}
            />
          </Popover>
          <Input.TextArea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // 检查是否是输入法组合键
                if (e.nativeEvent.isComposing) {
                  return;
                }
                if (!e.shiftKey) {
                  e.preventDefault(); // 阻止默认的换行行为
                  handleSend();
                }
              }
            }}
            onPaste={handlePaste}
            placeholder={uploading ? "正在上传图片..." : "输入消息或粘贴图片..."}
            maxLength={200}
            disabled={uploading}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className={styles.chatTextArea}
          />
          <span className={styles.inputCounter}>
            {inputValue.length}/200
          </span>
          <Button
            type="text"
            icon={<SendOutlined/>}
            onClick={() => handleSend()}
            disabled={uploading}
          >
            发送
          </Button>
        </div>
      </div>

      <Modal
        visible={isPreviewVisible}
        footer={null}
        onCancel={() => setIsPreviewVisible(false)}
      >
        {previewImage && <img alt="预览" style={{width: '100%'}} src={previewImage}/>}
      </Modal>
    </div>
  );
};

export default ChatRoom;

