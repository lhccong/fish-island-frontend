import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Tabs, Button, Progress, Card, Avatar, Row, Col, Input, Form, message, Tooltip, Popover, Spin, Radio, Pagination, Divider, Tag, Badge } from 'antd';
import {
  HeartOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  GiftOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  SkinOutlined,
  SmileOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  SafetyOutlined,
  StarOutlined,
  CrownOutlined,
  FireOutlined,
  ToolOutlined,
  LockOutlined,
  UnlockOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import styles from './index.less';
import { getPetDetailUsingGet, createPetUsingPost, feedPetUsingPost, patPetUsingPost, updatePetNameUsingPost, getOtherUserPetUsingGet } from '@/services/backend/fishPetController';
import { listPetSkinsUsingGet, exchangePetSkinUsingPost, setPetSkinUsingPost } from '@/services/backend/petSkinController';
import { listMyItemInstancesByPageUsingPost, decomposeItemInstanceUsingPost, equipItemUsingPost, unequipItemUsingPost, batchDecomposeBlueGreenEquipmentsUsingPost } from '@/services/backend/itemInstancesController';
import { getForgeDetailUsingPost, upgradeEquipUsingPost, refreshEntriesUsingPost, lockEntriesUsingPost } from '@/services/backend/petEquipForgeController';
import { useModel, history } from '@umijs/max';

export interface PetInfo {
  id: string;
  name: string;
  level: number;
  exp: number;
  maxExp: number;
  hunger: number;
  maxHunger: number;
  mood: number;
  maxMood: number;
  avatar: string;
  skills: PetSkill[];
  items: PetItem[];
  achievements: PetAchievement[];
}

interface PetSkill {
  id: string;
  name: string;
  description: string;
  level: number;
  icon: string;
}

interface PetItem {
  id: string;
  name: string;
  description: string;
  count: number;
  icon: string;
  type: 'food' | 'toy' | 'special';
}

interface PetAchievement {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  icon: string;
  progress: number;
  maxProgress: number;
}

interface MoyuPetProps {
  visible?: boolean;
  onClose?: () => void;
  otherUserId?: number; // 添加查看其他用户宠物的ID
  otherUserName?: string; // 其他用户的名称
  isPageComponent?: boolean; // 是否作为页面组件直接显示，而不是弹窗
}

// 装备属性 Tooltip 渲染函数
const renderEquipStatsTooltip = (equippedItem: API.ItemInstanceVO, slotName: string, actionText?: string) => {
  const rarityNames: Record<number, string> = {
    1: '优良',
    2: '精良',
    3: '史诗',
    4: '传说',
    5: '神话',
    6: '至尊',
    7: '神器',
  };

  const rarity = equippedItem?.template?.rarity || 1;
  const rarityName = rarityNames[rarity] || '未知';
  const itemName = equippedItem?.template?.name || slotName;
  const enhanceLevel = equippedItem?.enhanceLevel || 0;
  const stats = equippedItem?.equipStats;

  if (!stats) {
    return (
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          {itemName} {enhanceLevel > 0 && <span style={{ color: '#faad14' }}>+{enhanceLevel}</span>}
        </div>
        <div style={{ color: '#999', fontSize: '12px' }}>暂无属性信息</div>
        <div style={{ marginTop: '8px', color: '#1890ff', fontSize: '12px' }}>点击卸下</div>
      </div>
    );
  }

  const statItems = [
    { key: 'baseAttack', label: '攻击力', value: stats.baseAttack },
    { key: 'baseDefense', label: '防御力', value: stats.baseDefense },
    { key: 'baseHp', label: '生命值', value: stats.baseHp },
    { key: 'baseSpeed', label: '速度', value: stats.baseSpeed },
    { key: 'critRate', label: '暴击率', value: stats.critRate, isPercent: true },
    { key: 'critResistance', label: '暴击抗性', value: stats.critResistance, isPercent: true },
    { key: 'dodgeRate', label: '闪避率', value: stats.dodgeRate, isPercent: true },
    { key: 'dodgeResistance', label: '闪避抗性', value: stats.dodgeResistance, isPercent: true },
    { key: 'comboRate', label: '连击率', value: stats.comboRate, isPercent: true },
    { key: 'comboResistance', label: '连击抗性', value: stats.comboResistance, isPercent: true },
    { key: 'blockRate', label: '格挡率', value: stats.blockRate, isPercent: true },
    { key: 'blockResistance', label: '格挡抗性', value: stats.blockResistance, isPercent: true },
    { key: 'lifesteal', label: '生命偷取', value: stats.lifesteal, isPercent: true },
    { key: 'lifestealResistance', label: '吸血抗性', value: stats.lifestealResistance, isPercent: true },
  ].filter((item): item is { key: string; label: string; value: number; isPercent?: boolean } =>
    item.value !== undefined && item.value !== null
  );

  return (
    <div style={{ minWidth: '180px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
        <span style={{ color: rarity === 7 ? '#fadb14' : rarity === 6 ? '#eb2f96' : rarity === 5 ? '#f5222d' : rarity === 4 ? '#fa8c16' : rarity === 3 ? '#722ed1' : rarity === 2 ? '#1890ff' : '#52c41a' }}>
          [{rarityName}]
        </span>{' '}
        {itemName}
        {enhanceLevel > 0 && <span style={{ color: '#faad14', marginLeft: '4px' }}>+{enhanceLevel}</span>}
      </div>
      {statItems.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '12px' }}>
          {statItems.map(stat => {
            const value = stat.value;
            const displayValue = stat.isPercent ? Number((value * 100).toFixed(2)) : value;
            return (
            <div key={stat.key}>
              <span style={{ color: '#666' }}>{stat.label}:</span>{' '}
              <span style={{ color: value > 0 ? '#52c41a' : value < 0 ? '#ff4d4f' : '#666', fontWeight: 'bold' }}>
                {value > 0 ? '+' : ''}{displayValue}{stat.isPercent ? '%' : ''}
              </span>
            </div>
            );
          })}
        </div>
      ) : (
        <div style={{ color: '#999', fontSize: '12px' }}>无额外属性</div>
      )}
      {actionText && (
        <div style={{ marginTop: '8px', paddingTop: '4px', borderTop: '1px solid #eee', color: '#1890ff', fontSize: '12px' }}>
          {actionText}
        </div>
      )}
    </div>
  );
};
const PetRules = () => (
  <div className={styles.petRules}>
    <h3>宠物系统规则</h3>
    <div className={styles.ruleSection}>
      <h4>经验与等级</h4>
      <ul>
        <li>宠物每小时自动获得1点经验值</li>
        <li>每积累100点经验值可升一级</li>
        <li>如果饥饿度和心情值都为0，宠物将不会获得经验值</li>
      </ul>
    </div>
    <div className={styles.ruleSection}>
      <h4>互动操作</h4>
      <ul>
        <li>喂食：增加20点饥饿度、5点心情值和1点经验值，消耗5积分</li>
        <li>抚摸：增加15点心情值和1点经验值，消耗3积分</li>
        <li>互动操作没有冷却时间限制</li>
        <li>修改名称：消耗100积分</li>
      </ul>
    </div>
    <div className={styles.ruleSection}>
      <h4>积分获取</h4>
      <ul>
        <li>宠物每天自动产出积分，积分数量等于宠物等级</li>
        <li>每天最高可获得10积分</li>
        <li>如果饥饿度和心情值都为0，宠物将不会产出积分</li>
      </ul>
    </div>
    <div className={styles.ruleSection}>
      <h4>宠物系统</h4>
      <ul>
        <li>可以在商店中使用积分购买不同的宠物</li>
        <li>已购买的宠物会显示在宠物馆中，可以随时切换使用</li>
        <li>宠物一旦购买成功，永久拥有</li>
      </ul>
    </div>
  </div>
);

// 商店 Tab 组件
interface ShopTabsProps {
  renderSkinsList: (showAll: boolean) => React.ReactNode;
}

const ShopTabs: React.FC<ShopTabsProps> = ({ renderSkinsList }) => {
  const [shopType, setShopType] = useState<'skin' | 'props'>('skin');

  return (
    <div className={styles.shopContainer}>
      <div className={styles.shopTypeSelector}>
        <Radio.Group
          value={shopType}
          onChange={(e) => setShopType(e.target.value)}
          buttonStyle="solid"
          size="large"
        >
          <Radio.Button value="skin">
            <SkinOutlined /> 宠物商店
          </Radio.Button>
          <Radio.Button value="props">
            <GiftOutlined /> 道具商店
          </Radio.Button>
        </Radio.Group>
      </div>

      <div className={styles.shopContent}>
        {shopType === 'skin' ? (
          renderSkinsList(true)
        ) : (
          <div className={styles.shopEmpty}>
            <div className={styles.emptyIcon}>🛒</div>
            <div className={styles.emptyText}>更多道具即将上架，敬请期待！</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── 装备强化弹窗辅助常量 ──────────────────────────────────────────────────────
const ENTRY_GRADE_COLOR: Record<number, string> = {
  1: '#8c8c8c', 2: '#1890ff', 3: '#722ed1', 4: '#fa8c16', 5: '#f5222d',
};

// 强化 tier → 角标背景色（用于无法命中 CSS Modules scoped class 的场景）
const ENHANCE_BADGE_BG: Record<number, string> = {
  1: 'linear-gradient(135deg, #e0e0e0 0%, #9e9e9e 100%)',
  2: 'linear-gradient(135deg, #ffe57f 0%, #ffa000 100%)',
  3: 'linear-gradient(135deg, #ce93d8 0%, #7b1fa2 100%)',
  4: 'linear-gradient(135deg, #ff6f00 0%, #ff1744 100%)',
  5: 'linear-gradient(135deg, #f44336, #ff9800, #ffeb3b, #4caf50, #2196f3, #9c27b0)',
};

// 强化等级 → 视觉 tier（用于角标颜色和装备框特效）
// tier1: +1~+3  tier2: +4~+6  tier3: +7~+9  tier4: +10~+14  tier5: +15+
const getEnhanceTier = (level: number): number => {
  if (level <= 0) return 0;
  if (level <= 3) return 1;
  if (level <= 6) return 2;
  if (level <= 9) return 3;
  if (level <= 14) return 4;
  return 5;
};
const ENTRY_GRADE_NAME: Record<number, string> = { 1: '白', 2: '蓝', 3: '紫', 4: '金', 5: '红' };
const ENTRY_ATTR_NAME: Record<string, string> = {
  attack: '攻击力', defense: '防御力', hp: '生命值', maxHp: '生命值', speed: '速度',
  critRate: '暴击率', critResistance: '暴击抗性', antiCrit: '暴击抗性',
  dodgeRate: '闪避率', dodgeResistance: '闪避抗性', antiDodge: '闪避抗性',
  comboRate: '连击率', comboResistance: '连击抗性', antiCombo: '连击抗性',
  blockRate: '格挡率', blockResistance: '格挡抗性', antiBlock: '格挡抗性',
  lifesteal: '生命偷取', lifestealResistance: '吸血抗性', antiLifesteal: '吸血抗性',
};
const IS_PERCENT_ATTR = (attr: string) =>
  ['critRate','critResistance','antiCrit',
   'dodgeRate','dodgeResistance','antiDodge',
   'comboRate','comboResistance','antiCombo',
   'blockRate','blockResistance','antiBlock',
   'lifesteal','lifestealResistance','antiLifesteal'].includes(attr);

interface ForgeModalProps {
  visible: boolean;
  slotName: string;
  detail: API.PetEquipForgeDetailVO | null;
  detailLoading: boolean;
  upgradeLoading: boolean;
  refreshLoading: boolean;
  lockLoading: boolean;
  lockedEntries: number[];
  onClose: () => void;
  onUpgrade: () => void;
  onRefresh: () => void;
  onToggleLock: (entryIndex: number) => void;
}

const ForgeModal: React.FC<ForgeModalProps> = React.memo(({
  visible, slotName, detail, detailLoading, upgradeLoading, refreshLoading,
  lockLoading, lockedEntries, onClose, onUpgrade, onRefresh, onToggleLock,
}) => {
  const entries = detail
    ? [detail.entry1, detail.entry2, detail.entry3, detail.entry4]
    : [];

  return (
    <Modal
      title={
        <span>
          <ToolOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
          装备强化 - {slotName}
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <Spin spinning={detailLoading}>
        {detail ? (
          <div>
            {/* 装备等级 */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 'bold', fontSize: 15 }}>
                装备等级：
                <Tag color="blue" style={{ fontSize: 14, padding: '2px 10px' }}>
                  Lv.{detail.equipLevel ?? 0}
                </Tag>
              </span>
              {detail.maxLevel && <Tag color="gold">已达最高等级</Tag>}
            </div>

            <Divider style={{ margin: '12px 0' }}>词条属性</Divider>

            {/* 词条列表 */}
            <div style={{ marginBottom: 16 }}>
              {entries.map((entry, idx) => {
                if (!entry) return null;
                const entryNum = idx + 1;
                const isLocked = lockedEntries.includes(entryNum);
                const attrName = ENTRY_ATTR_NAME[entry.attr || ''] || entry.attr || '未知';
                const isPercent = IS_PERCENT_ATTR(entry.attr || '');
                const displayVal = isPercent
                  ? `${Number((( entry.value || 0) * 100).toFixed(2))}%`
                  : `+${entry.value}`;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', marginBottom: 8, borderRadius: 8,
                      border: `1px solid ${isLocked ? '#fa8c16' : '#f0f0f0'}`,
                      background: isLocked ? '#fffbe6' : '#fafafa',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag color={ENTRY_GRADE_COLOR[entry.grade || 1]} style={{ minWidth: 28, textAlign: 'center' }}>
                        {ENTRY_GRADE_NAME[entry.grade || 1]}
                      </Tag>
                      <span style={{ fontWeight: 500 }}>{attrName}</span>
                      <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{displayVal}</span>
                    </div>
                    <Tooltip title={isLocked ? '点击解锁（刷新时不消耗额外积分）' : '点击锁定（刷新时额外消耗50积分）'}>
                      <Button
                        size="small"
                        type={isLocked ? 'primary' : 'default'}
                        icon={isLocked ? <LockOutlined /> : <UnlockOutlined />}
                        loading={lockLoading}
                        onClick={() => onToggleLock(entryNum)}
                        style={{ borderColor: isLocked ? '#fa8c16' : undefined, color: isLocked ? '#fa8c16' : undefined }}
                        ghost={isLocked}
                      >
                        {isLocked ? '已锁定' : '锁定'}
                      </Button>
                    </Tooltip>
                  </div>
                );
              })}
              {entries.every(e => !e) && (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>暂无词条，升级后解锁</div>
              )}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* 升级信息 */}
            {!detail.maxLevel && (
              <div style={{ marginBottom: 16, padding: '12px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>升级消耗：<strong style={{ color: '#fa8c16' }}>{detail.nextUpgradeCost} 积分</strong></span>
                  <span>成功概率：<strong style={{ color: '#1890ff' }}>{detail.successRate}%</strong></span>
                </div>
                <Button
                  type="primary"
                  icon={<ArrowUpOutlined />}
                  loading={upgradeLoading}
                  onClick={onUpgrade}
                  block
                  style={{ background: 'linear-gradient(135deg, #fa8c16, #faad14)', border: 'none' }}
                >
                  升级强化（消耗 {detail.nextUpgradeCost} 积分）
                </Button>
              </div>
            )}

            {/* 刷新词条 */}
            <div style={{ padding: '12px', background: '#e6f7ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
              <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
                刷新词条消耗 <strong>100 积分</strong>，已锁定的词条不会被刷新，每锁定一条额外 +50 积分
              </div>
              <Button icon={<FireOutlined />} loading={refreshLoading} onClick={onRefresh} block>
                刷新词条
              </Button>
            </div>
          </div>
        ) : (
          !detailLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <ToolOutlined style={{ fontSize: 40, marginBottom: 12 }} />
              <div>暂无强化数据，请先穿戴装备</div>
            </div>
          )
        )}
      </Spin>
    </Modal>
  );
});

// ── 只读词条查看弹窗（查看他人装备时使用）────────────────────────────────────
interface ViewForgeModalProps {
  visible: boolean;
  slotName: string;
  detail: API.PetEquipForgeDetailVO | null;
  loading: boolean;
  onClose: () => void;
}

const ViewForgeModal: React.FC<ViewForgeModalProps> = React.memo(({ visible, slotName, detail, loading, onClose }) => {
  const entries = detail
    ? [detail.entry1, detail.entry2, detail.entry3, detail.entry4]
    : [];

  return (
    <Modal
      title={
        <span>
          <SafetyOutlined style={{ marginRight: 8, color: '#722ed1' }} />
          装备词条 - {slotName}
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
    >
      <Spin spinning={loading}>
        {detail ? (
          <div>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 'bold' }}>
                装备等级：
                <Tag color="blue">Lv.{detail.equipLevel ?? 0}</Tag>
              </span>
              {detail.maxLevel && <Tag color="gold">已达最高等级</Tag>}
            </div>
            <Divider style={{ margin: '10px 0' }}>词条属性</Divider>
            {entries.map((entry, idx) => {
              if (!entry) return null;
              const attrName = ENTRY_ATTR_NAME[entry.attr || ''] || entry.attr || '未知';
              const isPercent = IS_PERCENT_ATTR(entry.attr || '');
              const displayVal = isPercent
                ? `${Number((( entry.value || 0) * 100).toFixed(2))}%`
                : `+${entry.value}`;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', marginBottom: 8, borderRadius: 8,
                    border: `1px solid ${entry.locked ? '#fa8c16' : '#f0f0f0'}`,
                    background: entry.locked ? '#fffbe6' : '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color={ENTRY_GRADE_COLOR[entry.grade || 1]} style={{ minWidth: 28, textAlign: 'center' }}>
                      {ENTRY_GRADE_NAME[entry.grade || 1]}
                    </Tag>
                    <span style={{ fontWeight: 500 }}>{attrName}</span>
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{displayVal}</span>
                  </div>
                  {entry.locked && (
                    <Tag icon={<LockOutlined />} color="warning">已锁定</Tag>
                  )}
                </div>
              );
            })}
            {entries.every(e => !e) && (
              <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>暂无词条</div>
            )}
          </div>
        ) : (
          !loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <SafetyOutlined style={{ fontSize: 40, marginBottom: 12 }} />
              <div>暂无词条数据</div>
            </div>
          )
        )}
      </Spin>
    </Modal>
  );
});

const MoyuPet: React.FC<MoyuPetProps> = ({ visible, onClose, otherUserId, otherUserName, isPageComponent = false }) => {
  const { initialState } = useModel('@@initialState');
  const [pet, setPet] = useState<API.PetVO | API.OtherUserPetVO | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [petName, setPetName] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [patLoading, setPatLoading] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isOtherUserEmptyPet, setIsOtherUserEmptyPet] = useState(false); // 添加状态来跟踪是否是其他用户的空宠物状态
  const isOtherUser = !!otherUserId; // 是否查看其他用户的宠物
  const [skins, setSkins] = useState<API.PetSkinVO[]>([]);
  const [skinLoading, setSkinLoading] = useState(false);
  const [exchangeLoading, setExchangeLoading] = useState<number | null>(null);
  const [setCurrentSkinLoading, setSetCurrentSkinLoading] = useState<number | null>(null);

  // 物品列表相关状态
  const [items, setItems] = useState<API.ItemInstanceVO[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsCurrent, setItemsCurrent] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(30);
  const [decomposeLoading, setDecomposeLoading] = useState<number | null>(null); // 分解中的物品ID
  const [batchDecomposeLoading, setBatchDecomposeLoading] = useState(false); // 批量分解加载状态
  const [equipLoading, setEquipLoading] = useState<number | null>(null); // 穿戴中的物品ID
  const [unequipLoading, setUnequipLoading] = useState<string | null>(null); // 卸下中的装备槽位
  const [contextMenuItemId, setContextMenuItemId] = useState<number | null>(null); // 右键菜单显示的物品ID
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 }); // 右键菜单位置

  // 装备强化相关状态
  const [forgeModalVisible, setForgeModalVisible] = useState(false);
  const [forgeSlot, setForgeSlot] = useState<number | null>(null); // 当前强化的装备槽位编号
  const [forgeSlotName, setForgeSlotName] = useState<string>(''); // 当前强化的装备槽位名称
  const [forgeDetail, setForgeDetail] = useState<API.PetEquipForgeDetailVO | null>(null);
  const [forgeDetailLoading, setForgeDetailLoading] = useState(false);
  const [forgeUpgradeLoading, setForgeUpgradeLoading] = useState(false);
  const [forgeRefreshLoading, setForgeRefreshLoading] = useState(false);
  const [lockedEntries, setLockedEntries] = useState<number[]>([]); // 锁定的词条序号
  const [forgeLockLoading, setForgeLockLoading] = useState(false);
  // 装备格右键菜单
  const [equipSlotContextMenu, setEquipSlotContextMenu] = useState<{ slot: string; slotNum: number; x: number; y: number } | null>(null);
  // 查看他人装备词条弹窗
  const [viewForgeModalVisible, setViewForgeModalVisible] = useState(false);
  const [viewForgeDetail, setViewForgeDetail] = useState<API.PetEquipForgeDetailVO | null>(null);
  const [viewForgeSlotName, setViewForgeSlotName] = useState('');
  const [viewForgeLoading, setViewForgeLoading] = useState(false);

  // 获取宠物数据
  const fetchPetData = async () => {
    setLoading(true);
    try {
      if (isOtherUser && otherUserId) {
        // 获取其他用户的宠物信息
        const res = await getOtherUserPetUsingGet({ otherUserId });
        if (res.code === 0 && res.data) {
          // 其他用户的宠物可能没有exp属性，所以不需要处理
          setPet(res.data);
          setIsOtherUserEmptyPet(false);
        } else {
          // 显示空宠物界面而不是关闭
          setPet(null);
          setIsCreating(false);
          setIsOtherUserEmptyPet(true);
        }
      } else {
        // 检查当前用户是否登录
        if (!initialState?.currentUser) {
          // 如果未登录，不发送请求
          setLoading(false);
          if (!isPageComponent) {
            onClose?.(); // 关闭弹窗，只有在非页面组件模式下才关闭
            message.warning('请先登录');
          }
          return;
        }

        // 获取当前用户的宠物信息
        const res = await getPetDetailUsingGet();
        if (res.code === 0 && res.data) {
          // 处理数值精度问题
          if (res.data.exp) {
            res.data.exp = Math.floor(res.data.exp);
          }
          if (res.data.mood) {
            res.data.mood = Math.floor(res.data.mood);
          }
          if (res.data.hunger) {
            res.data.hunger = Math.floor(res.data.hunger);
          }
          setPet(res.data);
          setIsOtherUserEmptyPet(false); // 确保重置其他用户空宠物状态
          setIsCreating(false); // 确保不显示创建表单
        } else if (res.code === 0 && !res.data) {
          // 如果没有宠物，显示创建宠物表单
          setPet(null);
          setIsCreating(true);
          setIsOtherUserEmptyPet(false); // 确保重置其他用户空宠物状态
        }
      }
    } catch (error: any) {
      console.error('获取宠物信息失败', error);
      message.error('获取宠物信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建宠物
  const handleCreatePet = async () => {
    if (!petName.trim()) {
      message.warning('请输入宠物名称');
      return;
    }

    setLoading(true);
    try {
      const res = await createPetUsingPost({
        name: petName
      });

      if (res.code === 0 && res.data) {
        message.success('创建宠物成功');
        setIsCreating(false);
        fetchPetData(); // 重新获取宠物数据
      }
    } catch (error) {
      console.error('创建宠物失败', error);
      message.error('创建宠物失败');
    } finally {
      setLoading(false);
    }
  };

  // 喂食宠物
  const handleFeed = async () => {
    if (!pet?.petId) return;

    setFeedLoading(true);
    try {
      const res = await feedPetUsingPost({ petId: pet.petId });
      if (res.code === 0 && res.data) {
        message.success('喂食成功');
        // 处理数值精度问题
        if (res.data.exp) {
          res.data.exp = Math.floor(res.data.exp);
        }
        if (res.data.mood) {
          res.data.mood = Math.floor(res.data.mood);
        }
        if (res.data.hunger) {
          res.data.hunger = Math.floor(res.data.hunger);
        }
        // 保留原有的 equippedItems，因为喂食接口可能不返回装备信息
        setPet({...pet, ...res.data, equippedItems: (pet as API.PetVO)?.equippedItems});
      }
    } catch (error) {
    } finally {
      setFeedLoading(false);
    }
  };

  // 抚摸宠物
  const handlePat = async () => {
    if (!pet?.petId) return;

    setPatLoading(true);
    try {
      const res = await patPetUsingPost({ petId: pet.petId });
      if (res.code === 0 && res.data) {
        message.success('抚摸成功');
        // 处理数值精度问题
        if (res.data.exp) {
          res.data.exp = Math.floor(res.data.exp);
        }
        if (res.data.mood) {
          res.data.mood = Math.floor(res.data.mood);
        }
        if (res.data.hunger) {
          res.data.hunger = Math.floor(res.data.hunger);
        }
        // 保留原有的 equippedItems，因为抚摸接口可能不返回装备信息
        setPet({...pet, ...res.data, equippedItems: (pet as API.PetVO)?.equippedItems});
      }
    } catch (error) {
      console.error('抚摸失败', error);
    } finally {
      setPatLoading(false);
    }
  };

  // 修改宠物名称
  const handleRename = async () => {
    if (!pet?.petId || !newName.trim()) {
      message.warning('请输入新的宠物名称');
      return;
    }

    // 确认是否修改名称
    Modal.confirm({
      title: '确认修改宠物名称',
      content: '修改宠物名称将消耗100积分，确定要继续吗？',
      okText: '确认修改',
      cancelText: '取消',
      onOk: async () => {
        setRenameLoading(true);
        try {
          const res = await updatePetNameUsingPost({
            petId: pet.petId,
            name: newName
          });

          if (res.code === 0 && res.data) {
            message.success('修改名称成功');
            setPet({...pet, name: newName});
            setIsRenaming(false);
            setNewName('');
          } else {
            message.error(res.message || '修改名称失败');
          }
        } catch (error) {
          console.error('修改名称失败', error);
          message.error('修改名称失败，可能是积分不足');
        } finally {
          setRenameLoading(false);
        }
      }
    });
  };

  // 获取宠物列表
  const fetchPetSkins = async () => {
    if (isOtherUser) return; // 如果是查看其他用户的宠物，不需要获取宠物列表

    // 检查当前用户是否登录
    if (!initialState?.currentUser) {
      // 如果未登录，不发送请求
      return;
    }

    setSkinLoading(true);
    try {
      const res = await listPetSkinsUsingGet({
        current: 1,
        pageSize: 100,
      });

      if (res.code === 0 && res.data?.records) {
        // 添加原皮卡片，ID为-1
        const originalSkin: API.PetSkinVO = {
          skinId: -1,
          name: '原皮',
          description: '最初的样子，朴素而自然',
          url: 'https://oss.cqbo.com/moyu/pet/超级玛丽马里奥 (73)_爱给网_aigei_com.png', // 使用默认图片，可以根据实际情况调整
          points: 0,
          owned: true, // 默认拥有
        };

        // 将原皮添加到宠物列表的开头
        setSkins([originalSkin, ...res.data.records]);
      } else {
        message.error(res.message || '获取宠物列表失败');
      }
    } catch (error) {
      console.error('获取宠物列表失败', error);
      message.error('获取宠物列表失败');
    } finally {
      setSkinLoading(false);
    }
  };

  // 兑换宠物
  const handleExchangeSkin = async (skinId: number) => {
    // 添加二次确认
    Modal.confirm({
      title: '确认购买宠物',
      content: `确定要花费 ${skins.find(skin => skin.skinId === skinId)?.points || 0} 积分购买该宠物吗？`,
      okText: '确认购买',
      cancelText: '取消',
      onOk: async () => {
        setExchangeLoading(skinId);
        try {
          const res = await exchangePetSkinUsingPost({
            skinId
          });

          if (res.code === 0 && res.data) {
            message.success('购买宠物成功');
            // 更新宠物列表中的owned状态
            setSkins(skins.map(skin =>
              skin.skinId === skinId ? { ...skin, owned: true } : skin
            ));
            // 重新获取宠物信息，更新宠物列表
            fetchPetData();
          } else {
            message.error(res.message || '购买宠物失败');
          }
        } catch (error) {
          console.error('购买宠物失败', error);
          message.error('购买宠物失败，可能是积分不足');
        } finally {
          setExchangeLoading(null);
        }
      }
    });
  };

  // 设置当前宠物
  const handleSetCurrentSkin = async (skinId: number) => {
    if (!pet?.petId) return;

    setSetCurrentSkinLoading(skinId);
    try {
      // 如果是原皮(ID为-1)，需要特殊处理
      if (skinId === -1) {
        // 这里假设后端API支持传入-1作为原皮ID
        // 如果后端不支持，可能需要修改后端代码或使用其他方式处理
        const res = await setPetSkinUsingPost({
          skinId: -1
        });

        if (res.code === 0 && res.data) {
          message.success('设置原皮成功');
          setPet(res.data);
        } else {
          message.error(res.message || '设置原皮失败');
        }
      } else {
        // 正常宠物处理
        const res = await setPetSkinUsingPost({
          skinId
        });

        if (res.code === 0 && res.data) {
          message.success('设置宠物成功');
          setPet(res.data);
        } else {
          message.error(res.message || '设置宠物失败');
        }
      }
    } catch (error) {
      console.error('设置宠物失败', error);
      message.error('设置宠物失败');
    } finally {
      setSetCurrentSkinLoading(null);
    }
  };

  // 获取物品列表
  const fetchItems = async () => {
    if (isOtherUser) return; // 查看其他用户时不获取物品

    setItemsLoading(true);
    try {
      const res = await listMyItemInstancesByPageUsingPost({
        current: itemsCurrent,
        pageSize: itemsPageSize,
      });

      if (res.code === 0 && res.data) {
        setItems(res.data.records || []);
        setItemsTotal(res.data.total || 0);
      } else {
        message.error(res.message || '获取物品列表失败');
      }
    } catch (error) {
      console.error('获取物品列表失败', error);
      message.error('获取物品列表失败');
    } finally {
      setItemsLoading(false);
    }
  };

  // 批量分解蓝绿装备
  const handleBatchDecomposeBlueGreen = () => {
    Modal.confirm({
      title: '确认批量分解',
      content: (
        <div>
          <p>确定要批量分解所有<strong>蓝色（精良）</strong>和<strong>绿色（优良）</strong>品质的装备吗？</p>
          <p style={{ color: '#52c41a', fontSize: '12px', marginTop: '8px' }}>💡 已穿戴的装备不会被分解</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px' }}>此操作不可撤销！</p>
        </div>
      ),
      okText: '确认分解',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setBatchDecomposeLoading(true);
        try {
          const res = await batchDecomposeBlueGreenEquipmentsUsingPost();

          if (res.code === 0) {
            const totalPoints = res.data || 0;
            message.success(`批量分解成功，共获得 ${totalPoints} 积分`);
            // 刷新物品列表
            fetchItems();
          } else {
            message.error(res.message || '批量分解失败');
          }
        } catch (error) {
          console.error('批量分解装备失败', error);
          message.error('批量分解装备失败');
        } finally {
          setBatchDecomposeLoading(false);
        }
      },
    });
  };

  // 分解物品
  const handleDecomposeItem = (item: API.ItemInstanceVO) => {
    const removePoint = item.template?.removePoint || 0;
    const itemName = item.template?.name || '未知物品';

    Modal.confirm({
      title: '确认分解物品',
      content: (
        <div>
          <p>确定要分解 <strong>{itemName}</strong> 吗？</p>
          <p>分解后将获得 <strong style={{ color: '#faad14' }}>{removePoint}</strong> 积分</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>此操作不可撤销！</p>
        </div>
      ),
      okText: '确认分解',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        if (!item.id) return;
        setDecomposeLoading(item.id);
        try {
          const res = await decomposeItemInstanceUsingPost({
            itemInstanceId: item.id,
          });

          if (res.code === 0) {
            message.success(`分解成功，获得 ${removePoint} 积分`);
            // 刷新物品列表
            fetchItems();
          } else {
            message.error(res.message || '分解失败');
          }
        } catch (error) {
          console.error('分解物品失败', error);
          message.error('分解物品失败');
        } finally {
          setDecomposeLoading(null);
        }
      },
    });
  };

  // 穿戴装备
  const handleEquipItem = async (item: API.ItemInstanceVO) => {
    if (!item.id) return;

    setEquipLoading(item.id);
    try {
      const res = await equipItemUsingPost({
        itemInstanceId: item.id,
      });

      if (res.code === 0 && res.data) {
        message.success('穿戴成功');
        // 刷新宠物数据以获取更新后的装备信息
        fetchPetData();
        // 刷新物品列表
        fetchItems();
      } else {
        message.error(res.message || '穿戴失败');
      }
    } catch (error) {
      console.error('穿戴装备失败', error);
      message.error('穿戴装备失败');
    } finally {
      setEquipLoading(null);
    }
  };

  // 卸下装备
  const handleUnequipItem = async (equipSlot: string) => {
    setUnequipLoading(equipSlot);
    try {
      const res = await unequipItemUsingPost({
        equipSlot,
      });

      if (res.code === 0 && res.data) {
        message.success('卸下成功');
        // 刷新宠物数据以获取更新后的装备信息
        fetchPetData();
        // 刷新物品列表
        fetchItems();
      } else {
        message.error(res.message || '卸下失败');
      }
    } catch (error) {
      console.error('卸下装备失败', error);
      message.error('卸下装备失败');
    } finally {
      setUnequipLoading(null);
    }
  };

  // 装备槽位名称 -> 槽位编号映射
  const equipSlotNameToNum: Record<string, number> = {
    weapon: 1,
    hand: 2,
    foot: 3,
    head: 4,
    necklace: 5,
  };

  const slotDisplayNames: Record<string, string> = {
    weapon: '武器', hand: '手套', foot: '鞋子', head: '头盔', necklace: '项链',
    armor: '护甲', shield: '盾牌', ring: '戒指', gloves: '手套', boots: '靴子',
  };

  // 查看他人装备词条（只读）
  const openViewForgeModal = async (slot: string, petId: number) => {
    const slotNum = equipSlotNameToNum[slot];
    if (!slotNum) return;
    setViewForgeSlotName(slotDisplayNames[slot] || slot);
    setViewForgeDetail(null);
    setViewForgeModalVisible(true);
    setViewForgeLoading(true);
    try {
      const res = await getForgeDetailUsingPost({ petId, equipSlot: slotNum });
      if (res.code === 0 && res.data) {
        setViewForgeDetail(res.data);
      } else {
        message.error(res.message || '获取词条失败');
      }
    } catch {
      message.error('获取词条失败');
    } finally {
      setViewForgeLoading(false);
    }
  };

  // 打开装备强化弹窗
  const openForgeModal = async (slotKey: string, slotNum: number, slotDisplayName: string) => {
    if (!pet?.petId) return;
    setForgeSlot(slotNum);
    setForgeSlotName(slotDisplayName);
    setLockedEntries([]);
    setForgeModalVisible(true);
    setForgeDetailLoading(true);
    try {
      const res = await getForgeDetailUsingPost({ petId: pet.petId, equipSlot: slotNum });
      if (res.code === 0 && res.data) {
        setForgeDetail(res.data);
        // 从服务端 locked 字段初始化锁定状态
        const entries = [res.data.entry1, res.data.entry2, res.data.entry3, res.data.entry4];
        const serverLocked = entries
          .map((e, i) => (e?.locked ? i + 1 : null))
          .filter((i): i is number => i !== null);
        setLockedEntries(serverLocked);
      } else {
        message.error(res.message || '获取强化详情失败');
      }
    } catch (error) {
      console.error('获取强化详情失败', error);
      message.error('获取强化详情失败');
    } finally {
      setForgeDetailLoading(false);
    }
  };

  // 装备升级
  const handleForgeUpgrade = async () => {
    if (!pet?.petId || forgeSlot === null) return;
    setForgeUpgradeLoading(true);
    try {
      const res = await upgradeEquipUsingPost({ petId: pet.petId, equipSlot: forgeSlot });
      if (res.code === 0) {
        if (res.data) {
          message.success('升级成功！');
        } else {
          message.warning('升级失败，运气不佳，下次再试！');
        }
        // 刷新强化详情
        const detailRes = await getForgeDetailUsingPost({ petId: pet.petId, equipSlot: forgeSlot });
        if (detailRes.code === 0 && detailRes.data) {
          setForgeDetail(detailRes.data);
        }
      } else {
        message.error(res.message || '升级失败');
      }
    } catch (error) {
      console.error('装备升级失败', error);
      message.error('装备升级失败');
    } finally {
      setForgeUpgradeLoading(false);
    }
  };

  // 刷新词条
  const handleForgeRefresh = async () => {
    if (!pet?.petId || forgeSlot === null) return;
    setForgeRefreshLoading(true);
    try {
      const res = await refreshEntriesUsingPost({ petId: pet.petId, equipSlot: forgeSlot });
      if (res.code === 0 && res.data) {
        message.success('词条刷新成功！');
        // 直接用返回数据更新词条，不触发 fetchPetData
        setForgeDetail(prev => prev ? {
          ...prev,
          entry1: res.data!.entry1,
          entry2: res.data!.entry2,
          entry3: res.data!.entry3,
          entry4: res.data!.entry4,
        } : prev);
        // 同步锁定状态
        const entries = [res.data.entry1, res.data.entry2, res.data.entry3, res.data.entry4];
        const serverLocked = entries
          .map((e, i) => (e?.locked ? i + 1 : null))
          .filter((i): i is number => i !== null);
        setLockedEntries(serverLocked);
      } else {
        message.error(res.message || '刷新失败');
      }
    } catch (error) {
      console.error('刷新词条失败', error);
      message.error('刷新词条失败');
    } finally {
      setForgeRefreshLoading(false);
    }
  };

  // 切换词条锁定（调接口）
  const toggleEntryLock = async (entryIndex: number) => {
    if (!pet?.petId || forgeSlot === null || forgeLockLoading) return;
    const newLocked = lockedEntries.includes(entryIndex)
      ? lockedEntries.filter(i => i !== entryIndex)
      : [...lockedEntries, entryIndex];
    setForgeLockLoading(true);
    try {
      const res = await lockEntriesUsingPost({ petId: pet.petId, equipSlot: forgeSlot, lockedEntries: newLocked });
      if (res.code === 0 && res.data) {
        // 以接口返回的 locked 字段为准
        const entries = [res.data.entry1, res.data.entry2, res.data.entry3, res.data.entry4];
        const serverLocked = entries
          .map((e, i) => (e?.locked ? i + 1 : null))
          .filter((i): i is number => i !== null);
        setLockedEntries(serverLocked);
        // 同步更新 forgeDetail 词条
        setForgeDetail(prev => prev ? { ...prev, entry1: res.data!.entry1, entry2: res.data!.entry2, entry3: res.data!.entry3, entry4: res.data!.entry4 } : prev);
      } else {
        message.error(res.message || '锁定失败');
      }
    } catch (error) {
      console.error('锁定词条失败', error);
      message.error('锁定词条失败');
    } finally {
      setForgeLockLoading(false);
    }
  };

  useEffect(() => {
    if (isPageComponent || visible) {
      // 重置状态，避免显示上一次的结果
      setPet(null);
      setIsCreating(false);
      setIsOtherUserEmptyPet(false);
      fetchPetData();
      fetchPetSkins(); // 获取宠物列表
    }
  }, [visible, otherUserId, isPageComponent]);

  // 获取物品列表
  useEffect(() => {
    if ((isPageComponent || visible) && !isOtherUser) {
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPageComponent, visible, itemsCurrent, itemsPageSize]);

  // 全局阻止右键菜单（当自定义菜单打开时）
  useEffect(() => {
    if (contextMenuItemId || equipSlotContextMenu) {
      const preventContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      document.addEventListener('contextmenu', preventContextMenu);
      return () => {
        document.removeEventListener('contextmenu', preventContextMenu);
      };
    }
  }, [contextMenuItemId, equipSlotContextMenu]);

  // 创建宠物表单
  if (isCreating) {
    if (isPageComponent) {
      return (
        <div style={{ padding: '20px 0' }}>
          <Form layout="vertical">
            <Form.Item label="给你的宠物起个名字">
              <Input
                placeholder="请输入宠物名称"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                maxLength={10}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                onClick={handleCreatePet}
                loading={loading}
                block
              >
                创建宠物
              </Button>
            </Form.Item>
          </Form>
        </div>
      );
    }

    return (
      <Modal
        title="创建你的摸鱼宠物"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={400}
      >
        <div style={{ padding: '20px 0' }}>
          <Form layout="vertical">
            <Form.Item label="给你的宠物起个名字">
              <Input
                placeholder="请输入宠物名称"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                maxLength={10}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                onClick={handleCreatePet}
                loading={loading}
                block
              >
                创建宠物
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    );
  }

  // 加载中或没有宠物数据
  if (loading) {
    if (isPageComponent) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          加载中...
        </div>
      );
    }

    return (
      <Modal
        title="我的摸鱼宠物"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          加载中...
        </div>
      </Modal>
    );
  }

  // 显示其他用户的空宠物状态
  if (isOtherUserEmptyPet) {
    if (isPageComponent) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}><SmileOutlined /></div>
          <div style={{ fontSize: '16px' }}>该用户还没有养宠物哦~</div>
        </div>
      );
    }

    return (
      <Modal
        title={
          <div className={styles.petModalTitle}>
            <span className={styles.petIcon}>🐟</span>
            <span>{`${otherUserName || '用户'}的宠物`}</span>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
        className={styles.petModal}
      >
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}><SmileOutlined /></div>
          <div style={{ fontSize: '16px' }}>该用户还没有养宠物哦~</div>
        </div>
      </Modal>
    );
  }

  // 渲染宠物列表

  // 渲染强化弹窗
  const renderSkinsList = (showAll = false) => {
    // 如果showAll为true，显示所有宠物（商店），否则只显示已拥有的宠物（宠物馆）
    const filteredSkins = showAll ? skins : skins.filter(skin => skin.owned);

    if (skinLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin tip="加载中..." />
        </div>
      );
    }

    if (filteredSkins.length === 0) {
      return (
        <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
          <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>
            {showAll ? '🛒' : '👕'}
          </div>
          <div className={styles.emptyText} style={{ fontSize: '16px' }}>
            {showAll ? '暂无可购买的宠物' : '暂无已拥有的宠物'}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.skinsList}>
        <Row gutter={[12, 12]}>
          {filteredSkins.map((skin) => (
            <Col span={8} key={skin.skinId}>
              <Card
                className={`${styles.skinCard} ${skin.owned ? styles.ownedSkin : ''}`}
                hoverable
                size="small"
                cover={
                  <div className={styles.skinImageContainer}>
                    <img
                      alt={skin.name}
                      src={skin.url}
                      className={styles.skinImage}
                    />
                    {skin.owned && (
                      (skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                      (skin.skinId !== -1 && pet?.petUrl === skin.url)
                    ) && (
                      <div className={styles.currentSkinBadge}>
                        当前使用
                      </div>
                    )}
                  </div>
                }
                bodyStyle={{ padding: '12px 16px' }}
              >
                <Card.Meta
                  title={<div className={styles.skinTitle}>{skin.name}</div>}
                  description={<div className={styles.skinDescription}>{skin.description}</div>}
                />
                <div className={styles.skinPrice}>
                  {skin.points} 积分
                </div>
                <div className={styles.skinActions}>
                  {skin.owned ? (
                    <Button
                      type="primary"
                      size="small"
                      disabled={(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                               (skin.skinId !== -1 && pet?.petUrl === skin.url)}
                      onClick={() => handleSetCurrentSkin(skin.skinId || 0)}
                      loading={setCurrentSkinLoading === skin.skinId}
                      icon={(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                            (skin.skinId !== -1 && pet?.petUrl === skin.url) ? <CheckOutlined /> : <SkinOutlined />}
                    >
                      {(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                       (skin.skinId !== -1 && pet?.petUrl === skin.url) ? '当前使用中' : '使用'}
                    </Button>
                  ) : showAll ? (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleExchangeSkin(skin.skinId || 0)}
                      loading={exchangeLoading === skin.skinId}
                      icon={<ShoppingOutlined />}
                    >
                      购买
                    </Button>
                  ) : null}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  // 根据isPageComponent决定是否渲染为Modal或直接内容
  if (isPageComponent) {
    return (
      <div className={styles.petContainer}>
        <div className={styles.pageComponentHeader}>
          <h2 className={styles.pageComponentTitle}>🐟</h2>
          <Popover
            content={<PetRules />}
            title="宠物系统说明"
            placement="bottom"
            trigger="click"
            overlayStyle={{ width: 300 }}
            overlayInnerStyle={{
              backgroundColor: '#fff',
              boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
            }}
          >
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              size="small"
              className={styles.titleHelpButton}
            >
              系统说明
            </Button>
          </Popover>
        </div>

        {/* 使用分栏布局 */}
        <Row gutter={24} className={styles.petMainLayout}>
          {/* 左侧装备界面 */}
          <Col span={10} className={styles.petLeftColumn}>
            <div className={styles.equipmentInterface}>
              {/* 顶部宠物信息 */}
              <div className={styles.petHeader}>
                <div className={styles.petNameSection}>
                  {!isOtherUser && !isRenaming ? (
                    <Tooltip title="点击修改名称（消耗100积分）">
                      <span
                        className={styles.editableName}
                        onClick={() => setIsRenaming(true)}
                      >
                        {pet?.name}
                        <EditOutlined className={styles.editIcon} />
                      </span>
                    </Tooltip>
                  ) : isRenaming ? (
                    <div className={styles.renameContainer}>
                      <Input
                        size="small"
                        placeholder="请输入新名称"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        maxLength={10}
                        autoFocus
                        className={styles.renameInput}
                        prefix={<EditOutlined />}
                        suffix={
                          <span className={styles.charCount}>
                            {newName.length}/10
                          </span>
                        }
                      />
                      <div className={styles.renameActions}>
                        <Button
                          size="small"
                          type="primary"
                          onClick={handleRename}
                          loading={renameLoading}
                          icon={<CheckOutlined />}
                        >
                          确定
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {setIsRenaming(false); setNewName('');}}
                          icon={<CloseOutlined />}
                          className={styles.cancelButton}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span>{pet?.name}</span>
                  )}
                </div>
              </div>

              {/* 装备栏布局 */}
              <div className={styles.equipmentLayout}>
                {/* 左侧装备栏 */}
                <div className={styles.leftEquipments}>
                  <div className={styles.equipSlot} data-slot="weapon">
                    {(() => {
                      const petData = pet as API.PetVO;
                      const equippedWeapon = petData?.equippedItems?.weapon;
                      if (!equippedWeapon) {
                        return (
                          <Tooltip title="武器 - 空闲">
                            <div className={styles.emptySlot}>
                              <ThunderboltOutlined className={styles.slotIcon} />
                            </div>
                          </Tooltip>
                        );
                      }
                      const rarity = equippedWeapon?.template?.rarity || 1;
                      const rarityClass = rarity === 1 ? 'rarity-1' : rarity === 2 ? 'rarity-2' : rarity === 3 ? 'rarity-3' : rarity === 4 ? 'rarity-4' : rarity === 5 ? 'rarity-5' : 'rarity-red';
                      const enhanceLevel = equippedWeapon?.enhanceLevel || 0;
                      return (
                        <Tooltip title={renderEquipStatsTooltip(equippedWeapon, '武器', '点击卸下 | 右键强化')} overlayInnerStyle={{ backgroundColor: '#fff' }}>
                          <div
                            className={`${styles.equippedItem} ${styles[`rarity-${rarityClass}`]}${getEnhanceTier(enhanceLevel) > 0 ? ` ${styles[`enhance-tier${getEnhanceTier(enhanceLevel)}`]}` : ''}`}
                            onClick={() => !isOtherUser && handleUnequipItem('weapon')}
                            onContextMenu={(e) => {
                              if (isOtherUser) return;
                              e.preventDefault();
                              e.stopPropagation();
                              setEquipSlotContextMenu({ slot: 'weapon', slotNum: 1, x: e.clientX, y: e.clientY });
                            }}
                            style={{ cursor: isOtherUser ? 'default' : 'pointer' }}
                          >
                            <Spin spinning={unequipLoading === 'weapon'} size="small">
                              {equippedWeapon?.template?.icon ? (
                                <div className={styles.equippedItemWrapper}>
                                  <img
                                    src={equippedWeapon.template.icon}
                                    alt={equippedWeapon.name}
                                    className={styles.equippedItemIcon}
                                  />
                                  {enhanceLevel > 0 && (
                                    <div className={`${styles.enhanceLevelBadge} ${styles[`enhance-badge-tier${getEnhanceTier(enhanceLevel)}`]}`}>+{enhanceLevel}</div>
                                  )}
                                </div>
                              ) : (
                                <ThunderboltOutlined className={styles.slotIcon} />
                              )}
                            </Spin>
                          </div>
                        </Tooltip>
                      );
                    })()}
                  </div>
                  <div className={styles.equipSlot} data-slot="hand">
                    {(() => {
                      const petData = pet as API.PetVO;
                      const equippedHand = petData?.equippedItems?.hand;
                      if (!equippedHand) {
                        return (
                          <Tooltip title="手套 - 空闲">
                            <div className={styles.emptySlot}>
                              <StarOutlined className={styles.slotIcon} />
                            </div>
                          </Tooltip>
                        );
                      }
                      const rarity = equippedHand?.template?.rarity || 1;
                      const rarityClass = rarity === 1 ? 'rarity-1' : rarity === 2 ? 'rarity-2' : rarity === 3 ? 'rarity-3' : rarity === 4 ? 'rarity-4' : rarity === 5 ? 'rarity-5' : 'rarity-red';
                      const enhanceLevel = equippedHand?.enhanceLevel || 0;
                      return (
                        <Tooltip title={renderEquipStatsTooltip(equippedHand, '手套', '点击卸下 | 右键强化')} overlayInnerStyle={{ backgroundColor: '#fff' }}>
                          <div
                            className={`${styles.equippedItem} ${styles[`rarity-${rarityClass}`]}${getEnhanceTier(enhanceLevel) > 0 ? ` ${styles[`enhance-tier${getEnhanceTier(enhanceLevel)}`]}` : ''}`}
                            onClick={() => !isOtherUser && handleUnequipItem('hand')}
                            onContextMenu={(e) => {
                              if (isOtherUser) return;
                              e.preventDefault();
                              e.stopPropagation();
                              setEquipSlotContextMenu({ slot: 'hand', slotNum: 2, x: e.clientX, y: e.clientY });
                            }}
                            style={{ cursor: isOtherUser ? 'default' : 'pointer' }}
                          >
                            <Spin spinning={unequipLoading === 'hand'} size="small">
                              {equippedHand?.template?.icon ? (
                                <div className={styles.equippedItemWrapper}>
                                  <img
                                    src={equippedHand.template.icon}
                                    alt={equippedHand.name}
                                    className={styles.equippedItemIcon}
                                  />
                                  {enhanceLevel > 0 && (
                                    <div className={`${styles.enhanceLevelBadge} ${styles[`enhance-badge-tier${getEnhanceTier(enhanceLevel)}`]}`}>+{enhanceLevel}</div>
                                  )}
                                </div>
                              ) : (
                                <StarOutlined className={styles.slotIcon} />
                              )}
                            </Spin>
                          </div>
                        </Tooltip>
                      );
                    })()}
                  </div>
                  <div className={styles.equipSlot} data-slot="foot">
                    {(() => {
                      const petData = pet as API.PetVO;
                      const equippedFoot = petData?.equippedItems?.foot;
                      if (!equippedFoot) {
                        return (
                          <Tooltip title="鞋子 - 空闲">
                            <div className={styles.emptySlot}>
                              <FireOutlined className={styles.slotIcon} />
                            </div>
                          </Tooltip>
                        );
                      }
                      const rarity = equippedFoot?.template?.rarity || 1;
                      const rarityClass = rarity === 1 ? 'rarity-1' : rarity === 2 ? 'rarity-2' : rarity === 3 ? 'rarity-3' : rarity === 4 ? 'rarity-4' : rarity === 5 ? 'rarity-5' : 'rarity-red';
                      const enhanceLevel = equippedFoot?.enhanceLevel || 0;
                      return (
                        <Tooltip title={renderEquipStatsTooltip(equippedFoot, '鞋子', '点击卸下 | 右键强化')} overlayInnerStyle={{ backgroundColor: '#fff' }}>
                          <div
                            className={`${styles.equippedItem} ${styles[`rarity-${rarityClass}`]}${getEnhanceTier(enhanceLevel) > 0 ? ` ${styles[`enhance-tier${getEnhanceTier(enhanceLevel)}`]}` : ''}`}
                            onClick={() => !isOtherUser && handleUnequipItem('foot')}
                            onContextMenu={(e) => {
                              if (isOtherUser) return;
                              e.preventDefault();
                              e.stopPropagation();
                              setEquipSlotContextMenu({ slot: 'foot', slotNum: 3, x: e.clientX, y: e.clientY });
                            }}
                            style={{ cursor: isOtherUser ? 'default' : 'pointer' }}
                          >
                            <Spin spinning={unequipLoading === 'foot'} size="small">
                              {equippedFoot?.template?.icon ? (
                                <div className={styles.equippedItemWrapper}>
                                  <img
                                    src={equippedFoot.template.icon}
                                    alt={equippedFoot.name}
                                    className={styles.equippedItemIcon}
                                  />
                                  {enhanceLevel > 0 && (
                                    <div className={`${styles.enhanceLevelBadge} ${styles[`enhance-badge-tier${getEnhanceTier(enhanceLevel)}`]}`}>+{enhanceLevel}</div>
                                  )}
                                </div>
                              ) : (
                                <FireOutlined className={styles.slotIcon} />
                              )}
                            </Spin>
                          </div>
                        </Tooltip>
                      );
                    })()}
                  </div>
                </div>

                {/* 中央宠物展示 */}
                <div className={styles.petDisplay}>
                  <div className={styles.petAvatar}>
                    <Avatar src={pet?.petUrl} size={140} />
                  </div>
                  <div className={styles.petLevel}>Lv.{pet?.level || 1}</div>
                </div>

                {/* 右侧装备栏 */}
                <div className={styles.rightEquipments}>
                  <div className={styles.equipSlot} data-slot="head">
                    {(() => {
                      const petData = pet as API.PetVO;
                      const equippedHead = petData?.equippedItems?.head;
                      if (!equippedHead) {
                        return (
                          <Tooltip title="头盔 - 空闲">
                            <div className={styles.emptySlot}>
                              <CrownOutlined className={styles.slotIcon} />
                            </div>
                          </Tooltip>
                        );
                      }
                      const rarity = equippedHead?.template?.rarity || 1;
                      const rarityClass = rarity === 1 ? 'rarity-1' : rarity === 2 ? 'rarity-2' : rarity === 3 ? 'rarity-3' : rarity === 4 ? 'rarity-4' : rarity === 5 ? 'rarity-5' : 'rarity-red';
                      const enhanceLevel = equippedHead?.enhanceLevel || 0;
                      return (
                        <Tooltip title={renderEquipStatsTooltip(equippedHead, '头盔', '点击卸下 | 右键强化')} overlayInnerStyle={{ backgroundColor: '#fff' }}>
                          <div
                            className={`${styles.equippedItem} ${styles[`rarity-${rarityClass}`]}${getEnhanceTier(enhanceLevel) > 0 ? ` ${styles[`enhance-tier${getEnhanceTier(enhanceLevel)}`]}` : ''}`}
                            onClick={() => !isOtherUser && handleUnequipItem('head')}
                            onContextMenu={(e) => {
                              if (isOtherUser) return;
                              e.preventDefault();
                              e.stopPropagation();
                              setEquipSlotContextMenu({ slot: 'head', slotNum: 4, x: e.clientX, y: e.clientY });
                            }}
                            style={{ cursor: isOtherUser ? 'default' : 'pointer' }}
                          >
                            <Spin spinning={unequipLoading === 'head'} size="small">
                              {equippedHead?.template?.icon ? (
                                <div className={styles.equippedItemWrapper}>
                                  <img
                                    src={equippedHead.template.icon}
                                    alt={equippedHead.name}
                                    className={styles.equippedItemIcon}
                                  />
                                  {enhanceLevel > 0 && (
                                    <div className={`${styles.enhanceLevelBadge} ${styles[`enhance-badge-tier${getEnhanceTier(enhanceLevel)}`]}`}>+{enhanceLevel}</div>
                                  )}
                                </div>
                              ) : (
                                <CrownOutlined className={styles.slotIcon} />
                              )}
                            </Spin>
                          </div>
                        </Tooltip>
                      );
                    })()}
                  </div>
                  <div className={styles.equipSlot} data-slot="necklace">
                    <Tooltip title="项链 - 空闲">
                      <div className={styles.emptySlot}>
                        <GiftOutlined className={styles.slotIcon} />
                      </div>
                    </Tooltip>
                  </div>
                  <div className={styles.equipSlot} data-slot="accessory2">
                    <Tooltip title="饰品2 - 空闲">
                      <div className={styles.emptySlot}>
                        <HeartOutlined className={styles.slotIcon} />
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* 装备格右键菜单 */}
              {equipSlotContextMenu && !isOtherUser && (
                <>
                  <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                    onClick={() => setEquipSlotContextMenu(null)}
                    onContextMenu={(e) => { e.preventDefault(); setEquipSlotContextMenu(null); }}
                  />
                  <div
                    style={{
                      position: 'fixed',
                      left: equipSlotContextMenu.x,
                      top: equipSlotContextMenu.y,
                      zIndex: 1000,
                      background: '#fff',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      padding: '4px',
                      minWidth: '120px',
                    }}
                  >
                    <Button
                      type="primary"
                      size="small"
                      icon={<ToolOutlined />}
                      onClick={() => {
                        const slotDisplayNames: Record<string, string> = { weapon: '武器', hand: '手套', foot: '鞋子', head: '头盔', necklace: '项链' };
                        openForgeModal(equipSlotContextMenu.slot, equipSlotContextMenu.slotNum, slotDisplayNames[equipSlotContextMenu.slot] || equipSlotContextMenu.slot);
                        setEquipSlotContextMenu(null);
                      }}
                      style={{ width: '100%' }}
                    >
                      装备强化
                    </Button>
                  </div>
                </>
              )}



              {/* 底部状态和操作 */}
              <div className={styles.petStats}>
                {/* 进度条区域 */}
                <div className={styles.statusBars}>
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>
                      <HeartOutlined /> 心情:
                    </span>
                    <div className={styles.statusProgressContainer}>
                      <Progress
                        percent={((pet?.mood || 0) / ((pet as any)?.maxMood || 100)) * 100}
                        status="active"
                        strokeColor="#ff7875"
                        size="small"
                        format={() => `${pet?.mood || 0}/${(pet as any)?.maxMood || 100}`}
                      />
                      <Tooltip title="心情值影响宠物的积分产出和经验获取">
                        <InfoCircleOutlined className={styles.statusInfo} />
                      </Tooltip>
                    </div>
                  </div>
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>
                      <ThunderboltOutlined /> 饥饿:
                    </span>
                    <div className={styles.statusProgressContainer}>
                      <Progress
                        percent={((pet?.hunger || 0) / ((pet as any)?.maxHunger || 100)) * 100}
                        status="active"
                        strokeColor="#52c41a"
                        size="small"
                        format={() => `${pet?.hunger || 0}/${(pet as any)?.maxHunger || 100}`}
                      />
                      <Tooltip title="饥饿值影响宠物的积分产出和经验获取">
                        <InfoCircleOutlined className={styles.statusInfo} />
                      </Tooltip>
                    </div>
                  </div>
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>
                      <ExperimentOutlined /> 经验:
                    </span>
                    <div className={styles.statusProgressContainer}>
                      <Progress
                        percent={pet && (pet as any).exp ? (Math.floor((pet as any).exp) / ((pet as any)?.maxExp || 100) * 100) : 0}
                        status="active"
                        strokeColor="#ffa768"
                        size="small"
                        format={() => `${Math.floor((pet as any)?.exp || 0)}/${(pet as any)?.maxExp || 100}`}
                      />
                      <Tooltip title="每100点经验可提升1级">
                        <InfoCircleOutlined className={styles.statusInfo} />
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className={styles.powerScore}>
                  <span className={styles.scoreIcon}>⚡</span>
                  <span className={styles.scoreText}>宠物战力 {Math.floor((pet?.level || 1) * 100 + (pet?.mood || 0) + (pet?.hunger || 0))}</span>
                </div>

                {!isOtherUser && (
                  <div className={styles.quickActions}>
                    <Button
                      type="primary"
                      onClick={handleFeed}
                      loading={feedLoading}
                      icon={<GiftOutlined />}
                      className={styles.quickActionBtn}
                      size="small"
                    >
                      喂食
                    </Button>
                    <Button
                      type="primary"
                      onClick={handlePat}
                      loading={patLoading}
                      icon={<HeartOutlined />}
                      className={styles.quickActionBtn}
                      size="small"
                    >
                      抚摸
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* 右侧Tab内容 */}
          <Col span={14} className={styles.petRightColumn}>
            <Tabs
          defaultActiveKey={isOtherUser ? "equipment" : "items"}
          items={[
            ...(isOtherUser ? [] : [{
              key: 'items',
              label: (
                <span>
                  <GiftOutlined /> 物品
                </span>
              ),
              children: (
                <div className={styles.itemsContainer}>
                  {/* 批量分解按钮 */}
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      danger
                      loading={batchDecomposeLoading}
                      onClick={handleBatchDecomposeBlueGreen}
                      disabled={isOtherUser}
                    >
                      批量分解蓝绿装备
                    </Button>
                  </div>
                  <Spin spinning={itemsLoading}>
                    {items.length > 0 ? (
                      <Row gutter={[12, 12]}>
                        {items.map((item) => {
                          const rarity = item.template?.rarity || 1;
                          const rarityClass = styles[`itemCardRarity${rarity}`];
                          const rarityColors: Record<number, string> = {
                            1: '#52c41a', // 优良-绿色
                            2: '#1890ff', // 精良-蓝色
                            3: '#722ed1', // 史诗-紫色
                            4: '#fa8c16', // 传说-橙色
                            5: '#f5222d', // 神话-红色
                            6: '#eb2f96', // 至尊-粉色
                            7: '#fadb14', // 神器-金色
                          };
                          const rarityNames: Record<number, string> = {
                            1: '优良',
                            2: '精良',
                            3: '史诗',
                            4: '传说',
                            5: '神话',
                            6: '至尊',
                            7: '神器',
                          };
                          // 检查物品是否已穿戴
                          const isEquipped = (() => {
                            const petData = pet as API.PetVO;
                            const equippedItems = petData?.equippedItems;
                            if (!equippedItems) return false;
                            return Object.values(equippedItems).some(
                              (equipped: any) => equipped?.id === item.id
                            );
                          })();
                          return (
                            <Col span={4} key={item.id}>
                              <Tooltip
                                title={
                                  item.equipStats
                                    ? renderEquipStatsTooltip(item, item.template?.name || '')
                                    : (
                                      <div style={{ minWidth: '160px' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                          {item.template?.name || '未知物品'}
                                          {(item.enhanceLevel || 0) > 0 && <span style={{ color: '#faad14' }}>+{item.enhanceLevel}</span>}
                                        </div>
                                        <div style={{ color: '#666', fontSize: '12px' }}>{item.template?.description || '暂无描述'}</div>
                                      </div>
                                    )
                                }
                                overlayInnerStyle={{ backgroundColor: '#fff' }}
                              >
                                <Card
                                  className={`${styles.itemCard} ${rarityClass}`}
                                  bodyStyle={{ padding: '12px 8px', position: 'relative' }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenuItemId(item.id || null);
                                    setContextMenuPosition({ x: e.clientX, y: e.clientY });
                                  }}
                                >
                                <div
                                  className={styles.itemRarity}
                                  style={{ backgroundColor: rarityColors[rarity] }}
                                >
                                  {rarityNames[rarity]}
                                </div>
                                <div className={styles.itemIcon}>
                                  {item.template?.icon ? (
                                    <img src={item.template.icon} alt={item.template.name} style={{ width: 40, height: 40 }} />
                                  ) : (
                                    '📦'
                                  )}
                                </div>
                                <div className={styles.itemName}>{item.template?.name || '未知物品'}</div>
                                <div className={styles.itemCount}>数量: {item.quantity || 0}</div>
                                {/*<div className={styles.itemDesc}>{item.template?.description || '暂无描述'}</div>*/}
                                <div className={styles.itemActions}>
                                  {item.template?.equipSlot && !isEquipped ? (
                                    <Button
                                      type="primary"
                                      size="small"
                                      loading={equipLoading === item.id}
                                      onClick={() => handleEquipItem(item)}
                                    >
                                      穿戴
                                    </Button>
                                  ) : item.template?.equipSlot ? (
                                    <Button
                                      size="small"
                                      disabled
                                    >
                                      已穿戴
                                    </Button>
                                  ) : (
                                    <Button
                                      type="primary"
                                      size="small"
                                      disabled
                                    >
                                      使用
                                    </Button>
                                  )}
                                </div>
                                </Card>
                              </Tooltip>
                            </Col>
                          );
                        })}
                      </Row>
                    ) : (
                      <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                        <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
                        <div className={styles.emptyText} style={{ fontSize: '16px' }}>暂无物品</div>
                      </div>
                    )}
                  </Spin>
                  {/* 右键悬浮菜单 */}
                  {contextMenuItemId && (
                    <>
                      {/* 遮罩层，点击关闭菜单 */}
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 999,
                        }}
                        onClick={() => setContextMenuItemId(null)}
                      />
                      {/* 菜单 */}
                      <div
                        style={{
                          position: 'fixed',
                          left: contextMenuPosition.x,
                          top: contextMenuPosition.y,
                          zIndex: 1000,
                          background: '#fff',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          padding: '8px',
                          minWidth: '100px',
                        }}
                      >
                        <Button
                          danger
                          size="small"
                          loading={decomposeLoading === contextMenuItemId}
                          onClick={() => {
                            const item = items.find(i => i.id === contextMenuItemId);
                            if (item) handleDecomposeItem(item);
                            setContextMenuItemId(null);
                          }}
                          style={{ width: '100%' }}
                        >
                          分解
                        </Button>
                      </div>
                    </>
                  )}
                  {itemsTotal > 0 && (
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                      <Pagination
                        current={itemsCurrent}
                        pageSize={itemsPageSize}
                        total={itemsTotal}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => `共 ${total} 条`}
                        onChange={(page, pageSize) => {
                          setItemsCurrent(page);
                          if (pageSize !== itemsPageSize) {
                            setItemsPageSize(pageSize);
                          }
                        }}
                        onShowSizeChange={(current, size) => {
                          setItemsCurrent(1);
                          setItemsPageSize(size);
                        }}
                      />
                    </div>
                  )}
                </div>
              ),
            }]),
            // 装备标签页 - 查看他人宠物时显示
            ...(isOtherUser ? [{
              key: 'equipment',
              label: (
                <span>
                  <SafetyOutlined /> 装备
                </span>
              ),
              children: (
                <div className={styles.equipmentContainer}>
                  {/* 装备属性统计 */}
                  {(() => {
                    const otherPetData = pet as API.OtherUserPetVO;
                    const equipStats = otherPetData?.equipStats;
                    const equippedItems = (otherPetData as any)?.equippedItems;
                    const viewPetId = (otherPetData as any)?.petId;

                    return (
                      <>
                        {/* 已装备物品展示 */}
                        {equippedItems && Object.keys(equippedItems).length > 0 ? (
                          <div className={styles.equippedItemsSection} style={{ marginBottom: '24px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '16px' }}>
                              <GiftOutlined style={{ marginRight: '8px' }} />
                              已装备物品
                              <span style={{ fontSize: '12px', color: '#999', fontWeight: 'normal', marginLeft: 8 }}>右键装备可查看词条</span>
                            </div>
                            <Row gutter={[12, 12]}>
                              {Object.entries(equippedItems).map(([slot, item]: [string, any]) => {
                                const rarity = item.template?.rarity || 1;
                                const rarityColors: Record<number, string> = {
                                  1: '#52c41a', 2: '#1890ff', 3: '#722ed1', 4: '#fa8c16',
                                  5: '#f5222d', 6: '#eb2f96', 7: '#fadb14',
                                };
                                const rarityNames: Record<number, string> = {
                                  1: '优良', 2: '精良', 3: '史诗', 4: '传说', 5: '神话', 6: '至尊', 7: '神器',
                                };
                                const enhanceLevel = item.enhanceLevel || 0;
                                const tier = getEnhanceTier(enhanceLevel);
                                return (
                                  <Col span={8} key={slot}>
                                    <Tooltip
                                      title={renderEquipStatsTooltip(item, slotDisplayNames[slot] || slot)}
                                      overlayInnerStyle={{ backgroundColor: '#fff' }}
                                    >
                                      <Card
                                        size="small"
                                        style={{
                                          borderColor: rarityColors[rarity],
                                          cursor: 'context-menu',
                                          position: 'relative',
                                          overflow: 'visible',
                                        }}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          if (viewPetId) openViewForgeModal(slot, viewPetId);
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <div style={{ position: 'relative', flexShrink: 0 }}>
                                            {item.template?.icon ? (
                                              <img src={item.template.icon} alt={item.template.name} style={{ width: 36, height: 36, display: 'block' }} />
                                            ) : (
                                              <span style={{ fontSize: '28px', display: 'block' }}>⚔️</span>
                                            )}
                                            {enhanceLevel > 0 && (
                                              <div style={{
                                                position: 'absolute',
                                                top: -8,
                                                right: -10,
                                                background: ENHANCE_BADGE_BG[tier] || 'linear-gradient(135deg,#ff4444,#cc0000)',
                                                color: '#fff',
                                                fontSize: 10,
                                                fontWeight: 800,
                                                padding: '2px 5px',
                                                borderRadius: 8,
                                                border: '1.5px solid #fff',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                                lineHeight: 1,
                                                zIndex: 10,
                                                whiteSpace: 'nowrap',
                                              }}>
                                                +{enhanceLevel}
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {item.template?.name || '未知装备'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: rarityColors[rarity] }}>
                                              {slotDisplayNames[slot] || slot} · {rarityNames[rarity]}
                                            </div>
                                          </div>
                                        </div>
                                      </Card>
                                    </Tooltip>
                                  </Col>
                                );
                              })}
                            </Row>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '30px 0', marginBottom: '24px' }}>
                            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎒</div>
                            <div style={{ fontSize: '14px', color: '#999' }}>暂无装备</div>
                          </div>
                        )}

                        {/* 装备属性统计 */}
                        {equipStats && (
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '16px' }}>
                              <FireOutlined style={{ marginRight: '8px' }} />
                              装备属性加成
                            </div>
                            <Row gutter={[16, 12]}>
                              {equipStats.totalBaseAttack !== undefined && equipStats.totalBaseAttack > 0 && (
                                <Col span={8}><span style={{ color: '#1890ff' }}>💥 攻击加成: +{equipStats.totalBaseAttack}</span></Col>
                              )}
                              {equipStats.totalBaseDefense !== undefined && equipStats.totalBaseDefense > 0 && (
                                <Col span={8}><span style={{ color: '#52c41a' }}>🛡️ 防御加成: +{equipStats.totalBaseDefense}</span></Col>
                              )}
                              {equipStats.totalBaseHp !== undefined && equipStats.totalBaseHp > 0 && (
                                <Col span={8}><span style={{ color: '#fa8c16' }}>❤️ 生命加成: +{equipStats.totalBaseHp}</span></Col>
                              )}
                              {equipStats.totalBaseSpeed !== undefined && equipStats.totalBaseSpeed > 0 && (
                                <Col span={8}><span style={{ color: '#722ed1' }}>⚡ 速度加成: +{equipStats.totalBaseSpeed}</span></Col>
                              )}
                              {equipStats.critRate !== undefined && equipStats.critRate > 0 && (
                                <Col span={8}><span>💥 暴击率: +{(equipStats.critRate * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.dodgeRate !== undefined && equipStats.dodgeRate > 0 && (
                                <Col span={8}><span>💨 闪避率: +{(equipStats.dodgeRate * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.blockRate !== undefined && equipStats.blockRate > 0 && (
                                <Col span={8}><span>🛡️ 格挡率: +{(equipStats.blockRate * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.comboRate !== undefined && equipStats.comboRate > 0 && (
                                <Col span={8}><span>⚡ 连击率: +{(equipStats.comboRate * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.lifesteal !== undefined && equipStats.lifesteal > 0 && (
                                <Col span={8}><span>🩸 吸血: +{(equipStats.lifesteal * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.critResistance !== undefined && equipStats.critResistance > 0 && (
                                <Col span={8}><span>🔰 暴击抵抗: +{(equipStats.critResistance * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.dodgeResistance !== undefined && equipStats.dodgeResistance > 0 && (
                                <Col span={8}><span>👁️ 闪避抵抗: +{(equipStats.dodgeResistance * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.blockResistance !== undefined && equipStats.blockResistance > 0 && (
                                <Col span={8}><span>🛡️ 格挡抵抗: +{(equipStats.blockResistance * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.comboResistance !== undefined && equipStats.comboResistance > 0 && (
                                <Col span={8}><span>⚡ 连击抵抗: +{(equipStats.comboResistance * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.lifestealResistance !== undefined && equipStats.lifestealResistance > 0 && (
                                <Col span={8}><span>🩸 吸血抵抗: +{(equipStats.lifestealResistance * 100).toFixed(1)}%</span></Col>
                              )}
                            </Row>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ),
            }] : []),
            {
              key: 'skills',
              label: (
                <span>
                  <ThunderboltOutlined /> 技能
                </span>
              ),
              children: (
                <div className={styles.skillsContainer}>
                  <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
                    <div className={styles.emptyText} style={{ fontSize: '16px' }}>技能系统即将开放，敬请期待！</div>
                  </div>
                </div>
              ),
            },
            ...(isOtherUser ? [] : [{
              key: 'shop',
              label: (
                <span>
                  <ShoppingOutlined /> 商店
                </span>
              ),
              children: (
                <div className={styles.shopContainer}>
                  {isOtherUser ? (
                    <div className={styles.shopEmpty}>
                      <div className={styles.emptyIcon}>🛒</div>
                      <div className={styles.emptyText}>无法查看其他用户的商店</div>
                    </div>
                  ) : (
                    <ShopTabs renderSkinsList={renderSkinsList} />
                  )}
                </div>
              ),
            }]),
            {
              key: 'skin',
              label: (
                <span>
                  <SkinOutlined /> 宠物馆
                </span>
              ),
              children: (
                <div className={styles.skinContainer}>
                  {isOtherUser ? (
                    <div className={styles.otherUserSkins}>
                      {pet?.skins && pet.skins.length > 0 ? (
                        <div className={styles.skinsList}>
                          <Row gutter={[12, 12]}>
                            {pet.skins.map((skin) => (
                              <Col span={8} key={skin.skinId}>
                                <Card
                                  className={`${styles.skinCard} ${styles.ownedSkin}`}
                                  hoverable
                                  size="small"
                                  cover={
                                    <div className={styles.skinImageContainer}>
                                      <img
                                        alt={skin.name}
                                        src={skin.url}
                                        className={styles.skinImage}
                                      />
                                      {(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                                       (skin.skinId !== -1 && pet?.petUrl === skin.url) ? (
                                        <div className={styles.currentSkinBadge}>
                                          当前使用
                                        </div>
                                      ) : null}
                                    </div>
                                  }
                                  bodyStyle={{ padding: '12px 16px' }}
                                >
                                  <Card.Meta
                                    title={<div className={styles.skinTitle}>{skin.name}</div>}
                                    description={<div className={styles.skinDescription}>{skin.description}</div>}
                                  />
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <div style={{ fontSize: '16px', marginBottom: '20px' }}>
                            当前宠物
                          </div>
                          <Avatar src={pet?.petUrl} size={100} />
                        </div>
                      )}
                    </div>
                  ) : (
                    renderSkinsList(false)
                  )}
                </div>
              ),
            },
            {
              key: 'achievements',
              label: (
                <span>
                  <TrophyOutlined /> 成就
                </span>
              ),
              children: (
                <div className={styles.achievementsContainer}>
                  <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>🏆</div>
                    <div className={styles.emptyText} style={{ fontSize: '16px' }}>成就系统即将开放，敬请期待！</div>
                  </div>
                </div>
              ),
            },
          ]}
        />
          </Col>
        </Row>

        {/* 装备强化弹窗 */}
        <ForgeModal
          visible={forgeModalVisible}
          slotName={forgeSlotName}
          detail={forgeDetail}
          detailLoading={forgeDetailLoading}
          upgradeLoading={forgeUpgradeLoading}
          refreshLoading={forgeRefreshLoading}
          lockLoading={forgeLockLoading}
          lockedEntries={lockedEntries}
          onClose={() => { setForgeModalVisible(false); setForgeDetail(null); setLockedEntries([]); }}
          onUpgrade={handleForgeUpgrade}
          onRefresh={handleForgeRefresh}
          onToggleLock={toggleEntryLock}
        />
        {/* 查看他人装备词条弹窗（只读） */}
        <ViewForgeModal
          visible={viewForgeModalVisible}
          slotName={viewForgeSlotName}
          detail={viewForgeDetail}
          loading={viewForgeLoading}
          onClose={() => { setViewForgeModalVisible(false); setViewForgeDetail(null); }}
        />
      </div>
    );
  }

  return (
    <Modal
      title={
        <div className={styles.petModalTitle}>
          <span className={styles.petIcon}>🐟</span>
          <span>
            {isOtherUser ? `${otherUserName || '用户'}的宠物` : '我的摸鱼宠物'}
            <Popover
              content={<PetRules />}
              title="宠物系统说明"
              placement="bottom"
              trigger="click"
              overlayStyle={{ width: 300 }}
              overlayInnerStyle={{
                backgroundColor: '#fff',
                boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                size="small"
                className={styles.titleHelpButton}
              />
            </Popover>
          </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
        width={700}
        className={styles.petModal}
    >
      <div className={styles.petContainer}>
        <div className={styles.petInfo}>
          <div className={styles.petAvatar}>
            <Avatar src={pet?.petUrl} size={100} />
          </div>
          <div className={styles.petDetails}>
            <div className={styles.petName}>
              <span className={styles.name}>
                {pet?.name}
                {!isOtherUser && !isRenaming ? (
                  <Tooltip title="修改名称需要消耗100积分">
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setIsRenaming(true)}
                      icon={<EditOutlined />}
                      className={styles.renameButton}
                    >
                      修改
                    </Button>
                  </Tooltip>
                ) : isRenaming ? (
                  <div className={styles.renameContainer}>
                    <Input
                      size="small"
                      placeholder="请输入新名称"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={10}
                      autoFocus
                      className={styles.renameInput}
                      prefix={<EditOutlined />}
                      suffix={
                        <span className={styles.charCount}>
                          {newName.length}/10
                        </span>
                      }
                    />
                    <div className={styles.renameActions}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={handleRename}
                        loading={renameLoading}
                        icon={<CheckOutlined />}
                      >
                        确定
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {setIsRenaming(false); setNewName('');}}
                        icon={<CloseOutlined />}
                        className={styles.cancelButton}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : null}
              </span>
              <span className={styles.level}>Lv.{pet?.level || 1}</span>
            </div>
            <div className={styles.petStatus}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>
                  <HeartOutlined /> 心情:
                </span>
                <div className={styles.statusProgressContainer}>
                  <Progress
                    percent={((pet?.mood || 0) / ((pet as any)?.maxMood || 100)) * 100}
                    status="active"
                    strokeColor="#ff7875"
                    size="small"
                    format={() => `${pet?.mood || 0}/${(pet as any)?.maxMood || 100}`}
                  />
                  <Tooltip title="心情值影响宠物的积分产出和经验获取">
                    <InfoCircleOutlined className={styles.statusInfo} />
                  </Tooltip>
                </div>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>
                  <ThunderboltOutlined /> 饥饿:
                </span>
                <div className={styles.statusProgressContainer}>
                  <Progress
                    percent={((pet?.hunger || 0) / ((pet as any)?.maxHunger || 100)) * 100}
                    status="active"
                    strokeColor="#52c41a"
                    size="small"
                    format={() => `${pet?.hunger || 0}/${(pet as any)?.maxHunger || 100}`}
                  />
                  <Tooltip title="饥饿值影响宠物的积分产出和经验获取">
                    <InfoCircleOutlined className={styles.statusInfo} />
                  </Tooltip>
                </div>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>
                  <ExperimentOutlined /> 经验:
                </span>
                <div className={styles.statusProgressContainer}>
                  {pet && (
                    <>
                      <Progress
                        percent={(pet as any).exp ? (Math.floor((pet as any).exp) / ((pet as any)?.maxExp || 100) * 100) : 0}
                        status="active"
                        strokeColor="#1890ff"
                        size="small"
                        format={() => `${Math.floor((pet as any)?.exp || 0)}/${(pet as any)?.maxExp || 100}`}
                      />
                    </>
                  )}
                  <Tooltip title="每100点经验可提升1级">
                    <InfoCircleOutlined className={styles.statusInfo} />
                  </Tooltip>
                </div>
              </div>
            </div>
            {!isOtherUser ? (
              <div className={styles.petActions} style={{ marginTop: 10 }}>
                <Button
                  type="primary"
                  onClick={handleFeed}
                  loading={feedLoading}
                  style={{ marginRight: 8 }}
                  icon={<GiftOutlined />}
                  className={styles.actionButton}
                >
                  喂食 <span className={styles.costBadge}>-5积分</span>
                  <span className={styles.expBadge}>+1经验</span>
                </Button>
                <Button
                  type="primary"
                  onClick={handlePat}
                  loading={patLoading}
                  icon={<HeartOutlined />}
                  className={styles.actionButton}
                >
                  抚摸 <span className={styles.costBadge}>-3积分</span>
                  <span className={styles.expBadge}>+1经验</span>
                </Button>
              </div>
            ) : (
              <div className={styles.petActions} style={{ marginTop: 10 }}>
                <Button
                  type="primary"
                  danger
                  style={{ marginRight: 8 }}
                  icon={<ThunderboltOutlined />}
                  className={styles.actionButton}
                  onClick={() => {
                    onClose?.();
                    history.push(`/pet/battle?opponentUserId=${otherUserId}`);
                  }}
                >
                  发起对战
                </Button>
              </div>
            )}
          </div>
        </div>

        <Tabs
          defaultActiveKey={isOtherUser ? "equipment" : "items"}
          items={[
            ...(isOtherUser ? [] : [{
              key: 'items',
              label: (
                <span>
                  <GiftOutlined /> 物品
                </span>
              ),
              children: (
                <div className={styles.itemsContainer}>
                  {/* 批量分解按钮 */}
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      danger
                      loading={batchDecomposeLoading}
                      onClick={handleBatchDecomposeBlueGreen}
                      disabled={isOtherUser}
                    >
                      批量分解蓝绿装备
                    </Button>
                  </div>
                  <Spin spinning={itemsLoading}>
                    {items.length > 0 ? (
                      <Row gutter={[12, 12]}>
                        {items.map((item) => {
                          const rarity = item.template?.rarity || 1;
                          const rarityClass = styles[`itemCardRarity${rarity}`];
                          const rarityColors: Record<number, string> = {
                            1: '#52c41a', // 优良-绿色
                            2: '#1890ff', // 精良-蓝色
                            3: '#722ed1', // 史诗-紫色
                            4: '#fa8c16', // 传说-橙色
                            5: '#f5222d', // 神话-红色
                            6: '#eb2f96', // 至尊-粉色
                            7: '#fadb14', // 神器-金色
                          };
                          const rarityNames: Record<number, string> = {
                            1: '优良',
                            2: '精良',
                            3: '史诗',
                            4: '传说',
                            5: '神话',
                            6: '至尊',
                            7: '神器',
                          };
                          // 检查物品是否已穿戴
                          const isEquipped = (() => {
                            const petData = pet as API.PetVO;
                            const equippedItems = petData?.equippedItems;
                            if (!equippedItems) return false;
                            return Object.values(equippedItems).some(
                              (equipped: any) => equipped?.id === item.id
                            );
                          })();
                          return (
                            <Col span={4} key={item.id}>
                              <Tooltip
                                title={
                                  item.equipStats
                                    ? renderEquipStatsTooltip(item, item.template?.name || '')
                                    : (
                                      <div style={{ minWidth: '160px' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                          {item.template?.name || '未知物品'}
                                          {(item.enhanceLevel || 0) > 0 && <span style={{ color: '#faad14' }}>+{item.enhanceLevel}</span>}
                                        </div>
                                        <div style={{ color: '#666', fontSize: '12px' }}>{item.template?.description || '暂无描述'}</div>
                                      </div>
                                    )
                                }
                                overlayInnerStyle={{ backgroundColor: '#fff' }}
                              >
                                <Card
                                  className={`${styles.itemCard} ${rarityClass}`}
                                  bodyStyle={{ padding: '12px 8px', position: 'relative' }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenuItemId(item.id || null);
                                    setContextMenuPosition({ x: e.clientX, y: e.clientY });
                                  }}
                                >
                                <div
                                  className={styles.itemRarity}
                                  style={{ backgroundColor: rarityColors[rarity] }}
                                >
                                  {rarityNames[rarity]}
                                </div>
                                <div className={styles.itemIcon}>
                                  {item.template?.icon ? (
                                    <img src={item.template.icon} alt={item.template.name} style={{ width: 40, height: 40 }} />
                                  ) : (
                                    '📦'
                                  )}
                                </div>
                                <div className={styles.itemName}>{item.template?.name || '未知物品'}</div>
                                <div className={styles.itemCount}>数量: {item.quantity || 0}</div>
                                {/*<div className={styles.itemDesc}>{item.template?.description || '暂无描述'}</div>*/}
                                <div className={styles.itemActions}>
                                  {item.template?.equipSlot && !isEquipped ? (
                                    <Button
                                      type="primary"
                                      size="small"
                                      loading={equipLoading === item.id}
                                      onClick={() => handleEquipItem(item)}
                                    >
                                      穿戴
                                    </Button>
                                  ) : item.template?.equipSlot ? (
                                    <Button
                                      size="small"
                                      disabled
                                    >
                                      已穿戴
                                    </Button>
                                  ) : (
                                    <Button
                                      type="primary"
                                      size="small"
                                      disabled
                                    >
                                      使用
                                    </Button>
                                  )}
                                </div>
                                </Card>
                              </Tooltip>
                            </Col>
                          );
                        })}
                      </Row>
                    ) : (
                      <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                        <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
                        <div className={styles.emptyText} style={{ fontSize: '16px' }}>暂无物品</div>
                      </div>
                    )}
                  </Spin>
                  {/* 右键悬浮菜单 */}
                  {contextMenuItemId && (
                    <>
                      {/* 遮罩层，点击关闭菜单 */}
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 999,
                        }}
                        onClick={() => setContextMenuItemId(null)}
                      />
                      {/* 菜单 */}
                      <div
                        style={{
                          position: 'fixed',
                          left: contextMenuPosition.x,
                          top: contextMenuPosition.y,
                          zIndex: 1000,
                          background: '#fff',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          padding: '8px',
                          minWidth: '100px',
                        }}
                      >
                        <Button
                          danger
                          size="small"
                          loading={decomposeLoading === contextMenuItemId}
                          onClick={() => {
                            const item = items.find(i => i.id === contextMenuItemId);
                            if (item) handleDecomposeItem(item);
                            setContextMenuItemId(null);
                          }}
                          style={{ width: '100%' }}
                        >
                          分解
                        </Button>
                      </div>
                    </>
                  )}
                  {itemsTotal > 0 && (
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                      <Pagination
                        current={itemsCurrent}
                        pageSize={itemsPageSize}
                        total={itemsTotal}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => `共 ${total} 条`}
                        onChange={(page, pageSize) => {
                          setItemsCurrent(page);
                          if (pageSize !== itemsPageSize) {
                            setItemsPageSize(pageSize);
                          }
                        }}
                        onShowSizeChange={(current, size) => {
                          setItemsCurrent(1);
                          setItemsPageSize(size);
                        }}
                      />
                    </div>
                  )}
                </div>
              ),
            }]),
            // 装备标签页 - 查看他人宠物时显示
            ...(isOtherUser ? [{
              key: 'equipment',
              label: (
                <span>
                  <SafetyOutlined /> 装备
                </span>
              ),
              children: (
                <div className={styles.equipmentContainer}>
                  {/* 装备属性统计 */}
                  {(() => {
                    const otherPetData = pet as API.OtherUserPetVO;
                    const equipStats = otherPetData?.equipStats;
                    const equippedItems = (otherPetData as any)?.equippedItems;
                    const viewPetId = (otherPetData as any)?.petId;

                    return (
                      <>
                        {/* 已装备物品展示 */}
                        {equippedItems && Object.keys(equippedItems).length > 0 ? (
                          <div className={styles.equippedItemsSection} style={{ marginBottom: '24px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '16px' }}>
                              <GiftOutlined style={{ marginRight: '8px' }} />
                              已装备物品
                              <span style={{ fontSize: '12px', color: '#999', fontWeight: 'normal', marginLeft: 8 }}>右键装备可查看词条</span>
                            </div>
                            <Row gutter={[12, 12]}>
                              {Object.entries(equippedItems).map(([slot, item]: [string, any]) => {
                                const rarity = item.template?.rarity || 1;
                                const rarityColors: Record<number, string> = {
                                  1: '#52c41a', 2: '#1890ff', 3: '#722ed1', 4: '#fa8c16',
                                  5: '#f5222d', 6: '#eb2f96', 7: '#fadb14',
                                };
                                const rarityNames: Record<number, string> = {
                                  1: '优良', 2: '精良', 3: '史诗', 4: '传说', 5: '神话', 6: '至尊', 7: '神器',
                                };
                                const enhanceLevel = item.enhanceLevel || 0;
                                const tier = getEnhanceTier(enhanceLevel);
                                return (
                                  <Col span={8} key={slot}>
                                    <Tooltip
                                      title={renderEquipStatsTooltip(item, slotDisplayNames[slot] || slot)}
                                      overlayInnerStyle={{ backgroundColor: '#fff' }}
                                    >
                                      <Card
                                        size="small"
                                        style={{
                                          borderColor: rarityColors[rarity],
                                          cursor: 'context-menu',
                                          position: 'relative',
                                          overflow: 'visible',
                                        }}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          if (viewPetId) openViewForgeModal(slot, viewPetId);
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <div style={{ position: 'relative', flexShrink: 0 }}>
                                            {item.template?.icon ? (
                                              <img src={item.template.icon} alt={item.template.name} style={{ width: 36, height: 36, display: 'block' }} />
                                            ) : (
                                              <span style={{ fontSize: '28px', display: 'block' }}>⚔️</span>
                                            )}
                                            {enhanceLevel > 0 && (
                                              <div style={{
                                                position: 'absolute',
                                                top: -8,
                                                right: -10,
                                                background: ENHANCE_BADGE_BG[tier] || 'linear-gradient(135deg,#ff4444,#cc0000)',
                                                color: '#fff',
                                                fontSize: 10,
                                                fontWeight: 800,
                                                padding: '2px 5px',
                                                borderRadius: 8,
                                                border: '1.5px solid #fff',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                                lineHeight: 1,
                                                zIndex: 10,
                                                whiteSpace: 'nowrap',
                                              }}>
                                                +{enhanceLevel}
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {item.template?.name || '未知装备'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: rarityColors[rarity] }}>
                                              {slotDisplayNames[slot] || slot} · {rarityNames[rarity]}
                                            </div>
                                          </div>
                                        </div>
                                      </Card>
                                    </Tooltip>
                                  </Col>
                                );
                              })}
                            </Row>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '30px 0', marginBottom: '24px' }}>
                            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎒</div>
                            <div style={{ fontSize: '14px', color: '#999' }}>暂无装备</div>
                          </div>
                        )}

                        {/* 装备属性统计 */}
                        {equipStats && (
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '16px' }}>
                              <FireOutlined style={{ marginRight: '8px' }} />
                              装备属性加成
                            </div>
                            <Row gutter={[16, 12]}>
                              {equipStats.totalBaseAttack !== undefined && equipStats.totalBaseAttack > 0 && (
                                <Col span={8}><span style={{ color: '#1890ff' }}>💥 攻击加成: +{equipStats.totalBaseAttack}</span></Col>
                              )}
                              {equipStats.totalBaseDefense !== undefined && equipStats.totalBaseDefense > 0 && (
                                <Col span={8}><span style={{ color: '#52c41a' }}>🛡️ 防御加成: +{equipStats.totalBaseDefense}</span></Col>
                              )}
                              {equipStats.totalBaseHp !== undefined && equipStats.totalBaseHp > 0 && (
                                <Col span={8}><span style={{ color: '#fa8c16' }}>❤️ 生命加成: +{equipStats.totalBaseHp}</span></Col>
                              )}
                              {equipStats.totalBaseSpeed !== undefined && equipStats.totalBaseSpeed > 0 && (
                                <Col span={8}><span style={{ color: '#722ed1' }}>⚡ 速度加成: +{equipStats.totalBaseSpeed}</span></Col>
                              )}
                              {equipStats.critRate !== undefined && equipStats.critRate > 0 && (
                                <Col span={8}><span>💥 暴击率: +{(equipStats.critRate * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.dodgeRate !== undefined && equipStats.dodgeRate > 0 && (
                                <Col span={8}><span>💨 闪避率: +{(equipStats.dodgeRate * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.blockRate !== undefined && equipStats.blockRate > 0 && (
                                <Col span={8}><span>🛡️ 格挡率: +{(equipStats.blockRate * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.comboRate !== undefined && equipStats.comboRate > 0 && (
                                <Col span={8}><span>⚡ 连击率: +{(equipStats.comboRate * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.lifesteal !== undefined && equipStats.lifesteal > 0 && (
                                <Col span={8}><span>🩸 吸血: +{(equipStats.lifesteal * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.critResistance !== undefined && equipStats.critResistance > 0 && (
                                <Col span={8}><span>🔰 暴击抵抗: +{(equipStats.critResistance * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.dodgeResistance !== undefined && equipStats.dodgeResistance > 0 && (
                                <Col span={8}><span>👁️ 闪避抵抗: +{(equipStats.dodgeResistance * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.blockResistance !== undefined && equipStats.blockResistance > 0 && (
                                <Col span={8}><span>🛡️ 格挡抵抗: +{(equipStats.blockResistance * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.comboResistance !== undefined && equipStats.comboResistance > 0 && (
                                <Col span={8}><span>⚡ 连击抵抗: +{(equipStats.comboResistance * 100).toFixed(1)}%</span></Col>
                              )}
                              {equipStats.lifestealResistance !== undefined && equipStats.lifestealResistance > 0 && (
                                <Col span={8}><span>🩸 吸血抵抗: +{(equipStats.lifestealResistance * 100).toFixed(1)}%</span></Col>
                              )}
                            </Row>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ),
            }] : []),
            {
              key: 'skills',
              label: (
                <span>
                  <ThunderboltOutlined /> 技能
                </span>
              ),
              children: (
                <div className={styles.skillsContainer}>
                  <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
                    <div className={styles.emptyText} style={{ fontSize: '16px' }}>技能系统即将开放，敬请期待！</div>
                  </div>
                </div>
              ),
            },
            ...(isOtherUser ? [] : [{
              key: 'shop',
              label: (
                <span>
                  <ShoppingOutlined /> 商店
                </span>
              ),
              children: (
                <div className={styles.shopContainer}>
                  {isOtherUser ? (
                    <div className={styles.shopEmpty}>
                      <div className={styles.emptyIcon}>🛒</div>
                      <div className={styles.emptyText}>无法查看其他用户的商店</div>
                    </div>
                  ) : (
                    <ShopTabs renderSkinsList={renderSkinsList} />
                  )}
                </div>
              ),
            }]),
            {
              key: 'skin',
              label: (
                <span>
                  <SkinOutlined /> 宠物馆
                </span>
              ),
              children: (
                <div className={styles.skinContainer}>
                  {isOtherUser ? (
                    <div className={styles.otherUserSkins}>
                      {pet?.skins && pet.skins.length > 0 ? (
                        <div className={styles.skinsList}>
                          <Row gutter={[12, 12]}>
                            {pet.skins.map((skin) => (
                              <Col span={8} key={skin.skinId}>
                                <Card
                                  className={`${styles.skinCard} ${styles.ownedSkin}`}
                                  hoverable
                                  size="small"
                                  cover={
                                    <div className={styles.skinImageContainer}>
                                      <img
                                        alt={skin.name}
                                        src={skin.url}
                                        className={styles.skinImage}
                                      />
                                      {(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                                       (skin.skinId !== -1 && pet?.petUrl === skin.url) ? (
                                        <div className={styles.currentSkinBadge}>
                                          当前使用
                                        </div>
                                      ) : null}
                                    </div>
                                  }
                                  bodyStyle={{ padding: '12px 16px' }}
                                >
                                  <Card.Meta
                                    title={<div className={styles.skinTitle}>{skin.name}</div>}
                                    description={<div className={styles.skinDescription}>{skin.description}</div>}
                                  />
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <div style={{ fontSize: '16px', marginBottom: '20px' }}>
                            当前宠物
                          </div>
                          <Avatar src={pet?.petUrl} size={100} />
                        </div>
                      )}
                    </div>
                  ) : (
                    renderSkinsList(false)
                  )}
                </div>
              ),
            },
            {
              key: 'achievements',
              label: (
                <span>
                  <TrophyOutlined /> 成就
                </span>
              ),
              children: (
                <div className={styles.achievementsContainer}>
                  <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>🏆</div>
                    <div className={styles.emptyText} style={{ fontSize: '16px' }}>成就系统即将开放，敬请期待！</div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
      {/* 装备强化弹窗 */}
      <ForgeModal
        visible={forgeModalVisible}
        slotName={forgeSlotName}
        detail={forgeDetail}
        detailLoading={forgeDetailLoading}
        upgradeLoading={forgeUpgradeLoading}
        refreshLoading={forgeRefreshLoading}
        lockLoading={forgeLockLoading}
        lockedEntries={lockedEntries}
        onClose={() => { setForgeModalVisible(false); setForgeDetail(null); setLockedEntries([]); }}
        onUpgrade={handleForgeUpgrade}
        onRefresh={handleForgeRefresh}
        onToggleLock={toggleEntryLock}
      />
      {/* 查看他人装备词条弹窗（只读） */}
      <ViewForgeModal
        visible={viewForgeModalVisible}
        slotName={viewForgeSlotName}
        detail={viewForgeDetail}
        loading={viewForgeLoading}
        onClose={() => { setViewForgeModalVisible(false); setViewForgeDetail(null); }}
      />
    </Modal>
  );
};

// 添加一个新的MiniPet组件，用于在聊天输入框上方显示
export interface MiniPetProps {
  onClick?: () => void;
}

// 使用全局变量缓存宠物数据，避免组件重新渲染时重复请求
let cachedPet: API.PetVO | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存时间

export const MiniPet: React.FC<MiniPetProps> = ({ onClick }) => {
  const { initialState } = useModel('@@initialState');
  const [pet, setPet] = useState<API.PetVO | null>(cachedPet);
  const [loading, setLoading] = useState(!cachedPet);
  const [position, setPosition] = useState(() => {
    // 从localStorage读取保存的位置，如果没有则使用默认值
    const savedPosition = localStorage.getItem('miniPetPosition');
    return savedPosition ? JSON.parse(savedPosition) : { x: 20, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const petRef = useRef<HTMLDivElement>(null);
  const initialPosition = useRef({ x: 0, y: 0 });

  // 获取宠物数据，使用缓存减少请求
  const fetchPetData = async (force = false) => {
    // 检查用户是否登录
    if (!initialState?.currentUser) {
      // 如果用户未登录，不发送请求
      setLoading(false);
      return;
    }

    // 如果有缓存且未过期，直接使用缓存数据
    const now = Date.now();
    if (!force && cachedPet && (now - lastFetchTime < CACHE_DURATION)) {
      setPet(cachedPet);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getPetDetailUsingGet();
      if (res.code === 0 && res.data) {
        // 更新缓存和状态
        cachedPet = res.data;
        lastFetchTime = now;
        setPet(res.data);
      }
    } catch (error) {
      console.error('获取宠物信息失败', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理拖动开始
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();

    let clientX, clientY;
    if ('touches' in e) {
      // 触摸事件
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // 鼠标事件
      clientX = e.clientX;
      clientY = e.clientY;
      e.preventDefault(); // 只在鼠标事件中阻止默认行为
    }

    // 记录初始位置，用于判断是否真的发生了拖动
    initialPosition.current = { ...position };

    setIsDragging(true);
    setStartPos({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  // 处理拖动过程
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const newX = clientX - startPos.x;
    const newY = clientY - startPos.y;

    // 限制宠物不能拖出屏幕
    const petElement = petRef.current;
    if (petElement) {
      const petWidth = petElement.offsetWidth;
      const petHeight = petElement.offsetHeight;
      const maxX = window.innerWidth - petWidth;
      const maxY = window.innerHeight - petHeight;

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: boundedX, y: boundedY });
    }
  }, [isDragging, startPos]);

  // 处理拖动结束
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);

      // 判断是否真的发生了拖动
      const hasMoved = initialPosition.current.x !== position.x || initialPosition.current.y !== position.y;

      if (hasMoved) {
        // 标记刚刚完成了拖动操作
        setWasDragging(true);
        // 保存位置到localStorage
        localStorage.setItem('miniPetPosition', JSON.stringify(position));

        // 100ms后重置拖动标记，这样点击事件才能再次被触发
        // 减少时间以提高响应速度
        setTimeout(() => {
          setWasDragging(false);
        }, 100);
      }
    }
  }, [isDragging, position]);

  // 处理点击事件
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 只有在非拖动状态下才触发点击事件
    if (!isDragging && !wasDragging && onClick) {
      onClick();
    }
  };

  // 添加单独的点击处理函数，确保点击能正常触发
  const handlePetClick = () => {
    if (!isDragging && !wasDragging && onClick) {
      onClick();
    }
  };

  useEffect(() => {
    // 初始加载时获取数据
    fetchPetData();

    // 每30分钟刷新一次宠物数据，减少请求频率
    const intervalId = setInterval(() => fetchPetData(true), CACHE_DURATION);

    // 添加拖动相关的事件监听
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (loading || !pet) {
    return null;
  }

  return (
    <div
      ref={petRef}
      className={`${styles.miniPet} ${isDragging ? styles.dragging : ''}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onClick={handlePetClick} // 使用专门的点击处理函数
    >
      <div onClick={handlePetClick} style={{ width: '100%', height: '100%' }}>
        <Tooltip title={`${pet.name} (Lv.${pet.level}) - 可拖动调整位置`}>
          <img
            src={pet.petUrl}
            alt="我的宠物"
            className={styles.miniPetImage}
            draggable={false}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default MoyuPet;

