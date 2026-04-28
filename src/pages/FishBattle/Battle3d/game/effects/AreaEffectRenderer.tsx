/**
 * 区域体 3D 渲染器。
 * 职责：
 *   1. 从 useGameStore 读取 areas 列表
 *   2. 按 areaType 分别渲染：
 *      - "windwall"：半透明立墙 + 能量扫描动画（亚索风墙）
 *      - 通用圆形范围：地面贴花环（半径由 area.radius 决定）
 *      - 通用矩形范围：地面矩形贴花（由 length × width 决定）
 *   3. 区域体到期后由服务端清除，前端跟随 store 自动卸载
 *
 * 性能策略：
 *   - 几何体和材质使用 useMemo 缓存
 *   - 使用 depthWrite: false 避免排序问题
 *   - 风墙使用 PlaneGeometry + DoubleSide 避免多余面
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import type { AreaPresentationState } from '../../types/game';

/** 风墙颜色 */
const WINDWALL_COLOR = 0x66ccff;
/** 通用圆形区域颜色 */
const CIRCLE_AREA_COLOR = 0xff4444;
/** 通用矩形区域颜色 */
const RECT_AREA_COLOR = 0xffaa00;
/** 风墙扫描动画速度 */
const WINDWALL_SCAN_SPEED = 3;

/** 风墙边缘发光颜色 */
const WINDWALL_EDGE_COLOR = 0xaaddff;

/**
 * 亚索风墙渲染组件。
 * 以半透明平面 + 能量扫描脉冲 + 边缘发光条呈现。
 */
const WindWallArea: React.FC<{ area: AreaPresentationState }> = ({ area }) => {
  const groupRef = useRef<THREE.Group>(null);
  const scanOffsetRef = useRef(0);

  /** 风墙尺寸：width 为宽度，height 为高度 */
  const wallWidth = area.width ?? area.length ?? 4;
  const wallHeight = area.height ?? 2.5;

  /** 主体平面几何体。 */
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(wallWidth, wallHeight, 1, 1),
    [wallWidth, wallHeight],
  );

  /** 主体半透明材质。 */
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: WINDWALL_COLOR,
        emissive: WINDWALL_COLOR,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  /** 顶部发光条几何体：细长矩形贴在风墙顶端，模拟能量聚集边缘。 */
  const edgeGeo = useMemo(
    () => new THREE.PlaneGeometry(wallWidth, 0.08),
    [wallWidth],
  );
  /** 顶部发光条材质。 */
  const edgeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: WINDWALL_EDGE_COLOR,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  /** 底部发光条材质（与顶部共享几何体，独立材质控制透明度）。 */
  const bottomEdgeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: WINDWALL_EDGE_COLOR,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    /* 位置：风墙中心略高于地面 */
    group.position.set(area.position.x, area.position.y + wallHeight / 2, area.position.z);

    /* 朝向 */
    if (area.rotationY != null) {
      group.rotation.y = area.rotationY;
    }

    /* 能量扫描：通过透明度周期性变化模拟 */
    scanOffsetRef.current += WINDWALL_SCAN_SPEED * delta;
    const pulse = 0.3 + Math.sin(scanOffsetRef.current) * 0.15;
    (material as THREE.MeshStandardMaterial).opacity = pulse;

    /* 边缘发光脉冲：与主体相位错开 */
    const edgePulse = 0.5 + Math.sin(scanOffsetRef.current * 1.5 + 1) * 0.2;
    (edgeMat as THREE.MeshBasicMaterial).opacity = edgePulse;
    (bottomEdgeMat as THREE.MeshBasicMaterial).opacity = edgePulse * 0.6;
  });

  return (
    <group ref={groupRef}>
      {/* 主体半透明平面 */}
      <mesh geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
      {/* 顶部发光条 */}
      <mesh
        geometry={edgeGeo}
        material={edgeMat}
        position={[0, wallHeight / 2, 0.01]}
        castShadow={false}
        receiveShadow={false}
      />
      {/* 底部发光条 */}
      <mesh
        geometry={edgeGeo}
        material={bottomEdgeMat}
        position={[0, -wallHeight / 2, 0.01]}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  );
};

/**
 * 通用圆形区域体渲染组件。
 * 使用 RingGeometry 在地面绘制圆形边框。
 */
const CircleArea: React.FC<{ area: AreaPresentationState }> = ({ area }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const innerRadius = Math.max(0, area.radius - 0.1);
  const outerRadius = area.radius;

  const geometry = useMemo(
    () => new THREE.RingGeometry(innerRadius, outerRadius, 48),
    [innerRadius, outerRadius],
  );

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CIRCLE_AREA_COLOR,
        emissive: CIRCLE_AREA_COLOR,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    /* 贴地：略高于地面避免 z-fighting */
    mesh.position.set(area.position.x, 0.05, area.position.z);
    mesh.rotation.x = -Math.PI / 2;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
  );
};

/**
 * 通用矩形区域体渲染组件。
 * 使用 PlaneGeometry 在地面绘制矩形贴花。
 */
const RectArea: React.FC<{ area: AreaPresentationState }> = ({ area }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const areaLength = area.length ?? area.radius * 2;
  const areaWidth = area.width ?? area.radius * 2;

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(areaWidth, areaLength),
    [areaWidth, areaLength],
  );

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: RECT_AREA_COLOR,
        emissive: RECT_AREA_COLOR,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.set(area.position.x, 0.05, area.position.z);
    mesh.rotation.x = -Math.PI / 2;
    if (area.rotationY != null) {
      mesh.rotation.z = -area.rotationY;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
  );
};

/**
 * 根据 areaType 选择渲染子组件。
 */
function renderArea(area: AreaPresentationState): React.ReactNode {
  const key = area.areaId;

  /* 风墙 */
  if (area.areaType === 'windwall' || area.skillId === 'yasuo_w') {
    return <WindWallArea key={key} area={area} />;
  }

  /* 有 length / width 的矩形区域 */
  if (area.length != null && area.width != null) {
    return <RectArea key={key} area={area} />;
  }

  /* 默认圆形区域 */
  return <CircleArea key={key} area={area} />;
}

/**
 * 区域体渲染入口组件。
 * 遍历 store 中的 areas 列表，渲染对应的 3D 表现。
 */
const AreaEffectRenderer: React.FC = () => {
  const areas = useGameStore((s) => s.areas);

  if (areas.length === 0) {
    return null;
  }

  return (
    <group name="area-effect-renderer">
      {areas.map(renderArea)}
    </group>
  );
};

export default React.memo(AreaEffectRenderer);
