import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Avatar, Badge, Spin } from 'antd';
import { TrophyOutlined, CrownOutlined, HomeOutlined, BarChartOutlined, ThunderboltOutlined, BookOutlined } from '@ant-design/icons';
import MoyuPet from '@/components/MoyuPet';
import styles from './index.less';
import { getPetRankListUsingGet } from '@/services/backend/petRankController';
import { listItemTemplatesVoByPageUsingPost } from '@/services/backend/itemTemplatesController';

const PetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('pet');
  const [rankData, setRankData] = useState<API.PetRankVO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [petModalVisible, setPetModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<{id: number, name: string} | null>(null);
  
  // 图鉴相关状态
  const [galleryData, setGalleryData] = useState<API.ItemTemplateVO[]>([]);
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);
  const [galleryFilter, setGalleryFilter] = useState<{
    category?: string;
    subType?: string;
    rarity?: number;
  }>({});

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

  // 获取图鉴数据
  const fetchGalleryData = async () => {
    setGalleryLoading(true);
    try {
      const res = await listItemTemplatesVoByPageUsingPost({
        current: 1,
        pageSize: 50,
        ...galleryFilter
      });
      if (res.data?.records) {
        setGalleryData(res.data.records);
      }
    } catch (error) {
      console.error('获取图鉴数据失败:', error);
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    fetchRankData();
  }, []);

  useEffect(() => {
    if (activeTab === 'gallery') {
      fetchGalleryData();
    }
  }, [activeTab, galleryFilter]);

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

  // 渲染图鉴内容
  const renderGalleryContent = () => {
    // 判断数值是否有效（大于0）
    const isValidNumber = (value: any): boolean => {
      return value != null && value !== '' && !isNaN(Number(value)) && Number(value) > 0;
    };

    // 稀有度颜色映射
    const rarityColors: Record<number, string> = {
      1: '#8c8c8c', // 灰色 - 普通
      2: '#52c41a', // 绿色 - 优良
      3: '#1890ff', // 蓝色 - 精良
      4: '#722ed1', // 紫色 - 史诗
      5: '#fa8c16', // 橙色 - 传说
      6: '#f5222d', // 红色 - 神话
      7: '#eb2f96', // 粉色 - 至尊
      8: '#fadb14', // 金色 - 神器
    };

    // 稀有度名称映射
    const rarityNames: Record<number, string> = {
      1: '普通',
      2: '优良', 
      3: '精良',
      4: '史诗',
      5: '传说',
      6: '神话',
      7: '至尊',
      8: '神器',
    };

    // 物品大类名称映射
    const categoryNames: Record<string, string> = {
      'equipment': '装备类',
      'consumable': '消耗品',
      'material': '材料',
    };

    return (
      <div className={styles.galleryContainer}>
        <div className={styles.galleryHeader}>
          <div className={styles.galleryTitle}>
            <BookOutlined className={styles.galleryTitleIcon} />
            <span>装备道具图鉴</span>
          </div>
          <div className={styles.gallerySubtitle}>收录各种装备道具的详细信息</div>
        </div>

        {/* 筛选器 */}
        <div className={styles.galleryFilters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>物品类型:</span>
            <div className={styles.filterButtons}>
              <button 
                className={`${styles.filterBtn} ${!galleryFilter.category ? styles.filterBtnActive : ''}`}
                onClick={() => setGalleryFilter(prev => ({ ...prev, category: undefined }))}
              >
                全部
              </button>
              <button 
                className={`${styles.filterBtn} ${galleryFilter.category === 'equipment' ? styles.filterBtnActive : ''}`}
                onClick={() => setGalleryFilter(prev => ({ ...prev, category: 'equipment' }))}
              >
                装备类
              </button>
              <button 
                className={`${styles.filterBtn} ${galleryFilter.category === 'consumable' ? styles.filterBtnActive : ''}`}
                onClick={() => setGalleryFilter(prev => ({ ...prev, category: 'consumable' }))}
              >
                消耗品
              </button>
              <button 
                className={`${styles.filterBtn} ${galleryFilter.category === 'material' ? styles.filterBtnActive : ''}`}
                onClick={() => setGalleryFilter(prev => ({ ...prev, category: 'material' }))}
              >
                材料
              </button>
            </div>
          </div>
          
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>稀有度:</span>
            <div className={styles.filterButtons}>
              <button 
                className={`${styles.filterBtn} ${!galleryFilter.rarity ? styles.filterBtnActive : ''}`}
                onClick={() => setGalleryFilter(prev => ({ ...prev, rarity: undefined }))}
              >
                全部
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(rarity => (
                <button 
                  key={rarity}
                  className={`${styles.filterBtn} ${galleryFilter.rarity === rarity ? styles.filterBtnActive : ''}`}
                  style={{ color: rarityColors[rarity] }}
                  onClick={() => setGalleryFilter(prev => ({ ...prev, rarity }))}
                >
                  {rarityNames[rarity]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 物品网格 */}
        <Spin spinning={galleryLoading}>
          <div className={styles.galleryGrid}>
            {galleryData.map((item) => (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <div className={styles.itemIcon}>
                    {item.icon ? (
                      <img src={item.icon} alt={item.name} />
                    ) : (
                      <div className={styles.itemIconPlaceholder}>
                        {item.category === 'equipment' ? '⚔️' : 
                         item.category === 'consumable' ? '🧪' : '💎'}
                      </div>
                    )}
                  </div>
                  <div 
                    className={styles.itemRarity}
                    style={{ 
                      backgroundColor: rarityColors[item.rarity || 1],
                      color: 'white'
                    }}
                  >
                    {rarityNames[item.rarity || 1]}
                  </div>
                </div>
                
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{item.name}</div>
                  <div className={styles.itemCategory}>
                    {categoryNames[item.category || ''] || item.category}
                  </div>
                  
                  {isValidNumber(item.levelReq) && (
                    <div className={styles.itemLevel}>等级需求: Lv.{item.levelReq}</div>
                  )}
                  
                  {/* 只有当有属性值大于0时才显示属性区域 */}
                  {(isValidNumber(item.baseAttack) || 
                    isValidNumber(item.baseDefense) || 
                    isValidNumber(item.baseHp)) && (
                    <div className={styles.itemStats}>
                      {isValidNumber(item.baseAttack) && (
                        <div className={styles.itemStat}>
                          <span className={styles.statIcon}>⚔️</span>
                          <span>攻击: {item.baseAttack}</span>
                        </div>
                      )}
                      {isValidNumber(item.baseDefense) && (
                        <div className={styles.itemStat}>
                          <span className={styles.statIcon}>🛡️</span>
                          <span>防御: {item.baseDefense}</span>
                        </div>
                      )}
                      {isValidNumber(item.baseHp) && (
                        <div className={styles.itemStat}>
                          <span className={styles.statIcon}>❤️</span>
                          <span>生命: {item.baseHp}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {item.description && (
                    <div className={styles.itemDescription}>
                      {item.description}
                    </div>
                  )}
                  
                  <div className={styles.itemFooter}>
                    {item.stackable === 1 && (
                      <span className={styles.itemTag}>可叠加</span>
                    )}
                    {isValidNumber(item.removePoint) && (
                      <span className={styles.itemPoints}>分解: {item.removePoint}积分</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {galleryData.length === 0 && !galleryLoading && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📦</div>
              <div className={styles.emptyText}>暂无物品数据</div>
            </div>
          )}
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
          <div 
            className={`${styles.gameTab} ${activeTab === 'gallery' ? styles.gameTabActive : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            <div className={styles.gameTabIcon}>
              <BookOutlined />
            </div>
            <div className={styles.gameTabText}>图鉴</div>
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
          {activeTab === 'gallery' && renderGalleryContent()}
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
