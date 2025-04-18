import React, { useState, useEffect } from 'react';
import { Input, Dropdown, Button } from 'antd';
import { SearchOutlined, DownOutlined, SwapOutlined, SettingOutlined } from '@ant-design/icons';
import styles from './index.less';
import moment from 'moment';
import 'moment/locale/zh-cn';
import Shortcut from '@/components/Shortcut';
import WallpaperMenu from '@/components/WallpaperMenu';
import CustomSites from '@/components/CustomSites';

moment.locale('zh-cn');

const searchEngines = [
  {
    name: '百度',
    icon: 'https://www.baidu.com/favicon.ico',
    url: 'https://www.baidu.com/s?wd=',
  },
  {
    name: '谷歌',
    icon: 'https://www.google.com/favicon.ico',
    url: 'https://www.google.com/search?q=',
  },
  {
    name: '必应',
    icon: 'https://www.bing.com/favicon.ico',
    url: 'https://www.bing.com/search?q=',
  },
];

const defaultShortcuts = [
  {
    icon: 'https://www.baidu.com/favicon.ico',
    title: '百度',
    url: 'https://www.baidu.com',
  },
  {
    icon: 'https://www.bilibili.com/favicon.ico',
    title: 'bilibili',
    url: 'https://www.bilibili.com',
  },
  {
    icon: 'https://www.zhihu.com/favicon.ico',
    title: '知乎',
    url: 'https://www.zhihu.com',
  },
  {
    icon: 'https://images.seeklogo.com/logo-png/30/2/github-logo-png_seeklogo-304612.png',
    title: 'GitHub',
    url: 'https://github.com',
  },
  {
    icon: 'https://www.taobao.com/favicon.ico',
    title: '淘宝',
    url: 'https://www.taobao.com',
  },
  {
    icon: 'https://www.jd.com/favicon.ico',
    title: '京东',
    url: 'https://www.jd.com',
  },
];

const Home: React.FC = () => {
  const [time, setTime] = useState(moment());
  const [weather, setWeather] = useState({
    temperature: '',
    condition: '',
    city: '',
  });
  const [customSites, setCustomSites] = useState<Array<{ title: string; url: string; icon: string }>>(() => {
    const savedSites = localStorage.getItem('customSites');
    return savedSites ? JSON.parse(savedSites) : [];
  });
  const [shortcuts, setShortcuts] = useState(() => {
    const savedSites = localStorage.getItem('customSites');
    const customSites = savedSites ? JSON.parse(savedSites) : [];
    return [...defaultShortcuts, ...customSites];
  });
  const [currentEngine, setCurrentEngine] = useState(searchEngines[0]);
  const [wallpaper, setWallpaper] = useState(() => {
    const savedWallpaper = localStorage.getItem('wallpaper');
    return savedWallpaper || '/img/defaultWallpaper.webp';
  });
  const [customSitesVisible, setCustomSitesVisible] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(moment());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('https://api.kxzjoker.cn/api/Weather');
        const data = await response.json();
        if (data.code === 200) {
          const weatherData = data.data.tianqi;
          setWeather({
            temperature: `${weatherData.temperature}°`,
            condition: weatherData.weather,
            city: weatherData.city,
          });
        }
      } catch (error) {
        console.error('获取天气数据失败:', error);
      }
    };

    fetchWeather();
    // 每30分钟更新一次天气数据
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => {
      clearInterval(weatherTimer);
    };
  }, []);

  // 添加键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下了 Ctrl+Shift+B
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
        console.log('快捷键触发: Ctrl+Shift+B');
        e.preventDefault(); // 阻止默认行为
        handleSwitchToFishMode();
      }
    };

    // 添加事件监听器
    window.addEventListener('keydown', handleKeyDown);

    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearch = (value: string) => {
    if (!value.trim()) return;
    window.open(`${currentEngine.url}${encodeURIComponent(value)}`, '_blank');
  };

  const searchEngineItems = {
    items: searchEngines.map((engine) => ({
      key: engine.name,
      label: (
        <div className={styles.engineOption}>
          <img src={engine.icon} alt={engine.name} />
          <span>{engine.name}</span>
        </div>
      ),
      onClick: () => setCurrentEngine(engine),
    })),
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleSwitchToFishMode = () => {
    window.location.href = '/index';
  };

  const handleAddCustomSite = (site: { title: string; url: string; icon: string }) => {
    const newCustomSites = [...customSites, site];
    setCustomSites(newCustomSites);
    setShortcuts([...defaultShortcuts, ...newCustomSites]);
    localStorage.setItem('customSites', JSON.stringify(newCustomSites));
  };

  return (
    <div
      className={styles.container}
      onContextMenu={handleContextMenu}
      style={{
        backgroundImage: `url(${wallpaper})`
      }}
    >
      <Button
        type="text"
        icon={<SwapOutlined />}
        onClick={handleSwitchToFishMode}
        className={styles.themeSwitch}
        style={{ color: '#ffffff', fontSize: '16px' }}
      >
        摸鱼模式
      </Button>
      <Dropdown
        overlay={<WallpaperMenu onWallpaperChange={setWallpaper} />}
        trigger={['contextMenu']}
      >
        <div className={styles.wallpaperOverlay}></div>
      </Dropdown>

      <div className={styles.weatherSection}>
        <div className={styles.weatherInfo}>
          <div className={styles.temperature}>{weather.temperature}</div>
          <div className={styles.weatherDetails}>
            <div>{weather.city}</div>
            <div>{weather.condition}</div>
          </div>
        </div>
      </div>

      <div className={styles.timeSection}>
        <div className={styles.time}>{time.format('HH:mm')}</div>
        <div className={styles.date}>{time.format('M月D日 dddd')}</div>
      </div>

      <div className={styles.searchSection}>
        <div className={styles.searchWrapper}>
          <Dropdown menu={searchEngineItems} trigger={['click']}>
            <div className={styles.engineSelector}>
              <img src={currentEngine.icon} alt={currentEngine.name} />
              <DownOutlined />
            </div>
          </Dropdown>
          <Input
            size="large"
            placeholder={`在 ${currentEngine.name} 中搜索`}
            prefix={<SearchOutlined />}
            className={styles.searchInput}
            onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      <div className={styles.shortcutsSection}>
        {shortcuts.map((shortcut, index) => (
          <Shortcut key={index} {...shortcut} />
        ))}
      </div>

      <div className={styles.countdownSection}>
        <div className={styles.countdownItem}>
          <div className={styles.countdownTitle}>距离周末</div>
          <div className={styles.countdownTime}>{5 - time.day()}天</div>
        </div>
      </div>

      <CustomSites
        visible={true}
        onClose={() => {}}
        onAddSite={handleAddCustomSite}
        sites={customSites}
      />
    </div>
  );
};

export default Home;
