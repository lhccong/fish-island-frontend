import HandleModal from '@/pages/Admin/Report/components/HandleModal';
import MuteUserModal from '@/pages/Admin/Report/components/MuteUserModal';
import { listReportPageUsingGet } from '@/services/backend/contentReportController';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { UserOutlined } from '@ant-design/icons';
import { Avatar, Space, Tag, Typography } from 'antd';
import React, { useRef, useState } from 'react';

const REPORT_TYPE_ENUM = {
  1: { text: '聊天记录' },
  2: { text: '帖子' },
  3: { text: '鱼小圈' },
};

const REPORT_STATUS_ENUM = {
  0: { text: '待处理', status: 'Warning' },
  1: { text: '已处理', status: 'Success' },
  2: { text: '已驳回', status: 'Default' },
};

const getChatMessageContent = (record: API.ReportVO) => {
  return record.chatMessage?.messageWrapper?.message?.content;
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

const getTargetUserId = (record: API.ReportVO): string | undefined => {
  const id = record.targetUser?.id ?? record.targetUserId;
  if (id == null) return undefined;
  return String(id);
};

const getTargetLink = (record: API.ReportVO) => {
  if (!record.targetId) return null;
  switch (record.reportType) {
    case 2:
      return `/post/${record.targetId}`;
    case 3:
      return '/moments/fish-circle';
    default:
      return null;
  }
};

/**
 * 举报管理页面
 */
const ReportAdminPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [handleModalVisible, setHandleModalVisible] = useState(false);
  const [muteModalVisible, setMuteModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<API.ReportVO>();
  const [muteTarget, setMuteTarget] = useState<{ userId: string; userName?: string }>();

  const columns: ProColumns<API.ReportVO>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      hideInSearch: true,
    },
    {
      title: '举报类型',
      dataIndex: 'reportType',
      valueEnum: REPORT_TYPE_ENUM,
      render: (_, record) => record.reportTypeText || REPORT_TYPE_ENUM[record.reportType as 1]?.text,
    },
    {
      title: '举报原因',
      dataIndex: 'reasonTypeText',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '举报人',
      dataIndex: 'reporterId',
      valueType: 'digit',
      width: 160,
      render: (_, record) => renderReportUser(record.reporterUser),
    },
    {
      title: '被举报用户',
      dataIndex: 'targetUserId',
      valueType: 'digit',
      width: 160,
      render: (_, record) => renderReportUser(record.targetUser),
    },
    {
      title: '被举报对象ID',
      dataIndex: 'targetId',
      hideInSearch: true,
      render: (_, record) => {
        const link = getTargetLink(record);
        if (!link) return record.targetId ?? '-';
        return (
          <Typography.Link onClick={() => history.push(link)}>
            {record.targetId}
          </Typography.Link>
        );
      },
    },
    {
      title: '补充说明',
      dataIndex: 'description',
      hideInSearch: true,
      ellipsis: true,
      width: 160,
    },
    {
      title: '聊天内容',
      dataIndex: 'chatMessage',
      hideInSearch: true,
      ellipsis: true,
      width: 180,
      render: (_, record) => {
        if (record.reportType !== 1) return '-';
        return getChatMessageContent(record) || '-';
      },
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      valueEnum: REPORT_STATUS_ENUM,
      render: (_, record) => {
        const statusConfig = REPORT_STATUS_ENUM[record.status as 0];
        return (
          <Tag
            color={
              record.status === 0 ? 'orange' : record.status === 1 ? 'green' : 'default'
            }
          >
            {record.statusText || statusConfig?.text}
          </Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      sorter: true,
      hideInSearch: true,
      width: 170,
    },
    {
      title: '处理时间',
      dataIndex: 'handleTime',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 170,
    },
    {
      title: '处理备注',
      dataIndex: 'handleRemark',
      hideInSearch: true,
      ellipsis: true,
      width: 140,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => {
        const targetUserId = getTargetUserId(record);
        return (
          <Space size="middle">
            <Typography.Link
              onClick={() => {
                setCurrentRow(record);
                setHandleModalVisible(true);
              }}
            >
              {record.status === 0 ? '处理' : '详情'}
            </Typography.Link>
            {targetUserId && (
              <Typography.Link
                type="danger"
                onClick={() => {
                  setMuteTarget({
                    userId: targetUserId,
                    userName: record.targetUser?.userName,
                  });
                  setMuteModalVisible(true);
                }}
              >
                禁言
              </Typography.Link>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <ProTable<API.ReportVO>
        headerTitle="举报管理"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
          defaultCollapsed: false,
        }}
        scroll={{ x: 1400 }}
        request={async (params, sort) => {
          const sortField = Object.keys(sort)?.[0];
          const sortOrder = sort?.[sortField] ?? undefined;
          const { data, code } = await listReportPageUsingGet({
            current: params.current,
            pageSize: params.pageSize,
            reportType: params.reportType,
            reporterId: params.reporterId,
            targetUserId: params.targetUserId,
            status: params.status,
            sortField,
            sortOrder,
          });

          return {
            success: code === 0,
            data: data?.records || [],
            total: Number(data?.total) || 0,
          };
        }}
        columns={columns}
      />
      <HandleModal
        visible={handleModalVisible}
        report={currentRow}
        onSubmit={() => {
          setHandleModalVisible(false);
          setCurrentRow(undefined);
          actionRef.current?.reload();
        }}
        onCancel={() => {
          setHandleModalVisible(false);
          setCurrentRow(undefined);
        }}
      />
      <MuteUserModal
        open={muteModalVisible}
        userId={muteTarget?.userId}
        userName={muteTarget?.userName}
        onCancel={() => {
          setMuteModalVisible(false);
          setMuteTarget(undefined);
        }}
      />
    </PageContainer>
  );
};

export default ReportAdminPage;
