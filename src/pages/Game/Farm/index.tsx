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
  ClockCircleOutlined,
  ShopOutlined,
  ShoppingOutlined,
  InboxOutlined,
  CheckSquareOutlined,
  BookOutlined,
  HeartOutlined,
  SettingOutlined,
  CoffeeOutlined,
  RiseOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import LoginPlaceholder from '@/components/LoginPlaceholder';
import { getAllCropsUsingGet } from '@/services/backend/cropController';
import {
  getMyLandsUsingGet,
  harvestUsingPost,
  plantUsingPost,
} from '@/services/backend/landController';
import { getMyFarmUserUsingGet } from '@/services/backend/farmUserController';
import { getLoginUserUsingGet } from '@/services/backend/userController';
import { getFriendLandsUsingGet } from '@/services/backend/farmFriendController';
import {
  getMyStolenRecordsUsingGet,
  markAllStolenRecordsAsReadUsingPost,
  stealUsingPost,
} from '@/services/backend/stealController';
import FarmFriendsModal, {
  type FriendTab,
  getFriendUserId,
  isFarmStealRecordUnread,
} from './FarmFriendsModal';
import FarmCottageDeco from './FarmCottageDeco';
import { isValidUserIdString } from '@/utils/farmNavigate';
import './index.less';

const { Content } = Layout;
const { Title, Text } = Typography;

const GRID_COLS = 6;
const GRID_ROWS = 4;
const TOTAL_LANDS = GRID_COLS * GRID_ROWS;

const FARM_HARVEST_ICON =
  'https://oss.cqbo.com/moyu/farm/toucai.png';

type SidebarBtn = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  accent?: 'green' | 'brown' | 'cream' | 'blue' | 'pink';
  badge?: number;
};

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

const getFarmExpProgress = (farmUser: API.FarmUserVO | null) => {
  const level = farmUser?.level ?? 1;
  const exp = Math.max(0, Math.floor(farmUser?.experience ?? 0));
  return { level, exp };
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

/** 生长时间（分钟）：不足 1 小时显示分钟，否则显示小时 */
const formatGrowthTime = (minutes?: number): string => {
  const m = minutes ?? 0;
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `${h} 小时`;
  return `${h} 小时 ${rem} 分钟`;
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

/** 拜访好友农场时地块是否可交互（不强制要求 land.id，与本人农场解锁规则不同） */
const isFriendLandPlot = (land: API.LandDTO | null): boolean => {
  if (!land) return false;
  return land.locked !== 1;
};

/** 偷菜接口所需的地块 ID */
const resolveStealLandId = (land: API.LandDTO): number | undefined => land.id;

/** 汇总批量偷菜返回的积分 */
const sumStealCoinGained = (records?: API.FarmStealRecord[]): number =>
  (records ?? []).reduce((sum, record) => sum + (record.coinGained ?? 0), 0);

/** 好友农场：成熟、有地块 ID 且后端标记 canSteal=true 才可偷 */
const canStealOnFriendLand = (
  land: API.LandDTO,
  currentNow: number,
): boolean =>
  isFriendLandPlot(land) &&
  isLandMature(land, currentNow) &&
  resolveStealLandId(land) != null &&
  land.canSteal === true;

/** 地块是否空闲可播种 */
const isLandEmpty = (land: API.LandDTO | null): boolean => {
  if (!isLandUnlocked(land)) return false;
  const status = land!.status;
  return status == null || status === LAND_STATUS.EMPTY;
};

const CROP_SCALE_MIN = 0.34;
const CROP_SCALE_MAX = 1;

/** 生长进度 0～1：基于种植时间与成熟时间 */
const getLandGrowthProgress = (
  land: API.LandDTO,
  currentNow: number,
  crop?: API.CropDTO,
): number => {
  let start: number | null = null;
  let end: number | null = null;

  if (land.plantedTime) {
    start = new Date(land.plantedTime).getTime();
  }
  if (land.harvestTime) {
    end = new Date(land.harvestTime).getTime();
  }

  if (start != null && end != null && end > start) {
    return Math.min(1, Math.max(0, (currentNow - start) / (end - start)));
  }

  if (end != null && crop?.growthTime) {
    const total = crop.growthTime * 60 * 1000;
    start = end - total;
    if (total > 0) {
      return Math.min(1, Math.max(0, (currentNow - start) / total));
    }
  }

  return 0;
};

/** 地块上作物显示缩放：刚种下偏小，越接近成熟越大 */
const getCropDisplayScale = (
  land: API.LandDTO,
  currentNow: number,
  crop?: API.CropDTO,
): number => {
  if (isLandMature(land, currentNow)) return CROP_SCALE_MAX;
  const progress = getLandGrowthProgress(land, currentNow, crop);
  return CROP_SCALE_MIN + (CROP_SCALE_MAX - CROP_SCALE_MIN) * progress;
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
  style?: React.CSSProperties;
}> = ({ crop, className, alt, style }) => {
  const icon = crop?.icon?.trim();
  if (!icon) {
    return (
      <span className={className} style={style}>
        🌱
      </span>
    );
  }
  if (isCropIconUrl(icon)) {
    return (
      <img
        className={className}
        style={style}
        src={icon}
        alt={alt ?? crop?.name ?? '作物'}
        draggable={false}
      />
    );
  }
  return (
    <span className={className} style={style}>
      {icon}
    </span>
  );
};

const Farm: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isLoggedIn = !!currentUser;
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
  const [markAllStolenReadLoading, setMarkAllStolenReadLoading] = useState(false);
  const [visitingFriend, setVisitingFriend] =
    useState<API.FarmFriendListVO | null>(null);
  const [visitLoadingId, setVisitLoadingId] = useState<string | null>(null);
  /** 拜访好友时用于接口的原始用户 ID（字符串，避免雪花 ID 精度丢失） */
  const [visitingFriendUserId, setVisitingFriendUserId] = useState<string | null>(null);
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

  const unreadStolenCount = useMemo(
    () => stolenRecords.filter(isFarmStealRecordUnread).length,
    [stolenRecords],
  );

  const handleMarkAllStolenRead = useCallback(async () => {
    if (unreadStolenCount === 0) {
      message.info('没有未读记录');
      return;
    }
    setMarkAllStolenReadLoading(true);
    try {
      const res = await markAllStolenRecordsAsReadUsingPost();
      if (res.code === 0) {
        message.success('已全部标记为已读');
        await loadStolenRecords();
      } else {
        message.error(res.message || '标记已读失败');
      }
    } catch {
      message.error('标记已读失败');
    } finally {
      setMarkAllStolenReadLoading(false);
    }
  }, [unreadStolenCount, loadStolenRecords]);

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
    if (!isLoggedIn) return;

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
  }, [isLoggedIn, loadStolenRecords]);

  const openFriendsModal = useCallback((tab: FriendTab = 'play') => {
    setFriendsInitialTab(tab);
    setFriendsModalOpen(true);
  }, []);

  const handleCloseFriendsModal = useCallback(() => {
    setFriendsModalOpen(false);
    setFriendsInitialTab('play');
  }, []);

  const loadFriendLands = useCallback(
    async (friendUserId: string): Promise<boolean> => {
      try {
        const res = await getFriendLandsUsingGet({ friendUserId });
        if (res.code === 0 && res.data) {
          setLands(res.data);
          return true;
        }
        message.error(res.message || '加载好友农场失败');
        return false;
      } catch (e) {
        message.error('加载好友农场失败');
        console.error(e);
        return false;
      }
    },
    [],
  );

  const visitFarmByUserId = useCallback(
    async (
      friendUserId: string,
      meta?: { nickname?: string; avatar?: string },
      friend?: API.FarmFriendListVO,
    ): Promise<boolean> => {
      setVisitLoadingId(friendUserId);
      setVisitingFriendUserId(friendUserId);
      try {
        const ok = await loadFriendLands(friendUserId);
        if (ok) {
          setVisitingFriend(
            friend ?? {
              nickname: meta?.nickname,
              avatar: meta?.avatar,
            },
          );
          message.success(`正在拜访 ${meta?.nickname || '好友'} 的农场`);
        } else {
          setVisitingFriendUserId(null);
        }
        return ok;
      } finally {
        setVisitLoadingId(null);
      }
    },
    [loadFriendLands],
  );

  const handleVisitFriend = useCallback(
    async (friend: API.FarmFriendListVO) => {
      const friendUserId = getFriendUserId(friend);
      if (friendUserId == null) {
        message.warning('好友信息异常');
        return;
      }
      const ok = await visitFarmByUserId(
        friendUserId,
        {
          nickname: friend.nickname,
          avatar: friend.avatar,
        },
        friend,
      );
      if (ok) handleCloseFriendsModal();
    },
    [visitFarmByUserId, handleCloseFriendsModal],
  );

  const handleLeaveFriendFarm = useCallback(async () => {
    setVisitingFriend(null);
    setVisitingFriendUserId(null);
    setLoading(true);
    try {
      await refreshLandsAndFarmUser();
    } finally {
      setLoading(false);
    }
  }, [refreshLandsAndFarmUser]);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const visitUserId = params.get('visitUserId');
    if (!visitUserId) {
      loadFarmData();
      return;
    }

    const nickname = params.get('visitNickname') || undefined;
    const avatar = params.get('visitAvatar') || undefined;
    history.replace('/point/farm');

    (async () => {
      setLoading(true);
      try {
        const [cropsRes, farmRes] = await Promise.all([
          getAllCropsUsingGet(),
          getMyFarmUserUsingGet(),
        ]);
        if (cropsRes.code === 0 && cropsRes.data) {
          setCrops(cropsRes.data);
        }
        if (farmRes.code === 0 && farmRes.data) {
          setFarmUser(farmRes.data);
        }
        await loadStolenRecords();
        if (!isValidUserIdString(visitUserId)) {
          message.error('用户ID无效');
          const landsRes = await getMyLandsUsingGet();
          if (landsRes.code === 0 && landsRes.data) setLands(landsRes.data);
          return;
        }
        const ok = await visitFarmByUserId(visitUserId, { nickname, avatar });
        if (!ok) {
          const landsRes = await getMyLandsUsingGet();
          if (landsRes.code === 0 && landsRes.data) setLands(landsRes.data);
        }
      } catch (e) {
        message.error('加载农场数据失败');
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn, loadFarmData, loadStolenRecords, visitFarmByUserId]);

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

  /** 好友农场中可偷的成熟地块（偷菜接口需要 landId） */
  const stealableLands = useMemo(
    () => (visitingFriend ? lands.filter((l) => canStealOnFriendLand(l, now)) : []),
    [lands, now, visitingFriend],
  );

  const handleSteal = useCallback(
    async (land: API.LandDTO) => {
      if (!visitingFriend) return;
      const landId = resolveStealLandId(land);
      if (landId == null) {
        message.warning('该地块暂不可偷');
        return;
      }
      setActionLoading(true);
      try {
        const res = await stealUsingPost({ landId });
        if (res.code === 0) {
          const coin = sumStealCoinGained(res.data);
          message.success(
            coin > 0 ? `偷菜成功，获得 ${coin} 积分～` : '偷菜成功～',
          );
          if (visitingFriendUserId) {
            await loadFriendLands(visitingFriendUserId);
          }
          await loadStolenRecords();
          await refreshCurrentUser();
        } else {
          message.error(res.message || '偷菜失败');
        }
      } catch (e) {
        message.error('偷菜失败');
        console.error(e);
      } finally {
        setActionLoading(false);
      }
    },
    [
      visitingFriend,
      visitingFriendUserId,
      loadFriendLands,
      loadStolenRecords,
      refreshCurrentUser,
    ],
  );

  const handleStealAll = useCallback(async () => {
    if (!visitingFriend || stealableLands.length === 0) {
      message.info('暂无可偷的成熟作物');
      return;
    }
    const landIds = stealableLands
      .map((land) => resolveStealLandId(land))
      .filter((id): id is number => id != null);
    if (landIds.length === 0) {
      message.info('暂无可偷的成熟作物');
      return;
    }
    setActionLoading(true);
    try {
      const res = await stealUsingPost({ landIds });
      if (res.code === 0 && (res.data?.length ?? 0) > 0) {
        const count = res.data!.length;
        const coin = sumStealCoinGained(res.data);
        message.success(
          coin > 0
            ? `成功偷取 ${count} 块地，获得 ${coin} 积分～`
            : `成功偷取 ${count} 块地的作物～`,
        );
        if (visitingFriendUserId) {
          await loadFriendLands(visitingFriendUserId);
        }
        await loadStolenRecords();
        await refreshCurrentUser();
      } else {
        message.error(res.message || '偷菜失败');
      }
    } catch (e) {
      message.error('偷菜失败');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }, [
    visitingFriend,
    visitingFriendUserId,
    stealableLands,
    loadFriendLands,
    loadStolenRecords,
    refreshCurrentUser,
  ]);

  const farmExp = useMemo(() => getFarmExpProgress(farmUser), [farmUser]);

  const nearestMatureMs = useMemo(() => {
    let min = Infinity;
    lands.forEach((land) => {
      if (!isLandUnlocked(land)) return;
      if (land.status === LAND_STATUS.GROWING && land.harvestTime) {
        const remain = new Date(land.harvestTime).getTime() - now;
        if (remain > 0 && remain < min) min = remain;
      }
    });
    return min === Infinity ? null : min;
  }, [lands, now]);

  const showComingSoon = useCallback((name: string) => {
    message.info(`${name}功能开发中，敬请期待～`);
  }, []);

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
    if (visitingFriend && isFriendLandPlot(land)) {
      if (isLandMature(land!, now)) {
        if (canStealOnFriendLand(land!, now)) {
          return `点击偷取 ${land!.cropName || '作物'}`;
        }
        return `${land!.cropName || '作物'}已成熟，暂不可偷`;
      }
      if (land!.status === LAND_STATUS.GROWING) {
        return `${land!.cropName || '作物'} · ${formatCountdown(getLandRemainingMs(land!))}`;
      }
      return '空地';
    }
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
    if (visitingFriend) {
      if (!isFriendLandPlot(land)) return;
      if (isLandMature(land!, now)) {
        if (resolveStealLandId(land!) == null) {
          message.warning('地块信息异常，请刷新好友农场后重试');
          return;
        }

        handleSteal(land!);
        return;
      }
      if (land!.status === LAND_STATUS.GROWING) {
        message.info(
          `${land!.cropName || '作物'}还在生长，${formatCountdown(getLandRemainingMs(land!))} 后成熟`,
        );
        return;
      }
      message.info('好友的地块是空的');
      return;
    }

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
    const unlocked = visitingFriend ? isFriendLandPlot(land) : isLandUnlocked(land);

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
        <div
          className={`plot-overlay plot-overlay-mature ${
            visitingFriend && canStealOnFriendLand(land!, now) ? 'can-steal' : ''
          }`}
        >
          <CropIcon crop={crop} className="plot-crop-icon mature" />
          <span className="plot-sparkle" aria-hidden />
        </div>
      );
    }

    if (land!.status === LAND_STATUS.GROWING) {
      const cropScale = getCropDisplayScale(land!, now, crop);
      return (
        <div className="plot-overlay plot-overlay-growing">
          <CropIcon
            crop={crop}
            className="plot-crop-icon growing"
            style={
              {
                '--crop-scale': cropScale,
              } as React.CSSProperties
            }
          />
        </div>
      );
    }

    return null;
  };

  const renderPlotFooter = (land: API.LandDTO | null) => {
    const plotActive = visitingFriend
      ? isFriendLandPlot(land)
      : isLandUnlocked(land);
    if (!plotActive) return null;
    if (isLandMature(land!, now)) {
      if (visitingFriend) {
        const stealable = canStealOnFriendLand(land!, now);
        return (
          <span
            className={`plot-harvest-hint plot-harvest-hint--below ${stealable ? 'plot-steal-hint' : ''}`}
          >
            {stealable ? '偷菜' : '已成熟'}
          </span>
        );
      }
      return <span className="plot-harvest-hint plot-harvest-hint--below">收获</span>;
    }
    if (land!.status === LAND_STATUS.GROWING) {
      return (
        <span className="plot-timer plot-timer--below">
          <ClockCircleOutlined className="plot-timer-icon" aria-hidden />
          {formatCountdown(getLandRemainingMs(land!))}
        </span>
      );
    }
    return null;
  };

  const renderSidebarButton = (btn: SidebarBtn) => (
    <Tooltip key={btn.key} title={btn.label}>
      <button
        type="button"
        className={`farm-side-btn farm-side-btn--${btn.accent ?? 'cream'} ${btn.disabled ? 'is-disabled' : ''}`}
        aria-label={btn.label}
        disabled={btn.disabled}
        onClick={
          btn.disabled
            ? undefined
            : btn.onClick ?? (() => showComingSoon(btn.label))
        }
      >
        <Badge count={btn.badge} size="small" offset={[-2, 2]}>
          <span className="farm-side-btn-icon">{btn.icon}</span>
        </Badge>
        <span className="farm-side-btn-label">{btn.label}</span>
      </button>
    </Tooltip>
  );

  /** 右侧竖向功能栏（参考设计图） */
  const sidebarButtons: SidebarBtn[] = [
    {
      key: 'timer',
      label: '成熟',
      icon: <ClockCircleOutlined />,
      accent: 'blue',
      onClick: () => {
        if (nearestMatureMs != null) {
          message.info(`最近成熟：${formatCountdown(nearestMatureMs)}`);
        } else if (matureLands.length > 0) {
          message.info(`有 ${matureLands.length} 块地可收获`);
        } else {
          message.info('暂无作物生长中');
        }
      },
    },
    { key: 'shop', label: '商店', icon: <ShopOutlined />, accent: 'green' },
    { key: 'tasks', label: '任务', icon: <CheckSquareOutlined />, accent: 'blue' },
    { key: 'backpack', label: '背包', icon: <InboxOutlined />, accent: 'brown' },
    {
      key: 'harvest',
      label: '收获',
      icon: <GiftOutlined />,
      accent: 'green',
      badge: visitingFriend ? undefined : matureLands.length || undefined,
      disabled: !!visitingFriend || matureLands.length === 0,
      onClick: () => {
        if (visitingFriend) {
          message.info('拜访好友农场时无法收获自己的作物');
          return;
        }
        if (matureLands.length > 0) handleHarvestAll();
        else message.info('暂无成熟作物可收获');
      },
    },
    {
      key: 'friends',
      label: '好友',
      icon: <TeamOutlined />,
      accent: 'pink',
      onClick: () => openFriendsModal('play'),
    },
    { key: 'mall', label: '商城', icon: <ShoppingOutlined />, accent: 'green' },
    { key: 'feed', label: '喂食', icon: <CoffeeOutlined />, accent: 'brown' },
    { key: 'guide', label: '指引', icon: <BookOutlined />, accent: 'cream' },
    { key: 'pet', label: '灵宠', icon: <HeartOutlined />, accent: 'pink' },
    { key: 'manage', label: '管理', icon: <SettingOutlined />, accent: 'blue' },
  ];

  const getPlotClassName = (land: API.LandDTO | null, arrayIndex: number): string => {
    const classes = ['farm-plot'];
    const unlocked = visitingFriend ? isFriendLandPlot(land) : isLandUnlocked(land);
    if (!unlocked) {
      classes.push('is-locked');
      if (!visitingFriend && arrayIndex === unlockedCount) {
        classes.push('is-next-unlock');
      }
      return classes.join(' ');
    }
    if (isLandMature(land!, now)) {
      classes.push('is-mature');
      if (visitingFriend && canStealOnFriendLand(land!, now)) {
        classes.push('can-steal');
      }
    } else if (land!.status === LAND_STATUS.GROWING) classes.push('is-growing');
    else classes.push('is-empty');
    return classes.join(' ');
  };

  if (!isLoggedIn) {
    return (
      <div className="farm-page">
        <div className="farm-login-placeholder">
          <LoginPlaceholder
            icon="🌾"
            title="请先登录后再进入摸鱼农场"
            subtitle="登录后即可种植作物、收获积分，还能拜访好友农场偷菜"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="farm-page">
      <div className="farm-sky-deco" aria-hidden>
        <span className="farm-cloud farm-cloud--1" />
        <span className="farm-cloud farm-cloud--2" />
        <span className="farm-cloud farm-cloud--3" />
        <span className="farm-hill farm-hill--back" />
        <span className="farm-hill farm-hill--front" />
      </div>

      <div className="farm-header-bar">
        <div className="farm-header-left">
          <EnvironmentOutlined className="farm-header-icon" />
          <div>
            <Title level={4} className="farm-header-title">
              {visitingFriend
                ? `${visitingFriend.nickname || '好友'}的农场`
                : '摸鱼农场'}
            </Title>
            <Text type="secondary" className="farm-header-sub">
              {visitingFriend ? '成熟且可偷的地块点击即可偷菜' : '种下希望，收获积分'}
            </Text>
          </div>
        </div>
        <div className="farm-header-stats">
          <div
            className="farm-stat-chip farm-stat-chip--level"
            title={`农场经验 ${farmExp.exp}`}
          >
            <div className="farm-stat-level-body">
              <div className="farm-stat-level-head">
                <span className="farm-stat-level-badge">
                  <StarOutlined />
                  <span className="farm-stat-level-text">Lv.{farmExp.level}</span>
                </span>
                <span className="farm-exp-bar-text">{farmExp.exp}</span>
              </div>
              <div className="farm-exp-bar" aria-hidden>
                <div className="farm-exp-bar-fill" style={{ width: '100%' }} />
              </div>
            </div>
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
          {visitingFriend && (
            <Button
              type="primary"
              className="farm-leave-friend-btn"
              icon={<ArrowLeftOutlined />}
              loading={loading}
              onClick={handleLeaveFriendFarm}
            >
              返回我的农场
            </Button>
          )}
          {!visitingFriend && emptyLands.length > 0 && (
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
            <aside className="farm-side-rail" aria-label="农场功能">
              <nav className="farm-side-rail-panel">
                {sidebarButtons.map(renderSidebarButton)}
              </nav>
            </aside>

            <div className="farm-world">
              <aside className="farm-world-side farm-world-side--left">
                <div className="farm-deco farm-deco-sign">劳动光荣</div>
                <Tooltip title="谁偷了我的菜">
                  <button
                    type="button"
                    className="farm-deco farm-deco-mail"
                    aria-label={`谁偷了我的菜，${unreadStolenCount} 条未读`}
                    onClick={() => {
                      loadStolenRecords();
                      openFriendsModal('visitor');
                    }}
                  >
                    <Badge count={unreadStolenCount} size="small" offset={[-2, 2]}>
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
                  <div className="farm-field-tabs" role="group" aria-label="农场概况">
                    <div className="farm-field-tab farm-field-tab--earn">
                      <RiseOutlined aria-hidden />
                      <span className="farm-field-tab-label">今日收益</span>
                      <span className="farm-field-tab-value">敬请期待</span>
                    </div>
                    <div className="farm-field-tab farm-field-tab--timer">
                      <ClockCircleOutlined aria-hidden />
                      <span className="farm-field-tab-label">作物成熟</span>
                      <span className="farm-field-tab-value">
                        {nearestMatureMs != null
                          ? formatCountdown(nearestMatureMs)
                          : matureLands.length > 0
                            ? '可收获'
                            : '—'}
                      </span>
                    </div>
                  </div>
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
                            disabled={
                              (visitingFriend
                                ? !isFriendLandPlot(land)
                                : !isLandUnlocked(land)) || actionLoading
                            }
                            onClick={() => handlePlotClick(land, arrayIndex)}
                          >
                            <span className="plot-land-body">
                              <span className="plot-soil" aria-hidden>
                                <span className="plot-tile-surface" />
                              </span>
                              {renderPlotOverlay(land)}
                            </span>
                            {renderPlotFooter(land)}
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

              {!visitingFriend && matureLands.length > 0 && (
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
              {visitingFriend && stealableLands.length > 0 && (
                <div className="farm-harvest-dock">
                  <Tooltip title={`偷取 ${stealableLands.length} 块成熟作物`}>
                    <button
                      type="button"
                      className={`farm-quick-harvest is-ready farm-quick-steal ${actionLoading ? 'is-loading' : ''}`}
                      disabled={actionLoading}
                      onClick={handleStealAll}
                      aria-label="一键偷菜"
                    >
                      <span className="farm-quick-harvest-icon">
                        <img
                          src={FARM_HARVEST_ICON}
                          alt=""
                          draggable={false}
                        />
                      </span>
                      <span className="farm-quick-harvest-label">一键偷菜</span>
                    </button>
                  </Tooltip>
                </div>
              )}
              </div>
            </div>

              <aside className="farm-world-side farm-world-side--right">
                <FarmCottageDeco
                  ownerUserId={visitingFriendUserId ?? undefined}
                  ownerName={visitingFriend?.nickname}
                />
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
        onMarkAllStolenRead={handleMarkAllStolenRead}
        markAllStolenReadLoading={markAllStolenReadLoading}
        onVisitFriend={handleVisitFriend}
        visitLoadingId={visitLoadingId}
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
                    <div className="crop-card-details">
                      <span className="crop-card-time">
                        <ClockCircleOutlined aria-hidden />
                        {formatGrowthTime(crop.growthTime)}
                      </span>
                      <div className="crop-card-points">
                        {crop.price != null && crop.price > 0 && (
                          <span className="crop-point-tag crop-point-tag--cost">
                            <span className="crop-point-label">花费</span>
                            <span className="crop-point-value">
                              {crop.price}
                            </span>
                            <span className="crop-point-unit">积分</span>
                          </span>
                        )}
                        <span className="crop-point-tag crop-point-tag--reward">
                          <span className="crop-point-label">收获</span>
                          <span className="crop-point-value">
                            +{crop.coin ?? 0}
                          </span>
                          <span className="crop-point-unit">积分</span>
                        </span>
                        <span className="crop-point-tag crop-point-tag--exp">
                          <span className="crop-point-label">经验</span>
                          <span className="crop-point-value">
                            +{crop.experience ?? 0}
                          </span>
                        </span>
                      </div>
                    </div>
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
