import FloatingChat from '@/components/FloatingChat';
import {
  emitFloatingChatChange,
  loadFloatingChatSettings,
  saveFloatingChatSettings,
} from '@/components/FloatingChat/storage';
import React, { useEffect } from 'react';
import styles from './index.less';

const POPUP_BODY_CLASS = 'chat-mini-popup-only';

/** 独立小窗聊天页，对应参考代码中的 /cr-popup */
const ChatMiniPage: React.FC = () => {
  useEffect(() => {
    document.body.classList.add(POPUP_BODY_CLASS);
    const prev = loadFloatingChatSettings();
    const next = { ...prev, mode: 'normal' as const };
    saveFloatingChatSettings(next);
    emitFloatingChatChange({ mode: 'normal' });

    return () => {
      document.body.classList.remove(POPUP_BODY_CLASS);
    };
  }, []);

  return (
    <div className={styles.miniRoot}>
      <FloatingChat fullscreen />
    </div>
  );
};

export default ChatMiniPage;
