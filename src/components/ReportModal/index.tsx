import { addReportUsingPost, listReasonOptionsUsingGet } from '@/services/backend/contentReportController';
import { Form, Input, Modal, Radio, Spin, Typography, message } from 'antd';
import React, { useEffect, useState } from 'react';
import styles from './index.less';

export const REPORT_TYPE = {
  CHAT: 1,
  POST: 2,
  MOMENTS: 3,
} as const;

interface ReportModalProps {
  open: boolean;
  reportType: number;
  /** 雪花 ID，必须以字符串传递 */
  targetId: string;
  /** 雪花 ID，必须以字符串传递 */
  targetUserId?: string;
  preview?: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  open,
  reportType,
  targetId,
  targetUserId,
  preview,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm<{ reasonType: number; description?: string }>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reasons, setReasons] = useState<API.ReportReasonOptionVO[]>([]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    let cancelled = false;
    setLoading(true);
    listReasonOptionsUsingGet()
      .then((res) => {
        if (cancelled) return;
        if (res.code === 0) {
          setReasons(res.data || []);
        } else {
          message.error('获取举报原因失败，' + (res.message || '未知错误'));
        }
      })
      .catch((error: any) => {
        if (!cancelled) {
          message.error('获取举报原因失败，' + error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const { code, message: msg } = await addReportUsingPost({
        reportType,
        targetId: targetId as any,
        targetUserId: targetUserId as any,
        reasonType: values.reasonType,
        description: values.description,
      });
      if (code === 0) {
        message.success('举报已提交，我们会尽快处理');
        onSuccess?.();
        onCancel();
        return;
      }
      message.error('举报提交失败，' + (msg || '未知错误'));
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error('举报提交失败，' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="举报内容"
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="提交举报"
      cancelText="取消"
      destroyOnClose
      width={480}
      styles={{ body: { paddingTop: 12 } }}
    >
      {preview ? (
        <Typography.Paragraph
          className={styles.preview}
          ellipsis={{ rows: 2, tooltip: preview }}
          style={{ marginBottom: 0 }}
        >
          {preview}
        </Typography.Paragraph>
      ) : null}
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" className={styles.form}>
          <Form.Item
            name="reasonType"
            label="举报原因"
            rules={[{ required: true, message: '请选择举报原因' }]}
          >
            <Radio.Group className={styles.reasonList}>
              {reasons.map((item) => (
                <Radio key={item.value} value={item.value}>
                  {item.text}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item name="description" label="补充说明">
            <Input.TextArea rows={2} placeholder="请补充说明（可选）" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ReportModal;
