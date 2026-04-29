import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

const RespawnOverlay: React.FC = () => {
  const champion = useGameStore((s) => s.champions.find((c) => c.isMe) ?? null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!champion?.isDead || champion.respawnTimer <= 0) {
      setCountdown(0);
      return;
    }
    setCountdown(Math.ceil(champion.respawnTimer));
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        return next <= 0 ? 0 : next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [champion?.isDead, champion?.respawnTimer]);

  if (!champion?.isDead || countdown <= 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        pointerEvents: 'none',
      }}
    >
      {/* 倒计时大数字 */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: 'rgba(255,255,255,0.85)',
          textShadow: '0 0 40px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
          fontFamily: '"Share Tech Mono", "Fira Code", Consolas, monospace',
          lineHeight: 1,
          letterSpacing: '0.05em',
        }}
      >
        {countdown}
      </div>
      {/* 提示文字 */}
      <div
        style={{
          marginTop: 12,
          fontSize: 16,
          fontWeight: 600,
          color: 'rgba(200,200,200,0.7)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        等待复活
      </div>
    </div>
  );
};

export default RespawnOverlay;
