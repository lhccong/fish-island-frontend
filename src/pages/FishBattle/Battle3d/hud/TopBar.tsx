import React from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import { useGameStore } from '../store/useGameStore';

const TopBar: React.FC = () => {
  const multiplayerSession = useGameStore((s) => s.multiplayerSession);
  const multiplayerEnabled = GAME_CONFIG.multiplayer.enabled;

  const diagnostics = multiplayerSession.diagnostics;
  const connectedPlayers = multiplayerSession.players.filter((p) => !p.isSpectator).length;
  const spectatorPlayers = multiplayerSession.players.filter((p) => p.isSpectator).length;
  const latencyValue = diagnostics.rttMs ?? diagnostics.snapshotLatencyMs;
  const latencyText = latencyValue == null
    ? '--'
    : `${Math.round(latencyValue)}`;
  const anomalyText = diagnostics.pingSampleCount <= 0 && diagnostics.snapshotArrivalCount <= 0
    ? '--'
    : `${diagnostics.networkAnomalyPercent.toFixed(1)}%`;

  return (
    <div
      className="absolute top-0 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 py-1 px-3 rounded-b-lg text-[11px]"
      style={{ background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }}
    >
      {/* 联机状态 */}
      <span className={`rounded-full border px-2 py-0.5 ${
        !multiplayerEnabled
          ? 'border-white/10 bg-white/5 text-white/60'
          : multiplayerSession.status === 'connected'
            ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
            : multiplayerSession.status === 'connecting'
              ? 'border-amber-300/25 bg-amber-400/10 text-amber-100'
              : 'border-red-300/25 bg-red-400/10 text-red-100'
      }`}>
        {multiplayerEnabled ? (
          multiplayerSession.status === 'connected' ? '已连接'
            : multiplayerSession.status === 'connecting' ? '连接中'
            : multiplayerSession.status === 'disconnected' ? '离线'
            : '中断'
        ) : '离线'}
      </span>

      {/* FPS */}
      <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-amber-100 font-mono">
        帧率：{diagnostics.fps || '--'}
      </span>

      {/* 延迟 */}
      <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2 py-0.5 text-fuchsia-100 font-mono tabular-nums">
        延迟：{latencyText}ms
      </span>

      {/* 在线 / 观战 */}
      <span className="rounded-full border border-sky-300/25 bg-sky-400/10 px-2 py-0.5 text-sky-100 font-mono tabular-nums">
        在线：{connectedPlayers} / 观战：{spectatorPlayers}
      </span>

      {/* 异常 */}
      <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2 py-0.5 text-rose-100 font-mono tabular-nums">
        异常：{anomalyText}
      </span>
    </div>
  );
};

export default TopBar;
