import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Button, Card, Drawer, Empty, Input, List, Slider, Space, Typography, Spin, message, Modal, Select, Tabs, Dropdown, Menu, Checkbox, Switch} from 'antd';
import {
  SettingOutlined,
  SearchOutlined,
  StepBackwardOutlined,
  PlayCircleFilled,
  PauseCircleFilled,
  StepForwardOutlined,
  RetweetOutlined,
  ReloadOutlined,
  SwapOutlined,
  UnorderedListOutlined,
  MoreOutlined,
  PlusOutlined,
  SoundOutlined,
  ThunderboltOutlined,
  SlidersOutlined,
} from '@ant-design/icons';
import './index.less';
import { parseNeteaseByGeciShipei, getBilibiliAudio, getBilibiliPages, getBilibiliAudioProxyUrl, getBilibiliImageProxyUrl, parseDouyinVideo, getProxyAudioUrl, qqSearch, qqLyric, qqPlay } from '@/services/backend/musicController';

type LyricLine = { time: number; text: string };
type SongMeta = {
  id: string | number;
  name: string;
  artist?: string;
  album?: string;
  cover?: string;
  url?: string;
  lrc?: string;
  duration?: number | string;
  source?: 'netease' | 'bilibili' | 'douyin' | 'qq';
  albumMid?: string; // QQ 专用：便于封面与播放直链解析
};

const PLAYLIST_STORAGE_KEY = 'music_page_playlist_v1';
const PLAYLISTS_STORAGE_KEY_V1 = 'music_page_playlists_v1';
const LAST_STATE_STORAGE_KEY = 'music_page_last_state_v1';
const neteaseApiUrl = 'https://api.kxzjoker.cn/api/163_music';
const neteaseSearchApiUrl = 'https://api.kxzjoker.cn/api/163_search';
// 通过 services 封装调用后端中转接口

type MusicSourceKey = 'netease' | 'bilibili' | 'douyin' | 'qq';
const MUSIC_SOURCES: { key: MusicSourceKey; name: string; icon: string }[] = [
  { key: 'netease', name: '网易云', icon: 'https://music.163.com/favicon.ico' },
  { key: 'qq', name: 'QQ 音乐', icon: 'https://y.qq.com/favicon.ico' },
  { key: 'bilibili', name: '哔哩哔哩', icon: 'https://www.bilibili.com/favicon.ico' },
  { key: 'douyin', name: '抖音', icon: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico' },
];

// 动态歌单结构
interface PlaylistItem {
  id: string;
  title: string;
  songs: SongMeta[];
  system?: 'history' | 'default'; // 系统歌单：播放历史、默认收藏
}

const generateId = () => `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const formatTime = (sec: number) => {
  if (!isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
};

const parseLRC = (lrc?: string): LyricLine[] => {
  if (!lrc) return [];
  const lines = lrc.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?]/g;
  for (const raw of lines) {
    let match: RegExpExecArray | null;
    const texts: number[] = [];
    while ((match = timeRegex.exec(raw))) {
      const mm = Number(match[1]);
      const ss = Number(match[2]);
      const ms = match[3] ? Number(match[3].padEnd(3, '0')) : 0;
      texts.push(mm * 60 + ss + ms / 1000);
    }
    const text = raw.replace(timeRegex, '').trim();
    texts.forEach((t) => {
      result.push({ time: t, text });
    });
  }
  return result
    .filter((l) => l.text)
    .sort((a, b) => a.time - b.time);
};

const MusicPage: React.FC = () => {
  // 动态主题：跟随封面
  const [dynamicTheme, setDynamicTheme] = useState<boolean>(() => {
    try {
      return localStorage.getItem('musicDynamicTheme') === '1';
    } catch { return false; }
  });
  const musicPageRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SongMeta[]>([]);
  const [source, setSource] = useState<MusicSourceKey>('netease');

  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [nowPlayingListId, setNowPlayingListId] = useState<string>('');

  const playingList = useMemo(() => playlists.find(p => p.id === nowPlayingListId)?.songs || [], [playlists, nowPlayingListId]);
  const activeList = useMemo(() => playlists.find(p => p.id === activeListId)?.songs || [], [playlists, activeListId]);

  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopMode, setLoopMode] = useState<'order' | 'repeat' | 'single' | 'shuffle'>('order');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingSongId, setLoadingSongId] = useState<string | number | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsActiveKey, setSettingsActiveKey] = useState<'basic' | 'plan'>('basic');
  const [planItems, setPlanItems] = useState([
    { id: 1, text: '音乐解析：抖音视频解析，QQ 音乐，酷狗，酷我 等等等', completed: false },
    { id: 2, text: '音乐推荐：不知道咋推荐', completed: false },
    { id: 3, text: '导入功能：导入在线歌单，音乐数据导出本地和导入本地', completed: false },
    { id: 4, text: '播放功能：缓存歌曲播放失败重试机制，刷新音频链接', completed: true },
    { id: 5, text: '播放功能：音量控制，速度控制，全局的', completed: true },
    { id: 6, text: '搜索歌词：支持搜索歌词（有些歌曲没有歌词，搜索添加歌词）', completed: true },
    { id: 6, text: '歌词效果：逐字歌词，模糊歌词，等等等', completed: false },
    { id: 7, text: '外观设置：音乐可视化动效，页面背景，毛玻璃效果，等等等', completed: false },
    { id: 8, text: '其他设置：一些音乐平台推荐', completed: false },
    { id: 9, text: '（更多想法，敬请期待…）', completed: false },
  ]);

  // 音频重试相关状态
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentRetryingSong, setCurrentRetryingSong] = useState<SongMeta | null>(null);
  const [loadingSong, setLoadingSong] = useState<SongMeta | null>(null);

  // 音量和速度控制
  const [volume, setVolume] = useState<number>(100); // 音量 0-100
  const [playbackRate, setPlaybackRate] = useState<number>(1); // 播放速度 0.5-2
  const [volumeVisible, setVolumeVisible] = useState<boolean>(false);
  const [speedVisible, setSpeedVisible] = useState<boolean>(false);

  // 均衡器状态（不持久化）
  const EQ_BANDS = [80, 100, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const [eqModalOpen, setEqModalOpen] = useState<boolean>(false);
  const [eqGains, setEqGains] = useState<number[]>(new Array(10).fill(0));
  const EQ_PRESETS: Record<string, number[]> = {
    Default: [0,0,0,0,0,0,0,0,0,0],
    Pop: [4,3,2,1,0,0,1,2,3,2],
    Dance: [6,5,4,2,0,-1,0,1,2,1],
    Blues: [2,2,2,3,2,1,2,1,0,-1],
    Classical: [0,0,0,0,0,0,0,1,2,3],
    Jazz: [2,2,1,1,0,0,1,2,1,0],
    Ballad: [1,1,0,0,2,3,2,1,0,-1],
    Electronic: [5,4,3,0,-1,-2,0,2,4,5],
    Rock: [3,2,1,0,-1,0,2,3,2,1],
    Country: [0,0,0,1,2,2,3,2,1,0],
    Vocal: [-2,-1,0,1,3,4,3,1,-1,-2],
  };
  const EQ_PRESET_TEXT: Record<string, string> = {
    Default: '默认',
    Pop: '流行',
    Dance: '舞曲',
    Blues: '蓝调',
    Classical: '古典',
    Jazz: '爵士',
    Ballad: '慢歌',
    Electronic: '电子乐',
    Rock: '摇滚',
    Country: '乡村',
    Vocal: '人声',
  };
  const [eqPreset, setEqPreset] = useState<string>('Default');

  // WebAudio 相关
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[] | null>(null);
  const eqConnectedRef = useRef<boolean>(false);
  const forceUpdateTick = useState(0)[1];
  const [eqAvailable, setEqAvailable] = useState<boolean | null>(null);

  // 歌单内过滤（按歌名/歌手）
  const [playlistFilters, setPlaylistFilters] = useState<Record<string, string>>({});
  const activeFilter = playlistFilters[activeListId] || '';
  const filteredActiveList = useMemo(() => {
    const base = activeList || [];
    const q = (playlistFilters[activeListId] || '').trim().toLowerCase();
    if (!q) return base;
    return base.filter((s) =>
      (s.name || '').toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q)
    );
  }, [activeList, activeListId, playlistFilters]);

  // 重试音频链接的函数 - 使用原始信息重新解析
  const retryAudioUrl = async (song: SongMeta) => {
    if (isRetrying) {
      message.error({ content: '正在重试中，请稍候...', duration: 2 });
      return false;
    }

    setIsRetrying(true);
    setCurrentRetryingSong(song);

    try {
      let newSongData: SongMeta | null = null;

      // 根据音乐来源使用ID重新解析
      if (song.source === 'netease') {
        // 网易云音乐重试 - 使用ID重新解析
        console.log('网易云重试，使用ID:', song.id);
        
        // 先尝试后端中转
        const response = await parseNeteaseByGeciShipei(song.id);
        if (response.code === 200 && response.data?.data?.[0]) {
          const songData = response.data.data[0];
          newSongData = {
            ...song,
            url: songData.url,
            cover: songData.pic || song.cover,
            name: songData.name || song.name,
            artist: songData.artist || song.artist,
            lrc: songData.lrc || song.lrc,
          };
          console.log('网易云重试成功，新URL:', songData.url);
        } else {
          // 如果后端中转失败，尝试外部API
          const fallbackResponse = await parseSongPrimaryNetease(song.id);
          if (fallbackResponse) {
            newSongData = {
              ...song,
              ...fallbackResponse,
            };
            console.log('网易云外部API重试成功，新URL:', fallbackResponse.url);
          }
        }
      } else if (song.source === 'bilibili') {
        // B站重试 - 使用ID重新解析
        console.log('B站重试，使用ID:', song.id);
        
        // 从ID中提取BV号和分P号
        let bvid = '';
        let pageNumber = 1;
        
        if (typeof song.id === 'string' && song.id.includes('BV')) {
          const parts = song.id.split('#');
          bvid = parts[0]; // BV号
          if (parts[1]) {
            pageNumber = parseInt(parts[1]); // 分P号
          }
        } else if (typeof song.id === 'string') {
          // 如果ID就是URL，直接使用
          const response = await getBilibiliAudio(song.id);
          if (response.code === 0 && response.data?.audioUrl) {
            newSongData = {
              ...song,
              url: response.data.audioUrl,
              cover: response.data.cover || song.cover,
              name: response.data.title || song.name,
            };
            console.log('B站重试成功，新URL:', response.data.audioUrl);
          }
          return;
        }
        
        if (bvid) {
          const response = await getBilibiliAudio(`https://www.bilibili.com/video/${bvid}`);
          
          if (response.code === 0 && response.data) {
            const payload = response.data;
            
            // 如果是多P视频，需要根据分P号获取对应的音频链接
            if (payload.isMultiPart && payload.pages && payload.pages.length > 1) {
              const targetPage = payload.pages.find(p => p.page === pageNumber);
              if (targetPage) {
                const pageResponse = await getBilibiliAudio(targetPage.url);
                if (pageResponse.code === 0 && pageResponse.data?.audioUrl) {
                  newSongData = {
                    ...song,
                    url: pageResponse.data.audioUrl,
                    cover: pageResponse.data.cover || song.cover,
                    name: pageResponse.data.title || song.name,
                  };
                  console.log('B站分P重试成功，新URL:', pageResponse.data.audioUrl);
                }
              }
            } else if (payload.audioUrl) {
              // 单P视频直接使用返回的音频链接
              newSongData = {
                ...song,
                url: payload.audioUrl,
                cover: payload.cover || song.cover,
                name: payload.title || song.name,
              };
              console.log('B站单P重试成功，新URL:', payload.audioUrl);
            }
          }
        }
      } else if (song.source === 'douyin') {
        // 抖音重试 - 使用ID重新解析
        console.log('抖音重试，使用ID:', song.id);
        const response = await parseDouyinVideo(song.id as string);
        if (response?.code === 0 && response?.data?.audioUrl) {
          newSongData = {
            ...song,
            url: response.data.audioUrl,
            cover: response.data.cover || song.cover,
            name: response.data.title || song.name,
          };
          console.log('抖音重试成功，新URL:', response.data.audioUrl);
        }
      }

      if (newSongData && newSongData.url) {
        // 更新播放列表中的歌曲信息
        const updatedPlaylists = playlists.map(playlist => ({
          ...playlist,
          songs: playlist.songs.map(s => 
            s.id === song.id ? { ...s, ...newSongData } : s
          )
        }));
        setPlaylists(updatedPlaylists);
        localStorage.setItem(PLAYLISTS_STORAGE_KEY_V1, JSON.stringify(updatedPlaylists));

        // 立即更新音频元素的src，避免播放旧URL
        const finalUrl = song.source === 'bilibili' ? 
          getBilibiliAudioProxyUrl(newSongData.url) : 
          (song.source === 'douyin' ? 
            getProxyAudioUrl(newSongData.url, 'https://www.douyin.com/') : 
            (song.source === 'qq' ? newSongData.url : newSongData.url));
            
        if (audioRef.current) {
          audioRef.current.src = finalUrl;
          // 重新播放
          await audioRef.current.play();
          setIsPlaying(true);
        }

        message.success({ content: '链接已刷新，正在重新播放', duration: 2 });
        setLoadingSong(null); // 重试成功后清除loadingSong状态
        
        return true;
      } else {
        throw new Error('无法获取新的音频链接');
      }
    } catch (error) {
      console.error('重试失败:', error);
      message.error({ content: '重试失败，请稍后再试', duration: 2 });
      setLoadingSong(null); // 重试失败后也清除loadingSong状态
      return false;
    } finally {
      setIsRetrying(false);
      setCurrentRetryingSong(null);
    }
  };

  // 保留歌词等引用
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lyricsUlRef = useRef<HTMLUListElement>(null);
  // li 高度、容器高度、最大位移与当前位移
  const [lyricLineHeight, setLyricLineHeight] = useState<number>(0);
  const [lyricsContainerHeight, setLyricsContainerHeight] = useState<number>(0);
  const [maxLyricsOffset, setMaxLyricsOffset] = useState<number>(0);
  const [lyricsOffset, setLyricsOffset] = useState<number>(0);
  const restoredStateRef = useRef(false);

  // 编辑歌曲弹窗状态
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContext, setEditContext] = useState<{ listId: string; index: number } | null>(null);
  const [editName, setEditName] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editLrc, setEditLrc] = useState('');

  // 歌词搜索弹窗
  const [lyricSearchOpen, setLyricSearchOpen] = useState(false);
  const [lyricSearchText, setLyricSearchText] = useState('');
  const [lyricSearchLoading, setLyricSearchLoading] = useState(false);
  const [lyricSearchResults, setLyricSearchResults] = useState<{ id: string | number; title: string; artist: string; duration?: string; lrc?: string }[]>([]);
  const [lyricApplyingId, setLyricApplyingId] = useState<string | number | null>(null);
  const [lyricSource, setLyricSource] = useState<'netease' | 'qq'>('netease');

  const formatSecondsToMMSS = (sec: number | string | undefined) => {
    if (sec === undefined || sec === null) return undefined;
    const n = typeof sec === 'string' ? Number(sec) : sec;
    if (!isFinite(Number(n))) return undefined;
    const s = Math.max(0, Math.floor(Number(n)));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const getHistory = () => playlists.find(p => p.system === 'history');
  const getDefaultFav = () => playlists.find(p => p.system === 'default');
  const getOrCreateBilibiliPlaylist = () => {
    let pl = playlists.find(p => p.title === '哔哩哔哩');
    if (pl) return pl;
    const created: PlaylistItem = { id: generateId(), title: '哔哩哔哩', songs: [] };
    // 仅返回对象，真正插入由调用方在同一次 setPlaylists 中完成，避免被覆盖
    return created;
  };

  // 初始化/迁移存储（仅使用 v1 key）
  useEffect(() => {
    const rawV1 = localStorage.getItem(PLAYLISTS_STORAGE_KEY_V1);
    if (rawV1) {
      try {
        const parsed = JSON.parse(rawV1);
        if (Array.isArray(parsed)) {
          const list = parsed as PlaylistItem[];
          setPlaylists(list);
          const hist = list.find(p => p.system === 'history');
          const fav = list.find(p => p.system === 'default');
          setActiveListId(hist?.id || fav?.id || list[0]?.id || '');
          setNowPlayingListId(hist?.id || list[0]?.id || '');
          return;
        }
        if (parsed && typeof parsed === 'object') {
          const historySongs: SongMeta[] = Array.isArray(parsed.history) ? parsed.history : [];
          const favSongs: SongMeta[] = Array.isArray(parsed.favorites) ? parsed.favorites : [];
          const history: PlaylistItem = { id: generateId(), title: '播放历史', songs: historySongs, system: 'history' };
          const fav: PlaylistItem = { id: generateId(), title: '默认收藏', songs: favSongs, system: 'default' };
          const next = [history, fav];
          setPlaylists(next);
          setActiveListId(history.id);
          setNowPlayingListId(history.id);
          localStorage.setItem(PLAYLISTS_STORAGE_KEY_V1, JSON.stringify(next));
          return;
        }
      } catch {}
    }

    const rawSingle = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    if (rawSingle) {
      try {
        const parsed = JSON.parse(rawSingle);
        const historySongs: SongMeta[] = Array.isArray(parsed) ? parsed : [];
        const history: PlaylistItem = { id: generateId(), title: '播放历史', songs: historySongs, system: 'history' };
        const fav: PlaylistItem = { id: generateId(), title: '默认收藏', songs: [], system: 'default' };
        const next = [history, fav];
        setPlaylists(next);
        setActiveListId(history.id);
        setNowPlayingListId(history.id);
        localStorage.setItem(PLAYLISTS_STORAGE_KEY_V1, JSON.stringify(next));
        return;
      } catch {}
    }

    const history: PlaylistItem = { id: generateId(), title: '播放历史', songs: [], system: 'history' };
    const fav: PlaylistItem = { id: generateId(), title: '默认收藏', songs: [], system: 'default' };
    setPlaylists([history, fav]);
    setActiveListId(history.id);
    setNowPlayingListId(history.id);
  }, []);

  useEffect(() => {
    if (playlists.length) {
      localStorage.setItem(PLAYLISTS_STORAGE_KEY_V1, JSON.stringify(playlists));
    }
  }, [playlists]);

  // 尝试恢复上一次选择（不自动播放）
  useEffect(() => {
    if (!playlists.length || restoredStateRef.current) return;
    try {
      const raw = localStorage.getItem(LAST_STATE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const listId = parsed?.nowPlayingListId as string;
      const index = typeof parsed?.currentIndex === 'number' ? parsed.currentIndex : -1;
      const list = playlists.find(p => p.id === listId);
      if (!list || index < 0 || index >= list.songs.length) return;
      setNowPlayingListId(listId);
      setActiveListId((prev) => prev || listId);
      setCurrentIndex(index);
      const song = list.songs[index];
      if (song?.url && audioRef.current) {
        try { disableEq(); } catch {}
        let finalUrl = song.url as string;
        if (song.source === 'bilibili' && finalUrl) {
          finalUrl = getBilibiliAudioProxyUrl(finalUrl);
        }
        audioRef.current.src = finalUrl;
      } else if (song) {
        // 尝试解析 url 但不自动播放
        (async () => {
          const parsedSong = await parseSong(song.id);
          if (parsedSong?.url) {
            setPlaylists((prev) => {
              const next = prev.map((p) => ({ ...p, songs: [...p.songs] }));
              const li = next.findIndex((p) => p.id === listId);
              if (li >= 0) {
                const si = next[li].songs.findIndex((s) => s.id === song.id);
                if (si >= 0) {
                  // 合并原始歌曲信息和解析后的信息
                  next[li].songs[si] = { 
                    ...song, 
                    ...parsedSong,
                  };
                }
              }
              return next;
            });
            if (audioRef.current) {
              try { disableEq(); } catch {}
              let finalUrl = parsedSong.url as string;
              if (song.source === 'bilibili' && finalUrl) {
                finalUrl = getBilibiliAudioProxyUrl(finalUrl);
              }
              audioRef.current.src = finalUrl;
            }
          }
        })();
      }
      restoredStateRef.current = true;
    } catch {}
  }, [playlists]);

  // 保存最后状态（仅选择，不代表播放）
  useEffect(() => {
    if (!nowPlayingListId || currentIndex < 0) return;
    const state = { nowPlayingListId, currentIndex };
    localStorage.setItem(LAST_STATE_STORAGE_KEY, JSON.stringify(state));
  }, [nowPlayingListId, currentIndex]);

  const currentSong = currentIndex >= 0 ? playingList[currentIndex] : undefined;
  const lyricLines = useMemo(() => parseLRC(currentSong?.lrc), [currentSong?.lrc]);
  const plainLyric = useMemo(() => {
    const raw = currentSong?.lrc || '';
    if (!raw) return '';
    // 若解析后无时间轴行，则作为纯文本展示
    const hasTimestamp = /\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?]/.test(raw);
    return hasTimestamp ? '' : raw;
  }, [currentSong?.lrc]);

  const activeLyricIndex = useMemo(() => {
    if (!lyricLines.length) return -1;
    for (let i = lyricLines.length - 1; i >= 0; i--) {
      if (currentTime >= lyricLines[i].time) return i;
    }
    // 尚未到第一句时间戳，默认从第一行开始显示
    return 0;
  }, [lyricLines, currentTime]);

  // 歌曲或歌词变化时，重置并测量 ul/li 尺寸
  useEffect(() => {
    const container = lyricsContainerRef.current;
    const ul = lyricsUlRef.current;
    if (!container || !ul) return;
    setLyricsOffset(0);
    requestAnimationFrame(() => {
      const firstLi = ul.querySelector('li') as HTMLElement | null;
      const lineH = firstLi ? firstLi.clientHeight : 0;
      setLyricLineHeight(lineH);
      const ch = container.clientHeight;
      setLyricsContainerHeight(ch);
      const maxOffset = Math.max(0, ul.clientHeight - ch);
      setMaxLyricsOffset(maxOffset);
    });
  }, [currentSong?.id, lyricLines.length]);

  // 容器尺寸变化时也重测（窗口大小变化）
  useEffect(() => {
    const handler = () => {
      const container = lyricsContainerRef.current;
      const ul = lyricsUlRef.current;
      if (!container || !ul) return;
      const firstLi = ul.querySelector('li') as HTMLElement | null;
      setLyricLineHeight(firstLi ? firstLi.clientHeight : 0);
      const ch = container.clientHeight;
      setLyricsContainerHeight(ch);
      const maxOffset = Math.max(0, ul.clientHeight - ch);
      setMaxLyricsOffset(maxOffset);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // 当前播放行变化时，计算基于行高的 translateY 偏移，使其近似居中
  useEffect(() => {
    if (activeLyricIndex < 0) return;
    const lineHeight = lyricLineHeight;
    const containerH = lyricsContainerHeight;
    const ul = lyricsUlRef.current;
    if (!lineHeight || !containerH || !ul) return;

    let offset = lineHeight * activeLyricIndex + lineHeight / 2 - containerH / 2;
    if (offset < 0) offset = 0;
    if (offset > maxLyricsOffset) offset = maxLyricsOffset;
    setLyricsOffset(offset);
  }, [activeLyricIndex, lyricLineHeight, lyricsContainerHeight, maxLyricsOffset]);

  // 搜索（根据源）
  const performSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const searchMsgKey = 'musicSearch';
      message.loading({ content: '搜索中...', key: searchMsgKey, duration: 0 });
      setSearchModalOpen(true);
      if (source === 'netease') {
        const resp = await fetch(`${neteaseSearchApiUrl}?name=${encodeURIComponent(search)}&limit=30`);
        const data = await resp.json();
        if (data?.code === 200 && Array.isArray(data?.data)) {
          const mapped: SongMeta[] = data.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            artist: s.ar?.map((a: any) => a.name).join(', ') || s.artists?.map((a: any) => a.name).join(', '),
            album: s.al?.name || s.album?.name,
            cover: s.al?.picUrl || s.album?.picUrl,
            duration: s.dt ? Math.round(s.dt / 1000) : undefined,
            source: 'netease',
          }));
          setResults(mapped);
          message.success({ content: `找到 ${mapped.length} 条结果`, key: searchMsgKey, duration: 1.2 });
        } else {
          message.warning({ content: '未找到相关结果', key: searchMsgKey, duration: 1.2 });
        }
      } else if (source === 'bilibili') {
        const wrapped = await getBilibiliAudio(search.trim());
        if (wrapped?.code === 0 && wrapped?.data) {
          const payload = wrapped.data;
          const pages = Array.isArray(payload.pages) ? payload.pages : [];
          if (pages.length > 1) {
            const mapped: SongMeta[] = pages.map((p: any) => ({
              id: `${payload.videoId || ''}#${p.page}`,
              name: p.part || payload.title || '未命名',
              artist: payload.owner?.name || 'UP主',
              cover: payload.cover,
              source: 'bilibili',
            }));
            setResults(mapped);
            message.success({ content: `检测到多P，共 ${pages.length} 个分P`, key: searchMsgKey, duration: 1.2 });
          } else if (payload.audioUrl) {
            const single: SongMeta = {
              id: payload.videoId || search.trim(),
              name: payload.title || '未命名',
              artist: payload.owner?.name || 'UP主',
              cover: payload.cover,
              url: payload.audioUrl,
              duration: undefined,
              source: 'bilibili',
            };
            setResults([single]);
            message.success({ content: '解析成功', key: searchMsgKey, duration: 1.2 });
          } else {
            message.warning({ content: '未获取到有效音频信息', key: searchMsgKey, duration: 1.2 });
          }
        } else {
          message.warning({ content: wrapped?.message || '解析失败，请检查链接', key: searchMsgKey, duration: 1.2 });
        }
      } else if (source === 'douyin') {
        const resp = await parseDouyinVideo(search.trim());
        if (resp?.code === 0 && resp?.data?.audioUrl) {
          const s: SongMeta = {
            id: search.trim(),
            name: resp.data.title || '未命名',
            artist: '抖音',
            cover: resp.data.cover,
            url: resp.data.audioUrl,
            source: 'douyin',
          };
          setResults([s]);
          message.success({ content: '解析成功', key: searchMsgKey, duration: 1.2 });
        } else {
          message.warning({ content: resp?.message || '解析失败，请检查链接', key: searchMsgKey, duration: 1.2 });
        }
      } else if (source === 'qq') {
        const resp = await qqSearch(search.trim(), 1, 30);
        const list = resp?.data?.data?.song?.list;
        if (Array.isArray(list)) {
          const mapped: SongMeta[] = list.map((it: any) => {
            const singers = Array.isArray(it?.singer) && it.singer.length > 0 ? it.singer.map((s: any) => s.name).join(', ') : '';
            const album = it?.albumname || (it?.album?.name) || '';
            return {
              id: it?.songmid || it?.songid,
              name: it?.songname,
              artist: singers,
              album,
              cover: (it?.album?.mid || it?.albummid) ? `https://y.qq.com/music/photo_new/T002R300x300M000${it?.album?.mid || it?.albummid}.jpg` : undefined,
              url: undefined,
              duration: it?.interval ? formatSecondsToMMSS(it.interval) : undefined,
              source: 'qq',
              albumMid: it?.album?.mid || it?.albummid,
            } as SongMeta;
          });
          setResults(mapped);
          message.success({ content: `找到 ${mapped.length} 条结果`, key: searchMsgKey, duration: 1.2 });
        } else {
          message.warning({ content: '未找到相关结果', key: searchMsgKey, duration: 1.2 });
        }
      }
    } catch (e) {
      message.error({ content: '搜索失败，请稍后重试', duration: 1.5 });
    } finally {
      setSearching(false);
    }
  };

  // 解析（主：后端中转 gecishipei，备：kxzjokersss 163）
  const parseSongPrimaryNetease = async (songId: string | number): Promise<SongMeta | null> => {
    try {
      const response = await fetch(neteaseApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `url=${encodeURIComponent(String(songId))}&level=exhigh&type=json`,
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.status === 200 && data?.url) {
        const dur = typeof data.duration === 'string' && data.duration.includes(':')
          ? Number(data.duration.split(':')[0]) * 60 + Number(data.duration.split(':')[1])
          : (typeof data.duration === 'number' ? data.duration : undefined);
        return {
          id: data.id || songId,
          name: data.name || '未知歌曲',
          artist: data.ar_name || (Array.isArray(data.ar) ? data.ar.map((a: any) => a.name).join(', ') : undefined),
          album: data.al_name || data.al?.name,
          cover: data.pic || data.pic_url || data.al?.picUrl,
          url: data.url,
          lrc: data.lyric || '',
          duration: dur,
          source: 'netease',
        };
      }
    } catch {}
    return null;
  };

  const parseSongFallbackGeCiShiPei = async (songId: string | number): Promise<SongMeta | null> => {
    try {
      const resp = await parseNeteaseByGeciShipei(songId);
      const data: any = resp?.data;
      if (data?.code === 200 && Array.isArray(data?.data) && data.data.length > 0) {
        const s = data.data[0];
        return {
          id: s.songid || songId,
          name: s.title || '未知歌曲',
          artist: s.author,
          cover: s.pic,
          url: s.url,
          lrc: s.lrc,
          source: 'netease',
        };
      }
    } catch {}
    return null;
  };

  const parseSong = async (songId: string | number): Promise<SongMeta | null> => {
    // 目前仅支持网易源：先走后端中转（gecishipei），失败再回退到外部 163 接口
    const primary = await parseSongFallbackGeCiShiPei(songId);
    if (primary) return primary;
    const fallback = await parseSongPrimaryNetease(songId);
    if (fallback) return fallback;
    return null;
  };

  // 校验给定音频 URL 是否可播放（canplay 或 loadedmetadata 即视为可用）
  const testAudioPlayable = (url: string, timeoutMs = 8000): Promise<boolean> => {
    return new Promise((resolve) => {
      const audio = audioRef.current;
      if (!audio) return resolve(false);
      let settled = false as boolean;
      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('loadedmetadata', onCanPlay);
        audio.removeEventListener('error', onError as any);
        clearTimeout(tid);
      };
      const onCanPlay = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(true);
        }
      };
      const onError = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(false);
        }
      };
      const tid = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(false);
        }
      }, timeoutMs);
      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('loadedmetadata', onCanPlay, { once: true });
      audio.addEventListener('error', onError as any, { once: true });
      try {
        audio.src = url;
        // 不直接调用 play()，以避免自动播放策略限制
        audio.load();
      } catch {
        cleanup();
        resolve(false);
      }
    });
  };

  // 尝试获取“可播放”的歌曲链接：先后端中转，再外部 163 接口
  const resolvePlayableSong = async (songId: string | number): Promise<SongMeta | null> => {
    // 1) 后端中转（gecishipei）
    const fromProxy = await parseSongFallbackGeCiShiPei(songId);
    if (fromProxy?.url) {
      const ok = await testAudioPlayable(fromProxy.url as string);
      if (ok) return fromProxy;
    }
    // 2) 外部 163 接口
    const from163 = await parseSongPrimaryNetease(songId);
    if (from163?.url) {
      const ok = await testAudioPlayable(from163.url as string);
      if (ok) return from163;
    }
    return null;
  };

  const upsertToPlaylist = (listId: string, song: SongMeta): { index: number; next: PlaylistItem[] } => {
    const next = playlists.map((p) => ({ ...p, songs: [...p.songs] }));
    const idx = next.findIndex((p) => p.id === listId);
    if (idx < 0) return { index: -1, next: playlists };
    const list = next[idx].songs;
    let index = list.findIndex((s) => s.id === song.id);
    if (index === -1) {
      list.push(song);
      index = list.length - 1;
    } else {
      list[index] = song;
    }
    return { index, next };
  };

  const removeFromPlaylist = (listId: string, index: number) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => ({ ...p, songs: [...p.songs] }));
      const listIndex = next.findIndex((p) => p.id === listId);
      if (listIndex < 0) return prev;
      const list = next[listIndex].songs;
      list.splice(index, 1);

      if (listId === nowPlayingListId) {
        if (index === currentIndex) {
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          setCurrentIndex(-1);
          const a = audioRef.current;
          if (a) {
            a.pause();
            a.src = '';
          }
          // 清空 last state
          localStorage.removeItem(LAST_STATE_STORAGE_KEY);
        } else if (index < currentIndex) {
          setCurrentIndex((i) => Math.max(0, i - 1));
        }
      }
      return next;
    });
  };

  const createPlaylist = (title?: string) => {
    const name = (title ?? window.prompt('新建歌单名称', '新建歌单'))?.trim();
    if (!name) return;
    const next: PlaylistItem = { id: generateId(), title: name, songs: [] };
    setPlaylists((prev) => {
      const hist = prev.find(p => p.system === 'history');
      const fav = prev.find(p => p.system === 'default');
      const others = prev.filter(p => !p.system);
      const merged = [hist, fav, ...others, next].filter(Boolean) as PlaylistItem[];
      return merged;
    });
    message.success('已创建歌单');
  };

  const renamePlaylist = (listId: string) => {
    const pl = playlists.find(p => p.id === listId);
    if (!pl || pl.system) return;
    const name = window.prompt('重命名歌单', pl.title)?.trim();
    if (!name) return;
    setPlaylists((prev) => prev.map(p => p.id === listId ? { ...p, title: name } : p));
    message.success('已重命名');
  };

  const deletePlaylist = (listId: string) => {
    const pl = playlists.find(p => p.id === listId);
    if (!pl || pl.system) return;
    if (!window.confirm(`删除歌单“${pl.title}”？该操作不可撤销。`)) return;
    setPlaylists((prev) => {
      const next = prev.filter(p => p.id !== listId);
      if (activeListId === listId) {
        const hist = next.find(p => p.system === 'history');
        setActiveListId(hist?.id || next[0]?.id || '');
      }
      if (nowPlayingListId === listId) {
        const hist = next.find(p => p.system === 'history');
        setNowPlayingListId(hist?.id || next[0]?.id || '');
        setCurrentIndex(-1);
        localStorage.removeItem(LAST_STATE_STORAGE_KEY);
      }
      return next;
    });
    message.success('已删除歌单');
  };

  const addToPlaylistById = (listId: string, song: SongMeta) => {
    if (song.source === 'bilibili') {
      // 合并“创建哔哩哔哩歌单+添加歌曲”为一次更新，确保不会被覆盖
      setPlaylists((prev) => {
        const next = prev.map(p => ({ ...p, songs: [...p.songs] }));
        let biliIndex = next.findIndex(p => p.title === '哔哩哔哩');
        if (biliIndex < 0) {
          const created: PlaylistItem = { id: generateId(), title: '哔哩哔哩', songs: [] };
          next.push(created);
          biliIndex = next.length - 1;
        }
        const bili = next[biliIndex];
        if (listId !== bili.id) {
          message.warning('B站音频仅能添加到“哔哩哔哩”歌单');
          return prev; // 阻止添加到其他歌单
        }
        const list = next[biliIndex].songs;
        const exist = list.findIndex(s => s.id === song.id);
        if (exist === -1) list.push(song); else list[exist] = song;
        message.success('已添加到“哔哩哔哩”');
        return next;
      });
      return;
    } else if (song.source === 'douyin') {
      // 抖音歌单
      setPlaylists((prev) => {
        const next = prev.map(p => ({ ...p, songs: [...p.songs] }));
        let dyIndex = next.findIndex(p => p.title === '抖音');
        if (dyIndex < 0) {
          const created: PlaylistItem = { id: generateId(), title: '抖音', songs: [] };
          next.push(created);
          dyIndex = next.length - 1;
        }
        const dy = next[dyIndex];
        if (listId !== dy.id) {
          message.warning('抖音音频仅能添加到“抖音”歌单');
          return prev;
        }
        const list = next[dyIndex].songs;
        const exist = list.findIndex(s => s.id === song.id);
        if (exist === -1) list.push(song); else list[exist] = song;
        message.success('已添加到“抖音”');
        return next;
      });
      return;
    }
    const { next } = upsertToPlaylist(listId, song);
    setPlaylists(next);
    const pl = playlists.find(p => p.id === listId);
    message.success(`已添加到“${pl?.title || '歌单'}”`);
  };

  const addToFavorites = (song: SongMeta) => {
    const fav = getDefaultFav();
    if (!fav) return;
    const { index, next } = upsertToPlaylist(fav.id, song);
    setPlaylists(next);
    message.success('已添加到收藏');
  };

  const openEditSongMeta = (listId: string, index: number) => {
    const pl = playlists.find(p => p.id === listId);
    const song = pl?.songs?.[index];
    if (!song) return;
    setEditContext({ listId, index });
    setEditName(song.name || '');
    setEditArtist(song.artist || '');
    setEditLrc(song.lrc || '');
    setEditModalOpen(true);
  };

  const handleEditOk = () => {
    if (!editContext) return;
    const name = editName.trim();
    const artist = editArtist.trim();
    const lrc = editLrc; // 允许空字符串（用户可能清空）
    setPlaylists((prev) => {
      const next = prev.map((p) => ({ ...p, songs: [...p.songs] }));
      const li = next.findIndex(p => p.id === editContext.listId);
      if (li < 0) return prev;
      const song = next[li].songs[editContext.index];
      if (!song) return prev;
      next[li].songs[editContext.index] = { ...song, name: name || song.name, artist: artist || song.artist, lrc: lrc };
      return next;
    });
    setEditModalOpen(false);
    setEditContext(null);
    message.success('已更新');
  };

  const handleEditCancel = () => {
    setEditModalOpen(false);
    setEditContext(null);
  };

  // 播放：写入到对应歌单（网易->历史；B站->哔哩哔哩），并保存 last state
  const playSong = async (song: SongMeta) => {
    // 每首歌默认关闭均衡器
    try { disableEq(); } catch {}
    setLoadingSongId(song.id);
    setLoadingSong(song); // 设置正在加载的歌曲
    const playMsgKey = 'playSong';
    message.loading({ content: '正在加载歌曲...', key: playMsgKey, duration: 0 });
    try {
      // 优先尝试已有 url；若无或不可播放，则解析并验证可播放链接
      let target: SongMeta | null = null;
      if (song.url) {
        const ok = await testAudioPlayable(song.url as string);
        if (ok) {
          target = song;
        }
      }
      if (!target) {
        if (song.source === 'bilibili' || song.source === 'douyin') {
          target = song as SongMeta;
        } else if (song.source === 'qq') {
          try {
            const resp = await qqPlay(String(song.id), song.albumMid);
            const audioUrl = resp?.data?.audioUrl as string | undefined;
            // QQ 返回无 vkey 的直链一般不可播，多为需要会员
            const hasVkey = !!(audioUrl && /[?&]vkey=/.test(audioUrl));
            if (audioUrl && hasVkey) {
              target = { ...song, url: audioUrl, cover: resp?.data?.cover || song.cover } as SongMeta;
              // 同步拉取 QQ 歌词
              try {
                const lrcResp = await qqLyric({ songmid: String(song.id) });
                const lrc = lrcResp?.data?.lyric;
                if (lrc) {
                  target = { ...target, lrc } as SongMeta;
                }
              } catch {}
            } else {
              // 结束加载提示与状态
              message.error({ content: '这首歌需要QQ 会员，无法播放，请搜索其他平台', key: playMsgKey, duration: 1.6 });
              setLoadingSongId(null);
              setLoadingSong(null);
              return;
            }
          } catch {
            message.error({ content: 'QQ 音乐解析失败，请稍后重试或选择其他平台', key: playMsgKey, duration: 1.6 });
            setLoadingSongId(null);
            setLoadingSong(null);
            return;
          }
        } else {
          target = await resolvePlayableSong(song.id);
        }
      }
      if (!target || !target.url) {
        message.error({ content: '加载失败，换一首试试~', key: playMsgKey, duration: 1.5 });
        return;
      }
      if (song.source === 'bilibili') {
        // 单次更新中完成：创建B站歌单（若无）+ 插入 + 计算index
        let newIndex = -1;
        let targetListId = '';
        setPlaylists((prev) => {
          const next = prev.map(p => ({ ...p, songs: [...p.songs] }));
          let biliIndex = next.findIndex(p => p.title === '哔哩哔哩');
          if (biliIndex < 0) {
            const created: PlaylistItem = { id: generateId(), title: '哔哩哔哩', songs: [] };
            next.push(created);
            biliIndex = next.length - 1;
            message.success('已自动创建“哔哩哔哩”歌单');
          }
          const list = next[biliIndex].songs;
          let idx = list.findIndex(s => s.id === target!.id);
          if (idx === -1) {
            list.push(target!);
            idx = list.length - 1;
          } else {
            list[idx] = target!;
          }
          newIndex = idx;
          targetListId = next[biliIndex].id;
          return next;
        });
        if (!targetListId || newIndex < 0) return;
        setNowPlayingListId(targetListId);
        setCurrentIndex(newIndex);
        localStorage.setItem(LAST_STATE_STORAGE_KEY, JSON.stringify({ nowPlayingListId: targetListId, currentIndex: newIndex }));
      } else if (song.source === 'douyin') {
        // 创建“抖音”歌单 + 插入 + 播放
        let newIndex = -1;
        let targetListId = '';
        setPlaylists((prev) => {
          const next = prev.map(p => ({ ...p, songs: [...p.songs] }));
          let dyIndex = next.findIndex(p => p.title === '抖音');
          if (dyIndex < 0) {
            const created: PlaylistItem = { id: generateId(), title: '抖音', songs: [] };
            next.push(created);
            dyIndex = next.length - 1;
            message.success('已自动创建“抖音”歌单');
          }
          const list = next[dyIndex].songs;
          let idx = list.findIndex(s => s.id === target!.id);
          if (idx === -1) {
            list.push(target!);
            idx = list.length - 1;
          } else {
            list[idx] = target!;
          }
          newIndex = idx;
          targetListId = next[dyIndex].id;
          return next;
        });
        if (!targetListId || newIndex < 0) return;
        setNowPlayingListId(targetListId);
        setCurrentIndex(newIndex);
        localStorage.setItem(LAST_STATE_STORAGE_KEY, JSON.stringify({ nowPlayingListId: targetListId, currentIndex: newIndex }));
      } else {
        const hist = getHistory();
        if (!hist) return;
        const { index, next } = upsertToPlaylist(hist.id, target);
        setPlaylists(next);
        setNowPlayingListId(hist.id);
        setCurrentIndex(index);
        localStorage.setItem(LAST_STATE_STORAGE_KEY, JSON.stringify({ nowPlayingListId: hist.id, currentIndex: index }));
      }

      setTimeout(() => {
        if (audioRef.current) {
          try { audioRef.current.crossOrigin = 'anonymous'; } catch {}
          let finalUrl = target!.url as string;
          if (song.source === 'bilibili' && finalUrl) {
            // 通过后端代理，避免防盗链/CORS
            finalUrl = getBilibiliAudioProxyUrl(finalUrl);
          } else if (song.source === 'douyin' && finalUrl) {
            finalUrl = getProxyAudioUrl(finalUrl, 'https://www.douyin.com/');
          } else if (song.source === 'qq' && finalUrl) {
            // QQ 音乐直链一般可直接播放；若后续需要可走代理
          }
          audioRef.current.src = finalUrl;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 0);
      message.success({ content: '已开始播放', key: playMsgKey, duration: 1.2 });
    } finally {
      setLoadingSongId(null);
      setLoadingSong(null); // 清除正在加载的歌曲状态
    }
  };

  const handlePlayPause = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      a.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handlePrev = () => {
    const list = playingList;
    if (!list.length) return;
    if (loopMode === 'single') return playSong(list[currentIndex]);
    if (loopMode === 'shuffle') {
      if (list.length === 1) return playSong(list[0]);
      let r = currentIndex;
      while (r === currentIndex) r = Math.floor(Math.random() * list.length);
      return playSong(list[r]);
    }
    const nextIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
    playSong(list[nextIndex]);
  };
  const handleNext = () => {
    const list = playingList;
    if (!list.length) return;
    if (loopMode === 'single') return playSong(list[currentIndex]);
    if (loopMode === 'shuffle') {
      if (list.length === 1) return playSong(list[0]);
      let r = currentIndex;
      while (r === currentIndex) r = Math.floor(Math.random() * list.length);
      return playSong(list[r]);
    }
    const nextIndex = currentIndex >= list.length - 1 ? 0 : currentIndex + 1;
    playSong(list[nextIndex]);
  };

  const onEnded = () => {
    if (loopMode === 'single') {
      audioRef.current?.play();
      return;
    }
    if (loopMode === 'repeat' || loopMode === 'shuffle') {
      handleNext();
    } else {
      // order
      if (currentIndex < playingList?.length - 1) handleNext();
    }
  };

  const onSeek = (value: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const t = (value / 100) * duration;
    a.currentTime = t;
    setCurrentTime(t);
  };

  // 动态主题：工具函数
  const clamp = (v: number, min = 0, max = 255) => Math.max(min, Math.min(max, v));
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  const rgbToHex = (r: number, g: number, b: number) => `#${toHex(clamp(Math.round(r)))}${toHex(clamp(Math.round(g)))}${toHex(clamp(Math.round(b)))}`;
  const mix = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number) => ({
    r: r1 + (r2 - r1) * t,
    g: g1 + (g2 - g1) * t,
    b: b1 + (b2 - b1) * t,
  });
  const relativeLuminance = (r: number, g: number, b: number) => {
    const srgb = [r, g, b].map(v => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };
  const getReadableTextColor = (r: number, g: number, b: number) => {
    const L = relativeLuminance(r, g, b);
    return L > 0.5 ? '#1f2937' : '#e6eef9';
  };

  const setMusicThemeVars = (vars: Partial<Record<string, string>>) => {
    const el = musicPageRef.current;
    if (!el) return;
    Object.entries(vars).forEach(([k, v]) => {
      if (typeof v === 'string') el.style.setProperty(`--${k}`, v);
    });
  };

  const resetDefaultThemeVars = () => {
    setMusicThemeVars({
      'music-bg-start': '#f6fafc',
      'music-bg-end': '#eef4f8',
      'music-accent': '#2563eb',
      'music-panel-bg': '#F4F8FB',
      'music-text-secondary': '#65708a',
    });
  };

  // 根据来源决定封面实际展示地址（仅 B 站需要走代理）
  const getCoverDisplayUrl = (song?: SongMeta): string | undefined => {
    if (!song || !song.cover) return undefined;
    const original = String(song.cover);
    return song.source === 'bilibili' ? (getBilibiliImageProxyUrl(original) || original) : original;
  };

  // --- 高级取色：K-Means（k-means++ 初始化） + 过滤与采样 ---
  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (d !== 0) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h, s, v };
  };
  const getContrastRatio = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
    const L1 = relativeLuminance(r1, g1, b1);
    const L2 = relativeLuminance(r2, g2, b2);
    const a = Math.max(L1, L2) + 0.05;
    const b = Math.min(L1, L2) + 0.05;
    return a / b;
  };
  const isNearGray = (r: number, g: number, b: number) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    return sat < 0.08; // 非常接近灰
  };
  const kmeansPalette = (points: { r: number; g: number; b: number }[], k: number, iterations = 8) => {
    if (points.length === 0) return [] as { r: number; g: number; b: number; n: number }[];
    // k-means++ 初始化
    const centroids: { r: number; g: number; b: number }[] = [];
    const dist2 = (p: { r: number; g: number; b: number }, c: { r: number; g: number; b: number }) => {
      const dr = p.r - c.r, dg = p.g - c.g, db = p.b - c.b; return dr * dr + dg * dg + db * db;
    };
    centroids.push(points[Math.floor(Math.random() * points.length)]);
    while (centroids.length < k) {
      const dists = points.map(p => Math.min(...centroids.map(c => dist2(p, c))));
      const sum = dists.reduce((a, b) => a + b, 0) || 1;
      let rdm = Math.random() * sum;
      let idx = 0;
      for (let i = 0; i < dists.length; i++) { rdm -= dists[i]; if (rdm <= 0) { idx = i; break; } }
      centroids.push(points[idx]);
    }
    const assign = new Array(points.length).fill(0);
    for (let it = 0; it < iterations; it++) {
      // 归类
      for (let i = 0; i < points.length; i++) {
        let best = 0, bestD = Infinity;
        for (let c = 0; c < centroids.length; c++) {
          const d = dist2(points[i], centroids[c]);
          if (d < bestD) { bestD = d; best = c; }
        }
        assign[i] = best;
      }
      // 更新
      const sum = new Array(centroids.length).fill(0).map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
      for (let i = 0; i < points.length; i++) {
        const c = assign[i];
        sum[c].r += points[i].r; sum[c].g += points[i].g; sum[c].b += points[i].b; sum[c].n++;
      }
      for (let c = 0; c < centroids.length; c++) {
        if (sum[c].n > 0) {
          centroids[c] = { r: sum[c].r / sum[c].n, g: sum[c].g / sum[c].n, b: sum[c].b / sum[c].n };
        }
      }
    }
    // 汇总调色板
    const groups = new Array(centroids.length).fill(0).map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (let i = 0; i < points.length; i++) {
      const c = assign[i];
      groups[c].r += points[i].r; groups[c].g += points[i].g; groups[c].b += points[i].b; groups[c].n++;
    }
    return groups.map(g => g.n > 0 ? ({ r: g.r / g.n, g: g.g / g.n, b: g.b / g.n, n: g.n }) : ({ r: 0, g: 0, b: 0, n: 0 }));
  };
  const extractPalette = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [] as { r: number; g: number; b: number; n: number }[];
    const w = 120, h = 120; // 更高采样以提升准确度
    canvas.width = w; canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const samples: { r: number; g: number; b: number }[] = [];
    const step = 4 * 2; // 每 2 像素采样一次
    for (let i = 0; i < data.length; i += step) {
      const a = data[i + 3]; if (a < 130) continue; // 半透明过滤
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const { s, v } = rgbToHsv(r, g, b);
      if (s < 0.12 || v < 0.15 || v > 0.98) continue; // 过滤低饱和与过亮
      if (isNearGray(r, g, b)) continue; // 灰度过滤
      samples.push({ r, g, b });
    }
    // 限制样本量，随机抽样
    const MAX_SAMPLES = 1500;
    if (samples.length > MAX_SAMPLES) {
      const picked: typeof samples = [];
      for (let i = 0; i < MAX_SAMPLES; i++) picked.push(samples[Math.floor(Math.random() * samples.length)]);
      return kmeansPalette(picked, Math.min(6, Math.max(3, Math.floor(picked.length / 80))))
        .filter(p => p.n > 0);
    }
    return kmeansPalette(samples, Math.min(6, Math.max(3, Math.floor(samples.length / 80))))
      .filter(p => p.n > 0);
  };

  const applyThemeFromCover = (coverUrl: string) => {
    const img = new Image();
    // 允许跨域以绘制canvas
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      const palette = extractPalette(img);
      if (!palette.length) return resetDefaultThemeVars();
      // 选择主色：按样本数与饱和度加权
      const scored = palette.map(p => {
        const { s } = rgbToHsv(p.r, p.g, p.b);
        return { ...p, score: p.n * (0.6 + s * 0.8) };
      }).sort((a, b) => b.score - a.score);
      const main = scored[0];
      // 选择强调色：与主色有一定色相差异并保持可读对比
      const accentCandidate = scored.slice(1).find(p => getContrastRatio(p.r, p.g, p.b, main.r, main.g, main.b) > 1.4) || main;
      // 背景与面板
      const light = mix(main.r, main.g, main.b, 255, 255, 255, 0.82);
      const lighter = mix(light.r, light.g, light.b, 255, 255, 255, 0.1);
      const panel = mix(main.r, main.g, main.b, 255, 255, 255, 0.9);
      const accent = mix(accentCandidate.r, accentCandidate.g, accentCandidate.b, 255, 255, 255, 0.25);
      const textSecondary = getReadableTextColor(panel.r, panel.g, panel.b);
      setMusicThemeVars({
        'music-bg-start': rgbToHex(lighter.r, lighter.g, lighter.b),
        'music-bg-end': rgbToHex(light.r, light.g, light.b),
        'music-accent': rgbToHex(accent.r, accent.g, accent.b),
        'music-panel-bg': rgbToHex(panel.r, panel.g, panel.b),
        'music-text-secondary': textSecondary,
      });
    };
    img.onerror = () => resetDefaultThemeVars();
    img.src = coverUrl;
  };

  // 切换动态主题时持久化与应用
  useEffect(() => {
    try { localStorage.setItem('musicDynamicTheme', dynamicTheme ? '1' : '0'); } catch {}
    if (!dynamicTheme) {
      resetDefaultThemeVars();
    } else if (currentSong?.cover) {
      const url = getCoverDisplayUrl(currentSong);
      if (url) applyThemeFromCover(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicTheme]);

  // 当前歌曲封面变化时应用主题
  useEffect(() => {
    if (!dynamicTheme) return;
    if (currentSong?.cover) {
      const url = getCoverDisplayUrl(currentSong);
      if (url) applyThemeFromCover(url);
    } else {
      resetDefaultThemeVars();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.cover]);

  // —— 均衡器：音频图谱构建与应用 ——
  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      try {
        const Ctor: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctor) audioCtxRef.current = new Ctor();
      } catch {}
    }
    return audioCtxRef.current;
  };
  const ensureMediaSource = () => {
    const a = audioRef.current;
    const ctx = ensureAudioContext();
    if (!a || !ctx) return null;
    if (!mediaSourceRef.current) {
      mediaSourceRef.current = ctx.createMediaElementSource(a);
    }
    return mediaSourceRef.current;
  };
  const buildEqFiltersIfNeeded = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return null;
    if (!eqFiltersRef.current) {
      eqFiltersRef.current = EQ_BANDS.map((freq) => {
        const f = ctx.createBiquadFilter();
        f.type = 'peaking';
        f.frequency.value = freq;
        // 近似参照：较低频更窄，高频更宽；此处统一 Q=1.0，足够简化
        f.Q.value = 1.0;
        f.gain.value = 0;
        return f;
      });
    }
    return eqFiltersRef.current;
  };
  const connectEqGraph = () => {
    if (eqConnectedRef.current) return;
    const ctx = ensureAudioContext();
    const src = ensureMediaSource();
    const filters = buildEqFiltersIfNeeded();
    if (!ctx || !src || !filters || filters.length === 0) return;
    // 串联所有滤波器
    let node: AudioNode = src;
    for (const f of filters) {
      node.connect(f);
      node = f;
    }
    node.connect(ctx.destination);
    eqConnectedRef.current = true;
    forceUpdateTick((t) => t + 1);
  };
  const disconnectEqGraph = () => {
    const ctx = audioCtxRef.current;
    const src = mediaSourceRef.current;
    const filters = eqFiltersRef.current;
    if (!ctx || !src) return;
    try {
      if (filters && filters.length) {
        // 断开串联
        src.disconnect();
        for (const f of filters) {
          try { f.disconnect(); } catch {}
        }
      } else {
        src.disconnect();
      }
    } catch {}
    eqConnectedRef.current = false;
    forceUpdateTick((t) => t + 1);
  };
  const disableEq = () => {
    const ctx = ensureAudioContext();
    const src = ensureMediaSource();
    disconnectEqGraph();
    try {
      if (src && ctx) src.connect(ctx.destination);
    } catch {}
    try { if (audioRef.current) audioRef.current.muted = false; } catch {}
  };
  const applyEqGains = (gains: number[]) => {
    const filters = buildEqFiltersIfNeeded();
    if (!filters) return;
    for (let i = 0; i < filters.length; i++) {
      const g = (gains[i] ?? 0);
      filters[i].gain.value = Math.max(-12, Math.min(12, g));
    }
  };
  // 当增益变化时应用（如已连接）
  useEffect(() => { if (eqConnectedRef.current) applyEqGains(eqGains); }, [eqGains]);
  // 当音频源切换或播放开始时，确保图谱存在
  useEffect(() => {
    // 尝试在播放时恢复上下文
    const a = audioRef.current;
    if (!a) return;
    const onPlay = async () => {
      const ctx = ensureAudioContext();
      if (ctx && ctx.state === 'suspended') {
        try { await ctx.resume(); } catch {}
      }
      // 若已经激活均衡器则确保连接
      if (eqConnectedRef.current) {
        connectEqGraph();
        applyEqGains(eqGains);
        try { if (audioRef.current) audioRef.current.muted = true; } catch {}
      }
    };
    a.addEventListener('play', onPlay);
    return () => a.removeEventListener('play', onPlay);
  }, [eqGains]);

  // 初始化 audio 跨域（以便 WebAudio 在允许时可用）
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    try { a.crossOrigin = 'anonymous'; } catch {}
  }, []);

  // 检测均衡器是否可用（CORS 导致 MediaElementAudioSource 输出为零）
  const verifyEqAvailable = async (): Promise<boolean> => {
    const ctx = ensureAudioContext();
    const src = ensureMediaSource();
    const filters = eqFiltersRef.current;
    if (!ctx || !src) return false;
    const probeNode: AudioNode = filters && filters.length ? filters[filters.length - 1] : src;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    try { probeNode.connect(analyser); } catch {}
    await new Promise((r) => setTimeout(r, 250));
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    try { probeNode.disconnect(analyser); } catch {}
    let sumDev = 0;
    for (let i = 0; i < data.length; i++) sumDev += Math.abs(data[i] - 128);
    const avgDev = sumDev / data.length;
    return avgDev > 1.5;
  };

  const handleEqPresetChange = (name: string) => {
    if (eqAvailable === false && name !== 'Default') {
      // 不可用时仅允许默认
      setEqPreset('Default');
      setEqGains(EQ_PRESETS['Default'].slice());
      disableEq();
      return;
    }
    setEqPreset(name);
    const gains = EQ_PRESETS[name] || EQ_PRESETS['Default'];
    setEqGains(gains.slice());
    // 选择任意预设即启用均衡器
    connectEqGraph();
    applyEqGains(gains);
    try { if (audioRef.current) audioRef.current.muted = true; } catch {}
    // 异步校验：若不可用则回退
    setTimeout(async () => {
      const ok = await verifyEqAvailable();
      setEqAvailable(ok);
      if (!ok) {
        message.warning('当前音频受跨域限制，均衡器不可用，已恢复原声');
        disableEq();
        setEqPreset('Default');
        setEqGains(EQ_PRESETS['Default'].slice());
      }
    }, 60);
  };
  const handleEqGainChange = (idx: number, val: number) => {
    setEqGains((prev) => {
      const next = prev.slice();
      next[idx] = Math.max(-12, Math.min(12, val));
      return next;
    });
  };

  // 音量控制
  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
  };

  // 播放速度控制
  const handleSpeedChange = (value: number) => {
    setPlaybackRate(value);
    if (audioRef.current) {
      audioRef.current.playbackRate = value;
    }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const timeHandler = () => setCurrentTime(a.currentTime || 0);
    const loadedHandler = () => setDuration(a.duration || 0);
    
    // 初始化音量和播放速度
    a.volume = volume / 100;
    a.playbackRate = playbackRate;
    const errorHandler = async () => {
      const songToRetry = loadingSong || playingList?.[currentIndex];
      
      // 简化重试逻辑：只要音频播放失败且有歌曲ID，就直接重试
      if (songToRetry && !isRetrying && !loadingSongId && songToRetry.id) {
        console.log('音频播放失败，尝试重新获取链接...', songToRetry);
        message.warning({ content: '音频链接已过期，正在重新获取...', duration: 2 });
        await retryAudioUrl(songToRetry);
      }
    };
    
    a.addEventListener('timeupdate', timeHandler);
    a.addEventListener('loadedmetadata', loadedHandler);
    a.addEventListener('ended', onEnded);
    a.addEventListener('error', errorHandler);
    
    return () => {
      a.removeEventListener('timeupdate', timeHandler);
      a.removeEventListener('loadedmetadata', loadedHandler);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('error', errorHandler);
    };
  }, [currentIndex, loopMode, playingList?.length, isRetrying, loadingSong]);

  const percent = duration ? (currentTime / duration) * 100 : 0;

  const loopIcon = loopMode === 'order'
    ? <RetweetOutlined />
    : loopMode === 'repeat'
      ? <ReloadOutlined />
      : loopMode === 'single'
        ? (
          <span className="loop-icon single">
            <ReloadOutlined />
            <span className="badge">1</span>
          </span>
        )
        : <SwapOutlined />;
  const loopTitle = loopMode === 'order' ? '顺序播放' : loopMode === 'repeat' ? '列表循环' : loopMode === 'single' ? '单曲循环' : '随机播放';

  return (
    <div className="music-page" ref={musicPageRef}>
      <div className="top-bar">
        <Button className="settings-btn" shape="circle" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} />
        <Input
          className="search-input"
          placeholder={source === 'bilibili' ? '请输入哔哩哔哩视频链接' : source === 'douyin' ? '请输入抖音视频链接' : source === 'qq' ? '搜索歌曲/歌手（QQ会员歌曲无法播放，歌词显示也有问题，不建议使用）' : '搜索歌曲/歌手'}
          prefix={<SearchOutlined />}
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={performSearch}
          addonBefore={
            <Select
              value={source}
              onChange={(v: MusicSourceKey) => setSource(v)}
              style={{ width: 96 }}
              dropdownMatchSelectWidth={200}
            >
              {MUSIC_SOURCES.map(s => (
                <Select.Option key={s.key} value={s.key}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <img src={s.icon} alt={s.name} style={{ width: 16, height: 16, borderRadius: 3 }} />
                    <span>{s.name}</span>
                  </span>
                </Select.Option>
              ))}
            </Select>
          }
        />
      </div>

      <div className="content">
        <div className="left">
          <Spin spinning={!!loadingSongId} tip="加载中...">
            <Card className="album-card" cover={currentSong?.cover ? <img alt="cover" src={getCoverDisplayUrl(currentSong)} /> : undefined}>
              <Typography.Title level={3} className="song-title">
                {currentSong?.name || '未选择歌曲'}
              </Typography.Title>
              <Typography.Text type="secondary">{currentSong?.artist || '--'}</Typography.Text>
            </Card>
          </Spin>

        </div>

        <div className="right">
          <Spin spinning={!!loadingSongId} tip="加载中..." className="lyrics-spin">
            <div className="lyrics-panel">
              {lyricLines.length ? (
                <div className="container" ref={lyricsContainerRef}>
                  <ul
                    ref={lyricsUlRef}
                    style={{ transform: `translateY(-${lyricsOffset}px)` }}
                  >
                    {lyricLines.map((line, i) => (
                      <li
                        key={`${line.time}-${i}`}
                        className={i === activeLyricIndex ? 'active' : ''}
                      >
                        {line.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : plainLyric ? (
                <div className="container" ref={lyricsContainerRef}>
                  <ul ref={lyricsUlRef}>
                    {plainLyric.split(/\r?\n/).filter(Boolean).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="lyrics-empty">
                  <Typography.Text type="secondary">暂无歌词</Typography.Text>
                </div>
              )}
            </div>
          </Spin>
        </div>
      </div>

      <Modal
        title="搜索结果"
        open={searchModalOpen}
        onCancel={() => setSearchModalOpen(false)}
        footer={null}
        width={720}
        destroyOnClose={false}
        maskClosable={true}
      >
        <div className="search-modal-body">
          <Spin spinning={searching} tip="搜索中...">
            {results.length === 0 ? (
              <Empty description="暂无结果" />
            ) : (
              <List
                dataSource={results}
                size="small"
                renderItem={(item) => (
                  <List.Item
                    className={loadingSongId === item.id ? 'result-item loading' : 'result-item'}
                    onClick={async () => {
                      // 若是B站来源且是多P的占位条目（没有url），按id中的#page二次解析并播放
                      if (source === 'bilibili' && (!item.url || String(item.url).length === 0)) {
                        try {
                          const [vid, pgStr] = String(item.id).split('#');
                          const pnum = pgStr ? Number(pgStr) : 1;
                          const wrapped = await getBilibiliAudio(`https://www.bilibili.com/video/${vid}?p=${pnum}`);
                          const payload = wrapped?.data;
                          if (wrapped?.code === 0 && payload?.audioUrl) {
                            const playable: SongMeta = {
                              id: `${payload.videoId || vid}#${pnum}`,
                              name: payload.title || item.name,
                              artist: payload.owner?.name || 'UP主',
                              cover: payload.cover || item.cover,
                              url: payload.audioUrl,
                              duration: undefined,
                              source: 'bilibili',
                            };
                            playSong(playable);
                            return;
                          }
                        } catch {}
                      }
                      playSong(item)
                    }}
                  >
                    <Space direction="vertical" size={0} className="truncate">
                      <span className="result-title">{item.name}</span>
                      <span className="result-sub">{item.artist} {item.album ? `- ${item.album}` : ''}</span>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </div>
      </Modal>

      <Modal
        title="设置"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        footer={null}
        width={720}
        destroyOnClose={false}
        maskClosable={true}
      >
        <div className="settings-modal-body" style={{ display: 'flex', minHeight: 360 }}>
          <div style={{ width: 200, borderRight: '1px solid #f0f0f0', paddingRight: 8 }}>
            <Menu
              mode="inline"
              selectedKeys={[settingsActiveKey]}
              onClick={(e) => setSettingsActiveKey(e.key as 'basic' | 'plan')}
              items={[
                { key: 'basic', label: '基本' },
                { key: 'plan', label: '计划' },
              ]}
            />
          </div>
          <div style={{ flex: 1, paddingLeft: 16 }}>
            {settingsActiveKey === 'basic' && (
              <div style={{ paddingTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>动态主题</div>
                    <div style={{ color: '#8a8f98', fontSize: 12 }}>自动从歌曲封面提取主色并应用</div>
                  </div>
                  <Switch checked={dynamicTheme} onChange={setDynamicTheme} />
                </div>
              </div>
            )}
            {settingsActiveKey === 'plan' && (
              <div style={{ paddingTop: 8 }}>
                <Typography.Title level={5} style={{ marginTop: 0 }}>功能计划</Typography.Title>
                
                <div style={{ maxHeight: 'auto', overflowY: 'auto' }}>
                  {planItems.map((item) => (
                    <div key={item.id} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      marginBottom: 8,
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0'
                    }}>
                      <Checkbox
                        checked={item.completed}
                        disabled={true}
                        style={{ marginRight: 12, marginTop: 2 }}
                      />
                      <span style={{ 
                        flex: 1,
                        textDecoration: item.completed ? 'line-through' : 'none',
                        color: item.completed ? '#999' : '#333',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <div className="controls">
        <div className="time-left">{formatTime(currentTime)}</div>
        <div className="progress">
          <Slider value={percent} onChange={onSeek} tooltip={{ open: false }} />
        </div>
        <div className="time-right">{formatTime(duration)}</div>
      </div>
      <div className="buttons">
        {/* 左侧控制按钮：音量和速度 */}
        <div className="left-controls">
          <div className="control-group">
            <Button 
              type="text" 
              icon={<SoundOutlined />} 
              onClick={() => setVolumeVisible(!volumeVisible)}
              className={volumeVisible ? 'active' : ''}
              title={`音量: ${volume}%`}
            />
            {volumeVisible && (
              <div className="vertical-slider-container">
                <Slider
                  vertical
                  min={0}
                  max={100}
                  value={volume}
                  onChange={handleVolumeChange}
                  tooltip={{ formatter: (value) => `${value}%` }}
                  className="vertical-slider"
                />
              </div>
            )}
          </div>
          
          <div className="control-group">
            <Button 
              type="text" 
              icon={<ThunderboltOutlined />} 
              onClick={() => setSpeedVisible(!speedVisible)}
              className={speedVisible ? 'active' : ''}
              title={`速度: ${playbackRate}x`}
            />
            {speedVisible && (
              <div className="vertical-slider-container">
                <Slider
                  vertical
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={playbackRate}
                  onChange={handleSpeedChange}
                  tooltip={{ formatter: (value) => `${value}x` }}
                  className="vertical-slider"
                />
              </div>
            )}
          </div>

          {/* 均衡器按钮 */}
          <div className="control-group">
            <Button
              type="text"
              icon={<SlidersOutlined />}
              onClick={() => setEqModalOpen(true)}
              className={eqConnectedRef.current ? 'active' : ''}
              title={eqConnectedRef.current ? '均衡器：已开启' : '均衡器'}
            />
          </div>
        </div>

        <div className="center-controls">
        {/* 中央播放控制按钮 */}
        <Space size="large">
          <Button type="text" title={loopTitle} onClick={() => setLoopMode(
            loopMode === 'order' ? 'repeat' : loopMode === 'repeat' ? 'single' : loopMode === 'single' ? 'shuffle' : 'order'
          )}>
            {loopIcon}
          </Button>
          <Button type="text" onClick={handlePrev} icon={<StepBackwardOutlined />} />
          <Button
            type="text"
            onClick={handlePlayPause}
            icon={isPlaying ? <PauseCircleFilled className="play-icon" /> : <PlayCircleFilled className="play-icon" />}
            loading={isRetrying}
            title={isRetrying ? '正在重试音频链接...' : ''}
          />
          <Button type="text" onClick={handleNext} icon={<StepForwardOutlined />} />
          </Space>
        </div>

        {/* 右侧控制按钮：歌单 */}
        <div className="right-controls">
          <Button type="text" onClick={() => setDrawerOpen(true)} icon={<UnorderedListOutlined />} className="playlist-btn" />
        </div>
      </div>

      {/* 均衡器弹窗 */}
      <Modal
        title="均衡器"
        open={eqModalOpen}
        onCancel={() => {
          setEqModalOpen(false);
          // 打开面板时预先检测一次可用性
        }}
        footer={null}
        width={720}
        destroyOnClose={false}
        maskClosable={true}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 面板打开时立即检测一次可用性（仅首次） */}
          {eqAvailable === null ? (setTimeout(async () => { const ok = await verifyEqAvailable(); setEqAvailable(ok); if (!ok) { setEqPreset('Default'); setEqGains(EQ_PRESETS['Default'].slice()); } }, 0), null) : null}
          {/* 可用性提示 */}
          {eqAvailable === false && (
            <Typography.Text type="warning">当前音频受跨域限制，均衡器不可用</Typography.Text>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Default','Pop','Dance','Blues','Classical','Jazz','Ballad','Rock','Electronic','Country','Vocal'].map((k) => (
                <Button
                  key={k}
                  size="middle"
                  type={eqPreset === k ? 'primary' : 'default'}
                  onClick={() => handleEqPresetChange(k)}
                  disabled={eqAvailable === false}
                >
                  {EQ_PRESET_TEXT[k] || k}
                </Button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 16, paddingTop: 4 }}>
            {EQ_BANDS.map((freq, i) => (
              <div key={freq} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Slider
                  vertical
                  min={-12}
                  max={12}
                  step={0.5}
                  value={eqGains[i]}
                  onChange={(v: number) => handleEqGainChange(i, v)}
                  className="vertical-slider"
                  tooltip={{ formatter: (value) => `${value} dB` }}
                />
                <span style={{ fontSize: 12, color: '#666' }}>{freq >= 1000 ? `${Math.round(freq/1000)}k` : freq}Hz</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Drawer
        placement="right"
        title="歌单"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={380}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Typography.Text type="secondary">管理你的歌单</Typography.Text>
          <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => createPlaylist()}>新建歌单</Button>
        </div>
        <Tabs
          activeKey={activeListId}
          onChange={(k) => setActiveListId(k)}
          items={playlists.map(p => ({
            key: p.id,
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>{p.title}</span>
                {!p.system && (
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'rename', label: '重命名' },
                        { key: 'delete', label: '删除歌单' },
                      ],
                      onClick: ({ key }) => {
                        if (key === 'rename') return renamePlaylist(p.id);
                        if (key === 'delete') return deletePlaylist(p.id);
                      },
                    }}
                  >
                    <a onClick={(e) => e.preventDefault()}><MoreOutlined /></a>
                  </Dropdown>
                )}
              </span>
            ),
          }))}
        />
        {/* 歌单工具栏：数量统计 + 过滤搜索 */}
        <div className="playlist-tools">
          <Typography.Text type="secondary">
            歌曲 {filteredActiveList.length}{activeFilter ? ` / 共 ${activeList.length}` : ''} 首
          </Typography.Text>
          <Input
            allowClear
            value={activeFilter}
            placeholder="搜索当前歌单（歌名/歌手）"
            prefix={<SearchOutlined />}
            className="playlist-filter-input"
            onChange={(e) => {
              const v = e.target.value;
              setPlaylistFilters((prev) => ({ ...prev, [activeListId]: v }));
            }}
          />
        </div>
        {filteredActiveList.length === 0 ? (
          <Empty description="暂无歌曲" />
        ) : (
          <List
            dataSource={filteredActiveList}
            renderItem={(item, idx) => {
              const realIndex = activeList.findIndex(s => s.id === item.id);
              const inPlayingList = nowPlayingListId === activeListId && realIndex === currentIndex;
              const activePl = playlists.find(p => p.id === activeListId);
              const biliPl = playlists.find(p => p.title === '哔哩哔哩') || undefined;
              const douyinPl = playlists.find(p => p.title === '抖音') || undefined;
              const addMenuItems = item.source === 'bilibili'
                ? (biliPl ? [{ key: biliPl.id, label: '哔哩哔哩' }] : [])
                : item.source === 'douyin'
                ? (douyinPl ? [{ key: douyinPl.id, label: '抖音' }] : [])
                : [
                    { key: 'create', label: '＋ 新建歌单' },
                    ...playlists
                      .filter(p => p.system !== 'history' && p.title !== '哔哩哔哩')
                      .map(p => ({ key: p.id, label: p.title })),
                  ];
              return (
                <List.Item
                  className={inPlayingList ? 'playlist-item active' : 'playlist-item'}
                  actions={[
                    <a key="play" onClick={() => playSong(item)}>播放</a>,
                    <a key="del" onClick={() => removeFromPlaylist(activeListId, realIndex)}>删除</a>,
                    (activePl?.title === '哔哩哔哩' || activePl?.title === '抖音') ? <a key="edit" onClick={() => openEditSongMeta(activeListId, idx)}>修改</a> : null,
                    (activePl?.title !== '哔哩哔哩' && activePl?.title !== '抖音') ? (
                      <Dropdown
                        key="add"
                        menu={{
                          items: addMenuItems,
                          onClick: ({ key }) => {
                            if (item.source !== 'bilibili' && key === 'create') return createPlaylist();
                            const target = playlists.find(p => p.id === key);
                            if (target) addToPlaylistById(target.id, item);
                          }
                        }}
                      >
                        <Button type="link">添加</Button>
                      </Dropdown>
                    ) : null,
                  ]}
                >
                  <List.Item.Meta
                    title={<span className="truncate">{item.name}</span>}
                    description={<span className="truncate">{item.artist}</span>}
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Drawer>

      <Modal
        title="编辑歌曲信息"
        open={editModalOpen}
        onOk={handleEditOk}
        onCancel={handleEditCancel}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Typography.Text type="secondary">歌曲名称</Typography.Text>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={200} placeholder="请输入歌曲名称" />
          </div>
          <div>
            <Typography.Text type="secondary">歌手名称</Typography.Text>
            <Input value={editArtist} onChange={(e) => setEditArtist(e.target.value)} maxLength={200} placeholder="请输入歌手名称" />
          </div>
          {(() => {
            // 仅对 B站 / 抖音来源的歌曲显示歌词编辑
            const song = editContext ? playlists.find(p => p.id === editContext.listId)?.songs?.[editContext.index] : undefined;
            if (!song || (song.source !== 'bilibili' && song.source !== 'douyin')) return null;
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography.Text type="secondary">歌词（LRC）</Typography.Text>
                  <Space size={8}>
                    <Button size="small" onClick={() => {
                      // 初始化搜索词：歌名 - 歌手
                      const base = `${editName || song.name || ''}${(editArtist || song.artist) ? ' - ' : ''}${editArtist || song.artist || ''}`.trim();
                      setLyricSearchText(base);
                      setLyricSearchOpen(true);
                    }}>搜索歌词</Button>
                    <Button size="small" onClick={() => setEditLrc('')}>清空</Button>
                  </Space>
                </div>
                <Input.TextArea
                  value={editLrc}
                  onChange={(e) => setEditLrc(e.target.value)}
                  autoSize={{ minRows: 6, maxRows: 16 }}
                  placeholder={'[00:00.000] 作词 : 狐离\n[00:00.600] 作曲 : 河图'}
                />
              </div>
            );
          })()}
        </Space>
      </Modal>

      {/* 歌词搜索弹窗 */}
      <Modal
        title="搜索歌词"
        open={lyricSearchOpen}
        onCancel={() => setLyricSearchOpen(false)}
        footer={null}
        width={720}
        destroyOnClose={false}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              value={lyricSource}
              style={{ width: 120 }}
              onChange={(v) => setLyricSource(v)}
              options={[
                { label: '网易云', value: 'netease' },
                { label: 'QQ 音乐', value: 'qq' },
              ]}
            />
            <Input.Search
            value={lyricSearchText}
            onChange={(e) => setLyricSearchText(e.target.value)}
            onSearch={async () => {
              if (!lyricSearchText.trim()) return;
              setLyricSearchLoading(true);
              try {
                  if (lyricSource === 'netease') {
                    const resp = await fetch(`${neteaseSearchApiUrl}?name=${encodeURIComponent(lyricSearchText.trim())}&limit=20`);
                    const data = await resp.json();
                    if (data?.code === 200 && Array.isArray(data?.data)) {
                      const mapped: { id: string | number; title: string; artist: string; duration?: string; lrc?: string }[] = data.data.map((s: any) => ({
                        id: s.id,
                        title: s.name,
                        artist: (Array.isArray(s.artists) && s.artists.length > 0) ? s.artists.map((a: any) => a.name).join(', ') : (s.author || ''),
                        duration: s.duration,
                        lrc: undefined,
                      }));
                      setLyricSearchResults(mapped);
                    } else {
                      setLyricSearchResults([]);
                    }
                  } else if (lyricSource === 'qq') {
                    const resp = await qqSearch(lyricSearchText.trim(), 1, 20);
                    const list = resp?.data?.data?.song?.list;
                    if (Array.isArray(list)) {
                      const mapped: { id: string | number; title: string; artist: string; duration?: string; lrc?: string }[] = list.map((it: any) => {
                        const singers = Array.isArray(it?.singer) && it.singer.length > 0 ? it.singer.map((s: any) => s.name).join(', ') : '';
                        return {
                          id: it?.songmid || it?.songid,
                          title: it?.songname,
                          artist: singers,
                          duration: formatSecondsToMMSS(it?.interval),
                          lrc: undefined,
                        };
                      });
                      setLyricSearchResults(mapped);
                    } else {
                      setLyricSearchResults([]);
                    }
                  }
              } catch (e) {
                setLyricSearchResults([]);
              } finally {
                setLyricSearchLoading(false);
              }
            }}
            placeholder="歌名 或 歌名 - 歌手"
            enterButton="搜索"
            allowClear
            />
          </Space.Compact>
          <Spin spinning={lyricSearchLoading}>
            {lyricSearchResults.length === 0 ? (
              <Empty description="未找到歌词" />
            ) : (
              <List
                dataSource={lyricSearchResults}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key="use"
                        type="link"
                        loading={lyricApplyingId === item.id}
                        disabled={lyricApplyingId !== null && lyricApplyingId !== item.id}
                        onClick={async () => {
                          setLyricApplyingId(item.id);
                          // 若无歌词字段，则用网易云ID再解析一次获取歌词
                          if (!item.lrc) {
                            // 根据来源分别获取歌词
                            if (lyricSource === 'qq') {
                              try {
                                // 优先尝试使用 songmid
                                const lyricResp = await qqLyric({ songmid: String(item.id) });
                                const lrc = lyricResp?.data?.lyric || '';
                                if (lrc) {
                                  setEditLrc(lrc);
                                  message.success('已填入歌词');
                                  setLyricSearchOpen(false);
                                  setLyricApplyingId(null);
                                  return;
                                }
                              } catch {}
                              message.warning('获取QQ歌词失败');
                              setLyricApplyingId(null);
                              return;
                            }
                            try {
                              const resp = await fetch(neteaseApiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: `url=${encodeURIComponent(String(item.id))}&level=exhigh&type=json`,
                              });
                              if (resp.ok) {
                                const data = await resp.json();
                                const lrc = data?.lyric || '';
                                setEditLrc(lrc);
                                message.success(lrc ? '已填入歌词' : '未获取到歌词');
                                setLyricSearchOpen(false);
                                setLyricApplyingId(null);
                                return;
                              }
                            } catch {}
                            message.warning('获取歌词失败');
                            setLyricApplyingId(null);
                            return;
                          }
                          setEditLrc(item.lrc || '');
                          message.success('已填入歌词');
                          setLyricSearchOpen(false);
                          setLyricApplyingId(null);
                        }}
                      >
                        使用
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={<span className="truncate">{item.title}</span>}
                      description={<span className="truncate">{item.artist}{item.duration ? ` · ${item.duration}` : ''}</span>}
                    />
                    <div style={{ maxWidth: 360, color: 'rgba(0,0,0,0.45)' }} className="truncate">
                      {(item.lrc || '').split(/\r?\n/).slice(0, 2).join(' / ')}
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </Space>
      </Modal>

      <audio ref={audioRef} />
    </div>
  );
};

export default MusicPage;


