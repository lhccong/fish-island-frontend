import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/gameConfig';
import { MAP_CONFIG } from '../../config/mapConfig';
import { getRuinsAssetConfig } from '../../config/environmentConfig';
import FacilityAsset from './FacilityAsset';

/** 递归关闭 Object3D 及其所有子对象的 matrixAutoUpdate，减少每帧无用矩阵运算。 */
function freezeMatrixRecursive(obj: THREE.Object3D) {
  obj.matrixAutoUpdate = false;
  obj.updateMatrix();
  for (const child of obj.children) {
    freezeMatrixRecursive(child);
  }
}

/** 嚎哭深渊地图 - 桥面/冰面/深渊/围栏/柱子 */
const BattleMap: React.FC = () => {
  /** 静态场景物体的根 group，挂载后冻结矩阵。 */
  const staticGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (staticGroupRef.current) {
      freezeMatrixRecursive(staticGroupRef.current);
    }
  }, []);

  return (
    <group>
      {/* 静态场景物体（桥面/围栏/柱子等），冻结 matrixAutoUpdate */}
      <group ref={staticGroupRef}>
        <Bridge />
        <BridgeSupports />
        <BridgeEdgeDetails />
        <Railings />
        <Pillars />
        <Ruins />
        <BaseBackdrop />
        <AbyssCliffs />
      </group>
      
      {/* 动态物体（有 useFrame 动画的雾气），保持 matrixAutoUpdate */}
      <AbyssFog />
    </group>
  );
};

/** 桥面主体 */
const Bridge: React.FC = () => {
  const bridgeWidth = MAP_CONFIG.bridgeWidth;
  const bridgeLength = MAP_CONFIG.bridgeLength;
  const bridgeVisual = GAME_CONFIG.environment.bridge;

  return (
    <group>
      {/* 主桥面底座岩石 */}
      <mesh position={[0, -0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[bridgeLength, bridgeVisual.bodyHeight, bridgeWidth + bridgeVisual.bodyExtraWidth]} />
        <meshStandardMaterial color={0x1b2838} roughness={0.95} metalness={0.05} />
      </mesh>

      {/* 表层石板 */}
      <mesh position={[0, bridgeVisual.topSurfaceY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[bridgeLength - 4, bridgeWidth - 0.9]} />
        <meshStandardMaterial color={0x2b3d50} roughness={0.8} metalness={0.15} />
      </mesh>

      {/* 冰雪覆面反光层 */}
      <mesh position={[0, bridgeVisual.iceOverlayY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={2}>
        <planeGeometry args={[bridgeLength - 14, bridgeWidth - 2.2]} />
        <meshStandardMaterial
          color={0xaaccff}
          roughness={0.15}
          metalness={0.85}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[bridgeLength - 10, 0.18, bridgeWidth - 2.8]} />
        <meshStandardMaterial color={0x4b6177} roughness={0.74} metalness={0.08} transparent opacity={0.9} />
      </mesh>

      {/* 桥面边缘线（装饰） */}
      <mesh position={[0, bridgeVisual.edgeLineY, bridgeWidth / 2 - 0.45]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <planeGeometry args={[bridgeLength, 0.4]} />
        <meshStandardMaterial color={0x2b3d50} roughness={0.8} metalness={0.06} transparent opacity={0.08} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <mesh position={[0, bridgeVisual.edgeLineY, -bridgeWidth / 2 + 0.45]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <planeGeometry args={[bridgeLength, 0.4]} />
        <meshStandardMaterial color={0x2b3d50} roughness={0.8} metalness={0.06} transparent opacity={0.08} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>

      {/* 中线标识 */}
      <mesh position={[0, bridgeVisual.centerLineY, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
        <planeGeometry args={[0.36, bridgeWidth - 2.4]} />
        <meshStandardMaterial
          color={0x273543}
          transparent
          opacity={0.04}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      <mesh position={[0, bridgeVisual.centerGlowY, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[18, bridgeWidth - 3.2]} />
        <meshStandardMaterial
          color={0x223243}
          transparent
          opacity={0.015}
          roughness={0.92}
          metalness={0.04}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
    </group>
  );
};

const BridgeSupports: React.FC = () => {
  const bridgeVisual = GAME_CONFIG.environment.bridge;
  const supports = useMemo(() => {
    const items: number[] = [];
    const maxX = MAP_CONFIG.bridgeLength / 2 - bridgeVisual.supportInsetX;
    for (let x = -maxX; x <= maxX; x += bridgeVisual.supportSpacing) {
      items.push(x);
    }
    return items;
  }, [bridgeVisual.supportInsetX, bridgeVisual.supportSpacing]);

  return (
    <group>
      {supports.map((x) => (
        <group key={x} position={[x, -2.2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.5, 3.2, MAP_CONFIG.bridgeWidth + bridgeVisual.supportExtraWidth]} />
            <meshStandardMaterial color={0x14202d} roughness={0.9} metalness={0.1} />
          </mesh>
          <mesh position={[0, -1.9, 0]} castShadow>
            <boxGeometry args={[1.2, 2, MAP_CONFIG.bridgeWidth - 1.2]} />
            <meshStandardMaterial color={0x0d151e} roughness={0.95} metalness={0.05} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const BridgeEdgeDetails: React.FC = () => {
  const bridgeLength = MAP_CONFIG.bridgeLength;
  const bridgeWidth = MAP_CONFIG.bridgeWidth;

  const segments = useMemo(() => {
    const items: Array<{
      x: number;
      side: -1 | 1;
      beamWidth: number;
      beamHeight: number;
      beamDepth: number;
      shelfWidth: number;
      shelfHeight: number;
      icicles: Array<{ offsetX: number; length: number; radius: number }>;
    }> = [];

    let index = 0;
    for (let x = -bridgeLength / 2 + 14; x <= bridgeLength / 2 - 14; x += 16) {
      const beamWidth = 5.2 + (index % 2) * 1.2;
      const beamHeight = 0.82 + (index % 3) * 0.12;
      const beamDepth = 1.5 + ((index + 1) % 2) * 0.28;
      const shelfWidth = beamWidth * 0.72;
      const shelfHeight = 0.42 + (index % 2) * 0.08;
      const icicles = [
        { offsetX: -beamWidth * 0.24, length: 1.9 + (index % 2) * 0.35, radius: 0.18 },
        { offsetX: 0, length: 2.35 + ((index + 1) % 3) * 0.18, radius: 0.22 },
        { offsetX: beamWidth * 0.24, length: 1.7 + ((index + 2) % 2) * 0.3, radius: 0.16 },
      ];

      items.push({ x, side: -1, beamWidth, beamHeight, beamDepth, shelfWidth, shelfHeight, icicles });
      items.push({ x: x + (index % 2 === 0 ? 1.2 : -1), side: 1, beamWidth, beamHeight, beamDepth, shelfWidth, shelfHeight, icicles });
      index += 1;
    }

    return items;
  }, [bridgeLength]);

  return (
    <group>
      {segments.map((segment, index) => (
        <group key={`${segment.side}-${index}`}>
          <mesh
            position={[
              segment.x,
              -0.52,
              segment.side * (bridgeWidth / 2 + segment.beamDepth * 0.52 + 0.18),
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[segment.beamWidth, segment.beamHeight, segment.beamDepth]} />
            <meshStandardMaterial color={0x1a2733} roughness={0.94} metalness={0.04} />
          </mesh>
          <mesh
            position={[
              segment.x,
              -0.98,
              segment.side * (bridgeWidth / 2 + segment.beamDepth * 0.22),
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[segment.shelfWidth, segment.shelfHeight, 0.72]} />
            <meshStandardMaterial color={0x111a24} roughness={0.98} metalness={0.02} />
          </mesh>
          <mesh
            position={[segment.x, 0.05, segment.side * (bridgeWidth / 2 - 0.52)]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={2}
          >
            <planeGeometry args={[segment.beamWidth * 0.88, 0.82]} />
            <meshStandardMaterial
              color={0xf3f8ff}
              roughness={0.98}
              metalness={0.02}
              transparent
              opacity={0.92}
              depthWrite={false}
            />
          </mesh>
          {segment.icicles.map((icicle, icicleIndex) => (
            <mesh
              key={icicleIndex}
              position={[
                segment.x + icicle.offsetX,
                -1.46 - icicle.length * 0.28,
                segment.side * (bridgeWidth / 2 + segment.beamDepth - 0.08),
              ]}
              rotation={[Math.PI, 0, 0]}
              castShadow
            >
              <coneGeometry args={[icicle.radius, icicle.length, 5]} />
              <meshStandardMaterial
                color={0xb8ddff}
                emissive={0x2c5f87}
                emissiveIntensity={0.08}
                transparent
                opacity={0.74}
                roughness={0.22}
                metalness={0.24}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/** 护栏 — 厚实石质矮墙 + 冰霜柱头 + 悬挂冰锥 */
const Railings: React.FC = () => {
  const bridgeVisual = GAME_CONFIG.environment.bridge;
  const bridgeWidth = MAP_CONFIG.bridgeWidth;
  const bridgeLength = MAP_CONFIG.bridgeLength;
  const edgeZ = bridgeWidth / 2 + bridgeVisual.railingOffset;
  const wallLength = bridgeLength - bridgeVisual.railingBeamInsetX * 2;

  const posts = useMemo(() => {
    const arr: Array<{ x: number; side: 1 | -1 }> = [];
    const maxX = bridgeLength / 2 - bridgeVisual.railingPostInsetX;
    for (let x = -maxX; x <= maxX; x += bridgeVisual.railingPostSpacing) {
      arr.push({ x, side: 1 });
      arr.push({ x, side: -1 });
    }
    return arr;
  }, [bridgeLength, bridgeVisual.railingPostInsetX, bridgeVisual.railingPostSpacing]);

  return (
    <group>
      {/* ——— 两侧连续石质矮墙 ——— */}
      {([1, -1] as const).map((side) => (
        <group key={side}>
          {/* 主墙体 */}
          <mesh position={[0, 0.42, side * edgeZ]} castShadow receiveShadow>
            <boxGeometry args={[wallLength, 1.0, 0.55]} />
            <meshStandardMaterial color={0x1e3044} roughness={0.92} metalness={0.08} />
          </mesh>
          {/* 墙顶石压条 */}
          <mesh position={[0, 0.96, side * edgeZ]} castShadow>
            <boxGeometry args={[wallLength, 0.12, 0.72]} />
            <meshStandardMaterial color={0x2a4258} roughness={0.85} metalness={0.12} />
          </mesh>
          {/* 墙底脚线 */}
          <mesh position={[0, -0.12, side * edgeZ]}>
            <boxGeometry args={[wallLength, 0.1, 0.68]} />
            <meshStandardMaterial color={0x14222f} roughness={0.96} metalness={0.04} />
          </mesh>
          {/* 墙面浮雕槽线（上段） */}
          <mesh position={[0, 0.68, side * (edgeZ + side * 0.29)]} renderOrder={2}>
            <boxGeometry args={[wallLength - 1, 0.06, 0.02]} />
            <meshStandardMaterial color={0x3b5e78} roughness={0.7} metalness={0.2} />
          </mesh>
          {/* 墙面浮雕槽线（下段） */}
          <mesh position={[0, 0.22, side * (edgeZ + side * 0.29)]} renderOrder={2}>
            <boxGeometry args={[wallLength - 1, 0.06, 0.02]} />
            <meshStandardMaterial color={0x3b5e78} roughness={0.7} metalness={0.2} />
          </mesh>
          {/* 冰霜顶部装饰带 */}
          <mesh position={[0, 1.04, side * edgeZ]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <planeGeometry args={[wallLength, 0.72]} />
            <meshStandardMaterial
              color={0xd8eeff}
              roughness={0.98}
              metalness={0.02}
              transparent
              opacity={0.55}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* ——— 石质方柱 + 冰晶柱头 + 悬挂冰锥 ——— */}
      {posts.map((post, i) => (
        <group key={i} position={[post.x, 0, post.side * edgeZ]}>
          {/* 方柱主体 */}
          <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.52, 1.45, 0.62]} />
            <meshStandardMaterial color={0x263e52} roughness={0.88} metalness={0.12} />
          </mesh>
          {/* 柱顶石帽 */}
          <mesh position={[0, 1.42, 0]} castShadow>
            <boxGeometry args={[0.68, 0.16, 0.78]} />
            <meshStandardMaterial color={0x304d64} roughness={0.82} metalness={0.15} />
          </mesh>
          {/* 冰晶柱头装饰 */}
          <mesh position={[0, 1.72, 0]}>
            <octahedronGeometry args={[0.22]} />
            <meshStandardMaterial
              color={0x8ec8f0}
              emissive={0x3a7db8}
              emissiveIntensity={0.3}
              transparent
              opacity={0.78}
              roughness={0.18}
              metalness={0.35}
              flatShading
            />
          </mesh>
          {/* 柱底座扩宽 */}
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.64, 0.14, 0.74]} />
            <meshStandardMaterial color={0x182a3a} roughness={0.95} metalness={0.05} />
          </mesh>
          {/* 外侧悬挂冰锥 */}
          {[-0.14, 0.14].map((offsetX, ci) => (
            <mesh
              key={ci}
              position={[offsetX, -0.45, post.side * 0.32]}
              rotation={[Math.PI, 0, 0]}
            >
              <coneGeometry args={[0.06, 0.55 + ci * 0.18, 4]} />
              <meshStandardMaterial
                color={0xb2daff}
                emissive={0x2c5f87}
                emissiveIntensity={0.06}
                transparent
                opacity={0.68}
                roughness={0.2}
                metalness={0.22}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/** 装饰柱子（桥两端冰晶柱） */
const Pillars: React.FC = () => {
  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    const pillarX = MAP_CONFIG.bridgeLength / 2 - GAME_CONFIG.environment.bridge.pillarInsetX;
    [-pillarX, pillarX].forEach((x) => {
      [-(MAP_CONFIG.bridgeWidth / 2), MAP_CONFIG.bridgeWidth / 2].forEach((z) => {
        arr.push([x, 2, z]);
      });
    });
    return arr;
  }, []);

  return (
    <>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          {/* 底座 */}
          <mesh position={[0, -1.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.5, 2, 1.2, 6]} />
            <meshStandardMaterial color={0x1f3042} roughness={0.9} metalness={0.1} flatShading />
          </mesh>
          {/* 主冰晶柱 */}
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.8, 5, 6]} />
            <meshStandardMaterial color={0x3a6a9a} roughness={0.3} metalness={0.6} flatShading transparent opacity={0.9} />
          </mesh>
          {/* 悬浮冰晶顶冠 */}
          <mesh position={[0, 3.2, 0]}>
            <octahedronGeometry args={[0.8]} />
            <meshStandardMaterial
              color={0xaaccff}
              emissive={0x4488ff}
              emissiveIntensity={0.8}
              transparent
              opacity={0.8}
              toneMapped={false}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </>
  );
};

const Ruins: React.FC = () => {
  return (
    <group>
      {/* 中心悬浮冰晶（支持可配置模型） */}
      <FacilityAsset
        modelPath={getRuinsAssetConfig().asset.modelPath}
        targetHeight={getRuinsAssetConfig().asset.targetHeight}
        rotationY={getRuinsAssetConfig().asset.rotationY}
        animationClipName={getRuinsAssetConfig().asset.animations?.idleClip}
        suppressGroundOverlay
        fallback={
          <mesh position={[0, 1.5, 0]} castShadow>
            <octahedronGeometry args={[1.2]} />
            <meshStandardMaterial color={0xa6dfff} emissive={0x2b6e9f} emissiveIntensity={1.5} transparent opacity={0.9} toneMapped={false} flatShading />
          </mesh>
        }
      />
    </group>
  );
};

/** 两侧向下延伸的深渊峭壁 */
const AbyssCliffs: React.FC = () => {
  const bridgeLength = MAP_CONFIG.bridgeLength;
  const bridgeWidth = MAP_CONFIG.bridgeWidth;
  
  const cliffs = useMemo(() => {
    const arr = [];
    const cliffStep = 40;
    for (let x = -bridgeLength / 2; x <= bridgeLength / 2; x += cliffStep) {
      // 左侧悬崖
      arr.push({
        x: x + (Math.random() - 0.5) * 10,
        y: -30 - Math.random() * 20,
        z: bridgeWidth / 2 + 20 + Math.random() * 10,
        scale: 20 + Math.random() * 20,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
      });
      // 右侧悬崖
      arr.push({
        x: x + (Math.random() - 0.5) * 10,
        y: -30 - Math.random() * 20,
        z: -bridgeWidth / 2 - 20 - Math.random() * 10,
        scale: 20 + Math.random() * 20,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
      });
    }
    return arr;
  }, [bridgeLength, bridgeWidth]);

  return (
    <group>
      {cliffs.map((cliff, i) => (
        <mesh
          key={i}
          position={[cliff.x, cliff.y, cliff.z]}
          rotation={cliff.rotation}
          scale={cliff.scale}
          receiveShadow
        >
          {/* 使用低多边形冰岩感 */}
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={0x122238} roughness={0.9} metalness={0.1} flatShading />
        </mesh>
      ))}
    </group>
  );
};

/** 模拟深渊底部的体积寒气 */
const AbyssFog: React.FC = () => {
  const fogRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (fogRef.current) {
      fogRef.current.position.y = -50 + Math.sin(clock.getElapsedTime() * 0.3) * 3;
    }
  });

  return (
    <group ref={fogRef}>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[0, i * 8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[400, 200]} />
          <meshBasicMaterial
            color={0x2a5a85}
            transparent
            opacity={0.15 - i * 0.03}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

/** 复活点基地背景 — 冰墙城堡 + 拱门 + 守卫火盆 + 商人营帐 */
const BaseBackdrop: React.FC = () => {
  const bridgeLength = MAP_CONFIG.bridgeLength;
  const bridgeWidth = MAP_CONFIG.bridgeWidth;

  const camps = useMemo(() => {
    return ([-1, 1] as const).map((side) => ({
      side,
      wallX: side * (bridgeLength / 2 + 14),
      gateX: side * (bridgeLength / 2 + 9),
      campX: side * (bridgeLength / 2 - 3),
      wallColor: side === -1 ? 0x1a2c40 : 0x2a2030,
      wallAccent: side === -1 ? 0x243a52 : 0x352a3e,
      crystalColor: side === -1 ? 0x76b7ff : 0xff8f94,
      crystalEmissive: side === -1 ? 0x3388dd : 0xdd4455,
    }));
  }, [bridgeLength]);

  return (
    <group>
      {camps.map((camp) => (
        <group key={camp.side}>

          {/* ——— 后方连续冰墙（5 段错落高度） ——— */}
          {[-24, -12, 0, 12, 24].map((z, idx) => {
            const h = idx === 2 ? 20 : idx % 2 === 0 ? 15 : 12;
            return (
              <group key={z}>
                <mesh position={[camp.wallX, h / 2 - 0.8, z]} castShadow receiveShadow>
                  <boxGeometry args={[5, h, 10.5]} />
                  <meshStandardMaterial color={camp.wallColor} roughness={0.93} metalness={0.07} />
                </mesh>
                {/* 墙面浮雕带 */}
                <mesh position={[camp.wallX - camp.side * 2.52, h * 0.6, z]} renderOrder={2}>
                  <boxGeometry args={[0.06, h * 0.35, 8.5]} />
                  <meshStandardMaterial color={camp.wallAccent} roughness={0.8} metalness={0.18} />
                </mesh>
                {/* 墙顶垛口 */}
                {[-3.5, 0, 3.5].map((dz) => (
                  <mesh key={dz} position={[camp.wallX, h - 0.8, z + dz]} castShadow>
                    <boxGeometry args={[5.4, 1.6, 2.2]} />
                    <meshStandardMaterial color={camp.wallAccent} roughness={0.9} metalness={0.1} />
                  </mesh>
                ))}
              </group>
            );
          })}

          {/* ——— 拱门结构 ——— */}
          {/* 左右门柱 */}
          {([-1, 1] as const).map((pillarSide) => (
            <group key={pillarSide}>
              <mesh
                position={[camp.gateX, 6.2, pillarSide * (bridgeWidth / 2 + 1.8)]}
                castShadow receiveShadow
              >
                <boxGeometry args={[3.6, 13.2, 4.2]} />
                <meshStandardMaterial color={camp.wallAccent} roughness={0.88} metalness={0.12} />
              </mesh>
              {/* 门柱顶部扩帽 */}
              <mesh position={[camp.gateX, 13.2, pillarSide * (bridgeWidth / 2 + 1.8)]} castShadow>
                <boxGeometry args={[4.2, 0.8, 4.8]} />
                <meshStandardMaterial color={camp.wallAccent} roughness={0.84} metalness={0.16} />
              </mesh>
              {/* 门柱火盆底座 */}
              <mesh position={[camp.gateX - camp.side * 1.2, 13.8, pillarSide * (bridgeWidth / 2 + 1.8)]}>
                <cylinderGeometry args={[0.5, 0.7, 0.6, 6]} />
                <meshStandardMaterial color={0x2a1f18} roughness={0.92} metalness={0.08} />
              </mesh>
            </group>
          ))}
          {/* 拱门横梁 */}
          <mesh position={[camp.gateX, 12.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.6, 2.8, bridgeWidth + 7.8]} />
            <meshStandardMaterial color={camp.wallColor} roughness={0.9} metalness={0.1} />
          </mesh>
          {/* 拱门弧顶装饰（简化半圆用扁平 box 模拟） */}
          <mesh position={[camp.gateX, 14.6, 0]} castShadow>
            <boxGeometry args={[2.8, 1.2, bridgeWidth + 4]} />
            <meshStandardMaterial color={camp.wallAccent} roughness={0.86} metalness={0.14} />
          </mesh>
          {/* 拱门中央悬挂队伍水晶 */}
          <mesh position={[camp.gateX - camp.side * 0.6, 11, 0]} scale={[0.9, 1.6, 0.9]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={camp.crystalColor}
              emissive={camp.crystalEmissive}
              emissiveIntensity={0.6}
              transparent
              opacity={0.85}
              toneMapped={false}
              flatShading
            />
          </mesh>

          {/* ——— 入口两侧冰霜柱 ——— */}
          {([-1, 1] as const).map((frostSide) => (
            <group key={`frost-${frostSide}`} position={[camp.gateX - camp.side * 3, 0, frostSide * (bridgeWidth / 2 - 0.5)]}>
              <mesh position={[0, 2.8, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.6, 5.6, 6]} />
                <meshStandardMaterial color={0x3a6a9a} roughness={0.3} metalness={0.55} flatShading transparent opacity={0.88} />
              </mesh>
              <mesh position={[0, 6, 0]}>
                <octahedronGeometry args={[0.45]} />
                <meshStandardMaterial
                  color={0xa4d4ff}
                  emissive={0x4488cc}
                  emissiveIntensity={0.5}
                  transparent
                  opacity={0.8}
                  toneMapped={false}
                  flatShading
                />
              </mesh>
            </group>
          ))}

          {/* ——— 商人营帐（两侧各一个） ——— */}
          {([-1, 1] as const).map((tentSide) => (
            <group
              key={`tent-${tentSide}`}
              position={[camp.campX, 0, tentSide * (bridgeWidth / 2 + 5.5)]}
              rotation={[0, camp.side * (tentSide === 1 ? -0.3 : 0.3), 0]}
            >
              {/* 木台基座 */}
              <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
                <boxGeometry args={[5.4, 1.3, 4.8]} />
                <meshStandardMaterial color={0x3c2f27} roughness={1} metalness={0} />
              </mesh>
              {/* 帐篷布顶 */}
              <mesh position={[0, 2.9, 0]} castShadow>
                <coneGeometry args={[4.2, 3.8, 4]} />
                <meshStandardMaterial color={0x6b5244} roughness={0.94} metalness={0.04} />
              </mesh>
              {/* 帐篷内部顶布（双色层） */}
              <mesh position={[0, 2.7, 0]}>
                <coneGeometry args={[3.6, 3.0, 4]} />
                <meshStandardMaterial color={0x8a7262} roughness={0.96} metalness={0.02} />
              </mesh>
              {/* 柜台 */}
              <mesh position={[camp.side * 1.6, 1.55, 0]} castShadow>
                <boxGeometry args={[1.6, 0.5, 3.8]} />
                <meshStandardMaterial color={0x4a3c30} roughness={0.92} metalness={0.06} />
              </mesh>
              {/* 小型物品（桶/箱子） */}
              <mesh position={[-camp.side * 1.2, 1.45, 1.2]}>
                <cylinderGeometry args={[0.38, 0.42, 0.55, 8]} />
                <meshStandardMaterial color={0x3a2d26} roughness={0.9} metalness={0.05} />
              </mesh>
              <mesh position={[-camp.side * 1.2, 1.45, -1.1]}>
                <boxGeometry args={[0.65, 0.52, 0.65]} />
                <meshStandardMaterial color={0x42352b} roughness={0.92} metalness={0.04} />
              </mesh>
              {/* 地面积雪圈 */}
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[5.2, 16]} />
                <meshStandardMaterial color={0xe4eef8} roughness={1} metalness={0} transparent opacity={0.38} depthWrite={false} />
              </mesh>
            </group>
          ))}

          {/* ——— 背景墙根冰霜堆 ——— */}
          {[-18, -6, 6, 18].map((z) => (
            <mesh key={z} position={[camp.wallX - camp.side * 2.2, 0.6, z]} castShadow>
              <dodecahedronGeometry args={[1.8, 0]} />
              <meshStandardMaterial color={0xd8eaff} roughness={0.98} metalness={0.02} flatShading transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

export default BattleMap;
