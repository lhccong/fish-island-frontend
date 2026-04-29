import React, { useMemo, useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FloatingCombatTextState } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';

function getTextColor(text: FloatingCombatTextState): string {
  if (text.kind === 'heal') return '#22ff77';
  if (text.kind === 'shield') return '#60d5ff';
  switch (text.targetType) {
    case 'structure':
      return '#ffcc44';
    case 'minion':
      return '#ffffff';
    default:
      return '#ff4444';
  }
}

function formatCombatText(text: FloatingCombatTextState): string {
  const prefix = text.kind === 'heal' ? '+' : text.kind === 'shield' ? '+' : '-';
  return `${prefix}${Math.round(text.amount)}`;
}

function getBaseYOffset(targetType?: FloatingCombatTextState['targetType']): number {
  switch (targetType) {
    case 'minion':
      return 2.0;
    case 'structure':
      return 5.2;
    default:
      return 3.0;
  }
}

function getFloatDistance(targetType?: FloatingCombatTextState['targetType']): number {
  switch (targetType) {
    case 'minion':
      return 0.7;
    case 'structure':
      return 1.0;
    default:
      return 1.0;
  }
}

function getFontSize(text: FloatingCombatTextState): number {
  switch (text.targetType) {
    case 'minion':
      return text.kind === 'damage' ? 0.5 : 0.48;
    case 'structure':
      return text.kind === 'damage' ? 0.9 : 0.85;
    default:
      return text.kind === 'damage' ? 0.72 : 0.68;
  }
}

function getOutlineColor(text: FloatingCombatTextState): string {
  if (text.kind === 'heal') return '#0a3320';
  if (text.kind === 'shield') return '#0a2a3a';
  if (text.targetType === 'structure') return '#3a2800';
  return '#1a0000';
}

function getOutlineWidth(text: FloatingCombatTextState): number {
  switch (text.targetType) {
    case 'minion':
      return 0.06;
    case 'structure':
      return 0.04;
    default:
      return 0.055;
  }
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
    group.position.y += getBaseYOffset(text.targetType) + progress * getFloatDistance(text.targetType);

    const material = Array.isArray(label.material) ? label.material[0] : label.material;
    if (material) {
      material.transparent = true;
      material.alphaTest = 0.01;
      material.depthTest = false;
      material.depthWrite = false;
      material.polygonOffset = true;
      material.polygonOffsetFactor = -8;
      material.polygonOffsetUnits = -8;
      material.toneMapped = false;
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
          fontSize={getFontSize(text)}
          color={getTextColor(text)}
          anchorX="center"
          anchorY="middle"
          outlineWidth={getOutlineWidth(text)}
          outlineColor={getOutlineColor(text)}
          renderOrder={999}
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
