import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Avatar, Badge, Spin } from 'antd';
import { TrophyOutlined, CrownOutlined, HomeOutlined, BarChartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import MoyuPet from '@/components/MoyuPet';
import styles from './index.less';
import { getPetRankListUsingGet } from '@/services/backend/petRankController';

const PetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('pet');
  const [rankData, setRankData] = useState<API.PetRankVO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [petModalVisible, setPetModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<{id: number, name: string} | null>(null);

  // 获取排行榜数据
  const fetchRankData = async () => {
    setLoading(true);
    try {
      const res = await getPetRankListUsingGet({ limit: 20 });
      if (res.data) {
        setRankData(res.data);
      }
    } catch (error) {
      console.error('获取排行榜数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankData();
  }, []);

  // 处理点击宠物行
  const handlePetRowClick = (record: API.PetRankVO) => {
    setSelectedUser({
      id: record.userId || 0,
      name: record.userName || '未知用户'
    });
    setPetModalVisible(true);
  };

  // 定义排行榜列
  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      render: (rank: number) => {
        if (rank === 1) {
          return <div className={styles.rankFirst}>{rank}</div>;
        } else if (rank === 2) {
          return <div className={styles.rankSecond}>{rank}</div>;
        } else if (rank === 3) {
          return <div className={styles.rankThird}>{rank}</div>;
        }
        return <div className={styles.rankNormal}>{rank}</div>;
      }
    },
    {
      title: '宠物',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: API.PetRankVO) => (
        <div className={styles.petInfo}>
          <Avatar src={record.petUrl} size={36} className={styles.petAvatar} />
          <div className={styles.petNameContainer}>
            <div className={styles.petName}>{name}</div>
            <div className={styles.petOwner}>{record.userName}</div>
          </div>
        </div>
      )
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number) => <div className={styles.levelBadge}>Lv.{level}</div>
    }
  ];

  // 渲染排行榜内容
  const renderRankingContent = () => {
    return (
      <div className={styles.rankingContainer}>
        <div className={styles.rankingTip}>
          点击宠物可查看详细信息
        </div>
        <Spin spinning={loading}>
          <Table 
            dataSource={rankData} 
            columns={columns} 
            rowKey="petId"
            pagination={false}
            className={styles.rankTable}
            onRow={(record) => ({
              onClick: () => handlePetRowClick(record),
              style: { cursor: 'pointer' }
            })}
          />
        </Spin>
      </div>
    );
  };

  // 渲染摸鱼BOSS内容
  const renderBossContent = () => {
    return (
      <div className={styles.bossContainer}>
        <div className={styles.bossHeader}>
          <div className={styles.bossTitle}>
            <ThunderboltOutlined className={styles.bossTitleIcon} />
            <span>世界BOSS - 黑心老板</span>
          </div>
          <div className={styles.bossSubtitle}>全服玩家联合攻打黑心老板，共同获得奖励！</div>
        </div>
        
        <div className={styles.bossGrid}>
          {/* BOSS卡片 */}
          <div className={styles.bossCard}>
            <div className={styles.bossAvatar}>
              <div className={styles.bossImage}>👔</div>
              <div className={styles.bossLevel}>Lv.50</div>
            </div>
            <div className={styles.bossInfo}>
              <div className={styles.bossName}>压榨王CEO</div>
              <div className={styles.bossDesc}>传说中的黑心老板之王，专门压榨员工加班</div>
              <div className={styles.bossStats}>
                <div className={styles.bossStat}>
                  <span className={styles.bossStatLabel}>血量:</span>
                  <span className={styles.bossStatValue}>10000</span>
                </div>
                <div className={styles.bossStat}>
                  <span className={styles.bossStatLabel}>攻击:</span>
                  <span className={styles.bossStatValue}>500</span>
                </div>
              </div>
              <div className={styles.bossRewards}>
                <div className={styles.rewardTitle}>讨伐奖励:</div>
                <div className={styles.rewardList}>
                  <span className={styles.reward}>💰 1000摸鱼币</span>
                  <span className={styles.reward}>🏆 自由勋章</span>
                </div>
              </div>
              <div className={styles.bossActions}>
                <button className={styles.challengeBtn} disabled>
                  联合讨伐
                </button>
              </div>
            </div>
          </div>

          <div className={styles.bossCard}>
            <div className={styles.bossAvatar}>
              <div className={styles.bossImage}>💼</div>
              <div className={styles.bossLevel}>Lv.30</div>
            </div>
            <div className={styles.bossInfo}>
              <div className={styles.bossName}>PUA部门经理</div>
              <div className={styles.bossDesc}>精通职场PUA的黑心经理，专门打击员工自信</div>
              <div className={styles.bossStats}>
                <div className={styles.bossStat}>
                  <span className={styles.bossStatLabel}>血量:</span>
                  <span className={styles.bossStatValue}>6000</span>
                </div>
                <div className={styles.bossStat}>
                  <span className={styles.bossStatLabel}>攻击:</span>
                  <span className={styles.bossStatValue}>350</span>
                </div>
              </div>
              <div className={styles.bossRewards}>
                <div className={styles.rewardTitle}>讨伐奖励:</div>
                <div className={styles.rewardList}>
                  <span className={styles.reward}>💰 600摸鱼币</span>
                  <span className={styles.reward}>🛡️ 心理防护</span>
                </div>
              </div>
              <div className={styles.bossActions}>
                <button className={styles.challengeBtn} disabled>
                  联合讨伐
                </button>
              </div>
            </div>
          </div>

          <div className={styles.bossCard}>
            <div className={styles.bossAvatar}>
              <div className={styles.bossImage}>⏰</div>
              <div className={styles.bossLevel}>Lv.20</div>
            </div>
            <div className={styles.bossInfo}>
              <div className={styles.bossName}>996督察官</div>
              <div className={styles.bossDesc}>专门监督员工加班的黑心督察，绝不允许摸鱼</div>
              <div className={styles.bossStats}>
                <div className={styles.bossStat}>
                  <span className={styles.bossStatLabel}>血量:</span>
                  <span className={styles.bossStatValue}>4000</span>
                </div>
                <div className={styles.bossStat}>
                  <span className={styles.bossStatLabel}>攻击:</span>
                  <span className={styles.bossStatValue}>250</span>
                </div>
              </div>
              <div className={styles.bossRewards}>
                <div className={styles.rewardTitle}>讨伐奖励:</div>
                <div className={styles.rewardList}>
                  <span className={styles.reward}>💰 300摸鱼币</span>
                  <span className={styles.reward}>⏱️ 摸鱼时间</span>
                </div>
              </div>
              <div className={styles.bossActions}>
                <button className={styles.challengeBtn} disabled>
                  联合讨伐
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.petPageContainer}>
      <div className={styles.gameTabsContainer}>
        {/* 游戏风格标签导航 */}
        <div className={styles.gameTabsNav}>
          <div 
            className={`${styles.gameTab} ${activeTab === 'pet' ? styles.gameTabActive : ''}`}
            onClick={() => setActiveTab('pet')}
          >
            <div className={styles.gameTabIcon}>
              <HomeOutlined />
            </div>
            <div className={styles.gameTabText}>我的宠物</div>
            <div className={styles.gameTabDecor}></div>
          </div>
          <div 
            className={`${styles.gameTab} ${activeTab === 'ranking' ? styles.gameTabActive : ''}`}
            onClick={() => setActiveTab('ranking')}
          >
            <div className={styles.gameTabIcon}>
              <TrophyOutlined />
            </div>
            <div className={styles.gameTabText}>排行榜</div>
            <div className={styles.gameTabDecor}></div>
          </div>
          <div 
            className={`${styles.gameTab} ${activeTab === 'boss' ? styles.gameTabActive : ''}`}
            onClick={() => setActiveTab('boss')}
          >
            <div className={styles.gameTabIcon}>
              <ThunderboltOutlined />
            </div>
            <div className={styles.gameTabText}>摸鱼BOSS</div>
            <div className={styles.gameTabDecor}></div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className={styles.gameTabContent}>
          {activeTab === 'pet' && (
            <div className={styles.petComponentWrapper}>
              <MoyuPet isPageComponent={true} />
            </div>
          )}
          {activeTab === 'ranking' && renderRankingContent()}
          {activeTab === 'boss' && renderBossContent()}
        </div>
      </div>
      
      {/* 查看他人宠物弹窗 */}
      {selectedUser && (
        <MoyuPet 
          visible={petModalVisible} 
          onClose={() => setPetModalVisible(false)}
          otherUserId={selectedUser.id}
          otherUserName={selectedUser.name}
        />
      )}
    </div>
  );
};

export default PetPage;
