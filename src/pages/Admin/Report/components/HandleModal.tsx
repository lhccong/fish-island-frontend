import { handleReportUsingPost } from '@/services/backend/contentReportController';
import { UserOutlined } from '@ant-design/icons';
import { Avatar, Descriptions, Form, Input, Modal, Radio, Space, Tag, Typography, message } from 'antd';
import React, { useEffect } from 'react';

interface Props {
  visible: boolean;
  report?: API.ReportVO;
  onSubmit: () => void;
  onCancel: () => void;
}

const REPORT_STATUS = {
  PENDING: 0,
  HANDLED: 1,
  REJECTED: 2,
} as const;

const getChatMessageContent = (report?: API.ReportVO) => {
  return report?.chatMessage?.messageWrapper?.message?.content || '-';
};

const renderReportUser = (user?: API.UserVO) => {
  if (!user?.userName && !user?.userAvatar) return '-';
  return (
    <Space size={8}>
      <Avatar size={24} src={user?.userAvatar}>
        {!user?.userAvatar && <UserOutlined />}
      </Avatar>
      <span>{user?.userName || '-'}</span>
    </Space>
  );
};

const HandleModal: React.FC<Props> = ({ visible, report, onSubmit, onCancel }) => {
  const [form] = Form.useForm<{ status: number; handleRemark?: string }>();

  useEffect(() => {
    if (visible && report) {
      form.setFieldsValue({
        status: REPORT_STATUS.HANDLED,
        handleRemark: report.handleRemark,
      });
    } else {
      form.resetFields();
    }
  }, [visible, report, form]);

  const handleSubmit = async () => {
    if (!report?.id) return;
    try {
      const values = await form.validateFields();
      const hide = message.loading('正在提交');
      const { code, message: msg } = await handleReportUsingPost({
        id: report.id,
        status: values.status,
        handleRemark: values.handleRemark,
      });
      hide();
      if (code === 0) {
        message.success('处理成功');
        onSubmit();
        return;
      }
      message.error('处理失败，' + (msg || '未知错误'));
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error('处理失败，' + error.message);
    }
  };

  const isPending = report?.status === REPORT_STATUS.PENDING;

  return (
    <Modal
      destroyOnClose
      title={isPending ? '处理举报' : '举报详情'}
      open={visible}
      onOk={isPending ? handleSubmit : undefined}
      okText={isPending ? '提交' : undefined}
      cancelText={isPending ? '取消' : '关闭'}
      onCancel={onCancel}
      footer={isPending ? undefined : null}
      width={640}
    >
      {report && (
        <>
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="举报ID">{report.id}</Descriptions.Item>
            <Descriptions.Item label="举报类型">{report.reportTypeText || report.reportType}</Descriptions.Item>
            <Descriptions.Item label="举报原因">{report.reasonTypeText || report.reasonType}</Descriptions.Item>
            <Descriptions.Item label="处理状态">
              <Tag
                color={
                  report.status === REPORT_STATUS.PENDING
                    ? 'orange'
                    : report.status === REPORT_STATUS.HANDLED
                      ? 'green'
                      : 'default'
                }
              >
                {report.statusText || report.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="举报人">
              {renderReportUser(report.reporterUser)}
            </Descriptions.Item>
            <Descriptions.Item label="被举报用户">
              {renderReportUser(report.targetUser)}
            </Descriptions.Item>
            <Descriptions.Item label="被举报对象ID">{report.targetId}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{report.createTime}</Descriptions.Item>
            <Descriptions.Item label="补充说明" span={2}>
              {report.description || '-'}
            </Descriptions.Item>
            {report.reportType === 1 && (
              <Descriptions.Item label="聊天内容" span={2}>
                {getChatMessageContent(report)}
              </Descriptions.Item>
            )}
            {!isPending && (
              <>
                <Descriptions.Item label="处理时间">{report.handleTime || '-'}</Descriptions.Item>
                <Descriptions.Item label="处理人ID">{report.handlerId ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="处理备注" span={2}>
                  {report.handleRemark || '-'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>

          {isPending && (
            <Form form={form} layout="vertical">
              <Form.Item
                name="status"
                label="处理结果"
                rules={[{ required: true, message: '请选择处理结果' }]}
              >
                <Radio.Group>
                  <Radio value={REPORT_STATUS.HANDLED}>已处理</Radio>
                  <Radio value={REPORT_STATUS.REJECTED}>已驳回</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="handleRemark" label="处理备注">
                <Input.TextArea rows={3} placeholder="请输入处理备注（可选）" maxLength={500} showCount />
              </Form.Item>
            </Form>
          )}
        </>
      )}
    </Modal>
  );
};

export default HandleModal;
