import {
  addEmoticonFavourUsingPost,
  deleteEmoticonFavourUsingPost,
  listEmoticonFavourByPageUsingPost,
} from '@/services/backend/emoticonFavourController';
import { parseWebPageUsingGet } from '@/services/backend/webParserController';
import { externalImageProps } from '@/constants';
import eventBus from '@/utils/eventBus';
import {
  BilibiliOutlined,
  DownloadOutlined,
  FileOutlined,
  LinkOutlined,
  StarFilled,
  StarOutlined,
  DownOutlined,
  TeamOutlined,
  UserAddOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { Button, Card, Image, message } from 'antd';
import DOMPurify from 'dompurify';
import 'prismjs/themes/prism-tomorrow.css';
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { Components } from 'react-markdown';
import rehypePrism from 'rehype-prism-plus';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const ReactMarkdown = lazy(() => import('react-markdown'));

// 懒加载包装，避免每处都写 Suspense
const LazyMarkdown: React.FC<React.ComponentProps<typeof ReactMarkdown>> = (props) => (
  <Suspense fallback={null}>
    <ReactMarkdown {...props} />
  </Suspense>
);
import LuckyBagMessage, { parseLuckyBagInline } from '@/components/LuckyBagMessage';
import RedPacketMessage, { extractRedPacketId } from '@/components/RedPacketMessage';
import styles from './index.less';

// 定义事件名称常量
export const EMOTICON_FAVORITE_CHANGED = 'emoticon_favorite_changed';

const DOUYIN_ICON = 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico';
const CODEFATHER_ICON = 'https://www.codefather.cn/favicon.ico';

interface MessageContentProps {
  content: string;
  onImageLoad?: () => void;
  /** 默认收起图片（悬浮窗/独立小窗配置） */
  collapseImages?: boolean;
}

interface WebPageInfo {
  title?: any;
  description?: any;
  favicon?: string;
}

const URL_REGEX_SOURCE = '(https?://[^\\s]+)';
const IMG_REGEX_SOURCE = '\\[img\\](.*?)\\[/img\\]';
const FILE_REGEX_SOURCE = '\\[file\\](.*?)\\[/file\\]';
const AUDIO_REGEX_SOURCE = '\\[audio\\](.*?)\\[/audio\\]';
const UNDERCOVER_REGEX_SOURCE = '<undercover>(.*?)</undercover>';

const webPageInfoCache = new Map<string, WebPageInfo>();
const webPageInfoRequests = new Map<string, Promise<WebPageInfo>>();
let favoriteEmoticonsCache: API.EmoticonFavour[] | null = null;
let favoriteEmoticonsRequest: Promise<API.EmoticonFavour[]> | null = null;
let favoriteEmoticonsVersion = 0;

async function loadWebPageInfo(url: string): Promise<WebPageInfo> {
  const cached = webPageInfoCache.get(url);
  if (cached) return cached;

  const pending = webPageInfoRequests.get(url);
  if (pending) return pending;

  const request = parseWebPageUsingGet({ url })
    .then((response) => {
      const info: WebPageInfo =
        response.code === 0 && response.data
          ? {
              title: response.data.title || '未知标题',
              description: response.data.description || '暂无描述',
              favicon: response.data.favicon,
            }
          : { title: '未知网页', description: '获取网页信息失败' };
      webPageInfoCache.set(url, info);
      return info;
    })
    .catch((error) => {
      console.error('获取网页信息失败:', error);
      const fallback = { title: '未知网页', description: '获取网页信息失败' };
      webPageInfoCache.set(url, fallback);
      return fallback;
    })
    .finally(() => {
      webPageInfoRequests.delete(url);
    });

  webPageInfoRequests.set(url, request);
  return request;
}

function extractUrls(content: string): string[] {
  const plainContent = content
    .replace(new RegExp(IMG_REGEX_SOURCE, 'gi'), '')
    .replace(new RegExp(FILE_REGEX_SOURCE, 'gi'), '')
    .replace(new RegExp(AUDIO_REGEX_SOURCE, 'gi'), '');
  const matches = plainContent.match(new RegExp(URL_REGEX_SOURCE, 'g')) || [];
  return [...new Set(matches)];
}

function checkIframeSyntax(text: string): boolean {
  return /<iframe[^>]*>.*?<\/iframe>/gi.test(text);
}

async function loadFavoriteEmoticons(force = false): Promise<API.EmoticonFavour[]> {
  if (!force && favoriteEmoticonsCache) return favoriteEmoticonsCache;
  if (favoriteEmoticonsRequest) return favoriteEmoticonsRequest;

  const requestVersion = favoriteEmoticonsVersion;
  const request = listEmoticonFavourByPageUsingPost({ current: 1, pageSize: 100 })
    .then((response) => {
      const favorites = response.code === 0 ? response.data?.records || [] : [];
      if (requestVersion === favoriteEmoticonsVersion) {
        favoriteEmoticonsCache = favorites;
      }
      return favorites;
    })
    .catch((error) => {
      console.error('获取收藏表情包失败:', error);
      return favoriteEmoticonsCache || [];
    })
    .finally(() => {
      if (favoriteEmoticonsRequest === request) {
        favoriteEmoticonsRequest = null;
      }
    });

  favoriteEmoticonsRequest = request;
  return request;
}

const MessageContent: React.FC<MessageContentProps> = ({
  content,
  onImageLoad,
  collapseImages = false,
}) => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const [webPages, setWebPages] = useState<Record<string, WebPageInfo>>(() => {
    const cachedEntries = extractUrls(content)
      .map((url) => [url, webPageInfoCache.get(url)] as const)
      .filter((entry): entry is readonly [string, WebPageInfo] => Boolean(entry[1]));
    return Object.fromEntries(cachedEntries);
  });
  const [favoriteEmoticons, setFavoriteEmoticons] = useState<API.EmoticonFavour[]>(
    () => favoriteEmoticonsCache || [],
  );
  // URL匹配正则表达式
  const urlRegex = new RegExp(URL_REGEX_SOURCE, 'g');
  // 图片标签匹配正则表达式
  const imgRegex = new RegExp(IMG_REGEX_SOURCE, 'g');
  // 文件标签匹配正则表达式
  const fileRegex = new RegExp(FILE_REGEX_SOURCE, 'g');
  // 音频标签匹配正则表达式
  const audioRegex = new RegExp(AUDIO_REGEX_SOURCE, 'g');
  // 谁是卧底邀请标签匹配正则表达式
  const undercoverRegex = new RegExp(UNDERCOVER_REGEX_SOURCE, 'g');
  // 添加折叠状态管理
  const [collapsedImages, setCollapsedImages] = useState<Set<string>>(new Set());
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());
  const isSpecialMessage = useMemo(() => {
    const trimmedContent = content.trim();
    const isOnlyImg = trimmedContent.startsWith('[img]') && trimmedContent.endsWith('[/img]') &&
      trimmedContent.match(/\[img\]/g)?.length === 1;
    const isOnlyFile = trimmedContent.startsWith('[file]') && trimmedContent.endsWith('[/file]') &&
      trimmedContent.match(/\[file\]/g)?.length === 1;
    const isOnlyAudio = trimmedContent.startsWith('[audio]') && trimmedContent.endsWith('[/audio]') &&
      trimmedContent.match(/\[audio\]/gi)?.length === 1;
    const isOnlyUndercover = trimmedContent.startsWith('<undercover>') &&
      trimmedContent.endsWith('</undercover>') &&
      trimmedContent.match(/<undercover>/g)?.length === 1;
    return isOnlyImg || isOnlyFile || isOnlyAudio || isOnlyUndercover || checkIframeSyntax(content);
  }, [content]);

  // 添加收藏
  const addFavorite = async (emoticonSrc: string) => {
    try {
      const response = await addEmoticonFavourUsingPost(emoticonSrc);
      if (response.code === 0) {
        message.success('收藏成功');
        favoriteEmoticonsVersion += 1;
        favoriteEmoticonsCache = null;
        favoriteEmoticonsRequest = null;
        // 触发事件通知其他组件刷新收藏列表
        eventBus.emit(EMOTICON_FAVORITE_CHANGED, 'add', emoticonSrc);
      } else {
        message.error('收藏失败');
      }
    } catch (error) {
      console.error('收藏失败:', error);
      message.error('收藏失败');
    }
  };

  // 取消收藏
  const removeFavorite = async (id: number) => {
    try {
      const response = await deleteEmoticonFavourUsingPost({ id: String(id) });
      if (response.code === 0) {
        message.success('取消收藏成功');
        favoriteEmoticonsVersion += 1;
        favoriteEmoticonsCache = null;
        favoriteEmoticonsRequest = null;
        // 触发事件通知其他组件刷新收藏列表
        eventBus.emit(EMOTICON_FAVORITE_CHANGED, 'remove', id);
      } else {
        message.error('取消收藏失败');
      }
    } catch (error) {
      console.error('取消收藏失败:', error);
      message.error('取消收藏失败');
    }
  };

  // 检查是否是收藏的表情
  const isFavorite = (url: string) => {
    return favoriteEmoticons.some((fav) => fav.emoticonSrc === url);
  };

  // 切换收藏状态
  const toggleFavorite = (url: string) => {
    const favorite = favoriteEmoticons.find((fav) => fav.emoticonSrc === url);
    if (favorite) {
      removeFavorite(favorite.id!);
    } else {
      addFavorite(url);
    }
  };

  // 监听收藏变化事件
  useEffect(() => {
    // 只有图片消息需要收藏状态；模块级缓存合并多个消息组件的相同请求。
    if (!currentUser?.id || !new RegExp(IMG_REGEX_SOURCE, 'i').test(content)) return;

    let cancelled = false;
    const refreshFavorites = (force = false) => {
      loadFavoriteEmoticons(force).then((favorites) => {
        if (!cancelled) setFavoriteEmoticons(favorites);
      });
    };
    const handleFavoriteChanged = () => refreshFavorites(true);

    refreshFavorites();

    eventBus.on(EMOTICON_FAVORITE_CHANGED, handleFavoriteChanged);

    return () => {
      cancelled = true;
      eventBus.off(EMOTICON_FAVORITE_CHANGED, handleFavoriteChanged);
    };
  }, [content, currentUser?.id]);

  // 截断文本到指定长度
  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // 链接预览属于副作用，集中在 effect 中执行，并通过模块级缓存跨消息去重。
  useEffect(() => {
    const urls = extractUrls(content);
    if (urls.length === 0) return;

    let cancelled = false;
    Promise.all(urls.map(async (url) => [url, await loadWebPageInfo(url)] as const)).then(
      (entries) => {
        if (!cancelled) {
          setWebPages((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [content]);

  // 处理文件下载
  const handleFileDownload = (url: string) => {
    // 从URL中提取文件名
    const fileName = url.split('/').pop() || '未知文件';

    // 创建一个临时的a标签来触发下载
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 在组件顶部添加状态
  const [imageDisplayMode, setImageDisplayMode] = useState('show');
  const [shownImages, setShownImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const siteConfig = localStorage.getItem('siteConfig');
    if (siteConfig) {
      const { imageDisplayMode: mode } = JSON.parse(siteConfig);
      setImageDisplayMode(mode || 'show');
    }
  }, []);

  useEffect(() => {
    if (!collapseImages) {
      setExpandedImages(new Set());
    }
  }, [collapseImages]);

  // 修改renderImage函数
  const renderImage = (url: string, key: string) => {
    const isHidden = imageDisplayMode === 'hide' && !shownImages.has(url);
    const isCollapsed = collapsedImages.has(url);

    if (isHidden) {
      return (
        <div
          key={key}
          className={styles.imageText}
          onClick={() => {
            setShownImages(prev => new Set([...prev, url]));
          }}
        >
          图片（点击显示）
        </div>
      );
    }

    if (collapseImages && !expandedImages.has(url)) {
      return (
        <div
          key={key}
          className={styles.imageText}
          onClick={() => {
            setExpandedImages((prev) => new Set([...prev, url]));
          }}
        >
          图片已折叠（点击展开）
        </div>
      );
    }

    if (isCollapsed) {
      return (
        <div
          key={key}
          className={styles.imageText}
          onClick={() => {
            setCollapsedImages(prev => {
              const newSet = new Set(prev);
              newSet.delete(url);
              return newSet;
            });
          }}
        >
          图片已折叠（点击展开）
        </div>
      );
    }

    return (
      <div key={key} className={styles.imageContainer}>
        <Image
          {...externalImageProps}
          src={url}
          alt="图片"
          className={styles.messageImage}
          preview={{
            mask: false,
          }}
          onLoad={() => {
            onImageLoad?.();
          }}
        />
        <div className={styles.imageControlButtons}>
          {imageDisplayMode === 'hide' && (
            <Button
              type="text"
              size="small"
              className={styles.hideButton}
              onClick={() => {
                setShownImages(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(url);
                  return newSet;
                });
              }}
            >
              隐藏
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<DownOutlined />}
            className={styles.collapseButton}
            onClick={(e) => {
              e.stopPropagation();
              setCollapsedImages(prev => {
                const newSet = new Set(prev);
                newSet.add(url);
                return newSet;
              });
            }}
            title="折叠图片"
          />
          <Button
            type="text"
            size="small"
            icon={isFavorite(url) ? <StarFilled style={{ color: '#ffd700' }} /> : <StarOutlined />}
            className={styles.favoriteButton}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(url);
            }}
            title={isFavorite(url) ? "取消收藏" : "收藏图片"}
          />
        </div>
      </div>
    );
  };

  // 渲染音频
  const renderAudio = (url: string, key: string) => (
    <div key={key} className={styles.audioContainer}>
      <audio controls src={url} className={styles.audioPlayer} preload="metadata" />
    </div>
  );

  // 渲染文件
  const renderFile = (url: string, key: string) => {
    const fileName = url.split('/').pop() || '未知文件';
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

    // 获取文件图标
    const getFileIcon = (ext: string) => {
      // 可以根据文件类型返回不同的图标
      const iconMap: { [key: string]: React.ReactNode } = {
        pdf: <FileOutlined style={{ color: '#ff4d4f' }} />,
        doc: <FileOutlined style={{ color: '#1890ff' }} />,
        docx: <FileOutlined style={{ color: '#1890ff' }} />,
        xls: <FileOutlined style={{ color: '#52c41a' }} />,
        xlsx: <FileOutlined style={{ color: '#52c41a' }} />,
        txt: <FileOutlined style={{ color: '#722ed1' }} />,
        // 可以添加更多文件类型
      };
      return iconMap[ext] || <FileOutlined style={{ color: '#1890ff' }} />;
    };

    return (
      <div key={key} className={styles.fileContainer}>
        <Card className={styles.fileCard} size="small">
          <div className={styles.fileInfo}>
            <span className={styles.fileIcon}>{getFileIcon(fileExt)}</span>
            <span className={styles.fileName} title={fileName}>
              {fileName}
            </span>
          </div>
          <Button
            type="link"
            className={styles.downloadButton}
            onClick={() => handleFileDownload(url)}
          >
            <DownloadOutlined /> 下载文件
          </Button>
        </Card>
      </div>
    );
  };

  // 渲染URL内容
  const renderUrl = (url: string, key: string) => {
    // 检查是否是B站链接
    if (url.includes('bilibili.com')) {
      return (
        <Card key={key} className={styles.linkCard} size="small" hoverable>
          <div className={styles.linkContent}>
            <BilibiliOutlined className={styles.linkIcon} />
            <div className={styles.linkInfo}>
              {webPages[url] ? (
                <>
                  <div className={styles.videoTitle}>{webPages[url].title}</div>
                  {webPages[url].description && (
                    <div className={styles.videoDescription}>
                      {truncateText(webPages[url].description, 50)}
                    </div>
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkText}
                  >
                    {truncateText(url, 30)}
                  </a>
                </>
              ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" className={styles.linkText}>
                  {url}
                </a>
              )}
            </div>
          </div>
        </Card>
      );
    }

    // 检查是否是抖音链接
    if (url.includes('douyin.com')) {
      return (
        <Card key={key} className={styles.linkCard} size="small" hoverable>
          <div className={styles.linkContent}>
            <img
              src={DOUYIN_ICON}
              alt="抖音"
              className={styles.linkIcon}
              style={{ width: '16px', height: '16px' }}
            />
            <div className={styles.linkInfo}>
              {webPages[url] ? (
                <>
                  <div className={styles.videoTitle}>{webPages[url].title}</div>
                  {webPages[url].description && (
                    <div className={styles.videoDescription}>
                      {truncateText(webPages[url].description, 50)}
                    </div>
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkText}
                  >
                    {truncateText(url, 30)}
                  </a>
                </>
              ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" className={styles.linkText}>
                  {url}
                </a>
              )}
            </div>
          </div>
        </Card>
      );
    }

    // 检查是否是编程导航链接
    if (url.includes('codefather.cn/post/')) {
      return (
        <Card key={key} className={styles.linkCard} size="small" hoverable>
          <div className={styles.linkContent}>
            <img
              src={CODEFATHER_ICON}
              alt="编程导航"
              className={styles.linkIcon}
              style={{ width: '16px', height: '16px' }}
            />
            <div className={styles.linkInfo}>
              {webPages[url] ? (
                <>
                  <div className={styles.videoTitle}>{webPages[url].title}</div>
                  {webPages[url].description && (
                    <div className={styles.videoDescription}>
                      {truncateText(webPages[url].description, 50)}
                    </div>
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkText}
                  >
                    {truncateText(url, 30)}
                  </a>
                </>
              ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" className={styles.linkText}>
                  {truncateText(url, 30)}
                </a>
              )}
            </div>
          </div>
        </Card>
      );
    }

    // 其他 URL 显示为普通链接，预览信息由上方 effect 异步填充。
    // @ts-ignore
    return (
      <Card key={key} className={styles.linkCard} size="small" hoverable>
        <div className={styles.linkContent}>
          {webPages[url]?.favicon ? (
            <img
              {...externalImageProps}
              src={webPages[url].favicon}
              alt="网站图标"
              className={styles.linkIcon}
              style={{ width: '16px', height: '16px' }}
            />
          ) : (
            <LinkOutlined className={styles.linkIcon} />
          )}
          <div className={styles.linkInfo}>
            {webPages[url] ? (
              <>
                <div className={styles.videoTitle}>{webPages[url].title}</div>
                {webPages[url].description && (
                  <div className={styles.videoDescription}>
                    {truncateText(webPages[url].description, 50)}
                  </div>
                )}
                <a href={url} target="_blank" rel="noopener noreferrer" className={styles.linkText}>
                  {truncateText(url, 30)}
                </a>
              </>
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" className={styles.linkText}>
                {url}
              </a>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // 渲染谁是卧底邀请
  const renderUndercoverInvite = (content: string, key: string) => {
    // 提取房间ID但不在UI中显示
    const roomIdMatch = content.match(/房间ID: ([a-zA-Z0-9]+)/);
    const roomId = roomIdMatch ? roomIdMatch[1] : '';

    // 提取邀请文本，去掉房间ID部分
    const inviteText = content.replace(/房间ID: [a-zA-Z0-9]+/, '').trim();

    return (
      <Card key={key} className={styles.inviteCard} size="small" hoverable>
        <div className={styles.inviteContent}>
          <TeamOutlined className={styles.inviteIcon} />
          <div className={styles.inviteInfo}>
            <div className={styles.inviteTitle}>谁是卧底游戏</div>
            <div className={styles.inviteDescription}>{inviteText}</div>
            <Button
              type="primary"
              size="small"
              icon={<UserAddOutlined />}
              onClick={() => {
                if (roomId) {
                  // 添加日志，帮助调试
                  console.log('触发加入谁是卧底房间事件，房间ID:', roomId);
                  // 确保roomId是字符串类型
                  eventBus.emit('join_undercover_room', String(roomId));
                } else {
                  message.error('无效的邀请');
                }
              }}
              className={styles.joinButton}
            >
              加入游戏
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // 添加复制消息到剪贴板的函数
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        message.success('复制成功');
      })
      .catch((err) => {
        console.error('复制失败:', err);
        message.error('复制失败');
      });
  };

  // 添加安全的 HTML 渲染函数
  const sanitizeHtml = (html: string) => {
    // 添加钩子，移除标题标签的 class 属性
    DOMPurify.addHook('afterSanitizeAttributes', function (node) {
      // 检查节点是否为标题标签
      if (node.tagName && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName)) {
        // 移除 class 属性
        node.removeAttribute('class');
      }
    });

    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'code',
        'pre',
        'blockquote',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'a',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class'],
      FORBID_TAGS: [
        'iframe',
        'script',
        'style',
        'form',
        'input',
        'button',
        'textarea',
        'select',
        'option',
        'object',
        'embed',
        'param',
        'meta',
        'link',
      ],
      FORBID_ATTR: [
        'onerror',
        'onload',
        'onclick',
        'onmouseover',
        'onmouseout',
        'onmouseenter',
        'onmouseleave',
        'onblur',
        'onfocus',
        'onchange',
        'onsubmit',
        'onreset',
        'onkeydown',
        'onkeypress',
        'onkeyup',
        'onmousedown',
        'onmouseup',
        'onmousemove',
        'onmousewheel',
        'onwheel',
        'onresize',
        'onscroll',
        'onabort',
        'oncanplay',
        'oncanplaythrough',
        'oncuechange',
        'ondurationchange',
        'onemptied',
        'onended',
        'onerror',
        'onloadeddata',
        'onloadedmetadata',
        'onloadstart',
        'onpause',
        'onplay',
        'onplaying',
        'onprogress',
        'onratechange',
        'onseeked',
        'onseeking',
        'onstalled',
        'onsuspend',
        'ontimeupdate',
        'onvolumechange',
        'onwaiting',
        'onbeforecopy',
        'onbeforecut',
        'onbeforepaste',
        'oncopy',
        'oncut',
        'onpaste',
        'onselect',
        'onselectionchange',
        'onselectstart',
        'oncontextmenu',
        'ondrag',
        'ondragend',
        'ondragenter',
        'ondragleave',
        'ondragover',
        'ondragstart',
        'ondrop',
        'onblur',
        'onfocus',
        'onfocusin',
        'onfocusout',
        'onkeydown',
        'onkeypress',
        'onkeyup',
        'onclick',
        'ondblclick',
        'onmousedown',
        'onmouseenter',
        'onmouseleave',
        'onmousemove',
        'onmouseout',
        'onmouseover',
        'onmouseup',
        'onwheel',
        'onresize',
        'onscroll',
        'onabort',
        'oncanplay',
        'oncanplaythrough',
        'oncuechange',
        'ondurationchange',
        'onemptied',
        'onended',
        'onerror',
        'onloadeddata',
        'onloadedmetadata',
        'onloadstart',
        'onpause',
        'onplay',
        'onplaying',
        'onprogress',
        'onratechange',
        'onseeked',
        'onseeking',
        'onstalled',
        'onsuspend',
        'ontimeupdate',
        'onvolumechange',
        'onwaiting',
        'onbeforecopy',
        'onbeforecut',
        'onbeforepaste',
        'oncopy',
        'oncut',
        'onpaste',
        'onselect',
        'onselectionchange',
        'onselectstart',
        'oncontextmenu',
        'ondrag',
        'ondragend',
        'ondragenter',
        'ondragleave',
        'ondragover',
        'ondragstart',
        'ondrop',
      ],
    });

    // 及时移除钩子，避免影响其他地方的 DOMPurify 使用
    DOMPurify.removeHook('afterSanitizeAttributes');

    return sanitized;
  };

  // 修改 ReactMarkdown 组件的配置
  const markdownComponents: Components = {
    // 自定义链接渲染，避免与我们的URL渲染冲突
    a: ({ node: _node, ...props }: { node?: any; [key: string]: any }) => {
      const href = props.href || '';
      if (href.match(urlRegex)) {
        return renderUrl(href, `markdown-url-${Date.now()}`);
      }
      return <a {...props} target="_blank" rel="noopener noreferrer" />;
    },
    // 自定义图片渲染，避免与我们的图片标签冲突
    img: ({ node: _node, ...props }: { node?: any; [key: string]: any }) => {
      const src = props.src || '';
      if (src.match(/^https?:\/\//)) {
        return renderImage(src, `img-${Date.now()}`);
      }
      return <img {...props} alt={props.alt || '图片'} {...externalImageProps} />;
    },
    // 自定义 iframe 渲染，直接返回 null
    iframe: () => null,
    // 自定义 script 渲染，直接返回 null
    script: () => null,
    // 自定义 style 渲染，直接返回 null
    style: () => null,
  };

  // 修改 parseContent 函数
  const parseContent = () => {
    // 检查是否包含 iframe 语法
    if (checkIframeSyntax(content)) {
      return <div className={styles.messageContent}>消息包含不安全的 iframe 标签，已被过滤</div>;
    }

    const redPacketId = extractRedPacketId(content);
    if (redPacketId) {
      return <RedPacketMessage redPacketId={redPacketId} />;
    }

    const luckyBagInline = parseLuckyBagInline(content);
    if (luckyBagInline) {
      return (
        <LuckyBagMessage luckyBagId={luckyBagInline.luckyBagId} prefix={luckyBagInline.prefix || undefined} />
      );
    }

    let parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // 处理谁是卧底邀请标签
    while ((match = undercoverRegex.exec(content)) !== null) {
      // 添加邀请前的文本
      if (match.index > lastIndex) {
        const textBeforeInvite = content.slice(lastIndex, match.index);
        parts.push(
          <LazyMarkdown
            key={`markdown-before-invite-${match.index}`}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, [rehypePrism, { ignoreMissing: true }]]}
            components={markdownComponents}
          >
            {sanitizeHtml(textBeforeInvite)}
          </LazyMarkdown>
        );
      }
      // 添加谁是卧底邀请组件
      parts.push(renderUndercoverInvite(match[1], `undercover-${match.index}`));
      lastIndex = match.index + match[0].length;
    }

    // 如果没有谁是卧底邀请标签，或者处理完邀请标签后还有剩余内容，继续处理其他标签
    if (lastIndex === 0 || lastIndex < content.length) {
      const remainingContent = content.slice(lastIndex);

      // 重置lastIndex用于处理图片标签
      lastIndex = 0;

      // 处理图片标签
      while ((match = imgRegex.exec(remainingContent)) !== null) {
        // 添加图片前的文本
        if (match.index > lastIndex) {
          const textBeforeImg = remainingContent.slice(lastIndex, match.index);
          // 处理文本中的URL
          const urlParts = textBeforeImg.split(urlRegex);
          urlParts.forEach((urlPart, urlIndex) => {
            if (urlPart.match(urlRegex)) {
              parts.push(renderUrl(urlPart, `url-${match!.index}-${urlIndex}`));
            } else if (urlPart) {
              parts.push(
                <LazyMarkdown
                  key={`markdown-${match!.index}-${urlIndex}`}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, [rehypePrism, { ignoreMissing: true }]]}
                  components={markdownComponents}
                >
                  {sanitizeHtml(urlPart)}
                </LazyMarkdown>,
              );
            }
          });
        }
        // 添加图片组件,传入 onImageLoad 回调
        parts.push(renderImage(match[1], `img-${match.index}`));
        lastIndex = match.index + match[0].length;
      }

      // 处理文件标签
      const imgProcessedContent = remainingContent.slice(lastIndex);
      let fileLastIndex = 0;
      let fileMatch: RegExpExecArray | null;

      while ((fileMatch = fileRegex.exec(imgProcessedContent)) !== null) {
        // 处理文件前的文本（包括URL解析）
        if (fileMatch.index > fileLastIndex) {
          const textBeforeFile = imgProcessedContent.slice(fileLastIndex, fileMatch.index);
          // 处理文本中的URL
          const urlParts = textBeforeFile.split(urlRegex);
          urlParts.forEach((urlPart, urlIndex) => {
            if (urlPart.match(urlRegex)) {
              parts.push(renderUrl(urlPart, `url-file-${fileMatch!.index}-${urlIndex}`));
            } else if (urlPart) {
              parts.push(
                <LazyMarkdown
                  key={`markdown-file-${fileMatch!.index}-${urlIndex}`}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, [rehypePrism, { ignoreMissing: true }]]}
                  components={markdownComponents}
                >
                  {sanitizeHtml(urlPart)}
                </LazyMarkdown>,
              );
            }
          });
        }
        // 添加文件组件
        parts.push(renderFile(fileMatch[1], `file-${fileMatch.index}`));
        fileLastIndex = fileMatch.index + fileMatch[0].length;
      }

      // 处理音频标签
      const fileProcessedContent = imgProcessedContent.slice(fileLastIndex);
      let audioLastIndex = 0;
      let audioMatch: RegExpExecArray | null;

      while ((audioMatch = audioRegex.exec(fileProcessedContent)) !== null) {
        if (audioMatch.index > audioLastIndex) {
          const textBeforeAudio = fileProcessedContent.slice(audioLastIndex, audioMatch.index);
          const urlParts = textBeforeAudio.split(urlRegex);
          urlParts.forEach((urlPart, urlIndex) => {
            if (urlPart.match(urlRegex)) {
              parts.push(renderUrl(urlPart, `url-audio-${audioMatch!.index}-${urlIndex}`));
            } else if (urlPart) {
              parts.push(
                <LazyMarkdown
                  key={`markdown-audio-${audioMatch!.index}-${urlIndex}`}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, [rehypePrism, { ignoreMissing: true }]]}
                  components={markdownComponents}
                >
                  {sanitizeHtml(urlPart)}
                </LazyMarkdown>,
              );
            }
          });
        }
        parts.push(renderAudio(audioMatch[1].trim(), `audio-${audioMatch.index}`));
        audioLastIndex = audioMatch.index + audioMatch[0].length;
      }

      // 处理剩余文本中的URL
      if (audioLastIndex < fileProcessedContent.length) {
        const finalText = fileProcessedContent.slice(audioLastIndex);
        const urlParts = finalText.split(urlRegex);
        urlParts.forEach((urlPart, urlIndex) => {
          if (urlPart.match(urlRegex)) {
            parts.push(renderUrl(urlPart, `url-final-${urlIndex}`));
          } else if (urlPart) {
            parts.push(
              <LazyMarkdown
                key={`markdown-final-${urlIndex}`}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, [rehypePrism, { ignoreMissing: true }]]}
                components={markdownComponents}
              >
                {sanitizeHtml(urlPart)}
              </LazyMarkdown>,
            );
          }
        });
      }
    }

    return parts;
  };

  return <div className={styles.messageContent}>
    {!isSpecialMessage && (
      <div className={styles.copyButton}>
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(content);
          }}
          title="复制消息"
        />
      </div>
    )}
    {parseContent()}
  </div>;
};

export default React.memo(MessageContent, (prev, next) => (
  prev.content === next.content &&
  prev.collapseImages === next.collapseImages &&
  prev.onImageLoad === next.onImageLoad
));
