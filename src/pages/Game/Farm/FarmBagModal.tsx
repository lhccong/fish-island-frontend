import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Modal, Spin, Tag, Tooltip, Typography, message } from 'antd';
import dayjs from 'dayjs';
import {
  getMyBuffsUsingGet,
  purchaseBuffUsingPost,
  upgradeBuffUsingPost,
  type FarmBuffVO,
} from '@/services/backend/farmBuffController';
import {
  getMyCollectionUsingGet,
  type CollectionGradeGroupVO,
} from '@/services/backend/farmCollectionGradeController';
import {
  listFarmAchievementsUsingGet,
  claimFarmAchievementUsingPost,
  type FarmAchievementTaskVO,
} from '@/services/backend/farmAchievementController';
import './FarmBagModal.less';

const { Text } = Typography;

export type FarmBagTab = 'collection' | 'buff' | 'achievement';

const TABS: { key: FarmBagTab; label: string }[] = [
  { key: 'collection', label: '作物图鉴' },
  { key: 'buff', label: '农场道具' },
  { key: 'achievement', label: '成就' },
];

/** buff 道具图标（emoji 占位，后续可换切图） */
const BUFF_META: Record<number, { icon: string; intro: string }> = {
  1: { icon: '⚡', intro: '缩短作物成熟时间' },
  2: { icon: '🌾', intro: '收获积分产出提升' },
  3: { icon: '🛡️', intro: '降低被偷走的积分' },
  4: { icon: '🍀', intro: '提升高品级图鉴与大重量几率' },
};

const MAX_GRADE = 10;

const formatTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—';

type Props = {
  open: boolean;
  initialTab: FarmBagTab;
  /** bag=背包（纯展示：图鉴/道具/成就）；shop=商店（道具购买与升级） */
  mode: 'bag' | 'shop';
  onClose: () => void;
  /** 购买/升级/领取成功后通知父级刷新（积分等） */
  onDataChanged?: () => void;
};

const FarmBagModal: React.FC<Props> = ({
  open,
  initialTab,
  mode,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<FarmBagTab>(initialTab);
  const [loading, setLoading] = useState(false);

  const [buffs, setBuffs] = useState<FarmBuffVO[]>([]);
  const [collection, setCollection] = useState<CollectionGradeGroupVO[]>([]);
  const [achievements, setAchievements] = useState<FarmAchievementTaskVO[]>([]);

  const [actingBuff, setActingBuff] = useState<string>('');
  const [claimingId, setClaimingId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const loadBuffs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyBuffsUsingGet();
      if (res.code === 0 && res.data) {
        setBuffs(res.data);
      } else {
        message.error(res.message || '加载农场道具失败');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCollection = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyCollectionUsingGet();
      if (res.code === 0 && res.data) {
        setCollection(res.data);
      } else {
        message.error(res.message || '加载图鉴失败');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAchievements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFarmAchievementsUsingGet();
      if (res.code === 0 && res.data) {
        setAchievements(res.data);
      } else {
        message.error(res.message || '加载成就失败');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (activeTab === 'buff') loadBuffs();
    if (activeTab === 'collection') loadCollection();
    if (activeTab === 'achievement') loadAchievements();
  }, [open, activeTab, loadBuffs, loadCollection, loadAchievements]);

  const handlePurchase = useCallback(
    async (buff: FarmBuffVO) => {
      setActingBuff(`buy-${buff.buffType}`);
      try {
        const res = await purchaseBuffUsingPost({ buffType: buff.buffType });
        if (res.code === 0) {
          message.success(`${buff.name} 购买成功，已自动生效`);
          await loadBuffs();
          onDataChanged?.();
        } else {
          message.error(res.message || '购买失败');
        }
      } catch {
        message.error('购买失败');
      } finally {
        setActingBuff('');
      }
    },
    [loadBuffs, onDataChanged],
  );

  const handleUpgrade = useCallback(
    async (buff: FarmBuffVO) => {
      setActingBuff(`up-${buff.buffType}`);
      try {
        const res = await upgradeBuffUsingPost({ buffType: buff.buffType });
        if (res.code === 0) {
          message.success(`${buff.name} 升级成功`);
          await loadBuffs();
          onDataChanged?.();
        } else {
          message.error(res.message || '升级失败');
        }
      } catch {
        message.error('升级失败');
      } finally {
        setActingBuff('');
      }
    },
    [loadBuffs, onDataChanged],
  );

  const handleClaim = useCallback(
    async (task: FarmAchievementTaskVO) => {
      setClaimingId(task.taskId);
      try {
        const res = await claimFarmAchievementUsingPost({ taskId: task.taskId });
        if (res.code === 0) {
          message.success(`领取成功，获得 ${task.rewardValue} 积分`);
          await loadAchievements();
          onDataChanged?.();
        } else {
          message.error(res.message || '领取失败');
        }
      } catch {
        message.error('领取失败');
      } finally {
        setClaimingId(null);
      }
    },
    [loadAchievements, onDataChanged],
  );

  const totalUnlocked = useMemo(
    () => collection.reduce((sum, g) => sum + g.unlockedCount, 0),
    [collection],
  );

  const visibleTabs = mode === 'shop' ? TABS.filter((t) => t.key === 'buff') : TABS;

  const renderCollection = () =>
    collection.length === 0 ? (
      <Empty description="还没有图鉴记录，去收获作物解锁图鉴吧" />
    ) : (
      <div className="farm-bag-collection">
        <Text type="secondary" className="farm-bag-hint">
          已解锁 {totalUnlocked} 条图鉴 · 收获时随机获得，同品级仅记录最大重量
        </Text>
        {collection.map((group) => (
          <div key={group.cropId} className="farm-bag-crop-group">
            <div className="farm-bag-crop-head">
              <img className="farm-bag-crop-icon" src={group.cropIcon} alt="" />
              <div className="farm-bag-crop-title">
                <span className="farm-bag-crop-name">{group.cropName}</span>
                <span className="farm-bag-crop-progress">
                  {group.unlockedCount}/{MAX_GRADE}
                </span>
              </div>
              <div className="farm-bag-crop-bar">
                <span
                  className="farm-bag-crop-bar-fill"
                  style={{ width: `${Math.min(100, group.completePercent)}%` }}
                />
              </div>
            </div>
            <div className="farm-bag-grade-grid">
              {Array.from({ length: MAX_GRADE }, (_, i) => i + 1).map((grade) => {
                const entry = group.entries.find((e) => e.grade === grade);
                if (!entry) {
                  return (
                    <div key={grade} className="farm-bag-grade-cell is-locked">
                      <span className="farm-bag-grade-cell-icon">？</span>
                      <span className="farm-bag-grade-cell-grade">品级 {grade}</span>
                      <span className="farm-bag-grade-cell-weight">未解锁</span>
                    </div>
                  );
                }
                return (
                  <Tooltip
                    key={grade}
                    title={`首次解锁：${formatTime(entry.firstObtainedTime)}`}
                  >
                    <div className={`farm-bag-grade-cell is-unlocked grade-${grade}`}>
                      <span className="farm-bag-grade-cell-icon">
                        {entry.gradeIcon || group.cropIcon || '🌱'}
                      </span>
                      <span className="farm-bag-grade-cell-grade">品级 {grade}</span>
                      <span className="farm-bag-grade-cell-weight">
                        {entry.maxWeight}g
                      </span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );

  const renderBuffCard = (buff: FarmBuffVO) => {
    const meta = BUFF_META[buff.buffType] ?? { icon: '✨', intro: '' };
    const full = buff.owned && buff.level >= buff.maxLevel;
    const canUpgrade =
      buff.owned && !full && buff.upgradeThresholdSatisfied === true;
    const upgradeBlockedReason =
      !full && buff.upgradeThresholdSatisfied === false
        ? `需先解锁品级 ≥ ${buff.upgradeGradeThreshold} 的作物图鉴`
        : '';
    // 背包模式：仅展示，购买/升级操作在商店
    const showActions = mode === 'shop';
    return (
      <div key={buff.buffType} className="farm-bag-buff-card">
        <span className={`farm-bag-buff-icon owned-${buff.owned}`}>{meta.icon}</span>
        <div className="farm-bag-buff-info">
          <div className="farm-bag-buff-head">
            <span className="farm-bag-buff-name">{buff.name}</span>
            {buff.owned ? (
              <Tag color="green" className="farm-bag-buff-level">
                Lv.{buff.level}
              </Tag>
            ) : (
              <Tag className="farm-bag-buff-level">未拥有</Tag>
            )}
          </div>
          <div className="farm-bag-buff-desc">{meta.intro}</div>
          <div className="farm-bag-buff-effect">
            {buff.owned
              ? `当前：${buff.effectDesc ?? '—'}`
              : `购买后自动生效：Lv.1 ${BUFF_EFFECT_FIRST[buff.buffType] ?? ''}`}
          </div>
          {buff.owned && !full && buff.nextEffectDesc && (
            <div className="farm-bag-buff-next">
              下一级：{buff.nextEffectDesc}
              {showActions && (
                <span className="farm-bag-buff-cost">（{buff.upgradeCost ?? 0} 积分）</span>
              )}
              {!showActions && (
                <Text type="secondary"> · 前往商店升级</Text>
              )}
              {showActions && upgradeBlockedReason && (
                <Text type="warning" className="farm-bag-buff-threshold">
                  {' '}
                  · {upgradeBlockedReason}
                </Text>
              )}
            </div>
          )}
          {!buff.unlockQualified && !buff.owned && (
            <div className="farm-bag-buff-lock">{buff.unlockDesc}</div>
          )}
        </div>
        <div className="farm-bag-buff-action">
          {showActions && !buff.owned && (
            <Tooltip title={buff.unlockQualified ? '' : buff.unlockDesc}>
              <Button
                type="primary"
                size="small"
                disabled={!buff.unlockQualified}
                loading={actingBuff === `buy-${buff.buffType}`}
                onClick={() => handlePurchase(buff)}
              >
                购买 {buff.purchaseCost}积分
              </Button>
            </Tooltip>
          )}
          {showActions && buff.owned && !full && (
            <Tooltip title={canUpgrade ? '' : upgradeBlockedReason}>
              <Button
                type="primary"
                size="small"
                disabled={!canUpgrade}
                loading={actingBuff === `up-${buff.buffType}`}
                onClick={() => handleUpgrade(buff)}
              >
                升级 {buff.upgradeCost ?? 0}积分
              </Button>
            </Tooltip>
          )}
          {full && <Tag color="gold">已满级</Tag>}
        </div>
      </div>
    );
  };

  const renderAchievement = () =>
    achievements.length === 0 ? (
      <Empty description="暂无成就任务" />
    ) : (
      <div className="farm-bag-achievement-list">
        {achievements.map((task) => (
          <div key={task.taskId} className="farm-bag-achievement-item">
            <div className="farm-bag-achievement-info">
              <div className="farm-bag-achievement-name">
                {task.name}
                <span className="farm-bag-achievement-reward">
                  +{task.rewardValue} 积分
                </span>
              </div>
              <div className="farm-bag-achievement-desc">{task.description}</div>
            </div>
            <div className="farm-bag-achievement-action">
              {task.status === 0 && <Tag>进行中</Tag>}
              {task.status === 1 && (
                <Button
                  type="primary"
                  size="small"
                  loading={claimingId === task.taskId}
                  onClick={() => handleClaim(task)}
                >
                  领取
                </Button>
              )}
              {task.status === 2 && <Tag color="default">已领取</Tag>}
            </div>
          </div>
        ))}
      </div>
    );

  return (
    <Modal
      title={mode === 'shop' ? '农场商店' : '农场背包'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      className="farm-bag-modal"
      destroyOnClose
    >
      <div className="farm-bag-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`farm-bag-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Spin spinning={loading} wrapperClassName="farm-bag-spin">
        <div className="farm-bag-body">
          {activeTab === 'collection' && renderCollection()}
          {activeTab === 'buff' &&
            (buffs.length === 0 ? <Empty /> : buffs.map(renderBuffCard))}
          {activeTab === 'achievement' && renderAchievement()}
        </div>
      </Spin>
    </Modal>
  );
};

/** Lv1 效果文案（与后端 FarmBuffTypeEnum 一致，用于未拥有时的展示） */
const BUFF_EFFECT_FIRST: Record<number, string> = {
  1: '成熟时间 -10%',
  2: '积分产出 +10%',
  3: '被偷减免 -12%',
  4: '高品级几率 +10%',
};

export default FarmBagModal;
