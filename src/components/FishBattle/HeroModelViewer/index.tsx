import React, { Suspense, useEffect, useState } from 'react';
import './index.less';

export interface HeroModelViewerProps {
  modelUrl?: string | null;
  fallbackImage?: string;
  heroName?: string;
  heroEmoji?: string;
  autoRotate?: boolean;
  enableZoom?: boolean;
  activeAnimation?: string;
  onAnimationsLoaded?: (names: string[]) => void;
}

/** Three.js Canvas 部分通过 React.lazy 动态加载，避免 MFSU/React 双实例问题 */
const LazyThreeCanvas = React.lazy(() => import('./ThreeCanvas'));

const HeroModelViewer: React.FC<HeroModelViewerProps> = (props) => {
  const { modelUrl, fallbackImage, heroName, heroEmoji } = props;
  const [hasError, setHasError] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  // modelUrl 变化时重置状态
  useEffect(() => {
    setHasError(false);
    setCanvasReady(false);
  }, [modelUrl]);

  // 没有模型或加载失败：显示立绘回退
  if (!modelUrl || hasError) {
    return (
      <div className="hero-model-fallback">
        {fallbackImage ? (
          <img src={fallbackImage} alt={heroName || ''} className="hero-model-fallback-img" />
        ) : (
          <div className="hero-model-fallback-emoji">
            <span>{heroEmoji || '🐟'}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hero-model-canvas-wrapper">
      {!canvasReady && <CanvasLoadingPlaceholder />}
      <div style={{ opacity: canvasReady ? 1 : 0, transition: 'opacity 0.3s ease-in', width: '100%', height: '100%' }}>
        <ErrorBoundary onError={() => setHasError(true)} fallbackImage={fallbackImage} heroName={heroName} heroEmoji={heroEmoji}>
          <Suspense fallback={null}>
            <LazyThreeCanvas {...props} modelUrl={modelUrl} onError={() => setHasError(true)} onReady={() => setCanvasReady(true)} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

/** Canvas 加载中的 HTML 占位 */
const CanvasLoadingPlaceholder: React.FC = () => (
  <div className="hero-model-fallback">
    <div className="hero-model-fallback-emoji" style={{ opacity: 0.3 }}>
      <span style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>⏳</span>
    </div>
  </div>
);

/** 错误边界 — 模型加载失败时回退到立绘 */
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError: () => void;
  fallbackImage?: string;
  heroName?: string;
  heroEmoji?: string;
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[HeroModelViewer] 模型加载失败:', error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="hero-model-fallback">
          {this.props.fallbackImage ? (
            <img src={this.props.fallbackImage} alt={this.props.heroName || ''} className="hero-model-fallback-img" />
          ) : (
            <div className="hero-model-fallback-emoji">
              <span>{this.props.heroEmoji || '🐟'}</span>
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default HeroModelViewer;
