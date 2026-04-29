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

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import type { ProjectilePresentationState } from '../../types/game';

const MINION_PROJECTILE_COLOR = 0x5b9bd5;
const TOWER_PROJECTILE_COLOR = 0xd94f4f;
const HERO_PROJECTILE_COLOR = 0xe6b422;

function resolveTargetPosition(proj: ProjectilePresentationState): THREE.Vector3 | null {
  if (proj.impactPosition) {
    return new THREE.Vector3(proj.impactPosition.x, proj.impactPosition.y, proj.impactPosition.z);
  }
  if (!proj.targetEntityId) {
    return null;
  }
  const store = useGameStore.getState();
  const champion = store.champions.find((item) => item.id === proj.targetEntityId);
  if (champion) {
    return new THREE.Vector3(champion.position.x, champion.position.y + 0.95, champion.position.z);
  }
  const minion = store.minions.find((item) => item.id === proj.targetEntityId);
  if (minion) {
    return new THREE.Vector3(minion.position.x, minion.position.y + 0.8, minion.position.z);
  }
  const tower = store.towers.find((item) => item.id === proj.targetEntityId);
  if (tower) {
    return new THREE.Vector3(tower.position.x, (tower.position.y ?? 0) + 1.4, tower.position.z);
  }
  const nexus = store.nexuses.find((item) => item.id === proj.targetEntityId);
  if (nexus) {
    return new THREE.Vector3(nexus.position.x, (nexus.position.y ?? 0) + 1.8, nexus.position.z);
  }
  const inhibitor = store.inhibitors.find((item) => item.id === proj.targetEntityId);
  if (inhibitor) {
    return new THREE.Vector3(inhibitor.position.x, (inhibitor.position.y ?? 0) + 1.6, inhibitor.position.z);
  }
  return null;
}

function useProjectileMotion(proj: ProjectilePresentationState) {
  const positionRef = useRef(new THREE.Vector3(proj.position.x, proj.position.y, proj.position.z));
  const velocityRef = useRef(new THREE.Vector3(proj.direction.x, proj.direction.y, proj.direction.z).normalize().multiplyScalar(proj.speed));
  const initializedRef = useRef(false);

  if (!initializedRef.current) {
    positionRef.current.set(proj.position.x, proj.position.y, proj.position.z);
    velocityRef.current.set(proj.direction.x, proj.direction.y, proj.direction.z).normalize().multiplyScalar(proj.speed);
    initializedRef.current = true;
  }

  return { positionRef, velocityRef };
}

const MinionProjectile: React.FC<{ proj: ProjectilePresentationState }> = ({ proj }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRefs = useRef<THREE.Mesh[]>([]);
  const trailHistoryRef = useRef<THREE.Vector3[]>([]);
  const { positionRef, velocityRef } = useProjectileMotion(proj);
  const radius = proj.radius ?? 0.16;
  const geometry = useMemo(() => new THREE.ConeGeometry(radius * 0.7, radius * 2.6, 6, 1), [radius]);
  const trailGeometry = useMemo(() => new THREE.SphereGeometry(radius * 0.3, 6, 6), [radius]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: MINION_PROJECTILE_COLOR,
      emissive: MINION_PROJECTILE_COLOR,
      emissiveIntensity: 1.8,
      roughness: 0.18,
      metalness: 0.2,
    }),
    [],
  );
  const trailMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: MINION_PROJECTILE_COLOR,
      emissive: MINION_PROJECTILE_COLOR,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.3,
    }),
    [],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.geometry = geometry;
      mesh.material = material;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
    trailRefs.current.forEach((trail) => {
      if (!trail) {
        return;
      }
      trail.geometry = trailGeometry;
      trail.material = trailMaterial;
      trail.castShadow = false;
      trail.receiveShadow = false;
      trail.visible = false;
    });
    return () => {
      geometry.dispose();
      trailGeometry.dispose();
      material.dispose();
      trailMaterial.dispose();
    };
  }, [geometry, material, trailGeometry, trailMaterial]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    positionRef.current.addScaledVector(velocityRef.current, delta);
    mesh.position.copy(positionRef.current);
    const forward = velocityRef.current.clone().normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);

    trailHistoryRef.current.unshift(positionRef.current.clone());
    if (trailHistoryRef.current.length > 8) {
      trailHistoryRef.current.pop();
    }
    trailRefs.current.forEach((trail, index) => {
      const pos = trailHistoryRef.current[index + 1];
      if (!pos) {
        trail.visible = false;
        return;
      }
      trail.visible = true;
      trail.position.copy(pos);
      trail.scale.setScalar(1 - index * 0.08);
    });
  });

  return (
    <group>
      <mesh ref={meshRef} />
      {Array.from({ length: 7 }).map((_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            if (node) trailRefs.current[index] = node;
          }}
        />
      ))}
    </group>
  );
};

const TowerProjectile: React.FC<{ proj: ProjectilePresentationState }> = ({ proj }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRefs = useRef<THREE.Mesh[]>([]);
  const trailHistoryRef = useRef<THREE.Vector3[]>([]);
  const { positionRef, velocityRef } = useProjectileMotion(proj);
  const radius = proj.radius ?? 0.25;
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 10, 8), [radius]);
  const trailGeometry = useMemo(() => new THREE.SphereGeometry(radius * 0.65, 8, 8), [radius]);
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
  const trailMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: TOWER_PROJECTILE_COLOR,
        emissive: TOWER_PROJECTILE_COLOR,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.32,
      }),
    [],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.geometry = geometry;
      mesh.material = material;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
    trailRefs.current.forEach((trail) => {
      if (!trail) {
        return;
      }
      trail.geometry = trailGeometry;
      trail.material = trailMaterial;
      trail.castShadow = false;
      trail.receiveShadow = false;
      trail.visible = false;
    });
    return () => {
      geometry.dispose();
      trailGeometry.dispose();
      material.dispose();
      trailMaterial.dispose();
    };
  }, [geometry, material, trailGeometry, trailMaterial]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const targetPosition = resolveTargetPosition(proj);
    if (targetPosition) {
      const desiredVelocity = targetPosition.sub(positionRef.current).normalize().multiplyScalar(proj.speed);
      velocityRef.current.lerp(desiredVelocity, 1 - Math.exp(-4 * delta));
    }
    positionRef.current.addScaledVector(velocityRef.current, delta);
    mesh.position.copy(positionRef.current);
    trailHistoryRef.current.unshift(positionRef.current.clone());
    if (trailHistoryRef.current.length > 10) {
      trailHistoryRef.current.pop();
    }
    trailRefs.current.forEach((trail, index) => {
      const pos = trailHistoryRef.current[index + 1];
      if (!pos) {
        trail.visible = false;
        return;
      }
      trail.visible = true;
      trail.position.copy(pos);
      trail.scale.setScalar(1 - index * 0.07);
    });
  });

  return (
    <group>
      <mesh ref={meshRef} />
      {Array.from({ length: 8 }).map((_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            if (node) trailRefs.current[index] = node;
          }}
        />
      ))}
    </group>
  );
};

const HeroProjectile: React.FC<{ proj: ProjectilePresentationState }> = ({ proj }) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const trailRefs = useRef<THREE.Points[]>([]);
  const trailHistoryRef = useRef<THREE.Vector3[]>([]);
  const startPositionRef = useRef(new THREE.Vector3(proj.position.x, proj.position.y, proj.position.z));
  const positionRef = useRef(new THREE.Vector3(proj.position.x, proj.position.y, proj.position.z));
  const radius = proj.radius ?? 0.22;
  const coreGeometry = useMemo(() => new THREE.SphereGeometry(radius, 14, 12), [radius]);
  const haloGeometry = useMemo(() => new THREE.SphereGeometry(radius * 1.8, 14, 12), [radius]);
  const trailGeometries = useMemo(
    () => Array.from({ length: 8 }, () => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
      return geometry;
    }),
    [],
  );
  const particleMaterial = useMemo(() => new THREE.PointsMaterial({
    color: HERO_PROJECTILE_COLOR,
    size: radius * 0.9,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [radius]);
  const coreMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: HERO_PROJECTILE_COLOR,
    emissive: HERO_PROJECTILE_COLOR,
    emissiveIntensity: 3,
    roughness: 0.08,
    metalness: 0.35,
  }), []);
  const haloMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: HERO_PROJECTILE_COLOR,
    transparent: true,
    opacity: 0.28,
  }), []);

  useEffect(() => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (core) {
      core.geometry = coreGeometry;
      core.material = coreMaterial;
      core.castShadow = false;
      core.receiveShadow = false;
    }
    if (halo) {
      halo.geometry = haloGeometry;
      halo.material = haloMaterial;
      halo.castShadow = false;
      halo.receiveShadow = false;
    }
    trailRefs.current.forEach((points, index) => {
      if (!points) {
        return;
      }
      points.geometry = trailGeometries[index];
      points.material = particleMaterial;
    });
    return () => {
      coreGeometry.dispose();
      haloGeometry.dispose();
      trailGeometries.forEach((geometry) => geometry.dispose());
      coreMaterial.dispose();
      haloMaterial.dispose();
      particleMaterial.dispose();
    };
  }, [coreGeometry, haloGeometry, trailGeometries, coreMaterial, haloMaterial, particleMaterial]);

  useFrame((state) => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo) return;
    const targetPosition = resolveTargetPosition(proj);
    const lifetime = Math.max(1, proj.expiresAt - proj.createdAt - 50);
    const progress = THREE.MathUtils.clamp((Date.now() - proj.createdAt) / lifetime, 0, 1);
    const destination = targetPosition
      ?? new THREE.Vector3(proj.position.x, proj.position.y, proj.position.z).add(
        new THREE.Vector3(proj.direction.x, proj.direction.y, proj.direction.z).multiplyScalar(proj.speed * (lifetime / 1000)),
      );
    positionRef.current.lerpVectors(startPositionRef.current, destination, progress);
    core.position.copy(positionRef.current);
    halo.position.copy(positionRef.current);
    halo.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 18) * 0.08);

    trailHistoryRef.current.unshift(positionRef.current.clone());
    if (trailHistoryRef.current.length > 16) {
      trailHistoryRef.current.pop();
    }
    trailRefs.current.forEach((points, index) => {
      const pos = trailHistoryRef.current[Math.min(index * 2, trailHistoryRef.current.length - 1)];
      if (!points || !pos) return;
      const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!attr) {
        return;
      }
      attr.setXYZ(0, pos.x, pos.y, pos.z);
      attr.needsUpdate = true;
    });
  });

  return (
    <group>
      <mesh ref={coreRef} />
      <mesh ref={haloRef} />
      {Array.from({ length: 8 }).map((_, index) => (
        <points
          key={index}
          ref={(node) => {
            if (node) trailRefs.current[index] = node;
          }}
        />
      ))}
    </group>
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
      {projectiles.map((proj) => {
        if (proj.visualType === 'tower') {
          return <TowerProjectile key={proj.projectileId} proj={proj} />;
        }
        if (proj.visualType === 'hero') {
          return <HeroProjectile key={proj.projectileId} proj={proj} />;
        }
        return <MinionProjectile key={proj.projectileId} proj={proj} />;
      })}
    </group>
  );
};

export default React.memo(ProjectileRenderer);
