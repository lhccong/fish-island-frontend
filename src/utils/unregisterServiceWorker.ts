export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }

    // 清理缓存
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    // 如果当前页面是通过 Service Worker 加载的，刷新页面
    if (window.performance && 
        window.performance.navigation.type === window.performance.navigation.TYPE_BACK_FORWARD) {
      window.location.reload();
    }
  }
}; 