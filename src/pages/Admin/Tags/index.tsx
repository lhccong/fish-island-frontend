import CreateModal from '@/pages/Admin/Tags/components/CreateModal';
import UpdateModal from '@/pages/Admin/Tags/components/UpdateModal';
import {deleteTagsUsingPost, listTagsVoByPageUsingPost} from '@/services/backend/tagsController';
import {PlusOutlined} from '@ant-design/icons';
import type {ActionType, ProColumns} from '@ant-design/pro-components';
import {PageContainer, ProTable} from '@ant-design/pro-components';
import '@umijs/max';
import {Tag, Select, Button, message, Popconfirm, Space, Typography} from 'antd';
import React, {useRef, useState} from 'react';

/**
 * 标签管理页面
 *
 * @constructor
 */
const TagsAdminPage: React.FC = () => {
  // 是否显示新建窗口
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  // 是否显示更新窗口
  const [updateModalVisible, setUpdateModalVisible] = useState<boolean>(false);
  const actionRef = useRef<ActionType>();
  // 当前标签点击的数据
  const [currentRow, setCurrentRow] = useState<API.TagsVO>();

  // 定义 Ant Design 内置颜色
  const TAG_COLORS = [
    'magenta', 'red', 'volcano', 'orange', 'gold',
    'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'
  ];

  /**
   * 删除节点
   *
   * @param row
   */
  const handleDelete = async (row: API.TagsVO) => {
    const hide = message.loading('正在删除');
    if (!row) return true;
    try {
      await deleteTagsUsingPost({
        id: row.id as any,
      });
      hide();
      message.success('删除成功');
      actionRef?.current?.reload();
      return true;
    } catch (error: any) {
      hide();
      message.error('删除失败，' + error.message);
      return false;
    }
  };

  /**
   * 表格列配置
   */
  const columns: ProColumns<API.TagsVO>[] = [
    {
      title: 'id',
      dataIndex: 'id',
      valueType: 'text',
      hideInForm: true,
    },
    {
      title: '标签名称',
      dataIndex: 'tagsName',
      valueType: 'text',
    },
    {
      title: '颜色',
      dataIndex: 'color',
      valueType: 'text',
      hideInSearch: true,
      renderFormItem: () => (
        <Select placeholder="选择标签颜色">
          {TAG_COLORS.map(color => (
            <Select.Option key={color} value={color}>
              <Tag color={color}>{color}</Tag>
            </Select.Option>
          ))}
        </Select>
      ),
      render: (text) => (
        <Tag color={text as string}>{text}</Tag>
      )
    },
    {
      title: '图标',
      dataIndex: 'icon',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueEnum: {
        0: {text: '官方创建'},
        1: {text: '用户自定义'},
      },
    },
    {
      title: '排序',
      dataIndex: 'sort',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => (
        <Space size="middle">
          <Typography.Link
            onClick={() => {
              setCurrentRow(record);
              setUpdateModalVisible(true);
            }}
          >
            修改
          </Typography.Link>
          <Popconfirm
            title="确定要删除该标签吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Typography.Link type="danger">删除</Typography.Link>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  return (
    <PageContainer>
      <ProTable<API.TagsVO>
        headerTitle={'查询表格'}
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              setCreateModalVisible(true);
            }}
          >
            <PlusOutlined/> 新建
          </Button>,
        ]}
        request={async (params, sort, filter) => {
          const sortField = Object.keys(sort)?.[0];
          const sortOrder = sort?.[sortField] ?? undefined;
          const {data, code} = await listTagsVoByPageUsingPost({
            ...params,
            sortField,
            sortOrder,
            ...filter,
          } as API.TagsQueryRequest);

          return {
            success: code === 0,
            data: data?.records || [],
            total: Number(data?.total) || 0,
          };
        }}
        columns={columns}
      />
      <CreateModal
        visible={createModalVisible}
        columns={columns}
        onSubmit={() => {
          setCreateModalVisible(false);
          actionRef.current?.reload();
        }}
        onCancel={() => {
          setCreateModalVisible(false);
        }}
      />
      <UpdateModal
        visible={updateModalVisible}
        columns={columns}
        oldData={currentRow}
        onSubmit={() => {
          setUpdateModalVisible(false);
          setCurrentRow(undefined);
          actionRef.current?.reload();
        }}
        onCancel={() => {
          setUpdateModalVisible(false);
        }}
      />
    </PageContainer>
  );
};
export default TagsAdminPage;
