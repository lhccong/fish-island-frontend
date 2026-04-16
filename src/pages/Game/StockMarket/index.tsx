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
  Tag,
  Tabs,
  List,
  Badge,
  Empty,
  Spin,
  Tooltip,
} from 'antd';
import {
  LineChartOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  WalletOutlined,
  HistoryOutlined,
  ShoppingCartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  buyIndexUsingPost,
  sellIndexUsingPost,
  getPositionUsingGet,
  getTransactionsUsingPost,
} from '@/services/backend/indexTradeController';
import { getMajorIndicesUsingGet } from '@/services/backend/fundController';
import './index.less';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// 辅助函数：安全解析数值（处理可能包含%符号的字符串）
const parseNumericValue = (value: string | number | undefined): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  // 移除 % 符号并转换为数字
  const cleaned = String(value).replace(/%/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const StockMarket: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [marketIndices, setMarketIndices] = useState<API.MarketIndexVO[]>([]);
  const [positions, setPositions] = useState<API.IndexPositionVO[]>([]);
  const [transactions, setTransactions] = useState<API.IndexTransactionVO[]>([]);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [selectedIndex, setSelectedIndex] = useState<API.MarketIndexVO | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<API.IndexPositionVO | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('market');
  const [refreshing, setRefreshing] = useState(false);

  // 加载市场指数
  const loadMarketIndices = async () => {
    try {
      const response = await getMajorIndicesUsingGet();
      if (response.code === 0 && response.data) {
        setMarketIndices(response.data);
      }
    } catch (error) {
      console.error('加载市场指数失败:', error);
    }
  };

  // 加载持仓
  const loadPositions = async () => {
    try {
      const response = await getPositionUsingGet();
      if (response.code === 0 && response.data) {
        // API may return single position or array of positions
        const data = response.data;
        if (Array.isArray(data)) {
          setPositions(data);
        } else if (data.indexCode) {
          setPositions([data]);
        } else {
          setPositions([]);
        }
      }
    } catch (error) {
      console.error('加载持仓失败:', error);
    }
  };

  // 加载交易记录
  const loadTransactions = async (page = 1) => {
    try {
      const response = await getTransactionsUsingPost({
        current: page,
        pageSize: 10,
      });
      if (response.code === 0 && response.data) {
        setTransactions(response.data.records || []);
        setTransactionTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载交易记录失败:', error);
    }
  };

  // 刷新所有数据
  const refreshData = async () => {
    setRefreshing(true);
    setLoading(true);
    await Promise.all([
      loadMarketIndices(),
      loadPositions(),
      loadTransactions(transactionPage),
    ]);
    setLoading(false);
    setRefreshing(false);
    message.success('刷新成功');
  };

  // 初始加载
  useEffect(() => {
    refreshData();
  }, []);

  // 打开交易弹窗
  const handleOpenTradeModal = (type: 'buy' | 'sell', index?: API.MarketIndexVO, position?: API.IndexPositionVO) => {
    setTradeType(type);
    setSelectedIndex(index || null);
    setSelectedPosition(position || null);

    if (type === 'buy' && index) {
      form.setFieldsValue({
        indexCode: index.indexCode,
        indexName: index.indexName,
      });
    } else if (type === 'sell' && position) {
      form.setFieldsValue({
        indexCode: position.indexCode,
        indexName: position.indexName,
        maxShares: position.availableShares,
      });
    }

    setTradeModalVisible(true);
  };

  // 关闭交易弹窗
  const handleCloseTradeModal = () => {
    setTradeModalVisible(false);
    setSelectedIndex(null);
    setSelectedPosition(null);
    form.resetFields();
  };

  // 提交交易
  const handleTradeSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (tradeType === 'buy') {
        const response = await buyIndexUsingPost({
          indexCode: values.indexCode,
          amount: values.amount,
        });

        if (response.code === 0) {
          message.success(`买入成功！成交份额: ${Number(response.data?.shares || 0).toFixed(2)}`);
          handleCloseTradeModal();
          refreshData();
        } else {
          message.error(response.message || '买入失败');
        }
      } else {
        const response = await sellIndexUsingPost({
          indexCode: values.indexCode,
          shares: values.shares,
        });

        if (response.code === 0) {
          message.success(`卖出成功！`);
          handleCloseTradeModal();
          refreshData();
        } else {
          message.error(response.message || '卖出失败');
        }
      }
    } catch (error) {
      console.error('交易失败:', error);
    }
  };

  // 计算总市值和盈亏
  const calculateStats = () => {
    let totalMarketValue = 0;
    let totalProfit = 0;
    let dayProfit = 0;

    positions.forEach(pos => {
      totalMarketValue += Number(pos.marketValue) || 0;
      totalProfit += Number(pos.totalProfit) || 0;
      // 估算今日盈亏
      const prevValue = (Number(pos.totalShares) || 0) * ((Number(pos.currentNav) || 0) / (1 + (Number(pos.changePercent) || 0) / 100));
      dayProfit += (Number(pos.marketValue) || 0) - prevValue;
    });

    return { totalMarketValue, totalProfit, dayProfit };
  };

  const stats = calculateStats();

  // 交易记录列定义
  const transactionColumns = [
    {
      title: '交易时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
    },
    {
      title: '指数名称',
      dataIndex: 'indexName',
      key: 'indexName',
      width: 150,
    },
    {
      title: '交易类型',
      dataIndex: 'tradeType',
      key: 'tradeType',
      width: 100,
      render: (type: number) => (
        <Tag color={type === 1 ? 'red' : 'green'}>
          {type === 1 ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '成交份额',
      dataIndex: 'shares',
      key: 'shares',
      width: 120,
      align: 'right' as const,
      render: (shares: number) => Number(shares || 0).toFixed(2),
    },
    {
      title: '成交净值',
      dataIndex: 'nav',
      key: 'nav',
      width: 120,
      align: 'right' as const,
      render: (nav: number) => `¥${Number(nav || 0).toFixed(4)}`,
    },
    {
      title: '交易金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number, record: API.IndexTransactionVO) => (
        <Text style={{ color: record.tradeType === 1 ? '#cf1322' : '#3f8600' }}>
          {record.tradeType === 1 ? '-' : '+'}¥{Number(amount || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: API.IndexTransactionVO) => (
        <Tag color={status === 1 ? 'success' : 'processing'}>
          {record.statusName}
        </Tag>
      ),
    },
    {
      title: '盈亏',
      dataIndex: 'profitLoss',
      key: 'profitLoss',
      width: 120,
      align: 'right' as const,
      render: (profit: number) => {
        if (profit === undefined || profit === null) return '-';
        return (
          <Text style={{ color: profit >= 0 ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}>
            {Number(profit || 0) >= 0 ? '+' : ''}¥{Number(profit || 0).toFixed(2)}
          </Text>
        );
      },
    },
  ];

  return (
    <Layout className="stock-market-container">
      <Header className="stock-market-header">
        <div className="header-left">
          <LineChartOutlined className="header-icon" />
          <Title level={4} className="header-title">
            摸鱼股市
          </Title>
          <Tooltip title="使用积分交易A股主要指数">
            <InfoCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
          </Tooltip>
        </div>
        <div className="header-right">
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={refreshData}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      </Header>

      <Content className="stock-market-content">
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="总积分"
                value={stats.totalMarketValue}
                precision={2}
                suffix="积分"
                valueStyle={{ color: '#1890ff' }}
                formatter={(value) => Number(value || 0).toFixed(2)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="今日盈亏"
                value={stats.dayProfit}
                precision={2}
                suffix={stats.dayProfit >= 0 ? '积分' : '积分'}
                valueStyle={{ color: stats.dayProfit >= 0 ? '#cf1322' : '#3f8600' }}
                formatter={(value) => (Number(value || 0) >= 0 ? '+' : '') + Number(value || 0).toFixed(2)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="累计盈亏"
                value={stats.totalProfit}
                precision={2}
                suffix="积分"
                valueStyle={{ color: stats.totalProfit >= 0 ? '#cf1322' : '#3f8600' }}
                formatter={(value) => (Number(value || 0) >= 0 ? '+' : '') + Number(value || 0).toFixed(2)}
              />
            </Card>
          </Col>
        </Row>

        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
          {/* 市场行情 */}
          <TabPane
            tab={<span><LineChartOutlined />市场行情</span>}
            key="market"
          >
            <Row gutter={[16, 16]}>
              {marketIndices.map((index) => (
                <Col xs={24} sm={12} lg={8} key={index.indexCode}>
                  <Card
                    className="index-card"
                    hoverable
                    actions={[
                      <Button
                        type="primary"
                        icon={<ShoppingCartOutlined />}
                        disabled={index.indexCode !== 'sh000001'}
                        onClick={() => handleOpenTradeModal('buy', index)}
                      >
                        买入
                      </Button>,
                    ]}
                  >
                    <div className="index-header">
                      <div className="index-name">{index.indexName}</div>
                      <div className="index-code">{index.indexCode}</div>
                    </div>
                    <div className="index-value">
                      <Text className="current-value" style={{
                        color: parseNumericValue(index.changeValue) >= 0 ? '#cf1322' : '#3f8600'
                      }}>
                        {parseNumericValue(index.currentValue).toFixed(2)}
                      </Text>
                      <div className="change-info">
                        <Tag color={parseNumericValue(index.changeValue) >= 0 ? 'red' : 'green'}>
                          {parseNumericValue(index.changeValue) >= 0 ? '+' : ''}{parseNumericValue(index.changeValue).toFixed(2)}
                        </Tag>
                        <Tag color={parseNumericValue(index.changePercent) >= 0 ? 'red' : 'green'}>
                          {parseNumericValue(index.changePercent) >= 0 ? '+' : ''}{parseNumericValue(index.changePercent).toFixed(2)}%
                        </Tag>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>

          {/* 我的持仓 */}
          <TabPane
            tab={<span><WalletOutlined />我的持仓</span>}
            key="positions"
          >
            {positions.length > 0 ? (
              <Row gutter={[16, 16]}>
                {positions.map((position) => (
                  <Col xs={24} sm={12} lg={8} key={position.indexCode}>
                    <Card className="position-card">
                      <div className="position-header">
                        <div>
                          <div className="position-name">{position.indexName}</div>
                          <div className="position-code">{position.indexCode}</div>
                        </div>
                        <Badge
                          count={`${Number(position.changePercent || 0).toFixed(2)}%`}
                          style={{
                            backgroundColor: (Number(position.changePercent) || 0) >= 0 ? '#cf1322' : '#3f8600'
                          }}
                        />
                      </div>

                      <div className="position-stats">
                        <Row gutter={[8, 8]}>
                          <Col span={12}>
                            <div className="stat-label">持有份额</div>
                            <div className="stat-value">{Number(position.totalShares || 0).toFixed(2)}</div>
                          </Col>
                          <Col span={12}>
                            <div className="stat-label">可用份额</div>
                            <div className="stat-value">{Number(position.availableShares || 0).toFixed(2)}</div>
                          </Col>
                          <Col span={12}>
                            <div className="stat-label">当前净值</div>
                            <div className="stat-value">¥{Number(position.currentNav || 0).toFixed(4)}</div>
                          </Col>
                          <Col span={12}>
                            <div className="stat-label">平均成本</div>
                            <div className="stat-value">¥{Number(position.avgCost || 0).toFixed(4)}</div>
                          </Col>
                          <Col span={12}>
                            <div className="stat-label">持仓市值</div>
                            <div className="stat-value" style={{ color: '#1890ff' }}>
                              ¥{Number(position.marketValue || 0).toFixed(2)}
                            </div>
                          </Col>
                          <Col span={12}>
                            <div className="stat-label">累计盈亏</div>
                            <div
                              className="stat-value"
                              style={{ color: (position.totalProfit || 0) >= 0 ? '#cf1322' : '#3f8600' }}
                            >
                              {(Number(position.totalProfit) || 0) >= 0 ? '+' : ''}¥{Number(position.totalProfit || 0).toFixed(2)}
                            </div>
                          </Col>
                        </Row>
                      </div>

                      <div className="position-actions">
                        <Space>
                          <Button
                            type="primary"
                            onClick={() => handleOpenTradeModal('buy', undefined, position)}
                          >
                            加仓
                          </Button>
                          <Button
                            danger
                            disabled={!position.availableShares}
                            onClick={() => handleOpenTradeModal('sell', undefined, position)}
                          >
                            卖出
                          </Button>
                        </Space>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="暂无持仓，快去市场买入吧" />
            )}
          </TabPane>

          {/* 交易记录 */}
          <TabPane
            tab={<span><HistoryOutlined />交易记录</span>}
            key="transactions"
          >
            <Table
              columns={transactionColumns}
              dataSource={transactions}
              rowKey="id"
              loading={loading}
              pagination={{
                current: transactionPage,
                pageSize: 10,
                total: transactionTotal,
                onChange: (page) => {
                  setTransactionPage(page);
                  loadTransactions(page);
                },
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>
        </Tabs>
      </Content>

      {/* 交易弹窗 */}
      <Modal
        title={tradeType === 'buy' ? '买入指数' : '卖出指数'}
        open={tradeModalVisible}
        onOk={handleTradeSubmit}
        onCancel={handleCloseTradeModal}
        okText={tradeType === 'buy' ? '确认买入' : '确认卖出'}
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          {/*<Form.Item*/}
          {/*  label="指数名称"*/}
          {/*  name="indexName"*/}
          {/*>*/}
          {/*  <Input disabled />*/}
          {/*</Form.Item>*/}

          {tradeType === 'buy' ? (
            <>
              <Form.Item
                label="买入金额（积分）"
                name="amount"
                rules={[{ required: true, message: '请输入买入金额' }]}
                extra="最小买入金额为100积分"
              >
                <InputNumber
                  placeholder="请输入买入金额"
                  style={{ width: '100%' }}
                  min={100}
                  precision={2}
                  prefix={<DollarOutlined />}
                />
              </Form.Item>
              {selectedIndex && (
                <div className="trade-info">
                  <Text type="secondary">
                    当前指数: {selectedIndex.indexName} ({selectedIndex.indexCode})
                  </Text>
                  <br />
                  <Text type="secondary">
                    最新点位: {parseNumericValue(selectedIndex.currentValue).toFixed(2)}
                    （{parseNumericValue(selectedIndex.changePercent) >= 0 ? '+' : ''}{parseNumericValue(selectedIndex.changePercent).toFixed(2)}%）
                  </Text>
                </div>
              )}
            </>
          ) : (
            <>
              <Form.Item
                label="卖出份额"
                name="shares"
                rules={[{ required: true, message: '请输入卖出份额' }]}
                extra={selectedPosition ? `可用份额: ${Number(selectedPosition.availableShares || 0).toFixed(2)}` : ''}
              >
                <InputNumber
                  placeholder="请输入卖出份额"
                  style={{ width: '100%' }}
                  min={0.01}
                  max={selectedPosition?.availableShares}
                  precision={2}
                />
              </Form.Item>
              {selectedPosition && (
                <div className="trade-info">
                  <Text type="secondary">
                    当前持仓: {selectedPosition.indexName} ({selectedPosition.indexCode})
                  </Text>
                  <br />
                  <Text type="secondary">
                    持仓份额: {Number(selectedPosition.totalShares || 0).toFixed(2)}
                    （可用: {Number(selectedPosition.availableShares || 0).toFixed(2)}）
                  </Text>
                  <br />
                  <Text type="secondary">
                    当前净值: ¥{Number(selectedPosition.currentNav || 0).toFixed(4)}
                  </Text>
                  <br />
                </div>
              )}
            </>
          )}
        </Form>
      </Modal>
    </Layout>
  );
};

export default StockMarket;
