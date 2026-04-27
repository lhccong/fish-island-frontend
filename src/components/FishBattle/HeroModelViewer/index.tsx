import React from 'react';

interface HeroModelViewerProps {
  modelUrl?: string | null;
  fallbackImage?: string;
  heroName?: string;
  heroEmoji?: string;
  autoRotate?: boolean;
  enableZoom?: boolean;
  activeAnimation?: string;
  onAnimationsLoaded?: (names: string[]) => void;
}

/**
 * HeroModelViewer 占位组件
 * 3D 模型查看器未迁移，使用 fallbackImage / emoji 静态展示
 */
const HeroModelViewer: React.FC<HeroModelViewerProps> = ({
  fallbackImage,
  heroName,
  heroEmoji,
  onAnimationsLoaded,
}) => {
  React.useEffect(() => {
    onAnimationsLoaded?.([]);
  }, [heroName]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {fallbackImage ? (
        <img
          src={fallbackImage}
          alt={heroName || '英雄'}
          style={{
            maxWidth: '90%',
            maxHeight: '90%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 20px rgba(255,107,53,0.3))',
          }}
        />
      ) : (
        <span style={{ fontSize: '6rem' }}>{heroEmoji || '🐟'}</span>
      )}
    </div>
  );
};

export default HeroModelViewer;
