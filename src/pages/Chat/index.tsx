import zhData from '@emoji-mart/data/i18n/zh.json';
import AnnouncementModal from '@/components/AnnouncementModal';
import EmoticonPicker from '@/components/EmoticonPicker';
import MessageContent from '@/components/MessageContent';
import RoomInfoCard from '@/components/RoomInfoCard';
import MoyuPet, { MiniPet } from '@/components/MoyuPet';
import {
  getOnlineUserListUsingGet,
  listMessageVoByPageUsingPost,
} from '@/services/backend/chatController';
import { uploadFileByMinioUsingPost } from '@/services/backend/fileController';
import {
  createRedPacketUsingPost,
  getRedPacketDetailUsingGet,
  getRedPacketRecordsUsingGet,
  grabRedPacketUsingPost,
} from '@/services/backend/redPacketController';
import { muteUserUsingPost, getUserMuteInfoUsingGet, unmuteUserUsingPost } from '@/services/backend/userMuteController';
import { wsService } from '@/services/websocket';
import { useModel } from '@@/exports';
// ... 其他 imports ...
import {
  BugOutlined,
  CloseOutlined,
  CopyOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  GiftOutlined,
  PaperClipOutlined,
  PauseOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RightOutlined,
  SendOutlined,
  SmileOutlined,
  SoundOutlined,
  CalendarOutlined,
  TeamOutlined,
  EllipsisOutlined,
  FileImageOutlined,
  RocketOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { history } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Empty,
  Input,
  message,
  Modal,
  Popconfirm,
  Popover,
  Radio,
  Spin,
  Tabs,
  Badge,
  Switch,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import styles from './index.less';
import { UNDERCOVER_NOTIFICATION } from '@/constants';
import eventBus from '@/utils/eventBus';
import { joinRoomUsingPost } from '@/services/backend/drawGameController';
import { getLevelEmoji, generateUniqueShortId, getTitleTagProperties } from '@/utils/titleUtils';

// 添加样式定义
const additionalStyles = {};

// 合并样式
Object.assign(styles, additionalStyles);

interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: Date;
  quotedMessage?: Message;
  mentionedUsers?: User[];
  region?: string;
  country?: string;
  workdayType?: 'single' | 'double' | 'mixed';
  currentWeekType?: 'big' | 'small';
}

interface User {
  id: string;
  name: string;
  avatar: string;
  level: number;
  isAdmin: boolean;
  vip?: boolean;
  isVip?: boolean;  // 兼容后端可能使用的字段
  status?: string;
  points?: number;
  region?: string;
  country?: string;
  avatarFramerUrl?: string;
  titleId?: number;
  titleIdList?: string;
}

interface Title {
  id: number;
  name: string;
  description: string;
}

// 添加歌曲类型定义
interface Song {
  id: string;
  name: string;
  artist: string;
  url: string;
  cover: string;
  album?: string;
}

// 添加APlayer声明
declare global {
  interface Window {
    APlayer: any;
  }
}

// 添加用户备注类型
interface UserRemark {
  userId: string;
  remark: string;
}

const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [workdayType, setWorkdayType] = useState<'single' | 'double' | 'mixed'>('double');
  const [currentWeekType, setCurrentWeekType] = useState<'big' | 'small'>('big');
  const [inputValue, setInputValue] = useState('');
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isEmoticonPickerVisible, setIsEmoticonPickerVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const [messageApi, contextHolder] = message.useMessage();
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isManuallyClosedRef = useRef(false);
  const isAutoScrollingRef = useRef(false); // 添加自动滚动标记
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set()); // 添加展开图片的状态

  // 分页相关状态
  const [current, setCurrent] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const pageSize = 10;
  const [loadedMessageIds] = useState<Set<string>>(new Set());
  const loadingRef = useRef(false); // 添加loadingRef防止重复请求

  const [announcement, setAnnouncement] = useState<string>(
    '欢迎来到摸鱼聊天室！🎉 这里是一个充满快乐的地方~。致谢：感谢 yovvis 大佬赞助的服务器资源🌟，域名9月份过期，请移步新域名：<a href="https://yucoder.cn/" target="_blank" rel="noopener noreferrer">https://yucoder.cn/</a>',
  );
  const [showAnnouncement, setShowAnnouncement] = useState<boolean>(true);
  const [isAnnouncementModalVisible, setIsAnnouncementModalVisible] = useState(false);

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

  const inputRef = useRef<any>(null); // 添加输入框的ref

  const [isMentionListVisible, setIsMentionListVisible] = useState(false);
  const [mentionListPosition, setMentionListPosition] = useState({ top: 0, left: 0 });
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const mentionListRef = useRef<HTMLDivElement>(null);
  // 添加防抖引用
  const mentionDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [isRedPacketModalVisible, setIsRedPacketModalVisible] = useState(false);
  const [redPacketAmount, setRedPacketAmount] = useState<number>(0);
  const [redPacketCount, setRedPacketCount] = useState<number>(1);
  const [redPacketMessage, setRedPacketMessage] = useState<string>('恭喜发财，大吉大利！');
  const [redPacketType, setRedPacketType] = useState<number>(1); // 1-随机红包 2-平均红包
  // 添加发红包防抖相关的状态
  const [isRedPacketSending, setIsRedPacketSending] = useState(false);
  const redPacketDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 添加红包记录相关状态
  const [isRedPacketRecordsVisible, setIsRedPacketRecordsVisible] = useState(false);
  const [redPacketRecords, setRedPacketRecords] = useState<API.VO[]>([]);
  const [currentRedPacketId, setCurrentRedPacketId] = useState<string>('');
  const [redPacketDetail, setRedPacketDetail] = useState<API.RedPacket | null>(null);
  const [redPacketDetailsMap, setRedPacketDetailsMap] = useState<Map<string, API.RedPacket | null>>(
    new Map(),
  );
  const [isMusicSearchVisible, setIsMusicSearchVisible] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // 添加防抖状态
  const [isSelectingMusic, setIsSelectingMusic] = useState(false);
  const selectMusicDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // 添加音乐搜索加载状态
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  // 添加音乐添加到歌单状态
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);
  // 添加API错误状态
  const [musicApiError, setMusicApiError] = useState<string | null>(null);
  // 添加是否已执行搜索的状态
  const [hasSearched, setHasSearched] = useState(false);

  const [isUserDetailModalVisible, setIsUserDetailModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [isRoomInfoVisible, setIsRoomInfoVisible] = useState<boolean>(false);
  const [undercoverNotification, setUndercoverNotification] = useState<string>(UNDERCOVER_NOTIFICATION.NONE);

  const [isSpeedMode, setIsSpeedMode] = useState<boolean>(false);

  // 添加搜索音乐的函数
  const handleMusicSearch = async () => {
    if (!searchKey.trim()) {
      messageApi.warning('请输入搜索关键词');
      return;
    }

    try {
      setIsSearchingMusic(true);
      setMusicApiError(null);
      setHasSearched(true); // 标记已执行搜索

      const response = await fetch(
        `https://api.kxzjoker.cn/api/163_search?name=${encodeURIComponent(searchKey)}&limit=20`,
      );

      if (!response.ok) {
        throw new Error(`搜索请求失败: ${response.status}`);
      }

      const data = await response.json();
      if (data.code !== 200) {
        throw new Error('音乐API返回错误');
      }

      setSearchResults(data.data || []);

      if (data.data?.length === 0) {
        messageApi.info('未找到相关歌曲');
      }
    } catch (error) {
      console.error('搜索音乐失败:', error);
      setMusicApiError('音乐搜索服务暂时不可用，请稍后再试');
      messageApi.error('搜索音乐失败，音乐API可能暂时不可用');
    } finally {
      setIsSearchingMusic(false);
    }
  };

  // 添加选择音乐的函数（带防抖）
  const handleSelectMusic = async (music: any) => {
    // 如果已经在处理中，直接返回
    if (isSelectingMusic) {
      messageApi.warning('正在处理上一首歌，请稍候...');
      return;
    }

    // 清除之前的防抖定时器
    if (selectMusicDebounceRef.current) {
      clearTimeout(selectMusicDebounceRef.current);
    }

    try {
      setIsSelectingMusic(true);
      setMusicApiError(null);

      // 设置防抖延迟
      selectMusicDebounceRef.current = setTimeout(async () => {
        try {
          const response = await fetch('https://api.kxzjoker.cn/api/163_music', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body: new URLSearchParams({
              url: music.id,
              level: 'lossless',
              type: 'json',
            }).toString(),
          });

          if (!response.ok) {
            throw new Error(`获取音乐链接请求失败: ${response.status}`);
          }

          const data = await response.json();
          if (!data.url) {
            throw new Error('未能获取到音乐链接');
          }

          // 发送消息
          const musicMessage = `🎵 ${music.name} - ${music.artists
            .map((a: any) => a.name)
            .join(',')} [music]${data.url}[/music][cover]${data.pic}[/cover]`;
          handleSend(musicMessage);
          setIsMusicSearchVisible(false);
          setSearchKey('');
          setSearchResults([]);
        } catch (error) {
          console.error('获取音乐链接失败:', error);
          setMusicApiError('音乐解析服务暂时不可用，请稍后再试');
          messageApi.error('获取音乐链接失败，音乐API可能暂时不可用');
        } finally {
          setIsSelectingMusic(false);
        }
      }, 500); // 500毫秒防抖延迟
    } catch (error) {
      setIsSelectingMusic(false);
      messageApi.error('处理音乐选择时出错');
    }
  };

  useEffect(() => {
    return () => {
      if (selectMusicDebounceRef.current) {
        clearTimeout(selectMusicDebounceRef.current);
      }
    };
  }, []);

  // 添加发送频率限制相关的状态
  const [lastSendTime, setLastSendTime] = useState<number>(0);

  // 添加防止重复发送的状态
  const [lastSendContent, setLastSendContent] = useState<string>('');
  const [lastSendContentTime, setLastSendContentTime] = useState<number>(0);
  // 添加用户列表项高度常量
  const USER_ITEM_HEIGHT = 46;
  // 添加 ref 和状态来存储列表容器高度
  const userListRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0); // 初始值设为0

  // 添加一个状态来记录最新消息的时间戳
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(Date.now());

  // 添加用户列表显示隐藏状态，从localStorage获取初始值
  const [isUserListVisible, setIsUserListVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('chat_userlist_visible');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // 添加防抖相关的状态和引用
  const [newMessageCount, setNewMessageCount] = useState<number>(0);
  const newMessageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isLoadingMoyu, setIsLoadingMoyu] = useState(false);

  // 添加用户备注相关状态
  const [userRemarks, setUserRemarks] = useState<Record<string, string>>({});
  const [isRemarkModalVisible, setIsRemarkModalVisible] = useState(false);
  const [remarkValue, setRemarkValue] = useState('');
  const [remarkUserId, setRemarkUserId] = useState<string | null>(null);

  const scrollToBottom = () => {
    const container = messageContainerRef.current;
    if (!container) return;

    // 标记正在进行自动滚动
    isAutoScrollingRef.current = true;

    // 使用 requestAnimationFrame 确保在下一帧执行滚动
    requestAnimationFrame(() => {
      // 使用性能更好的方式计算滚动位置
      const scrollTarget = container.scrollHeight - container.clientHeight;

      container.scrollTo({
        top: scrollTarget,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });

      // 添加二次检查，处理可能的延迟加载情况，但减少不必要的重复滚动
      const checkScrollPosition = () => {
        if (container.scrollTop + container.clientHeight < container.scrollHeight - 20) {
          container.scrollTo({
            top: container.scrollHeight - container.clientHeight,
            behavior: 'auto', // 二次滚动使用即时滚动，避免动画叠加
          });
        }
        // 滚动完成后重置标记
        isAutoScrollingRef.current = false;
      };

      // 使用 requestAnimationFrame 代替 setTimeout，性能更好
      setTimeout(checkScrollPosition, 100);
    });
  };

  // 修改显示新消息提示的函数
  const showNewMessageNotification = (count: number) => {
    // 先清除之前的消息提示
    messageApi.destroy('newMessage');

    messageApi.info({
      content: (
        <div
          onClick={() => {
            // 点击时关闭消息提示
            messageApi.destroy('newMessage');
            scrollToBottom();
          }}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>收到 {count} 条新消息，点击查看</span>
          <CloseOutlined
            onClick={(e) => {
              e.stopPropagation(); // 阻止事件冒泡
              messageApi.destroy('newMessage');
            }}
            style={{
              marginLeft: '10px',
              cursor: 'pointer',
              color: '#999',
              fontSize: '12px',
            }}
          />
        </div>
      ),
      duration: 3,
      key: 'newMessage',
    });
  };

  // 修改计算高度的函数
  const updateListHeight = useCallback(() => {
    if (userListRef.current) {
      const containerHeight = userListRef.current.parentElement?.clientHeight || 0;
      const headerHeight = 40;
      const padding = 20;
      const newHeight = Math.max(containerHeight - headerHeight - padding, 200);
      console.log('计算列表高度:', { containerHeight, headerHeight, padding, newHeight });
      setListHeight(newHeight);
    } else {
      console.log('userListRef.current 不存在，使用默认高度');
      setListHeight(400); // 设置一个默认高度
    }
  }, []);

  // 修改监听逻辑
  useEffect(() => {
    // 创建 ResizeObserver 监听父容器大小变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === userListRef.current?.parentElement) {
          updateListHeight();
        }
      }
    });

    // 监听父容器
    if (userListRef.current?.parentElement) {
      resizeObserver.observe(userListRef.current.parentElement);
    }

    // 初始计算
    updateListHeight();

    // 同时保留窗口大小变化的监听
    window.addEventListener('resize', updateListHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateListHeight);
    };
  }, [updateListHeight]);

  const UserItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const sortedUsers = [...onlineUsers].sort((a, b) => (b.points || 0) - (a.points || 0));
    const user = sortedUsers[index];

    return (
      <div
        key={user.id}
        className={styles.userItem}
        onClick={() => handleSelectMention(user)}
        style={{ ...style, cursor: 'pointer' }}
      >
        {!isSpeedMode && (
          <div className={styles.avatarWrapper}>
            <Popover content={<UserInfoCard user={user} />} trigger="hover" placement="right">
              <div className={styles.avatarWithFrame}>
                <Avatar src={user.avatar} size={28} />
              </div>
            </Popover>
          </div>
        )}
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user.name}</div>
          <div className={styles.userStatus}>{user.status}</div>
        </div>
        <span className={styles.levelBadge}>{getLevelEmoji(user.level)}</span>
      </div>
    );
  };

  // 修改 getIpInfo 函数
  const getIpInfo = async () => {
    try {
      // 先获取用户的 IP 地址
      const ipResponse = await fetch('https://ip.renfei.net/?lang=zh-CN');
      const ipData = await ipResponse.json();
      const userIp = ipData.clientIP;

      // 使用 allorigins.win 作为代理访问 ip-api.com
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `http://ip-api.com/json/${userIp}?lang=zh-CN`,
      )}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (data.status === 'success') {
        console.log('IP信息:', {
          IP: data.query,
          国家: data.country,
          省份: data.regionName,
          城市: data.city,
          运营商: data.isp,
          经纬度: `${data.lat}, ${data.lon}`,
        });

        // 保存省份和国家信息
        setUserIpInfo({
          region: data.regionName,
          country: data.country,
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
        const onlineUsersList = response.data.map((user) => ({
          id: String(user.id),
          name: user.name || '未知用户',
          avatar: user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
          level: user.level || 1,
          isAdmin: user.isAdmin || false,
          status: '在线',
          points: user.points || 0,
          avatarFramerUrl: user.avatarFramerUrl,
          titleId: user.titleId,
          titleIdList: user.titleIdList,
        }));

        // 添加机器人用户
        const botUser = {
          id: '-1',
          name: '摸鱼助手',
          avatar:
            'https://api.oss.cqbo.com/moyu/user_avatar/1/hYskW0jH-34eaba5c-3809-45ef-a3bd-dd01cf97881b_478ce06b6d869a5a11148cf3ee119bac.gif',
          level: 1,
          isAdmin: false,
          status: '在线',
          points: 9999,
          region: '鱼塘',
          country: '摸鱼岛',
          avatarFramerUrl: '',
          titleId: 0,
          titleIdList: '',
        };
        onlineUsersList.unshift(botUser);

        // 如果当前用户已登录且不在列表中，将其添加到列表
        if (
          currentUser?.id &&
          !onlineUsersList.some((user) => user.id === String(currentUser.id))
        ) {
          onlineUsersList.push({
            id: String(currentUser.id),
            name: currentUser.userName || '未知用户',
            avatar:
              currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
            level: currentUser.level || 1,
            isAdmin: currentUser.userRole === 'admin',
            status: '在线',
            points: currentUser.points || 0,
            avatarFramerUrl: currentUser.avatarFramerUrl,
            titleId: currentUser.titleId,
            titleIdList: currentUser.titleIdList,
          });
        }

        setOnlineUsers(onlineUsersList);
      }
    } catch (error) {
      console.error('获取在线用户列表失败:', error);
      messageApi.error('获取在线用户列表失败');
    }
  };
  // 修改 useEffect 来监听消息变化并自动滚动
  useEffect(() => {
    // 只有在以下情况才自动滚动到底部：
    // 1. 是当前用户发送的消息
    // 2. 用户已经在查看最新消息（在底部附近）
    // 3. 不是由于加载历史消息导致的变化

    if (isNearBottom && !loadingRef.current) {
      // 添加短暂延迟，避免与其他滚动机制冲突
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages]); // 监听消息数组变化
  // 初始化时获取在线用户列表（仅在列表可见时）
  useEffect(() => {
    if (isUserListVisible) {
      fetchOnlineUsers();
      // 延迟计算高度，确保DOM已经渲染
      setTimeout(() => {
        updateListHeight();
      }, 100);
    }
  }, [isUserListVisible, updateListHeight]);

  // 监听用户列表显示状态变化，保存到localStorage
  useEffect(() => {
    localStorage.setItem('chat_userlist_visible', JSON.stringify(isUserListVisible));
  }, [isUserListVisible]);

  // 创建用户对象的工具函数
  const createUserFromRecord = (userRecord: any, defaultRegion: string = '未知地区'): User => {
    return {
      id: String(userRecord?.id || ''),
      name: userRecord?.name || '未知用户',
      avatar: userRecord?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
      level: userRecord?.level || 1,
      points: userRecord?.points || 0,
      isAdmin: userRecord?.isAdmin || false,
      isVip: userRecord?.isVip || userRecord?.vip || false,
      region: userRecord?.region || defaultRegion,
      country: userRecord?.country,
      avatarFramerUrl: userRecord?.avatarFramerUrl,
      titleId: userRecord?.titleId,
      titleIdList: userRecord?.titleIdList,
    };
  };

  // 创建消息对象的工具函数（从后端记录）
  const createMessageFromRecord = (record: any): Message | null => {
    const messageId = String(record.messageWrapper?.message?.id);

    // 如果消息ID为空，返回null
    if (!messageId) return null;

    const senderRecord = record.messageWrapper?.message?.sender;
    const quotedMessageRecord = record.messageWrapper?.message?.quotedMessage;

    // 创建引用消息（如果存在）
    const quotedMessage = quotedMessageRecord ? {
      id: String(quotedMessageRecord.id),
      content: quotedMessageRecord.content || '',
      sender: createUserFromRecord(quotedMessageRecord.sender),
      timestamp: new Date(quotedMessageRecord.timestamp || Date.now()),
    } : undefined;

    // 创建并返回消息对象
    return {
      id: messageId,
      content: record.messageWrapper?.message?.content || '',
      sender: createUserFromRecord(senderRecord, '未知地区'),
      timestamp: new Date(record.messageWrapper?.message?.timestamp || Date.now()),
      quotedMessage,
      region: userIpInfo?.region || '未知地区',
      country: userIpInfo?.country,
      workdayType,
      currentWeekType,
    };
  };

  const loadHistoryMessages = async (page: number, isFirstLoad = false) => {
    if (!hasMore || loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);

      // 记录当前滚动高度
      const container = messageContainerRef.current;
      const oldScrollHeight = container?.scrollHeight || 0;

      const response = await listMessageVoByPageUsingPost({
        current: page,
        pageSize,
        roomId: -1,
        sortField: 'createTime',
        sortOrder: 'desc',
      });

      if (response.data?.records) {
        // 创建一个临时集合来跟踪当前请求中的消息ID
        const currentRequestMessageIds = new Set();

        const historyMessages = response.data.records
          .map((record) => {
            const messageId = String(record.messageWrapper?.message?.id);

            // 如果这条消息已经在当前请求中出现过，或者已经在loadedMessageIds中，则跳过
            if (currentRequestMessageIds.has(messageId) || loadedMessageIds.has(messageId)) {
              return null;
            }

            // 将消息ID添加到当前请求的集合中
            currentRequestMessageIds.add(messageId);

            // 使用工具函数创建消息对象
            return createMessageFromRecord(record);
          })
          .filter(Boolean) as Message[]; // 使用类型断言

        // 将新消息的ID添加到已加载集合中
        historyMessages.forEach((msg) => loadedMessageIds.add(msg.id));

        // 更新最新消息的时间戳（如果是首次加载）
        if (isFirstLoad && historyMessages.length > 0) {
          const latestMessage = historyMessages[historyMessages.length - 1];
          setLastMessageTimestamp(new Date(latestMessage.timestamp).getTime());
        }

        // 处理历史消息，确保正确的时间顺序（旧消息在上，新消息在下）
        if (isFirstLoad) {
          // 首次加载时，反转消息顺序，使最旧的消息在上面
          setMessages(historyMessages.reverse() as Message[]);
        } else {
          // 加载更多历史消息时，新的历史消息应该在当前消息的上面
          // 只有在有新消息时才更新状态
          if (historyMessages.length > 0) {
            setMessages((prev) => [...(historyMessages.reverse() as Message[]), ...prev]);
          }
        }

        setTotal(response.data.total || 0);

        // 更新是否还有更多消息
        const currentTotal = loadedMessageIds.size;
        setHasMore(currentTotal < (response.data.total || 0));

        // 重要修改：无论是否有新消息，都更新页码
        // 这样可以避免一直请求同一页
        setCurrent(page);

        // 如果没有新消息但服务器返回的总数大于已加载的消息数，
        // 可能是由于重复消息导致的，尝试请求下一页
        if (historyMessages.length === 0 && currentTotal < (response.data.total || 0)) {
          console.log('未获取到新消息，尝试请求下一页', page + 1);
          // 等待当前请求完成后再尝试下一页
          setTimeout(() => {
            loadHistoryMessages(page + 1);
          }, 300);
        }

        // 如果是首次加载，将滚动条设置到底部
        if (isFirstLoad) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        } else {
          // 保持滚动位置
          requestAnimationFrame(() => {
            if (container) {
              // 防止自动滚动检测干扰
              isAutoScrollingRef.current = true;
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - oldScrollHeight;

              // 重置标记
              setTimeout(() => {
                isAutoScrollingRef.current = false;
              }, 100);
            }
          });
        }
      }
    } catch (error) {
      messageApi.error('加载历史消息失败');
      console.error('加载历史消息失败:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // 检查是否在底部
  const checkIfNearBottom = () => {
    // 如果正在自动滚动，不更新状态
    if (isAutoScrollingRef.current) return;

    const container = messageContainerRef.current;
    if (!container) return;

    const threshold = 100; // 距离底部100px以内都认为是在底部
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    setIsNearBottom(distanceFromBottom <= threshold);
  };

  // 修改滚动处理函数
  const handleScroll = () => {
    // 如果是自动滚动触发的，不执行其他逻辑
    if (isAutoScrollingRef.current) return;

    const container = messageContainerRef.current;
    if (!container || loadingRef.current || !hasMore) return;

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
  }, [loadingRef.current, hasMore, current]);

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

      // const res = await uploadTo111666UsingPost(
      //   {},  // body 参数
      //   file,  // 文件参数
      //   {  // 其他选项
      //     headers: {
      //       'Content-Type': 'multipart/form-data',
      //     },
      //   }
      // );

      // if (!res.data || res.data === 'https://i.111666.bestnull') {
      // 如果上传失败或返回的是兜底URL，使用备用上传逻辑
      const fallbackRes = await uploadFileByMinioUsingPost(
        { biz: 'user_file' }, // 业务标识参数
        {}, // body 参数
        file, // 文件参数
        {
          // 其他选项
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      if (!fallbackRes.data) {
        throw new Error('图片上传失败');
      }

      // 设置预览图片
      setPendingImageUrl(fallbackRes.data);
      // 上传图片后更新发送按钮状态
      setShouldShowSendButton(true);
      // } else {
      //   // 设置预览图片
      //   setPendingImageUrl(res.data);
      // }
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
        { biz: 'user_file' }, // 业务标识参数
        {}, // body 参数
        file, // 文件参数
        {
          // 其他选项
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      if (!res.data) {
        throw new Error('文件上传失败');
      }

      // 获取文件的访问URL
      const fileUrl = res.data;
      console.log('文件上传地址：', fileUrl);
      setPendingFileUrl(fileUrl);
      // 更新发送按钮状态
      setShouldShowSendButton(true);

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
    // 更新发送按钮状态
    setShouldShowSendButton(shouldShowSendButtonCheck());
  };

  // 添加滚动到指定消息的函数
  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 添加高亮效果
      messageElement.classList.add(styles.highlighted);
      setTimeout(() => {
        messageElement.classList.remove(styles.highlighted);
      }, 2000);
    }
  };

  // 添加处理@消息的函数
  const handleMentionNotification = (message: Message) => {
    if (message.mentionedUsers?.some((user) => user.id === String(currentUser?.id))) {
      messageApi.info({
        content: (
          <div onClick={() => scrollToMessage(message.id)}>
            {message.sender.name} 在消息中提到了你
          </div>
        ),
        duration: 5,
        key: message.id,
      });
      setNotifications((prev) => [...prev, message]);
    }
  };

  // 修改 handleChatMessage 函数
  const handleChatMessage = (data: any) => {
    const otherUserMessage = data.data.message;
    const messageTimestamp = new Date(otherUserMessage.timestamp).getTime();

    // 只处理其他用户的消息
    if (otherUserMessage.sender.id !== String(currentUser?.id)) {
      // 判断是否是真正的新消息（时间戳大于当前最新消息的时间戳）
      const isNewMessage = messageTimestamp > lastMessageTimestamp;

      setMessages((prev) => {
        // 添加新消息，确保 vip 和 isVip 字段都存在
        const processedMessage = {
          ...otherUserMessage,
          sender: {
            ...otherUserMessage.sender,
            vip: otherUserMessage.sender.vip || otherUserMessage.sender.isVip || false,
            isVip: otherUserMessage.sender.isVip || otherUserMessage.sender.vip || false
          }
        };
        const newMessages = [...prev, processedMessage];

        // 检查是否在底部
        const container = messageContainerRef.current;
        if (container) {
          const threshold = 30; // 30px的阈值
          const distanceFromBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight;
          const isNearBottom = distanceFromBottom <= threshold;

          // 只有在不在底部且是真正的新消息时，才累计新消息数量
          if (!isNearBottom && isNewMessage) {
            setNewMessageCount((prev) => prev + 1);

            // 清除之前的定时器
            if (newMessageTimerRef.current) {
              clearTimeout(newMessageTimerRef.current);
            }

            // 设置新的定时器，1秒后显示合并的提示
            newMessageTimerRef.current = setTimeout(() => {
              showNewMessageNotification(newMessageCount + 1);
              setNewMessageCount(0);
            }, 1000);
          }

          // 只有在底部时才限制消息数量
          if (isNearBottom && newMessages.length > 25) {
            return newMessages.slice(-25);
          }
        }
        return newMessages;
      });

      // 如果是新消息，更新最新消息时间戳
      if (isNewMessage) {
        setLastMessageTimestamp(messageTimestamp);
        handleMentionNotification(otherUserMessage);
      }

      // 实时检查是否在底部
      const container = messageContainerRef.current;
      if (container) {
        const threshold = 30;
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom <= threshold && !isAutoScrollingRef.current) {
          // 避免重复滚动，添加防抖
          setTimeout(scrollToBottom, 100);
          // 如果滚动到底部，清除新消息计数和定时器
          setNewMessageCount(0);
          if (newMessageTimerRef.current) {
            clearTimeout(newMessageTimerRef.current);
            newMessageTimerRef.current = null;
          }
        }
      }
    }
  };

  const handleUserMessageRevoke = (data: any) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== data.data));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  const handleUserOnline = (data: any) => {
    setOnlineUsers((prev) => [
      ...prev,
      ...data.data.filter(
        (newUser: { id: string }) => !prev.some((user) => user.id === newUser.id),
      ),
    ]);
  };

  const handleUserOffline = (data: any) => {
    setOnlineUsers((prev) => prev.filter((user) => user.id !== data.data));
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

  // 创建新消息对象的工具函数
  const createNewMessage = (content: string, mentionedUsers: User[] = [], quotedMsg: Message | null = null): Message => {
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    return {
      id: `${Date.now()}`,
      content,
      sender: {
        id: String(currentUser.id),
        name: currentUser.userName || '游客',
        avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
        level: currentUser.level || 1,
        points: currentUser.points || 0,
        isAdmin: currentUser.userRole === 'admin',
        isVip: currentUser.vip,
        region: userIpInfo?.region || '未知地区',
        country: userIpInfo?.country || '未知国家',
        avatarFramerUrl: currentUser.avatarFramerUrl,
        titleId: currentUser.titleId,
        titleIdList: currentUser.titleIdList,
      },
      timestamp: new Date(),
      quotedMessage: quotedMsg || undefined,
      mentionedUsers: mentionedUsers.length > 0 ? mentionedUsers : undefined,
      region: userIpInfo?.region || '未知地区',
      country: userIpInfo?.country || '未知国家',
      workdayType,
      currentWeekType,
    };
  };

  // 修改 handleSend 函数
  const handleSend = (customContent?: string) => {
    // Check if the message is a workday type command
    if (customContent?.startsWith('/workday ')) {
      const type = customContent.split(' ')[1];
      if (['single', 'double', 'mixed'].includes(type)) {
        setWorkdayType(type as 'single' | 'double' | 'mixed');
        messageApi.success(
          `工作制已设置为${type === 'single' ? '单休' : type === 'double' ? '双休' : '大小周'}`,
        );
        return;
      }
    }

    // Check if the message is a week type command
    if (customContent?.startsWith('/week ')) {
      const type = customContent.split(' ')[1];
      if (['big', 'small'].includes(type)) {
        setCurrentWeekType(type as 'big' | 'small');
        messageApi.success(`当前周类型已设置为${type === 'big' ? '大周' : '小周'}`);
        return;
      }
    }
    // 检查发送冷却时间
    const now = Date.now();
    if (now - lastSendTime < 1000) {
      // 限制每秒最多发送一条消息
      messageApi.warning('发送太快了，请稍后再试');
      return;
    }

    let content = customContent || inputValue;

    // 检查是否包含 iframe 标签
    const iframeRegex = /\<iframe.*?\>.*?\<\/iframe\>/gi;
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
      // 使用一个唯一的key来确保消息只显示一次
      messageApi.warning({
        content: '请输入消息内容',
        key: 'emptyMessage',
      });
      return;
    }

    // 检查是否重复发送相同内容
    if (content === lastSendContent && now - lastSendContentTime < 10000) {
      // 10秒内不能发送相同内容
      messageApi.warning('请勿重复发送相同内容，请稍后再试');
      return;
    }

    if (!currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    // 解析@用户
    const mentionedUsers: User[] = [];
    const mentionRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1];
      const mentionedUser = onlineUsers.find((user) => user.name === mentionedName);
      if (mentionedUser) {
        mentionedUsers.push(mentionedUser);
      }
    }

    // 使用工具函数创建消息对象
    const newMessage = createNewMessage(content, mentionedUsers, quotedMessage);

    // 使用全局 WebSocket 服务发送消息
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: {
          message: newMessage,
        },
      },
    });

    // 更新消息列表
    setMessages((prev) => [...prev, newMessage]);
    setTotal((prev) => prev + 1);
    setHasMore(true);

    // 清空输入框、预览图片、文件和引用消息
    setInputValue('');
    setPendingImageUrl(null);
    setPendingFileUrl(null);
    setQuotedMessage(null);

    // 重置发送按钮状态为加号按钮
    setShouldShowSendButton(false);

    // 更新最后发送时间和内容
    setLastSendTime(now);
    setLastSendContent(content);
    setLastSendContentTime(now);

    // 滚动到底部
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    // 如果功能菜单是打开的，则关闭
    closeMobileToolbar();
  };

  // 移除待发送的图片
  const handleRemoveImage = () => {
    setPendingImageUrl(null);
    // 更新发送按钮状态
    setShouldShowSendButton(shouldShowSendButtonCheck());
  };

  // 添加撤回消息的处理函数
  const handleRevokeMessage = (messageId: string) => {
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'userMessageRevoke',
        content: messageId,
      },
    });

    messageApi.info('消息已撤回');
  };

  // 处理@输入
  const handleMentionInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value;

    // 过滤掉 ``` 字符
    value = value.replace(/```/g, '');

    // 更新输入值 - 这个操作必须立即执行，确保用户输入的即时反馈
    setInputValue(value);

    // 如果输入框有内容并且功能面板显示中，则关闭功能面板
    if (value.trim().length > 0 && isMobileToolbarVisible) {
      closeMobileToolbar();
    }

    // 检查是否输入了#摸鱼日历 - 这个功能必须立即响应
    if (value === '#摸鱼日历') {
      fetchMoyuCalendar();
      setInputValue(''); // 清空输入框，因为这是触发词
      setShouldShowSendButton(false); // 重置发送按钮状态
      return;
    }

    // 使用防抖处理@功能，减少频繁计算
    if (mentionDebounceRef.current) {
      clearTimeout(mentionDebounceRef.current);
    }

    mentionDebounceRef.current = setTimeout(() => {
      // @功能处理逻辑
      const lastAtPos = value.lastIndexOf('@');
      if (lastAtPos !== -1) {
        const searchText = value.slice(lastAtPos + 1);
        setMentionSearchText(searchText);

        // 如果搜索文本为空，显示所有在线用户（限制数量）
        if (!searchText.trim()) {
          setFilteredUsers(onlineUsers.slice(0, 10)); // 限制显示数量
        } else {
          // 优化过滤逻辑，使用缓存的小写名称进行比较
          const searchTextLower = searchText.toLowerCase();
          const filtered = onlineUsers.filter((user) => {
            if (!user || !user.name) return false;
            return user.name.toLowerCase().includes(searchTextLower);
          }).slice(0, 10); // 限制结果数量
          setFilteredUsers(filtered);
        }

        // 只有当有过滤结果时才计算位置
        if (onlineUsers.length > 0) {
          // 获取输入框位置
          const textarea = e.target;
          const rect = textarea.getBoundingClientRect();

          // 简化位置计算逻辑
          const itemHeight = 40; // 每个选项的高度
          const maxItems = 3; // 最多显示3条数据时紧贴显示
          const listHeight = Math.min(onlineUsers.length, maxItems) * itemHeight;
          const topOffset = -listHeight - 10; // 固定在输入框上方，加一点间距

          setMentionListPosition({
            top: rect.top + topOffset,
            left: rect.left + 10, // 固定在左侧，稍微缩进
          });

          setIsMentionListVisible(true);
        } else {
          setIsMentionListVisible(false);
        }
      } else {
        setIsMentionListVisible(false);
      }
    }, 150); // 150ms的防抖延迟，平衡响应速度和性能
  };

  // 点击空白处隐藏成员列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionListRef.current && !mentionListRef.current.contains(event.target as Node)) {
        setIsMentionListVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 选择@成员
  const handleSelectMention = (user: User) => {
    // 清理防抖计时器
    if (mentionDebounceRef.current) {
      clearTimeout(mentionDebounceRef.current);
      mentionDebounceRef.current = null;
    }

    // 使用函数式更新确保使用最新的inputValue
    setInputValue(currentValue => {
      const lastAtPos = currentValue.lastIndexOf('@');
      if (lastAtPos !== -1) {
        // 如果已经输入了@，则替换当前@后面的内容
        return currentValue.slice(0, lastAtPos) +
          `@${user.name} ` +
          currentValue.slice(lastAtPos + mentionSearchText.length + 1);
      } else {
        // 如果没有输入@，则在当前光标位置插入@用户名
        const cursorPos = inputRef.current?.selectionStart || 0;
        return currentValue.slice(0, cursorPos) + `@${user.name} ` + currentValue.slice(cursorPos);
      }
    });

    // 立即隐藏列表，提高响应速度
    setIsMentionListVisible(false);
    setMentionSearchText('');

    // 使用 requestAnimationFrame 延迟聚焦，提高渲染性能
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  // Using utility function from titleUtils

  const UserInfoCard: React.FC<{ user: User }> = ({ user }) => {
    // 从 titleIdList 字符串解析称号 ID 数组
    const userTitleIds: number[] = user.titleIdList ? JSON.parse(user.titleIdList) : [];
    const [isTitlesExpanded, setIsTitlesExpanded] = useState(false);

    // 生成用户唯一标识符
    const userShortId = generateUniqueShortId(user.id);

    // 获取所有称号
    const allTitles = [
      getAdminTag(user.isAdmin, user.level, 0),
      ...userTitleIds.map((titleId) => getAdminTag(user.isAdmin, user.level, titleId)),
    ];

    // 优先显示用户选中的称号
    const defaultTitle = user.titleId
      ? allTitles.find((titleElement, index) => {
          // 如果是等级称号(index=0)且titleId=0，则匹配
          if (user.titleId === 0 && index === 0) {
            return true;
          }

          // 对于其他称号，通过titleId直接匹配
          if (index > 0 && userTitleIds[index - 1] === user.titleId) {
            return true;
          }

          return false;
        }) || allTitles[0]
      : allTitles[0];
    // 其他称号
    const otherTitles = allTitles.filter((title) => title !== defaultTitle);

    return (
      <div className={styles.userInfoCard} onMouseLeave={() => setIsTitlesExpanded(false)}>
        <div className={styles.userInfoCardHeader}>
          <div
            className={styles.avatarWrapper}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleSelectMention(user);
            }}
          >
            <Popover
              content={<div className={styles.userShortId}>{userShortId}</div>}
              trigger="hover"
              placement="bottom"
            >
              <div className={styles.avatarWithFrame}>
                <Avatar src={user.avatar} size={48} />
                {user.avatarFramerUrl && (
                  <img
                    src={user.avatarFramerUrl}
                    className={styles.avatarFrame}
                    alt="avatar-frame"
                  />
                )}
              </div>
            </Popover>
            <div className={styles.floatingFish}>🐟</div>
          </div>
          <div className={styles.userInfoCardTitle}>
            <div className={styles.userInfoCardNameRow}>
              <span className={styles.userInfoCardName}>
                {userRemarks[user.id] || user.name}
                {userRemarks[user.id] && (
                  <span className={styles.originalName}>({user.name})</span>
                )}
              </span>
              <span className={styles.userInfoCardLevel}>
                <span className={styles.levelEmoji}>{getLevelEmoji(user.level)}</span>
                <span className={styles.levelText}>{user.level}</span>
              </span>
            </div>
            <div className={styles.titlesContainer}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0px' }}>
                {defaultTitle}
                {(user.vip || user.isVip) && <span className={styles.vipBadge}>V</span>}
              </span>
              {otherTitles.length > 0 && (
                <Popover
                  content={
                    <div className={styles.expandedTitles}>
                      {otherTitles.map((title, index) => (
                        <div key={index} className={styles.expandedTitle}>
                          {title}
                        </div>
                      ))}
                    </div>
                  }
                  trigger="click"
                  placement="right"
                  overlayClassName={styles.titlesPopover}
                  open={isTitlesExpanded}
                  onOpenChange={setIsTitlesExpanded}
                >
                  <Button
                    type="text"
                    size="small"
                    className={styles.expandButton}
                    icon={<RightOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTitlesExpanded(!isTitlesExpanded);
                    }}
                  />
                </Popover>
              )}
            </div>
            <div className={styles.userInfoCardPoints}>
              <span className={styles.pointsEmoji}>✨</span>
              <span className={styles.pointsText}>积分: {user.points || 0}</span>
            </div>
            {user.id === String(currentUser?.id)
              ? userIpInfo && (
                  <div className={styles.userInfoCardLocation}>
                    <span className={styles.locationEmoji}>📍</span>
                    <span className={styles.locationText}>
                      {userIpInfo.country} · {userIpInfo.region}
                    </span>
                  </div>
                )
              : user.region && (
                  <div className={styles.userInfoCardLocation}>
                    <span className={styles.locationEmoji}>📍</span>
                    <span className={styles.locationText}>
                      {user.country ? `${user.country} · ${user.region}` : user.region}
                    </span>
                  </div>
                )}
          </div>
        </div>
      </div>
    );
  };

  // 在 return 语句之前添加引用消息的处理函数
  const handleQuoteMessage = (message: Message) => {
    setQuotedMessage(message);
    // 让输入框获得焦点
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Using utility function from titleUtils

    // Using utility function from titleUtils
  const getAdminTag = (isAdmin: boolean, level: number, titleId?: number) => {
    const { tagText, tagEmoji, tagClass: baseTagClass, titleImg } = getTitleTagProperties(isAdmin, level, titleId);
    const tagClass = styles[baseTagClass]; // Convert string class name to styles reference

    // 如果有特定的称号ID且不是0（0表示使用等级称号）
    if (titleId !== undefined && titleId != 0) {
      // 从 titles.json 中获取对应的称号
      const titles: Title[] = require('@/config/titles.json').titles;
      const title = titles.find((t: Title) => String(t.id) === String(titleId));

      if (title) {
        // 如果有titleImg，则只使用图片渲染称号
                  if (titleImg) {
            return (
              <span className={styles.titleImageContainer}>
                <img
                  src={titleImg}
                  alt={title.name}
                  className={styles.titleImage}
                />
                <span className={styles.titleSweepLight}></span>
                <span className={styles.titleStar1}>✨</span>
                <span className={styles.titleStar2}>✨</span>
              </span>
            );
          }
        // 否则使用emoji渲染
        return (
          <span className={`${styles.adminTag} ${tagClass}`}>
            {tagEmoji}
            <span className={styles.adminText}>{title.name}</span>
          </span>
        );
      }
    }

    // 如果没有特定称号或称号ID为0，则使用原有的等级称号逻辑
    return (
      <span className={`${styles.adminTag} ${tagClass}`}>
        {tagEmoji}
        <span className={styles.adminText}>{tagText}</span>
      </span>
    );
  };

  const handleEmojiClick = (emoji: any) => {
    setInputValue((prev) => prev + emoji.native);
    setIsEmojiPickerVisible(false);
    // 使用 requestAnimationFrame 延迟聚焦，提高渲染性能
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const emojiPickerContent = (
    <div className={styles.emojiPicker}>
      <Picker
        data={data}
        i18n={zhData}
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

    // 直接使用新的消息内容发送，而不是依赖 inputValue 的状态更新
    if (!wsService.isConnected()) {
      return;
    }

    if (!currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    // 使用工具函数创建消息对象
    const newMessage = createNewMessage(imageMessage);

    // 批量更新状态，减少重渲染次数
    setMessages((prev) => [...prev, newMessage]);
    // 更新总消息数和分页状态
    setTotal((prev) => prev + 1);
    setHasMore(true);
    setInputValue('');
    setIsEmoticonPickerVisible(false);

    // 发送消息到服务器
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: {
          message: newMessage,
        },
      },
    });

    // 使用 requestAnimationFrame 优化滚动性能
    requestAnimationFrame(scrollToBottom);
  };

  // 修改 handleInviteClick 函数
  const handleInviteClick = async (roomId: string, gameType: string) => {
    switch (gameType) {
      case 'chess':
        localStorage.setItem('piece_join_status', 'new');
        history.push(`/game/piece?roomId=${roomId}&mode=online`);
        break;
      case 'chineseChess':
        history.push(`/game/chineseChess?roomId=${roomId}&mode=online`);
        break;
      case 'draw':
        try {
          const res = await joinRoomUsingPost({ roomId: roomId });
          if (res.data && res.code === 0) {
          message.success('加入房间成功');
          history.push(`/draw/${roomId}`);
          } else {
            message.error(res.message || '加入房间失败');
          }
        } catch (error) {
          console.error('加入房间出错:', error);
          message.error('加入房间失败，请稍后再试');
        }
        break;
      default:
        break;
    }
  };

  // 添加发送红包的处理函数
  const handleSendRedPacket = async () => {
    // 如果正在发送中，直接返回
    if (isRedPacketSending) {
      messageApi.warning('正在处理红包发送，请稍候...');
      return;
    }

    if (!currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    if (redPacketAmount <= 0 || redPacketCount <= 0) {
      messageApi.error('请输入有效的红包金额和数量！');
      return;
    }

    // 清除之前的防抖计时器
    if (redPacketDebounceRef.current) {
      clearTimeout(redPacketDebounceRef.current);
    }

    try {
      // 设置发送状态为true
      setIsRedPacketSending(true);

      // 使用防抖技术，延迟执行实际的红包发送
      redPacketDebounceRef.current = setTimeout(async () => {
        try {
          const response = await createRedPacketUsingPost({
            totalAmount: redPacketAmount,
            count: redPacketCount,
            type: redPacketType, // 使用选择的红包类型
            name: redPacketMessage,
          });

          if (response.data) {
            // 发送红包消息
            const redPacketContent = `[redpacket]${response.data}[/redpacket]`;
            const newMessage = createNewMessage(redPacketContent);

            wsService.send({
              type: 2,
              userId: -1,
              data: {
                type: 'chat',
                content: {
                  message: newMessage,
                },
              },
            });

            setMessages((prev) => [...prev, newMessage]);
            setTotal((prev) => prev + 1);
            setHasMore(true);

            messageApi.success('红包发送成功！');
            setIsRedPacketModalVisible(false);
            setRedPacketAmount(0);
            setRedPacketCount(1);
            setRedPacketMessage('恭喜发财，大吉大利！');
          }
        } catch (error) {
          messageApi.error('红包发送失败！');
        } finally {
          // 重置发送状态
          setIsRedPacketSending(false);
        }
      }, 500); // 500毫秒防抖延迟
    } catch (error) {
      setIsRedPacketSending(false);
      messageApi.error('红包发送失败！');
    }
  };

  // 修改获取红包详情的函数
  const fetchRedPacketDetail = async (redPacketId: string) => {
    // 如果已经有缓存，直接返回
    const cachedDetail = redPacketDetailsMap.get(redPacketId);
    if (cachedDetail !== undefined) {
      return cachedDetail;
    }

    try {
      const response = await getRedPacketDetailUsingGet({ redPacketId });
      if (response.data) {
        // 更新缓存
        const detail = response.data as API.RedPacket;
        setRedPacketDetailsMap((prev) => new Map(prev).set(redPacketId, detail));
        return detail;
      }
    } catch (error) {
      console.error('获取红包详情失败:', error);
    }
    return null;
  };
  // 添加查看红包记录的处理函数
  const handleViewRedPacketRecords = async (redPacketId: string) => {
    setCurrentRedPacketId(redPacketId);
    setIsRedPacketRecordsVisible(true);
    await fetchRedPacketRecords(redPacketId);
  };
  // 修改 renderMessageContent 函数，添加红包消息的渲染

  // 添加一个全局音频引用
  const [currentMusic, setCurrentMusic] = useState<{
    name: string;
    artists: string;
    url: string;
    cover: string;
    progress: number;
    duration: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 添加播放控制函数
  const togglePlay = () => {
    if (!audioRef.current || !currentMusic) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 关闭音乐播放
  const closeMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentMusic(null);
    setIsPlaying(false);
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessageContent = (content: string) => {
    const musicMatch = /\[music\]([^\[\]]*)\[\/music\]/i.exec(content);
    const coverMatch = /\[cover\]([^\[\]]*)\[\/cover\]/i.exec(content);
    if (musicMatch) {
      const musicUrl = musicMatch[1];
      const coverUrl = coverMatch ? coverMatch[1] : '';
      const musicInfo = content.split('[music]')[0];
      return (
        <div className={styles.musicMessage}>
          <div className={styles.musicWrapper}>
            {coverUrl && <img src={coverUrl} alt="album cover" className={styles.musicCover} />}
            <div className={styles.musicContent}>
              <div className={styles.musicInfo}>{musicInfo}</div>
              <audio
                controls
                src={musicUrl}
                style={{ width: '100%', minWidth: '300px' }}
                onPlay={(e) => {
                  // 停止当前正在播放的音频
                  if (audioRef.current && audioRef.current !== e.currentTarget) {
                    audioRef.current.pause();
                  }
                  const audio = e.currentTarget;
                  audioRef.current = audio;
                  setCurrentMusic({
                    name: musicInfo.split(' - ')[0].replace('🎵 ', ''),
                    artists: musicInfo.split(' - ')[1],
                    url: musicUrl,
                    cover: coverUrl,
                    progress: 0,
                    duration: audio.duration,
                  });
                  setIsPlaying(true);
                }}
                onEnded={() => {
                  setIsPlaying(false);
                }}
              />
            </div>
          </div>
        </div>
      );
    }
    // 检查是否是红包消息
    // const redPacketMatch = content.match(/\[redpacket\](.*?)\[\/redpacket\]/);
    const redPacketMatch = /\[redpacket\]([^\[\]]*)\[\/redpacket\]/i.exec(content);
    if (redPacketMatch) {
      const redPacketId = redPacketMatch[1];
      const detail = redPacketDetailsMap.get(redPacketId);

      // 如果没有缓存，则获取详情
      if (!detail) {
        fetchRedPacketDetail(redPacketId);
      }

      return (
        <div className={styles.redPacketMessage}>
          <div className={styles.redPacketContent}>
            <GiftOutlined className={styles.redPacketIcon} />
            <div className={styles.redPacketInfo}>
              <div className={styles.redPacketTitle}>
                <span className={styles.redPacketText}>{detail?.name || '红包'}</span>
                <span className={styles.redPacketStatus}>
                  {detail?.remainingCount === 0
                    ? '（已抢完）'
                    : detail?.status === 2
                    ? '（已过期）'
                    : `（剩余${detail?.remainingCount || 0}个）`}
                </span>
              </div>
              <div className={styles.redPacketActions}>
                <Button
                  type="primary"
                  size="small"
                  onClick={async () => {
                    try {
                      const response = await grabRedPacketUsingPost({
                        redPacketId: redPacketId,
                      });
                      if (response.data) {
                        messageApi.success(`恭喜你抢到 ${response.data} 积分！`);
                        // 刷新红包记录和详情
                        await Promise.all([
                          fetchRedPacketRecords(redPacketId),
                          fetchRedPacketDetail(redPacketId),
                        ]);
                      }
                    } catch (error) {
                      messageApi.error('红包已被抢完或已过期！');
                    }
                  }}
                  className={styles.grabRedPacketButton}
                  disabled={detail?.remainingCount === 0 || detail?.status === 2}
                >
                  抢红包
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleViewRedPacketRecords(redPacketId)}
                  className={styles.viewRecordsButton}
                >
                  查看记录
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 检查是否是邀请消息
    // const inviteMatch = content.match(/\[invite\/(\w+)\](\d+)\[\/invite\]/);
    const inviteMatch = /\[invite\/([a-zA-Z0-9_]+)\]([a-zA-Z0-9_]+)\[\/invite\]/i.exec(content);
    if (inviteMatch) {
      const roomId = inviteMatch[2];
      const gameType = inviteMatch[1];
      let game = '';
      switch (gameType) {
        case 'chess':
          game = '五子棋';
          break;
        case 'chineseChess':
          game = '中国象棋';
          break;
        case 'draw':
          game = '你画我猜';
          break;
      }
      return (
        <div className={styles.inviteMessage}>
          <div className={styles.inviteContent}>
            <span className={styles.inviteText}>🎮 {game}游戏邀请</span>
            <Button
              type="primary"
              size="small"
              onClick={() => handleInviteClick(roomId, gameType)}
              className={styles.inviteButton}
            >
              加入房间
            </Button>
          </div>
        </div>
      );
    }
    // const imgMatch = content.match(/\[img\](.*?)\[\/img\]/);
    const imgMatch = /\[img\]([^\[\]]*)\[\/img\]/i.exec(content);
    if (imgMatch) {
      // 处理图片，根据极速模式决定是否默认渲染
      const [_, imageUrl] = imgMatch;

      const handleImageClick = () => {
        setExpandedImages(prev => {
          const newSet = new Set(prev);
          newSet.add(imageUrl);
          return newSet;
        });
      };

      // 如果不是极速模式，或者图片已经被展开，则渲染图片
      if (!isSpeedMode || expandedImages.has(imageUrl)) {
        return (
          <MessageContent
            content={content}
            onImageLoad={() => {
              // 图片加载完成后,如果是最新消息则滚动到底部
              const lastMessage = messages[messages.length - 1];
              const isLatestMessage = lastMessage?.content === content;
              if (
                isLatestMessage &&
                (isNearBottom || lastMessage?.sender.id === String(currentUser?.id)) &&
                !isAutoScrollingRef.current // 避免重复滚动
              ) {
                // 添加短暂延迟，确保图片已完全渲染
                setTimeout(scrollToBottom, 200);
              }
            }}
          />
        );
      } else {
        // 极速模式下且图片未展开，显示按钮
        return (
          <div className={styles.imageButton} onClick={handleImageClick}>
            <FileImageOutlined className={styles.imageIcon} />
            <span>点击展开图片</span>
          </div>
        );
      }
    }
    return <MessageContent content={content} />;
  };

  // 修改获取红包记录的函数
  const fetchRedPacketRecords = async (redPacketId: string) => {
    try {
      const response = await getRedPacketRecordsUsingGet({ redPacketId });
      if (response.data) {
        // 按金额降序排序
        const sortedRecords = [...response.data].sort((a, b) => (b.amount || 0) - (a.amount || 0));
        setRedPacketRecords(sortedRecords);
      }
    } catch (error) {
      messageApi.error('获取红包记录失败！');
    }
  };

  // 在组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (newMessageTimerRef.current) {
        clearTimeout(newMessageTimerRef.current);
      }
      // 清理红包防抖定时器
      if (redPacketDebounceRef.current) {
        clearTimeout(redPacketDebounceRef.current);
      }
    };
  }, []);

  // 修改获取摸鱼日历的函数
  const fetchMoyuCalendar = async () => {
    try {
      setIsLoadingMoyu(true);
      const response = await fetch('https://api.vvhan.com/api/moyu?type=json');
      const data = await response.json();
      if (data.success) {
        setPendingImageUrl(data.url);
        // 更新发送按钮状态
        setShouldShowSendButton(true);
      } else {
        messageApi.error('获取摸鱼日历失败');
      }
    } catch (error) {
      messageApi.error('获取摸鱼日历失败');
    } finally {
      setIsLoadingMoyu(false);
    }
  };

  // 添加歌单相关状态
  const [activeTab, setActiveTab] = useState('search');
  const [playlist, setPlaylist] = useState<Song[]>([]);
  // 移除未使用的状态
  const aPlayerContainerRef = useRef<HTMLDivElement>(null);
  const aPlayerInstanceRef = useRef<any>(null);

  // 添加歌单功能相关的副作用
  useEffect(() => {
    // 从localStorage加载歌单
    const savedPlaylist = localStorage.getItem('music_playlist');
    if (savedPlaylist) {
      try {
        setPlaylist(JSON.parse(savedPlaylist));
      } catch (error) {
        console.error('加载歌单失败:', error);
      }
    }

    // 加载APlayer依赖
    const loadAPlayerDependencies = () => {
      // 检查是否已加载
      if (document.getElementById('aplayer-css') || document.getElementById('aplayer-js')) {
        return;
      }

      // 加载APlayer CSS
      const link = document.createElement('link');
      link.id = 'aplayer-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css';
      document.head.appendChild(link);

      // 加载APlayer JS
      const script = document.createElement('script');
      script.id = 'aplayer-js';
      script.src = 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js';
      script.async = true;
      document.body.appendChild(script);
    };

    loadAPlayerDependencies();

    return () => {
      // 清理APlayer实例
      if (aPlayerInstanceRef.current) {
        aPlayerInstanceRef.current.destroy();
        aPlayerInstanceRef.current = null;
      }
    };
  }, []);

  // 添加歌曲到歌单
  const addToPlaylist = async (music: any) => {
    try {
      setAddingToPlaylistId(music.id);
      setMusicApiError(null);

      const response = await fetch('https://api.kxzjoker.cn/api/163_music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams({
          url: music.id,
          level: 'lossless',
          type: 'json',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`获取音乐链接请求失败: ${response.status}`);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('未能获取到音乐链接');
      }

      const newSong: Song = {
        id: music.id,
        name: music.name,
        artist: music.artists.map((a: any) => a.name).join(','),
        url: data.url,
        cover: data.pic,
        album: music.album.name,
      };

      setPlaylist((prev) => {
        // 检查是否已存在
        if (prev.some((song) => song.id === newSong.id)) {
          messageApi.info('歌曲已在歌单中');
          return prev;
        }

        const updatedPlaylist = [...prev, newSong];
        // 保存到localStorage
        localStorage.setItem('music_playlist', JSON.stringify(updatedPlaylist));
        messageApi.success('已添加到歌单');
        return updatedPlaylist;
      });
    } catch (error) {
      console.error('添加歌曲失败:', error);
      setMusicApiError('音乐解析服务暂时不可用，请稍后再试');
      messageApi.error('添加歌曲失败，音乐API可能暂时不可用');
    } finally {
      setAddingToPlaylistId(null);
    }
  };

  // 播放歌单中的歌曲
  const playFromPlaylist = (song: Song) => {
    // 确保APlayer已加载
    if (typeof window.APlayer === 'undefined') {
      messageApi.error('播放器加载中，请稍后再试');
      return;
    }

    // 初始化APlayer（如果还没有实例）
    if (!aPlayerInstanceRef.current && aPlayerContainerRef.current) {
      aPlayerInstanceRef.current = new window.APlayer({
        container: aPlayerContainerRef.current,
        audio: [song],
        autoplay: true,
        theme: '#41b883',
        listFolded: false,
        listMaxHeight: '200px',
      });
    } else if (aPlayerInstanceRef.current) {
      // 如果已有实例，直接添加并播放歌曲
      aPlayerInstanceRef.current.list.add(song);
      // 找到歌曲在列表中的索引
      const index = aPlayerInstanceRef.current.list.audios.findIndex(
        (audio: any) => audio.id === song.id,
      );
      if (index !== -1) {
        aPlayerInstanceRef.current.list.switch(index);
        aPlayerInstanceRef.current.play();
      }
    }
  };

  // 播放整个歌单
  const playEntirePlaylist = () => {
    if (playlist.length === 0) {
      messageApi.info('歌单为空');
      return;
    }

    // 确保APlayer已加载
    if (typeof window.APlayer === 'undefined') {
      messageApi.error('播放器加载中，请稍后再试');
      return;
    }

    // 销毁旧的播放器实例
    if (aPlayerInstanceRef.current) {
      aPlayerInstanceRef.current.destroy();
    }

    // 创建新的播放器实例，包含整个歌单
    if (aPlayerContainerRef.current) {
      aPlayerInstanceRef.current = new window.APlayer({
        container: aPlayerContainerRef.current,
        audio: playlist,
        autoplay: true,
        theme: '#41b883',
        listFolded: false,
        listMaxHeight: '200px',
      });
    }
  };

  // 从歌单中移除歌曲
  const removeFromPlaylist = (songId: string) => {
    setPlaylist((prev) => {
      const updatedPlaylist = prev.filter((song) => song.id !== songId);
      localStorage.setItem('music_playlist', JSON.stringify(updatedPlaylist));
      return updatedPlaylist;
    });

    // 如果当前正在播放的歌曲被移除，需要处理播放器
    if (aPlayerInstanceRef.current) {
      const currentIndex = aPlayerInstanceRef.current.list.index;
      const currentAudio = aPlayerInstanceRef.current.list.audios[currentIndex];

      if (currentAudio && currentAudio.id === songId) {
        // 如果还有下一首歌，切换到下一首，否则停止播放
        if (aPlayerInstanceRef.current.list.audios.length > 1) {
          aPlayerInstanceRef.current.skipForward();
        } else {
          aPlayerInstanceRef.current.pause();
        }
      }

      // 从播放器列表中移除
      const audioIndex = aPlayerInstanceRef.current.list.audios.findIndex(
        (audio: any) => audio.id === songId,
      );
      if (audioIndex !== -1) {
        aPlayerInstanceRef.current.list.remove(audioIndex);
      }
    }
  };

  // 当搜索关键词变化时重置搜索状态
  const handleSearchKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchKey(newValue);
    if (hasSearched && newValue !== searchKey) {
      setHasSearched(false); // 如果关键词变化，重置搜索状态
    }
  };

  // 添加处理查看用户详情的函数
  const handleViewUserDetail = async (user: User) => {
    setSelectedUser(user);
    setIsUserDetailModalVisible(true);

    // 如果是管理员，获取用户禁言状态
    if (currentUser?.userRole === 'admin') {
      try {
        const response = await getUserMuteInfoUsingGet({
          userId: user.id // 直接传递字符串 ID
        } as any); // 使用 as any 临时绕过类型检查

        if (response.code === 0 && response.data) {
          setUserMuteInfo(response.data);
        } else {
          setUserMuteInfo(null);
        }
      } catch (error) {
        console.error('获取用户禁言状态失败:', error);
        setUserMuteInfo(null);
      }
    }
  };

  // 添加禁言用户的函数
  const handleMuteUser = (userId: string) => {
    // 确保当前用户是管理员
    if (!currentUser || currentUser.userRole !== 'admin') {
      return;
    }

    // 显示禁言设置弹窗
    setIsMuteModalVisible(true);
  };

  // 添加解除禁言的函数
  const handleUnmuteUser = async (userId: string) => {
    // 确保当前用户是管理员
    if (!currentUser || currentUser.userRole !== 'admin') {
      return;
    }

    try {
      const response = await unmuteUserUsingPost({
        userId: userId // 直接传递字符串 ID
      } as any); // 使用 as any 临时绕过类型检查

      if (response.code === 0 && response.data) {
        messageApi.success('已解除用户禁言');
        // 更新禁言状态
        setUserMuteInfo(null);
      } else {
        messageApi.error(`解除禁言失败：${response.message}`);
      }
    } catch (error) {
      console.error('解除用户禁言失败:', error);
      messageApi.error('解除禁言操作失败，请稍后再试');
    }
  };

  // 添加封禁账号的函数
  const handleBanUser = (userId: string) => {
    // 确保当前用户是管理员
    if (!currentUser || currentUser.userRole !== 'admin') {
      return;
    }

    messageApi.success(`已封禁用户 ID: ${userId}`);
    setIsUserDetailModalVisible(false);

    // 这里可以添加实际的封禁API调用
    // TODO: 实现实际的封禁功能
  };

  // 添加修改用户积分的状态和函数
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [pointsInputValue, setPointsInputValue] = useState<number>(0);


  // 添加保存积分的函数
  const handleSavePoints = () => {
    if (selectedUser) {
      messageApi.success(`已修改用户 ${selectedUser.name} 的积分为 ${pointsInputValue}`);
      setIsEditingPoints(false);

      // 更新用户对象中的积分（实际应用中应该调用API）
      setSelectedUser({
        ...selectedUser,
        points: pointsInputValue
      });

      // TODO: 实际调用修改积分API
    }
  };

  // 添加禁言相关状态
  const [isMuteModalVisible, setIsMuteModalVisible] = useState(false);
  const [muteDuration, setMuteDuration] = useState<number>(60); // 默认60秒
  const [customMuteDuration, setCustomMuteDuration] = useState<number | undefined>(undefined);
  const [muteLoading, setMuteLoading] = useState(false);
  const [userMuteInfo, setUserMuteInfo] = useState<API.UserMuteVO | null>(null);

  // 执行禁言操作
  const handleConfirmMute = async () => {
    if (!selectedUser) return;

    try {
      setMuteLoading(true);

      // 使用自定义时间或预设时间
      const duration = customMuteDuration !== undefined ? customMuteDuration : muteDuration;

      const response = await muteUserUsingPost({
        userId: selectedUser.id,
        duration: Number(duration), // 转换为数字确保类型正确
      } as any); // 使用 as any 临时绕过类型检查

      if (response.code === 0) {
        messageApi.success(`已禁言用户 ${selectedUser.name}，时长 ${formatMuteDuration(duration)}`);
        setIsMuteModalVisible(false);
        setIsUserDetailModalVisible(false);
      } else {
        messageApi.error(`禁言失败：${response.message}`);
      }
    } catch (error) {
      console.error('禁言用户失败:', error);
      messageApi.error('禁言操作失败，请稍后再试');
    } finally {
      setMuteLoading(false);
      // 重置自定义时间
      setCustomMuteDuration(undefined);
    }
  };

  // 格式化禁言时间显示
  const formatMuteDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}分钟`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}小时`;
    } else {
      return `${Math.floor(seconds / 86400)}天`;
    }
  };

  // 添加移动端功能面板状态
  const [isMobileToolbarVisible, setIsMobileToolbarVisible] = useState<boolean>(false);
  const [shouldShowSendButton, setShouldShowSendButton] = useState<boolean>(false);

  // 添加切换移动端功能面板的函数
  const toggleMobileToolbar = () => {
    setIsMobileToolbarVisible(!isMobileToolbarVisible);
  };

  // 检查是否应该显示发送按钮
  const shouldShowSendButtonCheck = () => {
    return inputValue.trim().length > 0 || pendingImageUrl !== null || pendingFileUrl !== null;
  };

  // 确保在组件状态更新时检查发送按钮状态
  useEffect(() => {
    setShouldShowSendButton(shouldShowSendButtonCheck());
  }, [inputValue, pendingImageUrl, pendingFileUrl]);

  // 处理移动端功能按钮点击
  const handleMobileToolClick = (action: string) => {
    switch (action) {
      case 'emoji':
        setIsEmojiPickerVisible(true);
        break;
      case 'emoticon':
        setIsEmoticonPickerVisible(true);
        break;
      case 'music':
        setIsMusicSearchVisible(true);
        break;
      case 'redPacket':
        setIsRedPacketModalVisible(true);
        break;
      case 'image':
        fileInputRef.current?.click();
        break;
      case 'calendar':
        fetchMoyuCalendar();
        break;
      case 'pet':
        setIsPetModalVisible(true);
        break;
      case 'speedMode':
        toggleSpeedMode(!isSpeedMode);
        break;
      default:
        break;
    }
    // 点击后隐藏功能面板
    setIsMobileToolbarVisible(false);
  };

  // 添加一个统一的关闭功能菜单面板函数
  const closeMobileToolbar = () => {
    if (isMobileToolbarVisible) {
      setIsMobileToolbarVisible(false);
    }
  };

  // 添加摸鱼宠物相关状态
  const [isPetModalVisible, setIsPetModalVisible] = useState<boolean>(false);
  const [currentPetUserId, setCurrentPetUserId] = useState<string | null>(null);

  // 处理谁是卧底按钮点击
  const handleRoomInfoClick = () => {
    // 点击后清除通知状态
    setUndercoverNotification(UNDERCOVER_NOTIFICATION.NONE);
    setIsRoomInfoVisible(true);
  };

  // 添加处理来自eventBus的显示谁是卧底房间事件
  useEffect(() => {
    const handleShowUndercoverRoom = () => {
      setIsRoomInfoVisible(true);
    };

    eventBus.on('show_undercover_room', handleShowUndercoverRoom);

    return () => {
      eventBus.off('show_undercover_room', handleShowUndercoverRoom);
    };
  }, []);

  // 添加WebSocket消息处理器来监听房间创建事件
  useEffect(() => {
    const handleRefreshRoomMessage = (data: any) => {
      if (data?.data?.content?.action === 'create') {
        // 新房间创建，显示小红点通知
        setUndercoverNotification(UNDERCOVER_NOTIFICATION.NEW_ROOM);
      }
    };

    wsService.addMessageHandler('refreshRoom', handleRefreshRoomMessage);

    return () => {
      wsService.removeMessageHandler('refreshRoom', handleRefreshRoomMessage);
    };
  }, []);

  // 切换极速模式
  const toggleSpeedMode = (checked: boolean) => {
    setIsSpeedMode(checked);
    // 保存到本地存储，以便刷新页面后保持设置
    localStorage.setItem('chat_speed_mode', checked.toString());

    // 如果关闭极速模式，清空已展开图片的状态
    if (!checked) {
      setExpandedImages(new Set());
    }

    messageApi.success(`已${checked ? '开启' : '关闭'}极速模式`);
  };

  // 清空聊天记录
  const handleClearMessages = () => {
    Modal.confirm({
      title: '确认清空聊天记录',
      content: '此操作将清空当前页面显示的所有聊天记录，该操作不可撤销。确定要继续吗？',
      okText: '确认清空',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        // 清空消息列表
        setMessages([]);
        // 重置分页状态
        setCurrent(1);
        setTotal(0);
        setHasMore(true);
        // 清空已加载的消息ID集合
        loadedMessageIds.clear();
        // 显示成功提示
        messageApi.success('聊天记录已清空');
      },
    });
  };

  // 从本地存储加载极速模式设置
  useEffect(() => {
    const savedSpeedMode = localStorage.getItem('chat_speed_mode');
    if (savedSpeedMode) {
      setIsSpeedMode(savedSpeedMode === 'true');
    }
  }, []);

  // 加载用户备注
  useEffect(() => {
    const savedRemarks = localStorage.getItem('user_remarks');
    if (savedRemarks) {
      try {
        setUserRemarks(JSON.parse(savedRemarks));
      } catch (error) {
        console.error('加载用户备注失败:', error);
      }
    }
  }, []);

  // 保存用户备注
  const saveUserRemark = (userId: string, remark: string) => {
    const newRemarks = { ...userRemarks, [userId]: remark };
    setUserRemarks(newRemarks);
    localStorage.setItem('user_remarks', JSON.stringify(newRemarks));
  };

  // 获取用户显示名称
  const getUserDisplayName = (user: User) => {
    return userRemarks[user.id] || user.name;
  };

  // 打开设置备注弹窗
  const openRemarkModal = (user: User) => {
    setRemarkUserId(user.id);
    setRemarkValue(userRemarks[user.id] || '');
    setIsRemarkModalVisible(true);
  };

  // 保存备注
  const handleSaveRemark = () => {
    if (remarkUserId) {
      saveUserRemark(remarkUserId, remarkValue);
      setIsRemarkModalVisible(false);
      messageApi.success('备注设置成功');
    }
  };

  return (
    <div className={`${styles.chatRoom} ${isSpeedMode ? styles.speedMode : ''} ${!isUserListVisible ? styles.userListCollapsed : ''}`}>
        {/* 可拖动宠物组件 */}
        <MiniPet onClick={() => {
          setCurrentPetUserId(null);
          setIsPetModalVisible(true);
        }} />

      {/* 摸鱼宠物组件 */}
      <MoyuPet
        visible={isPetModalVisible}
        onClose={() => {
          setIsPetModalVisible(false);
          setCurrentPetUserId(null);
        }}
        otherUserId={currentPetUserId ? currentPetUserId as any : undefined}
        otherUserName={onlineUsers.find(user => user.id === currentPetUserId)?.name}
      />

      <AnnouncementModal
        open={isAnnouncementModalVisible}
        onCancel={() => setIsAnnouncementModalVisible(false)}
      />

      {/* 房间信息卡片 */}
      <RoomInfoCard
        visible={isRoomInfoVisible}
        onClose={() => setIsRoomInfoVisible(false)}
      />

      {currentMusic && (
        <div className={styles.musicFloatingPlayer}>
          <img src={currentMusic.cover} alt="cover" className={styles.musicCover} />
          <div className={styles.musicInfo}>
            <div className={styles.musicTitle}>{currentMusic.name}</div>
            <div className={styles.musicArtist}>{currentMusic.artists}</div>
            {/* <div className={styles.progressBar}>
              <div
                className={styles.progress}
                style={{ width: `${(currentMusic.progress / currentMusic.duration) * 100}%` }}
              />
            </div> */}
            {/* <div className={styles.timeInfo}>
              {formatTime(currentMusic.progress)} / {formatTime(currentMusic.duration)}
            </div> */}
          </div>
          <div className={styles.controls}>
            <Button
              type="text"
              icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
              onClick={togglePlay}
            />
            <Button type="text" icon={<CloseOutlined />} onClick={closeMusic} />
          </div>
        </div>
      )}
      {contextHolder}
      {showAnnouncement && (
        <Alert
          message={
            <div className={styles.announcementContent}>
              <SoundOutlined className={styles.announcementIcon} />
              <span dangerouslySetInnerHTML={{ __html: announcement }} />
              <Button
                type="link"
                onClick={() => setIsAnnouncementModalVisible(true)}
                style={{ marginLeft: '16px', padding: '0' }}
              >
                查看更新
              </Button>
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
        onClick={() => {
          // 点击消息区域时，如果功能面板是显示状态，则收起面板
          if (isMobileToolbarVisible) {
            setIsMobileToolbarVisible(false);
          }
        }}
      >
        {loading && (
          <div className={styles.loadingWrapper}>
            <Spin />
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            id={`message-${msg.id}`}
            className={`${styles.messageItem} ${
              currentUser?.id && String(msg.sender.id) === String(currentUser.id) ? styles.self : ''
            } ${notifications.some((n) => n.id === msg.id) ? styles.mentioned : ''}`}
          >
            <div className={styles.messageHeader}>
              <div
                className={styles.avatar}
                onClick={() => handleSelectMention(msg.sender)}
                style={{ cursor: 'pointer' }}
              >
                <Popover
                  content={<UserInfoCard user={msg.sender} />}
                  trigger="hover"
                  placement="top"
                >
                  <div className={styles.avatarWithFrame}>
                    <Avatar src={msg.sender.avatar} size={32} />
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
                <span
                  className={styles.senderName}
                  onClick={() => handleViewUserDetail(msg.sender)}
                  style={{ cursor: 'pointer' }}
                >
                  {getUserDisplayName(msg.sender)}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0px' }}>
                    {getAdminTag(msg.sender.isAdmin, msg.sender.level, msg.sender.titleId)}
                  </span>
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
                    <span
                      className={styles.quotedMessageSender}
                      onClick={() => msg.quotedMessage && handleViewUserDetail(msg.quotedMessage.sender)}
                      style={{ cursor: 'pointer' }}
                    >
                      {getUserDisplayName(msg.quotedMessage.sender)}
                    </span>
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
              {(currentUser?.id && String(msg.sender.id) === String(currentUser.id)) ||
              currentUser?.userRole === 'admin' ? (
                <Popconfirm
                  title="确定要撤回这条消息吗？"
                  onConfirm={() => handleRevokeMessage(msg.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <span className={styles.revokeText}>撤回</span>
                </Popconfirm>
              ) : null}
              <span className={styles.quoteText} onClick={() => handleQuoteMessage(msg)}>
                引用
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 用户列表隐藏时显示浮动按钮 */}
      {!isUserListVisible && (
        <div className={`${styles.userList} ${styles.userListHidden}`}>
          <div className={styles.userListHeader}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setIsUserListVisible(!isUserListVisible)}
              title="显示用户列表"
              className={styles.toggleButton}
            />
          </div>
        </div>
      )}

      {/* 用户列表显示时的正常布局 */}
      {isUserListVisible && (
        <div className={styles.userList}>
          <div className={styles.userListHeader}>
            <span>在线成员 ({onlineUsers.length})</span>
            <Button
              type="text"
              size="small"
              icon={<EyeInvisibleOutlined />}
              onClick={() => setIsUserListVisible(!isUserListVisible)}
              title="隐藏用户列表"
              className={styles.toggleButton}
            />
          </div>
          <div className={styles.userListContent} ref={userListRef}>
            <List
              height={listHeight}
              itemCount={onlineUsers.length}
              itemSize={USER_ITEM_HEIGHT}
              width="100%"
            >
              {UserItem}
            </List>
          </div>
        </div>
      )}

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
              icon={<DeleteOutlined />}
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
                icon={<DeleteOutlined />}
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
                <PaperClipOutlined className={styles.fileIcon} />
                <span className={styles.fileName}>{pendingFileUrl.split('/').pop()}</span>
              </div>
              <Button
                type="text"
                icon={<DeleteOutlined />}
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
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // 检查文件类型
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                  messageApi.error('只支持 JPG、PNG、GIF 和 WEBP 格式的图片');
                  return;
                }
                // 检查文件大小（限制为 5MB）
                if (file.size > 5 * 1024 * 1024) {
                  messageApi.error('图片大小不能超过 5MB');
                  return;
                }
                handleImageUpload(file);
              }
            }}
            accept="image/jpeg,image/png,image/gif,image/webp"
            disabled={uploading}
          />

          {/* 移动端：切换加号/发送按钮 */}
          {shouldShowSendButton ? (
            <Button
              icon={<SendOutlined />}
              className={styles.mobileSendButton}
              onClick={() => handleSend()}
              disabled={uploading}
              type="primary"
            />
          ) : (
            <Button
              icon={<PlusOutlined />}
              className={styles.mobilePlusButton}
              onClick={(e) => {
                // 阻止事件冒泡
                e.stopPropagation();
                toggleMobileToolbar();
              }}
              disabled={uploading}
            />
          )}

          {/* PC端按钮 */}
          <Popover
            content={emojiPickerContent}
            trigger="click"
            visible={isEmojiPickerVisible}
            onVisibleChange={setIsEmojiPickerVisible}
            placement="topLeft"
            overlayClassName={styles.emojiPopover}
          >
            <Button icon={<SmileOutlined />} className={styles.emojiButton} />
          </Popover>
          <Popover
            content={<EmoticonPicker onSelect={handleEmoticonSelect} />}
            trigger="click"
            visible={isEmoticonPickerVisible}
            onVisibleChange={setIsEmoticonPickerVisible}
            placement="topLeft"
            overlayClassName={styles.emoticonPopover}
          >
            <Button icon={<PictureOutlined />} className={styles.emoticonButton} />
          </Popover>
          {/* 谁是卧底按钮 */}
          <Popover content="谁是卧底" placement="top">
            <Badge dot={undercoverNotification === UNDERCOVER_NOTIFICATION.NEW_ROOM} className={styles.roomInfoBadge}>
              <Button
                icon={<TeamOutlined />}
                className={`${styles.roomInfoButton} ${styles.hideOnMobile}`}
                onClick={handleRoomInfoClick}
              />
            </Badge>
          </Popover>
          <Popover
            content={
              <div className={styles.moreOptionsMenu}>
                <div className={styles.moreOptionsItem} onClick={() => setIsMusicSearchVisible(true)}>
                  <CustomerServiceOutlined className={styles.moreOptionsIcon} />
                  <span>点歌</span>
                </div>
                <div className={styles.moreOptionsItem} onClick={() => {
                  setCurrentPetUserId(null);
                  setIsPetModalVisible(true);
                }}>
                  <BugOutlined className={styles.moreOptionsIcon} />
                  <span>摸鱼宠物</span>
                </div>
                {(currentUser?.userRole === 'admin' || (currentUser?.level && currentUser.level >= 6) || currentUser?.vip) && (
                  <div className={styles.moreOptionsItem} onClick={() => setIsRedPacketModalVisible(true)}>
                    <GiftOutlined className={styles.moreOptionsIcon} />
                    <span>发红包</span>
                  </div>
                )}
                <div className={styles.moreOptionsItem} onClick={fetchMoyuCalendar}>
                  <CalendarOutlined className={styles.moreOptionsIcon} />
                  <span>摸鱼日历</span>
                </div>
                <div className={styles.moreOptionsItem} onClick={() => fileInputRef.current?.click()}>
                  <PaperClipOutlined className={styles.moreOptionsIcon} />
                  <span>上传图片</span>
                </div>
                <div className={styles.moreOptionsItem}>
                  <RocketOutlined className={styles.moreOptionsIcon} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ marginRight: '10px' }}>极速模式</span>
                    <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Switch
                        checked={isSpeedMode}
                        onChange={(checked) => toggleSpeedMode(checked)}
                        size="small"
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.moreOptionsItem} onClick={handleClearMessages}>
                  <DeleteOutlined className={styles.moreOptionsIcon} />
                  <span>清空聊天记录</span>
                </div>
              </div>
            }
            trigger="click"
            placement="top"
            overlayClassName={styles.moreOptionsPopover}
          >
            <Button icon={<EllipsisOutlined />} className={`${styles.moreOptionsButton} ${styles.hideOnMobile}`} />
          </Popover>
          <Input.TextArea
            ref={inputRef}
            value={inputValue}
            onChange={handleMentionInput}
            onFocus={closeMobileToolbar}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.nativeEvent.isComposing) {
                  return;
                }
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }
            }}
            onPaste={handlePaste}
            placeholder={uploading ? '正在上传图片...' : '输入消息或粘贴图片...'}
            maxLength={200}
            disabled={uploading}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className={`${styles.chatTextArea} ${styles.hidePlaceholderOnMobile}`}
          />

          {isMentionListVisible && filteredUsers.length > 0 && (
            <div
              ref={mentionListRef}
              className={styles.mentionList}
              style={{
                position: 'fixed',
                top: mentionListPosition.top,
                left: mentionListPosition.left,
                zIndex: 1000,
              }}
            >
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={styles.mentionItem}
                  onClick={() => handleSelectMention(user)}
                >
                  <Avatar src={user.avatar} size={24} />
                  <span className={styles.mentionName}>{user.name}</span>
                </div>
              ))}
            </div>
          )}
          <span className={styles.inputCounter}>{inputValue.length}/200</span>

          {/* PC端发送按钮 */}
          <Button
            type="text"
            icon={<SendOutlined />}
            onClick={() => handleSend()}
            disabled={uploading}
            className={styles.sendButton}
          >
            发送
          </Button>
        </div>

        {/* 移动端功能面板 */}
        {isMobileToolbarVisible && (
          <div
            className={styles.mobileToolbar}
            onClick={(e) => {
              // 阻止事件冒泡，防止点击面板内部元素时触发消息容器的点击事件
              e.stopPropagation();
            }}
          >
            <div className={styles.mobileToolRow}>
              <div className={styles.mobileTool} onClick={() => handleMobileToolClick('image')}>
                <div className={styles.mobileToolIcon}>
                  <PictureOutlined />
                </div>
                <div className={styles.mobileToolText}>相册</div>
              </div>
              <div className={styles.mobileTool} onClick={() => handleMobileToolClick('emoticon')}>
                <div className={styles.mobileToolIcon}>
                  <SmileOutlined />
                </div>
                <div className={styles.mobileToolText}>表情</div>
              </div>
              <div className={styles.mobileTool} onClick={() => handleMobileToolClick('music')}>
                <div className={styles.mobileToolIcon}>
                  <CustomerServiceOutlined />
                </div>
                <div className={styles.mobileToolText}>音乐</div>
              </div>
              <div className={styles.mobileTool} onClick={() => handleMobileToolClick('calendar')}>
                <div className={styles.mobileToolIcon}>
                  <CalendarOutlined />
                </div>
                <div className={styles.mobileToolText}>摸鱼日历</div>
              </div>
            </div>
            <div className={styles.mobileToolRow}>
              <div className={styles.mobileTool} onClick={() => handleMobileToolClick('pet')}>
                <div className={styles.mobileToolIcon}>
                  <BugOutlined />
                </div>
                <div className={styles.mobileToolText}>摸鱼宠物</div>
              </div>
              <div className={styles.mobileTool} onClick={() => handleMobileToolClick('speedMode')}>
                <div className={styles.mobileToolIcon}>
                  <RocketOutlined />
                </div>
                <div className={styles.mobileToolText}>
                  {isSpeedMode ? '关闭极速' : '开启极速'}
                </div>
              </div>
              <div className={styles.mobileTool} style={{ visibility: 'hidden' }}></div>
              <div className={styles.mobileTool} style={{ visibility: 'hidden' }}></div>
            </div>
            {(currentUser?.userRole === 'admin' || (currentUser?.level && currentUser.level >= 6) || currentUser?.vip) && (
              <div className={styles.mobileToolRow}>
                <div className={styles.mobileTool} onClick={() => handleMobileToolClick('redPacket')}>
                  <div className={styles.mobileToolIcon}>
                    <GiftOutlined />
                  </div>
                  <div className={styles.mobileToolText}>红包</div>
                </div>
                <div className={styles.mobileTool} style={{ visibility: 'hidden' }}></div>
                <div className={styles.mobileTool} style={{ visibility: 'hidden' }}></div>
                <div className={styles.mobileTool} style={{ visibility: 'hidden' }}></div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        title={
          <div className={styles.redPacketModalTitle}>
            <GiftOutlined className={styles.redPacketTitleIcon} />
            <span>发送红包</span>
          </div>
        }
        open={isRedPacketModalVisible}
        onOk={handleSendRedPacket}
        onCancel={() => setIsRedPacketModalVisible(false)}
        okText={isRedPacketSending ? "发送中..." : "发送"}
        cancelText="取消"
        okButtonProps={{ loading: isRedPacketSending }}
        width={480}
        className={styles.redPacketModal}
      >
        <div className={styles.redPacketForm}>
          <div className={styles.formItem}>
            <span className={styles.label}>红包类型：</span>
            <Radio.Group
              value={redPacketType}
              onChange={(e) => setRedPacketType(e.target.value)}
              className={styles.redPacketTypeGroup}
            >
              <Radio.Button value={1}>
                <span className={styles.typeIcon}>🎲</span>
                <span>随机红包</span>
              </Radio.Button>
              <Radio.Button value={2}>
                <span className={styles.typeIcon}>📊</span>
                <span>平均红包</span>
              </Radio.Button>
            </Radio.Group>
          </div>
          <div className={styles.formItem}>
            <span className={styles.label}>红包金额：</span>
            <Input
              type="number"
              value={redPacketAmount}
              onChange={(e) => setRedPacketAmount(Number(e.target.value))}
              min={1}
              placeholder="请输入红包金额"
              prefix="¥"
              className={styles.amountInput}
            />
          </div>
          <div className={styles.formItem}>
            <span className={styles.label}>红包个数：</span>
            <Input
              type="number"
              value={redPacketCount}
              onChange={(e) => setRedPacketCount(Number(e.target.value))}
              min={1}
              placeholder="请输入红包个数"
              className={styles.countInput}
            />
          </div>
          <div className={styles.formItem}>
            <span className={styles.label}>祝福语：</span>
            <Input.TextArea
              value={redPacketMessage}
              onChange={(e) => setRedPacketMessage(e.target.value)}
              placeholder="恭喜发财，大吉大利！"
              maxLength={50}
              showCount
              className={styles.messageInput}
            />
          </div>
        </div>
      </Modal>

      <Modal open={isPreviewVisible} footer={null} onCancel={() => setIsPreviewVisible(false)}>
        {previewImage && <img alt="预览" style={{ width: '100%' }} src={previewImage} />}
      </Modal>

      <Modal
        title="红包记录"
        open={isRedPacketRecordsVisible}
        onCancel={() => setIsRedPacketRecordsVisible(false)}
        footer={null}
        width={400}
      >
        <div className={styles.redPacketRecords}>
          <div className={styles.recordsList}>
            {redPacketRecords.length > 0 ? (
              redPacketRecords.map((record, index) => (
                <div key={record.id} className={styles.recordItem}>
                  <Avatar src={record.userAvatar} size={32} />
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>
                      {record.userName}
                      {index === 0 && <span className={styles.luckyKing}>👑 手气王</span>}
                    </div>
                    <div className={styles.grabTime}>
                      {new Date(record.grabTime || '').toLocaleString()}
                    </div>
                  </div>
                  <div className={styles.amount}>{record.amount} 积分</div>
                </div>
              ))
            ) : (
              <div className={styles.emptyRecords}>
                <GiftOutlined className={styles.emptyIcon} />
                <span>暂无人抢到红包</span>
              </div>
            )}
          </div>
        </div>
      </Modal>
      <Modal
        title="点歌"
        open={isMusicSearchVisible}
        onCancel={() => setIsMusicSearchVisible(false)}
        footer={null}
        width={600}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'search',
              label: '搜索音乐',
              children: (
                <div className={styles.musicSearch}>
                  <Input.Search
                    placeholder="输入歌曲名称"
                    value={searchKey}
                    onChange={handleSearchKeyChange}
                    onSearch={handleMusicSearch}
                    enterButton
                    loading={isSearchingMusic}
                    style={{ marginBottom: '10px' }}
                  />

                  {musicApiError && (
                    <Alert
                      message="API服务提示"
                      description={musicApiError}
                      type="warning"
                      showIcon
                      style={{ marginBottom: '10px' }}
                      closable
                      onClose={() => setMusicApiError(null)}
                    />
                  )}

                  {isSearchingMusic ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                      <Spin tip="正在搜索音乐..." />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <List
                      className={styles.musicList}
                      height={300}
                      itemCount={searchResults.length}
                      itemSize={60}
                      width="100%"
                    >
                      {({ index, style }) => {
                        const item = searchResults[index];
                        return (
                          <div
                            style={{
                              ...style,
                              display: 'flex',
                              alignItems: 'center',
                              padding: '5px 10px',
                            }}
                            className={styles.musicListItem}
                          >
                            <div className={styles.musicInfo}>
                              <div className={styles.musicTitle}>{item.name}</div>
                              <div className={styles.musicDesc}>
                                {`${item.artists.map((a: any) => a.name).join(',')} - ${
                                  item.album.name
                                }`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Button
                                type="primary"
                                size="small"
                                onClick={() => handleSelectMusic(item)}
                                loading={isSelectingMusic}
                                disabled={isSelectingMusic}
                              >
                                {isSelectingMusic ? '处理中' : '发送'}
                              </Button>
                              <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => addToPlaylist(item)}
                                loading={addingToPlaylistId === item.id}
                                disabled={addingToPlaylistId !== null}
                              >
                                添加到歌单
                              </Button>
                            </div>
                          </div>
                        );
                      }}
                    </List>
                  ) : (
                    <Empty
                      description={hasSearched ? '未找到相关歌曲' : '请输入关键词并点击搜索'}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'playlist',
              label: '我的歌单',
              children: (
                <div className={styles.playlist}>
                  <div
                    style={{
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>共 {playlist.length} 首歌曲</div>
                    {playlist.length > 0 && (
                      <Button type="primary" size="small" onClick={playEntirePlaylist}>
                        播放全部
                      </Button>
                    )}
                  </div>

                  {playlist.length === 0 ? (
                    <Empty description="你的歌单还是空的" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <div
                      className={styles.playlistContainer}
                      style={{ maxHeight: '250px', overflow: 'auto' }}
                    >
                      {playlist.map((song) => (
                        <div
                          key={song.id}
                          className={styles.playlistItem}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px',
                            borderBottom: '1px solid #f0f0f0',
                          }}
                        >
                          <img
                            src={song.cover}
                            alt={song.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              marginRight: '10px',
                              borderRadius: '4px',
                            }}
                          />
                          <div className={styles.songInfo} style={{ flex: 1 }}>
                            <div>{song.name}</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>{song.artist}</div>
                          </div>
                          <div className={styles.songActions}>
                            <Button
                              type="text"
                              size="small"
                              icon={<PlayCircleOutlined />}
                              onClick={() => playFromPlaylist(song)}
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => removeFromPlaylist(song.id)}
                              danger
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* APlayer容器 */}
                  <div ref={aPlayerContainerRef} style={{ marginTop: '20px' }} />
                </div>
              ),
            },
          ]}
        />
      </Modal>
      <Modal
        title="用户详细信息"
        open={isUserDetailModalVisible}
        onCancel={() => setIsUserDetailModalVisible(false)}
        footer={
          currentUser?.userRole === 'admin' ? (
            <div className={styles.userDetailActions}>
              {userMuteInfo?.isMuted ? (
                <Button
                  type="primary"
                  onClick={() => selectedUser && handleUnmuteUser(selectedUser.id)}
                >
                  解除禁言
                </Button>
              ) : (
                <Button
                  type="primary"
                  danger
                  onClick={() => selectedUser && handleMuteUser(selectedUser.id)}
                >
                  禁言用户
                </Button>
              )}
              <Button
                type="primary"
                danger
                onClick={() => selectedUser && handleBanUser(selectedUser.id)}
              >
                封禁账号
              </Button>
              <Button onClick={() => setIsUserDetailModalVisible(false)}>
                关闭
              </Button>
            </div>
          ) : (
            <div className={styles.userDetailActions}>
              <Button onClick={() => setIsUserDetailModalVisible(false)}>关闭</Button>
            </div>
          )
        }
        width={400}
      >
        {selectedUser && (
          <div className={styles.userDetailModal}>
            <div className={styles.userDetailHeader}>
              <div className={styles.avatarWrapper}>
                <div className={styles.avatarWithFrame}>
                  <Avatar src={selectedUser.avatar} size={64} />
                  {selectedUser.avatarFramerUrl && (
                    <img
                      src={selectedUser.avatarFramerUrl}
                      className={styles.avatarFrame}
                      alt="avatar-frame"
                    />
                  )}
                </div>
              </div>
              <div className={styles.userDetailInfo}>
                <div className={styles.userDetailName} style={{ display: 'flex', alignItems: 'center' }}>
                  <span>
                    {getUserDisplayName(selectedUser)}
                    {userRemarks[selectedUser.id] && (
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '5px' }}>
                        ({selectedUser.name})
                      </span>
                    )}
                  </span>
                  {(selectedUser.vip || selectedUser.isVip) && (
                    <span className={styles.vipBadge} style={{ marginLeft: '8px' }}>V</span>
                  )}
                  <Button
                    type="link"
                    size="small"
                    onClick={() => openRemarkModal(selectedUser)}
                    style={{ marginLeft: '8px', padding: '0 4px' }}
                  >
                    {userRemarks[selectedUser.id] ? '修改备注' : '设置备注'}
                  </Button>
                  {currentUser?.userRole === 'admin' && (
                    <Button
                      type="link"
                      size="small"
                      icon={<CopyOutlined />}
                      style={{ marginLeft: '8px', padding: '0 4px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(selectedUser.id);
                        messageApi.success('已复制用户ID到剪贴板');
                      }}
                    >
                      复制ID
                    </Button>
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: '0px',
                  marginTop: '12px',
                  marginBottom: '12px',
                  maxWidth: '100%'
                }}>
                  <div style={{ display: 'inline-flex', marginRight: '-2px', transform: 'scale(0.85)' }}>
                    {getAdminTag(selectedUser.isAdmin, selectedUser.level, selectedUser.titleId)}
                  </div>
                  {selectedUser.titleIdList &&
                    JSON.parse(selectedUser.titleIdList || '[]')
                      .filter((id: number) => id !== selectedUser.titleId && id !== 0)
                      .map((titleId: number) => (
                        <div key={titleId} style={{ display: 'inline-flex', marginRight: '-2px', transform: 'scale(0.85)' }}>
                          {getAdminTag(selectedUser.isAdmin, selectedUser.level, titleId)}
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>
            <div className={styles.userDetailContent}>

              <div className={styles.userDetailItem}>
                <span className={styles.itemLabel}>等级：</span>
                <span className={styles.itemValue}>
                  {getLevelEmoji(selectedUser.level)} {selectedUser.level}
                </span>
              </div>
              <div className={styles.userDetailItem}>
                <span className={styles.itemLabel}>积分：</span>
                {currentUser?.userRole === 'admin' && isEditingPoints ? (
                  <div className={styles.pointsEditContainer}>
                    <Input
                      type="number"
                      value={pointsInputValue}
                      onChange={(e) => setPointsInputValue(Number(e.target.value))}
                      size="small"
                      style={{ width: 100 }}
                    />
                    <Button type="primary" size="small" onClick={handleSavePoints}>
                      保存
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setIsEditingPoints(false)}
                      style={{ marginLeft: 4 }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className={styles.pointsContainer}>
                    <span className={styles.itemValue}>{selectedUser.points || 0}</span>
                  </div>
                )}
              </div>
              {selectedUser.region && (
                <div className={styles.userDetailItem}>
                  <span className={styles.itemLabel}>地区：</span>
                  <span className={styles.itemValue}>
                    {selectedUser.country ? `${selectedUser.country} · ${selectedUser.region}` : selectedUser.region}
                  </span>
                </div>
              )}
              {currentUser?.userRole === 'admin' && (
                <div className={styles.userDetailItem}>
                  <span className={styles.itemLabel}>管理员：</span>
                  <span className={styles.itemValue}>{selectedUser.isAdmin ? '是' : '否'}</span>
                </div>
              )}
              <div className={styles.userDetailItem}>
                <span className={styles.itemLabel}>上次活跃：</span>
                <span className={styles.itemValue}>刚刚</span>
              </div>
              {currentUser?.userRole === 'admin' && userMuteInfo?.isMuted ? (
                <div className={styles.userDetailItem}>
                  <span className={styles.itemLabel}>状态：</span>
                  <span className={styles.itemValue} style={{ color: '#ff4d4f' }}>
                    已禁言（剩余 {userMuteInfo.remainingTime}）
                  </span>
                </div>
              ) : (
                <div className={styles.userDetailItem}>
                  <span className={styles.itemLabel}>状态：</span>
                  <span className={styles.itemValue}>{selectedUser.status || '在线'}</span>
                </div>
              )}
                            <div className={styles.userDetailItem}>
                <span className={styles.itemLabel}>宠物：</span>
                <Button
                  type="primary"
                  size="small"
                  icon={<BugOutlined />}
                  onClick={() => {
                    if (selectedUser) {
                      setCurrentPetUserId(selectedUser.id);
                      setIsUserDetailModalVisible(false);
                      setIsPetModalVisible(true);
                    }
                  }}
                >
                  查看宠物
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 添加禁言设置弹窗 */}
      <Modal
        title="设置禁言时长"
        open={isMuteModalVisible}
        onCancel={() => setIsMuteModalVisible(false)}
        footer={null}
        width={400}
      >
        <div className={styles.muteModalContent}>
          <div className={styles.muteOptions}>
            <Radio.Group
              value={muteDuration}
              onChange={(e) => {
                setMuteDuration(e.target.value);
                setCustomMuteDuration(undefined);
              }}
              buttonStyle="solid"
            >
              <Radio.Button value={10}>10秒</Radio.Button>
              <Radio.Button value={60}>1分钟</Radio.Button>
              <Radio.Button value={300}>5分钟</Radio.Button>
              <Radio.Button value={3600}>1小时</Radio.Button>
              <Radio.Button value={86400}>1天</Radio.Button>
            </Radio.Group>
          </div>

          <div className={styles.customMuteDuration} style={{ marginTop: '16px' }}>
            <Input.Group compact>
              <Input
                style={{ width: 'calc(100% - 80px)' }}
                type="number"
                placeholder="自定义禁言时长（秒）"
                value={customMuteDuration}
                onChange={(e) => setCustomMuteDuration(e.target.value ? Number(e.target.value) : undefined)}
                min={1}
              />
              <Button
                type="primary"
                style={{ width: '80px' }}
                onClick={() => {
                  if (customMuteDuration && customMuteDuration > 0) {
                    setMuteDuration(customMuteDuration);
                  } else {
                    messageApi.warning('请输入有效的禁言时长');
                  }
                }}
              >
                确认
              </Button>
            </Input.Group>
          </div>

          <div className={styles.muteButtons} style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setIsMuteModalVisible(false)} style={{ marginRight: '8px' }}>
              取消
            </Button>
            <Button
              type="primary"
              danger
              onClick={handleConfirmMute}
              loading={muteLoading}
            >
              确认禁言 {formatMuteDuration(customMuteDuration !== undefined ? customMuteDuration : muteDuration)}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 添加备注设置弹窗 */}
      <Modal
        title="设置备注"
        open={isRemarkModalVisible}
        onCancel={() => setIsRemarkModalVisible(false)}
        onOk={handleSaveRemark}
        okText="保存"
        cancelText="取消"
        width={300}
      >
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="请输入备注名称"
            value={remarkValue}
            onChange={(e) => setRemarkValue(e.target.value)}
            maxLength={20}
            allowClear
          />
        </div>
        {remarkValue && (
          <div style={{ color: '#666', fontSize: '12px' }}>
            备注后将在聊天中显示为：{remarkValue}
          </div>
        )}
      </Modal>
    </div>
  );
};

// @ts-ignore
export default ChatRoom;
