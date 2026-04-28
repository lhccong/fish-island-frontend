/**
 * 投射物 3D 渲染器。
 * 职责：
 *   1. 从 useGameStore 读取 projectiles 列表
 *   2. 为每个活跃投射物渲染对应的 3D 表现（通用发光球体 / 亚索 Q3 龙卷风等）
 *   3. 每帧基于 speed + direction 做客户端插值，使投射物运动在快照间隔内平滑
 *
 * 性能策略：
 *   - 使用 useRef 缓存 mesh 引用，避免每帧重新创建
 *   - 通用投射物使用 SphereGeometry + MeshStandardMaterial 共享实例
 *   - 亚索 Q3 龙卷风使用 CylinderGeometry 旋转表现
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import type { ProjectilePresentationState } from '../../types/game';

/** 通用投射物颜色 */
const DEFAULT_PROJECTILE_COLOR = 0x00ccff;
/** 亚索 Q3 龙卷风颜色 */
const TORNADO_COLOR = 0x88ddff;
/** 龙卷风旋转速度（弧度/秒） */
const TORNADO_SPIN_SPEED = 8;

/**
 * 判断投射物是否为亚索 Q3 龙卷风类型。
 * 当前以 skillId 包含 "yasuo_q" 且存在作为特殊标识来区分。
 */
function isTornado(proj: ProjectilePresentationState): boolean {
  return proj.skillId === 'yasuo_q' || proj.skillId === 'yasuo_q3';
}

function isCrystalArrow(proj: ProjectilePresentationState): boolean {
  return proj.skillId === 'ashe_r_enchanted_crystal_arrow';
}

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

/** 亚索 Q3 龙卷风底部气流光环颜色 */
const TORNADO_GLOW_COLOR = 0xaaeeff;

const CRYSTAL_ARROW_COLOR = 0xbfe8ff;

const CrystalArrowProjectile: React.FC<{ proj: ProjectilePresentationState }> = ({ proj }) => {
  const groupRef = useRef<THREE.Group>(null);
  const interpRef = useRef({ baseX: proj.position.x, baseZ: proj.position.z, elapsed: 0 });
  const bodyGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.14, 1.5, 6), []);
  const headGeo = useMemo(() => new THREE.ConeGeometry(0.22, 0.55, 6), []);
  const wingGeo = useMemo(() => new THREE.BoxGeometry(0.48, 0.04, 0.22), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CRYSTAL_ARROW_COLOR,
        emissive: CRYSTAL_ARROW_COLOR,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      }),
    [],
  );

  if (interpRef.current.baseX !== proj.position.x || interpRef.current.baseZ !== proj.position.z) {
    interpRef.current.baseX = proj.position.x;
    interpRef.current.baseZ = proj.position.z;
    interpRef.current.elapsed = 0;
  }

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    interpRef.current.elapsed += delta;
    const t = interpRef.current.elapsed;
    const px = interpRef.current.baseX + proj.direction.x * proj.speed * t;
    const pz = interpRef.current.baseZ + proj.direction.z * proj.speed * t;
    const rotation = Math.atan2(proj.direction.x, proj.direction.z);

    group.position.set(px, proj.position.y + 1.0, pz);
    group.rotation.set(0, rotation, Math.PI / 2);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={bodyGeo} material={material} castShadow={false} receiveShadow={false} />
      <mesh geometry={headGeo} material={material} position={[0.78, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow={false} receiveShadow={false} />
      <mesh geometry={wingGeo} material={material} position={[-0.3, 0.16, 0]} rotation={[0, 0, Math.PI / 8]} castShadow={false} receiveShadow={false} />
      <mesh geometry={wingGeo} material={material} position={[-0.3, -0.16, 0]} rotation={[0, 0, -Math.PI / 8]} castShadow={false} receiveShadow={false} />
    </group>
  );
};

/** 亚索 Q3 龙卷风投射物的渲染组件。 */
const TornadoProjectile: React.FC<{ proj: ProjectilePresentationState }> = ({ proj }) => {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef(0);

  /** 龙卷风的几何体：高度较大的圆柱 + 透明旋转效果。 */
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.15, 0.6, 2.0, 8, 1, true), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: TORNADO_COLOR,
        emissive: TORNADO_COLOR,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  /** 底部气流光环几何体：贴地的薄环，模拟龙卷风卷起的地面气流。 */
  const glowRingGeo = useMemo(() => new THREE.RingGeometry(0.3, 0.7, 16), []);
  /** 底部气流光环材质。 */
  const glowRingMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: TORNADO_GLOW_COLOR,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  /** 顶部能量光柱几何体：细长圆柱模拟向上汇聚的能量。 */
  const pillarGeo = useMemo(() => new THREE.CylinderGeometry(0.05, 0.12, 1.2, 6, 1, true), []);
  /** 顶部能量光柱材质。 */
  const pillarMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: TORNADO_COLOR,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    [],
  );

  /** 累积插值时间。 */
  const interpRef = useRef({ baseX: proj.position.x, baseZ: proj.position.z, elapsed: 0 });

  if (interpRef.current.baseX !== proj.position.x || interpRef.current.baseZ !== proj.position.z) {
    interpRef.current.baseX = proj.position.x;
    interpRef.current.baseZ = proj.position.z;
    interpRef.current.elapsed = 0;
  }

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    /* 累积插值时间 */
    interpRef.current.elapsed += delta;
    const t = interpRef.current.elapsed;

    /* 位置更新：快照基准 + 累积偏移 */
    group.position.set(
      interpRef.current.baseX + proj.direction.x * proj.speed * t,
      proj.position.y + 1.0,
      interpRef.current.baseZ + proj.direction.z * proj.speed * t,
    );

    /* 旋转动画 */
    spinRef.current += TORNADO_SPIN_SPEED * delta;
    group.rotation.y = spinRef.current;

    /* 底部光环脉冲透明度 */
    const pulse = 0.25 + Math.sin(spinRef.current * 2) * 0.1;
    (glowRingMat as THREE.MeshBasicMaterial).opacity = pulse;
  });

  return (
    <group ref={groupRef}>
      {/* 主体：外层风柱 */}
      <mesh geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
      {/* 内层小圆柱增加层次感 */}
      <mesh
        geometry={geometry}
        material={material}
        scale={[0.6, 0.8, 0.6]}
        rotation={[0, Math.PI / 4, 0]}
        castShadow={false}
        receiveShadow={false}
      />
      {/* 底部气流光环：贴地渲染 */}
      <mesh
        geometry={glowRingGeo}
        material={glowRingMat}
        position={[0, -1.0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow={false}
        receiveShadow={false}
      />
      {/* 顶部能量光柱：向上延伸 */}
      <mesh
        geometry={pillarGeo}
        material={pillarMat}
        position={[0, 1.2, 0]}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
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
        ) : isTornado(proj) ? (
          <TornadoProjectile key={proj.projectileId} proj={proj} />
        ) : isCrystalArrow(proj) ? (
          <CrystalArrowProjectile key={proj.projectileId} proj={proj} />
        ) : (
          <GenericProjectile key={proj.projectileId} proj={proj} />
        ),
      )}
    </group>
  );
};

export default React.memo(ProjectileRenderer);
