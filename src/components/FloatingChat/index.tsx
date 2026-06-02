import MessageContent from '@/components/MessageContent';
import { listMessageVoByPageUsingPost } from '@/services/backend/chatController';
import { wsService } from '@/services/websocket';
import { history, useLocation, useModel } from '@umijs/max';
import { Image } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  emitFloatingChatChange,
  FLOATING_CHAT_EVENT,
  FloatingChatMode,
  FloatingChatSettings,
  FLOATING_CHAT_BODY_DARK_CLASS,
  FLOATING_CHAT_EXCEL_FULLSCREEN_CLASS,
  FLOATING_CHAT_EXCEL_VIEWPORT_CLASS,
  FLOATING_CHAT_TITLE_MAX_LENGTH,
  clampFloatingChatPos,
  FLOATING_CHAT_RESET_POSITION_EVENT,
  getFloatingChatDisplayTitle,
  loadFloatingChatSettings,
  normalizeFloatingChatTitle,
  saveFloatingChatSettings,
} from './storage';
import ExcelLayout from './ExcelLayout';
import { getExcelWorkbookTitle, getExcelWindowCaption } from './excelUtils';
import styles from './index.less';

interface ChatMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
  timestamp: Date;
}

interface FloatingChatProps {
  /** 全屏小窗页（/chat/mini） */
  fullscreen?: boolean;
}

function normalizeChatMessage(msg: ChatMessage): ChatMessage {
  const ts = msg.timestamp;
  const timestamp =
    ts instanceof Date && !Number.isNaN(ts.getTime())
      ? ts
      : new Date((ts as unknown as string | number) || Date.now());
  return Number.isNaN(timestamp.getTime()) ? { ...msg, timestamp: new Date() } : { ...msg, timestamp };
}

function mapRecordToMessage(record: API.RoomMessageVo): ChatMessage | null {
  const msg = record.messageWrapper?.message;
  if (!msg?.id) return null;
  const sender = msg.sender;
  return normalizeChatMessage({
    id: String(msg.id),
    content: msg.content || '',
    sender: {
      id: String(sender?.id ?? ''),
      name: sender?.name || '游客',
      avatar: sender?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
    },
    timestamp: new Date(msg.timestamp || Date.now()),
  });
}

const FloatingChat: React.FC<FloatingChatProps> = ({ fullscreen = false }) => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const location = useLocation();
  const [settings, setSettings] = useState<FloatingChatSettings>(() => loadFloatingChatSettings());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => settings.title);
  const bodyRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const lastSendRef = useRef(0);
  const dragMovedRef = useRef(false);

  const isLoggedIn = Boolean(currentUser?.id);
  const mode = settings.mode;
  const isWindowOpen = mode === 'small' || mode === 'normal';
  const isSmallScreen = !fullscreen && mode === 'small';
  const onChatPage = location.pathname === '/chat';
  const onMiniPage = location.pathname === '/chat/mini';

  const persist = useCallback((patch: Partial<FloatingChatSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveFloatingChatSettings(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<FloatingChatSettings>) => {
      persist(patch);
      emitFloatingChatChange(patch);
    },
    [persist],
  );

  const setMode = useCallback(
    (nextMode: FloatingChatMode) => {
      updateSettings({ mode: nextMode });
    },
    [updateSettings],
  );

  const setOpacity = useCallback(
    (opacity: number) => {
      updateSettings({ opacity });
    },
    [updateSettings],
  );

  const setTitle = useCallback(
    (title: string) => {
      updateSettings({ title: normalizeFloatingChatTitle(title) });
    },
    [updateSettings],
  );

  const displayTitle = getFloatingChatDisplayTitle(settings.title);
  const workbookTitle = getExcelWorkbookTitle(displayTitle);
  const excelMode = settings.excelMode;
  const excelViewportFullscreen = settings.excelViewportFullscreen && excelMode && !fullscreen;

  const isAtBottom = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setUnreadCount(0);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const res = await listMessageVoByPageUsingPost({
        current: 1,
        pageSize: 30,
        roomId: -1,
        sortField: 'createTime',
        sortOrder: 'desc',
      });
      const list = (res.data?.records || [])
        .map(mapRecordToMessage)
        .filter(Boolean) as ChatMessage[];
      if (mountedRef.current) {
        setMessages(list.reverse());
        requestAnimationFrame(() => scrollToBottom(false));
      }
    } catch (e) {
      console.error('加载悬浮聊天历史失败', e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isLoggedIn, scrollToBottom]);

  const handleWsMessage = useCallback(
    (data: { data?: { message?: ChatMessage } }) => {
      const raw = data?.data?.message;
      if (!raw?.id) return;
      const incoming = normalizeChatMessage(raw);
      const isSelf = String(incoming.sender?.id) === String(currentUser?.id);

      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;

        if (isSelf) {
          for (let i = prev.length - 1; i >= 0; i--) {
            if (
              String(prev[i].sender.id) === String(currentUser?.id) &&
              prev[i].content === incoming.content
            ) {
              const next = [...prev];
              next[i] = incoming;
              return next.length > 50 ? next.slice(-50) : next;
            }
          }
        }

        const next = [...prev, incoming];
        return next.length > 50 ? next.slice(-50) : next;
      });

      if (isWindowOpen && isAtBottom()) {
        requestAnimationFrame(() => scrollToBottom());
      } else if (!isSelf && (isWindowOpen || mode === 'minimized')) {
        setUnreadCount((c) => c + 1);
      }
    },
    [currentUser?.id, isAtBottom, isWindowOpen, mode, scrollToBottom],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (settingsOpen) {
      setTitleDraft(settings.title);
    }
  }, [settingsOpen, settings.title]);

  useEffect(() => {
    if (!settingsOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [settingsOpen]);

  useEffect(() => {
    const onSettingsChange = (e: Event) => {
      const detail = (e as CustomEvent<Partial<FloatingChatSettings>>).detail;
      if (detail) {
        setSettings((prev) => {
          const next = { ...prev, ...detail };
          saveFloatingChatSettings(next);
          return next;
        });
      } else {
        setSettings(loadFloatingChatSettings());
      }
    };
    window.addEventListener(FLOATING_CHAT_EVENT, onSettingsChange);
    return () => window.removeEventListener(FLOATING_CHAT_EVENT, onSettingsChange);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    document.title = excelMode ? getExcelWindowCaption(workbookTitle) : displayTitle;
  }, [fullscreen, displayTitle, excelMode, workbookTitle]);

  useEffect(() => {
    if (!fullscreen) return;
    document.body.classList.toggle(
      FLOATING_CHAT_BODY_DARK_CLASS,
      settings.darkMode && !excelMode,
    );
    document.body.classList.toggle(FLOATING_CHAT_EXCEL_FULLSCREEN_CLASS, excelMode);
    return () => {
      document.body.classList.remove(FLOATING_CHAT_BODY_DARK_CLASS);
      document.body.classList.remove(FLOATING_CHAT_EXCEL_FULLSCREEN_CLASS);
    };
  }, [fullscreen, settings.darkMode, excelMode]);

  useEffect(() => {
    if (fullscreen) return;
    document.body.classList.toggle(FLOATING_CHAT_EXCEL_VIEWPORT_CLASS, excelViewportFullscreen);
    return () => {
      document.body.classList.remove(FLOATING_CHAT_EXCEL_VIEWPORT_CLASS);
    };
  }, [fullscreen, excelViewportFullscreen]);

  useEffect(() => {
    if (!excelViewportFullscreen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        updateSettings({ excelViewportFullscreen: false });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [excelViewportFullscreen, updateSettings]);

  const clampPos = useCallback(
    (pos: { x: number; y: number }) => {
      const el = wrapperRef.current;
      if (!el || fullscreen || excelViewportFullscreen) return pos;
      return clampFloatingChatPos(
        pos,
        { width: el.offsetWidth, height: el.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      );
    },
    [excelViewportFullscreen, fullscreen],
  );

  const ensurePosInBounds = useCallback(() => {
    if (fullscreen || excelViewportFullscreen) return;
    const el = wrapperRef.current;
    if (!el) return;
    setSettings((prev) => {
      const clamped = clampFloatingChatPos(
        prev.pos,
        { width: el.offsetWidth, height: el.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      );
      if (clamped.x === prev.pos.x && clamped.y === prev.pos.y) return prev;
      const next = { ...prev, pos: clamped };
      saveFloatingChatSettings(next);
      return next;
    });
  }, [excelViewportFullscreen, fullscreen]);

  useEffect(() => {
    if (fullscreen || excelViewportFullscreen) return;
    const raf = requestAnimationFrame(() => ensurePosInBounds());
    return () => cancelAnimationFrame(raf);
  }, [mode, excelMode, ensurePosInBounds, excelViewportFullscreen, fullscreen]);

  useEffect(() => {
    if (fullscreen || excelViewportFullscreen) return;
    window.addEventListener('resize', ensurePosInBounds);
    return () => window.removeEventListener('resize', ensurePosInBounds);
  }, [ensurePosInBounds, excelViewportFullscreen, fullscreen]);

  useEffect(() => {
    if (fullscreen || excelViewportFullscreen) return;
    const handleResetPosition = () => {
      requestAnimationFrame(() => ensurePosInBounds());
    };
    window.addEventListener(FLOATING_CHAT_RESET_POSITION_EVENT, handleResetPosition);
    return () => window.removeEventListener(FLOATING_CHAT_RESET_POSITION_EVENT, handleResetPosition);
  }, [ensurePosInBounds, excelViewportFullscreen, fullscreen]);

  useEffect(() => {
    if (!isLoggedIn || mode === 'minimized') return;

    loadHistory();

    const token = localStorage.getItem('tokenValue');
    if (token && !wsService.isConnected()) {
      wsService.connect(token);
    }
    wsService.addMessageHandler('chat', handleWsMessage);

    return () => {
      wsService.removeMessageHandler('chat', handleWsMessage);
    };
  }, [isLoggedIn, mode, loadHistory, handleWsMessage]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || !currentUser?.id) return;

    const now = Date.now();
    if (now - lastSendRef.current < 1000) return;
    lastSendRef.current = now;

    const newMessage: ChatMessage = {
      id: `${Date.now()}`,
      content,
      sender: {
        id: String(currentUser.id),
        name: currentUser.userName || '游客',
        avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
      },
      timestamp: new Date(),
    };

    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: { message: newMessage },
      },
    });

    setMessages((prev) => [...prev, newMessage].slice(-50));
    setInputValue('');
    requestAnimationFrame(() => scrollToBottom());
  };

  const startDrag = (e: React.MouseEvent) => {
    if (fullscreen) return;
    e.preventDefault();
    dragMovedRef.current = false;
    setDragging(true);
    const startX = e.clientX - settings.pos.x;
    const startY = e.clientY - settings.pos.y;
    const originX = e.clientX;
    const originY = e.clientY;

    const onMove = (ev: MouseEvent) => {
      if (Math.abs(ev.clientX - originX) > 4 || Math.abs(ev.clientY - originY) > 4) {
        dragMovedRef.current = true;
      }
      persist({
        pos: clampPos({ x: ev.clientX - startX, y: ev.clientY - startY }),
      });
    };
    const onUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleMinBarClick = () => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    setMode('small');
  };

  const openPopupWindow = () => {
    if (excelMode) {
      updateSettings({ excelMode: true });
      window.open('/chat/mini', '_blank');
      return;
    }
    window.open('/chat/mini', '_blank', 'width=400,height=560');
  };

  const toggleExcelViewportFullscreen = useCallback(() => {
    const next = !settings.excelViewportFullscreen;
    updateSettings({
      excelViewportFullscreen: next,
      excelMode: true,
      ...(next && mode === 'minimized' ? { mode: 'normal' as FloatingChatMode } : {}),
    });
  }, [mode, settings.excelViewportFullscreen, updateSettings]);

  const goFullChat = () => {
    if (excelMode) {
      toggleExcelViewportFullscreen();
      return;
    }
    setMode('minimized');
    history.push('/chat');
  };

  const openExcelDedicatedPage = () => {
    updateSettings({ excelMode: true, excelViewportFullscreen: false });
    history.push('/chat/mini');
  };

  if (!isLoggedIn && !fullscreen) return null;

  // 独立小窗页由页面内嵌实例渲染，避免重复挂载
  if (onMiniPage && !fullscreen) return null;

  // 在完整聊天室页面且未开启悬浮窗时，不显示（避免重复）
  if (onChatPage && mode === 'minimized' && !fullscreen) return null;

  const showMinBar = mode === 'minimized' && !fullscreen && !excelViewportFullscreen;
  const showWindow = isWindowOpen || fullscreen || excelViewportFullscreen;
  const windowOpacity = excelViewportFullscreen ? 1 : settings.opacity / 100;

  const renderHeaderActions = () => (
    <span className={styles.headerActions} onMouseDown={(e) => e.stopPropagation()}>
      <div ref={settingsRef} className={styles.settingsWrap}>
        <button
          type="button"
          className={`${styles.popupCrBtn} ${settingsOpen ? styles.active : ''}`}
          title="窗口设置"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          ⚙
        </button>
        {settingsOpen && (
          <div
            className={styles.settingsPanel}
            role="dialog"
            aria-label="窗口设置"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.settingsLabel}>窗口名称</div>
            <input
              type="text"
              className={styles.titleInput}
              value={titleDraft}
              maxLength={FLOATING_CHAT_TITLE_MAX_LENGTH}
              placeholder={displayTitle}
              onChange={(e) =>
                setTitleDraft(e.target.value.slice(0, FLOATING_CHAT_TITLE_MAX_LENGTH))
              }
              onBlur={() => setTitle(titleDraft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setTitle(titleDraft);
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <div className={styles.settingsDivider} />
            <div className={styles.settingsLabel}>窗口透明度</div>
            <div className={styles.settingsRow}>
              <input
                type="range"
                className={styles.opacitySlider}
                min={30}
                max={100}
                step={5}
                value={settings.opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
              <span className={styles.opacityValue}>{settings.opacity}%</span>
            </div>
            <div className={styles.settingsDivider} />
            <div className={styles.settingsItem}>
              <span className={styles.settingsItemLabel}>暗黑模式</span>
              <label className={styles.settingSwitch}>
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => updateSettings({ darkMode: e.target.checked })}
                />
                <span className={styles.switchSlider} />
              </label>
            </div>
            <div className={styles.settingsItem}>
              <span className={styles.settingsItemLabel}>隐藏用户头像</span>
              <label className={styles.settingSwitch}>
                <input
                  type="checkbox"
                  checked={settings.hideAvatar}
                  onChange={(e) => updateSettings({ hideAvatar: e.target.checked })}
                />
                <span className={styles.switchSlider} />
              </label>
            </div>
            <div className={styles.settingsItem}>
              <span className={styles.settingsItemLabel}>收起用户图片</span>
              <label className={styles.settingSwitch}>
                <input
                  type="checkbox"
                  checked={settings.collapseImages}
                  onChange={(e) => updateSettings({ collapseImages: e.target.checked })}
                />
                <span className={styles.switchSlider} />
              </label>
            </div>
            <div className={styles.settingsItem}>
              <span className={styles.settingsItemLabel}>Excel 全界面模式</span>
              <label className={styles.settingSwitch}>
                <input
                  type="checkbox"
                  checked={settings.excelMode}
                  onChange={(e) => updateSettings({ excelMode: e.target.checked })}
                />
                <span className={styles.switchSlider} />
              </label>
            </div>
            <div className={styles.settingsItem}>
              <span className={styles.settingsItemLabel}>Excel 展示图片</span>
              <label className={styles.settingSwitch}>
                <input
                  type="checkbox"
                  checked={settings.excelShowImages}
                  onChange={(e) => updateSettings({ excelShowImages: e.target.checked })}
                />
                <span className={styles.switchSlider} />
              </label>
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        className={`${styles.popupCrBtn} ${settings.excelMode ? styles.active : ''}`}
        title={settings.excelMode ? '切换为聊天气泡' : 'Excel 模式'}
        onClick={() =>
          updateSettings({
            excelMode: !settings.excelMode,
            ...(!settings.excelMode ? {} : { excelViewportFullscreen: false }),
          })
        }
      >
        ▦
      </button>
      {!fullscreen && (
        <>
          {!excelMode && (
            <button
              type="button"
              className={`${styles.popupCrBtn} ${isSmallScreen ? styles.active : ''}`}
              title="小屏模式"
              onClick={() => setMode(isSmallScreen ? 'normal' : 'small')}
            >
              ⊟
            </button>
          )}
          {excelMode ? (
            <>
              <button
                type="button"
                className={`${styles.popupCrBtn} ${excelViewportFullscreen ? styles.active : ''}`}
                title={excelViewportFullscreen ? '退出全屏 (Esc)' : '全屏 Excel（铺满当前页）'}
                onClick={toggleExcelViewportFullscreen}
              >
                ⛶
              </button>
              <button type="button" className={styles.popupCrBtn} title="新标签页打开" onClick={openPopupWindow}>
                ↗
              </button>
              <button type="button" className={styles.popupCrBtn} title="独立 Excel 页" onClick={openExcelDedicatedPage}>
                ⊞
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.popupCrBtn} title="独立弹窗" onClick={openPopupWindow}>
                ↗
              </button>
              <button type="button" className={styles.popupCrBtn} title="完整聊天室" onClick={goFullChat}>
                ⛶
              </button>
            </>
          )}
          <button
            type="button"
            className={styles.popupCrBtn}
            title="最小化"
            onClick={() => {
              if (excelViewportFullscreen) {
                updateSettings({ excelViewportFullscreen: false });
              }
              setMode('minimized');
            }}
          >
            ➖
          </button>
        </>
      )}
    </span>
  );

  const content = (
    <div
      ref={wrapperRef}
      className={`${styles.popupCrWrapper} ${fullscreen ? styles.fullscreenPopup : ''} ${
        excelViewportFullscreen ? styles.excelViewportFullscreen : ''
      } ${isSmallScreen && !excelViewportFullscreen ? styles.smallScreen : ''} ${
        settings.darkMode && !excelMode ? styles.darkMode : ''
      } ${excelMode ? styles.excelMode : ''} ${dragging ? styles.dragging : ''}`}
      style={{
        ...(dragging && !excelViewportFullscreen ? { transition: 'none' } : {}),
        ...(!fullscreen && !excelViewportFullscreen
          ? { transform: `translate(${settings.pos.x}px, ${settings.pos.y}px)` }
          : {}),
      }}
    >
      {showMinBar && (
        <button
          type="button"
          className={excelMode ? styles.excelMinBar : styles.chatMinBar}
          onMouseDown={startDrag}
          onClick={handleMinBarClick}
        >
          {excelMode ? (
            <>
              <span className={styles.excelAppIcon} aria-hidden />
              <span>{workbookTitle}</span>
            </>
          ) : (
            <>
              <span>💬</span>
              <span>{displayTitle}</span>
            </>
          )}
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      )}

      {showWindow && (
        <div
          className={`${styles.chatWindow} ${excelMode ? styles.excelWindow : ''}`}
          style={{
            opacity: windowOpacity,
          }}
        >
          {excelMode ? (
            <ExcelLayout
              workbookTitle={workbookTitle}
              messages={messages}
              loading={loading}
              inputValue={inputValue}
              unreadCount={unreadCount}
              bodyRef={bodyRef}
              headerActions={renderHeaderActions()}
              onInputChange={setInputValue}
              onSend={handleSend}
              onScroll={() => {
                if (isAtBottom()) setUnreadCount(0);
              }}
              onScrollToBottom={() => scrollToBottom()}
              onTitleBarMouseDown={fullscreen || excelViewportFullscreen ? undefined : startDrag}
              titleBarStatic={fullscreen || excelViewportFullscreen}
              variant={
                fullscreen || excelViewportFullscreen
                  ? 'full'
                  : isSmallScreen
                    ? 'mini'
                    : 'compact'
              }
              showImages={settings.excelShowImages}
            />
          ) : (
            <>
              <div
                className={`${styles.chatHeader} ${fullscreen ? styles.chatHeaderStatic : ''}`}
                onMouseDown={startDrag}
              >
                <span className={styles.chatHeaderTitle}>
                  <span>💬</span>
                  <span>{displayTitle}</span>
                </span>
                {renderHeaderActions()}
              </div>

              <div
                className={styles.chatBody}
                ref={bodyRef}
                onScroll={() => {
                  if (isAtBottom()) setUnreadCount(0);
                }}
              >
                {loading && <div className={styles.loadingHint}>加载中...</div>}
                <Image.PreviewGroup
                  preview={{
                    getContainer: () => document.body,
                    zIndex: 1000002,
                  }}
                >
                  {!loading &&
                    messages.map((msg) => {
                      const isMe = msg.sender.id === String(currentUser?.id);
                      return (
                        <div
                          key={msg.id}
                          className={`${styles.chatMessage} ${isMe ? styles.isMe : ''} ${
                            settings.hideAvatar ? styles.hideAvatar : ''
                          }`}
                        >
                          {!settings.hideAvatar && (
                            <img className={styles.avatar} src={msg.sender.avatar} alt="" />
                          )}
                          <div className={styles.messageMain}>
                            <span className={styles.nickname}>{msg.sender.name}</span>
                            <div className={styles.messageBubble}>
                              <MessageContent
                                content={msg.content}
                                collapseImages={settings.collapseImages}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </Image.PreviewGroup>
              </div>

              {unreadCount > 0 && (
                <button type="button" className={styles.newMessageNotice} onClick={() => scrollToBottom()}>
                  {unreadCount} 条新消息 ↓
                </button>
              )}

              <div className={styles.chatInputArea}>
                <input
                  className={styles.chatInput}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="说点什么"
                  maxLength={200}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button type="button" className={styles.sendBtn} onClick={handleSend}>
                  发送
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return content;
  }

  return createPortal(content, document.body);
};

/** 从聊天室页激活小屏悬浮窗 */
export function activateFloatingChat(mode: FloatingChatMode = 'small') {
  const current = loadFloatingChatSettings();
  const next = { ...current, mode };
  saveFloatingChatSettings(next);
  emitFloatingChatChange(next);
}

export default FloatingChat;
