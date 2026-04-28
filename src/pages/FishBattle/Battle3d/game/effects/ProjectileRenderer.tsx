/**
 * 投射物 3D 渲染器。
 * 职责：
 *   1. 从 useGameStore 读取 projectiles 列表
 *   2. 为每个活跃投射物渲染对应的 3D 表现（通用发光球体 / 防御塔弹道等）
 *   3. 每帧基于 speed + direction 做客户端插值，使投射物运动在快照间隔内平滑
 *
 * 性能策略：
 *   - 使用 useRef 缓存 mesh 引用，避免每帧重新创建
 *   - 通用投射物使用 SphereGeometry + MeshStandardMaterial 共享实例
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import type { ProjectilePresentationState } from '../../types/game';

/** 通用投射物颜色 */
const DEFAULT_PROJECTILE_COLOR = 0x00ccff;

function isTowerProjectile(proj: ProjectilePresentationState): boolean {
  return proj.skillId === 'tower_attack';
}

/** 单个通用投射物的渲染组件。 */
const GenericProjectile: React.FC<{ proj: ProjectilePresentationState }> = ({ proj }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const radius = proj.radius ?? 0.3;
  /** 累积插值时间（自上次快照位置更新后）。 */
  const interpRef = useRef({ baseX: proj.position.x, baseY: proj.position.y, baseZ: proj.position.z, elapsed: 0 });

  /** 快照位置变化时重置插值基准。 */
  if (interpRef.current.baseX !== proj.position.x || interpRef.current.baseZ !== proj.position.z || interpRef.current.baseY !== proj.position.y) {
    interpRef.current.baseX = proj.position.x;
    interpRef.current.baseY = proj.position.y;
    interpRef.current.baseZ = proj.position.z;
    interpRef.current.elapsed = 0;
  }

  /** 共享几何体和材质，避免重复创建。 */
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 12, 8), [radius]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: DEFAULT_PROJECTILE_COLOR,
        emissive: DEFAULT_PROJECTILE_COLOR,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.85,
      }),
    [],
  );

  /** 每帧基于投射物的 speed 和 direction 做客户端平滑插值。 */
  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    /* 累积插值时间 */
    interpRef.current.elapsed += delta;
    const t = interpRef.current.elapsed;

    /* 基于快照位置 + 累积时间 * 速度 * 方向计算当前渲染位置（含 Y 轴插值） */
    mesh.position.set(
      interpRef.current.baseX + proj.direction.x * proj.speed * t,
      interpRef.current.baseY + proj.direction.y * proj.speed * t + 0.5,
      interpRef.current.baseZ + proj.direction.z * proj.speed * t,
    );
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
  );
};

/** 防御塔弹道颜色（金色） */
const TOWER_PROJECTILE_COLOR = 0xffaa22;

/** 防御塔弹道投射物渲染组件：金色发光球体。 */
const TowerProjectile: React.FC<{ proj: ProjectilePresentationState }> = ({ proj }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const radius = proj.radius ?? 0.25;
  const interpRef = useRef({ baseX: proj.position.x, baseY: proj.position.y, baseZ: proj.position.z, elapsed: 0 });

  if (
    interpRef.current.baseX !== proj.position.x
    || interpRef.current.baseZ !== proj.position.z
    || interpRef.current.baseY !== proj.position.y
  ) {
    interpRef.current.baseX = proj.position.x;
    interpRef.current.baseY = proj.position.y;
    interpRef.current.baseZ = proj.position.z;
    interpRef.current.elapsed = 0;
  }

  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 10, 8), [radius]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: TOWER_PROJECTILE_COLOR,
        emissive: TOWER_PROJECTILE_COLOR,
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.92,
      }),
    [],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    interpRef.current.elapsed += delta;
    const t = interpRef.current.elapsed;
    const totalFlightTime = ((proj.expiresAt ?? 0) - (proj.createdAt ?? 0)) / 1000;
    const progress = Math.min(t / Math.max(totalFlightTime, 0.05), 1);
    /* Y 轴抛物线下落：从塔顶(3.5)弧线飞向目标身体中心(1.0) */
    const startY = interpRef.current.baseY;
    const endY = 1.0;
    const arcHeight = 1.5;
    const linearY = startY + (endY - startY) * progress;
    const arcY = linearY + arcHeight * Math.sin(progress * Math.PI);
    mesh.position.set(
      interpRef.current.baseX + proj.direction.x * proj.speed * t,
      arcY,
      interpRef.current.baseZ + proj.direction.z * proj.speed * t,
    );
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
  );
};

/**
 * 投射物渲染入口组件。
 * 遍历 store 中的 projectiles 列表，对每个投射物渲染对应的 3D 表现。
 */
const ProjectileRenderer: React.FC = () => {
  const projectiles = useGameStore((s) => s.projectiles);

  if (projectiles.length === 0) {
    return null;
  }

  return (
    <group name="projectile-renderer">
      {projectiles.map((proj) =>
        isTowerProjectile(proj) ? (
          <TowerProjectile key={proj.projectileId} proj={proj} />
        ) : (
          <GenericProjectile key={proj.projectileId} proj={proj} />
        ),
      )}
    </group>
  );
};

export default React.memo(ProjectileRenderer);
