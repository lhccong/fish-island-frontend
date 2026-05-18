import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button, message, Tooltip, Spin, Modal, Slider, Popover, Radio, Select, ColorPicker, theme } from 'antd';
import { useModel } from 'umi';
import {
  BarsOutlined,
  DeleteOutlined,
  ColumnHeightOutlined,
  BorderOutlined,
  ReloadOutlined,
  BlockOutlined,
  SettingOutlined,
  SoundOutlined,
  PauseOutlined
} from '@ant-design/icons';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { ACCESS_TOKEN } from '@/constants';
// 添加虚拟列表依赖，解决大量章节渲染性能问题
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// 定义类型
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

interface ReaderSettings {
  fontColor: string;
  backgroundColor: string;
  opacity: number;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing?: number; // 添加字间距
  themeId?: string; // 当前使用的主题ID
  speechRate?: number; // 语速
  speechPitch?: number; // 音调
  speechVolume?: number; // 音量
  ttsEnabled?: boolean; // 是否启用朗读功能
  paragraphIndent?: number; // 段前空格数
}

// 定义一个主题接口
interface Theme {
  id: string;
  name: string;
  backgroundColor: string;
  color: string; // 字体颜色
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
  isCustom?: boolean; // 添加标识是否为自定义主题的字段
}

interface ReaderProps {
  visible: boolean;
  onClose: () => void;
}

// 默认设置
const DEFAULT_SETTINGS: ReaderSettings = {
  fontColor: '#333333',
  backgroundColor: '#f5f5f5',
  opacity: 0.95,
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  lineHeight: 1.5,
  letterSpacing: 0,
  themeId: 'default',
  speechRate: 1, // 默认语速
  speechPitch: 1, // 默认音调
  speechVolume: 1, // 默认音量
  ttsEnabled: false, // 默认不启用朗读功能
  paragraphIndent: 2 // 默认段前空格数
};

// 预定义主题列表
const PRESET_THEMES: Theme[] = [
  { id: "default", name: "默认主题", backgroundColor: "#f5f5f5", color: "#333333", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: "" },
  { id: "night", name: "夜间模式", backgroundColor: "#1a1a1a", color: "#dddddd", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: "" },
  { id: "paper", name: "纸张", backgroundColor: "#f0e6d2", color: "#5c4b36", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: "" },
  { id: "ivory", name: "米白纸质", backgroundColor: "#fdfaf6", color: "#3b3b3b", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: "" },
  { id: "green-soft", name: "淡绿色护眼", backgroundColor: "#eef5db", color: "#2f2f2f", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: "" },
  { id: "warm-night", name: "暖夜墨棕", backgroundColor: "#2c2b29", color: "#e3dac9", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: "" },
  { id: "gray-minimal", name: "极简冷灰", backgroundColor: "#f0f2f5", color: "#222222", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: "" },
  { id: "japan-soft", name: "日系淡雅", backgroundColor: "#fbf8f1", color: "#4a4a4a", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: "" },
  { id: "pink-milk", name: "草莓牛奶", backgroundColor: "#fff1f5", color: "#5c375c", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: '"ZCOOL KuaiLe", "Comic Sans MS", cursive' },
  { id: "mint-choco", name: "薄荷巧克力", backgroundColor: "#e6f9f0", color: "#4b3832", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: '"Baloo 2", "幼圆", sans-serif' },
  { id: "sky-sugar", name: "蓝天棉花糖", backgroundColor: "#eef6ff", color: "#364f6b", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: '"Quicksand", "Noto Sans SC", sans-serif' },
  { id: "lemon-cream", name: "柠檬奶油", backgroundColor: "#fffce0", color: "#6a4e36", fontSize: 18, lineHeight: 1.8, letterSpacing: .5, fontFamily: '"Ma Shan Zheng", "LXGW WenKai", cursive' }
];

// 默认尺寸
const DEFAULT_SIZE = {
  width: 500,
  height: 600
};

// 默认位置
const DEFAULT_POSITION = {
  x: window.innerWidth / 2 - 250,
  y: 50
};

// 可用字体列表
const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: '默认' },
  { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '微软雅黑' },
  { value: '"SimSun", "宋体", serif', label: '宋体' },
  { value: '"KaiTi", "楷体", serif', label: '楷体' },
  { value: '"SimHei", "黑体", sans-serif', label: '黑体' },
  { value: '"Source Han Sans CN", "思源黑体", sans-serif', label: '思源黑体' },
  { value: '"Source Han Serif CN", "思源宋体", serif', label: '思源宋体' }
];

// 使用缓存记录已经加载过的书籍ID，避免重复请求章节列表
const loadedBooksCache = new Set<number>();

const LIGHT_PRESET_THEME_IDS = new Set([
  'default', 'paper', 'ivory', 'green-soft', 'gray-minimal', 'japan-soft',
  'pink-milk', 'mint-choco', 'sky-sugar', 'lemon-cream',
]);

const NIGHT_THEME = PRESET_THEMES.find((t) => t.id === 'night')!;

/** 站点深色模式下，浅色阅读主题自动映射为夜间主题 */
function getDisplaySettings(settings: ReaderSettings, isDarkMode: boolean): ReaderSettings {
  if (!isDarkMode) return settings;
  const themeId = settings.themeId || 'default';
  if (!LIGHT_PRESET_THEME_IDS.has(themeId)) return settings;
  return {
    ...settings,
    backgroundColor: NIGHT_THEME.backgroundColor,
    fontColor: NIGHT_THEME.color,
    themeId: 'night',
  };
}

// 使用ColorPicker时需要的类型
import type { ColorPickerProps } from 'antd';

/** 虚拟列表内层滚动容器，用于应用深色滚动条 */
const ReaderListInnerElement = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ style, ...rest }, ref) => (
    <div ref={ref} className="floating-reader-scroll" style={style} {...rest} />
  ),
);
ReaderListInnerElement.displayName = 'ReaderListInnerElement';

const GlobalReader: React.FC<ReaderProps> = ({ visible, onClose }): React.ReactNode => {
  const { isDarkMode } = useModel('theme');
  const { token } = theme.useToken();

  // 核心状态 - 触发渲染的状态
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const displaySettings = useMemo(
    () => getDisplaySettings(settings, isDarkMode),
    [settings, isDarkMode],
  );
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [showChapterList, setShowChapterList] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  // 添加画中画状态
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  // 添加当前主题状态
  const [currentThemeId, setCurrentThemeId] = useState<string>(DEFAULT_SETTINGS.themeId || 'default');
  const [showThemes, setShowThemes] = useState(false); // 用于控制主题设置的显示

  // 添加摸鱼模式状态
  const [isMoyuMode, setIsMoyuMode] = useState(false);

  // 添加自定义主题相关状态
  const [userThemes, setUserThemes] = useState<Theme[]>([]); // 用户自定义主题列表
  const [showThemeCreator, setShowThemeCreator] = useState(false); // 控制主题创建器的显示
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null); // 当前正在编辑的主题
  const [allThemes, setAllThemes] = useState<Theme[]>(PRESET_THEMES); // 所有可用主题（系统+用户）

  // 辅助状态 - 不直接触发渲染的引用
  const chaptersRef = useRef<Chapter[]>([]);
  const filteredChaptersRef = useRef<Chapter[]>([]);
  const chapterIndexRef = useRef<number>(0);
  const bookRef = useRef<Book | null>(null);
  const chapterListSearchTextRef = useRef<string>('');

  // 拖动和调整大小相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // 用于章节列表和UI的状态 - 必须触发渲染的状态
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [chapterLoadingState, setChapterLoadingState] = useState<{
    isLoading: boolean;
    index: number | null;
  }>({ isLoading: false, index: null });
  const [refreshingChapters, setRefreshingChapters] = useState(false);
  const [refreshChaptersDisabled, setRefreshChaptersDisabled] = useState(false);
  const [chapterListSearchText, setChapterListSearchText] = useState('');

  // 功能性引用
  const loadingRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const virtualListRef = useRef<any>(null);
  const lastLoadTimeRef = useRef(0);
  // 为画中画添加引用
  const readerContentRef = useRef<any>(null);
  // 跟踪最新的章节内容
  const chapterContentRef = useRef<string>('');

  const [showSettings, setShowSettings] = useState(false);

  // 添加TTS相关状态
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [currentHighlightedIndex, setCurrentHighlightedIndex] = useState<number>(-1);
  const [paragraphs, setParagraphs] = useState<string[]>([]);

  // TTS引用
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 更新本地存储中的书籍
  const updateBookInStorage = useCallback((updatedBook: Book) => {
    try {
      const savedBooks = localStorage.getItem('fish-reader-books');
      if (!savedBooks) return;

      const books = JSON.parse(savedBooks);
      const updatedBooks = books.map((b: Book) =>
        b.id === updatedBook.id ? updatedBook : b
      );
      localStorage.setItem('fish-reader-books', JSON.stringify(updatedBooks));
    } catch (error) {
      console.log('更新本地存储失败:', error);
    }
  }, []);

  // 添加加载章节列表和内容的函数
  const loadBookChapters = useCallback(async (currentBook: Book, chapterIdx: number) => {
    try {
      if (!currentBook.chapters || currentBook.chapters.length === 0) {
        // 需要加载章节列表
        const bookWithChapters = await loadChapterList(currentBook);
        if (bookWithChapters && bookWithChapters.chapters && bookWithChapters.chapters.length > 0) {
          setBook(bookWithChapters);
          setChapters(bookWithChapters.chapters);

          // 加载当前章节内容
          const chapter = bookWithChapters.chapters.find((c: Chapter) => c.index === chapterIdx);
          if (chapter) {
            const chapterWithContent = await loadChapterContent(bookWithChapters, chapter);
            if (chapterWithContent) {
              setChapterContent(chapterWithContent.content || '章节内容加载失败');
            }
          }
        } else {
          message.error('加载章节列表失败');
        }
      } else {
        // 已有章节列表
        setChapters(currentBook.chapters);

        // 加载当前章节内容
        const chapter = currentBook.chapters.find((c: Chapter) => c.index === chapterIdx);
        if (chapter) {
          if (chapter.content) {
            // 已有缓存的章节内容
            setChapterContent(chapter.content);
          } else {
            // 需要加载章节内容
            const chapterWithContent = await loadChapterContent(currentBook, chapter);
            if (chapterWithContent) {
              setChapterContent(chapterWithContent.content || '章节内容加载失败');
            }
          }
        }
      }
    } catch (error) {
      console.error('加载章节失败:', error);
      message.error('加载章节失败');
    }
  }, [updateBookInStorage]);

 // 加载书籍数据的函数
 const loadBookData = useCallback(async () => {
  // 检查加载状态，防止重复加载
  if (loadingRef.current) return;

  // 加载频率限制
  const now = Date.now();
  if (now - lastLoadTimeRef.current < 1000) return;

  lastLoadTimeRef.current = now;
  loadingRef.current = true;

  try {
    setLoading(true);

    // 从本地存储加载设置
    const savedSettings = localStorage.getItem('fish-reader-settings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      // 同步更新主题ID
      if (parsedSettings.themeId) {
        setCurrentThemeId(parsedSettings.themeId);
      }
    }

    // 加载用户自定义主题
    const savedUserThemes = localStorage.getItem('fish-reader-user-themes');
    if (savedUserThemes) {
      try {
        const parsedUserThemes = JSON.parse(savedUserThemes);
        if (Array.isArray(parsedUserThemes) && parsedUserThemes.length > 0) {
          // 确保每个主题都有isCustom标记
          const validatedUserThemes = parsedUserThemes.map(theme => ({
            ...theme,
            isCustom: true
          }));
          setUserThemes(validatedUserThemes);

          // 合并系统主题和用户自定义主题
          setAllThemes([...PRESET_THEMES, ...validatedUserThemes]);
        }
      } catch (error) {
        console.error('解析用户主题失败:', error);
      }
    }

    // 加载上次阅读窗口大小
    const savedSize = localStorage.getItem('fish-reader-size');
    if (savedSize) {
      setSize(JSON.parse(savedSize));
    }

    // 加载上次阅读窗口位置
    const savedPosition = localStorage.getItem('fish-reader-position');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }

    // 加载点击穿透设置
    const savedClickThrough = localStorage.getItem('fish-reader-click-through');
    if (savedClickThrough) {
      setIsClickThrough(JSON.parse(savedClickThrough));
    }

    // 加载最后阅读的书籍
    const lastBookId = localStorage.getItem('fish-reader-last-book');
    if (!lastBookId) {
      message.warning('未找到最后阅读的书籍');
      setLoading(false);
      loadingRef.current = false;
      return;
    }

    // 从本地存储加载书籍列表
    const savedBooks = localStorage.getItem('fish-reader-books');
    if (!savedBooks) {
      message.warning('未找到书籍列表');
      setLoading(false);
      loadingRef.current = false;
      return;
    }

    const bookList = JSON.parse(savedBooks);
    const currentBook = bookList.find((b: Book) => b.id === parseInt(lastBookId));

    if (!currentBook) {
      message.warning('未找到对应的书籍');
      setLoading(false);
      loadingRef.current = false;
      return;
    }

    // 设置当前书籍
    setBook(currentBook);

    // 设置当前章节索引
    const chapterIdx = currentBook.lastReadChapter || 0;
    setChapterIndex(chapterIdx);

    // 加载章节列表和内容
    await loadBookChapters(currentBook, chapterIdx);

  } catch (error) {
    console.error('加载书籍数据失败:', error);
    message.error('加载书籍数据失败');
  } finally {
    setLoading(false);
    loadingRef.current = false;
  }
}, [loadBookChapters]);

// 保存阅读进度包括滚动位置
const updateReadingProgress = useCallback((scrollPosition?: number) => {
  const currentBook = bookRef.current;
  if (!currentBook) return;

  // 如果没有提供滚动位置，从内容区域获取
  const position = scrollPosition !== undefined
    ? scrollPosition
    : contentRef.current?.scrollTop || 0;

  // 更新章节的滚动位置
  let updatedBook = { ...currentBook };
  const currentChapterIdx = chapterIndexRef.current;

  if (updatedBook.chapters) {
    const updatedChapters = updatedBook.chapters.map((chapter: Chapter) => {
      if (chapter.index === currentChapterIdx) {
        return {
          ...chapter,
          position: position || 0
        };
      }
      return chapter;
    });

    updatedBook = {
      ...updatedBook,
      chapters: updatedChapters,
      lastReadChapter: currentChapterIdx,
      lastReadPosition: position || 0,
      lastReadTime: Date.now()
    };
  } else {
    updatedBook = {
      ...updatedBook,
      lastReadChapter: currentChapterIdx,
      lastReadPosition: position || 0,
      lastReadTime: Date.now()
    };
  }

  setBook(updatedBook);

  // 确保阅读进度正确存储到localStorage
  try {
    // 获取最新的书籍列表
    const savedBooks = localStorage.getItem('fish-reader-books');
    if (savedBooks) {
      const books = JSON.parse(savedBooks);

      // 找到当前书籍在列表中的位置
      const bookIndex = books.findIndex((b: Book) => b.id === updatedBook.id);

      if (bookIndex >= 0) {
        // 更新书籍信息
        books[bookIndex] = {
          ...books[bookIndex],
          lastReadChapter: currentChapterIdx,
          lastReadPosition: position || 0,
          lastReadTime: Date.now()
        };

        // 如果有章节信息，也更新章节信息
        if (updatedBook.chapters && books[bookIndex].chapters) {
          books[bookIndex].chapters = books[bookIndex].chapters.map((chapter: Chapter) => {
            if (chapter.index === currentChapterIdx) {
              return {
                ...chapter,
                position: position || 0
              };
            }
            return chapter;
          });
        }

        // 保存更新后的书籍列表
        localStorage.setItem('fish-reader-books', JSON.stringify(books));

        // 保存最后阅读的书籍ID
        localStorage.setItem('fish-reader-last-book', updatedBook.id.toString());


      } else {
        console.error('在书籍列表中找不到当前书籍');
      }
    }
  } catch (error) {
    console.error('保存阅读进度失败:', error);
  }
}, []);

// 修改useEffect，在visible变化时重置状态
useEffect(() => {
  if (visible) {
    loadBookData();
  } else {
    // 在阅读器关闭前保存进度 - 确保进度同步
    if (contentRef.current && bookRef.current) {
      // 立即保存进度，强制同步
      forceUpdateReadingProgress();
    }

    // 在阅读器关闭时清空状态，避免再次打开时闪烁
    setLoading(true);
    setBook(null);
    setChapters([]);
    setChapterContent('');
    setChapterIndex(0);
    setFilteredChapters([]);
    setShowChapterList(false);

    // 重置引用
    chaptersRef.current = [];
    filteredChaptersRef.current = [];
    chapterIndexRef.current = 0;
    bookRef.current = null;

    // 重置加载状态
    setChapterLoadingState({ isLoading: false, index: null });
    loadingRef.current = false;
  }
}, [visible, loadBookData, updateReadingProgress]);

// 新增：强制更新阅读进度到localStorage，确保同步
const forceUpdateReadingProgress = () => {
  try {
    const currentBook = bookRef.current;
    if (!currentBook) return;

    const currentChapterIdx = chapterIndexRef.current;
    const scrollPosition = contentRef.current?.scrollTop || 0;



    // 获取最新的书籍列表
    const savedBooks = localStorage.getItem('fish-reader-books');
    if (!savedBooks) return;

    const books = JSON.parse(savedBooks);
    // 找到当前书籍
    const bookIndex = books.findIndex((b: Book) => b.id === currentBook.id);

    if (bookIndex < 0) {
      console.error('[强制同步] 在书籍列表中找不到当前书籍');
      return;
    }

    // 更新书籍信息
    books[bookIndex] = {
      ...books[bookIndex],
      lastReadChapter: currentChapterIdx,
      lastReadPosition: scrollPosition,
      lastReadTime: Date.now()
    };

    // 如果有章节信息，也更新章节信息
    if (currentBook.chapters && books[bookIndex].chapters) {
      // 深拷贝章节列表，避免引用问题
      const updatedChapters = [...books[bookIndex].chapters];

      // 查找并更新当前章节的位置
      const chapterIndex = updatedChapters.findIndex(c => c.index === currentChapterIdx);
      if (chapterIndex >= 0) {
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          position: scrollPosition
        };
      }

      books[bookIndex].chapters = updatedChapters;
    }

    // 保存更新后的书籍列表
    localStorage.setItem('fish-reader-books', JSON.stringify(books));

    // 保存最后阅读的书籍ID
    localStorage.setItem('fish-reader-last-book', currentBook.id.toString());


  } catch (error) {
    console.error('[强制同步] 保存进度失败:', error);
  }
};

// 重构切换章节函数
const changeChapter = useCallback(async (newIndex: number): Promise<boolean> => {
  console.log(`[changeChapter] 切换到章节索引: ${newIndex}`);

  // 使用ref获取最新的book值，避免依赖引起的无限循环
  const currentBook = bookRef.current;

  if (!currentBook || !currentBook.chapters) {
    console.error('[changeChapter] book或chapters为空');
    message.error('书籍数据不完整');
    return false;
  }

  // 设置加载状态
  setChapterLoadingState({
    isLoading: true,
    index: newIndex
  });

  try {
    // 在切换章节前保存当前进度
    forceUpdateReadingProgress();

    // 索引边界检查
    if (newIndex < 0 || newIndex >= currentBook.chapters.length) {
      console.error(`[changeChapter] 章节索引${newIndex}超出范围[0-${currentBook.chapters.length - 1}]`);
      message.error('无效的章节索引');
      return false;
    }

    // 设置章节索引和更新引用
    setChapterIndex(newIndex);
    chapterIndexRef.current = newIndex;

    // 获取章节
    const chapter = currentBook.chapters.find((c: Chapter) => c.index === newIndex);
    if (!chapter) {
      console.error(`[changeChapter] 找不到索引为${newIndex}的章节`);
      message.error('找不到对应章节');
      return false;
    }

    // 添加加载状态提示
    message.loading({
      content: '正在加载章节内容...',
      key: 'chapterLoading',
      duration: 0
    });

    // 检查是否已有内容
    if (chapter.content) {
      // 直接使用缓存内容
      setChapterContent(chapter.content);
      // 同时更新引用
      chapterContentRef.current = chapter.content;

      // 强制保存进度到localStorage，确保页内阅读器可以读取
      try {
        const savedBooks = localStorage.getItem('fish-reader-books');
        if (savedBooks) {
          const books = JSON.parse(savedBooks);
          const bookIndex = books.findIndex((b: Book) => b.id === currentBook.id);

          if (bookIndex >= 0) {
            // 更新书籍信息
            books[bookIndex] = {
              ...books[bookIndex],
              lastReadChapter: newIndex,
              lastReadTime: Date.now()
            };

            // 保存更新后的书籍列表
            localStorage.setItem('fish-reader-books', JSON.stringify(books));

            // 保存最后阅读的书籍ID
            localStorage.setItem('fish-reader-last-book', currentBook.id.toString());
          }
        }
      } catch (error) {
        console.error('[changeChapter] 保存进度失败:', error);
      }

      // 使用setTimeout确保章节内容加载后，强制更新一次阅读进度
      setTimeout(() => {
        // 异步强制更新一次进度，确保页内阅读器能够读取到最新进度
        forceUpdateReadingProgress();
      }, 500);

      message.destroy('chapterLoading');
      return true;
    } else {
      // 需要加载章节内容
      const chapterWithContent = await loadChapterContent(currentBook, chapter);

      if (chapterWithContent && chapterWithContent.content) {
        setChapterContent(chapterWithContent.content);
        // 同时更新引用
        chapterContentRef.current = chapterWithContent.content;

        // 异步强制更新一次进度，确保页内阅读器能够读取到最新进度
        setTimeout(() => {
          forceUpdateReadingProgress();
        }, 500);

        message.destroy('chapterLoading');
        return true;
      } else {
        console.error(`[changeChapter] 获取的章节内容为空`);
        setChapterContent('章节内容加载失败');
        message.destroy('chapterLoading');
        return false;
      }
    }
  } catch (error) {
    console.error('[changeChapter] 在异步加载章节内容时出错:', error);
    message.destroy('chapterLoading');
    return false;
  } finally {
    // 无论成功与否，总是重置加载状态
    setChapterLoadingState({
      isLoading: false,
      index: null
    });
  }
}, []);


// 在组件卸载时关闭画中画窗口
useEffect(() => {
  return () => {
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.close();
      } catch (e) {
        console.error('关闭画中画窗口失败:', e);
      }
    }
  };
}, []);


// 同步引用和状态
useEffect(() => {
  chaptersRef.current = chapters;
}, [chapters]);

useEffect(() => {
  chapterIndexRef.current = chapterIndex;
}, [chapterIndex]);

// 同步章节内容引用
useEffect(() => {
  chapterContentRef.current = chapterContent;
}, [chapterContent]);

useEffect(() => {
  filteredChaptersRef.current = filteredChapters;
}, [filteredChapters]);

useEffect(() => {
  bookRef.current = book;
}, [book]);

useEffect(() => {
  chapterListSearchTextRef.current = chapterListSearchText;
}, [chapterListSearchText]);

// 增强版关闭函数，确保在关闭时保存阅读进度并关闭画中画
const enhancedHandleClose = useCallback(() => {
  // 保存阅读进度
  if (contentRef.current && bookRef.current) {
    // 强制同步阅读进度
    forceUpdateReadingProgress();
  }

  // 关闭画中画窗口
  if (pipWindowRef.current) {
    try {
      pipWindowRef.current.close();
    } catch (e) {
      console.error('关闭画中画窗口失败:', e);
    }
    setIsPipActive(false);
    pipWindowRef.current = null;
  }

  // 停止朗读
  if (speechSynthesisRef.current) {
    speechSynthesisRef.current.cancel();
  }

  // 调用原始的onClose
  onClose();
}, [onClose]);


// 加载章节列表
const loadChapterList = async (book: Book): Promise<Book | null> => {
  if (book.source !== 'online' || !book.url) {
    return book; // 非在线书籍，直接返回
  }

  try {
    // 获取API设置
    const savedSettings = localStorage.getItem('fish-reader-settings');
    const accessToken = ACCESS_TOKEN;
    let apiBaseUrl = 'https://reader.yucoder.cn/reader3';

    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      apiBaseUrl = parsedSettings.apiBaseUrl || apiBaseUrl;
    }

    // 构造API请求
    const timestamp = Date.now();
    const url = `${apiBaseUrl}/getChapterList?accessToken=${accessToken}&v=${timestamp}`;

    // 发送请求
    const response = await axios.post(url, { url: book.url,refresh: 0, // 不强制刷新
      bookSourceUrl: book.sourceInfo?.url });

    if (!response.data || !response.data.data) {
      message.error('获取章节列表失败: 数据格式错误');
      return book;
    }

    // 更新书籍对象
    const updatedBook = {
      ...book,
      chapters: response.data.data
    };

    // 更新本地存储
    updateBookInStorage(updatedBook);

    return updatedBook;
  } catch (error) {
    console.error('加载章节列表失败:', error);
    message.error('加载章节列表失败');
    return book;
  }
};

// 加载章节内容
const loadChapterContent = async (book: Book, chapter: Chapter): Promise<Chapter | null> => {
  if (chapter.content) {
    return chapter; // 已有内容，直接返回
  }

  if (book.source !== 'online' || !book.url) {
    return chapter; // 非在线书籍，直接返回
  }

  try {
    // 获取API设置
    const savedSettings = localStorage.getItem('fish-reader-settings');
    const accessToken = ACCESS_TOKEN;
    let apiBaseUrl = 'https://reader.yucoder.cn/reader3';

    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      apiBaseUrl = parsedSettings.apiBaseUrl || apiBaseUrl;
    }

    // 构造API请求
    const timestamp = Date.now();
    const url = `${apiBaseUrl}/getBookContent?accessToken=${accessToken}&v=${timestamp}`;

    // 发送请求
    const response = await axios.post(url, {
      url: book.url,
      index: chapter.index
    });

    if (!response.data || !response.data.data) {
      message.error('获取章节内容失败: 数据格式错误');
      return chapter;
    }

    // 更新章节对象
    const updatedChapter = {
      ...chapter,
      content: response.data.data
    };

    // 更新书籍中的章节
    if (book.chapters) {
      const updatedChapters = book.chapters.map((c: Chapter) =>
        c.index === chapter.index ? updatedChapter : c
      );

      const updatedBook = {
        ...book,
        lastReadChapter: chapter.index,
        chapters: updatedChapters
      };
      // 更新本地存储
      updateBookInStorage(updatedBook);
    }

    return updatedChapter;
  } catch (error) {
    console.error('加载章节内容失败:', error);
    message.error('加载章节内容失败');
    return chapter;
  }
};

// 处理拖动开始
const handleDragStart = (e: React.MouseEvent) => {
  if (e.target instanceof HTMLElement && e.target.closest('.handle')) {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  }
};

// 处理调整大小开始
const handleResizeStart = (e: React.MouseEvent) => {
  setIsResizing(true);
  setResizeStart({
    x: e.clientX,
    y: e.clientY,
    width: size.width,
    height: size.height
  });
  e.preventDefault();
  e.stopPropagation();
};

// 处理鼠标移动（拖动和调整大小）
useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // 计算新位置
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // 边界检查
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      const safeX = Math.max(0, Math.min(maxX, newX));
      const safeY = Math.max(0, Math.min(maxY, newY));

      setPosition({ x: safeX, y: safeY });
    } else if (isResizing) {
      // 计算新尺寸
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const newWidth = Math.max(200, resizeStart.width + deltaX);
      const newHeight = Math.max(100, resizeStart.height + deltaY);

      // 边界检查
      const maxWidth = window.innerWidth - position.x;
      const maxHeight = window.innerHeight - position.y;
      const safeWidth = Math.min(maxWidth, newWidth);
      const safeHeight = Math.min(maxHeight, newHeight);

      setSize({ width: safeWidth, height: safeHeight });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // 保存位置
      localStorage.setItem('fish-reader-position', JSON.stringify(position));
    }

    if (isResizing) {
      setIsResizing(false);
      // 保存尺寸
      localStorage.setItem('fish-reader-size', JSON.stringify(size));
    }
  };

  if (isDragging || isResizing) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [isDragging, isResizing, dragStart, resizeStart, position, size]);

// 恢复滚动位置 - 仅针对内容区域，不影响章节列表
useEffect(() => {
  // 需要确保加载完成且有内容和章节信息
  if (!loading && contentRef.current && book && book.chapters) {
    // 查找当前章节
    const currentChapter = book.chapters.find(c => c.index === chapterIndex);
    if (currentChapter && currentChapter.position !== undefined) {
      // 使用requestAnimationFrame确保DOM已更新
      requestAnimationFrame(() => {
        // 恢复到上次的阅读位置
        if (contentRef.current) {
          contentRef.current.scrollTop = currentChapter.position as number;
        }
      });
    } else {
      // 新章节或无记录的章节，滚动到顶部
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      });
    }
  }
}, [loading, chapterContent, chapterIndex, book?.chapters?.length]); // 使用book?.chapters?.length而不是book.chapters

// 定期保存阅读进度
useEffect(() => {
  if (!visible || !book) return;

  // 10秒保存一次阅读进度，提高保存频率
  const saveInterval = setInterval(() => {
    if (contentRef.current) {
      forceUpdateReadingProgress();
    }
  }, 10000);

  // 清理
  return () => {
    clearInterval(saveInterval);

    // 退出前强制保存一次
    if (contentRef.current) {
      forceUpdateReadingProgress();
    }
  };
}, [visible, book, chapterIndex]);

// 处理滚动事件
const handleScroll = () => {
  // 节流处理，不要每次滚动都保存
  if (!book || !contentRef.current) return;

  const now = Date.now();
  // 限制为1秒保存一次
  if (now - lastLoadTimeRef.current > 1000) {
    lastLoadTimeRef.current = now;
    // 仅在用户停止滚动后保存
    setTimeout(() => {
      if (contentRef.current) {
        // 使用强制同步方法确保数据正确保存
        forceUpdateReadingProgress();
      }
    }, 500);
  }
};

// 切换点击穿透
const toggleClickThrough = () => {
  const newValue = !isClickThrough;
  setIsClickThrough(newValue);
  localStorage.setItem('fish-reader-click-through', JSON.stringify(newValue));
  message.info(newValue ? '已启用点击穿透' : '已禁用点击穿透');
};

// 切换摸鱼模式
const toggleMoyuMode = () => {
  const newValue = !isMoyuMode;
  setIsMoyuMode(newValue);
  message.info(newValue ? '已进入Word模式' : '已退出Word模式');
};

// 重新加载
const handleReload = async () => {
  if (!book) return;

  try {
    setLoading(true);

    // 重新加载章节列表
    const refreshedBook = await loadChapterList(book);
    if (refreshedBook && refreshedBook.chapters && refreshedBook.chapters.length > 0) {
      setBook(refreshedBook);
      setChapters(refreshedBook.chapters);

      // 加载当前章节内容
      const chapter = refreshedBook.chapters.find((c: Chapter) => c.index === chapterIndex);
      if (chapter) {
        const chapterWithContent = await loadChapterContent(refreshedBook, chapter);
        if (chapterWithContent) {
          setChapterContent(chapterWithContent.content || '章节内容加载失败');
        }
      }

      message.success('重新加载成功');
    } else {
      message.error('重新加载失败');
    }
  } catch (error) {
    console.error('重新加载失败:', error);
    message.error('重新加载失败');
  } finally {
    setLoading(false);
  }
};

// 重写章节搜索函数，确保不会导致无限循环
const handleChapterSearch = useCallback((value: string) => {
  // 设置搜索文本
  setChapterListSearchText(value);

  // 立即使用当前的chapters进行过滤
  const currentChapters = chaptersRef.current;

  // 应用过滤逻辑
  if (!value.trim()) {
    // 空搜索显示全部章节
    setFilteredChapters([...currentChapters]);
  } else {
    // 根据搜索文本过滤章节
    const filtered = currentChapters.filter(chapter =>
      chapter.title.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredChapters(filtered);
  }
}, []); // 不依赖任何变量

// 修改打开章节列表函数
const openChapterList = useCallback(() => {
  // 先设置显示状态
  setShowChapterList(true);
}, []);

// 添加专门处理章节列表显示状态变化的useEffect
useEffect(() => {
  // 仅在章节列表显示时执行一次，设置过滤后的章节列表
  if (showChapterList) {
    // 如果有搜索文本，应用过滤
    if (chapterListSearchTextRef.current) {
      const filtered = chaptersRef.current.filter(c =>
        c.title.toLowerCase().includes(chapterListSearchTextRef.current.toLowerCase())
      );
      // 设置过滤后的章节列表
      setFilteredChapters(filtered);
    } else {
      // 没有搜索文本，显示全部章节
      setFilteredChapters([...chaptersRef.current]);
    }
  }
}, [showChapterList]); // 仅依赖showChapterList，避免循环

// 修改关闭章节列表函数
const closeChapterList = useCallback(() => {
  // 只改变显示状态，不清空数据
  setShowChapterList(false);
}, []);

// 重构刷新章节列表函数
const refreshChaptersList = useCallback(async () => {
  // 使用ref获取最新值，避免依赖项导致的重渲染
  if (refreshingChapters || !bookRef.current) return;

  try {
    setRefreshingChapters(true);
    setRefreshChaptersDisabled(true);

    // 使用ref获取最新的book值
    const currentBook = bookRef.current;

    // 加载章节列表
    const updatedBook = await loadChapterList(currentBook);

    if (updatedBook && updatedBook.chapters && updatedBook.chapters.length > 0) {
      // 更新全局chapters状态
      setChapters(updatedBook.chapters);

      // 立即更新chaptersRef，避免延迟
      chaptersRef.current = updatedBook.chapters;

      // 使用当前搜索文本过滤章节
      const searchText = chapterListSearchTextRef.current;
      if (searchText) {
        const filtered = updatedBook.chapters.filter(c =>
          c.title.toLowerCase().includes(searchText.toLowerCase())
        );
        setFilteredChapters(filtered);
      } else {
        setFilteredChapters(updatedBook.chapters);
      }

      message.success(`刷新成功，共${updatedBook.chapters.length}章`);
    } else {
      message.warning('未获取到章节数据');
    }
  } catch (error) {
    console.error('刷新章节列表失败:', error);
    message.error('刷新章节列表失败');
  } finally {
    setRefreshingChapters(false);
    setTimeout(() => setRefreshChaptersDisabled(false), 3000);
  }
}, [refreshingChapters, loadChapterList]); // 只依赖refreshingChapters和loadChapterList

// 修改键盘快捷键处理
useEffect(() => {
  if (!visible) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    // 仅当阅读器可见时处理快捷键
    if (!book) return;

    // 如果正在加载章节，忽略快捷键
    if (chapterLoadingState.isLoading) return;

    switch (e.key) {
      case 'ArrowLeft':
        // 上一章
        if (chapterIndex > 0) {
          changeChapter(chapterIndex - 1);
        }
        break;
      case 'ArrowRight':
        // 下一章
        if (book.chapters && chapterIndex < book.chapters.length - 1) {
          changeChapter(chapterIndex + 1);
        }
        break;
      case 'Escape':
        // 退出阅读器
        enhancedHandleClose();
        break;
      case 'c':
        // 打开章节列表
        if (e.ctrlKey) {
          setShowChapterList(true);
          e.preventDefault();
        }
        break;
      case 't':
        // 切换点击穿透
        if (e.ctrlKey) {
          toggleClickThrough();
          e.preventDefault();
        }
        break;
    }
  };

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown);

  // 清理函数
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [visible, book, chapterIndex, chapterLoadingState.isLoading, enhancedHandleClose]);

// 处理右键菜单
const handleContextMenu = (e: React.MouseEvent) => {
  // 阻止默认右键菜单
  e.preventDefault();

  // 创建自定义右键菜单
  const menuDiv = document.createElement('div');
  menuDiv.className = 'reader-context-menu';
  menuDiv.style.position = 'fixed';
  menuDiv.style.top = `${e.clientY}px`;
  menuDiv.style.left = `${e.clientX}px`;
  menuDiv.style.backgroundColor = token.colorBgElevated;
  menuDiv.style.boxShadow = token.boxShadowSecondary;
  menuDiv.style.borderRadius = '4px';
  menuDiv.style.padding = '4px 0';
  menuDiv.style.zIndex = '1100';
  menuDiv.style.width = '180px';

  // 菜单项
  const menuItems = [
    { text: '上一章', disabled: !book || !book.chapters || chapterIndex <= 0, action: () => changeChapter(chapterIndex - 1) },
    { text: '下一章', disabled: !book || !book.chapters || chapterIndex >= (book.chapters?.length || 0) - 1, action: () => changeChapter(chapterIndex + 1) },
    { text: '章节列表', action: openChapterList },
    { text: `${isClickThrough ? '禁用' : '启用'}点击穿透`, action: toggleClickThrough },
    { text: '刷新内容', action: handleReload },
    { text: '关闭阅读器', action: enhancedHandleClose }
  ];

  // 创建菜单项
  menuItems.forEach((item) => {
    const menuItem = document.createElement('div');
    menuItem.style.padding = '8px 16px';
    menuItem.style.cursor = item.disabled ? 'not-allowed' : 'pointer';
    menuItem.style.fontSize = '14px';
    menuItem.style.color = item.disabled ? token.colorTextDisabled : token.colorText;
    menuItem.innerText = item.text;

    if (!item.disabled) {
      menuItem.addEventListener('click', () => {
        document.body.removeChild(menuDiv);
        item.action();
      });

      menuItem.addEventListener('mouseover', () => {
        menuItem.style.backgroundColor = token.colorFillSecondary;
      });

      menuItem.addEventListener('mouseout', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
    }

    menuDiv.appendChild(menuItem);
  });

  // 添加到body
  document.body.appendChild(menuDiv);

  // 点击其他区域关闭菜单
  const closeMenu = () => {
    if (document.body.contains(menuDiv)) {
      document.body.removeChild(menuDiv);
    }
    document.removeEventListener('click', closeMenu);
  };

  // 延迟添加事件，避免立即触发
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 100);
};

// 修改章节列表打开时的滚动逻辑，确保不会导致无限循环
useEffect(() => {
  // 仅在显示章节列表时执行一次滚动，并只依赖showChapterList这一个变量
  if (showChapterList) {
    // 避免使用依赖项变量，应使用ref访问最新值
    requestAnimationFrame(() => {
      const timer = setTimeout(() => {
        if (virtualListRef.current && chaptersRef.current.length > 0) {
          const currentIndex = chaptersRef.current.findIndex(c => c.index === chapterIndexRef.current);
          if (currentIndex >= 0) {
            virtualListRef.current.scrollToItem(currentIndex, 'center');
          }
        }
      }, 150);

      return () => clearTimeout(timer);
    });
  }
}, [showChapterList]); // 只依赖showChapterList

// 重构处理章节点击的函数
const handleChapterClick = useCallback(async (index: number) => {
  // 如果当前正在加载，则忽略此次点击
  if (chapterLoadingState.isLoading) {
    message.info('章节加载中，请稍等...');
    return;
  }

  // 检查章节是否存在
  const chapter = chaptersRef.current.find(c => c.index === index);
  if (!chapter) {
    message.error('找不到对应章节');
    return;
  }

  // 加载章节
  const success = await changeChapter(index);

  if (success) {
    // 成功后关闭章节列表
    if (showChapterList) {
      closeChapterList();
    }
  } else {
    message.error('章节加载失败，请重试');
  }
}, [chapterLoadingState.isLoading, changeChapter, showChapterList, closeChapterList]);

// 重构renderChapterItem函数，去除不必要的依赖
const renderChapterItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
  // 使用当前状态的filteredChapters，而不是ref
  if (!filteredChapters || index >= filteredChapters.length) {
    return null;
  }

  const chapter = filteredChapters[index];
  const isCurrentChapter = chapter.index === chapterIndex;
  const isLoading = chapterLoadingState.isLoading && chapterLoadingState.index === chapter.index;

  return (
    <div
      style={{
        ...style,
        padding: '8px 16px',
        cursor: isLoading || chapterLoadingState.isLoading ? 'wait' : 'pointer',
        backgroundColor: isCurrentChapter ? token.colorPrimaryBg : 'transparent',
        borderLeft: isCurrentChapter ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none'
      }}
      onClick={() => {
        if (!chapterLoadingState.isLoading) {
          handleChapterClick(chapter.index);
        } else {
          message.info('正在加载章节，请稍等');
        }
      }}
    >
      <div style={{
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: '14px',
        color: chapter.isVolume ? '#1890ff' : 'inherit',
        fontWeight: chapter.isVolume ? 'bold' : 'normal'
      }}>
        {chapter.title}
      </div>
      {isLoading && (
        <Spin size="small" style={{ marginLeft: 8 }} />
      )}
    </div>
  );
}, [filteredChapters, chapterIndex, chapterLoadingState, handleChapterClick]);

// 重构章节列表部分JSX
const renderChapterList = () => (
  <>
    <div style={{ display: 'flex', marginBottom: 16, gap: 8 }}>
      <input
        type="text"
        placeholder="搜索章节"
        value={chapterListSearchText}
        onChange={(e) => handleChapterSearch(e.target.value)}
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          outline: 'none'
        }}
      />
      <Button
        icon={<ReloadOutlined />}
        onClick={refreshChaptersList}
        disabled={refreshChaptersDisabled || refreshingChapters}
        loading={refreshingChapters}
        title="刷新章节列表"
      />
    </div>

    {/* 章节列表主体 */}
    <div className="floating-reader-chapter-panel" style={{ flex: 1 }}>
      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}>
          <Spin tip="加载中..." />
        </div>
      ) : !filteredChapters || filteredChapters.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#999'
        }}>
          {refreshingChapters ? '正在加载章节...' : (
            <>
              <div>没有找到章节</div>
              <Button
                type="link"
                onClick={refreshChaptersList}
                disabled={refreshChaptersDisabled}
              >
                点击刷新
              </Button>
            </>
          )}
        </div>
      ) : (
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={virtualListRef}
              height={height}
              width={width}
              itemCount={filteredChapters.length}
              itemSize={40}
              overscanCount={20}
              innerElementType={ReaderListInnerElement}
            >
              {renderChapterItem}
            </List>
          )}
        </AutoSizer>
      )}
    </div>

    {/* 底部信息 */}
    <div style={{ marginTop: 16, fontSize: '12px', color: '#999', textAlign: 'center' }}>
      {filteredChapters && filteredChapters.length > 0 && (
        <span>
          共 {filteredChapters.length} 章
          {chapterListSearchText && ` (匹配 ${filteredChapters.length}/${chapters.length})`}
        </span>
      )}
    </div>
  </>
);

// 检查画中画API是否可用
useEffect(() => {
  setIsPipSupported('documentPictureInPicture' in window);
}, []);

// 处理画中画模式
const handlePictureInPicture = async () => {
  if (!isPipSupported) {
    message.warning('您的浏览器不支持画中画功能');
    return;
  }

  try {
    if (isPipActive && pipWindowRef.current) {
      // 关闭画中画窗口
      pipWindowRef.current.close();
      return;
    }

    // 显示加载提示
    message.loading({ content: '正在准备画中画模式...', key: 'pipLoading' });

    // 打开画中画窗口
    // @ts-ignore - TypeScript可能不认识这个API
    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 400,
      height: 500,
    });

    // 保存窗口引用
    pipWindowRef.current = pipWindow;
    setIsPipActive(true);

    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: 0;
        background-color: ${settings.backgroundColor};
        color: ${settings.fontColor};
        font-family: ${settings.fontFamily};
        font-size: ${settings.fontSize}px;
        line-height: ${settings.lineHeight};
        letter-spacing: ${settings.letterSpacing !== undefined ? `${settings.letterSpacing}px` : 'normal'};
        overflow: auto;
        scroll-behavior: auto;
      }
      .chapter-title {
        text-align: center;
        margin: 0;
        padding-top: 10px;
        margin-bottom: 10px;
      }
      .chapter-content {
        padding: 0;
        white-space: pre-wrap;
      }
      .chapter-content p {
        text-indent: 2em;
        margin: 0.5em 0;
      }
      .controls {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: rgba(240, 240, 240, 0.8);
        padding: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #ddd;
        z-index: 100;
        height: 20px;
      }
      .controls button {
        background: white;
        border: 1px solid #ddd;
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 4px;
        margin: 0 2px;
      }
      .controls button:hover {
        background: #f0f0f0;
      }
      .controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .loading-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        flex-direction: column;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: ${settings.backgroundColor};
        padding-top: 60px;
        z-index: 10;
      }
      .spinner {
        border: 3px solid rgba(0, 0, 0, 0.1);
        border-top: 3px solid #1890ff;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
      }
      .loading-text {
        font-size: 14px;
        color: #666;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    pipWindow.document.head.appendChild(style);

    // 创建内容容器
    const contentContainer = document.createElement('div');
    contentContainer.className = 'chapter-content';

    // 创建章节标题
    const chapterTitle = document.createElement('h2');
    chapterTitle.className = 'chapter-title';
    chapterTitle.textContent = book?.chapters ?
      book.chapters[chapterIndex]?.title || `第${chapterIndex + 1}章` :
      '加载中...';

    // 创建控制栏
    const controls = document.createElement('div');
    controls.className = 'controls';

    // 添加加载状态变量到画中画窗口中
    pipWindow.isLoading = false;

    // 创建加载指示器函数
    const showLoadingIndicator = () => {
      // 标记为加载状态
      pipWindow.isLoading = true;

      // 获取当前内容区域高度，避免内容切换时的抖动
      const currentHeight = contentContainer.scrollHeight;

      // 创建加载指示器，但保留原内容
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading-indicator';
      loadingDiv.id = 'pip-loading-indicator';

      const spinner = document.createElement('div');
      spinner.className = 'spinner';

      const loadingText = document.createElement('div');
      loadingText.className = 'loading-text';
      loadingText.textContent = '章节加载中...';

      loadingDiv.appendChild(spinner);
      loadingDiv.appendChild(loadingText);

      // 先检查是否已经存在加载指示器
      const existingIndicator = pipWindow.document.getElementById('pip-loading-indicator');
      if (!existingIndicator) {
        // 添加加载指示器，但不清空原有内容
        contentContainer.style.minHeight = `${currentHeight}px`;
        contentContainer.appendChild(loadingDiv);
      }
    };

    // 添加上一章按钮
    const prevButton = document.createElement('button');
    prevButton.textContent = '上一章';
    prevButton.disabled = chapterIndex <= 0;
    prevButton.addEventListener('click', () => {
      // 如果正在加载中，不响应点击
      if (pipWindow.isLoading) return;

      // 显示加载指示器
      showLoadingIndicator();

      // 使用当前的引用值而不是闭包中的值
      const currentIndex = chapterIndexRef.current;
      if (currentIndex > 0) {
        const newIndex = currentIndex - 1;
        // 先在主窗口中更新章节索引
        setChapterIndex(newIndex);
        // 然后异步加载章节内容
        setTimeout(() => {
          changeChapter(newIndex).then(() => {
            setTimeout(() => {
              updatePipContent(true);
              pipWindow.isLoading = false;
            }, 300);
          });
        }, 0);
      }
    });

    // 添加下一章按钮
    const nextButton = document.createElement('button');
    nextButton.textContent = '下一章';
    nextButton.disabled = !book?.chapters || chapterIndex >= (book.chapters.length - 1);
    nextButton.addEventListener('click', () => {
      // 如果正在加载中，不响应点击
      if (pipWindow.isLoading) return;

      // 显示加载指示器
      showLoadingIndicator();

      // 使用当前的引用值而不是闭包中的值
      const currentIndex = chapterIndexRef.current;
      const currentBook = bookRef.current;
      if (currentBook?.chapters && currentIndex < currentBook.chapters.length - 1) {
        const newIndex = currentIndex + 1;
        // 先在主窗口中更新章节索引
        setChapterIndex(newIndex);
        // 然后异步加载章节内容
        setTimeout(() => {
          changeChapter(newIndex).then(() => {
            setTimeout(() => {
              updatePipContent(true);
              pipWindow.isLoading = false;
            }, 300);
          });
        }, 0);
      }
    });

    // 添加按钮到控制栏
    controls.appendChild(prevButton);
    controls.appendChild(document.createTextNode(`${chapterIndex + 1}/${book?.chapters?.length || '?'}`));
    controls.appendChild(nextButton);

    // 填充内容
    const content = document.createElement('div');
    content.style.marginTop = '40px'; // 为控制栏留出空间
    chapterContent.split('\n').forEach((paragraph) => {
      if (paragraph.trim()) {
        const p = document.createElement('p');
        p.textContent = paragraph;
        content.appendChild(p);
      } else {
        content.appendChild(document.createElement('br'));
      }
    });

    contentContainer.appendChild(content);

    // 添加到画中画窗口
    pipWindow.document.body.appendChild(controls);
    pipWindow.document.body.appendChild(contentContainer);

    // 监听窗口关闭事件
    pipWindow.addEventListener('pagehide', () => {
      setIsPipActive(false);
      pipWindowRef.current = null;
    });

    // 在章节或内容更改时更新画中画内容的函数
    const updatePipContent = (forceUpdate = false) => {
      if (!pipWindowRef.current) return;

      try {
        // 始终使用最新的引用值
        const currentIndex = chapterIndexRef.current;
        const currentBook = bookRef.current;

        // 记录内容容器的当前高度
        const currentHeight = contentContainer.scrollHeight;

        // 先删除加载指示器
        const loadingIndicator = pipWindowRef.current.document.getElementById('pip-loading-indicator');
        if (loadingIndicator) {
          loadingIndicator.remove();
        }

        // 清空现有内容
        while (contentContainer.firstChild) {
          contentContainer.removeChild(contentContainer.firstChild);
        }

        // 重置滚动位置
        if (pipWindowRef.current) {
          pipWindowRef.current.document.body.scrollTop = 0;
          pipWindowRef.current.document.documentElement.scrollTop = 0;
          pipWindowRef.current.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto'
          });
        }

        // 更新章节标题
        chapterTitle.textContent = currentBook?.chapters ?
          currentBook.chapters[currentIndex]?.title || `第${currentIndex + 1}章` :
          '加载中...';

        // 更新章节导航状态
        prevButton.disabled = currentIndex <= 0 || pipWindow.isLoading;
        nextButton.disabled = !currentBook?.chapters || currentIndex >= (currentBook.chapters.length - 1) || pipWindow.isLoading;
        controls.childNodes[1].textContent = `${currentIndex + 1}/${currentBook?.chapters?.length || '?'}`;

        // 填充内容
        const content = document.createElement('div');
        content.id = 'pip-content';
        // 恢复原有的边距样式
        content.style.paddingTop = '35px'; // 仅保留控制栏所需的空间
        content.style.paddingLeft = '16px'; // 添加左边距
        content.style.paddingRight = '16px'; // 添加右边距

        // 始终使用最新的章节内容引用
        const currentChapterContent = chapterContentRef.current;
        // 获取缩进em数
        const indentEm = settings.paragraphIndent !== undefined ? settings.paragraphIndent : 2;
        if (currentChapterContent) {
          currentChapterContent.split('\n').forEach((paragraph, idx) => {
            if (paragraph.trim()) {
              // 去除所有前导空格
              let cleanText = paragraph.replace(/^[\s\u3000]+/, '');
              const p = document.createElement('p');
              p.textContent = cleanText;
              p.style.textIndent = `${indentEm}em`;
              p.style.margin = '0.5em 0';
              p.style.padding = '3px 0';
              p.style.borderRadius = '3px';
              p.style.transition = 'background-color 0.3s';
              content.appendChild(p);
            } else {
              content.appendChild(document.createElement('br'));
            }
          });
        }

        contentContainer.appendChild(content);

        // 恢复自动高度，不设置margin和padding
        contentContainer.style.minHeight = 'auto';

        // 立即滚动到顶部（不使用延时）
        pipWindowRef.current.document.body.scrollTop = 0;
        pipWindowRef.current.document.documentElement.scrollTop = 0;
        pipWindowRef.current.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto'
        });
        contentContainer.scrollTop = 0;

        // 重置加载状态
        pipWindow.isLoading = false;
      } catch (error) {
        console.error('更新画中画内容失败:', error);
      }
    };

    // 将更新函数和加载指示器函数存储到ref中，以便后续使用
    readerContentRef.current = {
      updatePipContent,
      showLoadingIndicator,
      pipWindow: pipWindowRef.current // 存储窗口引用
    };

    message.success({ content: '已打开画中画模式', key: 'pipLoading' });
  } catch (error) {
    console.error('画中画模式启动失败:', error);
    message.error({ content: '画中画模式启动失败', key: 'pipLoading' });
    setIsPipActive(false);
    pipWindowRef.current = null;
  }
};

// 当章节内容或索引改变时，更新画中画内容
useEffect(() => {
  if (isPipActive && readerContentRef.current && pipWindowRef.current) {
    console.log(`[PIP] 检测到章节更改: 索引=${chapterIndex}, 内容长度=${chapterContent.length}`);
    // 确保等待状态更新完成后再更新画中画内容
    setTimeout(() => {
      if (readerContentRef.current && pipWindowRef.current) {
        console.log(`[PIP] 更新画中画内容`);
        readerContentRef.current.updatePipContent?.(true);
      }
    }, 100);
  }
}, [chapterContent, chapterIndex, isPipActive]);

// 应用主题并更新设置
const applyTheme = useCallback((themeId: string) => {
  try {
    // 查找对应主题，先从所有主题中查找
    const theme = allThemes.find(t => t.id === themeId);
    if (!theme) {
      message.error('主题不存在');
      return false;
    }

    // 创建新的设置，合并主题和当前设置
    const currentSettings = settings; // 使用当前最新的settings
    const newSettings: ReaderSettings = {
      ...currentSettings,
      backgroundColor: theme.backgroundColor,
      fontColor: theme.color,
      fontSize: theme.fontSize,
      lineHeight: theme.lineHeight,
      letterSpacing: theme.letterSpacing,
      themeId: theme.id,
      // 保留当前的不透明度设置
      opacity: currentSettings.opacity
    };

    // 如果主题有指定字体，则更新字体
    if (theme.fontFamily) {
      newSettings.fontFamily = theme.fontFamily;
    }

    // 更新当前主题ID
    setCurrentThemeId(themeId);

    // 保存设置
    setSettings(newSettings);
    localStorage.setItem('fish-reader-settings', JSON.stringify(newSettings));

    // 如果在画中画模式，也更新画中画窗口样式
    if (isPipActive && readerContentRef.current && pipWindowRef.current) {
      try {
        const pipWindow = pipWindowRef.current;
        pipWindow.document.body.style.backgroundColor = newSettings.backgroundColor;
        pipWindow.document.body.style.color = newSettings.fontColor;
        pipWindow.document.body.style.fontFamily = newSettings.fontFamily;
        pipWindow.document.body.style.fontSize = `${newSettings.fontSize}px`;
        pipWindow.document.body.style.lineHeight = String(newSettings.lineHeight);

        if (newSettings.letterSpacing !== undefined) {
          pipWindow.document.body.style.letterSpacing = `${newSettings.letterSpacing}px`;
        }
      } catch (e) {
        console.error('更新画中画样式失败:', e);
      }
    }

    message.success(`已应用"${theme.name}"主题`);
    return true;
  } catch (error) {
    console.error('应用主题失败:', error);
    message.error('应用主题失败');
    return false;
  }
}, [settings, isPipActive, allThemes]);

// 保存自定义主题
const saveUserTheme = useCallback((theme: Theme) => {
  try {
    // 确保主题有必要的属性
    if (!theme.id || !theme.name) {
      message.error('主题信息不完整');
      return false;
    }

    // 标记为自定义主题
    const finalTheme: Theme = {
      ...theme,
      isCustom: true
    };

    // 更新用户主题列表
    let updatedUserThemes: Theme[];

    // 检查是否已存在相同ID的主题（编辑场景）
    const existingIndex = userThemes.findIndex(t => t.id === theme.id);
    if (existingIndex >= 0) {
      // 更新现有主题
      updatedUserThemes = [...userThemes];
      updatedUserThemes[existingIndex] = finalTheme;
    } else {
      // 添加新主题
      updatedUserThemes = [...userThemes, finalTheme];
    }

    // 更新状态
    setUserThemes(updatedUserThemes);

    // 合并系统和用户主题
    const updatedAllThemes = [...PRESET_THEMES, ...updatedUserThemes];
    setAllThemes(updatedAllThemes);

    // 保存到本地存储
    localStorage.setItem('fish-reader-user-themes', JSON.stringify(updatedUserThemes));

    message.success(`已${existingIndex >= 0 ? '更新' : '创建'}主题 "${theme.name}"`);
    return true;
  } catch (error) {
    console.error('保存用户主题失败:', error);
    message.error('保存主题失败');
    return false;
  }
}, [userThemes]);

// 删除用户自定义主题
const deleteUserTheme = useCallback((themeId: string) => {
  try {
    // 检查是否是当前使用的主题
    if (themeId === currentThemeId) {
      // 如果要删除的是当前主题，先切换到默认主题
      applyTheme('default');
    }

    // 过滤掉要删除的主题
    const updatedUserThemes = userThemes.filter(theme => theme.id !== themeId);

    // 更新状态
    setUserThemes(updatedUserThemes);

    // 合并系统和用户主题
    const updatedAllThemes = [...PRESET_THEMES, ...updatedUserThemes];
    setAllThemes(updatedAllThemes);

    // 更新本地存储
    localStorage.setItem('fish-reader-user-themes', JSON.stringify(updatedUserThemes));

    message.success('已删除自定义主题');
    return true;
  } catch (error) {
    console.error('删除用户主题失败:', error);
    message.error('删除主题失败');
    return false;
  }
}, [userThemes, currentThemeId, applyTheme]);

// 生成唯一主题ID
const generateThemeId = (): string => {
  return 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
};

// 修改创建新主题函数，移除编辑功能
const openThemeCreator = useCallback(() => {
  // 创建新主题，基于当前设置
  const newTheme: Theme = {
    id: generateThemeId(),
    name: '新主题',
    backgroundColor: settings.backgroundColor,
    color: settings.fontColor,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    letterSpacing: settings.letterSpacing || 0,
    fontFamily: settings.fontFamily,
    isCustom: true
  };
  setEditingTheme(newTheme);

  // 显示创建窗口
  setShowThemeCreator(true);
}, [settings]);

// 保存阅读设置
const saveSettings = useCallback((newSettings: ReaderSettings) => {
  try {
    // 更新状态
    setSettings(newSettings);

    // 如果有主题ID，同步更新
    if (newSettings.themeId) {
      setCurrentThemeId(newSettings.themeId);
    }

    // 保存到本地存储
    localStorage.setItem('fish-reader-settings', JSON.stringify(newSettings));

    // 如果在画中画模式，也更新画中画内容
    if (isPipActive && readerContentRef.current && pipWindowRef.current) {
      // 更新画中画窗口的样式
      try {
        const pipWindow = pipWindowRef.current;
        pipWindow.document.body.style.backgroundColor = newSettings.backgroundColor;
        pipWindow.document.body.style.color = newSettings.fontColor;
        pipWindow.document.body.style.fontFamily = newSettings.fontFamily;
        pipWindow.document.body.style.fontSize = `${newSettings.fontSize}px`;
        pipWindow.document.body.style.lineHeight = String(newSettings.lineHeight);

        // 添加对字间距的支持
        if (newSettings.letterSpacing !== undefined) {
          pipWindow.document.body.style.letterSpacing = `${newSettings.letterSpacing}px`;
        }
      } catch (e) {
        console.error('更新画中画样式失败:', e);
      }
    }

    return true;
  } catch (error) {
    console.error('保存设置失败:', error);
    message.error('保存设置失败');
    return false;
  }
}, [isPipActive]);

// 渲染主题设置面板
const renderThemesPanel = () => {
  return (
    <div style={{ width: "100%", padding: '8px 0', backgroundColor: token.colorBgContainer }}>
      {/* 创建新主题按钮，放在最顶部并居中 */}
      <div style={{
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'center',
        padding: '8px 0'
      }}>
        <Button
          type="primary"
          icon={<SettingOutlined />}
          onClick={() => openThemeCreator()}
          style={{ fontWeight: 'bold', width: '80%' }}
        >
          创建新主题
        </Button>
      </div>

      <div style={{ marginBottom: 8, fontWeight: 'bold' }}>系统主题</div>

      {/* 系统主题列表 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        maxHeight: '400px',
        overflowY: 'auto',
        backgroundColor: token.colorBgContainer,
        marginBottom: 16
      }}>
        {PRESET_THEMES.map(theme => (
          <div
            key={theme.id}
            onClick={() => applyTheme(theme.id)}
            style={{
              padding: '10px',
              backgroundColor: theme.backgroundColor,
              color: theme.color,
              borderRadius: '4px',
              cursor: 'pointer',
              border: theme.id === currentThemeId ? '2px solid #1890ff' : '1px solid #d9d9d9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '70px', // 稍微减小高度
              boxShadow: theme.id === currentThemeId ? '0 0 8px rgba(24,144,255,0.5)' : 'none',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
              {theme.name}
            </div>
            <div style={{
              marginTop: '5px',
              fontSize: '10px',
              lineHeight: '1.4',
              textAlign: 'center'
            }}>
              Aa
            </div>
          </div>
        ))}
      </div>

      {/* 用户自定义主题区域 */}
      {userThemes.length > 0 && (
        <>
          <div style={{ marginBottom: 8, marginTop: 16, fontWeight: 'bold' }}>我的主题</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: token.colorBgContainer
          }}>
            {userThemes.map(theme => (
              <div
                key={theme.id}
                style={{
                  padding: '10px',
                  backgroundColor: theme.backgroundColor,
                  color: theme.color,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: theme.id === currentThemeId ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  boxShadow: theme.id === currentThemeId ? '0 0 8px rgba(24,144,255,0.5)' : 'none',
                  transition: 'all 0.3s',
                  position: 'relative',
                  height: '70px'
                }}
                onClick={() => applyTheme(theme.id)}
              >
                <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
                  {theme.name}
                </div>
                <div style={{
                  marginTop: '5px',
                  fontSize: '10px',
                  lineHeight: '1.4',
                  textAlign: 'center'
                }}>
                  Aa
                </div>

                {/* 删除按钮 - 始终显示在右下角 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 3px rgba(0,0,0,0.2)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    Modal.confirm({
                      title: '确认删除',
                      content: `确定要删除"${theme.name}"主题吗？`,
                      onOk: () => deleteUserTheme(theme.id),
                      zIndex: 2100 // 确保在所有内容之上
                    });
                  }}
                >
                  <DeleteOutlined style={{ fontSize: '12px', color: '#ff4d4f' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// 渲染设置面板内容
const renderSettingsPanel = () => {
  // 增加一个状态用于标签切换
  const [settingsTab, setSettingsTab] = useState<'reading' | 'theme' | 'tts'>('reading');

  return (
    <div style={{ width: 300, padding: '8px 0', backgroundColor: token.colorBgContainer, borderRadius: '4px' }}>
      <div style={{ display: 'flex', marginBottom: 16, backgroundColor: token.colorFillTertiary }}>
        <div
          onClick={() => setSettingsTab('reading')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: settingsTab === 'reading' ? 'bold' : 'normal',
            borderBottom: settingsTab === 'reading' ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
            backgroundColor: settingsTab === 'reading' ? token.colorBgContainer : 'transparent',
            color: token.colorText,
            flex: 1,
            textAlign: 'center'
          }}
        >
          阅读设置
        </div>
        <div
          onClick={() => setSettingsTab('theme')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: settingsTab === 'theme' ? 'bold' : 'normal',
            borderBottom: settingsTab === 'theme' ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
            backgroundColor: settingsTab === 'theme' ? token.colorBgContainer : 'transparent',
            color: token.colorText,
            flex: 1,
            textAlign: 'center'
          }}
        >
          主题设置
        </div>
        <div
          onClick={() => setSettingsTab('tts')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: settingsTab === 'tts' ? 'bold' : 'normal',
            borderBottom: settingsTab === 'tts' ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
            backgroundColor: settingsTab === 'tts' ? token.colorBgContainer : 'transparent',
            color: token.colorText,
            flex: 1,
            textAlign: 'center'
          }}
        >
          朗读设置
        </div>
      </div>

      <div style={{ padding: '0 16px', backgroundColor: token.colorBgContainer, color: token.colorText }}>
        {settingsTab === 'theme' && renderThemesPanel()}
        {settingsTab === 'reading' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>字体选择</div>
              <Select
                value={settings.fontFamily}
                onChange={(value) => saveSettings({ ...settings, fontFamily: value })}
                style={{ width: '100%' }}
                options={FONT_FAMILIES}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>段前缩进：{settings.paragraphIndent !== undefined ? settings.paragraphIndent : 2} 空格</div>
              <Slider
                min={0}
                max={4}
                step={1}
                value={settings.paragraphIndent !== undefined ? settings.paragraphIndent : 2}
                onChange={(value) => saveSettings({ ...settings, paragraphIndent: value })}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>字体大小: {settings.fontSize}px</div>
              <Slider
                min={12}
                max={28}
                value={settings.fontSize}
                onChange={(value) => saveSettings({ ...settings, fontSize: value })}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>行高: {settings.lineHeight}</div>
              <Slider
                min={1}
                max={3}
                step={0.1}
                value={settings.lineHeight}
                onChange={(value) => saveSettings({ ...settings, lineHeight: value })}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>字间距: {settings.letterSpacing !== undefined ? settings.letterSpacing : 0}px</div>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={settings.letterSpacing !== undefined ? settings.letterSpacing : 0}
                onChange={(value) => saveSettings({ ...settings, letterSpacing: value })}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>不透明度: {Math.round(settings.opacity * 100)}%</div>
              <Slider
                min={0.5}
                max={1}
                step={0.05}
                value={settings.opacity}
                onChange={(value) => saveSettings({ ...settings, opacity: value })}
              />
            </div>

            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>字体颜色</div>
                <ColorPicker
                  value={settings.fontColor}
                  onChange={(color, hex) => saveSettings({ ...settings, fontColor: hex as string })}
                  presets={[
                    {
                      label: '推荐',
                      colors: [
                        '#000000', '#333333', '#666666', '#999999',
                        '#594433', '#4C3D2E', '#5C4033', '#3C2F2F'
                      ],
                    }
                  ]}
                />
              </div>

              <div>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>背景颜色</div>
                <ColorPicker
                  value={settings.backgroundColor}
                  onChange={(color, hex) => saveSettings({ ...settings, backgroundColor: hex as string })}
                  presets={[
                    {
                      label: '推荐',
                      colors: [
                        '#FFFFFF', '#F5F5DC', '#FAF9DE', '#FFF2E2',
                        '#FDE6E0', '#f5f5f5', '#E3EDCD', '#DCE2F1',
                        '#EDDEE5'
                      ],
                    }
                  ]}
                />
              </div>
            </div>

            {/* 添加恢复默认样式的按钮 */}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <Button
                type="primary"
                onClick={() => saveSettings(DEFAULT_SETTINGS)}
              >
                恢复默认样式
              </Button>
            </div>
          </>
        )}
        {settingsTab === 'tts' && (
          <>
            {/* 朗读功能开关 */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 'bold' }}>启用朗读功能</div>
              <div
                style={{
                  width: '44px',
                  height: '22px',
                  backgroundColor: settings.ttsEnabled ? '#1890ff' : '#ccc',
                  borderRadius: '11px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.3s'
                }}
                onClick={() => saveSettings({ ...settings, ttsEnabled: !settings.ttsEnabled })}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: '18px',
                    height: '18px',
                    backgroundColor: '#fff',
                    borderRadius: '9px',
                    top: '2px',
                    left: settings.ttsEnabled ? '24px' : '2px',
                    transition: 'left 0.3s'
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '10px',
              backgroundColor: '#fffbe6',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '12px',
              color: '#876800',
              display: 'flex',
              alignItems: 'flex-start'
            }}>
              <div style={{ marginRight: '8px', fontSize: '14px' }}>ⓘ</div>
              <div>启用朗读功能后，点击朗读按钮开始朗读，可以点击段落跳转到该段落继续朗读</div>
            </div>

            <div style={{ marginBottom: 16, opacity: settings.ttsEnabled ? 1 : 0.5, pointerEvents: settings.ttsEnabled ? 'auto' : 'none' }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>选择声音</div>
              <Select
                value={selectedVoice}
                onChange={(value) => setSelectedVoice(value)}
                style={{ width: '100%' }}
                disabled={!settings.ttsEnabled}
                options={availableVoices.map(voice => ({
                  value: voice.voiceURI,
                  label: `${voice.name} (${voice.lang})`
                }))}
              />
            </div>

            <div style={{ marginBottom: 16, opacity: settings.ttsEnabled ? 1 : 0.5, pointerEvents: settings.ttsEnabled ? 'auto' : 'none' }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>语速: {settings.speechRate}</div>
              <Slider
                min={0.5}
                max={2}
                step={0.1}
                value={settings.speechRate || 1}
                onChange={(value) => saveSettings({ ...settings, speechRate: value })}
                disabled={!settings.ttsEnabled}
              />
            </div>

            <div style={{ marginBottom: 16, opacity: settings.ttsEnabled ? 1 : 0.5, pointerEvents: settings.ttsEnabled ? 'auto' : 'none' }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>音调: {settings.speechPitch}</div>
              <Slider
                min={0.5}
                max={2}
                step={0.1}
                value={settings.speechPitch || 1}
                onChange={(value) => saveSettings({ ...settings, speechPitch: value })}
                disabled={!settings.ttsEnabled}
              />
            </div>

            <div style={{ marginBottom: 16, opacity: settings.ttsEnabled ? 1 : 0.5, pointerEvents: settings.ttsEnabled ? 'auto' : 'none' }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>音量: {Math.round((settings.speechVolume || 1) * 100)}%</div>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={settings.speechVolume || 1}
                onChange={(value) => saveSettings({ ...settings, speechVolume: value })}
                disabled={!settings.ttsEnabled}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// 渲染主题创建器模态框
const renderThemeCreator = () => {
  // 只在编辑主题时渲染
  if (!editingTheme) return null;

  return (
    <Modal
      title="创建新主题"
      open={showThemeCreator}
      onCancel={() => setShowThemeCreator(false)}
      footer={[
        <Button key="cancel" onClick={() => setShowThemeCreator(false)}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={() => {
            if (editingTheme) {
              saveUserTheme(editingTheme);
              setShowThemeCreator(false);
            }
          }}
        >
          保存
        </Button>
      ]}
      width={400}
      zIndex={2000} // 确保显示在最顶层
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 10px' }}>
        {/* 主题预览 */}
        <div style={{
          marginBottom: 16,
          padding: '15px',
          backgroundColor: editingTheme.backgroundColor,
          color: editingTheme.color,
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: `${editingTheme.fontSize}px`,
            lineHeight: String(editingTheme.lineHeight),
            letterSpacing: `${editingTheme.letterSpacing}px`,
            fontFamily: editingTheme.fontFamily || 'Arial, sans-serif'
          }}>
            阅读预览效果
          </div>
        </div>

        {/* 主题名称 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>主题名称</div>
          <input
            type="text"
            value={editingTheme.name}
            onChange={(e) => setEditingTheme({...editingTheme, name: e.target.value})}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px'
            }}
            placeholder="请输入主题名称"
          />
        </div>

        {/* 字体选择 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>字体</div>
          <Select
            value={editingTheme.fontFamily}
            onChange={(value) => setEditingTheme({...editingTheme, fontFamily: value})}
            style={{ width: '100%' }}
            options={FONT_FAMILIES}
          />
        </div>

        {/* 字体大小 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>字体大小: {editingTheme.fontSize}px</div>
          <Slider
            min={12}
            max={28}
            value={editingTheme.fontSize}
            onChange={(value) => setEditingTheme({...editingTheme, fontSize: value})}
          />
        </div>

        {/* 行高 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>行高: {editingTheme.lineHeight}</div>
          <Slider
            min={1}
            max={3}
            step={0.1}
            value={editingTheme.lineHeight}
            onChange={(value) => setEditingTheme({...editingTheme, lineHeight: value})}
          />
        </div>

        {/* 字间距 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>字间距: {editingTheme.letterSpacing}px</div>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={editingTheme.letterSpacing}
            onChange={(value) => setEditingTheme({...editingTheme, letterSpacing: value})}
          />
        </div>

        {/* 颜色选择器 */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>字体颜色</div>
            <ColorPicker
              value={editingTheme.color}
              onChange={(color, hex) => setEditingTheme({...editingTheme, color: hex as string})}
              presets={[
                {
                  label: '推荐',
                  colors: [
                    '#000000', '#333333', '#666666', '#999999',
                    '#594433', '#4C3D2E', '#5C4033', '#3C2F2F'
                  ],
                }
              ]}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>背景颜色</div>
            <ColorPicker
              value={editingTheme.backgroundColor}
              onChange={(color, hex) => setEditingTheme({...editingTheme, backgroundColor: hex as string})}
              presets={[
                {
                  label: '推荐',
                  colors: [
                    '#FFFFFF', '#F5F5DC', '#FAF9DE', '#FFF2E2',
                    '#FDE6E0', '#f5f5f5', '#E3EDCD', '#DCE2F1',
                    '#EDDEE5'
                  ],
                }
              ]}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

// 初始化语音合成
useEffect(() => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesisRef.current = window.speechSynthesis;

    // 初始化获取可用的声音
    const loadVoices = () => {
      const voices = speechSynthesisRef.current?.getVoices() || [];
      setAvailableVoices(voices);

      // 尝试找到中文声音或默认声音
      const chineseVoice = voices.find(voice =>
        voice.lang.includes('zh') || voice.lang.includes('cmn')
      );

      if (chineseVoice) {
        setSelectedVoice(chineseVoice.voiceURI);
      } else if (voices.length > 0) {
        setSelectedVoice(voices[0].voiceURI);
      }
    };

    // Chrome和Safari的声音加载机制不同，需要兼容处理
    if (speechSynthesisRef.current.onvoiceschanged !== undefined) {
      speechSynthesisRef.current.onvoiceschanged = loadVoices;
    }

    // 立即尝试加载一次
    loadVoices();
  }

  return () => {
    // 组件卸载时停止语音合成
    if (speechSynthesisRef.current && speechSynthesisRef.current.speaking) {
      speechSynthesisRef.current.cancel();
    }
  };
}, []);

// 处理章节内容变更时更新段落
useEffect(() => {
  if (chapterContent) {
    const newParagraphs = chapterContent.split('\n').filter(p => p.trim() !== '');
    setParagraphs(newParagraphs);

    // 章节内容变更时停止朗读
    if (speechSynthesisRef.current && speechSynthesisRef.current.speaking) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
      setCurrentHighlightedIndex(-1);
    }
  }
}, [chapterContent]);

// 从指定段落开始朗读
const startSpeaking = useCallback((startIndex: number) => {
  if (!speechSynthesisRef.current || paragraphs.length === 0) {
    return;
  }

  // 检查朗读功能是否启用
  if (!settings.ttsEnabled) {
    message.warning('请先在设置中启用朗读功能');
    return;
  }

  // 先取消之前的朗读
  speechSynthesisRef.current.cancel();

  // 从指定段落开始
  const contentToSpeak = paragraphs.slice(startIndex).join("\n");

  const utterance = new SpeechSynthesisUtterance(contentToSpeak);
  utteranceRef.current = utterance;

  // 设置语音参数
  utterance.rate = settings.speechRate || 1;
  utterance.pitch = settings.speechPitch || 1;
  utterance.volume = settings.speechVolume || 1;

  // 设置选择的声音
  if (selectedVoice) {
    const voice = availableVoices.find(v => v.voiceURI === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
  }

  // 当前正在朗读的文本索引
  let currentIndex = startIndex;
  setCurrentHighlightedIndex(currentIndex);

  // 监听朗读进度
  utterance.onboundary = (event) => {
    // 获取当前朗读的字符位置
    const charIndex = event.charIndex;
    let totalChars = 0;
    let paragraphIndex = startIndex;

    // 计算当前正在朗读的段落
    for (let i = startIndex; i < paragraphs.length; i++) {
      const paragraphLength = paragraphs[i].length + 1; // +1 for the newline
      if (totalChars + paragraphLength > charIndex) {
        paragraphIndex = i;
        break;
      }
      totalChars += paragraphLength;
    }

    // 更新高亮段落
    if (paragraphIndex !== currentIndex) {
      currentIndex = paragraphIndex;
      setCurrentHighlightedIndex(currentIndex);

      // 滚动到可视区域
      const highlightedElement = document.getElementById(`paragraph-${currentIndex}`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // 朗读结束处理
  utterance.onend = () => {
    setIsSpeaking(false);
    setCurrentHighlightedIndex(-1);
  };

  // 开始朗读
  speechSynthesisRef.current.speak(utterance);
  setIsSpeaking(true);
}, [paragraphs, settings.speechRate, settings.speechPitch, settings.speechVolume, settings.ttsEnabled, selectedVoice, availableVoices]);

// 开始/暂停朗读
const toggleSpeech = useCallback(() => {
  if (!speechSynthesisRef.current) {
    message.error('您的浏览器不支持语音合成功能');
    return;
  }

  // 检查朗读功能是否启用
  if (!settings.ttsEnabled) {
    message.warning('请先在设置中启用朗读功能');
    return;
  }

  if (isSpeaking) {
    // 暂停朗读
    speechSynthesisRef.current.pause();
    setIsSpeaking(false);
  } else {
    if (speechSynthesisRef.current.paused) {
      // 继续之前暂停的朗读
      speechSynthesisRef.current.resume();
      setIsSpeaking(true);
    } else {
      // 从头开始朗读
      startSpeaking(0);
    }
  }
}, [isSpeaking, startSpeaking, settings.ttsEnabled]);

// 点击段落开始从该位置朗读
const handleParagraphClick = useCallback((index: number) => {
  // 只有在启用朗读功能且朗读模式激活时才响应点击
  if ((settings.ttsEnabled && isSpeaking) || (settings.ttsEnabled && speechSynthesisRef.current?.paused)) {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    startSpeaking(index);
  }
  // 在非朗读模式或朗读功能未启用时点击段落不做任何处理
}, [isSpeaking, startSpeaking, settings.ttsEnabled]);

// 停止朗读
const stopSpeaking = useCallback(() => {
  if (speechSynthesisRef.current) {
    speechSynthesisRef.current.cancel();
    setIsSpeaking(false);
    setCurrentHighlightedIndex(-1);
  }
}, []);

// 在组件卸载时停止朗读
useEffect(() => {
  return () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
  };
}, []);

// 强制更新进度时同时停止朗读
const enhancedForceUpdateReadingProgress = () => {
  // 原有的进度保存逻辑
  forceUpdateReadingProgress();

  // 停止朗读
  if (speechSynthesisRef.current && speechSynthesisRef.current.speaking) {
    speechSynthesisRef.current.cancel();
    setIsSpeaking(false);
    setCurrentHighlightedIndex(-1);
  }
};



// 修改内容区域渲染，添加段落点击和高亮功能
// 在renderChapterList函数上方添加
const renderContent = () => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p>未找到书籍</p>
        <Button type="primary" onClick={() => window.location.href = '/reader'}>
          返回书架
        </Button>
      </div>
    );
  }

  if (!book.chapters || book.chapters.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p>章节列表为空，请尝试重新加载</p>
        <Button type="primary" onClick={handleReload}>
          重新加载
        </Button>
      </div>
    );
  }


  // 普通模式：显示正常内容
  // 只用 text-indent，不加全角空格
  const indentEm = settings.paragraphIndent !== undefined ? settings.paragraphIndent : 2;
  return (
    <>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
        {book.chapters[chapterIndex]?.title || `第${chapterIndex + 1}章`}
      </h2>
      <div>
        {paragraphs.map((paragraph, index) => {
          // 去除所有前导空格
          let cleanText = paragraph.replace(/^[\s\u3000]+/, '');
          return (
            <p
              key={index}
              id={`paragraph-${index}`}
              onClick={() => handleParagraphClick(index)}
              style={{
                textIndent: `${indentEm}em`,
                margin: '0.5em 0',
                padding: '3px 0',
                cursor: settings.ttsEnabled && (isSpeaking || speechSynthesisRef.current?.paused) ? 'pointer' : 'text',
                backgroundColor: currentHighlightedIndex === index ? '#fffbe6' : 'transparent',
                borderRadius: '3px',
                transition: 'background-color 0.3s'
              }}
            >
              {cleanText}
            </p>
          );
        })}
      </div>
    </>
  );
};

// 如果不可见则不渲染
if (!visible) return null;

// 摸鱼模式：显示伪装界面覆盖整个页面
if (isMoyuMode) {
  // 仿 Office：灰底工作区 + 白纸黑字（不跟随站点深色，避免与 word.css 正文色冲突）
  const wordOuterBg = 'rgb(224, 224, 224)';
  const wordSheetBg = '#e6e6e6';
  const wordPageBg = '#ffffff';
  const wordTextColor = '#333333';
  const wordMutedColor = '#acacac';

  return createPortal(
    <>
      {/* 引用 word.css 样式文件 */}
      <link rel="stylesheet" href="/word.css" />
      <style>{`
        .read-theme-word .page-content,
        .read-theme-word #article,
        .read-theme-word .chapter-content,
        .read-theme-word .read-header,
        .read-theme-word .chapter-title,
        .read-theme-word .chapter-content p,
        .read-theme-word .chapter-content.isTxt p {
          background-color: ${wordPageBg} !important;
          color: ${wordTextColor} !important;
        }
        .read-theme-word .page-breadcrumb,
        .read-theme-word .page-breadcrumb-item,
        .read-theme-word .page-breadcrumb span {
          color: #666666 !important;
        }
        .read-theme-word .page-content {
          box-sizing: border-box;
          padding: 24px 48px 48px;
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: wordOuterBg,
          zIndex: 9999,
          overflow: 'auto'
        }}
      >
      {/* 完全模仿 index.html 的结构和类名 */}
      <div id="__nuxt">
        <div id="__layout">
          <div className="default" data-v-31a8d428="">
            <div
              id="bookRead"
              className="book-read main read-theme-word"
              style={{ backgroundColor: wordSheetBg }}
              data-v-0cc19a20=""
              data-v-31a8d428=""
            >

              {/* Word Header - 完全按照 index.html 结构 */}
              <div className="word-header" data-v-3fda83c4="" data-v-0cc19a20="">
                <div className="word-header-title" data-v-3fda83c4=""></div>
                <div className="word-header-top" data-v-3fda83c4="">
                  <div className="word-header-top-l" data-v-3fda83c4=""></div>
                  <div className="word-header-top-r" data-v-3fda83c4=""></div>
                </div>
                <div className="word-header-bottom" data-v-3fda83c4="">
                  <div className="word-header-bottom-l" data-v-3fda83c4=""></div>
                  <div className="word-header-bottom-m" data-v-3fda83c4=""></div>
                  <div className="word-header-bottom-r" data-v-3fda83c4="">
                    <div
                      className="exit"
                      data-v-3fda83c4=""
                      onClick={() => setIsMoyuMode(false)}
                      style={{ cursor: 'pointer' }}
                    >
                      退出Word模式
                    </div>
                  </div>
                </div>
                <div className="close" data-v-3fda83c4=""></div>
              </div>

              {/* Word Footer - 完全按照 index.html 结构 */}
              <div className="word-footer" data-v-53a0721a="" data-v-0cc19a20="">
                <div className="word-footer-l" data-v-53a0721a=""></div>
                <div className="word-footer-m" data-v-53a0721a="" style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '30px',
                  height: '100%'
                }}>
                  <div
                    style={{
                      cursor: 'pointer',
                      color: wordMutedColor,
                      fontSize: '14px'
                    }}
                    onClick={() => {
                      if (chapterIndex > 0) {
                        changeChapter(chapterIndex - 1);
                        // 滚动到页面顶部
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        // 滚动摸鱼模式容器到顶部
                        setTimeout(() => {
                          const moyuContainer = document.querySelector('[style*="position: fixed"][style*="z-index: 9999"]');
                          if (moyuContainer) {
                            moyuContainer.scrollTop = 0;
                          }
                        }, 100);
                      }
                    }}
                  >
                    <span data-v-53a0721a="">上一章</span>
                  </div>
                  <div
                    style={{
                      cursor: 'pointer',
                      color: wordMutedColor,
                      fontSize: '14px'
                    }}
                    onClick={() => {
                      if (book && book.chapters && chapterIndex < book.chapters.length - 1) {
                        changeChapter(chapterIndex + 1);
                        // 滚动到页面顶部
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        // 滚动摸鱼模式容器到顶部
                        setTimeout(() => {
                          const moyuContainer = document.querySelector('[style*="position: fixed"][style*="z-index: 9999"]');
                          if (moyuContainer) {
                            moyuContainer.scrollTop = 0;
                          }
                        }, 100);
                      }
                    }}
                  >
                    <span data-v-53a0721a="">下一章</span>
                  </div>
                </div>
                <div className="word-footer-r" data-v-53a0721a=""></div>
              </div>

              {/* Page Content - 完全按照 index.html 结构 */}
              <div
                className="page-content"
                style={{
                  width: '100%',
                  maxWidth: 900,
                  margin: '0 auto',
                  backgroundColor: wordPageBg,
                  color: wordTextColor,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                }}
                data-v-0cc19a20=""
              >
                <div className="page-breadcrumb" data-v-0cc19a20="">
                  <a title="QQ阅读小说网" target="_blank" href="//book.qq.com" className="page-breadcrumb-item ypc-link" data-v-0cc19a20="">
                    首页
                  </a>
                  <span data-v-0cc19a20="">&gt;</span>
                </div>
                <div className="read-header" data-v-126daad9="" data-v-0cc19a20="">
                  <h1 className="chapter-title" data-v-126daad9="">
                    {book?.chapters?.[chapterIndex]?.title || `第${chapterIndex + 1}章`}
                  </h1>
                </div>
                <div
                  id="article"
                  className="chapter-content isTxt"
                  style={{ fontSize: '16px', color: wordTextColor, backgroundColor: wordPageBg }}
                  data-v-0cc19a20=""
                >
                  {chapterContent.split('\n').map((paragraph, index) => {
                    if (paragraph.trim()) {
                      const cleanText = paragraph.replace(/^[\s\u3000]+/, '');
                      return (
                        <p key={index} style={{ color: wordTextColor, lineHeight: 1.8, margin: '0 0 1em' }}>
                          {cleanText}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>,
    document.body
  );
}

// 返回渲染结果
const scrollTrack = token.colorBgContainer;
const scrollThumb = token.colorFillSecondary;
const scrollThumbHover = token.colorTextQuaternary;

return createPortal(
  <>
    <style>{`
      .floating-reader-scroll,
      .floating-reader-chapter-panel {
        scrollbar-width: thin;
        scrollbar-color: ${scrollThumb} ${scrollTrack};
      }
      .floating-reader-scroll::-webkit-scrollbar,
      .floating-reader-chapter-panel::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      .floating-reader-scroll::-webkit-scrollbar-track,
      .floating-reader-chapter-panel::-webkit-scrollbar-track {
        background: ${scrollTrack};
      }
      .floating-reader-scroll::-webkit-scrollbar-thumb,
      .floating-reader-chapter-panel::-webkit-scrollbar-thumb {
        background-color: ${scrollThumb};
        border-radius: 5px;
        border: 2px solid ${scrollTrack};
      }
      .floating-reader-scroll::-webkit-scrollbar-thumb:hover,
      .floating-reader-chapter-panel::-webkit-scrollbar-thumb:hover {
        background-color: ${scrollThumbHover};
      }
      .floating-reader-scroll::-webkit-scrollbar-corner,
      .floating-reader-chapter-panel::-webkit-scrollbar-corner {
        background: ${scrollTrack};
      }
    `}</style>
    {/* 背景遮罩 */}
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isClickThrough ? 'transparent' : 'rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        pointerEvents: isClickThrough ? 'none' : 'auto'
      }}
      onClick={isClickThrough ? undefined : enhancedHandleClose}
    />

    {/* 阅读器窗口 */}
    <div
      ref={readerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: size.width,
        height: size.height,
        transform: `translate(${position.x}px, ${position.y}px)`,
        backgroundColor: displaySettings.backgroundColor,
        opacity: settings.opacity,
        borderRadius: 8,
        boxShadow: token.boxShadowSecondary,
        zIndex: 1001,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
        transition: isDragging || isResizing ? 'none' : 'transform 0.2s, width 0.2s, height 0.2s'
      }}
      onMouseDown={handleDragStart}
      onContextMenu={handleContextMenu}
    >
      {/* 标题栏 */}
      <div
        className="handle"
        style={{
          padding: '8px 12px',
          backgroundColor: token.colorFillSecondary,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          cursor: 'move',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          color: token.colorText,
        }}
      >
        <div>{book?.title || '阅读器'}</div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title={isMoyuMode ? "退出Word模式" : "进入Word模式"}>
            <Button
              type={isMoyuMode ? "primary" : "text"}
              size="small"
              style={{
                backgroundColor: isMoyuMode ? '#ff7875' : 'transparent',
                borderColor: isMoyuMode ? '#ff7875' : 'transparent',
                color: isMoyuMode ? '#fff' : 'inherit'
              }}
              onClick={toggleMoyuMode}
            >
              Word模式
            </Button>
          </Tooltip>

          <Tooltip title={showChapterList ? "关闭章节列表" : "打开章节列表"}>
            <Button
              type={showChapterList ? "primary" : "text"}
              size="small"
              icon={<BarsOutlined />}
              onClick={() => {
                if (showChapterList) {
                  closeChapterList();
                } else {
                  openChapterList();
                }
              }}
              disabled={chapterLoadingState.isLoading}
            />
          </Tooltip>

          {/* 只有在启用朗读功能时才显示朗读按钮 */}
          {settings.ttsEnabled && (
            <Tooltip title={isSpeaking ? "暂停朗读" : "开始朗读"}>
              <Button
                type={isSpeaking ? "primary" : "text"}
                size="small"
                icon={isSpeaking ? <PauseOutlined /> : <SoundOutlined />}
                onClick={toggleSpeech}
                disabled={!paragraphs.length}
              />
            </Tooltip>
          )}

          <Tooltip title="刷新">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleReload}
              disabled={chapterLoadingState.isLoading}
            />
          </Tooltip>

          <Tooltip title={isClickThrough ? "禁用点击穿透" : "启用点击穿透"}>
            <Button
              type={isClickThrough ? "primary" : "text"}
              size="small"
              icon={<BorderOutlined />}
              onClick={toggleClickThrough}
            />
          </Tooltip>

          <Popover
            content={renderSettingsPanel}
            title={<div style={{ color: token.colorText }}>阅读设置</div>}
            trigger="click"
            open={showSettings}
            onOpenChange={setShowSettings}
            placement="bottomRight"
          >
            <Tooltip title="阅读设置">
              <Button
                type={showSettings ? "primary" : "text"}
                size="small"
                icon={<SettingOutlined />}
                onClick={() => setShowSettings(!showSettings)}
              />
            </Tooltip>
          </Popover>

          {isPipSupported && (
            <Tooltip title={isPipActive ? "退出画中画模式" : "画中画模式"}>
              <Button
                type={isPipActive ? "primary" : "text"}
                size="small"
                icon={<BlockOutlined />}
                onClick={handlePictureInPicture}
              />
            </Tooltip>
          )}

          <Tooltip title="关闭">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={enhancedHandleClose}
            />
          </Tooltip>
        </div>
      </div>

      {/* 章节导航栏 */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: token.colorFillTertiary,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: token.colorText,
        }}
      >
        <Button
          size="small"
          onClick={() => changeChapter(chapterIndex - 1)}
          disabled={!book || !book.chapters || chapterIndex <= 0 || chapterLoadingState.isLoading}
        >
          上一章
        </Button>

        <div style={{ fontSize: 14 }}>
          {book && book.chapters ?
            `${chapterIndex + 1}/${book.chapters.length}` :
            '加载中...'
          }
          {chapterLoadingState.isLoading && <Spin size="small" style={{ marginLeft: 8 }} />}
        </div>

        <Button
          size="small"
          onClick={() => changeChapter(chapterIndex + 1)}
          disabled={!book || !book.chapters || chapterIndex >= (book.chapters?.length || 0) - 1 || chapterLoadingState.isLoading}
        >
          下一章
        </Button>
      </div>

      {/* 内容区域 */}
      <div
        ref={contentRef}
        className="floating-reader-scroll"
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          position: 'relative',
          color: displaySettings.fontColor,
          lineHeight: displaySettings.lineHeight,
          fontSize: displaySettings.fontSize,
          fontFamily: displaySettings.fontFamily,
          letterSpacing: displaySettings.letterSpacing !== undefined ? `${displaySettings.letterSpacing}px` : 'normal',
          userSelect: 'text'
        }}
        onScroll={handleScroll}
        onContextMenu={handleContextMenu}
      >
        {renderContent()}
      </div>

      {/* 调整大小的手柄 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 20,
          height: 20,
          cursor: 'nwse-resize',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: token.colorTextQuaternary,
          opacity: isResizing ? 1 : 0.5
        }}
        onMouseDown={handleResizeStart}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            fill="currentColor"
            d="M9,9 H7 V7 H9 V9 M9,6 H7 V4 H9 V6 M6,9 H4 V7 H6 V9 M3,9 H1 V7 H3 V9"
          />
        </svg>
      </div>
    </div>

    {/* 章节列表弹窗 */}
    {showChapterList && (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          maxWidth: '400px',
          height: '80%',
          backgroundColor: token.colorBgElevated,
          boxShadow: token.boxShadowSecondary,
          borderRadius: '8px',
          zIndex: 1050,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          paddingBottom: '8px'
        }}>
          <h3 style={{ margin: 0, color: token.colorText }}>章节列表</h3>
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={closeChapterList}
          />
        </div>

        {/* 章节列表内容 */}
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' }}>
          {renderChapterList()}
        </div>
      </div>
    )}

    {/* 帮助提示 */}
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        fontSize: 12,
        color: '#999',
        pointerEvents: 'none',
        opacity: 0.6,
        zIndex: 1002,
        display: !isClickThrough && !showChapterList ? 'block' : 'none'
      }}
    >
      快捷键: ← → (翻页) | Ctrl+C (章节) | Ctrl+T (点击穿透) | 右键(菜单)
    </div>

    {/* 主题创建器模态框 */}
    {renderThemeCreator()}
  </>,
  document.body
);

}

export default GlobalReader;
