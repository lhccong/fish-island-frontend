import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Team } from '../../types/game';

/** 建筑血条纹理宽高。 */
const BAR_TEX_W = 256;
const BAR_TEX_H = 64;

/** 血条颜色查找表：按队伍和血量百分比区间区分。 */
const HP_COLORS: Record<Team, { high: [string, string]; mid: [string, string]; low: [string, string] }> = {
  blue: {
    high: ['#1e8d45', '#4fe07e'],
    mid: ['#b78a1f', '#ffd450'],
    low: ['#9f2225', '#ff5c57'],
  },
  red: {
    high: ['#8f161a', '#ff5c57'],
    mid: ['#8f161a', '#ff5c57'],
    low: ['#8f161a', '#ff5c57'],
  },
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createStructureHpTexture(hp: number, maxHp: number, team: Team): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = BAR_TEX_W;
  canvas.height = BAR_TEX_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  ctx.clearRect(0, 0, BAR_TEX_W, BAR_TEX_H);

  /* HP 数字 */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#f0e6d2';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(`${Math.ceil(hp)} / ${Math.ceil(maxHp)}`, BAR_TEX_W / 2, 16);
  ctx.shadowBlur = 0;

  /* 血条背景 */
  const barY = 34;
  const barH = 26;
  roundRect(ctx, 0, barY, BAR_TEX_W, barH, 6);
  ctx.fillStyle = 'rgba(3, 7, 15, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(196, 169, 110, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  /* 血条前景 */
  const palette = HP_COLORS[team];
  const colors = pct > 0.55 ? palette.high : pct > 0.25 ? palette.mid : palette.low;
  const grad = ctx.createLinearGradient(2, 0, BAR_TEX_W - 4, 0);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  const barW = Math.max(4, (BAR_TEX_W - 4) * pct);
  roundRect(ctx, 2, barY + 2, barW, barH - 4, 4);
  ctx.fill();

  /* 高光 */
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  roundRect(ctx, 2, barY + 2, barW, (barH - 4) * 0.35, 3);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

interface StructureHealthBarProps {
  hp: number;
  maxHp: number;
  team: Team;
  isDestroyed: boolean;
  /** 血条中心相对于建筑 group 的 Y 偏移。 */
  offsetY?: number;
  /** 血条 Billboard 宽度（世界坐标单位），高度按纹理比例自动计算。 */
  barWidth?: number;
}

/** 建筑头顶血条。使用 Canvas 纹理 + Billboard sprite 渲染。 */
const StructureHealthBar: React.FC<StructureHealthBarProps> = ({
  hp,
  maxHp,
  team,
  isDestroyed,
  offsetY = 8,
  barWidth = 5,
}) => {
  const spriteRef = useRef<THREE.Sprite>(null);

  const hpCeil = Math.ceil(hp);
  const maxHpCeil = Math.ceil(maxHp);

  const texture = useMemo(
    () => createStructureHpTexture(hpCeil, maxHpCeil, team),
    [hpCeil, maxHpCeil, team],
  );

  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        sizeAttenuation: true,
      }),
    [texture],
  );

  if (isDestroyed || hp <= 0) {
    return null;
  }

  return (
    <sprite ref={spriteRef} position={[0, offsetY, 0]} material={material} scale={[barWidth, barWidth * (BAR_TEX_H / BAR_TEX_W), 1]} />
  );
};

export default StructureHealthBar;
