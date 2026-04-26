import CreateModal from '@/pages/Admin/ItemTemplates/components/CreateModal';
import UpdateModal from '@/pages/Admin/ItemTemplates/components/UpdateModal';
import MainAttrEditor from '@/pages/Admin/ItemTemplates/components/MainAttrEditor';
import {
  deleteItemTemplateUsingPost,
  listItemTemplatesVoByPageUsingPost,
} from '@/services/backend/itemTemplatesController';
import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import '@umijs/max';
import { Button, message, Popconfirm, Select, Space, Typography } from 'antd';
import React, { useRef, useState } from 'react';

/**
 * 游戏装备管理页面
 *
 * @constructor
 */
const ItemTemplatesAdminPage: React.FC = () => {
  // 是否显示新建窗口
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  // 是否显示更新窗口
  const [updateModalVisible, setUpdateModalVisible] = useState<boolean>(false);
  const actionRef = useRef<ActionType>();
  // 当前物品点击的数据
  const [currentRow, setCurrentRow] = useState<API.ItemTemplateVO>();

  /**
   * 删除节点
   *
   * @param row
   */
  const handleDelete = async (row: API.ItemTemplateVO) => {
    const hide = message.loading('正在删除');
    if (!row) return true;
    try {
      await deleteItemTemplateUsingPost({
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
  const columns: ProColumns<API.ItemTemplateVO>[] = [
    {
      title: 'id',
      dataIndex: 'id',
      valueType: 'text',
      hideInForm: true,
      hideInTable: true,
    },
    {
      title: '物品名称',
      dataIndex: 'name',
      valueType: 'text',
    },
    {
      title: '模板唯一码',
      dataIndex: 'code',
      valueType: 'text',
      hideInTable: true,
      // 支持精确匹配搜索
    },
    {
      title: '物品大类',
      dataIndex: 'category',
      valueType: 'text',
      valueEnum: {
        equipment: { text: '装备类' },
        consumable: { text: '消耗品' },
        material: { text: '材料' },
      },
      renderFormItem: () => (
        <Select placeholder="选择物品大类">
          <Select.Option value="equipment">装备类</Select.Option>
          <Select.Option value="consumable">消耗品</Select.Option>
          <Select.Option value="material">材料</Select.Option>
        </Select>
      ),
    },
    {
      title: '物品子类型',
      dataIndex: 'subType',
      valueType: 'text',
      valueEnum: {
        weapon: { text: '武器' },
        head: { text: '头盔' },
        foot: { text: '鞋子' },
        hand: { text: '手套' },
      },
      renderFormItem: () => (
        <Select placeholder="选择物品子类型" allowClear>
          <Select.Option value="weapon">武器</Select.Option>
          <Select.Option value="head">头盔</Select.Option>
          <Select.Option value="foot">鞋子</Select.Option>
          <Select.Option value="hand">手套</Select.Option>
        </Select>
      ),
      render: (text) => {
        const typeMap: Record<string, string> = {
          weapon: '武器',
          head: '头盔',
          foot: '鞋子',
          hand: '手套',
        };
        return typeMap[text as string] || text;
      },
    },
    {
      title: '可穿戴槽位',
      dataIndex: 'equipSlot',
      valueType: 'text',
      valueEnum: {
        head: { text: '头部' },
        hand: { text: '手部' },
        foot: { text: '脚部' },
        weapon: { text: '武器' },
      },
      renderFormItem: () => (
        <Select placeholder="选择槽位" allowClear>
          <Select.Option value="head">头部</Select.Option>
          <Select.Option value="hand">手部</Select.Option>
          <Select.Option value="foot">脚部</Select.Option>
          <Select.Option value="weapon">武器</Select.Option>
        </Select>
      ),
      render: (text) => {
        if (!text) return '无法穿戴';
        const slotMap: Record<string, string> = {
          head: '头部',
          hand: '手部',
          foot: '脚部',
          weapon: '武器',
        };
        return slotMap[text as string] || text;
      },
    },
    {
      title: '物品图标',
      dataIndex: 'icon',
      valueType: 'image',
      fieldProps: {
        width: 64,
      },
      hideInSearch: true,
    },
    {
      title: '稀有度',
      dataIndex: 'rarity',
      valueType: 'select',
      valueEnum: {
        1: { text: '普通' },
        2: { text: '优良' },
        3: { text: '精良' },
        4: { text: '史诗' },
        5: { text: '传说' },
        6: { text: '神话' },
        7: { text: '至尊' },
        8: { text: '神器' },
      },
      renderFormItem: () => (
        <Select placeholder="选择稀有度" allowClear>
          <Select.Option value={1}>普通</Select.Option>
          <Select.Option value={2}>优良</Select.Option>
          <Select.Option value={3}>精良</Select.Option>
          <Select.Option value={4}>史诗</Select.Option>
          <Select.Option value={5}>传说</Select.Option>
          <Select.Option value={6}>神话</Select.Option>
          <Select.Option value={7}>至尊</Select.Option>
          <Select.Option value={8}>神器</Select.Option>
        </Select>
      ),
      render: (text) => {
        if (!text) return '-';
        const rarityMap: Record<number, { text: string; color: string }> = {
          1: { text: '普通', color: '#666666' },
          2: { text: '优良', color: '#52c41a' },
          3: { text: '精良', color: '#1890ff' },
          4: { text: '史诗', color: '#722ed1' },
          5: { text: '传说', color: '#fa8c16' },
          6: { text: '神话', color: '#ff4d4f' },
          7: { text: '至尊', color: '#eb2f96' },
          8: { text: '神器', color: '#fadb14' },
        };
        const rarity = rarityMap[Number(text)];
        if (!rarity) return text;
        return <span style={{ color: rarity.color, fontWeight: 'bold' }}>{rarity.text}</span>;
      },
    },
    {
      title: '基础攻击力',
      dataIndex: 'baseAttack',
      valueType: 'digit',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '基础防御力',
      dataIndex: 'baseDefense',
      valueType: 'digit',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '基础生命值',
      dataIndex: 'baseHp',
      valueType: 'digit',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '基础速度',
      dataIndex: 'baseSpeed',
      valueType: 'digit',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '使用等级需求',
      dataIndex: 'levelReq',
      valueType: 'digit',
      hideInTable: true,
    },
    {
      title: '是否可叠加',
      dataIndex: 'stackable',
      valueType: 'select',
      valueEnum: {
        0: { text: '不可叠加' },
        1: { text: '可叠加' },
      },
      hideInTable: true,
      renderFormItem: () => (
        <Select placeholder="选择是否可叠加" allowClear>
          <Select.Option value={0}>不可叠加</Select.Option>
          <Select.Option value={1}>可叠加</Select.Option>
        </Select>
      ),
    },
    {
      title: '分解积分',
      dataIndex: 'removePoint',
      valueType: 'digit',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '物品描述',
      dataIndex: 'description',
      valueType: 'textarea',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '装备属性',
      dataIndex: 'mainAttr',
      valueType: 'text',
      hideInSearch: true,
      hideInTable: true,
      tooltip: '可视化编辑装备属性，支持暴击、连击、闪避、格挡、吸血等主动属性和对应的抗性属性',
      renderFormItem: (schema, config, form) => {
        // 如果 value 是对象，直接传递；如果是字符串，也直接传递（MainAttrEditor 会处理）
        const editorValue = config.value;
        return (
          <MainAttrEditor
            value={editorValue}
            onChange={(value) => {
              form?.setFieldsValue({ mainAttr: value });
            }}
          />
        );
      },
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
            title="确定要删除该物品模板吗？"
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
      <ProTable<API.ItemTemplateVO>
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
            <PlusOutlined /> 新建
          </Button>,
        ]}
        request={async (params, sort, filter) => {
          const sortField = Object.keys(sort)?.[0];
          const sortOrder = sort?.[sortField] ?? undefined;
          const { data, code } = await listItemTemplatesVoByPageUsingPost({
            ...params,
            sortField,
            sortOrder,
            ...filter,
          } as API.ItemTemplateQueryRequest);

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
export default ItemTemplatesAdminPage;

