// 保存原始标题
let originalTitle = document.title;
let titleInterval: number | null = null;
let faviconInterval: number | null = null;
let originalFavicon: string | null = null;
let faviconElement: HTMLLinkElement | null = null;
let isFlashing = false;

// 初始化 favicon 元素
const initFavicon = () => {
  if (!faviconElement) {
    faviconElement = document.querySelector('link[rel="icon"]');
    if (!faviconElement) {
      faviconElement = document.createElement('link');
      faviconElement.rel = 'icon';
      document.head.appendChild(faviconElement);
    }
    originalFavicon = faviconElement.href;
  }
};

// 创建闪烁图标
const createColoredFavicon = (color: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // 绘制圆形图标
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();

  // 添加白色边框使其更醒目
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();

  return canvas.toDataURL('image/x-icon');
};

// 开始标题闪烁
export const startTitleFlash = (newMessage: string) => {
  if (titleInterval) return;

  let isOriginal = true;
  titleInterval = window.setInterval(() => {
    document.title = isOriginal ? `【新消息】${newMessage}` : originalTitle;
    isOriginal = !isOriginal;
  }, 1000);
};

// 停止标题闪烁
export const stopTitleFlash = () => {
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
    document.title = originalTitle;
  }
};

// 开始图标闪烁
export const startIconFlash = () => {
  initFavicon();
  if (!faviconElement) return;

  const colors = ['#ff4d4f', '#1890ff']; // 红色和蓝色交替
  let colorIndex = 0;

  faviconInterval = window.setInterval(() => {
    if (!faviconElement) return;
    const favicon = createColoredFavicon(colors[colorIndex]);
    if (favicon) {
      faviconElement.href = favicon;
    }
    colorIndex = (colorIndex + 1) % colors.length;
  }, 500); // 每500ms切换一次颜色

  return faviconInterval;
};

// 停止图标闪烁
export const stopIconFlash = (interval: number) => {
  if (faviconInterval) {
    clearInterval(faviconInterval);
    faviconInterval = null;
  }
  if (faviconElement && originalFavicon) {
    faviconElement.href = originalFavicon;
  }
};

// 处理页面可见性变化
const handleVisibilityChange = () => {
  if (document.hidden && isFlashing) {
    // 当页面隐藏时，触发任务栏闪动
    document.title = `【新消息】${originalTitle}`;
  } else if (!document.hidden) {
    // 当页面重新可见时，恢复原始标题
    document.title = originalTitle;
  }
};

// 开始所有通知效果
export const startNotification = (message: string) => {
  isFlashing = true;
  startTitleFlash(message);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return startIconFlash();
};

// 停止所有通知效果
export const stopNotification = (iconInterval: number) => {
  isFlashing = false;
  stopTitleFlash();
  stopIconFlash(iconInterval);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}; 