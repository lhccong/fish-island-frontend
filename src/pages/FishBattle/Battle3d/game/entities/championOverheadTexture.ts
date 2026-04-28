import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/gameConfig';
import type { EmoteDefinition, Team } from '../../types/game';

const LABEL_WIDTH = GAME_CONFIG.hud.overhead.textureWidth;
const LABEL_HEIGHT = GAME_CONFIG.hud.overhead.textureHeight;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function createCanvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createChampionHudTexture(
  hp: number,
  maxHp: number,
  mp: number,
  maxMp: number,
  team: Team,
  name: string,
  level: number,
  isMe: boolean,
) {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return createCanvasTexture(canvas);
  }

  const hpPercent = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const mpPercent = maxMp > 0 ? Math.max(0, Math.min(1, mp / maxMp)) : 0;
  const { overhead } = GAME_CONFIG.hud;

  ctx.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.78)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = isMe ? '#fde68a' : '#f5e6c8';
  ctx.font = `700 ${isMe ? overhead.nameFontSize : overhead.secondaryNameFontSize}px Arial`;
  ctx.fillText(name, LABEL_WIDTH / 2, 26);
  ctx.shadowBlur = 0;

  roundRect(ctx, 16, 64, 388, 34, 12);
  ctx.fillStyle = 'rgba(3, 7, 15, 0.86)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(196, 169, 110, 0.95)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const hpGradient = ctx.createLinearGradient(18, 0, 400, 0);
  if (team === 'red') {
    hpGradient.addColorStop(0, '#8f161a');
    hpGradient.addColorStop(1, '#ff5c57');
  } else if (hpPercent > 0.55) {
    hpGradient.addColorStop(0, '#1e8d45');
    hpGradient.addColorStop(1, '#4fe07e');
  } else if (hpPercent > 0.25) {
    hpGradient.addColorStop(0, '#b78a1f');
    hpGradient.addColorStop(1, '#ffd450');
  } else {
    hpGradient.addColorStop(0, '#9f2225');
    hpGradient.addColorStop(1, '#ff5c57');
  }
  ctx.fillStyle = hpGradient;
  roundRect(ctx, 18, 68, Math.max(8, 326 * hpPercent), 26, 9);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 18, 68, Math.max(8, 326 * hpPercent), 8, 6);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.34)';
  ctx.lineWidth = 1;
  for (let i = 1; i < overhead.hpSegments; i += 1) {
    const x = 18 + (326 / overhead.hpSegments) * i;
    ctx.beginPath();
    ctx.moveTo(x, 68);
    ctx.lineTo(x, 94);
    ctx.stroke();
  }

  roundRect(ctx, 52, 108, 316, 18, 8);
  ctx.fillStyle = 'rgba(5, 9, 16, 0.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(128, 148, 173, 0.65)';
  ctx.stroke();

  const mpGradient = ctx.createLinearGradient(54, 0, 366, 0);
  mpGradient.addColorStop(0, '#2565d8');
  mpGradient.addColorStop(1, '#66afff');
  ctx.fillStyle = mpGradient;
  roundRect(ctx, 54, 112, Math.max(6, 308 * mpPercent), 10, 5);
  ctx.fill();

  ctx.shadowColor = 'rgba(0,0,0,0.78)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `700 ${overhead.hpValueFontSize}px Arial`;
  ctx.fillText(`${Math.round(hp)} / ${Math.round(maxHp)}`, 180, 82);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${overhead.levelFontSize}px Arial`;
  ctx.fillText(`Lv.${level}`, 396, 82);
  if (maxMp > 0) {
    ctx.fillStyle = '#d8ebff';
    ctx.font = `600 ${overhead.mpValueFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(mp)} / ${Math.round(maxMp)}`, 210, 118);
  }

  ctx.shadowBlur = 0;

  return createCanvasTexture(canvas);
}

export function createEmoteTexture(emote: EmoteDefinition) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return createCanvasTexture(canvas);
  }

  const gradient = ctx.createRadialGradient(80, 72, 20, 80, 80, 72);
  gradient.addColorStop(0, `${emote.color}ff`);
  gradient.addColorStop(1, `${emote.accent}44`);

  ctx.clearRect(0, 0, 160, 160);
  ctx.beginPath();
  ctx.arc(80, 78, 52, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(7, 12, 24, 0.78)';
  ctx.fill();
  ctx.strokeStyle = `${emote.accent}`;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(80, 78, 46, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.68)';
  ctx.shadowBlur = 10;
  ctx.font = '60px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(emote.emoji, 80, 78);
  ctx.shadowBlur = 0;

  roundRect(ctx, 34, 120, 92, 24, 12);
  ctx.fillStyle = 'rgba(8, 14, 28, 0.9)';
  ctx.fill();
  ctx.strokeStyle = `${emote.accent}`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '700 15px Arial';
  ctx.fillStyle = emote.color;
  ctx.fillText(emote.label, 80, 132);

  return createCanvasTexture(canvas);
}
