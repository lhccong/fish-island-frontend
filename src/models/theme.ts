import { useState, useEffect } from 'react';

export default function useThemeModel() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('themeMode');
    if (saved !== null) return saved === 'dark';
    // 跟随系统偏好
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    localStorage.setItem('themeMode', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark-mode');
    }
    // 派发事件，让其他组件感知主题变化
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDarkMode } }));
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return { isDarkMode, toggleTheme, setIsDarkMode };
}
