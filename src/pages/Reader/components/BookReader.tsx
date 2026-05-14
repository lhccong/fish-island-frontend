import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { ACCESS_TOKEN } from '@/constants';
import {
  Button,
  Space,
  Slider,
  Typography,
  Spin,
  message,
  Popover,
  Tooltip,
  InputNumber,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  MenuOutlined,
  ReloadOutlined,
  ArrowsAltOutlined,
  FontSizeOutlined,
  ColumnWidthOutlined,
  VerticalAlignBottomOutlined,
  EyeOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// 全局常量
const API_URLS = {
  CHAPTER_LIST: `/getChapterList`,
  BOOK_CONTENT: `/getBookContent`
};

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
  accessToken?: string; // 添加accessToken字段
  apiBaseUrl?: string; // 添加apiBaseUrl字段
  readerPosition?: { x: number; y: number }; // 添加阅读器位置信息
}

interface BookReaderProps {
  book: Book;
  settings: ReaderSettings;
  onProgressUpdate: (position: number, chapterIndex?: number) => void;
  onOpenChapterList: () => void;
}

const BookReader: React.FC<BookReaderProps> = ({
  book,
  settings,
  onProgressUpdate,
  onOpenChapterList
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [progress] = useState(0);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isReaderVisible, setIsReaderVisible] = useState(true);
  const [isMovable, setIsMovable] = useState(true);
  const [currentChapterIndex, setcurrentChapterIndex] = useState(book.lastReadChapter || 0);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [localFontSize, setLocalFontSize] = useState(settings.fontSize);
  const [refreshDisabled, setRefreshDisabled] = useState(false);
  const [lastApiCallTime, setLastApiCallTime] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // 添加本地透明度状态
  const [localOpacity, setLocalOpacity] = useState(settings.opacity);
  // 添加阅读器尺寸状态
  const [readerWidth, setReaderWidth] = useState(800);
  const [readerHeight, setReaderHeight] = useState(600);
  // 添加阅读器位置状态
  const [readerPosition, setReaderPosition] = useState({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 });
  // 添加状态跟踪工具栏是否应该隐藏
  const [toolbarHidden, setToolbarHidden] = useState(false);
  // 添加引用跟踪工具栏
  const toolbarRef = useRef<HTMLDivElement>(null);
  // 添加状态记录拖动模式 - 扩展为更多方向
  const [resizeMode, setResizeMode] = useState<'none' | 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'>('none');

  // 使用引用追踪正在加载的章节ID
  const loadingChapterIndexRef = useRef<number | null>(null);
  // 添加新的ref用于追踪加载状态，防止重复加载
  const lastLoadingRef = useRef<{ time: number, chapterIndex: number }>({ time: 0, chapterIndex: 0 });
  // 添加防抖ref用于章节切换
  const chapterChangeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const readerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mouseDownRef = useRef<{ x: number; y: number; width?: number; height?: number } | null>(null);
  const continuousPageTurnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // 添加鼠标移动防抖
  const mouseMoveThrottleRef = useRef<number>(0);
  // 添加工具栏显示超时
  const toolbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 保存阅读器位置和大小
  const saveReaderSettings = useCallback(() => {
    const settings = {
      width: readerWidth,
      height: readerHeight,
      position: readerPosition
    };
    // 将位置和大小信息保存到全局设置而不是以书籍ID为键
    localStorage.setItem(`fish-reader-window-settings`, JSON.stringify(settings));
  }, [readerWidth, readerHeight, readerPosition]);

  // 组件初始化时重置所有状态（确保不同书籍之间的数据隔离）
  useEffect(() => {
    // 确保组件初始化时重置状态

    // 重置加载状态
    loadingChapterIndexRef.current = null;
    lastLoadingRef.current = { time: 0, chapterIndex: 0 };

    // 设置章节索引为书籍的lastReadChapter
    setcurrentChapterIndex(book.lastReadChapter || 0);

    // 检查书籍章节列表状态
    if (book.chapters && book.chapters.length > 0) {

      // 如果有章节列表，找到上次阅读的章节
      const currentChapterIdx = currentChapterIndex || book.lastReadChapter || 0;
      const chapter = book.chapters.find(c => c.index === currentChapterIdx);

      if (chapter) {

        setCurrentChapter(chapter);
      } else {

        setCurrentChapter(book.chapters[0]);
      }
    } else {

      setCurrentChapter(null);
    }

    // 尝试从本地存储加载阅读器位置和大小（全局设置）
    const savedReaderSettings = localStorage.getItem(`fish-reader-window-settings`);
    if (savedReaderSettings) {
      try {
        const { width, height, position } = JSON.parse(savedReaderSettings);
        if (width && height && position) {


          // 确保恢复的位置在当前屏幕可见区域内
          const safeX = Math.min(Math.max(0, position.x), window.innerWidth - width);
          const safeY = Math.min(Math.max(0, position.y), window.innerHeight - height);

          setReaderWidth(width);
          setReaderHeight(height);
          setReaderPosition({ x: safeX, y: safeY });

          if (readerRef.current) {
            readerRef.current.style.width = `${width}px`;
            readerRef.current.style.height = `${height}px`;
            readerRef.current.style.transform = `translate(${safeX}px, ${safeY}px)`;
          }

          return; // 已恢复设置，无需执行后续的默认位置计算
        }
      } catch (error) {
        console.error('解析保存的阅读器设置失败:', error);
      }
    }

    // 如果没有保存的设置或恢复失败，初始化阅读器位置到屏幕中央
    const centerX = Math.max(0, (window.innerWidth - readerWidth) / 2);
    const centerY = Math.max(0, (window.innerHeight - readerHeight) / 2);
    setReaderPosition({ x: centerX, y: centerY });

    if (readerRef.current) {
      readerRef.current.style.transform = `translate(${centerX}px, ${centerY}px)`;
    }

    return () => {
      // 组件卸载时清理所有状态和计时器

      loadingChapterIndexRef.current = null;
      if (chapterChangeDebounceRef.current) {
        clearTimeout(chapterChangeDebounceRef.current);
      }
      if (continuousPageTurnIntervalRef.current) {
        clearInterval(continuousPageTurnIntervalRef.current);
      }
    };
  }, [book.id, book.lastReadChapter]);

  // 监听book.lastReadChapter的变化，确保章节切换时正确更新
  useEffect(() => {


    // 如果book.lastReadChapter和currentChapterIndex不一致，说明是从外部触发的章节变更（如章节列表点击）
    if (book.lastReadChapter !== undefined && book.lastReadChapter !== currentChapterIndex) {


      // 更新当前章节索引
      setcurrentChapterIndex(book.lastReadChapter);

      // 查找对应的章节对象
      if (book.chapters && book.chapters.length > 0) {
        const chapter = book.chapters.find(c => c.index === book.lastReadChapter);
        if (chapter) {

          setCurrentChapter(chapter);

          // 如果章节已有内容，直接更新显示
          if (chapter.content) {

            setLoading(false);
            setContent(chapter.content);
          } else {
            // 否则会触发loadContent重新加载

            // 重置滚动位置
            if (contentRef.current) {
              contentRef.current.scrollTop = 0;
            }
          }
        }
      }
    }
  }, [book.lastReadChapter, currentChapterIndex, book.chapters]);

  // 加载书籍内容
  useEffect(() => {
    const loadContent = async () => {
      // 避免重复加载，但仅在真正加载时才设置loading状态
      if (loadingChapterIndexRef.current === currentChapterIndex) {

        return;
      }



      // 记录本次加载发起的时间和章节ID
      const currentLoadingTime = Date.now();
      const currentLoadingChapterIndex = currentChapterIndex;

      // 使用ref保存当前加载信息，用于后续判断是否为最新加载请求
      lastLoadingRef.current = { time: currentLoadingTime, chapterIndex: currentLoadingChapterIndex };
      loadingChapterIndexRef.current = currentChapterIndex;

      setLoading(true);

      try {
        // 延迟50ms检查是否有更新的加载请求
        await new Promise(resolve => setTimeout(resolve, 50));

        // 如果此时最后的加载请求不是当前这个，说明有更新的请求，放弃当前加载
        if (lastLoadingRef.current.time !== currentLoadingTime ||
          lastLoadingRef.current.chapterIndex !== currentLoadingChapterIndex) {

          return;
        }

        if (book.chapters && book.chapters.length > 0) {
          // 找到当前章节
          const chapter = book.chapters.find(c => c.index === currentChapterIndex);

          if (chapter) {
            setCurrentChapter(chapter);


            if (chapter.content) {
              // 已有缓存内容直接使用

              setContent(chapter.content);
              // 更新阅读进度
              onProgressUpdate(0, currentChapterIndex);
            } else if (book.source === 'online' && book.url) {
              // 需要从网络加载内容


              // 检查localStorage中是否有缓存
              const savedBooks = localStorage.getItem("fish-reader-books");
              let cachedContent = '';

              if (savedBooks) {
                const books = JSON.parse(savedBooks);
                const savedBook = books.find((b: Book) => b.id === book.id);
                if (savedBook && savedBook.chapters) {
                  const savedChapter = savedBook.chapters.find((c: Chapter) => c.index === currentChapterIndex);
                  if (savedChapter && savedChapter.content) {

                    cachedContent = savedChapter.content;
                  }
                }
              }

              if (cachedContent) {
                // 使用localStorage中的缓存内容

                setContent(cachedContent);
                // 更新当前章节对象的内容（内存中）
                chapter.content = cachedContent;
                // 更新阅读进度
                onProgressUpdate(0, currentChapterIndex);
              } else {
                // 从API加载章节内容

                // 加载章节内容
                const chapterContent = await loadOnlineChapterContent(book, chapter);
                if (chapterContent) {

                  setContent(chapterContent);
                  // 保存章节内容到缓存
                  updateChapterContent(currentChapterIndex, chapterContent);
                  // 更新阅读进度
                  onProgressUpdate(0, currentChapterIndex);
                } else {
                  setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新或者重新进入阅读</p>');
                  message.error('章节内容获取失败');
                }
              }
            }
          } else {

            setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">未找到章节信息，请尝试刷新章节列表</p>');
            message.error('未找到章节信息');
          }
        } else if (book.source === 'online' && book.url) {
          // 尝试先加载章节列表

          const chapters = await loadOnlineChapters(book);

          if (chapters && chapters.length > 0) {
            // 更新书籍的章节列表
            const updatedBook = { ...book, chapters };
            updateBookInStorage(updatedBook);

            // 加载第一章内容
            const firstChapter = chapters[0];
            setCurrentChapter(firstChapter);

            if (currentChapterIndex > 0 && currentChapterIndex <= chapters.length) {
              // 尝试加载上次阅读的章节
              const savedChapter = chapters.find((c: Chapter) => c.index === currentChapterIndex);
              if (savedChapter) {
                setCurrentChapter(savedChapter);

                // 检查localStorage中是否有缓存
                const savedBooks = localStorage.getItem("fish-reader-books");
                let cachedContent = '';

                if (savedBooks) {
                  const books = JSON.parse(savedBooks);
                  const savedBook = books.find((b: Book) => b.id === book.id);
                  if (savedBook && savedBook.chapters) {
                    const savedChapter = savedBook.chapters.find((c: Chapter) => c.index === currentChapterIndex);
                    if (savedChapter && savedChapter.content) {

                      cachedContent = savedChapter.content;
                    }
                  }
                }

                if (cachedContent) {
                  // 使用localStorage中的缓存内容

                  setContent(cachedContent);
                  // 更新阅读进度
                  onProgressUpdate(0, currentChapterIndex);
                } else {
                  const chapterContent = await loadOnlineChapterContent(book, savedChapter);
                  if (chapterContent) {

                    setContent(chapterContent);
                    // 保存章节内容到缓存
                    updateChapterContent(currentChapterIndex, chapterContent);
                    // 更新阅读进度
                    onProgressUpdate(0, currentChapterIndex);
                  } else {
                    setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新或者重新进入阅读</p>');
                    message.error('章节内容获取失败');
                  }
                }
                return;
              }
            }

            // 如果没有找到上次阅读的章节或者是第一次阅读，加载第一章内容
            const chapterContent = await loadOnlineChapterContent(book, firstChapter);
            if (chapterContent) {
              setContent(chapterContent);
              // 保存章节内容到缓存
              updateChapterContent(firstChapter.index, chapterContent);
              // 更新章节索引
              setcurrentChapterIndex(firstChapter.index);
              // 更新阅读进度
              onProgressUpdate(0, firstChapter.index);
            } else {
              setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新或者重新进入阅读</p>');
              message.error('章节内容获取失败');
            }
          } else {
            setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节列表加载失败，请尝试刷新或重新进入</p>');
            message.error('章节列表加载失败');
          }
        } else {
          setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">书籍内容加载失败，请检查书籍信息是否完整</p>');
          message.error('书籍内容加载失败');
        }
      } catch (error) {
        console.error('加载章节内容失败:', error);
        setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">加载失败，请稍后重试</p>');
        message.error('加载章节内容失败，请重试');
      } finally {
        setLoading(false);
        //不要在这里重置loadingChapterIndexRef，避免重复加载的问题
      }
    };

    // 使用延迟执行，避免在快速切换章节时重复加载
    setTimeout(() => {
      loadContent();
    }, 150);

  }, [book.id, currentChapterIndex]); // 在书籍ID或章节索引变化时重新加载

  // 加载在线章节列表
  const loadOnlineChapters = async (book: Book, refresh: boolean = false) => {
    if (!book || !book.source || !book.sourceInfo || !book.sourceInfo.url) {
      console.error('书籍信息不完整，无法加载章节列表');
      message.error('书籍信息不完整，无法加载章节列表');
      return [];
    }

    try {
      const timestamp = new Date().getTime();
      // 从设置中获取accessToken和apiBaseUrl
      const accessToken = ACCESS_TOKEN;
      const apiBaseUrl = settings.apiBaseUrl || 'https://reader.yucoder.cn/reader3'; // 默认值作为后备
      const apiUrl = `${apiBaseUrl}${API_URLS.CHAPTER_LIST}?accessToken=${accessToken}&v=${timestamp}`;




      const response = await axios.post(apiUrl, {
        url: book.url || book.sourceInfo.url,
        refresh: refresh ? 1 : 0,
        bookSourceUrl: book.sourceInfo.url
      });

      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const chapters = response.data.data;
        // 更新书籍章节列表
        if (chapters.length > 0) {
          // 确保更新书籍的chapters字段
          book.chapters = chapters;

          const updatedBook = { ...book, chapters };
          updateBookInStorage(updatedBook);


          return chapters;
        } else {
          console.warn('获取到空章节列表');
          message.warning('获取到空章节列表，请检查书籍信息或稍后重试');
          return [];
        }
      } else {
        console.error('章节列表数据格式不正确', response.data);
        message.error('章节列表数据格式不正确，请稍后重试');
        return [];
      }
    } catch (error) {
      console.error('加载章节列表失败:', error);
      message.error('加载章节列表失败，请检查网络连接或稍后重试');
      return [];
    }
  };

  // 加载在线章节内容
  const loadOnlineChapterContent = async (book: Book, chapter: Chapter) => {
    if (!book || !book.source || !chapter || !chapter.url) {
      console.error('书籍或章节信息不完整，无法加载内容');
      message.error('书籍或章节信息不完整，无法加载内容');
      return '';
    }

    try {
      const timestamp = new Date().getTime();
      const accessToken = ACCESS_TOKEN;
      const apiBaseUrl = settings.apiBaseUrl || 'https://reader.yucoder.cn/reader3';
      const apiUrl = `${apiBaseUrl}${API_URLS.BOOK_CONTENT}?accessToken=${accessToken}&v=${timestamp}`;

      const response = await axios.post(apiUrl, {
        url: book.url,
        index: chapter.index
      });

      if (response.data && response.data.data) {
        const content = response.data.data || '';

        // 确保book.chapters已经初始化
        if (!book.chapters) {
          book.chapters = [];
        }

        // 立即更新章节内容到缓存
        updateChapterContent(chapter.index, content);

        // 强制同步更新章节内容到内存中的章节对象
        if (book.chapters) {
          const chapterToUpdate = book.chapters.find(c => c.index === chapter.index);
          if (chapterToUpdate) {
            chapterToUpdate.content = content;
          }
        }

        return content;
      } else {
        console.error('章节内容数据格式不正确', response.data);
        message.error('章节内容数据格式不正确，请稍后重试');
        return '';
      }
    } catch (error) {
      console.error('加载章节内容失败', error);
      message.error('加载章节内容失败，请检查网络连接或稍后重试');
      return '';
    }
  };

  // 更新本地存储中的书籍信息
  const updateBookInStorage = (updatedBook: Book) => {
    try {



      const savedBooks = localStorage.getItem("fish-reader-books");
      let books = [];

      if (savedBooks) {
        books = JSON.parse(savedBooks);
        // 查找是否已有该书籍
        const existingBookIndex = books.findIndex((b: Book) => b.id === updatedBook.id);

        if (existingBookIndex >= 0) {
          // 更新现有书籍
          books[existingBookIndex] = updatedBook;

        } else {
          // 添加新书籍
          books.push(updatedBook);

        }
      } else {
        // 没有保存的书籍，创建新数组
        books = [updatedBook];

      }

      // 保存到localStorage
      localStorage.setItem("fish-reader-books", JSON.stringify(books));


      // 检查保存后的结果
      const checkSavedBooks = localStorage.getItem("fish-reader-books");
      if (checkSavedBooks) {
        const parsedBooks = JSON.parse(checkSavedBooks);
        const savedBook = parsedBooks.find((b: Book) => b.id === updatedBook.id);
        if (savedBook) {

          if (savedBook.chapters && savedBook.chapters.length > 0) {
            const savedChapter = savedBook.chapters.find((c: Chapter) => c.index === (updatedBook.lastReadChapter || 0));
            if (savedChapter) {

            }
          }
        }
      }
    } catch (error) {
      console.error('更新本地存储失败:', error);
    }
  };

  // 更新章节内容
  const updateChapterContent = (chapterIndex: number, chapterContent: string) => {
    try {


      // 确保book.chapters已经初始化
      if (!book.chapters) {

        book.chapters = [];
      }

      if (book.chapters.length === 0) {
        console.error('章节列表为空，无法更新章节内容');
        return;
      }

      // 创建章节的深拷贝，避免直接修改原章节对象
      const updatedChapters = book.chapters.map(chapter => {
        if (chapter.index === chapterIndex) {

          return { ...chapter, content: chapterContent };
        }
        return chapter;
      });

      // 更新内存中的book对象
      book.chapters = updatedChapters;
      book.lastReadChapter = chapterIndex;

      // 创建新的书籍对象
      const updatedBook = {
        ...book,
        chapters: updatedChapters,
        lastReadChapter: chapterIndex
      };

      // 更新本地内存中的章节内容，供章节列表使用
      if (currentChapter && currentChapter.index === chapterIndex) {
        setCurrentChapter({...currentChapter, content: chapterContent});
      }

      // 确认内容已更新
      const updatedChapter = updatedBook.chapters.find(c => c.index === chapterIndex);


      // 更新本地存储
      updateBookInStorage(updatedBook);

      // 向父组件报告进度更新
      onProgressUpdate(0, chapterIndex);
    } catch (error) {
      console.error('更新章节内容失败:', error);
    }
  };
  // 重置阅读器位置
  const resetReaderPosition = () => {
    if (readerRef.current) {
      const centerX = Math.max(0, (window.innerWidth - readerWidth) / 2);
      const centerY = Math.max(0, (window.innerHeight - readerHeight) / 2);
      setReaderPosition({ x: centerX, y: centerY });
      readerRef.current.style.transform = `translate(${centerX}px, ${centerY}px)`;
    }
  };

  // 自动调整窗口大小的预设
  const sizePresets = [
    { name: '小', width: 600, height: 500 },
    { name: '中', width: 800, height: 600 },
    { name: '大', width: 1000, height: 700 },
    { name: '全屏', width: window.innerWidth - 40, height: window.innerHeight - 40 }
  ];

  // 应用尺寸预设
  const applyPresetSize = (width: number, height: number) => {
    setReaderWidth(width);
    setReaderHeight(height);
    // 居中显示
    if (readerRef.current) {
      // 计算居中位置
      const centerX = Math.max(0, (window.innerWidth - width) / 2);
      const centerY = Math.max(0, (window.innerHeight - height) / 2);
      setReaderPosition({ x: centerX, y: centerY });
      readerRef.current.style.transform = `translate(${centerX}px, ${centerY}px)`;

      // 保存新的尺寸和位置
      setTimeout(() => saveReaderSettings(), 100);
    }
  };

  // 在窗口调整大小时自动适应
  useEffect(() => {
    const handleResize = () => {
      // 如果阅读器宽度已经接近全屏，则重新设置为全屏大小
      if (readerWidth > window.innerWidth - 100) {
        setReaderWidth(window.innerWidth - 40);
      }
      // 如果阅读器高度已经接近全屏，则重新设置为全屏高度
      if (readerHeight > window.innerHeight - 100) {
        setReaderHeight(window.innerHeight - 40);
      }

      // 确保阅读器在视口内
      if (readerRef.current) {
        const rect = readerRef.current.getBoundingClientRect();
        if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
          // 重新定位到可见区域
          const newLeft = Math.min(readerPosition.x, window.innerWidth - readerWidth);
          const newTop = Math.min(readerPosition.y, window.innerHeight - readerHeight);
          setReaderPosition({ x: newLeft, y: newTop });
          readerRef.current.style.transform = `translate(${newLeft}px, ${newTop}px)`;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [readerWidth, readerHeight, readerPosition]);

  // 新的简单拖动函数
  const handleDragStart = useCallback((e: React.MouseEvent<Element, MouseEvent>) => {
    if (!isMovable) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = readerPosition.x;
    const initialY = readerPosition.y;
    let newX = initialX;
    let newY = initialY;
    let rafId: number | null = null;

    const applyDrag = () => {
      if (readerRef.current) {
        readerRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    };

    const handleDragMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      newX = initialX + dx;
      newY = initialY + dy;

      // 使用requestAnimationFrame平滑动画
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(applyDrag);
    };

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';

      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // 只在拖动结束时更新状态
      setReaderPosition({ x: newX, y: newY });

      // 保存位置
      saveReaderSettings();
    };

    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    e.preventDefault();
    e.stopPropagation();
  }, [isMovable, readerPosition, saveReaderSettings]);

  // 新的简单调整大小函数
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (!isMovable) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = readerWidth;
    const initialHeight = readerHeight;
    const initialX = readerPosition.x;
    const initialY = readerPosition.y;
    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newX = initialX;
    let newY = initialY;
    let rafId: number | null = null;

    const applyResize = () => {
      if (readerRef.current) {
        readerRef.current.style.width = `${newWidth}px`;
        readerRef.current.style.height = `${newHeight}px`;
        readerRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    };

    const handleResizeMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (direction.includes('e')) {
        newWidth = Math.max(200, initialWidth + dx);
      }
      if (direction.includes('w')) {
        const widthChange = initialWidth - Math.max(200, initialWidth - dx);
        newWidth = Math.max(200, initialWidth - dx);
        newX = initialX + widthChange;
      }
      if (direction.includes('s')) {
        newHeight = Math.max(150, initialHeight + dy);
      }
      if (direction.includes('n')) {
        const heightChange = initialHeight - Math.max(150, initialHeight - dy);
        newHeight = Math.max(150, initialHeight - dy);
        newY = initialY + heightChange;
      }

      // 使用requestAnimationFrame平滑动画
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(applyResize);
    };

    const handleResizeEnd = () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';

      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // 只在调整结束时更新状态
      setReaderWidth(newWidth);
      setReaderHeight(newHeight);
      setReaderPosition({ x: newX, y: newY });

      // 保存尺寸和位置
      saveReaderSettings();
    };

    let cursor = 'default';
    if (direction === 'e' || direction === 'w') cursor = 'ew-resize';
    else if (direction === 'n' || direction === 's') cursor = 'ns-resize';
    else if (direction === 'ne' || direction === 'sw') cursor = 'nesw-resize';
    else if (direction === 'nw' || direction === 'se') cursor = 'nwse-resize';

    document.body.style.cursor = cursor;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    e.preventDefault();
    e.stopPropagation();
  }, [isMovable, readerWidth, readerHeight, readerPosition, saveReaderSettings]);

  // 滚动处理
  const handleScroll = useCallback(() => {

  }, [currentChapterIndex, onProgressUpdate]);

  // 处理翻页
  const handlePrevPage = () => {
    // 调用上一章功能
    goToPrevChapter();
  };

  const handleNextPage = () => {
    // 调用下一章功能
    goToNextChapter();
  };

  // 切换到前一章
  const goToPrevChapter = () => {
    if (!book.chapters || book.chapters.length === 0 || loading) {
      return;
    }

    // 节流控制：避免短时间内多次切换章节
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    if (timeSinceLastCall < 800) {
      return;
    }

    // 清除之前的防抖计时器
    if (chapterChangeDebounceRef.current) {
      clearTimeout(chapterChangeDebounceRef.current);
    }

    // 使用防抖技术，延迟执行实际的章节切换
    chapterChangeDebounceRef.current = setTimeout(() => {
      const prevChapterIndex = currentChapterIndex - 1;
      if (prevChapterIndex >= 0) {
        // 更新最后API调用时间
        setLastApiCallTime(now);

        // 直接切换章节索引
        setcurrentChapterIndex(prevChapterIndex);

        // 从chapters中找出对应章节
        if (book.chapters) {
          const prevChapter = book.chapters.find(c => c.index === prevChapterIndex);
          if (prevChapter) {
            setCurrentChapter(prevChapter);

            // 如果有缓存内容，直接设置
            if (prevChapter.content) {
              setContent(prevChapter.content);
              // 更新阅读进度
              onProgressUpdate(0, prevChapterIndex);
            } else {
              // 否则触发加载
              loadOnlineChapterContent(book, prevChapter).then(content => {
                if (content) {
                  setContent(content);
                  // 保存章节内容到缓存
                  updateChapterContent(prevChapterIndex, content);
                  // 更新阅读进度
                  onProgressUpdate(0, prevChapterIndex);
                } else {
                  console.error('获取上一章内容失败');
                  setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新</p>');
                }
              }).catch(error => {
                console.error('加载上一章内容出错:', error);
                setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">加载章节内容出错，请重试</p>');
              });
            }
          } else {
            console.error(`未找到上一章节，索引: ${prevChapterIndex}`);
          }
        }

        // 滚动到顶部
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      } else {
        message.info('已经是第一章了');
      }

      chapterChangeDebounceRef.current = null;
    }, 50);
  };

  // 切换到下一章
  const goToNextChapter = () => {
    if (!book.chapters || book.chapters.length === 0 || loading) {
      return;
    }

    // 节流控制：避免短时间内多次切换章节
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    if (timeSinceLastCall < 800) {
      return;
    }

    // 清除之前的防抖计时器
    if (chapterChangeDebounceRef.current) {
      clearTimeout(chapterChangeDebounceRef.current);
    }

    // 使用防抖技术，延迟执行实际的章节切换
    chapterChangeDebounceRef.current = setTimeout(() => {
      const nextChapterIndex = currentChapterIndex + 1;
      if (book.chapters && nextChapterIndex < book.chapters.length) {
        // 更新最后API调用时间
        setLastApiCallTime(now);

        // 直接切换章节索引
        setcurrentChapterIndex(nextChapterIndex);

        // 从chapters中找出对应章节
        const nextChapter = book.chapters.find(c => c.index === nextChapterIndex);
        if (nextChapter) {
          setCurrentChapter(nextChapter);

          // 如果有缓存内容，直接设置
          if (nextChapter.content) {
            setContent(nextChapter.content);
            // 更新阅读进度
            onProgressUpdate(0, nextChapterIndex);
          } else {
            // 否则触发加载
            loadOnlineChapterContent(book, nextChapter).then(content => {
              if (content) {
                setContent(content);
                // 保存章节内容到缓存
                updateChapterContent(nextChapterIndex, content);
                // 更新阅读进度
                onProgressUpdate(0, nextChapterIndex);
              } else {
                console.error('获取下一章内容失败');
                setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新</p>');
              }
            }).catch(error => {
              console.error('加载下一章内容出错:', error);
              setContent('<p style="color: #ff4d4f; text-align: center; padding: 20px;">加载章节内容出错，请重试</p>');
            });
          }
        } else {
          console.error(`未找到下一章节，索引: ${nextChapterIndex}`);
        }

        // 滚动到顶部
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      } else {
        message.info('已经是最后一章了');
      }

      chapterChangeDebounceRef.current = null;
    }, 50);
  };

  // 刷新当前章节内容
  const refreshCurrentChapter = async () => {
    if (!currentChapter) {
      console.error('没有当前章节，无法刷新');
      message.error('没有当前章节，无法刷新');
      return;
    }


    setRefreshing(true);
    setLoading(true);

    try {
      // 只刷新当前章节内容，不刷新章节列表
      const freshContent = await loadOnlineChapterContent(book, currentChapter);

      if (freshContent) {

        message.success('章节内容已刷新');

        // 更新章节内容
        setContent(freshContent);
      } else {
        // console.error('刷新章节内容失败，返回内容为空');
        message.error('刷新章节内容失败，请稍后重试');
      }
    } catch (error) {
      console.error('刷新章节内容时出错:', error);
      message.error('刷新章节内容时出错，请稍后重试');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // 优化鼠标点击事件处理
  const handleMouseClick = (e: React.MouseEvent) => {
    // 检查是否在拖动状态
    if (document.body.style.cursor === 'grabbing') {
      return;
    }

    // 左键点击
    if (e.button === 0) {
      if (toolbarHidden) {
        // 如果工具栏已经隐藏，则显示工具栏
        setToolbarHidden(false);
        setIsToolbarVisible(true);
        // 设置自动隐藏定时器
        if (toolbarTimeoutRef.current) {
          clearTimeout(toolbarTimeoutRef.current);
        }
        toolbarTimeoutRef.current = setTimeout(() => {
          setIsToolbarVisible(false);
          setToolbarHidden(true);
        }, 3000);
      } else {
        // 如果工具栏已显示，则切换显示状态
        setIsToolbarVisible(!isToolbarVisible);

        // 当主动隐藏工具栏时，记录状态
        if (isToolbarVisible) {
          setToolbarHidden(true);
        }
      }
    }
  };

  // 修改键盘处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否匹配设置的按键
      if (e.code === settings.prevPageKey) {
        handlePrevPage();
      } else if (e.code === settings.nextPageKey) {
        handleNextPage();
      }

      // 快速隐藏功能 - 按键模式
      if (settings.quickHide === 'key' && e.code === 'Escape') {
        setIsReaderVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [settings, handlePrevPage, handleNextPage]);

  // 在窗口调整大小时保证阅读器在视口内
  useEffect(() => {
    const handleWindowResize = () => {
      if (readerRef.current) {
        // 检查是否超出视口
        const rect = readerRef.current.getBoundingClientRect();
        let needUpdate = false;
        let newX = readerPosition.x;
        let newY = readerPosition.y;

        // 如果超出右边界
        if (rect.right > window.innerWidth) {
          newX = Math.max(0, window.innerWidth - readerWidth);
          needUpdate = true;
        }

        // 如果超出下边界
        if (rect.bottom > window.innerHeight) {
          newY = Math.max(0, window.innerHeight - readerHeight);
          needUpdate = true;
        }

        // 如果阅读器完全超出视口，重置到中央
        if (rect.left > window.innerWidth || rect.top > window.innerHeight) {
          resetReaderPosition();
          return;
        }

        // 更新位置
        if (needUpdate) {
          setReaderPosition({ x: newX, y: newY });
          readerRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        }
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [readerWidth, readerHeight, readerPosition, resetReaderPosition]);

  // 当阅读器位置或大小变化时保存
  useEffect(() => {
    // 延迟保存，避免在初始化时就触发保存
    const timerId = setTimeout(() => {
      saveReaderSettings();
    }, 500);

    return () => clearTimeout(timerId);
  }, [readerWidth, readerHeight, readerPosition, saveReaderSettings]);

  // 监听settings属性变化，立即更新阅读器样式
  useEffect(() => {
    if (contentRef.current) {
      // 应用字体颜色和背景颜色设置
      contentRef.current.style.color = settings.fontColor;
      contentRef.current.style.backgroundColor = settings.backgroundColor;
      contentRef.current.style.fontSize = `${localFontSize}px`;
      contentRef.current.style.fontFamily = settings.fontFamily;
    }

    // 应用透明度设置
    setLocalOpacity(settings.opacity);

    // 设置是否可移动
    setIsMovable(settings.allowWindowMove);

  }, [settings, localFontSize]);

  // 当本地字体大小或透明度变化时，更新全局设置
  useEffect(() => {
    // 只有当用户手动调整后才保存设置
    if (localFontSize !== settings.fontSize || localOpacity !== settings.opacity) {
      const updatedSettings = {
        ...settings,
        fontSize: localFontSize,
        opacity: localOpacity
      };

      // 保存到本地存储
      localStorage.setItem("fish-reader-settings", JSON.stringify(updatedSettings));

      // 这里不调用onProgressUpdate等回调，避免不必要的重新渲染
      // 设置已经保存到localStorage，下次打开时会自动加载
    }
  }, [localFontSize, localOpacity, settings]);

  // 初始化状态时确保使用settings中的值
  useEffect(() => {
    setLocalFontSize(settings.fontSize);
    setLocalOpacity(settings.opacity);
    setIsMovable(settings.allowWindowMove);
  }, [settings.fontSize, settings.opacity, settings.allowWindowMove]);

  // 添加字体列表
  const fontOptions = [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: '黑体', value: 'SimHei, sans-serif' },
    { label: '宋体', value: 'SimSun, serif' },
    { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
    { label: '楷体', value: 'KaiTi, serif' },
    { label: '仿宋', value: 'FangSong, serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
  ];

  // 在工具栏中添加当前字体名称的函数
  const getCurrentFontName = (fontFamily: string) => {
    const font = fontOptions.find(option => option.value === fontFamily);
    return font ? font.label : '黑体';
  };

  return (
    <div
      ref={readerRef}
      style={{
        display: isReaderVisible ? 'block' : 'none',
        position: 'fixed', // 改为固定定位，防止滚动影响位置
        width: `${readerWidth}px`,
        height: `${readerHeight}px`,
        maxWidth: '100%',
        margin: '0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'opacity 0.3s',
        opacity: localOpacity,
        backgroundColor: settings.backgroundColor,
        color: settings.fontColor,
        cursor: isMovable ? 'grab' : 'default',
        transform: `translate(${readerPosition.x}px, ${readerPosition.y}px)`,
        zIndex: 1000,
      }}
      onMouseDown={handleDragStart}
    >
      {/* 阅读器工具栏 */}
      <div
        ref={toolbarRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: `${settings.backgroundColor}dd`,
          backdropFilter: 'blur(4px)',
          zIndex: 10,
          transition: 'opacity 0.3s',
          opacity: isToolbarVisible ? 1 : 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          pointerEvents: isToolbarVisible ? 'auto' : 'none',
        }}
      >
        {/* 顶部拖动把手 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            cursor: isMovable ? 'grab' : 'default',
            backgroundColor: 'transparent'
          }}
          onMouseDown={handleDragStart}
        />

        <Space>
          <Button
            icon={<MenuOutlined />}
            onClick={onOpenChapterList}
            type="text"
          />
          <Tooltip title="刷新章节">
            <Button
              icon={<ReloadOutlined />}
              onClick={refreshCurrentChapter}
              type="text"
              disabled={refreshing}
              loading={loading && refreshing}
            />
          </Tooltip>
          <Tooltip title="重置位置">
            <Button
              icon={<ArrowsAltOutlined />}
              onClick={resetReaderPosition}
              type="text"
              disabled={!isMovable}
            />
          </Tooltip>
        </Space>

        <Text
          strong
          style={{
            fontSize: '16px',
            userSelect: 'none' // 防止文本被选中
          }}
        >
          {currentChapter?.title || book.title}
        </Text>

        <Space>
          <Tooltip title="上一章">
            <Button
              icon={<LeftOutlined />}
              onClick={() => goToPrevChapter()}
              type="text"
              disabled={!book.chapters || book.chapters.length === 0 || currentChapterIndex <= 0 || loading}
            />
          </Tooltip>

          <Tooltip title="下一章">
            <Button
              icon={<RightOutlined />}
              onClick={() => goToNextChapter()}
              type="text"
              disabled={!book.chapters || book.chapters.length === 0 || currentChapterIndex >= (book.chapters.length - 1) || loading}
            />
          </Tooltip>

          <Popover
            content={
              <div style={{ width: '200px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Text>字号调整</Text>
                </div>
                <Slider
                  min={12}
                  max={36}
                  value={localFontSize}
                  onChange={(value) => {
                    setLocalFontSize(value);
                    // 立即应用字体大小
                    if (contentRef.current) {
                      contentRef.current.style.fontSize = `${value}px`;
                    }
                  }}
                />
              </div>
            }
            trigger="click"
            placement="bottom"
          >
            <Button
              icon={<FontSizeOutlined />}
              type="text"
            />
          </Popover>

          {/* 添加字体选择器 */}
          <Popover
            content={
              <div style={{ width: '200px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Text>选择字体</Text>
                </div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fontOptions.map(font => (
                    <Button
                      key={font.value}
                      type={settings.fontFamily === font.value ? "primary" : "default"}
                      size="small"
                      style={{ width: '100%', textAlign: 'left' }}
                      onClick={() => {
                        // 更新全局设置
                        const updatedSettings = {
                          ...settings,
                          fontFamily: font.value
                        };

                        // 保存到本地存储
                        localStorage.setItem("fish-reader-settings", JSON.stringify(updatedSettings));

                        // 应用字体
                        if (contentRef.current) {
                          contentRef.current.style.fontFamily = font.value;
                        }
                      }}
                    >
                      {font.label}
                    </Button>
                  ))}
                </Space>
              </div>
            }
            trigger="click"
            placement="bottom"
          >
            <Button type="text">
              {getCurrentFontName(settings.fontFamily)}
            </Button>
          </Popover>

          <Popover
            content={
              <div style={{ width: '200px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Text>透明度调整</Text>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={localOpacity}
                  onChange={setLocalOpacity}
                />
              </div>
            }
            trigger="click"
            placement="bottom"
          >
            <Button
              icon={<EyeOutlined />}
              type="text"
            />
          </Popover>

          <Popover
            content={
              <div style={{ width: '200px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Text>窗口大小预设</Text>
                </div>
                <Space style={{ marginTop: '8px' }}>
                  {sizePresets.map((preset, index) => (
                    <Button
                      key={index}
                      onClick={() => applyPresetSize(preset.width, preset.height)}
                      size="small"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </Space>
              </div>
            }
            trigger="click"
            placement="bottom"
          >
            <Button
              icon={<ColumnWidthOutlined />}
              type="text"
            />
          </Popover>

          <Tooltip title="窗口可移动">
            <Button
              icon={<ArrowsAltOutlined />}
              type={isMovable ? "primary" : "text"}
              onClick={() => {
                const newValue = !isMovable;
                setIsMovable(newValue);

                // 更新全局设置
                const updatedSettings = {
                  ...settings,
                  allowWindowMove: newValue
                };

                // 保存到本地存储
                localStorage.setItem("fish-reader-settings", JSON.stringify(updatedSettings));
              }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* 阅读进度条 */}
      {/* 已移除显示百分比功能 */}

      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          padding: '24px',
          backgroundColor: settings.backgroundColor,
          opacity: 0.5,
          transition: 'opacity 0.2s ease-in-out'
        }}>
          <Spin tip="正在加载章节内容..." size="large" />
        </div>
      ) : (
        <div
          ref={contentRef}
          style={{
            height: '100%',
            overflow: 'auto',
            padding: '24px',
            paddingTop: '64px', // 为工具栏留出空间
            paddingBottom: '24px',
            fontSize: `${localFontSize}px`,
            lineHeight: '1.5',
            letterSpacing: '0px',
            fontFamily: settings.fontFamily,
            color: settings.fontColor,
            backgroundColor: settings.backgroundColor,
            wordWrap: 'break-word',
            textAlign: 'justify',
            whiteSpace: 'pre-wrap',
            userSelect: 'none', // 防止文本被选中
            scrollBehavior: 'smooth', // 添加平滑滚动效果
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 0.2s ease-in-out'
          }}
          onClick={handleMouseClick}
          onScroll={handleScroll}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}

      {/* 左右翻页按钮 */}
      <div
        style={{
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: isToolbarVisible ? 0.7 : 0,
          transition: 'opacity 0.3s',
          zIndex: 5
        }}
      >
        <Button
          icon={<LeftOutlined />}
          onClick={() => goToPrevChapter()}
          shape="circle"
          size="large"
          disabled={!book.chapters || book.chapters.length === 0 || currentChapterIndex <= 0 || loading}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: isToolbarVisible ? 0.7 : 0,
          transition: 'opacity 0.3s',
          zIndex: 5
        }}
      >
        <Button
          icon={<RightOutlined />}
          onClick={() => goToNextChapter()}
          shape="circle"
          size="large"
          disabled={!book.chapters || book.chapters.length === 0 || currentChapterIndex >= (book.chapters.length - 1) || loading}
        />
      </div>

      {/* 调整大小的8个把手 */}
      {/* 东 - 右侧 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          width: '16px',  // 增加宽度
          height: '100px', // 增加高度
          marginTop: '-50px',
          background: isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'ew-resize',
          zIndex: 10,
          borderRadius: '3px 0 0 3px',
          transition: 'background 0.3s'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'e')}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent'}
      ></div>

      {/* 西 - 左侧 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          width: '16px',  // 增加宽度
          height: '100px', // 增加高度
          marginTop: '-50px',
          background: isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'ew-resize',
          zIndex: 10,
          borderRadius: '0 3px 3px 0',
          transition: 'background 0.3s'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'w')}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent'}
      ></div>

      {/* 南 - 底部 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: '100px', // 增加宽度
          height: '16px',  // 增加高度
          marginLeft: '-50px',
          background: isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'ns-resize',
          zIndex: 10,
          borderRadius: '3px 3px 0 0',
          transition: 'background 0.3s'
        }}
        onMouseDown={(e) => handleResizeStart(e, 's')}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent'}
      ></div>

      {/* 北 - 顶部 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: '100px', // 增加宽度
          height: '16px',  // 增加高度
          marginLeft: '-50px',
          background: isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'ns-resize',
          zIndex: 10,
          borderRadius: '0 0 3px 3px',
          transition: 'background 0.3s'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'n')}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent'}
      ></div>

      {/* 东南 - 右下角 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '24px',  // 增加尺寸
          height: '24px', // 增加尺寸
          background: isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'nwse-resize',
          zIndex: 10,
          borderRadius: '0 0 8px 0',
          transition: 'background 0.3s'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'se')}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent'}
      ></div>

      {/* 西南 - 左下角 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '24px',  // 增加尺寸
          height: '24px', // 增加尺寸
          background: isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'nesw-resize',
          zIndex: 10,
          borderRadius: '0 0 0 8px',
          transition: 'background 0.3s'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'sw')}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent'}
      ></div>

      {/* 东北 - 右上角 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '24px',  // 增加尺寸
          height: '24px', // 增加尺寸
          background: isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'nesw-resize',
          zIndex: 10,
          borderRadius: '0 8px 0 0',
          transition: 'background 0.3s'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'ne')}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent'}
      ></div>

      {/* 西北 - 左上角 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '24px',  // 增加尺寸
          height: '24px', // 增加尺寸
          background: isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'nwse-resize',
          zIndex: 10,
          borderRadius: '8px 0 0 0',
          transition: 'background 0.3s'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'nw')}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = isToolbarVisible ? 'rgba(0,0,0,0.05)' : 'transparent'}
      ></div>
    </div>
  );
};

export default BookReader;
