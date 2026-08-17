/**
 * 斗地主排行榜页面
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Tag, Space, Button, Select, Avatar, Spin, Empty, message } from 'antd';
import { Trophy, Crown, Medal, ArrowLeft } from 'lucide-react';
import { useModel, history } from '@umijs/max';
import API from '@/services/backend';
import 'umi';

/** 排行榜条目 */
interface GameRankingItemVO {
  rank?: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
  totalGames: number;
  winGames: number;
  loseGames: number;
  totalScore: number;
  winRate: number;
  extraStats?: string;
}

/** 排序选项 */
interface SortOptionVO {
  code: string;
  label: string;
  extKey?: string;
}

const LandlordsRanking: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const userId = currentUser?.id;

  const [loading, setLoading] = useState(false);
  const [rankingList, setRankingList] = useState<GameRankingItemVO[]>([]);
  const [sortOptions, setSortOptions] = useState<SortOptionVO[]>([]);
  const [selectedSort, setSelectedSort] = useState<string>('win_rate');
  const [myRank, setMyRank] = useState<number | null>(null);

  const gameType = 1; // 斗地主

  // 获取排序选项
  const fetchSortOptions = useCallback(async () => {
    try {
      const res = await API.gameRankingController.getSortOptions(gameType) as BaseResponse<SortOptionVO[]>;
      if (res.code === 0 && res.data) {
        setSortOptions(res.data);
        const defaultOption = res.data.find((opt: SortOptionVO) => opt.code) || res.data[0];
        if (defaultOption) {
          setSelectedSort(defaultOption.code);
        }
      }
    } catch (error) {
      console.error('获取排序选项失败', error);
    }
  }, []);

  // 获取排行榜
  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.gameRankingController.getRanking(gameType, selectedSort, 50, 5) as BaseResponse<GameRankingItemVO[]>;
      if (res.code === 0) {
        setRankingList(res.data || []);

        // 查找我的排名
        if (userId && res.data) {
          const index = res.data.findIndex((item: GameRankingItemVO) => item.userId === userId);
          if (index !== -1) {
            setMyRank(index + 1);
          } else {
            setMyRank(null);
          }
        }
      } else {
        message.error(res.message || '获取排行榜失败');
      }
    } catch (error) {
      console.error('获取排行榜失败', error);
      message.error('获取排行榜失败');
    } finally {
      setLoading(false);
    }
  }, [selectedSort, userId]);

  useEffect(() => {
    fetchSortOptions();
  }, [fetchSortOptions]);

  useEffect(() => {
    if (selectedSort) {
      fetchRanking();
    }
  }, [selectedSort, fetchRanking]);

  // 获取排名图标
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={24} style={{ color: '#FFD700' }} />;
    if (rank === 2) return <Medal size={24} style={{ color: '#C0C0C0' }} />;
    if (rank === 3) return <Medal size={24} style={{ color: '#CD7F32' }} />;
    return <span style={{ fontSize: 16, fontWeight: 'bold', color: '#666' }}>{rank}</span>;
  };

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, __: any, index: number) => getRankIcon(index + 1),
    },
    {
      title: '玩家',
      key: 'player',
      render: (_: any, record: GameRankingItemVO) => (
        <Space>
          <Avatar src={record.userAvatar} size="small">
            {(record.userName || '?').charAt(0)}
          </Avatar>
          <span style={{ fontWeight: record.userId === userId ? 'bold' : 'normal' }}>
            {record.userName || '匿名用户'}
            {record.userId === userId && <Tag color="blue" style={{ marginLeft: 8 }}>我</Tag>}
          </span>
        </Space>
      ),
    },
    {
      title: '总场数',
      dataIndex: 'totalGames',
      key: 'totalGames',
      sorter: true,
      render: (val: number) => <span style={{ fontWeight: 'bold' }}>{val}</span>,
    },
    {
      title: '胜场',
      dataIndex: 'winGames',
      key: 'winGames',
      render: (val: number) => <span style={{ color: '#52c41a' }}>{val}</span>,
    },
    {
      title: '负场',
      dataIndex: 'loseGames',
      key: 'loseGames',
      render: (val: number) => <span style={{ color: '#ff4d4f' }}>{val}</span>,
    },
    {
      title: '胜率',
      dataIndex: 'winRate',
      key: 'winRate',
      sorter: true,
      render: (val: number) => (
        <Tag color={val >= 0.6 ? 'green' : val >= 0.4 ? 'orange' : 'red'}>
          {((val || 0) * 100).toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: '积分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      sorter: true,
      render: (val: number) => (
        <span style={{ color: val >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
          {val > 0 ? '+' : ''}{val}
        </span>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '斗地主排行榜',
        subTitle: '查看玩家战绩排名',
        onBack: () => history.push('/game/landlords'),
      }}
    >
      {/* 排序选项 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <span style={{ fontWeight: 'bold' }}>排序方式：</span>
          <Select
            value={selectedSort}
            onChange={setSelectedSort}
            style={{ width: 180 }}
            options={sortOptions.map((opt) => ({
              label: opt.label,
              value: opt.code,
            }))}
          />
          <span style={{ color: '#999', fontSize: 12 }}>
            仅显示游戏场次 ≥ 5 场的玩家
          </span>
        </Space>
      </Card>

      {/* 我的排名 */}
      {myRank && (
        <Card
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            color: 'white',
          }}
          bodyStyle={{ padding: 16 }}
        >
          <Space size="large">
            <Trophy size={32} />
            <div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>我的排名</div>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>#{myRank}</div>
            </div>
          </Space>
        </Card>
      )}

      {/* 排行榜 */}
      <Card
        title={
          <Space>
            <Trophy size={20} />
            <span>排行榜</span>
            <Tag>{rankingList.length} 人</Tag>
          </Space>
        }
        extra={
          <Button icon={<ArrowLeft size={16} />} onClick={() => history.push('/game/landlords')}>
            返回大厅
          </Button>
        }
      >
        <Spin spinning={loading}>
          {rankingList.length === 0 ? (
            <Empty description="暂无排行数据" />
          ) : (
            <Table
              dataSource={rankingList}
              columns={columns}
              rowKey="userId"
              pagination={false}
              size="middle"
              rowClassName={(record) => record.userId === userId ? 'highlight-row' : ''}
            />
          )}
        </Spin>
      </Card>

      <style>{`
        .highlight-row {
          background-color: #e6f7ff;
        }
      `}</style>
    </PageContainer>
  );
};

export default LandlordsRanking;
