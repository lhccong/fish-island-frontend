import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

const KILLFEED_DISPLAY_MS = 4000;

interface DisplayEntry {
  id: string;
  killerName: string;
  killerTeam?: string;
  victimName: string;
  victimTeam?: string;
  createdAt: number;
  phase: 'enter' | 'visible' | 'exit';
}

const KillFeed: React.FC = () => {
  const killFeed = useGameStore((s) => s.killFeed);
  const cleanupExpiredKillFeed = useGameStore((s) => s.cleanupExpiredKillFeed);
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const addEntry = useCallback((entry: typeof killFeed[number]) => {
    if (seenIdsRef.current.has(entry.id)) return;
    seenIdsRef.current.add(entry.id);
    const display: DisplayEntry = {
      id: entry.id,
      killerName: entry.killerName ?? '环境',
      killerTeam: entry.killerTeam,
      victimName: entry.victimName ?? entry.victimId,
      victimTeam: entry.victimTeam,
      createdAt: entry.createdAt,
      phase: 'enter',
    };
    setEntries((prev) => [...prev.slice(-7), display]);
    requestAnimationFrame(() => {
      setEntries((prev) => prev.map((e) => (e.id === display.id ? { ...e, phase: 'visible' } : e)));
    });
  }, []);

  useEffect(() => {
    for (const entry of killFeed) {
      addEntry(entry);
    }
  }, [killFeed, addEntry]);

  useEffect(() => {
    if (entries.length <= 0) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setEntries((prev) => {
        const next = prev
          .map((e) => (now - e.createdAt > KILLFEED_DISPLAY_MS && e.phase === 'visible' ? { ...e, phase: 'exit' as const } : e))
          .filter((e) => !(e.phase === 'exit' && now - e.createdAt > KILLFEED_DISPLAY_MS + 400));
        return next.length === prev.length && next.every((n, i) => n === prev[i]) ? prev : next;
      });
      cleanupExpiredKillFeed();
    }, 200);
    return () => window.clearInterval(timer);
  }, [entries.length, cleanupExpiredKillFeed]);

  if (entries.length <= 0) return null;

  const teamBorderColor = (team?: string) =>
    team === 'blue' ? 'rgba(56,189,248,0.5)' : team === 'red' ? 'rgba(251,113,133,0.5)' : 'rgba(255,255,255,0.15)';
  const teamTextClass = (team?: string) =>
    team === 'blue' ? 'text-sky-200' : team === 'red' ? 'text-rose-200' : 'text-white/65';

  return (
    <div
      style={{
        position: 'absolute',
        top: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 130,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'none',
      }}
    >
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 4,
            background: 'rgba(5,10,18,0.88)',
            borderLeft: `3px solid ${teamBorderColor(entry.killerTeam)}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            fontSize: 12,
            lineHeight: '18px',
            opacity: entry.phase === 'enter' ? 0 : entry.phase === 'exit' ? 0 : 1,
            transform: entry.phase === 'enter' ? 'translateY(-16px) scale(0.95)' : 'translateY(0) scale(1)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span className={`font-semibold truncate ${teamTextClass(entry.killerTeam)}`} style={{ maxWidth: 90 }}>
            {entry.killerName}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, flexShrink: 0 }}>⚔</span>
          <span className={`font-semibold truncate ${teamTextClass(entry.victimTeam)}`} style={{ maxWidth: 90 }}>
            {entry.victimName}
          </span>
        </div>
      ))}
    </div>
  );
};

export default KillFeed;
