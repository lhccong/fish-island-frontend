/**
 * 技能视觉特效系统（Skill VFX System）。
 * 职责：
 *   1. 监听 store 中英雄的 activeCastPhase 变化，在 resolve 阶段触发命中特效
 *   2. 管理短生命周期的视觉效果实例（斩击光弧、命中闪光、位移残影等）
 *   3. 每帧推进特效生命周期，到期自动清除
 *
 * 设计原则：
 *   - 特效与技能逻辑完全解耦，仅根据事件/状态驱动
 *   - 使用对象池思想，避免频繁创建/销毁 Three.js 对象
 *   - 特效数据存储在 useRef 中，不进入 zustand 避免高频触发渲染
 *
 * 性能策略：
 *   - 特效实例上限控制（MAX_VFX_INSTANCES）
 *   - 几何体/材质共享复用
 *   - 使用 depthWrite: false + transparent 避免排序开销
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

/** 特效实例上限，超出后移除最旧的。 */
const MAX_VFX_INSTANCES = 30;

/** 特效实例数据结构。 */
interface VfxInstance {
  /** 唯一标识。 */
  id: string;
  /** 特效类型。 */
  type:
    | 'slash_arc'
    | 'hit_flash'
    | 'wind_wall_spawn'
    | 'dash_burst'
    | 'ultimate_burst'
    | 'tornado_cast'
    | 'wind_wall_expand'
    | 'dash_trail'
    | 'ult_impact'
    | 'lux_snare'
    | 'lux_barrier'
    | 'lux_zone'
    | 'lux_beam'
    | 'annie_cone'
    | 'annie_burst'
    | 'ashe_volley'
    | 'jhin_line';
  /** 世界坐标位置。 */
  position: THREE.Vector3;
  /** 目标点。 */
  targetPoint?: THREE.Vector3 | null;
  /** 朝向角度（弧度）。 */
  rotation: number;
  /** 创建时间戳（秒，累积帧时间）。 */
  createdAt: number;
  /** 生命周期（秒）。 */
  lifetime: number;
  /** 当前已存活时间（秒）。 */
  elapsed: number;
}

/** 斩击光弧颜色 */
const SLASH_COLOR = 0xaaeeff;
/** 命中闪光颜色 */
const HIT_FLASH_COLOR = 0xffffff;
/** 龙卷风凝聚特效颜色（亚索 Q3） */
const TORNADO_CAST_COLOR = 0x88ddff;
/** 风墙展开特效颜色（亚索 W） */
const WIND_WALL_EXPAND_COLOR = 0x66ccff;
/** 冲刺残影颜色（亚索 E） */
const DASH_TRAIL_COLOR = 0x7dd3fc;
/** 终极冲击波颜色（亚索 R） */
const ULT_IMPACT_COLOR = 0xfde68a;

function getLinearVfxColor(type: VfxInstance['type']): number {
  switch (type) {
    case 'lux_snare':
      return 0x8bd3ff;
    case 'lux_barrier':
      return 0xf8e16c;
    case 'lux_beam':
      return 0xfaf089;
    case 'annie_cone':
      return 0xfb7185;
    case 'ashe_volley':
      return 0x93c5fd;
    case 'jhin_line':
      return 0xc084fc;
    default:
      return 0xffffff;
  }
}

function getLinearVfxThickness(type: VfxInstance['type']): number {
  switch (type) {
    case 'lux_beam':
      return 1.4;
    case 'ashe_volley':
      return 2.8;
    case 'annie_cone':
      return 2.4;
    case 'jhin_line':
      return 0.55;
    case 'lux_barrier':
      return 0.75;
    default:
      return 0.45;
  }
}

function getLinearVfxHeight(type: VfxInstance['type']): number {
  switch (type) {
    case 'lux_beam':
      return 0.42;
    case 'lux_barrier':
      return 0.28;
    case 'lux_snare':
      return 0.24;
    case 'jhin_line':
      return 0.16;
    case 'ashe_volley':
    case 'annie_cone':
      return 0.12;
    default:
      return 0.2;
  }
}

function getLinearVfxYOffset(type: VfxInstance['type']): number {
  switch (type) {
    case 'ashe_volley':
    case 'annie_cone':
      return 0.14;
    case 'lux_beam':
      return 1.25;
    default:
      return 1.0;
  }
}

function getLinearFallbackLength(type: VfxInstance['type']): number {
  switch (type) {
    case 'lux_beam':
      return 18;
    case 'jhin_line':
      return 15;
    case 'ashe_volley':
      return 8;
    case 'annie_cone':
      return 5.5;
    default:
      return 8;
  }
}

function getSlashColor(type: VfxInstance['type']): number {
  switch (type) {
    case 'dash_burst':
      return 0x7dd3fc;
    case 'ultimate_burst':
      return 0xfde68a;
    default:
      return SLASH_COLOR;
  }
}

function getFlashColor(type: VfxInstance['type']): number {
  switch (type) {
    case 'wind_wall_spawn':
      return 0x93c5fd;
    case 'ultimate_burst':
      return 0xfef08a;
    default:
      return HIT_FLASH_COLOR;
  }
}

function resolveVfxTargetPoint(vfx: VfxInstance): THREE.Vector3 {
  if (vfx.targetPoint) {
    return vfx.targetPoint.clone();
  }
  const fallbackLength = getLinearFallbackLength(vfx.type);
  return new THREE.Vector3(
    vfx.position.x + Math.sin(vfx.rotation) * fallbackLength,
    vfx.position.y,
    vfx.position.z + Math.cos(vfx.rotation) * fallbackLength,
  );
}

/**
 * 单个斩击光弧的渲染。
 * 使用扁平环段几何体模拟弧形斩击轨迹，随时间淡出。
 */
const SlashArcVfx: React.FC<{ vfx: VfxInstance }> = ({ vfx }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(
    () => new THREE.RingGeometry(0.8, 1.6, 16, 1, 0, Math.PI * 0.6),
    [],
  );
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: getSlashColor(vfx.type),
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    /* 位置和旋转 */
    mesh.position.copy(vfx.position);
    mesh.position.y += 0.8;
    mesh.rotation.set(-Math.PI / 4, vfx.rotation, 0);

    /* 透明度随时间衰减 */
    const progress = Math.min(1, vfx.elapsed / vfx.lifetime);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress);

    /* 尺寸随时间略微扩大 */
    const baseScale = vfx.type === 'ultimate_burst' ? 1.45 : vfx.type === 'dash_burst' ? 0.92 : 1;
    const scale = baseScale + progress * 0.3;
    mesh.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
  );
};

/**
 * 单个命中闪光的渲染。
 * 使用球体 + 高亮发光模拟命中瞬间的光效。
 */
const HitFlashVfx: React.FC<{ vfx: VfxInstance }> = ({ vfx }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => new THREE.SphereGeometry(0.3, 8, 6), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: getFlashColor(vfx.type),
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.position.copy(vfx.position);
    mesh.position.y += 1.0;

    const progress = Math.min(1, vfx.elapsed / vfx.lifetime);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 * (1 - progress);

    /* 命中闪光快速扩大后消失 */
    const baseScale = vfx.type === 'wind_wall_spawn' ? 1.1 : vfx.type === 'ultimate_burst' ? 1.4 : 0.5;
    const scale = baseScale + progress * 1.5;
    mesh.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
  );
};

const LinearRemoteVfx: React.FC<{ vfx: VfxInstance }> = ({ vfx }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: getLinearVfxColor(vfx.type),
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    [vfx.type],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const targetPoint = resolveVfxTargetPoint(vfx);
    const dx = targetPoint.x - vfx.position.x;
    const dz = targetPoint.z - vfx.position.z;
    const distance = Math.max(0.8, Math.sqrt(dx * dx + dz * dz));
    const rotation = Math.atan2(dx, dz);
    const progress = Math.min(1, vfx.elapsed / vfx.lifetime);
    const midX = (vfx.position.x + targetPoint.x) * 0.5;
    const midZ = (vfx.position.z + targetPoint.z) * 0.5;
    const thickness = getLinearVfxThickness(vfx.type);
    const height = getLinearVfxHeight(vfx.type);

    mesh.position.set(midX, getLinearVfxYOffset(vfx.type), midZ);
    mesh.rotation.y = rotation;
    mesh.scale.set(thickness * (1 + progress * 0.08), height, distance);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.72 * (1 - progress * 0.82);
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />;
};

const GroundZoneVfx: React.FC<{ vfx: VfxInstance }> = ({ vfx }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.75, 1.0, 40), []);
  const coreGeo = useMemo(() => new THREE.SphereGeometry(0.35, 12, 10), []);
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: vfx.type === 'annie_burst' ? 0xfb7185 : 0xf8e16c,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [vfx.type],
  );
  const coreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: vfx.type === 'annie_burst' ? 0xf97316 : 0xfef08a,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    [vfx.type],
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const progress = Math.min(1, vfx.elapsed / vfx.lifetime);
    const scale = vfx.type === 'annie_burst'
      ? 1.1 + progress * 2.2
      : 1.4 + Math.sin(progress * Math.PI) * 0.45;

    group.position.copy(vfx.position);
    group.position.y = 0.08;
    group.scale.set(scale, scale, scale);
    (ringMat as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - progress * 0.7);
    (coreMat as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - progress * 0.75);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={ringGeo} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} castShadow={false} receiveShadow={false} />
      <mesh geometry={coreGeo} material={coreMat} position={[0, 0.6, 0]} castShadow={false} receiveShadow={false} />
    </group>
  );
};

// ==================== 亚索 Q3 龙卷风凝聚特效 ====================

/**
 * 龙卷风凝聚特效：在施法点渲染向上旋转扩散的风柱。
 * 用于亚索 Q3（三段Q）的施法表现。
 */
const TornadoCastVfx: React.FC<{ vfx: VfxInstance }> = ({ vfx }) => {
  const groupRef = useRef<THREE.Group>(null);
  /** 内层圆柱：快速旋转的核心风柱。 */
  const innerGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.5, 1.8, 8, 1, true), []);
  /** 外层圆柱：缓速旋转的外围气流。 */
  const outerGeo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.8, 2.2, 8, 1, true), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: TORNADO_CAST_COLOR,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const progress = Math.min(1, vfx.elapsed / vfx.lifetime);

    /* 位置：施法点上方 */
    group.position.copy(vfx.position);
    group.position.y += 1.0;

    /* 旋转动画：随时间加速旋转，使用 delta 确保帧率独立 */
    const spinSpeed = 6 + progress * 12;
    group.rotation.y += spinSpeed * delta;

    /* 缩放：从小到大扩张后收缩消散 */
    const scalePhase = progress < 0.6 ? progress / 0.6 : 1 - (progress - 0.6) / 0.4;
    const s = 0.3 + scalePhase * 0.7;
    group.scale.set(s, s + progress * 0.3, s);

    /* 透明度随时间衰减 */
    (material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - progress * 0.7);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={innerGeo} material={material} castShadow={false} receiveShadow={false} />
      <mesh
        geometry={outerGeo}
        material={material}
        rotation={[0, Math.PI / 3, 0]}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  );
};

// ==================== 亚索 W 风墙展开特效 ====================

/**
 * 风墙展开特效：从中心向两侧快速伸展的能量条。
 * 模拟亚索 W 风墙生成时的视觉冲击。
 */
const WindWallExpandVfx: React.FC<{ vfx: VfxInstance }> = ({ vfx }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  /** 扁平矩形模拟展开的能量条。 */
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 2.5), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: WIND_WALL_EXPAND_COLOR,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const progress = Math.min(1, vfx.elapsed / vfx.lifetime);

    /* 位置和朝向 */
    mesh.position.copy(vfx.position);
    mesh.position.y += 1.25;
    mesh.rotation.y = vfx.rotation;

    /* X轴方向伸展：模拟风墙从中心向两侧展开 */
    const expandProgress = Math.min(1, progress / 0.4);
    const expandScale = 0.1 + expandProgress * 4.0;
    mesh.scale.set(expandScale, 1, 1);

    /* 透明度快速建立后衰减 */
    const fadeIn = Math.min(1, progress / 0.15);
    const fadeOut = progress > 0.5 ? 1 - (progress - 0.5) / 0.5 : 1;
    (material as THREE.MeshBasicMaterial).opacity = 0.7 * fadeIn * fadeOut;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
  );
};

// ==================== 亚索 E 冲刺残影特效 ====================

/**
 * 冲刺残影特效：在施法点渲染一个快速淡出的半透明残影。
 * 模拟亚索 E 踏前斩时的高速位移视觉效果。
 */
const DashTrailVfx: React.FC<{ vfx: VfxInstance }> = ({ vfx }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  /** 使用胶囊状几何体模拟英雄残影剪影。 */
  const geometry = useMemo(() => new THREE.CapsuleGeometry(0.3, 1.0, 4, 8), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: DASH_TRAIL_COLOR,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const progress = Math.min(1, vfx.elapsed / vfx.lifetime);

    /* 位置：残影固定在原始施法位置 */
    mesh.position.copy(vfx.position);
    mesh.position.y += 0.8;

    /* 透明度快速衰减，模拟残影消散 */
    (material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - progress);

    /* 轻微缩放模拟残影扩散 */
    const s = 1 + progress * 0.15;
    mesh.scale.set(s, s, s);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
  );
};

// ==================== 亚索 R 终极冲击波特效 ====================

/**
 * 终极冲击波特效：在落地点渲染向外扩散的地面冲击环。
 * 模拟亚索 R 狂风绝息斩落地时的震撼效果。
 */
const UltImpactVfx: React.FC<{ vfx: VfxInstance }> = ({ vfx }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  /** 使用环形几何体渲染冲击波扩散环。 */
  const geometry = useMemo(() => new THREE.RingGeometry(0.8, 1.2, 32), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: ULT_IMPACT_COLOR,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const progress = Math.min(1, vfx.elapsed / vfx.lifetime);

    /* 位置贴地 */
    mesh.position.copy(vfx.position);
    mesh.position.y = 0.08;
    mesh.rotation.x = -Math.PI / 2;

    /* 冲击波向外扩散：环缩放从1到5 */
    const expandScale = 1 + progress * 4;
    mesh.scale.set(expandScale, expandScale, 1);

    /* 透明度快速衰减 */
    (material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - progress);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
  );
};

/**
 * 技能特效系统入口组件。
 * 监听英雄施法状态变化，生成对应特效实例并管理其生命周期。
 */
const SkillVfxSystem: React.FC = () => {
  const combatImpactVfxes = useGameStore((s) => s.combatImpactVfxes);
  const vfxListRef = useRef<VfxInstance[]>([]);
  /** 强制重渲染计数器。 */
  const [, forceUpdate] = React.useState(0);

  useFrame((_, delta) => {
    const vfxList = vfxListRef.current;
    let dirty = false;

    /* 推进特效生命周期 */
    for (const vfx of vfxList) {
      vfx.elapsed += delta;
    }

    /* 清除到期特效 */
    const beforeLength = vfxList.length;
    vfxListRef.current = vfxList.filter((v) => v.elapsed < v.lifetime);
    if (vfxListRef.current.length !== beforeLength) {
      dirty = true;
    }

    /* 超出上限时移除最旧的 */
    while (vfxListRef.current.length > MAX_VFX_INSTANCES) {
      vfxListRef.current.shift();
      dirty = true;
    }

    /* 仅在列表变化时触发重渲染 */
    if (dirty) {
      forceUpdate((n) => n + 1);
    }
  });

  const externalVfxList: VfxInstance[] = combatImpactVfxes.map((item) => ({
    id: item.id,
    type: item.kind,
    position: new THREE.Vector3(item.position.x, item.position.y, item.position.z),
    targetPoint: item.targetPoint ? new THREE.Vector3(item.targetPoint.x, item.targetPoint.y, item.targetPoint.z) : null,
    rotation: item.rotation ?? 0,
    createdAt: item.createdAt / 1000,
    lifetime: Math.max(0.12, (item.expiresAt - item.createdAt) / 1000),
    elapsed: Math.max(0, (Date.now() - item.createdAt) / 1000),
  }));
  const vfxList = [...vfxListRef.current, ...externalVfxList];

  if (vfxList.length === 0) {
    return null;
  }

  return (
    <group name="skill-vfx-system">
      {vfxList.map((vfx) => {
        switch (vfx.type) {
          case 'slash_arc':
          case 'dash_burst':
          case 'ultimate_burst':
            return <SlashArcVfx key={vfx.id} vfx={vfx} />;
          case 'hit_flash':
          case 'wind_wall_spawn':
            return <HitFlashVfx key={vfx.id} vfx={vfx} />;
          case 'lux_snare':
          case 'lux_barrier':
          case 'lux_beam':
          case 'annie_cone':
          case 'ashe_volley':
          case 'jhin_line':
            return <LinearRemoteVfx key={vfx.id} vfx={vfx} />;
          case 'lux_zone':
          case 'annie_burst':
            return <GroundZoneVfx key={vfx.id} vfx={vfx} />;
          /* 亚索 Q3 龙卷风凝聚特效 */
          case 'tornado_cast':
            return <TornadoCastVfx key={vfx.id} vfx={vfx} />;
          /* 亚索 W 风墙展开特效 */
          case 'wind_wall_expand':
            return <WindWallExpandVfx key={vfx.id} vfx={vfx} />;
          /* 亚索 E 冲刺残影特效 */
          case 'dash_trail':
            return <DashTrailVfx key={vfx.id} vfx={vfx} />;
          /* 亚索 R 终极冲击波特效 */
          case 'ult_impact':
            return <UltImpactVfx key={vfx.id} vfx={vfx} />;
          default:
            return null;
        }
      })}
    </group>
  );
};

export default React.memo(SkillVfxSystem);
