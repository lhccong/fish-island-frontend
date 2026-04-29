import React, { useMemo, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { MAP_CONFIG, TEAM_COLORS } from '../config/mapConfig';

/** 小地图位置配置 */
type MinimapPosition = 'top-left' | 'bottom-right';

interface MinimapProps {
  /** 小地图放置位置，默认左上角。 */
  position?: MinimapPosition;
}

/** 小地图像素尺寸 */
const MINIMAP_WIDTH = 280;
const MINIMAP_HEIGHT = 130;
/** 内边距 */
const PADDING = 8;

/** 将世界坐标映射到小地图像素坐标（带边距钳位，确保标记始终可见） */
function worldToMinimap(worldX: number, worldZ: number): { x: number; y: number } {
  const bounds = MAP_CONFIG.playableBounds;
  const rangeX = bounds.maxX - bounds.minX;
  const rangeZ = bounds.maxZ - bounds.minZ;
  if (rangeX <= 0 || rangeZ <= 0) return { x: MINIMAP_WIDTH / 2, y: MINIMAP_HEIGHT / 2 };
  const margin = 6;
  const x = Math.max(margin, Math.min(MINIMAP_WIDTH - margin, ((worldX - bounds.minX) / rangeX) * MINIMAP_WIDTH));
  const y = Math.max(margin, Math.min(MINIMAP_HEIGHT - margin, ((worldZ - bounds.minZ) / rangeZ) * MINIMAP_HEIGHT));
  return { x, y };
}

const Minimap: React.FC<MinimapProps> = ({ position = 'top-left' }) => {
  const champions = useGameStore((s) => s.champions);
  const championAvatarUrls = useGameStore((s) => s.championAvatarUrls);
  const towers = useGameStore((s) => s.towers);
  const nexuses = useGameStore((s) => s.nexuses);
  const inhibitors = useGameStore((s) => s.inhibitors);
  const healthRelics = useGameStore((s) => s.healthRelics);
  const [isAllyPanelCollapsed, setIsAllyPanelCollapsed] = useState(false);
  const me = useMemo(() => champions.find((c) => c.isMe) ?? null, [champions]);
  const myTeam = me?.team ?? null;

  const allyRoster = useMemo(() => {
    const allies = champions
      .filter((champion) => !myTeam || champion.team === myTeam)
      .sort((a, b) => {
        if (a.isMe !== b.isMe) {
          return a.isMe ? -1 : 1;
        }
        return a.playerName.localeCompare(b.playerName, 'zh-CN');
      })
      .slice(0, 5)
      .map((champion) => ({
        ...champion,
        avatarUrl: championAvatarUrls[champion.id] ?? null,
        hpRatio: champion.maxHp > 0 ? Math.max(0, Math.min(1, champion.hp / champion.maxHp)) : 0,
        mpRatio: champion.maxMp > 0 ? Math.max(0, Math.min(1, champion.mp / champion.maxMp)) : 0,
      }));

    while (allies.length < 5) {
      allies.push({
        id: `empty-${allies.length}`,
        playerName: '等待加入',
        avatarUrl: null,
        hpRatio: 0,
        mpRatio: 0,
        level: 0,
        isDead: false,
        respawnTimer: 0,
        isMe: false,
        hp: 0,
        maxHp: 0,
        mp: 0,
        maxMp: 0,
      } as typeof allies[number]);
    }

    return allies;
  }, [champions, championAvatarUrls, myTeam]);

  /** 英雄标记点 */
  const heroMarkers = useMemo(() => {
    return champions
      .filter((c) => {
        if (c.isDead) return false;
        /* 敌方英雄不在服务端快照视野中时，小地图也不显示 */
        if (!c.isMe && !!myTeam && c.team !== myTeam && !c.visibleInSnapshot) return false;
        return true;
      })
      .map((c) => {
        const pos = worldToMinimap(c.position.x, c.position.z);
        const isMe = c.isMe;
        const isAlly = !!myTeam && c.team === myTeam;
        const teamColor = isMe
          ? TEAM_COLORS.me.css
          : c.team === 'blue'
            ? TEAM_COLORS.blue.css
            : TEAM_COLORS.red.css;
        return {
          id: c.id,
          x: pos.x,
          y: pos.y,
          color: teamColor,
          isMe,
          isAlly,
          team: c.team,
          name: c.playerName,
        };
      });
  }, [champions, myTeam]);

  /** 防御塔标记点 */
  const towerMarkers = useMemo(() => {
    return towers
      .filter((t) => t.hp > 0)
      .map((t) => {
        const pos = worldToMinimap(t.position.x, t.position.z);
        const teamColor = t.team === 'blue' ? TEAM_COLORS.blue.css : TEAM_COLORS.red.css;
        return { id: t.id, x: pos.x, y: pos.y, color: teamColor };
      });
  }, [towers]);

  /** 水晶枢纽标记点 */
  const nexusMarkers = useMemo(() => {
    return nexuses.map((n) => {
      const pos = worldToMinimap(n.position.x, n.position.z);
      const teamColor = n.team === 'blue' ? TEAM_COLORS.blue.css : TEAM_COLORS.red.css;
      return {
        id: n.id,
        x: pos.x,
        y: pos.y,
        color: teamColor,
        team: n.team,
      };
    });
  }, [nexuses]);

  const inhibitorMarkers = useMemo(() => {
    return inhibitors
      .filter((inhibitor) => !inhibitor.isDestroyed && inhibitor.hp > 0)
      .map((inhibitor) => {
        const pos = worldToMinimap(inhibitor.position.x, inhibitor.position.z);
        const teamColor = inhibitor.team === 'blue' ? TEAM_COLORS.blue.css : TEAM_COLORS.red.css;
        return {
          id: inhibitor.id,
          x: pos.x,
          y: pos.y,
          color: teamColor,
        };
      });
  }, [inhibitors]);

  const relicMarkers = useMemo(() => {
    return healthRelics
      .filter((relic) => relic.isAvailable)
      .map((relic) => {
        const pos = worldToMinimap(relic.position.x, relic.position.z);
        return {
          id: relic.id,
          x: pos.x,
          y: pos.y,
        };
      });
  }, [healthRelics]);

  /** 位置样式 */
  const positionStyle: React.CSSProperties = position === 'top-left'
    ? { top: PADDING, left: PADDING }
    : { bottom: 60, right: PADDING };

  return (
    <div
      className="absolute z-[90] pointer-events-auto"
      style={positionStyle}
    >
      <div
        className="relative flex flex-col gap-2 backdrop-blur-sm"
        style={{
          width: MINIMAP_WIDTH,
        }}
      >
        <div
          className="relative"
          style={{
            borderRadius: 14,
            background: 'linear-gradient(180deg, rgba(10,12,16,0.96) 0%, rgba(16,20,26,0.94) 100%)',
            border: '1px solid rgba(202,138,4,0.22)',
            boxShadow: '0 12px 34px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 20px rgba(202,138,4,0.04)',
          }}
        >
        <div
          className="relative"
          style={{
            width: MINIMAP_WIDTH,
            height: MINIMAP_HEIGHT,
            background: 'linear-gradient(135deg, rgba(20,28,38,0.96) 0%, rgba(14,18,26,0.98) 50%, rgba(20,28,38,0.96) 100%)',
            overflow: 'hidden',
          }}
        >
          <svg
            width={MINIMAP_WIDTH}
            height={MINIMAP_HEIGHT}
            className="absolute inset-0"
            style={{ opacity: 0.98 }}
          >
            <defs>
              <linearGradient id="laneGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(100,181,246,0.12)" />
                <stop offset="50%" stopColor="rgba(245, 208, 66, 0.12)" />
                <stop offset="100%" stopColor="rgba(239,83,80,0.12)" />
              </linearGradient>
              <pattern id="bgGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
              </pattern>
              <pattern id="scanLines" width="4" height="4" patternUnits="userSpaceOnUse">
                <rect width="4" height="1" fill="rgba(255,255,255,0.015)" />
              </pattern>
            </defs>
            <rect
              x={0}
              y={0}
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              rx={14}
              fill="url(#bgGrid)"
            />
            <rect
              x={0}
              y={0}
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              rx={14}
              fill="url(#scanLines)"
            />
            <rect
              x={4}
              y={4}
              width={MINIMAP_WIDTH - 8}
              height={MINIMAP_HEIGHT - 8}
              rx={10}
              fill="url(#laneGlow)"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={0.5}
            />
            {/* 草丛区域提示 */}
            <rect x={MINIMAP_WIDTH * 0.30} y={4} width={MINIMAP_WIDTH * 0.10} height={MINIMAP_HEIGHT * 0.22} rx={4} fill="rgba(74,222,128,0.06)" />
            <rect x={MINIMAP_WIDTH * 0.60} y={MINIMAP_HEIGHT * 0.78} width={MINIMAP_WIDTH * 0.10} height={MINIMAP_HEIGHT * 0.22} rx={4} fill="rgba(74,222,128,0.06)" />
            <rect x={MINIMAP_WIDTH * 0.42} y={MINIMAP_HEIGHT * 0.20} width={MINIMAP_WIDTH * 0.16} height={MINIMAP_HEIGHT * 0.14} rx={4} fill="rgba(74,222,128,0.05)" />
            <rect x={MINIMAP_WIDTH * 0.42} y={MINIMAP_HEIGHT * 0.66} width={MINIMAP_WIDTH * 0.16} height={MINIMAP_HEIGHT * 0.14} rx={4} fill="rgba(74,222,128,0.05)" />
            <line
              x1={MINIMAP_WIDTH / 2}
              y1={10}
              x2={MINIMAP_WIDTH / 2}
              y2={MINIMAP_HEIGHT - 10}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={1}
              strokeDasharray="3,4"
            />
            <path
              d={`M 18 ${MINIMAP_HEIGHT * 0.18} C ${MINIMAP_WIDTH * 0.24} ${MINIMAP_HEIGHT * 0.16}, ${MINIMAP_WIDTH * 0.34} ${MINIMAP_HEIGHT * 0.32}, ${MINIMAP_WIDTH * 0.5} ${MINIMAP_HEIGHT * 0.5} S ${MINIMAP_WIDTH * 0.76} ${MINIMAP_HEIGHT * 0.84}, ${MINIMAP_WIDTH - 18} ${MINIMAP_HEIGHT * 0.82}`}
              fill="none"
              stroke="rgba(245, 208, 66, 0.22)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <path
              d={`M 18 ${MINIMAP_HEIGHT * 0.82} C ${MINIMAP_WIDTH * 0.24} ${MINIMAP_HEIGHT * 0.84}, ${MINIMAP_WIDTH * 0.34} ${MINIMAP_HEIGHT * 0.68}, ${MINIMAP_WIDTH * 0.5} ${MINIMAP_HEIGHT * 0.5} S ${MINIMAP_WIDTH * 0.76} ${MINIMAP_HEIGHT * 0.16}, ${MINIMAP_WIDTH - 18} ${MINIMAP_HEIGHT * 0.18}`}
              fill="none"
              stroke="rgba(245, 208, 66, 0.12)"
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <circle cx={MINIMAP_WIDTH * 0.14} cy={MINIMAP_HEIGHT * 0.5} r={12} fill={TEAM_COLORS.blue.css} opacity={0.08} />
            <circle cx={MINIMAP_WIDTH * 0.86} cy={MINIMAP_HEIGHT * 0.5} r={12} fill={TEAM_COLORS.red.css} opacity={0.08} />
          </svg>

          {nexusMarkers.map((n) => (
            <div
              key={n.id}
              className="absolute"
              style={{
                left: n.x - 5,
                top: n.y - 5,
                width: 10,
                height: 10,
                background: n.color,
                transform: 'rotate(45deg)',
                borderRadius: 2,
                opacity: 0.84,
                border: '1px solid rgba(255,255,255,0.24)',
                boxShadow: `0 0 6px ${n.color}`,
                zIndex: 3,
              }}
            />
          ))}

          {towerMarkers.map((t) => (
            <div
              key={t.id}
              className="absolute"
              style={{
                left: t.x - 2,
                top: t.y - 2,
                width: 4,
                height: 4,
                background: t.color,
                borderRadius: 1,
                opacity: 0.72,
                boxShadow: `0 0 4px ${t.color}`,
                zIndex: 2,
              }}
            />
          ))}

          {inhibitorMarkers.map((inhibitor) => (
            <div
              key={inhibitor.id}
              className="absolute"
              style={{
                left: inhibitor.x - 4,
                top: inhibitor.y - 4,
                width: 8,
                height: 8,
                background: inhibitor.color,
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: `0 0 6px ${inhibitor.color}`,
                zIndex: 3,
              }}
            />
          ))}

          {relicMarkers.map((relic) => (
            <div
              key={relic.id}
              className="absolute"
              style={{
                left: relic.x - 3,
                top: relic.y - 3,
                width: 6,
                height: 6,
                background: '#7cf0c8',
                borderRadius: '50%',
                border: '1px solid rgba(230,255,247,0.9)',
                boxShadow: '0 0 8px rgba(124,240,200,0.85)',
                zIndex: 3,
              }}
            />
          ))}

          {heroMarkers.map((h) => (
            <div
              key={h.id}
              className="absolute"
              style={{
                left: h.x - (h.isMe ? 5 : 3.5),
                top: h.y - (h.isMe ? 5 : 3.5),
                width: h.isMe ? 10 : 7,
                height: h.isMe ? 10 : 7,
                background: h.color,
                borderRadius: '50%',
                border: h.isMe ? '2px solid rgba(250, 245, 210, 0.95)' : '1px solid rgba(255,255,255,0.18)',
                boxShadow: h.isMe ? `0 0 14px ${h.color}` : `0 0 5px ${h.color}`,
                zIndex: h.isMe ? 4 : 2,
              }}
              title={h.isMe ? `${h.name}（我）` : h.name}
            />
          ))}

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: 14,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 -18px 40px rgba(0,0,0,0.18)',
            }}
          />
          <div
            className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t"
            style={{ borderColor: 'rgba(202,138,4,0.45)' }}
          />
          <div
            className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t"
            style={{ borderColor: 'rgba(202,138,4,0.45)' }}
          />
          <div
            className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l"
            style={{ borderColor: 'rgba(202,138,4,0.45)' }}
          />
          <div
            className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r"
            style={{ borderColor: 'rgba(202,138,4,0.45)' }}
          />
        </div>
        </div>

        <div
          className="pointer-events-auto overflow-hidden"
          style={{
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(7,10,16,0.96) 0%, rgba(13,18,28,0.94) 100%)',
            border: '1px solid rgba(212,175,55,0.24)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <button
            type="button"
            onClick={() => setIsAllyPanelCollapsed((prev) => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.24em',
              color: 'rgba(229, 214, 163, 0.9)',
              background: 'linear-gradient(180deg, rgba(37,45,64,0.78) 0%, rgba(15,20,30,0.82) 100%)',
              borderBottom: isAllyPanelCollapsed ? 'none' : '1px solid rgba(212,175,55,0.14)',
              cursor: 'pointer',
            }}
          >
            <span>队友状态</span>
            <span style={{ fontSize: 12, letterSpacing: 'normal' }}>{isAllyPanelCollapsed ? '▸' : '▾'}</span>
          </button>
          {!isAllyPanelCollapsed && (
          <div style={{ padding: '8px' }}>
            {allyRoster.map((ally, index) => {
              const isPlaceholder = ally.level === 0 && ally.maxHp === 0 && ally.maxMp === 0 && ally.playerName === '等待加入';
              return (
                <div
                  key={ally.id}
                  style={{
                    display: 'grid',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    gridTemplateColumns: '20px minmax(0, 1fr) auto',
                    borderRadius: 8,
                    background: ally.isMe
                      ? 'linear-gradient(90deg, rgba(68,95,148,0.36) 0%, rgba(16,23,36,0.9) 100%)'
                      : index % 2 === 0
                        ? 'rgba(255,255,255,0.028)'
                        : 'rgba(255,255,255,0.014)',
                    border: ally.isMe ? '1px solid rgba(130,180,255,0.28)' : '1px solid transparent',
                    opacity: isPlaceholder ? 0.42 : 1,
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      width: 20,
                      height: 20,
                      padding: 1,
                      borderRadius: 4,
                      background: 'linear-gradient(180deg, rgba(43,53,70,0.95) 0%, rgba(20,24,34,0.98) 100%)',
                      border: `1px solid ${ally.isMe ? 'rgba(250,220,110,0.7)' : 'rgba(118,146,192,0.32)'}`,
                      boxShadow: ally.isMe ? '0 0 12px rgba(250,220,110,0.18)' : 'none',
                      filter: ally.isDead ? 'grayscale(1) brightness(0.72)' : 'none',
                    }}
                  >
                    {ally.avatarUrl ? (
                      <img
                        src={ally.avatarUrl}
                        alt={ally.playerName}
                        className="object-cover"
                        style={{ width: '100%', height: '100%', borderRadius: 3 }}
                      />
                    ) : (
                      <span className="text-[10px] text-[#d7e2f1]">🐟</span>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: 1,
                        color: ally.isMe ? '#fff2be' : '#dbe6f6',
                      }}
                    >
                      {ally.isMe ? `${ally.playerName}` : ally.playerName}
                    </div>
                    <div style={{ marginTop: 6, display: 'grid', rowGap: 3 }}>
                      <div
                        className="relative"
                        style={{
                          position: 'relative',
                          height: 12,
                          overflow: 'hidden',
                          borderRadius: 999,
                          background: ally.isDead
                            ? 'linear-gradient(180deg, rgba(72,28,28,0.96) 0%, rgba(41,16,16,0.98) 100%)'
                            : 'linear-gradient(180deg, rgba(88,20,20,0.96) 0%, rgba(56,14,14,0.98) 100%)',
                          border: '1px solid rgba(255,255,255,0.14)',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.14), inset 0 -1px 2px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.18)',
                        }}
                      >
                        <div
                          className="absolute"
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            width: ally.hpRatio > 0 ? `max(12%, ${ally.hpRatio * 100}%)` : '0%',
                            borderRadius: 999,
                            background: ally.isDead
                              ? 'linear-gradient(90deg, #7a2d2d 0%, #4b1717 100%)'
                              : 'linear-gradient(90deg, #15803d 0%, #22c55e 45%, #4ade80 75%, #bbf7d0 100%)',
                            boxShadow: ally.isDead ? 'none' : '0 0 12px rgba(61, 231, 107, 0.55)',
                          }}
                        />
                        <div
                          className="absolute"
                          style={{
                            position: 'absolute',
                            left: 1,
                            right: 1,
                            top: 1,
                            height: 2,
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.3)',
                            opacity: ally.isDead ? 0.08 : 0.55,
                          }}
                        />
                        {!isPlaceholder && !ally.isDead && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 9,
                              fontWeight: 700,
                              lineHeight: 1,
                              color: '#f7fff9',
                              textShadow: '0 1px 2px rgba(0,0,0,0.95)',
                              pointerEvents: 'none',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {Math.round(ally.hp)}/{Math.round(ally.maxHp)}
                          </div>
                        )}
                      </div>
                      <div
                        className="relative"
                        style={{
                          position: 'relative',
                          height: 4,
                          overflow: 'hidden',
                          borderRadius: 999,
                          background: 'linear-gradient(180deg, rgba(13,19,36,0.96) 0%, rgba(7,10,20,0.98) 100%)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div
                          className="absolute"
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            width: ally.mpRatio > 0 ? `max(10%, ${ally.mpRatio * 100}%)` : '0%',
                            borderRadius: 999,
                            background: 'linear-gradient(90deg, #2f67d8 0%, #4f9cff 60%, #85c4ff 100%)',
                            boxShadow: '0 0 8px rgba(92, 165, 255, 0.35)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: 26,
                      textAlign: 'right',
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {isPlaceholder ? (
                      <span style={{ color: 'rgba(184,196,214,0.55)' }}>--</span>
                    ) : ally.isDead ? (
                      <span style={{ color: '#ff8d8d' }}>{Math.ceil(ally.respawnTimer)}s</span>
                    ) : (
                      <span style={{ color: 'transparent' }}>.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Minimap;
