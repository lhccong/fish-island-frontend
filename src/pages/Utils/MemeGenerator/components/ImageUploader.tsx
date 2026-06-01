// 图片上传组件 - 支持拖放、粘贴、多选
import React, { useRef, useState, useEffect } from 'react';
import { message } from 'antd';
import type { ImageItem } from '../types';
import { uploadImage } from '../api';

// 允许的图片类型
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// 最大文件大小 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface ImageUploaderProps {
  min: number;
  max: number;
  images: ImageItem[];
  onUpdate: (images: ImageItem[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ min, max, images, onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const canAdd = images.length < max;

  // 处理文件上传
  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = max - images.length;
    const toProcess = fileArray.slice(0, remaining);
    if (toProcess.length === 0) return;

    // 文件类型和大小校验
    for (const file of toProcess) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        message.error(`文件 "${file.name}" 格式不支持，仅支持 JPG、PNG、GIF、WEBP`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        message.error(`文件 "${file.name}" 超过 5MB 大小限制`);
        return;
      }
    }

    setUploading(true);
    const newImages: ImageItem[] = [...images];

    for (const file of toProcess) {
      try {
        const preview = URL.createObjectURL(file);
        const resp = await uploadImage(file);
        newImages.push({
          name: file.name.replace(/\.[^.]+$/, ''),
          id: resp.image_id,
          preview,
          file,
        });
      } catch (err) {
        console.error('Upload failed:', err);
        message.error(`文件 "${file.name}" 上传失败`);
      }
    }

    onUpdate(newImages);
    setUploading(false);
  };

  // 文件选择
  const onFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files);
      event.target.value = '';
    }
  };

  // 拖放处理
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer?.files) {
      handleFiles(event.dataTransfer.files);
    }
  };

  // 粘贴处理
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (!canAdd) return;
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault();
        handleFiles(imageFiles);
      }
    };

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [canAdd, images]);

  // 删除图片
  const removeImage = (index: number) => {
    const newImages = [...images];
    const removed = newImages.splice(index, 1);
    if (removed[0]?.preview) {
      URL.revokeObjectURL(removed[0].preview);
    }
    onUpdate(newImages);
  };

  // 更新图片名称
  const updateName = (index: number, name: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], name };
    onUpdate(newImages);
  };

  // 移动图片位置
  const moveImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    const newImages = [...images];
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    onUpdate(newImages);
  };

  return (
    <div className="meme-uploader">
      {/* 已上传的图片列表 */}
      {images.length > 0 && (
        <div className="meme-uploader-list">
          {images.map((img, idx) => (
            <div key={idx} className="meme-uploader-item">
              {/* 缩略图 */}
              <div className="meme-uploader-thumb">
                {img.preview ? (
                  <img src={img.preview} alt={img.name} />
                ) : (
                  <span>?</span>
                )}
              </div>
              {/* 名称输入 */}
              <input
                className="meme-input meme-uploader-name"
                value={img.name}
                onChange={(e) => updateName(idx, e.target.value)}
                placeholder="图片名称"
              />
              {/* 操作按钮 */}
              <div className="meme-uploader-controls">
                {images.length > 1 && (
                  <>
                    <button
                      className="meme-uploader-btn"
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      title="上移"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      className="meme-uploader-btn"
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === images.length - 1}
                      title="下移"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  className="meme-uploader-btn meme-uploader-btn-danger"
                  onClick={() => removeImage(idx)}
                  title="删除"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 拖放区域 */}
      {canAdd && (
        <div
          className={`meme-uploader-dropzone ${dragOver ? 'meme-uploader-dropzone-active' : ''}`}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={onFileInput}
          />
          {uploading ? (
            <div className="meme-uploader-uploading">
              <svg className="meme-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle className="meme-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="meme-spinner-fill" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>上传中...</span>
            </div>
          ) : (
            <div className="meme-uploader-hint">
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginBottom: 8, color: '#9ca3af' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="meme-uploader-hint-text">点击、拖放或粘贴图片到这里上传</p>
              <p className="meme-uploader-hint-sub">还可上传 {max - images.length} 张</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
