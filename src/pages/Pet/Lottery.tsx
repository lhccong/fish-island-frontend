import React, { useState, useEffect } from 'react';
import { Card, Button, message, Empty, Modal, Progress, Spin } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import styles from './Lottery.less';
import {
  listTurntablesUsingGet,
  getTurntableDetailUsingGet,
  drawUsingPost,
  listDrawRecordsUsingGet,
} from '@/services/backend/turntableController';

interface LotteryRecord {
  id: number;
  prizeName: string;
  prizeIcon: string;
  drawTime: string;
  userName?: string;
  quality?: number;
  qualityName?: string;
}

interface Prize {
  id?: number;
  name?: string;
  icon?: string;
  quality?: number;
  qualityName?: string;
  probability?: number;
  prizeId?: number;
  prizeType?: number;
}

interface Turntable {
  id?: number;
  name?: string;
  icon?: string;
  costPoints?: number;
  guaranteeCount?: number;
  prizeList?: Prize[];
  userProgress?: {
    guaranteeCount?: number;
    lastDrawTime?: string;
    smallFailCount?: number;
    totalDrawCount?: number;
  };
}

const Lottery: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  // 计算可用积分
  const availablePoints = (currentUser?.points ?? 0) - (currentUser?.usedPoints ?? 0);

  const [loading, setLoading] = useState<boolean>(false);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedPrizeIndex, setSelectedPrizeIndex] = useState<number | null>(null);
  const [lotteryRecords, setLotteryRecords] = useState<LotteryRecord[]>([]);
  // 分页相关状态
  const [recordsPagination, setRecordsPagination] = useState({
    current: 1,
    pageSize: 13,
    total: 0,
  });
  const [isTenDraw, setIsTenDraw] = useState<boolean>(false);
  const [tenDrawResults, setTenDrawResults] = useState<LotteryRecord[]>([]);
  const [showTenDrawModal, setShowTenDrawModal] = useState<boolean>(false);

  // 转盘相关状态
  const [turntableList, setTurntableList] = useState<Turntable[]>([]);
  const [currentTurntable, setCurrentTurntable] = useState<Turntable | null>(null);
  const [activeTabKey, setActiveTabKey] = useState<string>('');
  const [turntableLoading, setTurntableLoading] = useState<boolean>(false);
  const [prizes, setPrizes] = useState<Prize[]>([]);

  // 获取转盘列表
  const fetchTurntableList = async () => {
    try {
      const res = await listTurntablesUsingGet({});
      if (res.data && res.data.length > 0) {
        setTurntableList(res.data);
        setActiveTabKey(String(res.data[0].id));
      }
    } catch (error) {
      console.error('获取转盘列表失败:', error);
    }
  };

  // 获取转盘详情
  const fetchTurntableDetail = async (id: number) => {
    setTurntableLoading(true);
    try {
      const res = await getTurntableDetailUsingGet({ id });
      if (res.data) {
        setCurrentTurntable(res.data);
        // 填充奖品到9宫格
        const prizeList = res.data.prizeList || [];
        // 确保有9个格子，不足的用占位符填充
        const filledPrizes: Prize[] = [];
        for (let i = 0; i < 9; i++) {
          if (prizeList[i]) {
            filledPrizes.push(prizeList[i]);
          } else {
            filledPrizes.push({ id: i, name: '暂无奖品', icon: '❓', quality: 0 });
          }
        }
        setPrizes(filledPrizes);
      }
    } catch (error) {
      console.error('获取转盘详情失败:', error);
    } finally {
      setTurntableLoading(false);
    }
  };

  useEffect(() => {
    fetchTurntableList();
  }, []);

  useEffect(() => {
    if (activeTabKey) {
      fetchTurntableDetail(Number(activeTabKey));
      // 获取当前转盘的抽奖记录
      fetchDrawRecords(Number(activeTabKey));
    }
  }, [activeTabKey]);

  // 获取抽奖记录
  const fetchDrawRecords = async (turntableId?: number, page: number = 1) => {
    try {
      const params: API.listDrawRecordsUsingGETParams = {
        current: page,
        pageSize: recordsPagination.pageSize,
        sortField: 'createTime',
        sortOrder: 'descend',
      };
      if (turntableId) {
        params.turntableId = turntableId;
      }
      const res = await listDrawRecordsUsingGet(params);
      if (res.data) {
        // 将 DrawRecordVO 转换为 LotteryRecord
        const records: LotteryRecord[] = (res.data.records || []).map((item) => ({
          id: item.id || Date.now(),
          prizeName: item.name || '',
          prizeIcon: item.icon || '🎁',
          drawTime: item.createTime || '',
          quality: item.quality,
          qualityName: item.qualityName,
        }));
        setLotteryRecords(records);
        // 更新分页信息
        setRecordsPagination((prev: { current: number; pageSize: number; total: number }) => ({
          ...prev,
          current: page,
          total: res.data?.total || 0,
        }));
      }
    } catch (error) {
      console.error('获取抽奖记录失败:', error);
    }
  };

  // 抽奖动画序列（9宫格外圈高亮顺序：0→1→2→5→8→7→6→3）
  const animationSequence = [0, 1, 2, 5, 8, 7, 6, 3];

  // 执行抽奖动画
  const runLotteryAnimation = async (targetIndex: number): Promise<void> => {
    return new Promise((resolve) => {
      let currentStep = 0;
      let speed = 80;
      let rounds = 3;
      let totalSteps = animationSequence.length * rounds + animationSequence.indexOf(targetIndex);

      const animate = () => {
        const sequenceIndex = currentStep % animationSequence.length;
        setActiveIndex(animationSequence[sequenceIndex]);
        currentStep++;

        if (currentStep <= totalSteps) {
          if (currentStep > totalSteps - 8) {
            speed += 60;
          }
          setTimeout(animate, speed);
        } else {
          setActiveIndex(targetIndex);
          setTimeout(() => {
            setActiveIndex(null);
            resolve();
          }, 300);
        }
      };

      animate();
    });
  };

  // 处理单次抽奖
  const handleDraw = async () => {
    if (drawing || !currentTurntable) return;

    setDrawing(true);
    setLoading(true);
    setIsTenDraw(false);

    try {
      // 调用抽奖接口
      const res = await drawUsingPost({
        turntableId: currentTurntable.id!,
        drawCount: 1,
      });

      if (res.data && res.data.prizeList && res.data.prizeList.length > 0) {
        const wonPrize = res.data.prizeList[0];

        // 找到奖品在9宫格中的位置
        const prizeIndex = prizes.findIndex(p => p.prizeId === wonPrize.prizeId || p.id === wonPrize.prizeId);
        const targetIndex = prizeIndex >= 0 ? prizeIndex : animationSequence[Math.floor(Math.random() * animationSequence.length)];

        await runLotteryAnimation(targetIndex);

        message.success(`恭喜获得：${wonPrize.name}！`);

        const newRecord: LotteryRecord = {
          id: Date.now(),
          prizeName: wonPrize.name || '',
          prizeIcon: wonPrize.icon || '🎁',
          drawTime: new Date().toLocaleString('zh-CN'),
          quality: wonPrize.quality,
          qualityName: wonPrize.qualityName,
        };
        setLotteryRecords(prev => [newRecord, ...prev]);

        // 刷新转盘详情和抽奖记录
        if (currentTurntable.id) {
          fetchTurntableDetail(currentTurntable.id);
          fetchDrawRecords(currentTurntable.id);
        }
      }
    } catch (error: any) {
      console.error('抽奖失败:', error);
      message.error(error?.message || '抽奖失败，请稍后重试');
    } finally {
      setLoading(false);
      setDrawing(false);
    }
  };

  // 处理十连抽
  const handleTenDraw = async () => {
    if (drawing || !currentTurntable) return;

    setDrawing(true);
    setIsTenDraw(true);
    setLoading(true);

    try {
      // 调用抽奖接口
      const res = await drawUsingPost({
        turntableId: currentTurntable.id!,
        drawCount: 10,
      });

      if (res.data && res.data.prizeList && res.data.prizeList.length > 0) {
        const results: LotteryRecord[] = res.data.prizeList.map((prize, index) => ({
          id: Date.now() + index,
          prizeName: prize.name || '',
          prizeIcon: prize.icon || '🎁',
          drawTime: new Date().toLocaleString('zh-CN'),
          quality: prize.quality,
          qualityName: prize.qualityName,
        }));

        // 播放一次动画
        const lastPrize = res.data.prizeList[res.data.prizeList.length - 1];
        const prizeIndex = prizes.findIndex(p => p.prizeId === lastPrize.prizeId || p.id === lastPrize.prizeId);
        const targetIndex = prizeIndex >= 0 ? prizeIndex : animationSequence[Math.floor(Math.random() * animationSequence.length)];
        await runLotteryAnimation(targetIndex);

        setTenDrawResults(results);
        setShowTenDrawModal(true);
        setLotteryRecords(prev => [...results, ...prev]);

        // 刷新转盘详情和抽奖记录
        if (currentTurntable.id) {
          fetchTurntableDetail(currentTurntable.id);
          fetchDrawRecords(currentTurntable.id);
        }
      }
    } catch (error: any) {
      console.error('十连抽失败:', error);
      message.error(error?.message || '十连抽失败，请稍后重试');
    } finally {
      setLoading(false);
      setDrawing(false);
      setIsTenDraw(false);
    }
  };

  // 处理分页变化
  const handlePageChange = (page: number) => {
    if (currentTurntable?.id) {
      fetchDrawRecords(currentTurntable.id, page);
    }
  };

  const handleCloseTenDrawModal = () => {
    setShowTenDrawModal(false);
    setTenDrawResults([]);
  };

  // 判断是否每日第一次免费
  const isDailyFirstFree = React.useMemo(() => {
    if (!currentTurntable?.userProgress?.lastDrawTime) return true;
    const lastDraw = new Date(currentTurntable.userProgress.lastDrawTime);
    const today = new Date();
    return lastDraw.toDateString() !== today.toDateString();
  }, [currentTurntable?.userProgress?.lastDrawTime]);

  const getQualityClass = (quality?: number) => {
    switch (quality) {
      case 4: return styles.rarityLegendary;
      case 3: return styles.rarityEpic;
      case 2: return styles.rarityRare;
      default: return styles.rarityCommon;
    }
  };

  return (
    <div className={styles.lotteryContainer}>
      {/* 顶部货币显示 */}
      <div className={styles.currencyBar}>
        <div className={styles.currencyItem}>
          <span className={styles.currencyIcon}>💎</span>
          <span className={styles.currencyValue}>{availablePoints}</span>
        </div>
      </div>

      <div className={styles.lotteryContent}>
        {/* 左侧9宫格区域 */}
        <div className={styles.leftSection}>
          {/* 转盘Tab切换 */}
          {turntableList.length > 0 && (
            <div className={styles.turntableTabs}>
              {turntableList.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.turntableTab} ${activeTabKey === String(item.id) ? styles.turntableTabActive : ''}`}
                  onClick={() => setActiveTabKey(String(item.id))}
                >
                  {item.icon && (
                    <img src={item.icon} alt={item.name || ''} className={styles.turntableTabIcon} />
                  )}
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          )}



          <Spin spinning={turntableLoading}>
            <div className={styles.gridContainer}>
              <div className={styles.prizeGrid}>
                {prizes.map((prize, index) => (
                  <div
                    key={prize.id}
                    className={`${styles.prizeItem} ${getQualityClass(prize.quality)} ${
                      activeIndex === index ? styles.active : ''
                    }`}
                  >
                    <div className={styles.prizeIcon}>
                      {prize.icon?.startsWith('http') ? (
                        <img
                          src={prize.icon}
                          alt={prize.name || ''}
                          className={`${styles.prizeIconImg} ${prize.quality === 4 ? styles.prizeIconShine : ''}`}
                        />
                      ) : (
                        prize.icon
                      )}
                    </div>
                    <div className={styles.prizeName}>{prize.name}</div>
                    {prize.qualityName && (
                      <div className={styles.prizeQuality}>{prize.qualityName}</div>
                    )}
                  </div>
                ))}
              </div>

            {/* 抽奖按钮放下面 */}
            <div className={styles.drawButtonsContainer}>
              <Button
                className={styles.singleDrawBtn}
                onClick={handleDraw}
                disabled={drawing || !currentTurntable}
              >
                <span>单抽</span>
                <span className={styles.btnCost}>
                  {isDailyFirstFree ? (
                    <span className={styles.freeTag}>🎁 免费</span>
                  ) : (
                    <>💎 {currentTurntable?.costPoints || 0}</>
                  )}
                </span>
              </Button>
              <Button
                className={styles.tenDrawBtn}
                onClick={handleTenDraw}
                disabled={drawing || !currentTurntable}
              >
                <span>十连抽</span>
                <span className={styles.btnCost}>💎 {(currentTurntable?.costPoints || 0) * 10}</span>
              </Button>
            </div>
          </div>

          {/* 保底进度 */}
          {currentTurntable?.guaranteeCount && currentTurntable.guaranteeCount > 0 && (
            <>
              <div className={styles.luckyBar}>
                <span className={styles.luckyLabel}>保底进度</span>
                <Progress
                  percent={((currentTurntable.userProgress?.totalDrawCount || 0) / currentTurntable.guaranteeCount) * 100}
                  showInfo={false}
                  strokeColor="linear-gradient(90deg, #ff8c42 0%, #ffa768 100%)"
                  trailColor="#e8e8e8"
                  className={styles.luckyProgress}
                />
                <span className={styles.luckyValue}>
                  {currentTurntable.userProgress?.totalDrawCount || 0}/{currentTurntable.guaranteeCount}
                </span>
              </div>
              <div className={styles.luckyTip}>
                * 抽奖{currentTurntable.guaranteeCount}次必出传说奖励
              </div>
            </>
          )}
          </Spin>
        </div>

        {/* 右侧区域 */}
        <div className={styles.rightSection}>
          {/* 我的中奖记录 */}
          <Card className={styles.winnersCard}>
            <div className={styles.winnersTitle}>
              <span className={styles.winnersIcon}>🏆</span>
              <span>我的中奖记录</span>
            </div>
            <div className={styles.winnersList}>
              {lotteryRecords.length === 0 ? (
                <Empty
                  description="暂无中奖记录"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  className={styles.emptyRecords}
                />
              ) : (
                <>
                  {lotteryRecords.map((record) => (
                    <div key={record.id} className={styles.winnerItem}>
                      <div className={styles.winnerIcon}>
                        {record.prizeIcon?.startsWith('http') ? (
                          <img src={record.prizeIcon} alt={record.prizeName} className={styles.winnerIconImg} />
                        ) : (
                          record.prizeIcon
                        )}
                      </div>
                      <div className={styles.winnerInfo}>
                        <span className={styles.winnerLabel}>恭喜</span>
                        <span className={styles.winnerName}>我</span>
                        <span className={styles.winnerLabel}>抽中</span>
                        <span className={styles.winnerPrize}>{record.prizeName}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            {/* 分页 */}
            {recordsPagination.total > recordsPagination.pageSize && (
              <div className={styles.pagination}>
                <span
                  className={styles.pageArrow}
                  onClick={() => handlePageChange(recordsPagination.current - 1)}
                  style={{ visibility: recordsPagination.current > 1 ? 'visible' : 'hidden' }}
                >
                  {'<'}
                </span>
                <span className={`${styles.pageNum} ${styles.pageActive}`}>
                  {recordsPagination.current}
                </span>
                <span>/</span>
                <span className={styles.pageNum}>
                  {Math.ceil(recordsPagination.total / recordsPagination.pageSize)}
                </span>
                <span
                  className={styles.pageArrow}
                  onClick={() => handlePageChange(recordsPagination.current + 1)}
                  style={{
                    visibility:
                      recordsPagination.current < Math.ceil(recordsPagination.total / recordsPagination.pageSize)
                        ? 'visible'
                        : 'hidden',
                  }}
                >
                  {'>'}
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 十连抽结果弹窗 */}
      <Modal
        title={
          <div className={styles.modalTitle}>
            <GiftOutlined className={styles.modalTitleIcon} />
            <span>十连抽结果</span>
          </div>
        }
        open={showTenDrawModal}
        onCancel={handleCloseTenDrawModal}
        footer={[
          <Button key="confirm" type="primary" onClick={handleCloseTenDrawModal}>
            确定
          </Button>
        ]}
        width={750}
        className={styles.tenDrawModal}
      >
        <div className={styles.tenDrawResults}>
          {tenDrawResults.map((result) => (
            <div key={result.id} className={styles.resultItem}>
              <div className={styles.resultIcon}>
                {result.prizeIcon?.startsWith('http') ? (
                  <img src={result.prizeIcon} alt={result.prizeName} className={styles.resultIconImg} />
                ) : (
                  result.prizeIcon
                )}
              </div>
              <div className={styles.resultName}>{result.prizeName}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Lottery;
