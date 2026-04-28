import type { HeroLineupConfig } from '../types/game';

export declare const MULTIPLAYER_SPAWN_LAYOUTS: {
  blue: [number, number, number][];
  red: [number, number, number][];
};

export declare const MULTIPLAYER_TEST_LINEUP: HeroLineupConfig[];

export declare const MULTIPLAYER_RUNTIME_CONFIG: {
  roomId: string;
  maxPlayers: number;
  simulationTickRate: number;
  snapshotRate: number;
  renderDelayMs: number;
  positionSmoothing: number;
  rotationSmoothing: number;
  maxBufferedSnapshots: number;
  showDiagnosticsPanel: boolean;
  showFps: boolean;
  disconnectMessage: string;
};

export declare const MULTIPLAYER_HERO_MOVE_SPEED: Record<string, number>;
