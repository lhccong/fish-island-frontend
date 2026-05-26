import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
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
  PlusOutlined,
  TeamOutlined,
  MailOutlined,
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
import { getMyStolenRecordsUsingGet } from '@/services/backend/stealController';
import FarmFriendsModal, { type FriendTab } from './FarmFriendsModal';
import FarmCottageDeco from './FarmCottageDeco';
import './index.less';

const { Content } = Layout;
const { Title, Text } = Typography;

const GRID_COLS = 6;
const GRID_ROWS = 4;
const TOTAL_LANDS = GRID_COLS * GRID_ROWS;

const FARM_HARVEST_ICON =
  'https://oss.cqbo.com/moyu/farm/toucai.png';

type GridSlot = { row: number; col: number };

/** landIndex 顺序（从 1 开始）：自上而下、每行从左到右，一行六块 */
const buildSlotOrder = (): GridSlot[] => {
  const slots: GridSlot[] = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
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

/** landIndex 从 1 开始，按网格显示顺序填入 */
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

/** 收获/种植接口可能只返回变更地块，按 id 或 landIndex 合并进本地列表 */
const mergeLandUpdates = (
  prev: API.LandDTO[],
  updates: API.LandDTO[],
): API.LandDTO[] => {
  if (updates.length === 0) return prev;
  const byId = new Map<number, API.LandDTO>();
  const byIndex = new Map<number, API.LandDTO>();
  updates.forEach((land) => {
    if (land.id != null) byId.set(land.id, land);
    if (land.landIndex != null) byIndex.set(land.landIndex, land);
  });
  let hit = false;
  const merged = prev.map((land) => {
    if (land.id != null && byId.has(land.id)) {
      hit = true;
      return byId.get(land.id)!;
    }
    if (land.landIndex != null && byIndex.has(land.landIndex)) {
      hit = true;
      return byIndex.get(land.landIndex)!;
    }
    return land;
  });
  return hit ? merged : [...prev, ...updates];
};

/** 地块是否已解锁：有记录且 locked !== 1 */
const isLandUnlocked = (land: API.LandDTO | null): boolean => {
  if (!land?.id) return false;
  return land.locked !== 1;
};

/** 地块是否空闲可播种 */
const isLandEmpty = (land: API.LandDTO | null): boolean => {
  if (!isLandUnlocked(land)) return false;
  const status = land!.status;
  return status == null || status === LAND_STATUS.EMPTY;
};

/** 地块是否可收获：后端 status=2，或种植中但 harvestTime 已到 */
const isLandMature = (land: API.LandDTO, currentNow: number): boolean => {
  if (land.status === LAND_STATUS.MATURE) return true;
  if (land.status !== LAND_STATUS.GROWING || !land.harvestTime) return false;
  return new Date(land.harvestTime).getTime() <= currentNow;
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
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [friendsInitialTab, setFriendsInitialTab] = useState<FriendTab>('play');
  const [stolenRecords, setStolenRecords] = useState<API.FarmStealRecordVO[]>([]);
  const [stolenLoading, setStolenLoading] = useState(false);
  const [selectedLandIds, setSelectedLandIds] = useState<number[]>([]);
  const [plantAnchorLandId, setPlantAnchorLandId] = useState<number | null>(null);
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

  const loadStolenRecords = useCallback(async () => {
    setStolenLoading(true);
    try {
      const res = await getMyStolenRecordsUsingGet();
      if (res.code === 0 && res.data) {
        setStolenRecords(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStolenLoading(false);
    }
  }, []);

  const refreshLandsAndFarmUser = useCallback(async (): Promise<boolean> => {
    try {
      const [landsRes, farmRes] = await Promise.all([
        getMyLandsUsingGet(),
        getMyFarmUserUsingGet(),
      ]);
      if (landsRes.code === 0 && landsRes.data) {
        setLands(landsRes.data);
      } else {
        return false;
      }
      if (farmRes.code === 0 && farmRes.data) {
        setFarmUser(farmRes.data);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);

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

      await loadStolenRecords();
    } catch (e) {
      message.error('加载农场数据失败');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [loadStolenRecords]);

  const openFriendsModal = useCallback((tab: FriendTab = 'play') => {
    setFriendsInitialTab(tab);
    setFriendsModalOpen(true);
  }, []);

  const handleCloseFriendsModal = useCallback(() => {
    setFriendsModalOpen(false);
    setFriendsInitialTab('play');
  }, []);

  useEffect(() => {
    loadFarmData();
  }, [loadFarmData]);

  /** 锁定文档滚动，避免 ProLayout 固定头 + 100vh 叠算出现细滚动条 */
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('farm-route-lock');
    const layout = document.querySelector('.ant-pro-layout');
    layout?.classList.add('farm-route-lock');
    return () => {
      html.classList.remove('farm-route-lock');
      layout?.classList.remove('farm-route-lock');
    };
  }, []);

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
        (l) => isLandMature(l, now) && l.id != null && isLandUnlocked(l),
      ),
    [lands, now],
  );

  const emptyLands = useMemo(
    () => lands.filter((l) => l.id != null && isLandEmpty(l)),
    [lands],
  );

  const plantAllSelected = useMemo(
    () =>
      emptyLands.length > 0 &&
      selectedLandIds.length === emptyLands.length &&
      emptyLands.every((l) => selectedLandIds.includes(l.id!)),
    [emptyLands, selectedLandIds],
  );

  const getPlantModalTitle = (): string => {
    const count = selectedLandIds.length;
    if (count === 0) return '选择种子';
    if (count === 1) {
      const land = lands.find((l) => l.id === selectedLandIds[0]);
      return `选择种子 · 地块 ${land?.landIndex ?? 1}`;
    }
    return `选择种子 · ${count} 块空地`;
  };

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
    if (isLandMature(land!, now)) {
      return `点击收获 ${land!.cropName || ''}`;
    }
    if (land!.status === LAND_STATUS.GROWING) {
      return `${land!.cropName || '作物'} · ${formatCountdown(getLandRemainingMs(land!))}`;
    }
    if (emptyLands.length > 1) return '点击种植，或使用一键播种';
    return '点击种植';
  };

  const closePlantModal = () => {
    setPlantModalOpen(false);
    setSelectedLandIds([]);
    setPlantAnchorLandId(null);
    setSelectedCropId(null);
  };

  const openPlantModal = (landIds: number[], anchorLandId?: number) => {
    setSelectedLandIds(landIds);
    setPlantAnchorLandId(
      anchorLandId ?? (landIds.length === 1 ? landIds[0] : null),
    );
    setSelectedCropId(null);
    setPlantModalOpen(true);
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

    if (isLandMature(land!, now)) {
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

    openPlantModal([land!.id!], land!.id!);
  };

  const handlePlantAll = () => {
    const ids = emptyLands.map((l) => l.id!).filter(Boolean);
    if (ids.length === 0) return;
    openPlantModal(ids);
  };

  const handlePlantBatchToggle = (plantAll: boolean) => {
    if (plantAll) {
      setSelectedLandIds(emptyLands.map((l) => l.id!).filter(Boolean));
      return;
    }
    const fallbackId =
      plantAnchorLandId ?? emptyLands[0]?.id ?? selectedLandIds[0];
    if (fallbackId != null) setSelectedLandIds([fallbackId]);
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
        const refreshed = await refreshLandsAndFarmUser();
        if (!refreshed && res.data?.length) {
          setLands((prev) => mergeLandUpdates(prev, res.data!));
        }
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
    if (selectedLandIds.length === 0 || selectedCropId == null) {
      message.warning('请选择要种植的作物');
      return;
    }
    setActionLoading(true);
    try {
      const res = await plantUsingPost({
        items: selectedLandIds.map((landId) => ({
          landId,
          cropId: selectedCropId,
        })),
      });
      if (res.code === 0) {
        message.success(
          selectedLandIds.length > 1
            ? `已在 ${selectedLandIds.length} 块地播种，耐心等待成熟吧～`
            : '播种成功，耐心等待成熟吧～',
        );
        closePlantModal();
        const refreshed = await refreshLandsAndFarmUser();
        if (!refreshed && res.data?.length) {
          setLands((prev) => mergeLandUpdates(prev, res.data!));
        } else if (!refreshed) {
          await loadFarmData();
        }
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
    if (isLandMature(land!, now)) {
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
    if (isLandMature(land!, now)) classes.push('is-mature');
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
          {emptyLands.length > 0 && (
            <Button
              type="primary"
              className="plant-all-btn"
              icon={<PlusOutlined />}
              loading={actionLoading}
              onClick={handlePlantAll}
            >
              一键播种 ({emptyLands.length})
            </Button>
          )}
          <button
            type="button"
            className="farm-friends-fab"
            aria-label="好友"
            onClick={() => openFriendsModal('play')}
          >
            <TeamOutlined />
            <span>好友</span>
          </button>
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
            <div className="farm-world">
              <aside className="farm-world-side farm-world-side--left">
                <div className="farm-deco farm-deco-sign">劳动光荣</div>
                <Tooltip title="谁偷了我的菜">
                  <button
                    type="button"
                    className="farm-deco farm-deco-mail"
                    aria-label={`谁偷了我的菜，${stolenRecords.length} 条记录`}
                    onClick={() => {
                      loadStolenRecords();
                      openFriendsModal('visitor');
                    }}
                  >
                    <Badge count={stolenRecords.length} size="small" offset={[-2, 2]}>
                      <span className="farm-deco-mail-icon">
                        <MailOutlined />
                      </span>
                    </Badge>
                  </button>
                </Tooltip>
              </aside>

              <div className="farm-land-field">
              <div className="farm-field-stack">
              <div className="farm-grid-stage">
                <div className="farm-stage-cluster">
                <div className="farm-field-board">
                  <div className="farm-field-inner">
                    <div className="farm-plots-grid">
                  {SLOT_ORDER.map((_, arrayIndex) => {
                    const land = landGrid[arrayIndex];
                    const landIndex = toLandIndex(arrayIndex);
                    return (
                      <div
                        key={land?.id ?? `slot-${landIndex}`}
                        className="farm-plot-slot"
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

              {matureLands.length > 0 && (
                <div className="farm-harvest-dock">
                  <Tooltip title={`摘取 ${matureLands.length} 块成熟作物`}>
                    <button
                      type="button"
                      className={`farm-quick-harvest is-ready ${actionLoading ? 'is-loading' : ''}`}
                      disabled={actionLoading}
                      onClick={handleHarvestAll}
                      aria-label="一键摘取"
                    >
                      <span className="farm-quick-harvest-icon">
                        <img
                          src={FARM_HARVEST_ICON}
                          alt=""
                          draggable={false}
                        />
                      </span>
                      <span className="farm-quick-harvest-label">一键摘取</span>
                    </button>
                  </Tooltip>
                </div>
              )}
              </div>
            </div>

              <aside className="farm-world-side farm-world-side--right">
                <FarmCottageDeco />
              </aside>
            </div>
          </div>
        </Spin>
      </Content>

      <FarmFriendsModal
        open={friendsModalOpen}
        onClose={handleCloseFriendsModal}
        initialTab={friendsInitialTab}
        stolenRecords={stolenRecords}
        stolenLoading={stolenLoading}
        onRefreshStolen={loadStolenRecords}
        myLevel={farmUser?.level ?? 1}
        myNickname={farmUser?.userName ?? currentUser?.userName ?? '我'}
        myAvatar={farmUser?.userAvatar ?? currentUser?.userAvatar}
      />

      <Modal
        title={getPlantModalTitle()}
        open={plantModalOpen}
        onCancel={closePlantModal}
        onOk={handlePlant}
        okText={
          selectedLandIds.length > 1
            ? `播种 ${selectedLandIds.length} 块地`
            : '开始种植'
        }
        cancelText="取消"
        confirmLoading={actionLoading}
        width={520}
        className="farm-plant-modal"
        destroyOnClose
      >
        {emptyLands.length > 1 && (
          <label className="plant-batch-toggle">
            <input
              type="checkbox"
              checked={plantAllSelected}
              onChange={(e) => handlePlantBatchToggle(e.target.checked)}
            />
            <span>
              播种全部空地（{emptyLands.length} 块）
              {!plantAllSelected && selectedLandIds.length === 1 && (
                <Text type="secondary" className="plant-batch-hint">
                  {' '}
                  · 当前仅地块{' '}
                  {lands.find((l) => l.id === selectedLandIds[0])?.landIndex ??
                    1}
                </Text>
              )}
            </span>
          </label>
        )}

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
