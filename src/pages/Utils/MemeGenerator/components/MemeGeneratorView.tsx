// 表情包生成页面组件
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { message } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';
import type { MemeInfo, ImageItem } from '../types';
import { getMemeInfo, getMemePreview, uploadImage, generateMeme, getImageUrl, MemeError } from '../api';
import { addEmoticonFavourUsingPost } from '@/services/backend/emoticonFavourController';
import { uploadFileByMinioUsingPost } from '@/services/backend/fileController';
import eventBus from '@/utils/eventBus';
import { EMOTICON_FAVORITE_CHANGED } from '@/components/MessageContent';
import { useModel } from '@@/exports';
import ImageUploader from './ImageUploader';
import OptionField from './OptionField';

/** 压缩图片（超过1MB时使用） */
function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_SIZE = 1920;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.8,
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/** 从 URL 下载图片并转为 File 对象 */
async function urlToFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  const ext = blob.type.split('/')[1] || 'png';
  return new File([blob], `${filename}.${ext}`, { type: blob.type });
}

interface MemeGeneratorViewProps {
  memeKey: string;
  onBack: () => void;
  memeInfo?: MemeInfo;
}

/** 格式化错误信息 */
function formatError(err: unknown): { msg: string; hint: string } {
  if (err instanceof MemeError) {
    switch (err.code) {
      case 550: {
        const { min, max, actual } = err.data || {};
        const range = min === max ? `${min}` : `${min}~${max}`;
        return { msg: '图片数量不符合要求', hint: `需要 ${range} 张图片，当前提供了 ${actual} 张` };
      }
      case 551: {
        const { min, max, actual } = err.data || {};
        const range = min === max ? `${min}` : `${min}~${max}`;
        return { msg: '文字数量不符合要求', hint: `需要 ${range} 段文字，当前提供了 ${actual} 段` };
      }
      case 560:
        return { msg: '文字内容过长', hint: '请缩短文字后重试' };
      case 570:
        return { msg: err.data?.feedback || '生成失败', hint: '' };
      case 510:
        return { msg: '图片解码失败', hint: '请检查图片格式是否正确（支持 PNG、JPG、GIF）' };
      case 520:
        return { msg: '图片编码失败', hint: '生成过程中出现错误，请重试' };
      case 530:
        return { msg: '模板资源缺失', hint: '该模板的素材文件缺失，请联系管理员' };
      case 540:
        return { msg: '参数解析失败', hint: '请检查输入的参数是否正确' };
      case 410:
        return { msg: '网络请求失败', hint: '无法下载图片资源，请检查网络连接' };
      case 420:
        return { msg: '文件读写失败', hint: '服务器内部错误，请稍后重试' };
      default:
        return { msg: err.message || '生成失败', hint: '' };
    }
  }
  return { msg: '生成失败', hint: '发生未知错误，请重试' };
}

const MemeGeneratorView: React.FC<MemeGeneratorViewProps> = ({ memeKey, onBack, memeInfo: cachedMemeInfo }) => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const [memeInfo, setMemeInfo] = useState<MemeInfo | null>(cachedMemeInfo || null);
  const [loading, setLoading] = useState(!cachedMemeInfo);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [errorHint, setErrorHint] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [favoriting, setFavoriting] = useState(false);
  const [favorited, setFavorited] = useState(false);

  // 表单状态
  const [images, setImages] = useState<ImageItem[]>([]);
  const [texts, setTexts] = useState<string[]>([]);
  const [options, setOptions] = useState<Record<string, any>>({});
  const [optionEnabled, setOptionEnabled] = useState<Record<string, boolean>>({});

  const refreshingPreview = useRef(false);
  const optionChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const needsImages = memeInfo ? memeInfo.params.max_images > 0 : false;
  const needsTexts = memeInfo ? memeInfo.params.max_texts > 0 : false;

  const canGenerate = useMemo(() => {
    if (!memeInfo) return false;
    const p = memeInfo.params;
    const imgCount = images.length;
    const txtCount = texts.filter((t) => t.trim()).length;
    const hasEnoughImages = imgCount >= p.min_images;
    const hasEnoughTexts = txtCount >= p.min_texts || p.min_texts === 0;
    return hasEnoughImages && hasEnoughTexts && !generating;
  }, [memeInfo, images, texts, generating]);

  // 初始化表单
  const initFormState = (info: MemeInfo) => {
    const p = info.params;

    // 初始化文字
    let initTexts: string[];
    if (p.max_texts === 0) {
      initTexts = [];
    } else if (p.default_texts.length > 0) {
      initTexts = [...p.default_texts];
    } else {
      initTexts = Array(Math.max(p.min_texts, 1)).fill('').slice(0, p.max_texts || 1);
    }
    setTexts(initTexts);

    // 初始化选项
    const opts: Record<string, any> = {};
    const enabled: Record<string, boolean> = {};
    for (const opt of p.options) {
      if (opt.default != null) {
        opts[opt.name] = opt.default;
        enabled[opt.name] = true;
      } else {
        switch (opt.type) {
          case 'boolean': opts[opt.name] = false; break;
          case 'string': opts[opt.name] = ''; break;
          case 'integer': opts[opt.name] = opt.minimum ?? 0; break;
          case 'float': opts[opt.name] = opt.minimum ?? 0; break;
        }
        enabled[opt.name] = false;
      }
    }
    setOptions(opts);
    setOptionEnabled(enabled);
  };

  // 构建最终选项
  const buildFinalOptions = (): Record<string, any> => {
    if (!memeInfo) return {};
    const finalOptions: Record<string, any> = {};
    for (const opt of memeInfo.params.options) {
      if (!optionEnabled[opt.name]) continue;
      const val = options[opt.name];
      if (val === undefined || val === null || val === '') continue;
      finalOptions[opt.name] = val;
    }
    return finalOptions;
  };

  // 刷新预览
  const refreshPreview = async () => {
    if (!memeInfo || refreshingPreview.current) return;
    refreshingPreview.current = true;
    try {
      const resp = await getMemePreview(memeInfo.key, buildFinalOptions());
      setPreviewUrl(getImageUrl(resp.image_id));
    } catch {
      // 静默失败
    } finally {
      refreshingPreview.current = false;
    }
  };

  // 选项变化时自动刷新预览
  useEffect(() => {
    if (!memeInfo) return;
    if (optionChangeTimeout.current) clearTimeout(optionChangeTimeout.current);
    optionChangeTimeout.current = setTimeout(() => {
      refreshPreview();
    }, 500);
    return () => {
      if (optionChangeTimeout.current) clearTimeout(optionChangeTimeout.current);
    };
  }, [options, optionEnabled]);

  // 加载表情包信息
  useEffect(() => {
    (async () => {
      try {
        let info: MemeInfo;
        if (cachedMemeInfo) {
          info = cachedMemeInfo;
        } else {
          info = await getMemeInfo(memeKey);
          setMemeInfo(info);
        }
        initFormState(info);
        try {
          const prev = await getMemePreview(memeKey);
          setPreviewUrl(getImageUrl(prev.image_id));
        } catch {
          // 预览可能不可用
        }
      } catch (err: any) {
        setError(err.message || '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [memeKey]);

  // 添加文字
  const addText = () => {
    if (!memeInfo) return;
    if (texts.length < memeInfo.params.max_texts) {
      setTexts([...texts, '']);
    }
  };

  // 删除文字
  const removeText = (index: number) => {
    setTexts(texts.filter((_, i) => i !== index));
  };

  // 更新文字
  const updateText = (index: number, value: string) => {
    const newTexts = [...texts];
    newTexts[index] = value;
    setTexts(newTexts);
  };

  // 生成表情包
  const generate = async () => {
    if (!memeInfo || generating) return;
    setGenerating(true);
    setError('');
    setErrorHint('');
    setResultUrl('');

    try {
      // 上传未上传的图片
      const uploadedImages: { name: string; id: string }[] = [];
      for (const img of images) {
        if (img.id) {
          uploadedImages.push({ name: img.name, id: img.id });
        } else if (img.file) {
          const resp = await uploadImage(img.file);
          img.id = resp.image_id;
          uploadedImages.push({ name: img.name, id: resp.image_id });
        }
      }

      // 过滤文字
      const filteredTexts = texts.filter(
        (t) => t.trim() !== '' || memeInfo.params.min_texts > 0,
      );
      const finalTexts = filteredTexts.length > 0 ? filteredTexts : texts;
      const finalOptions = buildFinalOptions();

      const resp = await generateMeme(memeInfo.key, uploadedImages, finalTexts, finalOptions);
      setResultUrl(getImageUrl(resp.image_id));
      setFavorited(false); // 重置收藏状态
    } catch (err: any) {
      const { msg, hint } = formatError(err);
      setError(msg);
      setErrorHint(hint);
    } finally {
      setGenerating(false);
    }
  };

  // 下载结果
  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `meme-${memeInfo?.key || 'result'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 收藏表情包：下载图片 → 压缩 → 上传Minio → 用Minio URL收藏
  const favoriteResult = async () => {
    if (!resultUrl || favoriting) return;
    if (!currentUser?.id) {
      message.warning('请先登录后再收藏');
      return;
    }
    setFavoriting(true);
    try {
      // 1. 从表情包后端下载图片并转为 File
      let file = await urlToFile(resultUrl, `meme-${memeInfo?.key || 'result'}`);

      // 2. 检查文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        message.error('图片格式不支持，仅支持 JPG、PNG、GIF、WEBP');
        return;
      }

      // 3. 检查文件大小（限制5MB）
      if (file.size > 5 * 1024 * 1024) {
        message.error('图片大小超过 5MB，无法收藏');
        return;
      }

      // 4. 超过1MB时压缩
      if (file.size > 1024 * 1024) {
        file = await compressImage(file);
      }

      // 5. 上传到 Minio
      const uploadRes = await uploadFileByMinioUsingPost(
        { biz: 'user_file' },
        {},
        file,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (!uploadRes.data) {
        throw new Error('图片上传失败');
      }
      const cdnUrl = uploadRes.data;

      // 6. 用 Minio CDN URL 收藏
      const response = await addEmoticonFavourUsingPost(cdnUrl);
      if (response.code === 0) {
        message.success('收藏成功，可在聊天室表情中查看');
        setFavorited(true);
        // 通知聊天室刷新收藏列表
        eventBus.emit(EMOTICON_FAVORITE_CHANGED, 'add', cdnUrl);
      } else {
        message.error(response.message || '收藏失败');
      }
    } catch (err: any) {
      message.error(err?.message || '收藏失败，请检查是否已登录');
    } finally {
      setFavoriting(false);
    }
  };

  return (
    <div className="meme-generator-view">
      {/* 返回按钮 */}
      <button className="meme-btn-secondary meme-back-btn" onClick={onBack}>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </button>

      {/* 加载中 */}
      {loading && (
        <div className="meme-loading">
          <svg className="meme-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle className="meme-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="meme-spinner-fill" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>加载中...</span>
        </div>
      )}

      {!loading && memeInfo && (
        <>
          {/* 标题 */}
          <div className="meme-gen-header">
            <h2 className="meme-gen-title">{memeInfo.keywords[0] || memeInfo.key}</h2>
            <div className="meme-gen-tags">
              {memeInfo.keywords.map((kw) => (
                <span key={kw} className="meme-badge meme-badge-blue">{kw}</span>
              ))}
              {memeInfo.tags.map((tag) => (
                <span key={tag} className="meme-badge meme-badge-gray">{tag}</span>
              ))}
            </div>
          </div>

          <div className="meme-gen-layout">
            {/* 左侧：表单 */}
            <div className="meme-gen-form">
              {/* 图片上传 */}
              {needsImages && (
                <div className="meme-gen-section">
                  <h3 className="meme-gen-section-title">上传图片</h3>
                  <p className="meme-gen-section-desc">
                    需要 {memeInfo.params.min_images}
                    {memeInfo.params.min_images !== memeInfo.params.max_images && ` ~ ${memeInfo.params.max_images}`}
                    {' '}张图片
                  </p>
                  <ImageUploader
                    min={memeInfo.params.min_images}
                    max={memeInfo.params.max_images}
                    images={images}
                    onUpdate={setImages}
                  />
                </div>
              )}

              {/* 文字输入 */}
              {needsTexts && (
                <div className="meme-gen-section">
                  <h3 className="meme-gen-section-title">输入文字</h3>
                  <p className="meme-gen-section-desc">
                    需要 {memeInfo.params.min_texts}
                    {memeInfo.params.min_texts !== memeInfo.params.max_texts && ` ~ ${memeInfo.params.max_texts}`}
                    {' '}段文字
                  </p>
                  {/* 快捷短语 */}
                  <div className="meme-quick-phrases">
                    {['摸鱼中', '在吗', '好的', '收到', '啊？', '笑死', '绝了', '救命', '真的假的', '不关我事', '今天也在摸鱼', '打工人打工魂', '我太难了', '你说得对'].map((phrase) => (
                      <button
                        key={phrase}
                        className="meme-quick-phrase-btn"
                        onClick={() => {
                          const idx = texts.findIndex((t) => !t.trim());
                          if (idx >= 0) {
                            updateText(idx, phrase);
                          } else if (texts.length < memeInfo.params.max_texts) {
                            const newTexts = [...texts, phrase];
                            setTexts(newTexts);
                          } else {
                            updateText(texts.length - 1, phrase);
                          }
                        }}
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                  <div className="meme-gen-texts">
                    {texts.map((text, idx) => (
                      <div key={idx} className="meme-gen-text-row">
                        <input
                          className="meme-input"
                          value={text}
                          onChange={(e) => updateText(idx, e.target.value)}
                          placeholder={`文字 ${idx + 1}`}
                        />
                        {texts.length > memeInfo.params.min_texts && (
                          <button className="meme-gen-text-remove" onClick={() => removeText(idx)} title="删除">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    {texts.length < memeInfo.params.max_texts && (
                      <button className="meme-btn-secondary meme-gen-add-text" onClick={addText}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        添加文字
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 选项 */}
              {memeInfo.params.options.length > 0 && (
                <div className="meme-gen-section">
                  <h3 className="meme-gen-section-title">选项</h3>
                  <div className="meme-gen-options">
                    {memeInfo.params.options.map((opt) => (
                      <OptionField
                        key={opt.name}
                        option={opt}
                        value={options[opt.name]}
                        enabled={optionEnabled[opt.name]}
                        onChange={(val) => setOptions((prev) => ({ ...prev, [opt.name]: val }))}
                        onEnabledChange={(val) => setOptionEnabled((prev) => ({ ...prev, [opt.name]: val }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 生成按钮 */}
              <button className="meme-btn-primary meme-gen-submit" onClick={generate} disabled={!canGenerate}>
                {generating ? (
                  <>
                    <svg className="meme-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle className="meme-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="meme-spinner-fill" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    生成中...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    生成表情包
                  </>
                )}
              </button>

              {/* 错误提示 */}
              {error && (
                <div className="meme-error-box">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="meme-error-msg">{error}</p>
                    {errorHint && <p className="meme-error-hint">{errorHint}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：预览/结果 */}
            <div className="meme-gen-preview-area">
              {/* 生成结果 */}
              {resultUrl && (
                <div className="meme-gen-section">
                  <div className="meme-gen-result-header">
                    <h3 className="meme-gen-section-title">生成结果</h3>
                    <div className="meme-gen-result-actions">
                      <button
                        className={`meme-btn-secondary meme-gen-favorite ${favorited ? 'meme-gen-favorite-active' : ''}`}
                        onClick={favoriteResult}
                        disabled={favoriting || favorited}
                        title={favorited ? '已收藏' : '收藏到聊天表情'}
                      >
                        {favorited ? (
                          <StarFilled style={{ fontSize: 16, color: '#fadb14' }} />
                        ) : (
                          <StarOutlined style={{ fontSize: 16 }} />
                        )}
                        {favoriting ? '收藏中...' : favorited ? '已收藏' : '收藏'}
                      </button>
                      <button className="meme-btn-secondary meme-gen-download" onClick={downloadResult}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        下载
                      </button>
                    </div>
                  </div>
                  <div className="meme-gen-result-img-wrap">
                    <img src={resultUrl} alt="Generated meme" className="meme-gen-result-img" />
                  </div>
                </div>
              )}

              {/* 预览 */}
              <div className="meme-gen-section">
                <h3 className="meme-gen-section-title">预览</h3>
                <div className="meme-gen-preview-img-wrap">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="meme-gen-preview-img" />
                  ) : (
                    <div className="meme-gen-preview-empty">
                      <div style={{ fontSize: 36 }}>🖼️</div>
                      <p>暂无预览</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MemeGeneratorView;
