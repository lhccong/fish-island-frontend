import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Layout,
  Modal,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ReloadOutlined,
  GiftOutlined,
  EnvironmentOutlined,
  StarOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { getAllCropsUsingGet } from '@/services/backend/cropController';
import {
  getMyLandsUsingGet,
  harvestUsingPost,
  plantUsingPost,
} from '@/services/backend/landController';
import { getMyFarmUserUsingGet } from '@/services/backend/farmUserController';
import { getLoginUserUsingGet } from '@/services/backend/userController';
import './index.less';

const { Content } = Layout;
const { Title, Text } = Typography;

const GRID_COLS = 6;
const GRID_ROWS = 4;
const TOTAL_LANDS = GRID_COLS * GRID_ROWS;

type GridSlot = { row: number; col: number };

/**
 * 等轴 landIndex 顺序（从 1 开始）：
 * 先走最右上一列向下 (1→4)，再向左下一列 (5…)，即按列遍历、列内自上而下
 */
const buildSlotOrder = (): GridSlot[] => {
  const slots: GridSlot[] = [];
  for (let col = 0; col < GRID_COLS; col += 1) {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      slots.push({ row, col });
    }
  }
  return slots;
};

const SLOT_ORDER = buildSlotOrder();

/** 地块状态：0-空闲 1-种植中 2-已成熟 */
const LAND_STATUS = {
  EMPTY: 0,
  GROWING: 1,
  MATURE: 2,
} as const;

const CATEGORY_LABEL: Record<string, string> = {
  grain: '粮食',
  vegetable: '蔬菜',
  fruit: '水果',
  flower: '花卉',
  specialty: '特产',
};

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return '即将成熟';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}时${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
};

/** landIndex 从 1 开始，按等轴显示顺序填入网格 */
const buildLandGrid = (lands: API.LandDTO[]): (API.LandDTO | null)[] => {
  const grid: (API.LandDTO | null)[] = Array(TOTAL_LANDS).fill(null);
  const landByIndex = new Map<number, API.LandDTO>();
  lands.forEach((land) => {
    const li = land.landIndex;
    if (li != null && li >= 1 && li <= TOTAL_LANDS) {
      landByIndex.set(li, land);
    }
  });
  SLOT_ORDER.forEach((_, arrayIndex) => {
    const land = landByIndex.get(arrayIndex + 1);
    if (land) grid[arrayIndex] = land;
  });
  return grid;
};

const toLandIndex = (arrayIndex: number): number => arrayIndex + 1;

/** 地块是否已解锁：有记录且 locked !== 1 */
const isLandUnlocked = (land: API.LandDTO | null): boolean => {
  if (!land?.id) return false;
  return land.locked !== 1;
};

const isCropIconUrl = (icon?: string): boolean => {
  if (!icon) return false;
  const v = icon.trim();
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith('//') ||
    v.startsWith('/') ||
    v.startsWith('data:')
  );
};

const CropIcon: React.FC<{
  crop?: API.CropDTO;
  className?: string;
  alt?: string;
}> = ({ crop, className, alt }) => {
  const icon = crop?.icon?.trim();
  if (!icon) {
    return <span className={className}>🌱</span>;
  }
  if (isCropIconUrl(icon)) {
    return (
      <img
        className={className}
        src={icon}
        alt={alt ?? crop?.name ?? '作物'}
        draggable={false}
      />
    );
  }
  return <span className={className}>{icon}</span>;
};

const Farm: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const availablePoints =
    (currentUser?.points ?? 0) - (currentUser?.usedPoints ?? 0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lands, setLands] = useState<API.LandDTO[]>([]);
  const [crops, setCrops] = useState<API.CropDTO[]>([]);
  const [farmUser, setFarmUser] = useState<API.FarmUserVO | null>(null);
  const [now, setNow] = useState(Date.now());

  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const [selectedLand, setSelectedLand] = useState<API.LandDTO | null>(null);
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const refreshCurrentUser = useCallback(async () => {
    try {
      const res = await getLoginUserUsingGet();
      if (res.data) {
        setInitialState((s) => ({
          ...s,
          currentUser: res.data,
        }));
      }
    } catch {
      /* 积分刷新失败不影响主流程 */
    }
  }, [setInitialState]);

  const loadFarmData = useCallback(async () => {
    setLoading(true);
    try {
      const [landsRes, cropsRes, farmRes] = await Promise.all([
        getMyLandsUsingGet(),
        getAllCropsUsingGet(),
        getMyFarmUserUsingGet(),
      ]);

      if (landsRes.code === 0 && landsRes.data) {
        setLands(landsRes.data);
      } else {
        message.error(landsRes.message || '加载地块失败');
      }

      if (cropsRes.code === 0 && cropsRes.data) {
        setCrops(cropsRes.data);
      }

      if (farmRes.code === 0 && farmRes.data) {
        setFarmUser(farmRes.data);
      }
    } catch (e) {
      message.error('加载农场数据失败');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFarmData();
  }, [loadFarmData]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const landGrid = useMemo(() => buildLandGrid(lands), [lands]);

  const unlockedCount = useMemo(
    () => landGrid.filter(isLandUnlocked).length,
    [landGrid],
  );

  const cropMap = useMemo(() => {
    const map = new Map<number, API.CropDTO>();
    crops.forEach((c) => {
      if (c.id != null) map.set(c.id, c);
    });
    return map;
  }, [crops]);

  const matureLands = useMemo(
    () =>
      lands.filter(
        (l) => l.status === LAND_STATUS.MATURE && l.id != null && isLandUnlocked(l),
      ),
    [lands],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    crops.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ['all', ...Array.from(set)];
  }, [crops]);

  const filteredCrops = useMemo(() => {
    if (activeCategory === 'all') return crops;
    return crops.filter((c) => c.category === activeCategory);
  }, [crops, activeCategory]);

  const getLandRemainingMs = (land: API.LandDTO): number => {
    if (!land.harvestTime) return 0;
    return new Date(land.harvestTime).getTime() - now;
  };

  const getPlotTooltip = (
    land: API.LandDTO | null,
    arrayIndex: number,
  ): string => {
    const landIndex = toLandIndex(arrayIndex);
    if (!isLandUnlocked(land)) {
      if (landIndex === 1) return '第 1 块地尚未解锁';
      const prevUnlocked = isLandUnlocked(landGrid[arrayIndex - 1]);
      if (!prevUnlocked) return `请先解锁第 ${landIndex - 1} 块地`;
      return `第 ${landIndex} 块地尚未解锁`;
    }
    if (land!.status === LAND_STATUS.MATURE) {
      return `点击收获 ${land!.cropName || ''}`;
    }
    if (land!.status === LAND_STATUS.GROWING) {
      return `${land!.cropName || '作物'} · ${formatCountdown(getLandRemainingMs(land!))}`;
    }
    return '点击种植';
  };

  const handlePlotClick = (land: API.LandDTO | null, arrayIndex: number) => {
    const landIndex = toLandIndex(arrayIndex);
    if (!isLandUnlocked(land)) {
      if (landIndex > 1 && !isLandUnlocked(landGrid[arrayIndex - 1])) {
        message.info('土地按顺序解锁，请先解锁前一块地');
      } else {
        message.info(`第 ${landIndex} 块地尚未解锁，升级农场后可开垦`);
      }
      return;
    }

    if (land!.status === LAND_STATUS.MATURE) {
      handleHarvest([land!.id!]);
      return;
    }

    if (land!.status === LAND_STATUS.GROWING) {
      const remain = getLandRemainingMs(land!);
      const crop = land!.plantedCropId
        ? cropMap.get(land!.plantedCropId)
        : undefined;
      message.info(
        `${land!.cropName || crop?.name || '作物'}生长中，剩余 ${formatCountdown(remain)}`,
      );
      return;
    }

    setSelectedLand({ ...land!, landIndex: land!.landIndex ?? landIndex });
    setSelectedCropId(null);
    setPlantModalOpen(true);
  };

  const handleHarvest = async (landIds: number[]) => {
    if (landIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await harvestUsingPost({ landIds });
      if (res.code === 0) {
        message.success(
          landIds.length > 1
            ? `成功收获 ${landIds.length} 块地！`
            : '收获成功，积分已入账～',
        );
        if (res.data) setLands(res.data);
        else await loadFarmData();
        await refreshCurrentUser();
      } else {
        message.error(res.message || '收获失败');
      }
    } catch (e) {
      message.error('收获失败');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHarvestAll = () => {
    const ids = matureLands.map((l) => l.id!).filter(Boolean);
    handleHarvest(ids);
  };

  const handlePlant = async () => {
    if (!selectedLand?.id || selectedCropId == null) {
      message.warning('请选择要种植的作物');
      return;
    }
    setActionLoading(true);
    try {
      const res = await plantUsingPost({
        items: [{ landId: selectedLand.id, cropId: selectedCropId }],
      });
      if (res.code === 0) {
        message.success('播种成功，耐心等待成熟吧～');
        setPlantModalOpen(false);
        setSelectedLand(null);
        setSelectedCropId(null);
        if (res.data) setLands(res.data);
        else await loadFarmData();
      } else {
        message.error(res.message || '种植失败');
      }
    } catch (e) {
      message.error('种植失败');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const renderPlotOverlay = (land: API.LandDTO | null) => {
    const unlocked = isLandUnlocked(land);

    if (!unlocked) {
      return (
        <div className="plot-overlay plot-overlay-locked">
          <LockOutlined className="plot-lock-icon" />
          <span className="plot-lock-text">未解锁</span>
        </div>
      );
    }

    const crop =
      land!.plantedCropId != null
        ? cropMap.get(land!.plantedCropId)
        : undefined;
    if (land!.status === LAND_STATUS.MATURE) {
      return (
        <div className="plot-overlay">
          <CropIcon crop={crop} className="plot-crop-icon mature" />
          <span className="plot-harvest-hint">收获</span>
          <span className="plot-sparkle" aria-hidden />
        </div>
      );
    }

    if (land!.status === LAND_STATUS.GROWING) {
      return (
        <div className="plot-overlay">
          <CropIcon crop={crop} className="plot-crop-icon growing" />
          <span className="plot-timer">{formatCountdown(getLandRemainingMs(land!))}</span>
        </div>
      );
    }

    return null;
  };

  const getPlotClassName = (land: API.LandDTO | null, arrayIndex: number): string => {
    const classes = ['farm-plot'];
    const unlocked = isLandUnlocked(land);
    if (!unlocked) {
      classes.push('is-locked');
      if (arrayIndex === unlockedCount) classes.push('is-next-unlock');
      return classes.join(' ');
    }
    if (land!.status === LAND_STATUS.MATURE) classes.push('is-mature');
    else if (land!.status === LAND_STATUS.GROWING) classes.push('is-growing');
    else classes.push('is-empty');
    return classes.join(' ');
  };

  return (
    <div className="farm-page">
      <div className="farm-header-bar">
        <div className="farm-header-left">
          <EnvironmentOutlined className="farm-header-icon" />
          <div>
            <Title level={4} className="farm-header-title">
              摸鱼农场
            </Title>
            <Text type="secondary" className="farm-header-sub">
              种下希望，收获积分
            </Text>
          </div>
        </div>
        <div className="farm-header-stats">
          <div className="farm-stat-chip">
            <StarOutlined />
            <span>Lv.{farmUser?.level ?? 1}</span>
          </div>
          <div className="farm-stat-chip">
            <span>田地 {unlockedCount}/{TOTAL_LANDS}</span>
          </div>
          <div className="farm-stat-chip points">
            <GiftOutlined />
            <span>可用积分 {availablePoints}</span>
          </div>
          <div className="farm-stat-chip">
            <span>收获 {farmUser?.totalHarvest ?? 0} 次</span>
          </div>
        </div>
        <div className="farm-header-actions">
          {matureLands.length > 0 && (
            <Button
              type="primary"
              className="harvest-all-btn"
              loading={actionLoading}
              onClick={handleHarvestAll}
            >
              一键收菜 ({matureLands.length})
            </Button>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={loadFarmData}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      </div>

      <Content className="farm-content">
        <Spin spinning={loading} wrapperClassName="farm-spin-wrap">
          <div className="farm-scene">
            <div className="farm-deco farm-deco-sign">劳动光荣</div>

            <div className="farm-land-field">
              <div className="farm-iso-stage">
                <div className="farm-field-board">
                  <div className="farm-field-inner">
                    <div className="farm-iso-grid">
                  {SLOT_ORDER.map((slot, arrayIndex) => {
                    const land = landGrid[arrayIndex];
                    const landIndex = toLandIndex(arrayIndex);
                    return (
                      <div
                        key={land?.id ?? `slot-${landIndex}`}
                        className="farm-plot-slot"
                        style={
                          {
                            '--iso-col': slot.col,
                            '--iso-row': slot.row,
                            zIndex: slot.col + slot.row + 1,
                          } as React.CSSProperties
                        }
                      >
                        <Tooltip title={getPlotTooltip(land, arrayIndex)}>
                          <button
                            type="button"
                            className={getPlotClassName(land, arrayIndex)}
                            disabled={!isLandUnlocked(land) || actionLoading}
                            onClick={() => handlePlotClick(land, arrayIndex)}
                          >
                            <span className="plot-soil" aria-hidden>
                              <span className="plot-tile-surface" />
                              <span className="plot-mound" />
                            </span>
                            {renderPlotOverlay(land)}
                          </button>
                        </Tooltip>
                      </div>
                    );
                  })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Spin>
      </Content>

      <Modal
        title={
          selectedLand
            ? `选择种子 · 地块 ${selectedLand.landIndex ?? 1}`
            : '选择种子'
        }
        open={plantModalOpen}
        onCancel={() => {
          setPlantModalOpen(false);
          setSelectedLand(null);
          setSelectedCropId(null);
        }}
        onOk={handlePlant}
        okText="开始种植"
        cancelText="取消"
        confirmLoading={actionLoading}
        width={520}
        className="farm-plant-modal"
        destroyOnClose
      >
        <div className="crop-category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`crop-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? '全部' : CATEGORY_LABEL[cat] ?? cat}
            </button>
          ))}
        </div>

        <div className="crop-select-list">
          {filteredCrops.length === 0 ? (
            <Empty description="暂无可用作物" />
          ) : (
            filteredCrops.map((crop) => {
              const locked = crop.locked === true;
              const selected = selectedCropId === crop.id;
              return (
                <button
                  key={crop.id}
                  type="button"
                  className={`crop-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                  disabled={locked}
                  onClick={() => !locked && crop.id != null && setSelectedCropId(crop.id)}
                >
                  <CropIcon crop={crop} className="crop-card-icon" />
                  <div className="crop-card-info">
                    <span className="crop-card-name">{crop.name}</span>
                    <span className="crop-card-meta">
                      {crop.growthTime ?? 0} 分钟 · +{crop.coin ?? 0} 积分
                    </span>
                    {locked && (
                      <Tag color="default" className="crop-lock-tag">
                        Lv.{crop.unlockLevel} 解锁
                      </Tag>
                    )}
                  </div>
                  {selected && <span className="crop-selected-mark">✓</span>}
                </button>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Farm;
