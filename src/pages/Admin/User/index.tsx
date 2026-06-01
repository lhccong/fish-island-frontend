import CreateModal from '@/pages/Admin/User/components/CreateModal';
import UpdateModal from '@/pages/Admin/User/components/UpdateModal';
import {markScriptUserUsingPost} from '@/services/backend/redPacketController';
import {deleteUserUsingPost, listUserByPageUsingPost} from '@/services/backend/userController';
import {PlusOutlined} from '@ant-design/icons';
import type {ActionType, ProColumns} from '@ant-design/pro-components';
import {PageContainer, ProTable} from '@ant-design/pro-components';
import '@umijs/max';
import {Button, message, Popconfirm, Space, Typography} from 'antd';
import React, {useEffect, useRef, useState} from 'react';
import {useLocation} from "@umijs/max";
import moment from "moment";
import TitleModal from "@/pages/Admin/User/Title/components/TitleModal";

/**
 * 用户管理页面
 *
 * @constructor
 */
const UserAdminPage: React.FC = () => {
  // 是否显示新建窗口
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  // 是否显示更新窗口
  const [updateModalVisible, setUpdateModalVisible] = useState<boolean>(false);
  // 是否显示查看称号窗口
  const [titleModalVisible, setTitleModalVisible] = useState<boolean>(false);

  const actionRef = useRef<ActionType>();
  // 当前用户点击的数据
  const [currentRow, setCurrentRow] = useState<API.User>();
  const location = useLocation();
  const [createTimeRange, setCreateTimeRange] = useState<string[]>([]);
  const [updateTimeRange, setUpdateTimeRange]=  useState<string[]>([]);

  useEffect(() => {
    const queryParams = location.search;
    // 解析查询参数，取出等号后面字符串
    if  (!queryParams) return;
    const parts = queryParams.split('=');
    const value = parts[1];
    const today = moment().format('YYYY-MM-DD');
    const monthStart = moment().startOf('month').format('YYYY-MM-DD');
    const monthEnd = moment().endOf('month').format('YYYY-MM-DD');
    switch (value) {
      case '1':
        setCreateTimeRange([today, today])
        break;
      case '2':
        setUpdateTimeRange([today, today])
        break;
      case '3':
        setUpdateTimeRange([monthStart, monthEnd])
        break;
    }
  }, [location.search]);


  /**
   * 标记/取消标记抢红包脚本用户
   */
  const handleMarkScriptUser = async (row: API.User, mark: boolean) => {
    if (!row.id) return false;
    const hide = message.loading(mark ? '正在封禁' : '正在解禁');
    try {
      const { code, message: msg } = await markScriptUserUsingPost({
        userId: row.id,
        mark,
      });
      hide();
      if (code === 0) {
        message.success(mark ? '已封禁抢红包脚本' : '已解禁抢红包脚本');
        return true;
      }
      message.error((mark ? '封禁失败，' : '解禁失败，') + (msg || '未知错误'));
      return false;
    } catch (error: any) {
      hide();
      message.error((mark ? '封禁失败，' : '解禁失败，') + error.message);
      return false;
    }
  };

  /**
   * 删除节点
   *
   * @param row
   */
  const handleDelete = async (row: API.User) => {
    const hide = message.loading('正在删除');
    if (!row) return true;
    try {
      await deleteUserUsingPost({
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
  const columns: ProColumns<API.User>[] = [
    {
      title: 'id',
      dataIndex: 'id',
      valueType: 'text',
      hideInForm: true,
    },
    {
      title: '账号',
      dataIndex: 'userAccount',
      valueType: 'text',
    },
    {
      title: '用户名',
      dataIndex: 'userName',
      valueType: 'text',
    },
    {
      title: '头像',
      dataIndex: 'userAvatar',
      valueType: 'image',
      fieldProps: {
        width: 64,
      },
      hideInSearch: true,
    },
    {
      title: '简介',
      dataIndex: 'userProfile',
      valueType: 'textarea',
    },
    {
      title: '权限',
      dataIndex: 'userRole',
      valueEnum: {
        user: {
          text: '用户',
        },
        admin: {
          text: '管理员',
        },
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createTimeRange',
      valueType: 'dateRange',
      hideInTable: true,
      hideInForm: true,
      fieldProps: {
        value: createTimeRange?.map(date => moment(date)),
        onChange: (dates:  [moment.Moment, moment.Moment]) => {
          if (dates) {
            const [start, end] = dates.map(date => date.format('YYYY-MM-DD'));
            setCreateTimeRange([start, end]);
            // 手动触发刷新
            setTimeout(() => actionRef.current?.reload(), 0);
          }
        },
      },
    },
    {
      title: '注册时间',
      sorter: true,
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
      hideInForm: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTimeRange',
      valueType: 'dateRange',
      hideInTable: true,
      hideInForm: true,
      fieldProps: {
        value: updateTimeRange?.map(date => moment(date)),
        onChange: (dates:  [moment.Moment, moment.Moment]) => {
          if (dates) {
            const [start, end] = dates.map(date => date.format('YYYY-MM-DD'));
            setUpdateTimeRange([start, end]);
            // 手动触发刷新
            setTimeout(() => actionRef.current?.reload(), 0);
          }
        },
      }
    },
    {
      title: '更新时间',
      sorter: true,
      dataIndex: 'updateTime',
      valueType: 'dateTime',
      hideInSearch: true,
      hideInForm: true,
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
          <Typography.Link
            onClick={() => {
              setCurrentRow(record);
              setTitleModalVisible(true);
            }}
          >
            查看称号
          </Typography.Link>
          <Popconfirm
            title={`确定封禁用户「${record.userName || record.userAccount}」的抢红包脚本吗？`}
            onConfirm={() => handleMarkScriptUser(record, true)}
            okText="确定"
            cancelText="取消"
          >
            <Typography.Link type="danger">封禁脚本</Typography.Link>
          </Popconfirm>
          <Popconfirm
            title={`确定解禁用户「${record.userName || record.userAccount}」的抢红包脚本吗？`}
            onConfirm={() => handleMarkScriptUser(record, false)}
            okText="确定"
            cancelText="取消"
          >
            <Typography.Link>解禁脚本</Typography.Link>
          </Popconfirm>
          <Popconfirm
            title="确定要删除该用户吗？"
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
      <ProTable<API.User>
        headerTitle={'查询表格'}
        actionRef={actionRef}
        rowKey="key"
        search={{
          labelWidth: 120,
          defaultCollapsed: false,
        }}
        onReset={() => {
          setCreateTimeRange([]);
          setUpdateTimeRange([]);
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
          if (createTimeRange){
            params.createTimeRange = createTimeRange;
          }
          if (updateTimeRange){
            params.updateTimeRange = updateTimeRange;
          }
          const { data, code } = await listUserByPageUsingPost({
            ...params,
            sortField,
            sortOrder,
            ...filter,
          } as API.UserQueryRequest);

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
      <TitleModal
        visible={titleModalVisible}
        currentUser={currentRow}
        onClose={() => {
          setTitleModalVisible(false);
        }}
      />
    </PageContainer>
  );
};
export default UserAdminPage;
