export const MULTIPLAYER_SPAWN_LAYOUTS = {
  blue: [
    [-125, 0, -5],
    [-120, 0, -2],
    [-125, 0, 0],
    [-120, 0, 2],
    [-125, 0, 5],
  ],
  red: [
    [125, 0, -5],
    [120, 0, -2],
    [125, 0, 0],
    [120, 0, 2],
    [125, 0, 5],
  ],
};

export const MULTIPLAYER_TEST_LINEUP = [
  { team: 'blue', heroId: 'yasuo', skin: '疾风剑豪', playerName: '亚索', isControlled: true },
  { team: 'blue', heroId: 'braum', playerName: '布隆' },
  { team: 'blue', heroId: 'lux', playerName: '拉克丝' },
  { team: 'blue', heroId: 'jhin', playerName: '烬' },
  { team: 'blue', heroId: 'lulu', playerName: '璐璐' },
  { team: 'red', heroId: 'darius', skin: '诺克萨斯之手', playerName: '德莱厄斯' },
  { team: 'red', heroId: 'vi', playerName: '蔚' },
  { team: 'red', heroId: 'annie', playerName: '安妮' },
  { team: 'red', heroId: 'ashe', playerName: '艾希' },
  { team: 'red', heroId: 'soraka', playerName: '索拉卡' },
];

export const MULTIPLAYER_RUNTIME_CONFIG = {
  roomId: 'demo-room',
  maxPlayers: MULTIPLAYER_TEST_LINEUP.length,
  simulationTickRate: 20,
  snapshotRate: 20,
  /** 远端英雄插值延迟（毫秒），越大越平滑但延迟越高 */
  interpolationDelayMs: 100,
  /** 固定 tick 步长（秒），与后端 tickIntervalMs(50) 对应 */
  tickDt: 0.05,
  /** @deprecated 旧平滑参数，保留兼容 */
  renderDelayMs: 100,
  positionSmoothing: 12,
  rotationSmoothing: 16,
  maxBufferedSnapshots: 8,
  showDiagnosticsPanel: true,
  showFps: true,
  disconnectMessage: '已离开战场',
};

export const MULTIPLAYER_HERO_MOVE_SPEED = {
  braum: 2.8,
  darius: 2.9,
  yasuo: 3.2,
  vi: 3.1,
  lux: 3.0,
  annie: 2.95,
  ashe: 3.1,
  jhin: 3.0,
  soraka: 3.05,
  lulu: 3.1,
};
