import React, { useEffect, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';

function formatGameTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const ScoreboardPanel: React.FC = () => {
  const scoreboardVisible = useGameStore((s) => s.scoreboardVisible);
  const setScoreboardVisible = useGameStore((s) => s.setScoreboardVisible);
  const champions = useGameStore((s) => s.champions);
  const championAvatarUrls = useGameStore((s) => s.championAvatarUrls);
  const blueKills = useGameStore((s) => s.blueKills);
  const redKills = useGameStore((s) => s.redKills);
  const gameTimer = useGameStore((s) => s.gameTimer);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      event.preventDefault();
      setScoreboardVisible(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }
      event.preventDefault();
      setScoreboardVisible(false);
    };

    const handleBlur = () => setScoreboardVisible(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [setScoreboardVisible]);

  const blueTeam = useMemo(
    () => champions
      .filter((champion) => champion.team === 'blue')
      .sort((a, b) => {
        if (a.isMe !== b.isMe) {
          return a.isMe ? -1 : 1;
        }
        return a.playerName.localeCompare(b.playerName, 'zh-CN');
      }),
    [champions],
  );
  const redTeam = useMemo(
    () => champions
      .filter((champion) => champion.team === 'red')
      .sort((a, b) => {
        if (a.isMe !== b.isMe) {
          return a.isMe ? -1 : 1;
        }
        return a.playerName.localeCompare(b.playerName, 'zh-CN');
      }),
    [champions],
  );

  const blueStats = useMemo(() => ({
    count: blueTeam.length,
    kills: blueTeam.reduce((sum, champion) => sum + (champion.kills ?? 0), 0),
    deaths: blueTeam.reduce((sum, champion) => sum + (champion.deaths ?? 0), 0),
    assists: blueTeam.reduce((sum, champion) => sum + (champion.assists ?? 0), 0),
  }), [blueTeam]);

  const redStats = useMemo(() => ({
    count: redTeam.length,
    kills: redTeam.reduce((sum, champion) => sum + (champion.kills ?? 0), 0),
    deaths: redTeam.reduce((sum, champion) => sum + (champion.deaths ?? 0), 0),
    assists: redTeam.reduce((sum, champion) => sum + (champion.assists ?? 0), 0),
  }), [redTeam]);

  if (!scoreboardVisible) {
    return null;
  }

  const rowGridClassName = 'grid grid-cols-[minmax(0,2.2fr)_1fr_1fr] items-center';
  const totalVisiblePlayers = blueTeam.length + redTeam.length;
  const compactLayout = totalVisiblePlayers <= 4;
  const panelMaxWidth = compactLayout ? 620 : 780;
  const teamSectionClassName = compactLayout ? 'py-1' : 'py-1.5';
  const teamHeaderClassName = compactLayout
    ? 'px-4 pb-1 text-[9px] font-bold uppercase tracking-[0.16em]'
    : 'px-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em]';
  const rowClassName = compactLayout
    ? `${rowGridClassName} px-4 py-1 text-[12px]`
    : `${rowGridClassName} px-4 py-1.5 text-[13px]`;
  const rowGapClassName = compactLayout ? 'gap-2' : 'gap-2.5';
  const avatarClassName = compactLayout
    ? 'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-[#5a8ab5] bg-[#2a4a6a]'
    : 'flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-[#5a8ab5] bg-[#2a4a6a]';
  const secondaryTextClassName = compactLayout ? 'text-[9px] text-[#7f97b7]' : 'text-[10px] text-[#7f97b7]';

  const renderTeam = (team: 'blue' | 'red') => {
    const teamChampions = team === 'blue' ? blueTeam : redTeam;
    const teamStats = team === 'blue' ? blueStats : redStats;
    return (
      <div className={`${teamSectionClassName} ${team === 'blue' ? 'border-b border-[#2a4a6a]' : ''}`}>
        <div className={`${teamHeaderClassName} ${team === 'blue' ? 'text-sky-200' : 'text-rose-200'}`}>
          {team === 'blue'
            ? `蓝方队伍 · ${teamStats.count}人 · ${teamStats.kills}/${teamStats.deaths}/${teamStats.assists}`
            : `红方队伍 · ${teamStats.count}人 · ${teamStats.kills}/${teamStats.deaths}/${teamStats.assists}`}
        </div>
        <div className="space-y-[1px] bg-[#14253b]">
          {teamChampions.map((champion) => {
            const avatarUrl = championAvatarUrls[champion.id];
            return (
              <div
                key={champion.id}
                className={`${rowClassName} ${champion.isMe ? 'bg-[rgba(74,122,181,0.24)]' : 'bg-[rgba(7,16,30,0.92)]'}`}
              >
                <div className={`flex min-w-0 items-center ${rowGapClassName}`}>
                  <div className={avatarClassName}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={champion.playerName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[13px]">🐟</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[#dde7f5]">{champion.playerName}</div>
                    <div className={secondaryTextClassName}>
                      {champion.isDead ? `复活 ${Math.ceil(champion.respawnTimer)}s` : `Lv.${champion.level}`}
                    </div>
                  </div>
                </div>
                <div className="text-center font-mono font-semibold tabular-nums text-[#f3f6fb]">
                  {champion.kills}/{champion.deaths}/{champion.assists}
                </div>
                <div className="text-right font-mono tabular-nums text-[#f1c46a]">
                  {Math.round(champion.damageDealt ?? 0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[140] flex items-center justify-center px-4 py-6 pointer-events-none">
      <div
        className="flex w-full max-h-[min(82vh,760px)] flex-col overflow-hidden rounded-[12px] border-2 border-[#3a6a9a] bg-[rgba(5,15,30,0.95)] shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-[8px]"
        style={{ maxWidth: `${panelMaxWidth}px` }}
      >
        <div className={`${rowGridClassName} border-b-2 border-[#5a8ab5] bg-[linear-gradient(180deg,#1a3a5a,#0a1a2a)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c9d5e7]`}>
          <span>英雄</span>
          <span className="text-center">击杀/死亡/助攻</span>
          <span className="text-right">伤害</span>
        </div>
        <div className="flex items-center justify-between border-b border-[#1a2a4a] bg-[rgba(8,16,28,0.94)] px-4 py-2 text-[12px] text-[#8ea5c5]">
          <span className="font-semibold text-sky-100">蓝方 {blueKills}</span>
          <span className="font-mono tracking-[0.2em] text-[#ffd700]">{formatGameTimer(gameTimer)}</span>
          <span className="font-semibold text-rose-100">红方 {redKills}</span>
        </div>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {renderTeam('blue')}
          {renderTeam('red')}
        </div>
      </div>
    </div>
  );
};

export default ScoreboardPanel;
