// 表情包列表页面组件
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { MemeInfo } from '../types';
import type { SortBy } from '../api';
import { getMemeInfos, searchMemes, getImageUrl, getMemePreview } from '../api';
import MemeCard from './MemeCard';

const TAG_DISPLAY_COUNT = 8;
const RECENT_KEY = 'meme_recent_keys';
const RECENT_MAX = 12;

/** 读取最近使用记录 */
function getRecentKeys(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

/** 添加最近使用记录 */
function addRecentKey(key: string) {
  const list = getRecentKeys().filter((k) => k !== key);
  list.unshift(key);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
}

const sortLabels: Record<SortBy, string> = {
  key: '表情key',
  keywords: '关键词',
  keywords_pinyin: '关键词拼音',
  date_created: '创建时间',
  date_modified: '修改时间',
};

interface MemeListProps {
  onSelectMeme: (key: string, info?: MemeInfo) => void;
}

const PREVIEW_CACHE_KEY = 'meme_cache_preview_urls';

function loadPreviewCache(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(PREVIEW_CACHE_KEY) || '{}');
  } catch { return {}; }
}

function savePreviewCache(cache: Record<string, string>) {
  try { sessionStorage.setItem(PREVIEW_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

const MemeList: React.FC<MemeListProps> = ({ onSelectMeme }) => {
  const [recentKeys, setRecentKeys] = useState<string[]>(getRecentKeys);
  const [allMemes, setAllMemes] = useState<MemeInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewCache, setPreviewCache] = useState<Record<string, string>>(loadPreviewCache);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('keywords_pinyin');
  const [sortReverse, setSortReverse] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [displayedTags, setDisplayedTags] = useState<string[]>([]);
  const [tagFading, setTagFading] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // 收集所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allMemes.forEach((m) => m.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [allMemes]);

  // 过滤后的表情包列表
  const displayedMemes = useMemo(() => {
    let memes = [...allMemes];
    if (searchResults !== null) {
      const keySet = new Set(searchResults);
      memes = memes.filter((m) => keySet.has(m.key));
      if (!sortReverse) {
        memes.sort((a, b) => searchResults.indexOf(a.key) - searchResults.indexOf(b.key));
      }
    }
    if (selectedTag) {
      memes = memes.filter((m) => m.tags.includes(selectedTag));
    }
    return memes;
  }, [allMemes, searchResults, selectedTag, sortReverse]);

  // 随机标签
  const shuffleTags = useCallback(() => {
    const all = allTags;
    const pool = selectedTag ? all.filter((t) => t !== selectedTag) : [...all];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = pool.slice(0, selectedTag ? TAG_DISPLAY_COUNT - 1 : TAG_DISPLAY_COUNT);
    if (selectedTag) picked.unshift(selectedTag);
    setDisplayedTags(picked);
  }, [allTags, selectedTag]);

  const refreshTags = () => {
    setTagFading(true);
    setTimeout(() => {
      shuffleTags();
      setTagFading(false);
    }, 200);
  };

  // 搜索防抖
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchMemes(searchQuery.trim(), true);
        setSearchResults(results);
      } catch {
        setSearchResults(null);
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // 获取表情包
  const fetchMemes = async () => {
    try {
      const memes = await getMemeInfos(sortBy, sortReverse);
      setAllMemes(memes);
    } catch (err) {
      console.error('Failed to load memes:', err);
    }
  };

  // 初始化
  useEffect(() => {
    (async () => {
      try {
        await fetchMemes();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 排序变化时重新获取
  useEffect(() => {
    if (!loading) {
      fetchMemes();
    }
  }, [sortBy, sortReverse]);

  // 标签初始化
  useEffect(() => {
    if (allTags.length > 0) {
      shuffleTags();
    }
  }, [allTags.length]);

  // 滚动监听
  useEffect(() => {
    const container = document.querySelector('.meme-generator-container');
    if (!container) return;
    const handleScroll = () => {
      setShowBackToTop(container.scrollTop > 400);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 点击外部关闭排序菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showSortMenu]);

  // 加载预览
  const loadPreview = async (key: string) => {
    if (previewCache[key]) return;
    try {
      const resp = await getMemePreview(key);
      setPreviewCache((prev) => {
        const next = { ...prev, [key]: getImageUrl(resp.image_id) };
        savePreviewCache(next);
        return next;
      });
    } catch {
      // ignore
    }
  };

  // 主动加载最近使用记录的预览图
  useEffect(() => {
    if (!allMemes.length) return;
    recentKeys.forEach((key) => {
      if (!previewCache[key] && allMemes.some((m) => m.key === key)) {
        loadPreview(key);
      }
    });
  }, [recentKeys, allMemes.length]);

  // 选择排序
  const selectSort = (key: SortBy) => {
    if (key === sortBy) {
      setSortReverse(!sortReverse);
    } else {
      setSortBy(key);
      setSortReverse(false);
    }
    setShowSortMenu(false);
  };

  // 选择表情包（记录历史）
  const handleSelectMeme = (key: string) => {
    addRecentKey(key);
    setRecentKeys(getRecentKeys());
    const info = allMemes.find((m) => m.key === key);
    onSelectMeme(key, info);
  };

  // 随机表情
  const goToRandomMeme = () => {
    const pool = displayedMemes.length ? displayedMemes : allMemes;
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    handleSelectMeme(pick.key);
  };

  // 滚动到顶部
  const scrollToTop = () => {
    const container = document.querySelector('.meme-generator-container');
    container?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="meme-list-page">
      {/* Hero */}
      <div className="meme-list-hero">
        <h2 className="meme-list-hero-title">选择一个模板开始制作</h2>
        <p className="meme-list-hero-sub">从 {allMemes.length} 个表情包模板中挑选</p>
      </div>

      {/* 搜索栏 */}
      <div className="meme-search-bar">
        <div className="meme-search-wrap">
          <div className="meme-search-input-wrap">
            <svg className="meme-search-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="meme-input meme-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索表情包（关键词、标签）..."
            />
            {searchQuery && (
              <button className="meme-search-clear" onClick={() => setSearchQuery('')}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button className="meme-dice-btn" onClick={goToRandomMeme} title="随机表情">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" />
            </svg>
          </button>
        </div>
      </div>

      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <div className="meme-tags-section">
          <div className="meme-tags-wrap">
            {(showAllTags ? allTags : displayedTags).map((tag) => (
              <button
                key={tag}
                className={`meme-tag-btn ${selectedTag === tag ? 'meme-tag-btn-active' : ''} ${!showAllTags && tagFading ? 'meme-tag-fading' : ''}`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
            {!showAllTags && (
              <button className="meme-tag-refresh" onClick={refreshTags} title="换一批">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h4.586M20 20v-5h-4.586M4.929 9A9 9 0 0119.071 9M19.071 15A9 9 0 014.929 15" />
                </svg>
              </button>
            )}
            <button
              className="meme-tag-expand"
              onClick={() => setShowAllTags(!showAllTags)}
              title={showAllTags ? '收起' : '展开全部'}
            >
              {showAllTags ? (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  </svg>
                  <span>收起</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  <span>全部</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 排序 */}
      <div className="meme-sort-bar">
        <div className="meme-sort-wrap" ref={sortMenuRef}>
          <button className="meme-sort-btn" onClick={() => setShowSortMenu(!showSortMenu)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h18M3 8h14m-14 4h10m-10 4h6" />
            </svg>
            <span>{sortLabels[sortBy]}</span>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={sortReverse ? 'M12 4v16m0 0l-5-5m5 5l5-5' : 'M12 20V4m0 0l-5 5m5-5l5 5'} />
            </svg>
          </button>
          {showSortMenu && (
            <div className="meme-sort-menu">
              {(Object.keys(sortLabels) as SortBy[]).map((key) => (
                <button
                  key={key}
                  className={`meme-sort-menu-item ${sortBy === key ? 'meme-sort-menu-item-active' : ''}`}
                  onClick={() => selectSort(key)}
                >
                  <span>{sortLabels[key]}</span>
                  {sortBy === key && (
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={sortReverse ? 'M12 4v16m0 0l-5-5m5 5l5-5' : 'M12 20V4m0 0l-5 5m5-5l5 5'} />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 最近使用 */}
      {!loading && recentKeys.length > 0 && !searchQuery && !selectedTag && (() => {
        const recentMemes = recentKeys
          .map((k) => allMemes.find((m) => m.key === k))
          .filter(Boolean) as MemeInfo[];
        if (!recentMemes.length) return null;
        return (
          <div className="meme-recent-section">
            <div className="meme-recent-header">
              <h3 className="meme-recent-title">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                最近使用
              </h3>
              <button
                className="meme-recent-clear"
                onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentKeys([]); }}
              >
                清除记录
              </button>
            </div>
            <div className="meme-recent-list">
              {recentMemes.map((meme) => (
                <button
                  key={meme.key}
                  className="meme-recent-item"
                  onClick={() => handleSelectMeme(meme.key)}
                  title={meme.keywords[0] || meme.key}
                >
                  {previewCache[meme.key] ? (
                    <img src={previewCache[meme.key]} alt={meme.key} className="meme-recent-img" />
                  ) : (
                    <span className="meme-recent-emoji">🖼️</span>
                  )}
                  <span className="meme-recent-name">{meme.keywords[0] || meme.key}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 加载中 */}
      {loading && (
        <div className="meme-loading">
          <svg className="meme-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle className="meme-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="meme-spinner-fill" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>加载中...</span>
        </div>
      )}

      {/* 空状态 */}
      {!loading && displayedMemes.length === 0 && (
        <div className="meme-empty">
          <div className="meme-empty-icon">🔍</div>
          <h3 className="meme-empty-title">没有找到匹配的表情包</h3>
          <p className="meme-empty-sub">尝试使用其他关键词搜索</p>
        </div>
      )}

      {/* 表情包网格 */}
      {!loading && displayedMemes.length > 0 && (
        <>
          <div className="meme-grid">
            {displayedMemes.map((meme) => (
              <MemeCard
                key={meme.key}
                meme={meme}
                previewUrl={previewCache[meme.key]}
                onClick={() => handleSelectMeme(meme.key)}
                onLoadPreview={() => loadPreview(meme.key)}
              />
            ))}
          </div>
          <div className="meme-result-count">{displayedMemes.length} 个结果</div>
        </>
      )}

      {/* 回到顶部 */}
      {showBackToTop && (
        <button className="meme-back-top" onClick={scrollToTop} title="回到顶部">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default MemeList;
