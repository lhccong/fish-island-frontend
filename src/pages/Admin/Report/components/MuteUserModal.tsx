import { muteUserUsingPost } from '@/services/backend/userMuteController';
import { Button, Input, Modal, Radio, message } from 'antd';
import React, { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  userId?: string;
  userName?: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

const formatMuteDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时`;
  return `${Math.floor(seconds / 86400)}天`;
};

const MuteUserModal: React.FC<Props> = ({ open, userId, userName, onCancel, onSuccess }) => {
  const [muteDuration, setMuteDuration] = useState(60);
  const [customMuteDuration, setCustomMuteDuration] = useState<number | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setMuteDuration(60);
      setCustomMuteDuration(undefined);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!userId) return;
    const duration = customMuteDuration ?? muteDuration;
    if (!duration || duration <= 0) {
      message.warning('请输入有效的禁言时长');
      return;
    }

    try {
      setSubmitting(true);
      const { code, message: msg } = await muteUserUsingPost({
        userId: userId as any,
        duration: Number(duration),
      } as any);
      if (code === 0) {
        message.success(`已禁言用户 ${userName || ''}，时长 ${formatMuteDuration(duration)}`);
        onSuccess?.();
        onCancel();
        return;
      }
      message.error('禁言失败，' + (msg || '未知错误'));
    } catch (error: any) {
      message.error('禁言失败，' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveDuration = customMuteDuration ?? muteDuration;

  return (
    <Modal
      title={`禁言用户${userName ? `：${userName}` : ''}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={400}
    >
      <Radio.Group
        value={muteDuration}
        onChange={(e) => {
          setMuteDuration(e.target.value);
          setCustomMuteDuration(undefined);
        }}
        buttonStyle="solid"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        <Radio.Button value={10}>10秒</Radio.Button>
        <Radio.Button value={60}>1分钟</Radio.Button>
        <Radio.Button value={300}>5分钟</Radio.Button>
        <Radio.Button value={3600}>1小时</Radio.Button>
        <Radio.Button value={86400}>1天</Radio.Button>
      </Radio.Group>

      <Input.Group compact style={{ marginTop: 16 }}>
        <Input
          style={{ width: 'calc(100% - 80px)' }}
          type="number"
          placeholder="自定义禁言时长（秒）"
          value={customMuteDuration}
          onChange={(e) =>
            setCustomMuteDuration(e.target.value ? Number(e.target.value) : undefined)
          }
          min={1}
        />
        <Button
          type="primary"
          style={{ width: 80 }}
          onClick={() => {
            if (customMuteDuration && customMuteDuration > 0) {
              setMuteDuration(customMuteDuration);
            } else {
              message.warning('请输入有效的禁言时长');
            }
          }}
        >
          确认
        </Button>
      </Input.Group>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={onCancel}>取消</Button>
        <Button type="primary" danger loading={submitting} onClick={handleConfirm}>
          确认禁言 {formatMuteDuration(effectiveDuration)}
        </Button>
      </div>
    </Modal>
  );
};

export default MuteUserModal;
