import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Avatar, Badge, Spin, Modal, Pagination } from 'antd';
import { TrophyOutlined, CrownOutlined, HomeOutlined, BarChartOutlined, ThunderboltOutlined, BookOutlined, GiftOutlined } from '@ant-design/icons';
import { history, useSearchParams } from '@umijs/max';
import MoyuPet from '@/components/MoyuPet';
import Lottery from './Lottery';
import styles from './index.less';
import { getPetRankListUsingGet } from '@/services/backend/petRankController';
import { listItemTemplatesVoByPageUsingPost } from '@/services/backend/itemTemplatesController';
import { getBossListWithCacheUsingGet, getBossChallengeRankingUsingGet } from '@/services/backend/bossController';

const PetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabParam || 'pet');
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
  const [galleryCurrent, setGalleryCurrent] = useState<number>(1);
  const [galleryPageSize, setGalleryPageSize] = useState<number>(20);
  const [galleryTotal, setGalleryTotal] = useState<number>(0);

  // Boss相关状态
  const [bossData, setBossData] = useState<API.BossVO[]>([]);
  const [bossLoading, setBossLoading] = useState<boolean>(false);
  
  // Boss排行榜相关状态
  const [rankingModalVisible, setRankingModalVisible] = useState<boolean>(false);
  const [currentBossId, setCurrentBossId] = useState<number | null>(null);
  const [rankingData, setRankingData] = useState<API.BossChallengeRankingVO[]>([]);
  const [rankingLoading, setRankingLoading] = useState<boolean>(false);

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
        current: galleryCurrent,
        pageSize: galleryPageSize,
        ...galleryFilter
      });
      if (res.data?.records) {
        setGalleryData(res.data.records);
        setGalleryTotal(res.data.total || 0);
      }
    } catch (error) {
      console.error('获取图鉴数据失败:', error);
    } finally {
      setGalleryLoading(false);
    }
  };

  // 获取Boss数据
  const fetchBossData = async () => {
    setBossLoading(true);
    try {
      const res = await getBossListWithCacheUsingGet();
      if (res.data) {
        setBossData(res.data);
      }
    } catch (error) {
      console.error('获取Boss数据失败:', error);
    } finally {
      setBossLoading(false);
    }
  };

  // 获取Boss排行榜数据
  const fetchBossRanking = async (bossId: number) => {
    setRankingLoading(true);
    try {
      const res = await getBossChallengeRankingUsingGet({ bossId, limit: 20 });
      if (res.data) {
        setRankingData(res.data);
      }
    } catch (error) {
      console.error('获取Boss排行榜数据失败:', error);
    } finally {
      setRankingLoading(false);
    }
  };

  // 打开排行榜弹窗
  const handleOpenRanking = (bossId: number) => {
    setCurrentBossId(bossId);
    setRankingModalVisible(true);
    fetchBossRanking(bossId);
  };

  // 关闭排行榜弹窗
  const handleCloseRanking = () => {
    setRankingModalVisible(false);
    setCurrentBossId(null);
    setRankingData([]);
  };

  useEffect(() => {
    fetchRankData();
  }, []);

  // 筛选器变化时重置到第一页
  useEffect(() => {
    if (activeTab === 'gallery') {
      setGalleryCurrent(1);
    }
  }, [galleryFilter, activeTab]);

  useEffect(() => {
    if (activeTab === 'gallery') {
      fetchGalleryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, galleryFilter, galleryCurrent, galleryPageSize]);

  useEffect(() => {
    if (activeTab === 'boss') {
      fetchBossData();
    }
  }, [activeTab]);

  // 支持通过 URL 参数设置 tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['pet', 'ranking', 'boss', 'gallery', 'lottery'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
        
        {/* 分页组件 */}
        {galleryTotal > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
            <Pagination
              current={galleryCurrent}
              pageSize={galleryPageSize}
              total={galleryTotal}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 条`}
              onChange={(page, pageSize) => {
                setGalleryCurrent(page);
                if (pageSize !== galleryPageSize) {
                  setGalleryPageSize(pageSize);
                }
              }}
              onShowSizeChange={(current, size) => {
                setGalleryCurrent(1);
                setGalleryPageSize(size);
              }}
            />
          </div>
        )}
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
        
        <Spin spinning={bossLoading}>
          <div className={styles.bossGrid}>
            {bossData.map((boss) => (
              <div key={boss.id} className={styles.bossCard}>
                <div className={styles.bossAvatar}>
                  {boss.avatar ? (
                    <img src={boss.avatar} alt={boss.name} className={styles.bossImage} />
                  ) : (
                    <div className={styles.bossImage}>👔</div>
                  )}
                </div>
                <div className={styles.bossInfo}>
                  <div className={styles.bossName}>{boss.name || '未知BOSS'}</div>
                  <div className={styles.bossStats}>
                    <div className={styles.bossStat}>
                      <span className={styles.bossStatLabel}>血量:</span>
                      <span className={styles.bossStatValue}>{boss.health ?? 0}</span>
                    </div>
                    {boss.attack !== undefined && (
                      <div className={styles.bossStat}>
                        <span className={styles.bossStatLabel}>攻击:</span>
                        <span className={styles.bossStatValue}>{boss.attack}</span>
                      </div>
                    )}
                  </div>
                  {/* 新增战斗属性 */}
                  <div className={styles.bossExtraStats}>
                    {boss.critRate ? (
                      <span className={styles.extraStat} title="暴击率">💥{(boss.critRate * 100).toFixed(0)}%</span>
                    ) : null}
                    {boss.dodgeRate ? (
                      <span className={styles.extraStat} title="闪避率">💨{(boss.dodgeRate * 100).toFixed(0)}%</span>
                    ) : null}
                    {boss.blockRate ? (
                      <span className={styles.extraStat} title="格挡率">🛡️{(boss.blockRate * 100).toFixed(0)}%</span>
                    ) : null}
                    {boss.comboRate ? (
                      <span className={styles.extraStat} title="连击率">⚡{(boss.comboRate * 100).toFixed(0)}%</span>
                    ) : null}
                    {boss.lifesteal ? (
                      <span className={styles.extraStat} title="吸血">🩸{(boss.lifesteal * 100).toFixed(0)}%</span>
                    ) : null}
                  </div>
                  {boss.rewardPoints !== undefined && (
                    <div className={styles.bossRewards}>
                      <div className={styles.rewardTitle}>讨伐奖励:</div>
                      <div className={styles.rewardList}>
                        <span className={styles.reward}>💰 {boss.rewardPoints}摸鱼币</span>
                      </div>
                    </div>
                  )}
                  <div className={styles.bossActions}>
                    <button 
                      className={styles.challengeBtn} 
                      onClick={() => {
                        if (boss.id) {
                          history.push(`/pet/fight?bossId=${boss.id}`);
                        }
                      }}
                    >
                      联合讨伐
                    </button>
                    <button 
                      className={styles.rankingBtn} 
                      onClick={() => {
                        if (boss.id) {
                          handleOpenRanking(boss.id);
                        }
                      }}
                      title="查看排行榜"
                    >
                      <TrophyOutlined /> 排行榜
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {bossData.length === 0 && !bossLoading && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>⚔️</div>
                <div className={styles.emptyText}>暂无BOSS数据</div>
              </div>
            )}
          </div>
        </Spin>
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
          <div 
            className={`${styles.gameTab} ${activeTab === 'lottery' ? styles.gameTabActive : ''}`}
            onClick={() => setActiveTab('lottery')}
          >
            <div className={styles.gameTabIcon}>
              <GiftOutlined />
            </div>
            <div className={styles.gameTabText}>抽奖</div>
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
          {activeTab === 'lottery' && <Lottery />}
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

      {/* Boss排行榜弹窗 */}
      <Modal
        title={
          <div className={styles.rankingModalTitle}>
            <TrophyOutlined className={styles.rankingModalIcon} />
            <span>挑战排行榜</span>
          </div>
        }
        open={rankingModalVisible}
        onCancel={handleCloseRanking}
        footer={null}
        width={600}
        className={styles.rankingModal}
      >
        <Spin spinning={rankingLoading}>
          <div className={styles.bossRankingContainer}>
            {rankingData.length > 0 ? (
              <Table
                dataSource={rankingData}
                rowKey={(record, index) => `${record.userId}-${index}`}
                pagination={false}
                // 限制 Boss 排行榜表格高度
                scroll={{ y: 360 }}
                columns={[
                  {
                    title: '排名',
                    dataIndex: 'rank',
                    key: 'rank',
                    width: 80,
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
                    title: '玩家',
                    key: 'user',
                    render: (_, record: API.BossChallengeRankingVO) => (
                      <div className={styles.userInfo}>
                        <Avatar src={record.userAvatar} size={32} className={styles.userAvatar} />
                        <span className={styles.userName}>{record.userName || '未知用户'}</span>
                      </div>
                    )
                  },
                  {
                    title: '宠物',
                    key: 'pet',
                    render: (_, record: API.BossChallengeRankingVO) => (
                      <div className={styles.petInfo}>
                        <Avatar src={record.petAvatar} size={32} className={styles.petAvatar} />
                        <span className={styles.petName}>{record.petName || '未知宠物'}</span>
                      </div>
                    )
                  },
                  {
                    title: '伤害',
                    dataIndex: 'damage',
                    key: 'damage',
                    width: 120,
                    align: 'right',
                    render: (damage: number) => (
                      <span className={styles.damageValue}>{damage?.toLocaleString() || 0}</span>
                    )
                  }
                ]}
              />
            ) : (
              !rankingLoading && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📊</div>
                  <div className={styles.emptyText}>暂无排行榜数据</div>
                </div>
              )
            )}
          </div>
        </Spin>
      </Modal>
    </div>
  );
};

export default PetPage;
