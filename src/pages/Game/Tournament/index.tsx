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
  Empty,
  Avatar,
  Divider,
  Tooltip,
} from 'antd';
import {
  TrophyOutlined,
  ThunderboltOutlined,
  UserOutlined,
  ReloadOutlined,
  CrownOutlined,
  InfoCircleOutlined,
  FireOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  getLeaderboardUsingGet,
  getMyRankUsingGet,
} from '@/services/backend/petTournamentController';
import MoyuPet from '@/components/MoyuPet';
import { history } from '@umijs/max';
import './index.less';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// 排行榜项类型
interface TournamentRankItem {
  rank: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  petId: number;
  petName: string;
  petAvatar?: string;
  score: number;
  key?: string;
}

// 空位占位类型
interface EmptyRankSlot {
  isEmpty: true;
  rank: number;
  key: string;
}

type RankListItem = TournamentRankItem | EmptyRankSlot;

// 前三名占位组件
const TopThreePlaceholder: React.FC<{
  rank: number;
  isEmpty: boolean;
  data?: TournamentRankItem;
  onChallenge: (rank: number) => void;
  onAvatarClick?: (data: TournamentRankItem) => void;
  myRank: number | null;
}> = ({ rank, isEmpty, data, onChallenge, onAvatarClick, myRank }) => {
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const bgColors = ['linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', 'linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)', 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)'];
  
  return (
    <div 
      className={`top-three-item rank-${rank} ${isEmpty ? 'empty' : ''}`}
      style={!isEmpty ? { background: bgColors[rank - 1] } : undefined}
    >
      <div className="rank-badge">
        {rank === 1 ? (
          <CrownOutlined style={{ color: '#FFD700', fontSize: 32 }} />
        ) : (
          <Text strong style={{ fontSize: 24, color: colors[rank - 1] }}>#{rank}</Text>
        )}
      </div>
      
      {isEmpty ? (
        <div className="empty-content">
          <div className="empty-avatar">
            <UserOutlined style={{ fontSize: 40, color: '#ccc' }} />
          </div>
          <Text className="empty-text">虚位以待</Text>
          <Text className="empty-subtext">等你来战</Text>
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => onChallenge(rank)}
            className="challenge-btn empty-challenge-btn"
            style={{ marginTop: 16 }}
          >
            挑战
          </Button>
        </div>
      ) : (
        <div className="player-content">
          <div className="avatar-group" onClick={() => data && onAvatarClick?.(data)} style={{ cursor: 'pointer' }}>
            <Avatar
              src={data?.userAvatar}
              icon={<UserOutlined />}
              size={48}
              className="player-avatar"
            />
            {data?.petAvatar && (
              <Avatar
                src={data.petAvatar}
                icon={<UserOutlined />}
                size={28}
                className="pet-avatar"
              />
            )}
          </div>
          <Text strong className="player-name" ellipsis>{data?.userName}</Text>
          <div className="player-score-display">
            <StarOutlined style={{ fontSize: 12, marginRight: 4 }} />
            <span>{data?.score}</span>
          </div>
          <Tag color="blue" className="pet-name">{data?.petName}</Tag>
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              data && onChallenge(data.rank);
            }}
            disabled={data?.rank === myRank}
            className="challenge-btn"
          >
            挑战
          </Button>
        </div>
      )}
    </div>
  );
};

const Tournament: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<TournamentRankItem[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  
  // 查看他人宠物弹窗状态
  const [petModalVisible, setPetModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<{id: number, name: string} | null>(null);

  // 加载排行榜数据
  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await getLeaderboardUsingGet();
      if (response.code === 0 && response.data) {
        setLeaderboard(response.data as TournamentRankItem[]);
      }
    } catch (error) {
      console.error('加载排行榜失败:', error);
      message.error('加载排行榜失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载我的排名
  const loadMyRank = async () => {
    try {
      const response = await getMyRankUsingGet();
      if (response.code === 0) {
        setMyRank(response.data ?? null);
      }
    } catch (error) {
      console.error('加载我的排名失败:', error);
    }
  };

  // 刷新所有数据
  const refreshData = async () => {
    await Promise.all([loadLeaderboard(), loadMyRank()]);
    message.success('刷新成功');
  };

  // 初始加载
  useEffect(() => {
    refreshData();
  }, []);

  // 处理挑战 - 跳转到对战页面，携带目标排名和对手ID（如果有）
  const handleChallenge = (rank: number) => {
    // 根据排名找到对应的用户数据
    const targetUser = leaderboard.find(item => item.rank === rank);
    if (targetUser) {
      // 有对手，传递 opponentUserId
      history.push(`/pet/fight?targetRank=${rank}&opponentUserId=${targetUser.userId}&from=tournament`);
    } else {
      // 空位，只传递 targetRank
      history.push(`/pet/fight?targetRank=${rank}&from=tournament`);
    }
  };

  // 处理点击头像查看宠物详情（复用排名榜逻辑）
  const handleAvatarClick = (record: TournamentRankItem) => {
    setSelectedUser({
      id: record.userId,
      name: record.userName
    });
    setPetModalVisible(true);
  };


  // 获取前三名数据
  const getTopThreeData = () => {
    const top3: (TournamentRankItem | undefined)[] = [undefined, undefined, undefined];
    leaderboard.forEach(item => {
      if (item.rank >= 1 && item.rank <= 3) {
        top3[item.rank - 1] = item;
      }
    });
    return top3;
  };

  // 获取第4-10名的数据（带空位占位）
  const getRestData = (): RankListItem[] => {
    const existing = leaderboard.filter(item => item.rank > 3 && item.rank <= 10).sort((a, b) => a.rank - b.rank);
    // 生成4-10名的完整列表，空位用标记对象占位
    const result: RankListItem[] = [];
    for (let i = 4; i <= 10; i++) {
      const item = existing.find(d => d.rank === i);
      if (item) {
        result.push({ ...item, key: `rank-${i}` });
      } else {
        result.push({ isEmpty: true, rank: i, key: `empty-${i}` });
      }
    }
    return result;
  };

  const topThreeData = getTopThreeData();
  const restData = getRestData();

  return (
    <Card className="tournament-container">

      <Content className="tournament-content">
        {/* 页面标题 */}
        <div className="page-header">
          <div className="header-title-wrapper">
            <CrownOutlined className="title-icon" />
            <Title level={3} className="page-title">武道大会</Title>
          </div>
          <Text type="secondary" className="page-subtitle">挑战强者，登顶巅峰</Text>
          <Tooltip title="刷新数据">
            <Button
              type="text"
              icon={<ReloadOutlined spin={loading} />}
              onClick={refreshData}
              className="refresh-btn"
            />
          </Tooltip>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="我的排名"
                value={myRank || '未上榜'}
                valueStyle={{ color: '#1890ff' }}
                prefix={myRank && myRank <= 3 ? <CrownOutlined /> : <UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="今日参赛人数"
                value={leaderboard.length}
                valueStyle={{ color: '#52c41a' }}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="可挑战次数"
                value="无限"
                valueStyle={{ color: '#fa8c16' }}
                prefix={<FireOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 前三名区域 - 横向展示 */}
        <div className="top-three-wrapper">
          <div className="top-three-container">
            <TopThreePlaceholder 
              rank={2} 
              isEmpty={!topThreeData[1]} 
              data={topThreeData[1]} 
              onChallenge={handleChallenge}
              onAvatarClick={handleAvatarClick}
              myRank={myRank}
            />
            <TopThreePlaceholder 
              rank={1} 
              isEmpty={!topThreeData[0]} 
              data={topThreeData[0]} 
              onChallenge={handleChallenge}
              onAvatarClick={handleAvatarClick}
              myRank={myRank}
            />
            <TopThreePlaceholder 
              rank={3} 
              isEmpty={!topThreeData[2]} 
              data={topThreeData[2]} 
              onChallenge={handleChallenge}
              onAvatarClick={handleAvatarClick}
              myRank={myRank}
            />
          </div>
        </div>

        {/* 第4-10名排名 - 纵向列表 */}
        <Card className="rest-ranking-card">
          <div className="rest-ranking-header">
            <div className="header-left">
              <div className="trophy-icon-wrapper">
                <TrophyOutlined className="trophy-icon" />
              </div>
              <div className="header-text">
                <Text strong className="header-title">排名榜</Text>
                <Text type="secondary" className="header-subtitle">第4-10名</Text>
              </div>
            </div>
            <div className="header-badge">{leaderboard.filter(i => i.rank > 3 && i.rank <= 10).length}/7</div>
          </div>
          <Divider style={{ margin: '16px 0' }} />
          <List
            dataSource={restData}
            rowKey={(item: RankListItem) => ('key' in item && item.key ? item.key : `rank-${item.rank}`)}
            renderItem={(item: RankListItem) => {
              const isEmptySlot = 'isEmpty' in item && item.isEmpty;
              const rank = item.rank;
              const getRankBadge = (r: number) => {
                const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                const bgColors = ['#FFF8E1', '#F5F5F5', '#F3E5F5'];
                if (r <= 3) {
                  return (
                    <div className="rank-badge-medal" style={{ background: bgColors[r-1], borderColor: colors[r-1] }}>
                      <span style={{ color: colors[r-1] }}>{r}</span>
                    </div>
                  );
                }
                return (
                  <div className="rank-badge-normal">
                    <span>{r}</span>
                  </div>
                );
              };

              if (isEmptySlot) {
                // 空位占位
                return (
                  <List.Item
                    className="ranking-list-item empty-item"
                    actions={[
                      <Button
                        type="primary"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        onClick={() => handleChallenge(rank)}
                        className="challenge-btn-small"
                      >
                        挑战
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={getRankBadge(rank)}
                      title={
                        <Space className="player-info-empty">
                          <div className="empty-avatar-small">
                            <UserOutlined style={{ color: '#ccc', fontSize: 16 }} />
                          </div>
                          <Text style={{ color: '#999' }}>虚位以待</Text>
                        </Space>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>等你来战</Text>
                      }
                    />
                  </List.Item>
                );
              }
              const data = item as TournamentRankItem;
              return (
                <List.Item
                  className={`ranking-list-item ${data.rank === myRank ? 'my-rank' : ''}`}
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      icon={<ThunderboltOutlined />}
                      onClick={() => handleChallenge(data.rank)}
                      disabled={data.rank === myRank}
                      className="challenge-btn-small"
                    >
                      挑战
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={getRankBadge(data.rank)}
                    title={
                      <Space className="player-info">
                        <Avatar
                          src={data.userAvatar}
                          icon={<UserOutlined />}
                          size={36}
                          onClick={() => handleAvatarClick(data)}
                          className="player-avatar-list"
                        />
                        <div className="player-details">
                          <Text strong className="player-name-list">{data.userName}</Text>
                          <div className="player-meta">
                            <Tag color="blue" className="pet-tag">{data.petName}</Tag>
                            <span className="score-badge">
                              <StarOutlined /> {data.score}
                            </span>
                          </div>
                        </div>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>

        {/* 无数据提示 */}
        {leaderboard.length === 0 && !loading && (
          <Empty description="暂无排行数据，快来参加武道大会吧！" />
        )}
      </Content>

      {/* 查看他人宠物弹窗 */}
      {selectedUser && (
        <MoyuPet 
          visible={petModalVisible} 
          onClose={() => setPetModalVisible(false)}
          otherUserId={selectedUser.id}
          otherUserName={selectedUser.name}
        />
      )}
    </Card>
  );
};

export default Tournament;
