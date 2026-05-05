import Footer from '@/components/Footer';
import type {RunTimeLayoutConfig} from '@umijs/max';
import {history, useModel} from '@umijs/max';
import defaultSettings from '../config/defaultSettings';
import {AvatarDropdown} from './components/RightContent/AvatarDropdown';
import {requestConfig} from './requestConfig';
import {getLoginUserUsingGet} from "@/services/backend/userController";
import {useEffect, useState} from "react";
import BossKeySettings from '@/components/BossKeySettings';
import SideAnnouncement from '@/components/SideAnnouncement';
import GlobalReader from '@/components/GlobalFloatingReader';
import routes from '../config/routes';
import GlobalTitle from '@/components/GlobalTitle';
import {Board, Player, Position, Move, WinningLine} from '@/game';
import {unregisterServiceWorker} from './utils/unregisterServiceWorker';

const loginPath = '/user/login';

// 获取网站名称
const getSiteName = () => {
  const savedSiteConfig = localStorage.getItem('siteConfig');
  if (savedSiteConfig) {
    const { siteName } = JSON.parse(savedSiteConfig);
    return siteName || defaultSettings.title;
  }
  return defaultSettings.title;
};

// 监听路由变化
const listenRouteChange = () => {
  history.listen(({ location }) => {
    // 设置网站标题 - 优先使用用户设置的网站名称，否则使用defaultSettings中的标题
    const pathname = location.pathname;
    let title = getSiteName();


    // 更新 meta 描述
    let description = '摸鱼岛 - 一个有趣的在线游戏平台，提供多种休闲游戏和社交功能';
    if (pathname.startsWith('/game')) {
      description = '摸鱼岛游戏中心 - 提供五子棋、2048、模拟赛车等多种休闲游戏';
    } else if (pathname === '/chat') {
      description = '摸鱼室 - 与好友聊天、分享生活趣事的社交空间';
    }

    // 更新 meta 描述
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.appendChild(meta);
    }
  });
};

/**
 * 监听老板键（Ctrl + Shift + B）切换工作模式
 */
const useBossKey = () => {
  const [isBossMode, setIsBossMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState({
    image: 'https://www.baidu.com/img/flexible/logo/pc/result.png',
    title: '工作页面',
    placeholder: '百度一下，你就知道'
  });

  useEffect(() => {
    // 加载保存的配置
    const savedConfig = localStorage.getItem('bossKeyConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'B') {
        history.push('/home'); // 跳转到 home 路由
      } else if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        setShowSettings(true); // 打开设置
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return {isBossMode, showSettings, setShowSettings, config, setConfig};
};

// 检查当前路由是否需要登录验证
const checkNeedAuth = (pathname: string) => {
  const findRoute = (routes: any[], path: string): boolean => {
    for (const route of routes) {
      if (route.path === path) {
        return route.requireAuth !== false;
      }
      if (route.routes) {
        const found = findRoute(route.routes, path);
        if (found !== undefined) {
          return found;
        }
      }
    }
    return true; // 默认需要登录
  };
  return findRoute(routes, pathname);
};

interface InitialState {
  currentUser?: API.LoginUserVO;
  gameState?: {
    opponentInfo: any;
    mode: 'single' | 'online';
    onlineStatus: 'connecting' | 'waiting' | 'playing';
    roomId: string;
    opponentColor: 'black' | 'white';
    opponentUserId: string;
    playerColor: 'black' | 'white';
    gameStarted: boolean;
    board: Board;
    moves: Move[];
    lastMove: Position | null;
    opponentLastMove: Position | null;
    winningLine: WinningLine | null;
    winner: Player | null;
  };
}

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<InitialState> {
  // 注销 Service Worker
  await unregisterServiceWorker();

  const initialState: InitialState = {
    currentUser: undefined,
    gameState: undefined,
  };
  const {location} = history;

  // 应用网站设置
  const savedSiteConfig = localStorage.getItem('siteConfig');
  if (savedSiteConfig) {
    const {siteName, siteIcon} = JSON.parse(savedSiteConfig);
    // 更新所有图标相关的标签
    const iconTypes = ['icon', 'shortcut icon', 'apple-touch-icon'];
    iconTypes.forEach(type => {
      // 移除所有现有的图标标签
      const existingLinks = document.querySelectorAll(`link[rel="${type}"]`);
      existingLinks.forEach(link => link.remove());

      // 创建新的图标标签
      const newLink = document.createElement('link');
      newLink.rel = type;
      newLink.href = siteIcon;
      document.head.appendChild(newLink);
    });

    // 使用getSiteName获取标题，优先使用用户设置的网站名称
    document.title = getSiteName();
  } else {
    // 如果没有自定义设置，使用defaultSettings中的标题
    document.title = defaultSettings.title;
  }

  // 检查当前路由是否需要登录验证
  if (checkNeedAuth(location.pathname)) {
    try {
      const res = await getLoginUserUsingGet();
      initialState.currentUser = res.data;
    } catch (error: any) {
      // 如果未登录且需要登录验证，跳转到登录页
      if (location.pathname !== loginPath) {

      }
    }
  }
  return initialState;
}

// 获取布局模式
const getLayoutMode = (): 'side' | 'top' | 'mix' => {
  const savedSiteConfig = localStorage.getItem('siteConfig');
  if (savedSiteConfig) {
    const { layoutMode } = JSON.parse(savedSiteConfig);
    if (layoutMode === 'side' || layoutMode === 'top' || layoutMode === 'mix') {
      return layoutMode;
    }
  }
  return defaultSettings.layout as 'side' | 'top' | 'mix' || 'top';
};

// sider 模式下的菜单名称映射
const SIDER_MENU_NAME_MAP: Record<string, string> = {
  '鱼窝': '摸鱼室',
  '鱼圈': '摸鱼圈',
  '阅读': '摸鱼阅读',
  '宠物': '摸鱼宠物',
  '玩法': '积分玩法',
  '游戏': '小游戏',
  ' 工具': '工具箱',
  '商店': '摸鱼商店',
  '关于': '关于网站',
};

// 递归替换菜单名称
const remapMenuNames = (menuData: any[]): any[] => {
  return menuData.map((item) => {
    const newName = SIDER_MENU_NAME_MAP[item.name] ?? item.name;
    return {
      ...item,
      name: newName,
      children: item.children ? remapMenuNames(item.children) : undefined,
      routes: item.routes ? remapMenuNames(item.routes) : undefined,
    };
  });
};

// ProLayout 支持的api https://procomponents.ant.design/components/layout
// @ts-ignore
export const layout: RunTimeLayoutConfig = ({initialState}) => {
  const {isBossMode, showSettings, setShowSettings, config, setConfig} = useBossKey();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [layoutMode, setLayoutMode] = useState<'side' | 'top' | 'mix'>(getLayoutMode);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const handleSiteConfigChange = () => {
      setLayoutMode(getLayoutMode());
    };
    window.addEventListener('siteConfigChange', handleSiteConfigChange);
    return () => {
      window.removeEventListener('siteConfigChange', handleSiteConfigChange);
    };
  }, []);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  // 使用全局状态
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isReaderVisible, hideReader } = useModel('globalReader');

  // 注册 Service Worker
  const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('ServiceWorker registration successful');
          })
          .catch(err => {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }
  };

  // 在 useEffect 中调用注册函数
  useEffect(() => {
    listenRouteChange();
    registerServiceWorker();

    // 添加百度统计代码
    var _hmt = _hmt || [];
    (function() {
      var hm = document.createElement("script");
      hm.src = "https://hm.baidu.com/hm.js?3f2490c2a69874f9cb3c05f22a48e6b9";
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(hm, s);
    })();

    // 使用标志位防止死循环的MutationObserver
    let isSettingTitle = false;

    const observer = new MutationObserver((mutations) => {
      // 如果正在设置标题，跳过
      if (isSettingTitle) return;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // 动态获取当前期望的标题
          const expectedTitle = getSiteName();
          // 检查当前标题是否与期望的标题不同
          if (document.title !== expectedTitle) {
            isSettingTitle = true;
            document.title = expectedTitle;
            // 使用setTimeout确保DOM更新完成后再重置标志位
            setTimeout(() => {
              isSettingTitle = false;
            }, 0);
          }
        }
      });
    });

    // 监听document.head的变化
    observer.observe(document.head, {
      childList: true,
      subtree: true,
    });

    // 设置初始标题
    isSettingTitle = true;
    document.title = getSiteName();
    setTimeout(() => {
      isSettingTitle = false;
    }, 0);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (isBossMode) {
    // @ts-ignore
    return {
      waterMarkProps: {content: config.title},
      footerRender: () => null,
      menuRender: false,
      rightContentRender: false,
      childrenRender: () => (
        <>
          {config.image ? (
            // 如果有自定义图片，显示全屏图片
            <div style={{
              width: '100vw',
              height: '100vh',
              overflow: 'hidden',
              position: 'fixed',
              top: 0,
              left: 0,
            }}>
              <img
                src={config.image}
                alt="自定义背景图片"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          ) : (
            // 如果没有自定义图片，显示默认的百度搜索界面
            <div style={{
              width: '100%',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#ffffff'
            }}>
              <img
                src="https://www.baidu.com/img/flexible/logo/pc/result.png"
                alt="百度搜索"
                style={{width: '270px', marginBottom: '20px'}}
              />
              <div style={{
                width: '500px',
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #ccc',
                borderRadius: '24px',
                padding: '5px 10px',
                boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)'
              }}>
                <input type="text" placeholder="百度一下，你就知道"
                       style={{
                         flex: 1,
                         height: '40px',
                         border: 'none',
                         outline: 'none',
                         fontSize: '16px',
                         paddingLeft: '10px'
                       }}
                />
                <button type="button" style={{
                  backgroundColor: '#3385ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  width: '100px',
                  height: '36px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}>搜索
                </button>
              </div>
            </div>
          )}
          <BossKeySettings
            visible={showSettings}
            onClose={() => setShowSettings(false)}
            onConfigUpdate={setConfig}
          />
        </>
      ),
    };
  }

  return {
    avatarProps: {
      render: () => {
        return <AvatarDropdown/>;
      },
    },
    waterMarkProps: {
      content: initialState?.currentUser?.userName,
    },
    footerRender: () => <Footer/>,
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    ...defaultSettings,
    layout: layoutMode,
    menuDataRender: (layoutMode === 'side' || layoutMode === 'mix')
      ? (menuData: any[]) => remapMenuNames(menuData)
      : undefined,
    childrenRender: (children) => {
      return (
        <>
          <GlobalTitle/>
          {children}
          <SideAnnouncement/>
          {/*<AnnouncementModal*/}
          {/*  visible={showAnnouncement}*/}
          {/*  onClose={() => setShowAnnouncement(false)}*/}
          {/*  title="系统公告"*/}
          {/*/>*/}
          <GlobalReader
            visible={isReaderVisible}
            onClose={hideReader}
          />
        </>
      );
    },
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request = requestConfig;
