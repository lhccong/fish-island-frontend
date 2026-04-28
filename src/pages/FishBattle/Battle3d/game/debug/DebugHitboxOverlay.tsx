/**
 * 调试判定范围可视化覆盖层。
 * 功能：
 *   1. 为所有活跃投射物绘制碰撞半径线框球
 *   2. 为所有活跃区域体绘制范围线框（圆形/矩形/风墙）
 *   3. 为所有英雄绘制碰撞体积半径线框
 *   4. 为技能范围指示器补充线框辅助显示
 *   5. 仅在 debugHitboxes === true 时渲染
 *
 * 所有线框使用 wireframe 材质，不影响正常渲染。
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

/** 投射物碰撞体默认半径。 */
const DEFAULT_PROJECTILE_RADIUS = 0.5;
/** 英雄碰撞体默认半径。 */
const DEFAULT_CHAMPION_RADIUS = 0.5;
/** 英雄碰撞体默认高度。 */
const DEFAULT_CHAMPION_HEIGHT = 2.0;

/** 线框材质颜色常量 */
const COLOR_PROJECTILE = 0xff4444;
const COLOR_AREA_CIRCLE = 0x44ff44;
const COLOR_AREA_RECT = 0x44aaff;
const COLOR_AREA_WINDWALL = 0x44ffff;
const COLOR_CHAMPION = 0xffaa00;

/* ============================================================
 * 投射物碰撞球线框
 * ============================================================ */
const ProjectileHitboxes: React.FC = () => {
  const projectiles = useGameStore((s) => s.projectiles);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 12, 8), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLOR_PROJECTILE,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    [],
  );

  if (projectiles.length === 0) return null;

  return (
    <group name="debug-projectile-hitboxes">
      {projectiles.map((p) => {
        const r = p.radius ?? DEFAULT_PROJECTILE_RADIUS;
        return (
          <mesh
            key={p.projectileId}
            geometry={geo}
            material={mat}
            position={[p.position.x, p.position.y + 0.5, p.position.z]}
            scale={[r, r, r]}
          />
        );
      })}
    </group>
  );
};

/* ============================================================
 * 区域体范围线框
 * ============================================================ */
const AreaHitboxes: React.FC = () => {
  const areas = useGameStore((s) => s.areas);
  const circleGeo = useMemo(() => new THREE.RingGeometry(0.9, 1, 32), []);
  const rectGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const matCircle = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLOR_AREA_CIRCLE,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const matRect = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLOR_AREA_RECT,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const matWindwall = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLOR_AREA_WINDWALL,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  if (areas.length === 0) return null;

  return (
    <group name="debug-area-hitboxes">
      {areas.map((area) => {
        const pos: [number, number, number] = [area.position.x, 0.05, area.position.z];

        if (area.areaType === 'windwall') {
          const w = area.width ?? 4;
          const h = area.height ?? 2.5;
          return (
            <mesh
              key={area.areaId}
              geometry={rectGeo}
              material={matWindwall}
              position={[area.position.x, h / 2, area.position.z]}
              rotation={[0, area.rotationY ?? 0, 0]}
              scale={[w, h, 1]}
            />
          );
        }

        if (area.areaType === 'rectangle') {
          const l = area.length ?? 2;
          const w = area.width ?? 2;
          return (
            <mesh
              key={area.areaId}
              geometry={rectGeo}
              material={matRect}
              position={pos}
              rotation={[-Math.PI / 2, 0, area.rotationY ?? 0]}
              scale={[w, l, 1]}
            />
          );
        }

        /* 默认圆形区域 */
        const r = area.radius ?? 2;
        return (
          <mesh
            key={area.areaId}
            geometry={circleGeo}
            material={matCircle}
            position={pos}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[r, r, 1]}
          />
        );
      })}
    </group>
  );
};

/* ============================================================
 * 英雄碰撞体线框
 * ============================================================ */
const ChampionHitboxes: React.FC = () => {
  const champions = useGameStore((s) => s.champions);
  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLOR_CHAMPION,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    [],
  );

  if (champions.length === 0) return null;

  return (
    <group name="debug-champion-hitboxes">
      {champions.map((c) => {
        if (c.isDead) return null;
        const r = DEFAULT_CHAMPION_RADIUS;
        const h = DEFAULT_CHAMPION_HEIGHT;
        return (
          <mesh
            key={c.id}
            geometry={geo}
            material={mat}
            position={[c.position.x, h / 2, c.position.z]}
            scale={[r, h, r]}
          />
        );
      })}
    </group>
  );
};

/* ============================================================
 * 主组件：仅在 debugHitboxes 开启时渲染
 * ============================================================ */
const DebugHitboxOverlay: React.FC = () => {
  const debugHitboxes = useGameStore((s) => s.debugHitboxes);

  if (!debugHitboxes) return null;

  return (
    <group name="debug-hitbox-overlay">
      <ProjectileHitboxes />
      <AreaHitboxes />
      <ChampionHitboxes />
    </group>
  );
};

export default DebugHitboxOverlay;
