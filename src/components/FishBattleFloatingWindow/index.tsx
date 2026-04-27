import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useModel } from '@umijs/max';
import { Swords, Minus, X, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { PHASE_LABELS } from '@/models/fishBattleWindow';
import type { FishBattlePhase } from '@/models/fishBattleWindow';
import './index.less';
import './responsive.css';

/** 最小窗口尺寸 */
const MIN_WIDTH = 640;
const MIN_HEIGHT = 400;

/**
 * 摸鱼大乱斗浮动窗口
 *
 * 使用 createPortal 渲染到 body，跨路由持久存在。
 * 根据 phase 动态渲染 HeroSelect / Loading / Battle3d 子组件。
 */
const FishBattleFloatingWindow: React.FC = () => {
  const {
    visible,
    phase,
    roomCode,
    isMinimized,
    isMaximized,
    windowSize,
    windowPosition,
    closeWindow,
    toggleMinimize,
    toggleMaximize,
    updateSize,
    updatePosition,
  } = useModel('fishBattleWindow');

  // 关闭确认弹窗
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isBattleInteractionGuardActive, setIsBattleInteractionGuardActive] = useState(false);

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 缩放状态
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const windowRef = useRef<HTMLDivElement | null>(null);
  const battleInteractionGuardActiveRef = useRef(false);

  // 懒加载子组件引用
  const HeroSelectRef = useRef<React.ComponentType<any> | null>(null);
  const LoadingRef = useRef<React.ComponentType<any> | null>(null);
  const Battle3dRef = useRef<React.ComponentType<any> | null>(null);
  const [loadedPhases, setLoadedPhases] = useState<Set<FishBattlePhase>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  // 动态加载子组件
  useEffect(() => {
    if (!visible) return;

    const loadComponent = async (p: FishBattlePhase) => {
      if (loadedPhases.has(p)) return;
      try {
        switch (p) {
          case 'heroSelect': {
            const mod = await import('@/pages/FishBattle/HeroSelect');
            HeroSelectRef.current = mod.default;
            break;
          }
          case 'loading': {
            const mod = await import('@/pages/FishBattle/Loading');
            LoadingRef.current = mod.default;
            break;
          }
          case 'battle3d': {
            // 3D对战页面暂未迁移，使用占位
            Battle3dRef.current = null;
            break;
          }
        }
        setLoadedPhases((prev) => new Set(prev).add(p));
      } catch (err: any) {
        console.error(`[FishBattleWindow] Failed to load ${p} component`, err);
        setLoadError(`加载${p}组件失败: ${err?.message || err}`);
        setLoadedPhases((prev) => new Set(prev).add(p));
      }
    };

    loadComponent(phase);
  }, [visible, phase]);

  // —— 拖拽逻辑 ——
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return;
      // 只允许标题栏区域拖拽（排除按钮）
      const target = e.target as HTMLElement;
      if (target.closest('.fb-title-btn') || target.closest('.fb-title-actions')) return;

      setIsDragging(true);
      setDragStart({
        x: e.clientX - windowPosition.x,
        y: e.clientY - windowPosition.y,
      });
      e.preventDefault();
    },
    [windowPosition, isMaximized],
  );

  // —— 缩放逻辑 ——
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return;
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        w: windowSize.width,
        h: windowSize.height,
      });
      e.preventDefault();
      e.stopPropagation();
    },
    [windowSize, isMaximized],
  );

  // 全局鼠标移动/松开
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const nx = e.clientX - dragStart.x;
        const ny = e.clientY - dragStart.y;
        const maxX = window.innerWidth - windowSize.width;
        const maxY = window.innerHeight - windowSize.height;
        updatePosition({
          x: Math.max(0, Math.min(maxX, nx)),
          y: Math.max(0, Math.min(maxY, ny)),
        });
      }
      if (isResizing) {
        const nw = Math.max(MIN_WIDTH, resizeStart.w + (e.clientX - resizeStart.x));
        const nh = Math.max(MIN_HEIGHT, resizeStart.h + (e.clientY - resizeStart.y));
        const maxW = window.innerWidth - windowPosition.x;
        const maxH = window.innerHeight - windowPosition.y;
        updateSize({
          width: Math.min(nw, maxW),
          height: Math.min(nh, maxH),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, windowSize, windowPosition, updateSize, updatePosition]);

  // 关闭处理
  const handleClose = useCallback(() => {
    setShowCloseConfirm(true);
  }, []);

  const confirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    closeWindow();
  }, [closeWindow]);

  const cancelClose = useCallback(() => {
    setShowCloseConfirm(false);
  }, []);

  const handleReloadJoin = useCallback(() => {
    setLoadError(null);
    setLoadedPhases(new Set());
    HeroSelectRef.current = null;
    LoadingRef.current = null;
    Battle3dRef.current = null;
    setReloadNonce((prev) => prev + 1);
  }, []);

  useEffect(() => {
    battleInteractionGuardActiveRef.current = isBattleInteractionGuardActive;
  }, [isBattleInteractionGuardActive]);

  useEffect(() => {
    if (!visible || isMinimized || phase !== 'battle3d') {
      setIsBattleInteractionGuardActive(false);
      return;
    }

    const isInsideWindow = (target: EventTarget | null) => {
      return target instanceof Node && !!windowRef.current?.contains(target);
    };

    const swallowNativeEvent = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    };

    const handleMouseDownCapture = (event: MouseEvent) => {
      if (event.button !== 2) {
        return;
      }
      if (isInsideWindow(event.target)) {
        setIsBattleInteractionGuardActive(true);
      } else if (battleInteractionGuardActiveRef.current) {
        swallowNativeEvent(event);
      }
    };

    const handleMouseMoveCapture = (event: MouseEvent) => {
      if (!battleInteractionGuardActiveRef.current || isInsideWindow(event.target)) {
        return;
      }
      swallowNativeEvent(event);
    };

    const clearGuard = () => {
      setIsBattleInteractionGuardActive(false);
    };

    const handleMouseUpCapture = (event: MouseEvent) => {
      if (!battleInteractionGuardActiveRef.current) {
        return;
      }
      if (!isInsideWindow(event.target)) {
        swallowNativeEvent(event);
      }
      if (event.button === 2 || event.buttons === 0) {
        clearGuard();
      }
    };

    const handleContextMenuCapture = (event: MouseEvent) => {
      if (!battleInteractionGuardActiveRef.current) {
        return;
      }
      if (!isInsideWindow(event.target)) {
        swallowNativeEvent(event);
      }
      clearGuard();
    };

    const handleAuxClickCapture = (event: MouseEvent) => {
      if (!battleInteractionGuardActiveRef.current || isInsideWindow(event.target)) {
        return;
      }
      swallowNativeEvent(event);
    };

    const handleWindowBlur = () => {
      clearGuard();
    };

    document.addEventListener('mousedown', handleMouseDownCapture, true);
    document.addEventListener('mousemove', handleMouseMoveCapture, true);
    document.addEventListener('mouseup', handleMouseUpCapture, true);
    document.addEventListener('auxclick', handleAuxClickCapture, true);
    document.addEventListener('contextmenu', handleContextMenuCapture, true);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('mousedown', handleMouseDownCapture, true);
      document.removeEventListener('mousemove', handleMouseMoveCapture, true);
      document.removeEventListener('mouseup', handleMouseUpCapture, true);
      document.removeEventListener('auxclick', handleAuxClickCapture, true);
      document.removeEventListener('contextmenu', handleContextMenuCapture, true);
      window.removeEventListener('blur', handleWindowBlur);
      clearGuard();
    };
  }, [visible, isMinimized, phase]);

  const handleBattleInteractionGuard = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // 渲染当前阶段的内容
  const renderPhaseContent = useMemo(() => {
    if (!roomCode) return null;

    switch (phase) {
      case 'heroSelect': {
        const Comp = HeroSelectRef.current;
        if (Comp) return <Comp key={`heroSelect-${roomCode}-${reloadNonce}`} roomCode={roomCode} />;
        return loadedPhases.has('heroSelect') && loadError ? <PhaseError error={loadError} /> : <PhaseLoading label="英雄选择" />;
      }
      case 'loading': {
        const Comp = LoadingRef.current;
        if (Comp) return <Comp key={`loading-${roomCode}-${reloadNonce}`} roomCode={roomCode} />;
        return loadedPhases.has('loading') && loadError ? <PhaseError error={loadError} /> : <PhaseLoading label="游戏加载" />;
      }
      case 'battle3d': {
        const Comp = Battle3dRef.current;
        if (Comp) return <Comp key={`battle3d-${roomCode}-${reloadNonce}`} roomCode={roomCode} />;
        return loadedPhases.has('battle3d') && loadError ? <PhaseError error={loadError} /> : <PhaseLoading label="战斗场景" />;
      }
      default:
        return null;
    }
  }, [phase, roomCode, loadedPhases, reloadNonce]);

  // 不可见时不渲染
  if (!visible) return null;

  // ——— 计算窗口样式 ———
  const actualWidth = isMaximized ? window.innerWidth : windowSize.width;

  const windowStyle: React.CSSProperties = isMaximized
    ? { top: 0, left: 0, width: '100vw', height: '100vh' }
    : {
        top: 0,
        left: 0,
        width: windowSize.width,
        height: windowSize.height,
        transform: `translate(${windowPosition.x}px, ${windowPosition.y}px)`,
        transition: isDragging || isResizing ? 'none' : undefined,
      };

  // ——— 最小化时：同时渲染悬浮按钮 + 隐藏的完整窗口（保持子组件不卸载） ———
  return createPortal(
    <>
      {phase === 'battle3d' && !isMinimized && isBattleInteractionGuardActive && (
        <div
          className="fb-battle-interaction-guard"
          onAuxClick={handleBattleInteractionGuard}
          onContextMenu={handleBattleInteractionGuard}
          onMouseDown={handleBattleInteractionGuard}
          onMouseMove={handleBattleInteractionGuard}
          onMouseUp={(event) => {
            handleBattleInteractionGuard(event);
            setIsBattleInteractionGuardActive(false);
          }}
        />
      )}

      {/* 最小化悬浮按钮 */}
      {isMinimized && (
        <div className="fb-minimized-btn" onClick={toggleMinimize} title="展开摸鱼大乱斗">
          <Swords className="fb-minimized-icon" />
          <span className="fb-minimized-label">{PHASE_LABELS[phase]}</span>
        </div>
      )}

      {/* 完整窗口 — 最小化时通过 display:none 隐藏，避免子组件卸载导致 WebSocket 断连 */}
      <div
        ref={windowRef}
        className={`fb-floating-window ${isMaximized ? 'is-maximized' : ''}`}
        style={{
          ...windowStyle,
          ...(isMinimized ? { display: 'none' } : {}),
        }}
      >
        {/* 标题栏 */}
        <div className="fb-title-bar" onMouseDown={handleDragStart}>
          <div className="fb-title-left">
            <div className="fb-title-icon">
              <Swords size={13} />
            </div>
            <span className="fb-title-text">摸鱼大乱斗</span>
            <span className="fb-title-phase">{PHASE_LABELS[phase]}</span>
          </div>
          <div className="fb-title-actions">
            <button className="fb-title-btn btn-rejoin" onClick={handleReloadJoin} title="重载加入">
              <RotateCcw />
            </button>
            <button className="fb-title-btn" onClick={toggleMinimize} title="最小化">
              <Minus />
            </button>
            <button className="fb-title-btn" onClick={toggleMaximize} title={isMaximized ? '还原' : '最大化'}>
              {isMaximized ? <Minimize2 /> : <Maximize2 />}
            </button>
            <button className="fb-title-btn btn-close" onClick={handleClose} title="关闭">
              <X />
            </button>
          </div>
        </div>

        {/* 内容区 — 根据窗口宽度添加 size class 以驱动响应式样式 */}
        <div className={`fb-content ${
          actualWidth <= 700 ? 'fb-xs' : actualWidth <= 860 ? 'fb-sm' : actualWidth <= 1024 ? 'fb-md' : 'fb-lg'
        }${phase === 'battle3d' ? ' fb-battle3d' : ''}`}>
          {renderPhaseContent}
        </div>

        {/* 缩放手柄 */}
        {!isMaximized && (
          <div className="fb-resize-handle" onMouseDown={handleResizeStart}>
            <svg viewBox="0 0 10 10">
              <path
                fill="currentColor"
                d="M9,9 H7 V7 H9 V9 M9,6 H7 V4 H9 V6 M6,9 H4 V7 H6 V9 M3,9 H1 V7 H3 V9"
              />
            </svg>
          </div>
        )}

        {/* 关闭确认 */}
        {showCloseConfirm && (
          <div className="fb-close-confirm">
            <div className="fb-close-confirm-card">
              <div className="fb-close-confirm-title">确认退出游戏？</div>
              <div className="fb-close-confirm-desc">
                游戏正在进行中，退出后将无法继续当前对局。
              </div>
              <div className="fb-close-confirm-actions">
                <button className="fb-close-confirm-btn" onClick={cancelClose}>
                  继续游戏
                </button>
                <button className="fb-close-confirm-btn btn-danger" onClick={confirmClose}>
                  退出游戏
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
};

/** 阶段加载中占位 */
const PhaseLoading: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#7a8ea0',
      gap: 12,
      background: 'linear-gradient(160deg, #0b1520 0%, #101e2c 40%, #0d1925 100%)',
    }}
  >
    <Swords size={32} style={{ color: '#c89b3c', opacity: 0.6 }} />
    <span style={{ fontSize: 14 }}>正在加载{label}...</span>
  </div>
);

/** 阶段加载失败提示 */
const PhaseError: React.FC<{ error: string }> = ({ error }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#e74c3c',
      gap: 12,
      background: 'linear-gradient(160deg, #0b1520 0%, #101e2c 40%, #0d1925 100%)',
      padding: 24,
      textAlign: 'center',
    }}
  >
    <X size={32} style={{ color: '#e74c3c', opacity: 0.6 }} />
    <span style={{ fontSize: 14, color: '#7a8ea0' }}>组件加载失败</span>
    <span style={{ fontSize: 12, color: '#556070', maxWidth: 400, wordBreak: 'break-all' }}>{error}</span>
    <span style={{ fontSize: 12, color: '#556070' }}>请检查浏览器控制台获取详细错误信息，或点击标题栏刷新按钮重试</span>
  </div>
);

export default FishBattleFloatingWindow;
