import React, { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { GAME_CONFIG } from '../../config/gameConfig';
import { useGameStore } from '../../store/useGameStore';
import Lights from './Lights';
import CameraController from './CameraController';
import PostProcessingEffects from '../effects/PostProcessing';
import BattleMap from '../world/BattleMap';
import Bushes from '../world/Bushes';
import Fountains from '../world/Fountains';
import MoveIndicator from '../world/MoveIndicator';
import Towers from '../world/Towers';
import Nexuses from '../world/Nexuses';
import Inhibitors from '../world/Inhibitors';
import HealthRelics from '../world/HealthRelics';
import SnowParticles from '../world/SnowParticles';
import Champions from '../entities/Champions';
import Minions from '../entities/Minions';
import InputController from '../systems/InputController';
import ProjectileRenderer from '../effects/ProjectileRenderer';
import FloatingCombatTextSystem from '../effects/FloatingCombatTextSystem';
import SpellAimIndicator from '../effects/SpellAimIndicator';
import WorldDebugLabels from '../debug/WorldDebugLabels';
import { Perf } from 'r3f-perf';
import { RENDER_CONFIG } from '../../config/renderConfig';

const BattleRuntimeController: React.FC = () => {
  const tickMovement = useGameStore((s) => s.tickMovement);
  const cleanupExpiredEmotes = useGameStore((s) => s.cleanupExpiredEmotes);
  const cleanupExpiredCombatFeedback = useGameStore((s) => s.cleanupExpiredCombatFeedback);
  const setMultiplayerDiagnosticsFps = useGameStore((s) => s.setMultiplayerDiagnosticsFps);
  const fpsAccumulatorRef = useRef({ elapsed: 0, frames: 0 });
  const emoteCleanupAccumulatorRef = useRef(0);
  const combatFeedbackCleanupAccumulatorRef = useRef(0);

  useFrame((_, delta) => {
    emoteCleanupAccumulatorRef.current += delta;
    if (emoteCleanupAccumulatorRef.current >= 1.0) {
      cleanupExpiredEmotes();
      emoteCleanupAccumulatorRef.current = 0;
    }

    combatFeedbackCleanupAccumulatorRef.current += delta;
    if (combatFeedbackCleanupAccumulatorRef.current >= 0.5) {
      cleanupExpiredCombatFeedback();
      combatFeedbackCleanupAccumulatorRef.current = 0;
    }

    if (!GAME_CONFIG.multiplayer.enabled) {
      tickMovement(delta);
    }

    const bucket = fpsAccumulatorRef.current;
    bucket.elapsed += delta;
    bucket.frames += 1;
    if (bucket.elapsed >= 0.35) {
      setMultiplayerDiagnosticsFps(Math.round(bucket.frames / bucket.elapsed));
      bucket.elapsed = 0;
      bucket.frames = 0;
    }
  });

  return null;
};

const BattleScene: React.FC = () => {
  return (
    <>
      {/* 场景设置 */}
      <fog attach="fog" args={[0x0f2139, 40, 220]} />
      <color attach="background" args={[0x0d1b2e]} />

      {/* 摄像机控制 */}
      <CameraController />
      <InputController />
      <BattleRuntimeController />

      {/* 灯光 */}
      <Lights />

      {/* 地形 */}
      <BattleMap />
      <Bushes />
      <Fountains />
      <MoveIndicator />

      {/* 建筑 */}
      <Towers />
      <Nexuses />
      <Inhibitors />
      <HealthRelics />

      {/* 雪花粒子 */}
      <SnowParticles />

      {/* 英雄 */}
      <Champions />

      {/* 小兵 */}
      <Minions />

      {/* 投射物弹道 */}
      <ProjectileRenderer />

      <SpellAimIndicator />

      <Suspense fallback={null}>
        <FloatingCombatTextSystem />
      </Suspense>

      <WorldDebugLabels />

      {/* 性能监控面板 */}
      {RENDER_CONFIG.showPerfMonitor && (
        <Perf position="bottom-left" />
      )}

      {/* 后处理 */}
      <PostProcessingEffects />
    </>
  );
};

export default BattleScene;
