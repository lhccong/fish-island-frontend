import React, { useCallback, useRef, useState } from 'react';
import { Button, Input, message, Modal, Space, Upload } from 'antd';
import {
  CloseOutlined,
  EnvironmentOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { publishMomentUsingPost } from '@/services/backend/momentsController';
import { uploadFileByMinioUsingPost } from '@/services/backend/fileController';
import './index.less';

interface PublishMomentModalProps {
  open: boolean;
  onCancel: () => void;
  /** 发布成功后的回调 */
  onSuccess?: () => void;
}

const PublishMomentModal: React.FC<PublishMomentModalProps> = ({ open, onCancel, onSuccess }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [publishing, setPublishing] = useState(false);
  const textareaRef = useRef<any>(null);

  const reset = () => {
    setContent('');
    setImages([]);
    setLocation('');
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  // 粘贴图片上传
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter((item) => item.type.indexOf('image') !== -1);
    if (imageItems.length === 0) return;
    e.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;
      try {
        const res = await uploadFileByMinioUsingPost({ biz: 'user_post' }, {}, file, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data) {
          setImages((prev) => [...prev, res.data!]);
          message.success('图片上传成功');
        }
      } catch {
        message.error('图片上传失败');
      }
    }
  }, []);

  // 文件选择上传
  const handleFileSelect = async (file: File) => {
    try {
      const res = await uploadFileByMinioUsingPost({ biz: 'user_post' }, {}, file, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data) {
        setImages((prev) => [...prev, res.data!]);
        message.success('图片上传成功');
      }
    } catch {
      message.error('图片上传失败');
    }
    return false;
  };

  const handlePublish = async () => {
    if (!content.trim() && images.length === 0) {
      message.warning('请输入内容或上传图片');
      return;
    }
    setPublishing(true);
    try {
      const mediaJson: API.MediaItem[] = images.map((url) => ({ type: 'image', url }));
      const res = await publishMomentUsingPost({
        content: content.trim(),
        mediaJson,
        location: location.trim() || undefined,
        visibility: 0,
      });
      if (res.data) {
        message.success('发布成功 🎉');
        reset();
        onCancel();
        onSuccess?.();
      }
    } catch {
      message.error('发布失败，请稍后重试');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal
      title="发布朋友圈"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={520}
      centered
      destroyOnClose
    >
      <div className="publish-modal-content">
        <Input.TextArea
          ref={textareaRef}
          placeholder="分享新鲜事..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          autoSize={{ minRows: 4, maxRows: 8 }}
          className="publish-textarea"
          maxLength={500}
          showCount
        />

        {/* 图片预览 */}
        {images.length > 0 && (
          <div className="publish-images-preview">
            {images.map((url, index) => (
              <div key={index} className="preview-item">
                <img src={url} alt={`预览${index + 1}`} />
                <span
                  className="remove-btn"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                >
                  <CloseOutlined />
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 上传区域 */}
        <div className="publish-actions">
          <Space>
            <Upload
              accept="image/*"
              beforeUpload={handleFileSelect}
              showUploadList={false}
              disabled={images.length >= 9}
            >
              <Button icon={<PlusOutlined />} disabled={images.length >= 9}>
                添加图片
              </Button>
            </Upload>
            <span className="upload-hint">
              {images.length > 0
                ? `已选择 ${images.length}/9 张图片，可直接粘贴图片`
                : '可直接粘贴图片上传'}
            </span>
          </Space>
        </div>

        {/* 位置 */}
        <div className="publish-location">
          <Input
            prefix={<EnvironmentOutlined style={{ color: '#aaa' }} />}
            placeholder="添加位置（选填）"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={50}
            allowClear
          />
        </div>

        {/* 底部按钮 */}
        <div className="publish-footer">
          <Button onClick={handleCancel}>取消</Button>
          <Button
            type="primary"
            onClick={handlePublish}
            loading={publishing}
            disabled={!content.trim() && images.length === 0}
          >
            发布
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PublishMomentModal;
