import { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Button,
  Modal,
  Empty,
  Tag,
  Space,
  Divider,
  Card,
  message,
  Tooltip,
  Drawer,
  theme,
  Badge,
  Switch,
} from "antd";
import {
  PlusOutlined,
  BookOutlined,
  SettingOutlined,
  DeleteOutlined,
  GlobalOutlined,
  FileOutlined,
  BarsOutlined,
  LaptopOutlined,
  ReadOutlined,
  PushpinOutlined,
} from "@ant-design/icons";
import { useModel } from 'umi';
import { ACCESS_TOKEN } from '@/constants';
import ReaderSettingsPanel from "./components/ReaderSettings";
import BookReader from "./components/BookReader";
import BookImport from "./components/BookImport";
import ChapterList from "./components/ChapterList";
import BookSearch from "./components/BookSearch";

const { Header, Content } = Layout;
const { Title } = Typography;
const { confirm } = Modal;

// 定义书籍类型
interface Book {
  id: number;
  title: string;
  author?: string;
  cover?: string;
  format: 'txt' | 'epub' | 'mobi' | 'online';
  source: 'local' | 'online';
  filePath?: string;
  url?: string;
  lastReadPosition?: number;
  lastReadChapter?: number;
  lastReadTime?: number;
  tags?: string[];
  chapters?: Chapter[];
  sourceInfo: {
    name: string;
    url: string;
  };
}

// 定义章节类型
interface Chapter {
  baseUrl: string;
  bookUrl: string;
  index: number;
  isVolume: boolean;
  tag: string;
  title: string;
  url: string;
  content: string;
  position?: number;
}

// 定义阅读器设置类型
interface ReaderSettings {
  fontColor: string;
  backgroundColor: string;
  opacity: number;
  allowWindowMove: boolean;
  fontSize: number;
  fontFamily: string;
  prevPageKey: string;
  nextPageKey: string;
  quickHide: 'mouseOut' | 'key' | 'none';
  panicKey: string;
  accessToken?: string;
  apiBaseUrl?: string;
}

// 添加自定义 hook 用于监听窗口大小
const useWindowSize = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// 生成默认的阅读器设置
const getDefaultReaderSettings = (): ReaderSettings => {
  // 从本地存储加载已保存的设置
  const savedSettings = localStorage.getItem("fish-reader-settings");
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings);
    } catch (e) {
      console.error('解析已保存的阅读器设置失败:', e);
    }
  }

  // 返回默认设置
  return {
    fontColor: '#333333',
    backgroundColor: '#f5f5f5',
    opacity: 1,
    allowWindowMove: true,
    fontSize: 12,
    fontFamily: 'Arial, sans-serif',
    prevPageKey: 'ArrowLeft',
    nextPageKey: 'ArrowRight',
    quickHide: 'none',
    panicKey: 'Escape',
    apiBaseUrl: 'https://reader.yucoder.cn/reader3'
  };
};

export default function ReaderList() {
  // 状态管理
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isReaderVisible, setIsReaderVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isChapterListVisible, setIsChapterListVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(getDefaultReaderSettings());
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // 添加学习模式状态
  const [isStudyMode, setIsStudyMode] = useState(false);
  const isMobile = useWindowSize();
  const { token } = theme.useToken();

  // 使用全局阅读器状态
  const { showReader } = useModel('globalReader');

  // 添加悬浮窗阅读设置
  const [floatingModeEnabled, setFloatingModeEnabled] = useState(
    localStorage.getItem('fish-reader-floating-mode') === null ? true : localStorage.getItem('fish-reader-floating-mode') === 'true'
  );

  // 保存悬浮窗阅读设置
  useEffect(() => {
    localStorage.setItem('fish-reader-floating-mode', floatingModeEnabled.toString());
  }, [floatingModeEnabled]);

  // 切换学习模式
  const toggleStudyMode = () => {
    setIsStudyMode(!isStudyMode);
    // 保存学习模式状态到localStorage
    localStorage.setItem("fish-reader-study-mode", JSON.stringify(!isStudyMode));
  };

  // 加载学习模式状态
  useEffect(() => {
    const savedStudyMode = localStorage.getItem("fish-reader-study-mode");
    if (savedStudyMode) {
      try {
        setIsStudyMode(JSON.parse(savedStudyMode));
      } catch (e) {
        console.error('解析已保存的学习模式设置失败:', e);
      }
    }
  }, []);

  // 加载书籍列表
  useEffect(() => {
    const loadBooks = async () => {
      try {
        setLoading(true);
        // 不再从后端获取数据，只从本地存储加载
        const savedBooks = localStorage.getItem("fish-reader-books");
        if (savedBooks) {
          setBooks(JSON.parse(savedBooks));
        }

        // 加载阅读器设置
        const savedSettings = localStorage.getItem("fish-reader-settings");
        if (savedSettings) {
          setReaderSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error('加载书籍列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, []);

  // 保存阅读器设置
  useEffect(() => {
    localStorage.setItem("fish-reader-settings", JSON.stringify(readerSettings));
  }, [readerSettings]);

  // 处理组件卸载时清理所有右键菜单
  useEffect(() => {
    return () => {
      // 清理所有可能存在的右键菜单和事件监听器
      const customMenus = document.querySelectorAll('.custom-context-menu');
      customMenus.forEach(menu => {
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
      });
    };
  }, []);

  // 在导航或打开抽屉前清理右键菜单
  const cleanupContextMenus = () => {
    const customMenus = document.querySelectorAll('.custom-context-menu');
    customMenus.forEach(menu => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
    });
  };

  // 打开导入面板
  const showImportModal = () => {
    setIsImportModalVisible(true);
  };

  // 添加本地书籍
  const handleAddLocalBook = (book: Book) => {
    const updatedBooks = [...books, book];
    setBooks(updatedBooks);
    // 保存到localStorage
    localStorage.setItem("fish-reader-books", JSON.stringify(updatedBooks));
    // 不关闭模态框，允许继续添加
    message.success('书籍导入成功');
  };

  // 添加在线书籍
  const handleAddOnlineBook = (book: Book) => {
    const updatedBooks = [...books, book];
    setBooks(updatedBooks);
    // 保存到localStorage
    localStorage.setItem("fish-reader-books", JSON.stringify(updatedBooks));
    // 不关闭模态框，允许继续添加
    message.success('在线书籍添加成功');
  };

  // 打开阅读器 - 修改以支持悬浮模式
  const openReader = (book: Book) => {
    const savedBooks = JSON.parse(localStorage.getItem("fish-reader-books") || '[]');
    const currentBook = savedBooks.find((b: Book) => b.id === book.id)
    // 确保书籍有一个默认的lastReadChapter
    const updatedBook = {
      ...book,
      lastReadChapter: currentBook?.lastReadChapter || 0 // 如果没有lastReadChapter，设为0
    };

    // 更新书籍信息
    setCurrentBook(updatedBook);

    // 保存最后打开的书籍ID到localStorage，确保悬浮阅读器可以找到
    localStorage.setItem("fish-reader-last-book", updatedBook.id.toString());

    // 同时确保书籍信息也更新到书籍列表中
    const updatedBooks = books.map(b => b.id === updatedBook.id ? updatedBook : b);
    setBooks(updatedBooks);
    localStorage.setItem("fish-reader-books", JSON.stringify(updatedBooks));

    // 根据悬浮模式设置选择打开方式
    if (floatingModeEnabled) {
      // 使用全局悬浮阅读器
      showReader(updatedBook.id);
    } else {
      // 使用页面内阅读器
      setIsReaderVisible(true);
    }
  };

  // 打开设置面板
  const openSettings = () => {
    setIsSettingsVisible(true);
  };

  // 保存设置
  const saveSettings = (settings: ReaderSettings) => {
    // 保存设置到本地存储
    localStorage.setItem("fish-reader-settings", JSON.stringify(settings));

    // 更新状态
    setReaderSettings(settings);

    // 如果阅读器是打开状态，直接应用新设置
    if (isReaderVisible && currentBook) {
      // 不需要关闭再重新打开阅读器，直接更新设置即可
      // 因为BookReader组件会监听settings属性的变化并自动应用新设置
    }

    setIsSettingsVisible(false);
    message.success('设置已保存并应用');
  };

  // 打开章节列表
  const openChapterList = (book: Book, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // 阻止冒泡，避免触发父元素的点击事件
    }
    setCurrentBook(book);
    setIsChapterListVisible(true);
  };

  // 章节跳转
  const handleChapterSelect = (chapterIndex: number, chapter?: Chapter) => {
    if (currentBook) {


      let updatedBook: Book;
      if (chapter && currentBook.chapters) {
        // 如果传入了章节对象，更新chapters中对应章节的内容
        const updatedChapters = currentBook.chapters.map(c =>
          c.index === chapterIndex ?
            { ...c, content: chapter.content } :
            c
        );

        updatedBook = {
          ...currentBook,
          lastReadChapter: chapterIndex,
          chapters: updatedChapters
        };
      } else {
        updatedBook = {
          ...currentBook,
          lastReadChapter: chapterIndex
        };
      }



      // 首先更新本地存储，确保持久化保存
      const savedBooks = localStorage.getItem("fish-reader-books");
      if (savedBooks) {
        const allBooks = JSON.parse(savedBooks);
        const updatedBooks = allBooks.map((b: Book) =>
          b.id === updatedBook.id ? updatedBook : b
        );
        localStorage.setItem("fish-reader-books", JSON.stringify(updatedBooks));

      }

      // 强制关闭阅读器并重新打开，确保使用新的章节数据
      setIsReaderVisible(false);


      // 延迟更新状态，确保UI先关闭再打开
      setTimeout(() => {
        // 更新当前书籍
        setCurrentBook(updatedBook);

        // 更新书籍列表中的当前书籍
        setBooks(books.map(book =>
          book.id === updatedBook.id ? updatedBook : book
        ));

        // 关闭章节列表
        setIsChapterListVisible(false);

        // 根据悬浮模式设置选择打开方式
        if (floatingModeEnabled) {
          // 使用全局悬浮阅读器
          showReader(updatedBook.id);
        } else {
          // 使用页面内阅读器
          setIsReaderVisible(true);
        }
      }, 100);
    }
  };

  // 内容搜索
  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    // 实现内容搜索逻辑
    if (currentBook && currentBook.source === 'local') {
      // 这里仅是示例，实际搜索实现会在BookSearch组件中
      setSearchResults([]);
    } else {
      message.info('在线书籍暂不支持内容搜索');
    }
  };

  // 搜索结果跳转
  const handleSearchResultSelect = (position: number) => {
    if (currentBook) {
      const updatedBook = {
        ...currentBook,
        lastReadPosition: position
      };
      setCurrentBook(updatedBook);

      // 更新书籍列表中的当前书籍
      setBooks(books.map(book =>
        book.id === updatedBook.id ? updatedBook : book
      ));

      setIsSearchVisible(false);
      setIsReaderVisible(true);
    }
  };

  // 删除书籍
  const handleDeleteBook = (bookId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // 阻止冒泡，避免触发父元素的点击事件
    }

    confirm({
      title: '确认删除',
      content: '确定要删除这本书吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk() {
        const newBooks = books.filter(book => book.id !== bookId)
        setBooks(newBooks);
        localStorage.setItem("fish-reader-books", JSON.stringify(newBooks))
        message.success('书籍已删除');
      }
    });
  };

  // 更新阅读进度
  const updateReadingProgress = (bookId: number, position: number, chapterIndex?: number) => {
    const now = Date.now();
    const updatedBooks = books.map(book => {
      if (book.id === bookId) {
        return {
          ...book,
          lastReadPosition: position,
          lastReadChapter: chapterIndex !== undefined ? chapterIndex : book.lastReadChapter,
          lastReadTime: now
        };
      }
      return book;
    });

    setBooks(updatedBooks);

    // 同时更新当前书籍
    if (currentBook && currentBook.id === bookId) {
      setCurrentBook({
        ...currentBook,
        lastReadPosition: position,
        lastReadChapter: chapterIndex !== undefined ? chapterIndex : currentBook.lastReadChapter,
        lastReadTime: now
      });
    }
  };

  // 渲染书籍封面
  const renderCover = (book: Book) => {
    const defaultCover = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: token.colorFillSecondary,
          color: token.colorTextQuaternary,
          fontSize: '32px'
        }}
      >
        <BookOutlined />
      </div>
    );

    if (!book.cover) {
      return defaultCover;
    }

    return (
      <img
        src={book.cover}
        alt={book.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.appendChild(
            document.createTextNode('')
          );
          e.currentTarget.parentElement!.style.backgroundColor = token.colorFillSecondary;
          e.currentTarget.parentElement!.style.display = 'flex';
          e.currentTarget.parentElement!.style.alignItems = 'center';
          e.currentTarget.parentElement!.style.justifyContent = 'center';
          const icon = document.createElement('span');
          icon.className = 'anticon anticon-book';
          icon.style.fontSize = '32px';
          icon.style.color = '#999';
          e.currentTarget.parentElement!.appendChild(icon);
        }}
      />
    );
  };

  // 获取书籍格式图标
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'txt':
        return <FileOutlined />;
      case 'epub':
        return <BookOutlined />;
      case 'mobi':
        return <BookOutlined />;
      case 'online':
        return <GlobalOutlined />;
      default:
        return <FileOutlined />;
    }
  };

  // 格式化时间到时分秒
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // 紧急模式切换函数
  const activatePanicMode = () => {
    // 如果正在阅读，先关闭阅读器
    if (isReaderVisible) {
      setIsReaderVisible(false);
    }

    // 关闭所有可能打开的抽屉和模态框
    setIsSettingsVisible(false);
    setIsChapterListVisible(false);
    setIsSearchVisible(false);
    setIsImportModalVisible(false);

    // 切换到学习模式
    if (!isStudyMode) {
      setIsStudyMode(true);
      localStorage.setItem("fish-reader-study-mode", "true");
    }

    // 显示提示信息
    message.success('已切换到工作模式');
  };

  // 添加键盘事件监听 - 紧急切换功能
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下了设置的紧急切换键
      if (e.code === readerSettings.panicKey) {
        activatePanicMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [readerSettings.panicKey, isReaderVisible, isStudyMode]);

  const bookCardShadow = token.boxShadowTertiary;
  const bookCardShadowHover = token.boxShadowSecondary;

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: token.colorBgContainer,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isStudyMode ? (
            <ReadOutlined style={{ fontSize: 24, color: token.colorPrimary, marginRight: 8 }} />
          ) : (
            <BookOutlined style={{ fontSize: 24, color: token.colorPrimary, marginRight: 8 }} />
          )}
          <Title style={{ color: token.colorText, margin: 0 }} level={4}>
            {isStudyMode ? '努力学习' : '摸鱼阅读'}
          </Title>
        </div>
        <Space>
          {/* 添加悬浮阅读模式切换 */}
          <Tooltip title={floatingModeEnabled ? "悬浮窗阅读模式已开启" : "开启悬浮窗阅读模式"}>
            <Badge dot={isReaderVisible && floatingModeEnabled} offset={[-5, 5]}>
              <Button
                type={floatingModeEnabled ? "primary" : "text"}
                icon={<PushpinOutlined />}
                onClick={() => setFloatingModeEnabled(!floatingModeEnabled)}
              />
            </Badge>
          </Tooltip>
          <Tooltip title={isStudyMode ? "切换到摸鱼模式" : "切换到学习模式"}>
            <Button
              type="text"
              icon={isStudyMode ? <BookOutlined /> : <LaptopOutlined />}
              onClick={toggleStudyMode}
            />
          </Tooltip>
          <Button type="text" icon={<SettingOutlined />} onClick={openSettings}>
            设置
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: isMobile ? "12px" : "24px" }}>
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <Title level={4} style={{ fontSize: isMobile ? "18px" : "20px", margin: 0 }}>
              {isStudyMode ? <ReadOutlined /> : <BookOutlined />} {isStudyMode ? '学习心得' : '我的书架'}
            </Title>
            <Space>
              <Tooltip title="悬浮窗阅读模式">
                <Switch
                  checked={floatingModeEnabled}
                  onChange={setFloatingModeEnabled}
                  checkedChildren="悬浮"
                  unCheckedChildren="页内"
                />
              </Tooltip>
            </Space>
          </div>

          <Divider />

          {/* 如果是学习模式，显示学习模式内容，否则显示书架 */}
          {isStudyMode ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <img
                src="https://pic1.imgdb.cn/item/680a1eb158cb8da5c8c90187.jpg"
                alt="学习图片"
                style={{ width: '150px', marginBottom: '20px' }}
              />
              <Typography.Paragraph style={{ fontSize: '16px' }}>
                正在专注工作中，请勿打扰...
              </Typography.Paragraph>
              <Typography.Paragraph type="secondary">
                今日工作目标：按时完成产品需求，保证产出
              </Typography.Paragraph>
            </div>
          ) : (
            books.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: '12px'
              }}>
                {/* 添加书籍按钮卡片 */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    transform: 'translateY(0)',
                    backgroundColor: token.colorBgContainer,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: bookCardShadow,
                    height: '100%',
                    border: `2px dashed ${token.colorBorder}`,
                    minHeight: '120px'
                  }}
                  onClick={showImportModal}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = bookCardShadowHover;
                    e.currentTarget.style.borderColor = token.colorPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = bookCardShadow;
                    e.currentTarget.style.borderColor = token.colorBorder;
                  }}
                >
                  <PlusOutlined style={{ fontSize: '32px', color: token.colorPrimary, marginBottom: '8px' }} />
                  <div style={{ fontSize: '14px', color: token.colorTextSecondary }}>搜索书籍</div>
                </div>

                {books.map(book => (
                  <div
                    key={book.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      transform: 'translateY(0)',
                      backgroundColor: token.colorBgContainer,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: bookCardShadow,
                      height: '100%',
                      position: 'relative',
                      padding: '16px'
                    }}
                    onClick={() => openReader(book)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = bookCardShadowHover;
                      // 显示操作按钮
                      const actionButtons = e.currentTarget.querySelector('.book-action-buttons');
                      if (actionButtons) {
                        (actionButtons as HTMLElement).style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = bookCardShadow;
                      // 隐藏操作按钮
                      const actionButtons = e.currentTarget.querySelector('.book-action-buttons');
                      if (actionButtons) {
                        (actionButtons as HTMLElement).style.opacity = '0';
                      }
                    }}
                  >
                    {/* 悬浮操作按钮 */}
                    <div
                      className="book-action-buttons"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        zIndex: 2,
                        display: 'flex',
                        gap: '8px',
                        opacity: 0,
                        transition: 'opacity 0.3s',
                      }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<BarsOutlined />}
                        onClick={(e) => openChapterList(book, e)}
                        title="章节跳转"
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => handleDeleteBook(book.id, e)}
                        title="删除小说"
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ marginRight: '8px' }}>
                        {getFormatIcon(book.format)}
                      </div>
                      <Tag color="blue">
                        {book.format.toUpperCase()}
                      </Tag>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                        color: token.colorText,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4'
                      }}>
                        {book.title}
                      </div>
                      {book.author && (
                        <div style={{
                          fontSize: '12px',
                          color: token.colorTextSecondary,
                          marginBottom: '8px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          作者: {book.author}
                        </div>
                      )}
                      {book.lastReadTime && (
                        <div style={{
                          fontSize: '12px',
                          color: token.colorTextDescription
                        }}>
                          上次阅读: {formatTime(book.lastReadTime)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description={
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '8px', color: token.colorTextSecondary }}>你的书架空空如也～</p>
                    <Button type="primary" onClick={showImportModal}>
                      <PlusOutlined /> 搜索书籍
                    </Button>
                  </div>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '40px 0' }}
              />
            )
          )}
        </Card>
      </Content>

      {/* 导入书籍模态框 */}
      <Modal
        title="搜索书籍"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsImportModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <BookImport
          onAddLocalBook={handleAddLocalBook}
          onAddOnlineBook={handleAddOnlineBook}
        />
      </Modal>

      {/* 阅读器设置抽屉 */}
      <Drawer
        title="阅读器设置"
        placement="right"
        width={400}
        onClose={() => setIsSettingsVisible(false)}
        open={isSettingsVisible}
      >
        <ReaderSettingsPanel
          settings={readerSettings}
          onSave={saveSettings}
        />
      </Drawer>

      {/* 章节列表抽屉 */}
      <Drawer
        title="章节列表"
        placement="right"
        width={400}
        onClose={() => setIsChapterListVisible(false)}
        open={isChapterListVisible}
        zIndex={1003}
      >
        {currentBook && (
          <ChapterList
            book={currentBook}
            onChapterSelect={handleChapterSelect}
            settings={readerSettings}
          />
        )}
      </Drawer>

      {/* 搜索内容抽屉 */}
      <Drawer
        title="搜索内容"
        placement="right"
        width={400}
        onClose={() => setIsSearchVisible(false)}
        open={isSearchVisible}
        zIndex={1003}
      >
        {currentBook && currentBook.source === 'local' && (
          <BookSearch
            book={currentBook}
            onSearch={handleSearch}
            onSearchResultSelect={handleSearchResultSelect}
            results={searchResults}
          />
        )}
      </Drawer>

      {/* 直接渲染阅读器，而不是放在抽屉中 */}
      {isReaderVisible && currentBook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1002,
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1010
          }}>
            <Tooltip title="章节列表">
              <Button
                type="primary"
                shape="circle"
                icon={<BarsOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentBook) openChapterList(currentBook);
                }}
                style={{ marginRight: 8 }}
              />
            </Tooltip>
            <Tooltip title="紧急切换到工作模式">
              <Button
                type="primary"
                danger
                shape="circle"
                icon={<LaptopOutlined />}
                onClick={activatePanicMode}
                style={{ marginRight: 8 }}
                title="紧急切换到工作模式"
              />
            </Tooltip>
            <Tooltip title="关闭阅读器">
              <Button
                type="primary"
                danger
                shape="circle"
                icon={<DeleteOutlined />}
                onClick={() => {
                  setIsReaderVisible(false);
                }}
              />
            </Tooltip>
          </div>
          <BookReader
            key={`book-reader-${currentBook.id}`}
            book={currentBook}
            settings={readerSettings}
            onProgressUpdate={(position, chapterIndex) =>
              updateReadingProgress(currentBook.id, position, chapterIndex)
            }
            onOpenChapterList={() => openChapterList(currentBook)}
          />
        </div>
      )}
    </Layout>
  );
}
