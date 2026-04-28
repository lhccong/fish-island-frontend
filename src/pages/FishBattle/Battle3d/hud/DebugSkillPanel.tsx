/**
 * 技能调试面板。
 * 功能：
 *   1. 选择英雄 → 显示该英雄所有技能定义（槽位、名称、目标类型、射程等）
 *   2. 点击技能 → 触发本地施法动画 / VFX 预览（不发送服务端请求）
 *   3. 切换"判定范围可视化"开关 → 在 3D 场景中显示投射物/区域体/技能范围线框
 *   4. 仅在开发模式下可用（import.meta.env.DEV）
 *
 * 快捷键：F9 切换面板显示/隐藏
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getHeroActionConfig } from '../config/heroConfig';
import { useGameStore } from '../store/useGameStore';
import { getHeroConfig, listHeroConfigs } from '../config/heroConfig';
import { getSkillCastDefinition } from '../config/skillDefinitions';
import type { HeroActionSlot, SpellSlot } from '../types/game';

/** 技能槽位列表（用于遍历） */
const SKILL_SLOTS: SpellSlot[] = ['basicAttack', 'q', 'w', 'e', 'r'];

/** 槽位显示名映射 */
const SLOT_LABELS: Record<SpellSlot, string> = {
  passive: 'P',
  basicAttack: 'A',
  q: 'Q',
  w: 'W',
  e: 'E',
  r: 'R',
  summonerD: 'D',
  summonerF: 'F',
  recall: 'B',
};

/** 目标类型颜色标签 */
const TARGET_TYPE_COLORS: Record<string, string> = {
  target_unit: '#ff6b6b',
  directional: '#51cf66',
  target_point: '#339af0',
  self_cast: '#ffd43b',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  target_unit: '单体',
  directional: '方向',
  target_point: '点选',
  self_cast: '自施',
};

function getInitialDebugHeroId(): string {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
    return 'yasuo';
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('debugHero')?.trim() || params.get('singleHero')?.trim() || 'yasuo';
}

function mapSpellSlotToActionSlot(slot: SpellSlot): HeroActionSlot | null {
  switch (slot) {
    case 'basicAttack':
    case 'q':
    case 'w':
    case 'e':
    case 'r':
    case 'recall':
      return slot;
    default:
      return null;
  }
}

const DebugSkillPanel: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [selectedHeroId, setSelectedHeroId] = useState<string>(getInitialDebugHeroId);
  const debugHitboxes = useGameStore((s) => s.debugHitboxes);
  const toggleDebugHitboxes = useGameStore((s) => s.toggleDebugHitboxes);
  const champions = useGameStore((s) => s.champions);
  const playChampionAnimationClip = useGameStore((s) => s.playChampionAnimationClip);
  const clearChampionAnimationClip = useGameStore((s) => s.clearChampionAnimationClip);
  const setChampionAnimationState = useGameStore((s) => s.setChampionAnimationState);

  /** 获取所有英雄 ID 列表 */
  const heroIds = useMemo(() => listHeroConfigs().map((h) => h.heroId), []);

  /** 获取当前选中英雄的技能定义列表 */
  const skillDefs = useMemo(() => {
    return SKILL_SLOTS.map((slot) => ({
      slot,
      def: getSkillCastDefinition(selectedHeroId, slot),
    })).filter((item) => item.def !== null);
  }, [selectedHeroId]);

  /** 快捷键 F9 切换面板 */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  /** 触发本地施法动画预览 */
  const handlePreviewCast = useCallback(
    (slot: SpellSlot) => {
      /* 查找场景中该英雄的实例 */
      const target = champions.find((c) => c.heroId === selectedHeroId);
      if (!target) return;

      const actionSlot = mapSpellSlotToActionSlot(slot);
      if (!actionSlot) {
        return;
      }

      const actionConfig = getHeroActionConfig(target.heroId, actionSlot);
      playChampionAnimationClip(target.id, {
        actionSlot: actionConfig.actionSlot,
        clipName: actionConfig.clipName || (slot === 'basicAttack' || slot === 'q' || slot === 'e' ? 'attack' : 'cast'),
        loop: false,
        playbackRate: actionConfig.playbackRate ?? 1,
        reset: true,
        durationMs: actionConfig.durationMs ?? 800,
        lockMovement: actionConfig.lockMovement ?? true,
        fallbackState: 'idle',
        nonce: Date.now() + Math.random(),
      });

      /* 兜底：若片段不存在或已播放完成，确保能回到 idle。 */
      setTimeout(() => {
        clearChampionAnimationClip(target.id);
        setChampionAnimationState(target.id, 'idle');
      }, actionConfig.durationMs ?? 800);
    },
    [champions, clearChampionAnimationClip, playChampionAnimationClip, selectedHeroId, setChampionAnimationState],
  );

  /* 非开发模式不渲染 */
  if (process.env.NODE_ENV !== 'development') return null;
  if (!visible) return null;

  const heroConfig = getHeroConfig(selectedHeroId);

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 12,
        width: 320,
        maxHeight: 'calc(100% - 80px)',
        overflowY: 'auto',
        background: 'rgba(10, 15, 30, 0.92)',
        border: '1px solid rgba(100, 160, 255, 0.3)',
        borderRadius: 8,
        padding: 12,
        color: '#e0e8f0',
        fontSize: 12,
        fontFamily: 'monospace',
        zIndex: 9999,
        pointerEvents: 'auto',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#8ec8ff' }}>🔧 技能调试面板</span>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      {/* 英雄选择器 */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ color: '#8ec8ff', fontSize: 11, marginBottom: 4, display: 'block' }}>英雄选择</label>
        <select
          value={selectedHeroId}
          onChange={(e) => setSelectedHeroId(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(20, 30, 50, 0.8)',
            border: '1px solid rgba(100, 160, 255, 0.25)',
            borderRadius: 4,
            color: '#e0e8f0',
            padding: '4px 8px',
            fontSize: 12,
          }}
        >
          {heroIds.map((id) => {
            const cfg = getHeroConfig(id);
            return (
              <option key={id} value={id}>
                {cfg?.emoji ?? '❓'} {cfg?.name ?? id} ({id})
              </option>
            );
          })}
        </select>
      </div>

      {/* 判定范围可视化开关 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          padding: '6px 8px',
          background: debugHitboxes ? 'rgba(50, 180, 100, 0.15)' : 'rgba(40, 50, 70, 0.5)',
          borderRadius: 4,
          border: `1px solid ${debugHitboxes ? 'rgba(50, 180, 100, 0.4)' : 'rgba(60, 80, 110, 0.3)'}`,
          cursor: 'pointer',
        }}
        onClick={toggleDebugHitboxes}
      >
        <span style={{ fontSize: 14 }}>{debugHitboxes ? '🟢' : '⚪'}</span>
        <span>判定范围可视化 (Hitbox)</span>
      </div>

      {/* 英雄信息 */}
      {heroConfig && (
        <div style={{ marginBottom: 10, padding: '6px 8px', background: 'rgba(30, 40, 60, 0.5)', borderRadius: 4 }}>
          <span style={{ fontSize: 16, marginRight: 6 }}>{heroConfig.emoji}</span>
          <span style={{ fontWeight: 600 }}>{heroConfig.name}</span>
          <span style={{ color: '#888', marginLeft: 6 }}>
            {heroConfig.role} | 攻距 {heroConfig.attackRange} | 移速 {heroConfig.moveSpeed}
          </span>
        </div>
      )}

      {/* 技能列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {skillDefs.map(({ slot, def }) => {
          if (!def) return null;
          const typeColor = TARGET_TYPE_COLORS[def.targetType] ?? '#aaa';
          const typeLabel = TARGET_TYPE_LABELS[def.targetType] ?? def.targetType;

          return (
            <div
              key={slot}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                background: 'rgba(25, 35, 55, 0.6)',
                borderRadius: 4,
                border: '1px solid rgba(60, 80, 120, 0.25)',
              }}
            >
              {/* 槽位标签 */}
              <span
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(60, 90, 140, 0.4)',
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#a0c4ff',
                  flexShrink: 0,
                }}
              >
                {SLOT_LABELS[slot]}
              </span>

              {/* 技能名称和参数 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{def.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 10, color: '#99aabb' }}>
                  <span
                    style={{
                      background: typeColor,
                      color: '#fff',
                      padding: '1px 5px',
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {typeLabel}
                  </span>
                  <span>射程:{def.range}</span>
                  {def.width != null && <span>宽:{def.width}</span>}
                  {def.radius != null && <span>径:{def.radius}</span>}
                </div>
              </div>

              {/* 预览按钮 */}
              <button
                onClick={() => handlePreviewCast(slot)}
                style={{
                  background: 'rgba(80, 140, 220, 0.3)',
                  border: '1px solid rgba(80, 140, 220, 0.5)',
                  borderRadius: 4,
                  color: '#a0c4ff',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontSize: 11,
                  flexShrink: 0,
                }}
                title="在场景中预览施法动画"
              >
                ▶
              </button>
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div style={{ marginTop: 10, fontSize: 10, color: '#556677', textAlign: 'center' }}>
        按 F9 切换面板 | 需场景中存在对应英雄才可预览 | 单英雄调试可用 ?debugHero=yasuo
      </div>
    </div>
  );
};

export default DebugSkillPanel;
