import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Card,
  Table,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Tooltip,
  Tag,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  FundOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import {
  addFundUsingPost,
  deleteFundUsingPost,
  editFundUsingPost,
  getFundListUsingGet,
  updateFundUsingPost,
} from '@/services/backend/fundController';
import './index.less';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 安全解析数值（接口可能返回字符串或带 % 的文本） */
const parseFundNumber = (value: string | number | null | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(String(value).replace(/%/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDecimal = (
  value: string | number | null | undefined,
  digits: number,
  fallback = '-',
): string => {
  const n = parseFundNumber(value);
  return n === null ? fallback : n.toFixed(digits);
};

const FundHub: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fundList, setFundList] = useState<API.FundItemVO[]>([]);
  const [statistics, setStatistics] = useState<{
    totalMarketValue?: number;
    totalDayProfit?: number;
    todayUpCount?: number;
    todayDownCount?: number;
  }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFund, setEditingFund] = useState<API.FundItemVO | null>(null);
  const [hideAmount, setHideAmount] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [form] = Form.useForm();

  // 加载基金列表
  const loadFundList = async () => {
    setLoading(true);
    try {
      const response = await getFundListUsingGet();
      if (response.code === 0 && response.data) {
        setFundList(response.data.fundList || []);
        setStatistics({
          totalMarketValue: response.data.totalMarketValue,
          totalDayProfit: response.data.totalDayProfit,
          todayUpCount: response.data.todayUpCount,
          todayDownCount: response.data.todayDownCount,
        });
        // 更新最后更新时间
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        setLastUpdateTime(timeStr);
      } else {
        message.error(response.message || '加载基金列表失败');
      }
    } catch (error) {
      message.error('加载基金列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadFundList();
  }, []);

  // 打开添加/编辑弹窗
  const handleOpenModal = (fund?: API.FundItemVO) => {
    if (fund) {
      setEditingFund(fund);
      form.setFieldsValue({
        code: fund.code,
        amount: fund.marketValue,
        profit: fund.totalProfit,
      });
    } else {
      setEditingFund(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingFund(null);
    form.resetFields();
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingFund) {
        // 编辑基金
        const response = await editFundUsingPost({
          code: values.code,
          amount: values.amount,
          profit: values.profit,
        });
        
        if (response.code === 0) {
          message.success('编辑成功');
          handleCloseModal();
          loadFundList();
        } else {
          message.error(response.message || '编辑失败');
        }
      } else {
        // 添加基金
        const response = await addFundUsingPost({
          code: values.code,
          amount: values.amount,
          profit: values.profit,
        });
        
        if (response.code === 0) {
          message.success('添加成功');
          handleCloseModal();
          loadFundList();
        } else {
          message.error(response.message || '添加失败');
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 删除基金
  const handleDelete = (code: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个基金吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await deleteFundUsingPost({ code });
          if (response.code === 0) {
            message.success('删除成功');
            loadFundList();
          } else {
            message.error(response.message || '删除失败');
          }
        } catch (error) {
          message.error('删除失败');
          console.error(error);
        }
      },
    });
  };

  // 表格列定义
  const columns = [
    {
      title: '基金代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '持有份额',
      dataIndex: 'shares',
      key: 'shares',
      width: 120,
      align: 'right' as const,
      render: (shares: number) => hideAmount ? '••••' : formatDecimal(shares, 2),
    },
    {
      title: '成本价',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      align: 'right' as const,
      render: (cost: number) => hideAmount ? '¥••••' : `¥${formatDecimal(cost, 4)}`,
    },
    {
      title: '当前净值',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      width: 100,
      align: 'right' as const,
      render: (price: number) => hideAmount ? '¥••••' : `¥${formatDecimal(price, 4)}`,
    },
    {
      title: '涨跌幅',
      dataIndex: 'changePercent',
      key: 'changePercent',
      width: 100,
      align: 'right' as const,
      render: (percent: number) => {
        const n = parseFundNumber(percent);
        if (n === null) return '-';
        const color = n >= 0 ? '#cf1322' : '#3f8600';
        const icon = n >= 0 ? <RiseOutlined /> : <FallOutlined />;
        return (
          <Text style={{ color }}>
            {icon} {n.toFixed(2)}%
          </Text>
        );
      },
    },
    {
      title: '持有市值',
      dataIndex: 'marketValue',
      key: 'marketValue',
      width: 120,
      align: 'right' as const,
      render: (value: number) => hideAmount ? '¥••••' : `¥${formatDecimal(value, 2)}`,
    },
    {
      title: '今日盈亏',
      dataIndex: 'dayProfit',
      key: 'dayProfit',
      width: 120,
      align: 'right' as const,
      render: (profit: number) => {
        if (hideAmount) return '¥••••';
        const n = parseFundNumber(profit);
        if (n === null) return '-';
        const color = n >= 0 ? '#cf1322' : '#3f8600';
        return (
          <Text style={{ color, fontWeight: 'bold' }}>
            {n >= 0 ? '+' : ''}¥{n.toFixed(2)}
          </Text>
        );
      },
    },
    {
      title: '累计盈亏',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      width: 120,
      align: 'right' as const,
      render: (profit: number) => {
        if (hideAmount) return '¥••••';
        const n = parseFundNumber(profit);
        if (n === null) return '-';
        const color = n >= 0 ? '#cf1322' : '#3f8600';
        return (
          <Text style={{ color, fontWeight: 'bold' }}>
            {n >= 0 ? '+' : ''}¥{n.toFixed(2)}
          </Text>
        );
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: API.FundItemVO) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.code!)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Layout className="fund-hub-container">
      <Header className="fund-hub-header">
        <div className="header-left">
          <FundOutlined className="header-icon" />
          <Title level={4} className="header-title">
            基金估值
          </Title>
          <Tooltip title={hideAmount ? '显示金额' : '隐藏金额'}>
            <Button
              type="text"
              icon={hideAmount ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setHideAmount(!hideAmount)}
              style={{ marginLeft: 12 }}
            />
          </Tooltip>
        </div>
        <div className="header-right">
          <Space>
            {lastUpdateTime && (
              <Text type="secondary" style={{ fontSize: '14px' }}>
                更新于 {lastUpdateTime}
              </Text>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={loadFundList}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              添加基金
            </Button>
          </Space>
        </div>
      </Header>

      <Content className="fund-hub-content">
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总市值"
                value={hideAmount ? 0 : (parseFundNumber(statistics.totalMarketValue) ?? 0)}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#1890ff' }}
                suffix={<DollarOutlined />}
                formatter={(value) => hideAmount ? '••••' : value}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="今日盈亏"
                value={hideAmount ? 0 : (parseFundNumber(statistics.totalDayProfit) ?? 0)}
                precision={2}
                prefix={hideAmount ? '' : ((parseFundNumber(statistics.totalDayProfit) ?? 0) >= 0 ? '+¥' : '¥')}
                valueStyle={{
                  color:
                    (parseFundNumber(statistics.totalDayProfit) ?? 0) >= 0
                      ? '#cf1322'
                      : '#3f8600',
                }}
                suffix={
                  hideAmount ? null : (
                    (parseFundNumber(statistics.totalDayProfit) ?? 0) >= 0 ? (
                      <RiseOutlined />
                    ) : (
                      <FallOutlined />
                    )
                  )
                }
                formatter={(value) => hideAmount ? '••••' : value}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="今日上涨"
                value={statistics.todayUpCount || 0}
                suffix="只"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="今日下跌"
                value={statistics.todayDownCount || 0}
                suffix="只"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 基金列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={fundList}
            rowKey="code"
            loading={loading}
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 只基金`,
            }}
          />
        </Card>
      </Content>

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingFund ? '编辑基金' : '添加基金'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="基金代码"
            name="code"
            rules={[{ required: true, message: '请输入基金代码' }]}
            extra="6位数字基金代码，例如：000001"
          >
            <Input placeholder="例如：000001" disabled={!!editingFund} />
          </Form.Item>
          <Form.Item
            label="持有金额"
            name="amount"
            rules={[{ required: true, message: '请输入持有金额' }]}
            extra="当前持有的基金总金额（市值）"
          >
            <InputNumber
              placeholder="请输入持有金额"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
          <Form.Item
            label="盈亏金额"
            name="profit"
            rules={[{ required: true, message: '请输入盈亏金额' }]}
            extra="正数为盈利，负数为亏损"
          >
            <InputNumber
              placeholder="请输入盈亏金额"
              style={{ width: '100%' }}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default FundHub;
