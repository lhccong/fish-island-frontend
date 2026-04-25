import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Card,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Modal,
  message,
  Tag,
  List,
  Avatar,
  Divider,
  Tooltip,
  Spin,
} from 'antd';
import {
  TrophyOutlined,
  ThunderboltOutlined,
  UserOutlined,
  ReloadOutlined,
  CrownOutlined,
  FireOutlined,
  StarOutlined,
  ArrowUpOutlined,
  HeartOutlined,
  SafetyOutlined,
  AimOutlined,
  RocketOutlined,
  AlertOutlined,
  GiftOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useModel, history } from '@umijs/max';
import {
  getFloorMonsterUsingGet,
  getProgressUsingGet,
  getRankingUsingGet,
} from '@/services/backend/towerClimbController';
import './index.less';

const { Content } = Layout;
const { Title, Text } = Typography;

// 怪物属性展示组件
const MonsterStats: React.FC<{ monster: API.TowerFloorMonsterVO }> = ({ monster }) => {
  const stats = [
    { label: '血量', value: monster.health, icon: <HeartOutlined />, color: '#ff4d4f' },
    { label: '攻击', value: monster.attack, icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '暴击率', value: `${((monster.critRate ?? 0) * 100).toFixed(0)}%`, icon: <AimOutlined />, color: '#722ed1' },
    { label: '闪避率', value: `${((monster.dodgeRate ?? 0) * 100).toFixed(0)}%`, icon: <RocketOutlined />, color: '#13c2c2' },
    { label: '格挡率', value: `${((monster.blockRate ?? 0) * 100).toFixed(0)}%`, icon: <SafetyOutlined />, color: '#1890ff' },
    { label: '连击率', value: `${((monster.comboRate ?? 0) * 100).toFixed(0)}%`, icon: <FireOutlined />, color: '#eb2f96' },
    { label: '吸血率', value: `${((monster.lifesteal ?? 0) * 100).toFixed(0)}%`, icon: <HeartOutlined />, color: '#52c41a' },
    { label: '通关奖励', value: `${monster.rewardPoints} 积分`, icon: <GiftOutlined />, color: '#faad14' },
  ];

  return (
    <div className="monster-stats-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-item">
          <span className="stat-icon" style={{ color: stat.color }}>{stat.icon}</span>
          <span className="stat-label">{stat.label}</span>
          <span className="stat-value" style={{ color: stat.color }}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
};

const TowerClimb: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<API.TowerProgressVO | null>(null);
  const [ranking, setRanking] = useState<API.TowerRankVO[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  // 怪物预览弹窗
  const [monsterModalVisible, setMonsterModalVisible] = useState(false);
  const [previewMonster, setPreviewMonster] = useState<API.TowerFloorMonsterVO | null>(null);
  const [previewFloor, setPreviewFloor] = useState<number>(1);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const res = await getProgressUsingGet();
      if (res.code === 0) {
        setProgress(res.data ?? null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRanking = async () => {
    setRankingLoading(true);
    try {
      const res = await getRankingUsingGet({ limit: 20 });
      if (res.code === 0) {
        setRanking(res.data ?? []);
      }
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    fetchRanking();
  }, []);

  const handleChallenge = () => {
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }
    // 跳转到宠物对战页面，传入爬塔模式参数
    history.push(`/tower/fight?from=tower&floor=${nextFloor}`);
  };

  const handlePreviewMonster = async (floor: number) => {
    setPreviewFloor(floor);
    setMonsterModalVisible(true);
    setPreviewLoading(true);
    try {
      const res = await getFloorMonsterUsingGet({ floor });
      if (res.code === 0) {
        setPreviewMonster(res.data ?? null);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const currentFloor = progress?.maxFloor ?? 0;
  const nextFloor = progress?.nextFloor ?? 1;
  const nextMonster = progress?.nextMonster;

  // 获取层数对应的颜色主题
  const getFloorTheme = (floor: number) => {
    if (floor <= 10) return { color: '#52c41a', label: '新手区', bg: 'linear-gradient(135deg, #f6ffed, #d9f7be)' };
    if (floor <= 30) return { color: '#1890ff', label: '进阶区', bg: 'linear-gradient(135deg, #e6f7ff, #bae7ff)' };
    if (floor <= 60) return { color: '#722ed1', label: '精英区', bg: 'linear-gradient(135deg, #f9f0ff, #efdbff)' };
    if (floor <= 99) return { color: '#fa8c16', label: '传说区', bg: 'linear-gradient(135deg, #fff7e6, #ffe7ba)' };
    return { color: '#ff4d4f', label: '神话区', bg: 'linear-gradient(135deg, #fff1f0, #ffccc7)' };
  };

  const floorTheme = getFloorTheme(nextFloor);

  // 我的排名
  const myRank = ranking.find((r) => r.userId === currentUser?.id);

  return (
    <Content className="tower-climb-container">
      <div className="tower-content">
        {/* 页面标题 */}
        <div className="page-header">
          <div className="header-title-wrapper">
            <span className="title-icon">🗼</span>
            <Title level={2} className="page-title">
              无尽爬塔
            </Title>
          </div>
          <Text className="page-subtitle">带领你的宠物挑战无尽高塔，登顶排行榜！</Text>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            className="refresh-btn"
            onClick={() => { fetchProgress(); fetchRanking(); }}
            loading={loading}
          />
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} className="stats-row">
          <Col xs={12} sm={6}>
            <Card className="stat-card stat-card-blue">
              <Statistic
                title="当前最高层"
                value={currentFloor}
                suffix="层"
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card stat-card-purple">
              <Statistic
                title="下一挑战层"
                value={nextFloor}
                suffix="层"
                prefix={<ArrowUpOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card stat-card-orange">
              <Statistic
                title="我的排名"
                value={myRank ? `#${myRank.rank}` : '未上榜'}
                prefix={<CrownOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card stat-card-green">
              <Statistic
                title="可用积分"
                value={(currentUser?.points ?? 0) - (currentUser?.usedPoints ?? 0)}
                suffix="分"
                prefix={<StarOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* 左侧：挑战区域 */}
          <Col xs={24} lg={14}>
            {/* 当前挑战层信息 */}
            <Card className="challenge-card" loading={loading}>
              <div className="floor-banner" style={{ background: floorTheme.bg }}>
                <div className="floor-number-display">
                  <span className="floor-label">第</span>
                  <span className="floor-number" style={{ color: floorTheme.color }}>{nextFloor}</span>
                  <span className="floor-label">层</span>
                </div>
                <Tag color={floorTheme.color} className="floor-zone-tag">{floorTheme.label}</Tag>
              </div>

              {nextMonster ? (
                <div className="monster-preview-section">
                  <div className="monster-header">
                    <div className="monster-avatar">
                      {nextMonster.avatarUrl ? (
                        <Avatar
                          size={64}
                          src={nextMonster.avatarUrl}
                          style={{ border: `2px solid ${floorTheme.color}`, boxShadow: `0 0 12px ${floorTheme.color}40` }}
                        />
                      ) : (
                        <AlertOutlined style={{ fontSize: 48, color: floorTheme.color }} />
                      )}
                    </div>
                    <div className="monster-info">
                      <Title level={4} style={{ margin: 0, color: floorTheme.color }}>
                        {nextMonster.name ?? `第${nextFloor}层守卫`}
                      </Title>
                      <Space size={4} wrap>
                        <Tag color="red">❤️ {nextMonster.health}</Tag>
                        <Tag color="orange">⚔️ {nextMonster.attack}</Tag>
                        {(nextMonster.critRate ?? 0) > 0 && (
                          <Tag color="purple">💥 暴击 {((nextMonster.critRate ?? 0) * 100).toFixed(0)}%</Tag>
                        )}
                        {(nextMonster.dodgeRate ?? 0) > 0 && (
                          <Tag color="cyan">💨 闪避 {((nextMonster.dodgeRate ?? 0) * 100).toFixed(0)}%</Tag>
                        )}
                      </Space>
                    </div>
                    <div className="monster-reward">
                      <GiftOutlined style={{ color: '#faad14' }} />
                      <span style={{ color: '#faad14', fontWeight: 600 }}>
                        +{nextMonster.rewardPoints} 积分
                      </span>
                    </div>
                  </div>

                  <Divider style={{ margin: '16px 0' }} />

                  <MonsterStats monster={nextMonster} />
                </div>
              ) : (
                <div className="no-monster">
                  <Spin spinning={loading}>
                    <Text type="secondary">加载怪物信息中...</Text>
                  </Spin>
                </div>
              )}

              <div className="challenge-actions">
                <Button
                  type="primary"
                  size="large"
                  icon={<ThunderboltOutlined />}
                  onClick={handleChallenge}
                  className="challenge-btn"
                  style={{ background: floorTheme.color, borderColor: floorTheme.color }}
                >
                  {`挑战第 ${nextFloor} 层`}
                </Button>
                <Tooltip title="预览其他层怪物">
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => handlePreviewMonster(nextFloor)}
                    className="preview-btn"
                  >
                    预览怪物
                  </Button>
                </Tooltip>
              </div>
            </Card>

            {/* 爬塔进度可视化 */}
            <Card className="progress-card" title={
              <Space>
                <RocketOutlined style={{ color: '#722ed1' }} />
                <span>爬塔进度</span>
              </Space>
            }>
              <div className="tower-visual">
                {Array.from({ length: Math.min(10, nextFloor + 2) }, (_, i) => {
                  const floor = nextFloor + 2 - i;
                  const isPassed = floor <= currentFloor;
                  const isCurrent = floor === nextFloor;
                  const theme = getFloorTheme(floor);
                  return (
                    <div
                      key={floor}
                      className={`tower-floor ${isPassed ? 'passed' : ''} ${isCurrent ? 'current' : ''}`}
                      onClick={() => handlePreviewMonster(floor)}
                    >
                      <span className="tower-floor-num">{floor}F</span>
                      <div className="tower-floor-bar" style={{
                        background: isPassed ? theme.color : isCurrent ? theme.color : '#f0f0f0',
                        opacity: isPassed ? 1 : isCurrent ? 0.8 : 0.3,
                      }} />
                      {isCurrent && <span className="current-marker">← 当前</span>}
                      {isPassed && <span className="passed-marker">✓</span>}
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>

          {/* 右侧：排行榜 */}
          <Col xs={24} lg={10}>
            <Card
              className="ranking-card"
              title={
                <div className="ranking-header">
                  <div className="ranking-title-left">
                    <div className="trophy-icon-wrapper">
                      <TrophyOutlined className="trophy-icon" />
                    </div>
                    <div>
                      <div className="ranking-title">爬塔排行榜</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>按最高通关层数排名</Text>
                    </div>
                  </div>
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={fetchRanking}
                    loading={rankingLoading}
                    size="small"
                  />
                </div>
              }
            >
              <Spin spinning={rankingLoading}>
                <List
                  dataSource={ranking.slice(0, 20)}
                  locale={{ emptyText: '暂无排名数据' }}
                  renderItem={(item) => {
                    const isMe = item.userId === currentUser?.id;
                    const rank = item.rank ?? 0;
                    const medalColors: Record<number, string> = {
                      1: '#FFD700',
                      2: '#C0C0C0',
                      3: '#CD7F32',
                    };
                    const medalEmoji: Record<number, string> = {
                      1: '🥇',
                      2: '🥈',
                      3: '🥉',
                    };
                    const itemTheme = getFloorTheme(item.maxFloor ?? 0);

                    return (
                      <List.Item
                        className={`ranking-item ${isMe ? 'my-rank' : ''}`}
                        key={item.userId}
                      >
                        <div className="rank-left">
                          {rank <= 3 ? (
                            <span className="medal-emoji">{medalEmoji[rank]}</span>
                          ) : (
                            <div className="rank-number">{rank}</div>
                          )}
                          <Avatar
                            src={item.userAvatar}
                            icon={<UserOutlined />}
                            size={36}
                            className="rank-avatar"
                          />
                          <div className="rank-user-info">
                            <Text strong className="rank-username">
                              {item.userName}
                              {isMe && <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>我</Tag>}
                            </Text>
                            <Tag
                              color={itemTheme.color}
                              style={{ fontSize: 10, marginTop: 2 }}
                            >
                              {itemTheme.label}
                            </Tag>
                          </div>
                        </div>
                        <div className="rank-right">
                          <div className="rank-floor" style={{ color: medalColors[rank] || itemTheme.color }}>
                            <TrophyOutlined style={{ marginRight: 4 }} />
                            {item.maxFloor ?? 0} 层
                          </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </Spin>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 怪物预览弹窗 */}
      <Modal
        open={monsterModalVisible}
        onCancel={() => setMonsterModalVisible(false)}
        footer={null}
        title={null}
        width={500}
        className="monster-preview-modal"
        styles={{ body: { padding: 0 } }}
        destroyOnClose
      >
        <Spin spinning={previewLoading}>
          {previewMonster ? (
            <div className="monster-preview-content">
              {/* 顶部主题色 banner */}
              <div
                className="preview-banner"
                style={{ background: getFloorTheme(previewFloor).bg }}
              >
                <div className="preview-avatar-wrap">
                  {previewMonster.avatarUrl ? (
                    <Avatar
                      size={80}
                      src={previewMonster.avatarUrl}
                      className="preview-avatar-img"
                      style={{
                        border: `3px solid ${getFloorTheme(previewFloor).color}`,
                        boxShadow: `0 0 20px ${getFloorTheme(previewFloor).color}60`,
                      }}
                    />
                  ) : (
                    <div
                      className="preview-avatar-placeholder"
                      style={{ color: getFloorTheme(previewFloor).color }}
                    >
                      <AlertOutlined style={{ fontSize: 40 }} />
                    </div>
                  )}
                </div>
                <div className="preview-monster-name">
                  <Title level={3} style={{ margin: 0, color: getFloorTheme(previewFloor).color }}>
                    {previewMonster.name ?? `第${previewFloor}层守卫`}
                  </Title>
                  <div className="preview-badges">
                    <Tag color={getFloorTheme(previewFloor).color} className="preview-zone-tag">
                      {getFloorTheme(previewFloor).label}
                    </Tag>
                    <Tag color="gold" className="preview-floor-tag">
                      第 {previewFloor} 层
                    </Tag>
                  </div>
                </div>
              </div>

              {/* 属性网格 */}
              <div className="preview-stats-body">
                <MonsterStats monster={previewMonster} />
              </div>

              {/* 底部按钮 */}
              <div className="preview-footer">
                <Button
                  type="primary"
                  size="large"
                  icon={<ThunderboltOutlined />}
                  onClick={() => {
                    setMonsterModalVisible(false);
                    handleChallenge();
                  }}
                  style={{
                    background: getFloorTheme(previewFloor).color,
                    borderColor: getFloorTheme(previewFloor).color,
                    flex: 1,
                  }}
                  disabled={previewFloor !== nextFloor}
                >
                  {previewFloor === nextFloor ? '立即挑战' : `当前层为第 ${nextFloor} 层`}
                </Button>
                <Button size="large" onClick={() => setMonsterModalVisible(false)} style={{ flex: 1 }}>
                  关闭
                </Button>
              </div>
            </div>
          ) : (
            !previewLoading && (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#999' }}>
                暂无数据
              </div>
            )
          )}
        </Spin>
      </Modal>
    </Content>
  );
};

export default TowerClimb;
