import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { getBushesConfig, getFountainAssetConfig } from '../../config/environmentConfig';
import { GAME_CONFIG } from '../../config/gameConfig';
import { useGameStore } from '../../store/useGameStore';

type DebugLabelItem = {
  id: string;
  title: string;
  position: [number, number, number];
  color: string;
  offsetY: number;
};

const MODELED_LABEL_STYLE: React.CSSProperties = {
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};

const panelStyle = (cfg: typeof GAME_CONFIG.debug.worldCoordinates): React.CSSProperties => ({
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(5, 11, 20, 0.82)',
  color: '#e6f0ff',
  fontSize: cfg.fontSize,
  fontFamily: cfg.fontFamily,
  lineHeight: 1.35,
  boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
  backdropFilter: 'blur(4px)',
});

function formatVector(position: [number, number, number], precision: number) {
  return `(${position[0].toFixed(precision)}, ${position[1].toFixed(precision)}, ${position[2].toFixed(precision)})`;
}

const WorldDebugLabels: React.FC = () => {
  const showWorldCoordinates = useGameStore((s) => s.showWorldCoordinates);
  const champions = useGameStore((s) => s.champions);
  const towers = useGameStore((s) => s.towers);
  const nexuses = useGameStore((s) => s.nexuses);
  const healthRelics = useGameStore((s) => s.healthRelics);
  const config = GAME_CONFIG.debug.worldCoordinates;

  const labels = useMemo(() => {
    const items: DebugLabelItem[] = [];

    if (config.showChampions) {
      champions.forEach((champion) => {
        items.push({
          id: `champ_${champion.id}`,
          title: `${champion.playerName} / ${champion.heroId}`,
          position: [champion.position.x, champion.position.y, champion.position.z],
          color: champion.isMe ? '#fde047' : champion.team === 'blue' ? '#64b5f6' : '#ef5350',
          offsetY: config.offsetY,
        });
      });
    }

    if (config.showStructures) {
      towers.forEach((tower, index) => {
        items.push({
          id: `tower_${tower.id}`,
          title: `${tower.team === 'blue' ? '蓝' : '红'}${tower.type === 'outer' ? '外塔' : '内塔'} ${index + 1}`,
          position: [tower.position.x, tower.position.y, tower.position.z],
          color: tower.team === 'blue' ? '#8cc8ff' : '#ff9a9a',
          offsetY: 7.2,
        });
      });

      nexuses.forEach((nexus, index) => {
        items.push({
          id: `nexus_${nexus.id}`,
          title: `${nexus.team === 'blue' ? '蓝' : '红'}水晶 ${index + 1}`,
          position: [nexus.position.x, nexus.position.y, nexus.position.z],
          color: nexus.team === 'blue' ? '#9fd8ff' : '#ffb3b3',
          offsetY: 8.8,
        });
      });

      healthRelics.forEach((relic, index) => {
        items.push({
          id: `relic_${relic.id}`,
          title: `补血遗迹 ${index + 1}`,
          position: [relic.position.x, relic.position.y, relic.position.z],
          color: '#7dffbb',
          offsetY: 3.6,
        });
      });

      getBushesConfig().forEach((bush, index) => {
        items.push({
          id: `bush_${bush.id}`,
          title: `草丛 ${index + 1}`,
          position: bush.position,
          color: '#8ef0a5',
          offsetY: 3.4,
        });
      });

      Object.entries(getFountainAssetConfig()).forEach(([team, fountain]) => {
        items.push({
          id: `fountain_${team}`,
          title: `${team === 'blue' ? '蓝' : '红'}泉水`,
          position: fountain.position,
          color: team === 'blue' ? '#8cc8ff' : '#ff9a9a',
          offsetY: 5.2,
        });
      });
    }

    return items;
  }, [champions, config.offsetY, config.showChampions, config.showStructures, healthRelics, nexuses, towers]);

  if (!showWorldCoordinates) {
    return null;
  }

  return (
    <>
      {labels.map((item) => (
        <group
          key={item.id}
          position={[item.position[0], item.position[1] + item.offsetY, item.position[2]]}
        >
          <Html center sprite distanceFactor={config.distanceFactor} style={MODELED_LABEL_STYLE}>
            <div style={{ ...panelStyle(config), borderColor: item.color, color: item.color }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
              <div style={{ color: '#dbeafe' }}>{formatVector(item.position, config.precision)}</div>
            </div>
          </Html>
        </group>
      ))}
    </>
  );
};

export default React.memo(WorldDebugLabels);
