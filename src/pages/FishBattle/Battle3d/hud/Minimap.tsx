import React, { useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { MAP_CONFIG, TEAM_COLORS } from '../config/mapConfig';

/** 小地图位置配置 */
type MinimapPosition = 'top-left' | 'bottom-right';

interface MinimapProps {
  /** 小地图放置位置，默认左上角。 */
  position?: MinimapPosition;
}

/** 小地图像素尺寸 */
const MINIMAP_WIDTH = 236;
const MINIMAP_HEIGHT = 92;
/** 内边距 */
const PADDING = 8;

/** 将世界坐标映射到小地图像素坐标 */
function worldToMinimap(worldX: number, worldZ: number): { x: number; y: number } {
  const bounds = MAP_CONFIG.playableBounds;
  const rangeX = bounds.maxX - bounds.minX;
  const rangeZ = bounds.maxZ - bounds.minZ;
  const x = ((worldX - bounds.minX) / rangeX) * MINIMAP_WIDTH;
  const y = ((worldZ - bounds.minZ) / rangeZ) * MINIMAP_HEIGHT;
  return { x, y };
}

const Minimap: React.FC<MinimapProps> = ({ position = 'top-left' }) => {
  const champions = useGameStore((s) => s.champions);
  const towers = useGameStore((s) => s.towers);
  const nexuses = useGameStore((s) => s.nexuses);
  const me = useMemo(() => champions.find((c) => c.isMe) ?? null, [champions]);
  const myTeam = me?.team ?? null;

  /** 英雄标记点 */
  const heroMarkers = useMemo(() => {
    return champions
      .filter((c) => !c.isDead)
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

  /** 位置样式 */
  const positionStyle: React.CSSProperties = position === 'top-left'
    ? { top: PADDING, left: PADDING }
    : { bottom: 60, right: PADDING };

  const myTeamLabel = myTeam === 'blue' ? '蓝色方' : myTeam === 'red' ? '红色方' : '未分配';
  const sideChipColor = myTeam === 'blue' ? TEAM_COLORS.blue.css : myTeam === 'red' ? TEAM_COLORS.red.css : '#cbd5e1';

  return (
    <div
      className="absolute z-[90] pointer-events-auto"
      style={positionStyle}
    >
      <div
        className="relative overflow-hidden backdrop-blur-sm"
        style={{
          width: MINIMAP_WIDTH,
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
            background: 'radial-gradient(circle at 50% 50%, rgba(40,48,58,0.34) 0%, rgba(8,10,14,0.96) 100%)',
          }}
        >
          <div
            className="absolute left-3 top-3 rounded-full px-3 py-1 text-[10px]"
            style={{
              color: sideChipColor,
              background: 'rgba(8,10,14,0.72)',
              border: `1px solid ${sideChipColor}44`,
              boxShadow: `0 0 16px ${sideChipColor}22`,
              fontWeight: 700,
              letterSpacing: '0.14em',
              fontFamily: '"Share Tech Mono", "Fira Code", Consolas, monospace',
              zIndex: 5,
            }}
          >
            我方 // {myTeamLabel}
          </div>

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
              x={10}
              y={MINIMAP_HEIGHT * 0.2}
              width={MINIMAP_WIDTH - 20}
              height={MINIMAP_HEIGHT * 0.6}
              rx={MINIMAP_HEIGHT * 0.16}
              fill="url(#laneGlow)"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
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
    </div>
  );
};

export default Minimap;
