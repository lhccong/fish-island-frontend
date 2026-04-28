import React, { useMemo, useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FloatingCombatTextState } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';

function getTextColor(kind: FloatingCombatTextState['kind']): string {
  switch (kind) {
    case 'heal':
      return '#4ade80';
    case 'shield':
      return '#7dd3fc';
    default:
      return '#ef4444';
  }
}

function formatCombatText(text: FloatingCombatTextState): string {
  const prefix = text.kind === 'heal' ? '+' : text.kind === 'shield' ? '盾+' : '-';
  return `${prefix}${Math.round(text.amount)}`;
}

const FloatingCombatTextItem: React.FC<{ text: FloatingCombatTextState }> = ({ text }) => {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<any>(null);
  /** 基础位置 + 随机水平偏移（防止多条文本完全重叠）。 */
  const basePosition = useMemo(
    () => new THREE.Vector3(
      text.position.x + (Math.random() - 0.5) * 0.6,
      text.position.y,
      text.position.z + (Math.random() - 0.5) * 0.3,
    ),
    [text.position.x, text.position.y, text.position.z],
  );

  useFrame(() => {
    const group = groupRef.current;
    const label = textRef.current;
    if (!group || !label) {
      return;
    }

    const totalLifetime = Math.max(1, text.expiresAt - text.createdAt);
    const progress = THREE.MathUtils.clamp((Date.now() - text.createdAt) / totalLifetime, 0, 1);
    group.position.copy(basePosition);
    /* 头顶偏移：基础 2.2（约英雄模型头顶），向上飘动 1.2 */
    group.position.y += 2.2 + progress * 1.2;

    const material = Array.isArray(label.material) ? label.material[0] : label.material;
    if (material) {
      material.transparent = true;
      /* 非线性透明度：前 60% 几乎不透明，后 40% 快速消散 */
      const fadeStart = 0.6;
      material.opacity = progress < fadeStart ? 1 : 1 - ((progress - fadeStart) / (1 - fadeStart));
    }

    /* 弹出式缩放：刚出现时略大，迅速收敛到正常大小 */
    const popScale = 1 + Math.max(0, 0.35 * (1 - progress * 4));
    group.scale.set(popScale, popScale, popScale);
  });

  return (
    <group ref={groupRef}>
      {/* Billboard 确保文本始终面向相机，任何视角都可读 */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          ref={textRef}
          fontSize={text.kind === 'damage' ? 0.88 : 0.85}
          color={getTextColor(text.kind)}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#0f172a"
          renderOrder={20}
          fontWeight="bold"
        >
          {formatCombatText(text)}
        </Text>
      </Billboard>
    </group>
  );
};

const FloatingCombatTextSystem: React.FC = () => {
  const floatingCombatTexts = useGameStore((s) => s.floatingCombatTexts);

  if (floatingCombatTexts.length === 0) {
    return null;
  }

  return (
    <group name="floating-combat-text-system">
      {floatingCombatTexts.map((text) => (
        <FloatingCombatTextItem key={text.id} text={text} />
      ))}
    </group>
  );
};

export default React.memo(FloatingCombatTextSystem);
