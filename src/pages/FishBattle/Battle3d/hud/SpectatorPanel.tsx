import React, { useMemo } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import { useGameStore } from '../store/useGameStore';

const MODE_LABELS = {
  playerLocked: '玩家锁定',
  directorFree: '导播自由',
  spectatorFollow: '跟随观战',
} as const;

const buttonClassName = 'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80 transition hover:bg-white/10 hover:text-white';

const SpectatorPanel: React.FC = () => {
  const champions = useGameStore((s) => s.champions);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const spectatorTargetId = useGameStore((s) => s.spectatorTargetId);
  const showWorldCoordinates = useGameStore((s) => s.showWorldCoordinates);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const setSpectatorTarget = useGameStore((s) => s.setSpectatorTarget);
  const cycleSpectatorTarget = useGameStore((s) => s.cycleSpectatorTarget);
  const focusControlledChampion = useGameStore((s) => s.focusControlledChampion);
  const toggleWorldCoordinates = useGameStore((s) => s.toggleWorldCoordinates);
  const debugFreeCamera = useGameStore((s) => s.debugFreeCamera);
  const toggleDebugFreeCamera = useGameStore((s) => s.toggleDebugFreeCamera);

  const me = useMemo(
    () => champions.find((champion) => champion.isMe) ?? null,
    [champions],
  );
  const currentTarget = useMemo(
    () => champions.find((champion) => champion.id === spectatorTargetId) ?? me,
    [champions, me, spectatorTargetId],
  );
  const worldCoordinatesEnabled = GAME_CONFIG.debug.worldCoordinates.enabled;
  const freeCameraEnabled = GAME_CONFIG.debug.freeCamera.enabled;

  if (!GAME_CONFIG.debug.spectator.showPanel) {
    return null;
  }

  return (
    <div
      className="absolute top-16 left-4 z-[120] w-[280px] rounded-xl border border-white/10 bg-slate-950/70 p-3 text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-md"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">Director</div>
          <div className="mt-1 text-sm font-semibold text-white">{MODE_LABELS[cameraMode]}</div>
        </div>
        {worldCoordinatesEnabled ? (
          <button className={buttonClassName} onClick={toggleWorldCoordinates} type="button">
            坐标 {showWorldCoordinates ? '开' : '关'}
          </button>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-2">
        <div className="text-[11px] text-white/50">当前焦点</div>
        <div className="mt-1 text-sm font-medium text-white">
          {currentTarget ? `${currentTarget.playerName} / ${currentTarget.heroId}` : '未选择'}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className={buttonClassName} onClick={focusControlledChampion} type="button">
          回到自己
        </button>
        <button className={buttonClassName} onClick={() => setCameraMode('directorFree')} type="button">
          自由导播
        </button>
        <button className={buttonClassName} onClick={() => cycleSpectatorTarget(-1)} type="button">
          上一个
        </button>
        <button className={buttonClassName} onClick={() => cycleSpectatorTarget(1)} type="button">
          下一个
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {champions.map((champion) => {
          const active = champion.id === currentTarget?.id && cameraMode !== 'directorFree';
          return (
            <button
              key={champion.id}
              className={`rounded-lg border px-2 py-2 text-left text-[11px] transition ${active
                ? 'border-cyan-300/60 bg-cyan-400/15 text-white'
                : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => setSpectatorTarget(champion.id)}
              type="button"
            >
              <div className="font-semibold">{champion.playerName}</div>
              <div className="mt-1 text-white/50">{champion.heroId}</div>
            </button>
          );
        })}
      </div>

      {freeCameraEnabled ? (
        <button
          className={`mt-2 w-full rounded px-2 py-1 text-xs font-medium transition ${
            debugFreeCamera
              ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/40'
              : 'bg-white/10 text-white/70 border border-white/10 hover:bg-white/20'
          }`}
          onClick={toggleDebugFreeCamera}
          type="button"
        >
          {debugFreeCamera ? '🎥 自由视角 ON' : '🎥 自由视角 OFF'}
        </button>
      ) : null}

      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/60">
        <div>Y：玩家镜头锁定/解锁</div>
        <div>V：导播模式开/关</div>
        <div>[ / ]：切换观战目标</div>
        <div>F：回到自己　Space：镜头回中</div>
        {worldCoordinatesEnabled || freeCameraEnabled ? (
          <div>
            {worldCoordinatesEnabled ? 'G：坐标调试' : ''}
            {worldCoordinatesEnabled && freeCameraEnabled ? '　' : ''}
            {freeCameraEnabled ? 'O：自由三维视角' : ''}
          </div>
        ) : null}
        <div>滚轮：缩放　边缘：滚屏</div>
      </div>
    </div>
  );
};

export default SpectatorPanel;
