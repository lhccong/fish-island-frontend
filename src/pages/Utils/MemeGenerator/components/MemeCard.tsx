// 表情包卡片组件 - 使用IntersectionObserver实现懒加载
import React, { useRef, useEffect } from 'react';
import type { MemeInfo } from '../types';

interface MemeCardProps {
  meme: MemeInfo;
  previewUrl?: string;
  onClick: () => void;
  onLoadPreview: () => void;
}

const MemeCard: React.FC<MemeCardProps> = ({ meme, previewUrl, onClick, onLoadPreview }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadPreview();
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={cardRef} onClick={onClick} className="meme-card">
      {/* 预览图 */}
      <div className="meme-card-preview">
        {previewUrl ? (
          <img src={previewUrl} alt={meme.key} className="meme-card-img" loading="lazy" />
        ) : (
          <div className="meme-card-placeholder">
            <div className="meme-card-placeholder-icon">🖼️</div>
            <span className="meme-card-placeholder-text">点击预览</span>
          </div>
        )}
        <div className="meme-card-overlay" />
      </div>
      {/* 信息 */}
      <div className="meme-card-info">
        <h3 className="meme-card-title">{meme.keywords[0] || meme.key}</h3>
        <div className="meme-card-badges">
          {(meme.params.min_images > 0 || meme.params.max_images > 0) && (
            <span className="meme-badge meme-badge-blue">
              {meme.params.min_images === meme.params.max_images
                ? `${meme.params.min_images} 图`
                : `${meme.params.min_images}-${meme.params.max_images} 图`}
            </span>
          )}
          {(meme.params.min_texts > 0 || meme.params.max_texts > 0) && (
            <span className="meme-badge meme-badge-green">
              {meme.params.min_texts === meme.params.max_texts
                ? `${meme.params.min_texts} 文`
                : `${meme.params.min_texts}-${meme.params.max_texts} 文`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemeCard;
