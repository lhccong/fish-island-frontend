import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHeroActionConfig } from '../config/heroConfig';
import { useGameStore } from '../store/useGameStore';
import { emitCastSpell, emitBasicAttack, getSocketClient } from '../network/socketClient';
import { getLocalPredictor } from '../network/NetworkSyncRegistry';
import { getSkillCastDefinition, requiresAiming, isTargetAllowedByRules, type TargetableEntity } from '../config/skillDefinitions';
import type { HeroActionSlot, SkillRuntimeState, SpellAimState, SpellSlot } from '../types/game';

/** 技能槽位 → 快捷键映射（仅普攻 + 召唤师技能） */
const SLOT_KEY_MAP: Record<string, string> = {
  basicAttack: 'A',
  summonerD: 'D',
  summonerF: 'F',
};

/** 技能槽位 → 显示颜色 */
const SLOT_COLOR_MAP: Record<string, string> = {
  basicAttack: '#aaaacc',
  summonerD: '#ffd54f',
  summonerF: '#4dd0e1',
};

/** 显示在底部栏中的槽位顺序（仅召唤师技能） */
const DISPLAY_SLOTS: SpellSlot[] = ['summonerD', 'summonerF'];

/** 可由键盘触发施法的槽位集合 */
const CASTABLE_SLOTS = new Set<string>(['summonerD', 'summonerF']);

const LOCAL_PREDICTION_BLOCK_TIMEOUT_MS = 5000;
const SLOT_CAST_GUARD_TIMEOUT_MS = 300;

/** 键盘按键 → 技能槽位反向映射 */
const KEY_TO_SLOT: Record<string, SpellSlot> = {
  d: 'summonerD',
  f: 'summonerF',
};

/**
 * 生成唯一的施法请求 ID。
 */
let castSeq = 0;
function nextRequestId(): string {
  return `cast_${Date.now()}_${++castSeq}`;
}

function mapSpellSlotToActionSlot(slot: SpellSlot): HeroActionSlot | null {
  if (slot === 'basicAttack') return 'basicAttack';
  return null;
}

function formatCooldownLabel(cooldown: number): string {
  const safeCooldown = Math.max(0, cooldown);
  if (safeCooldown >= 60) {
    return `${Math.ceil(safeCooldown / 60)}m`;
  }
  if (safeCooldown >= 10) {
    return `${Math.ceil(safeCooldown)}`;
  }
  if (safeCooldown >= 1) {
    return safeCooldown.toFixed(1).replace(/\.0$/, '');
  }
  return safeCooldown > 0 ? safeCooldown.toFixed(1) : '0';
}

interface LocalCastPayload {
  roomId: string | null;
  requestId: string;
  casterId: string;
  slot: SpellSlot;
  skillId?: string;
  targetEntityId?: string;
  targetPoint?: { x: number; y: number; z: number };
  targetDirection?: { x: number; y: number; z: number };
  clientMoveSequence?: number;
  clientTimestamp: number;
}

const SkillBar: React.FC = () => {
  const champions = useGameStore((s) => s.champions);
  const multiplayerSession = useGameStore((s) => s.multiplayerSession);
  const spellAimState = useGameStore((s) => s.spellAimState);
  const heroSkillsMeta = useGameStore((s) => s.heroSkillsMeta);
  const summonerSpellsMeta = useGameStore((s) => s.summonerSpellsMeta);
  const championSummonerSpells = useGameStore((s) => s.championSummonerSpells);
  const championAvatarUrls = useGameStore((s) => s.championAvatarUrls);
  const smartCastEnabled = useGameStore((s) => s.smartCastEnabled);
  const me = useMemo(() => champions.find((c) => c.isMe) ?? null, [champions]);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  /** 每个 slot 上次施法的时间戳（独立于 localSpellPredictions，不会被 finished/interrupted 清除）。 */
  const lastCastTimestampBySlotRef = useRef<Partial<Record<SpellSlot, number>>>({});

  const resolveRuntimeSkillId = useCallback((slot: SpellSlot) => {
    if (!me) {
      return null;
    }
    const skillState = me.skillStates?.[slot];
    if (skillState?.skillId) {
      return skillState.skillId;
    }
    const selectedSummonerSpells = championSummonerSpells[me.id];
    if (slot === 'summonerD') {
      return selectedSummonerSpells?.spell1 ?? null;
    }
    if (slot === 'summonerF') {
      return selectedSummonerSpells?.spell2 ?? null;
    }
    return null;
  }, [championSummonerSpells, me]);

  const hasBlockingLocalPrediction = useCallback((slot: SpellSlot) => {
    if (!me) {
      return false;
    }
    const now = Date.now();
    /* 安全阀1：localSpellPredictions 尚存未清理的记录 */
    const hasPendingPrediction = Object.values(useGameStore.getState().localSpellPredictions)
      .some((prediction) => prediction.casterId === me.id
        && prediction.slot === slot
        && now - prediction.createdAt <= LOCAL_PREDICTION_BLOCK_TIMEOUT_MS);
    if (hasPendingPrediction) return true;
    /* 安全阀2：独立的 slot 施法时间戳（不受 finished/interrupted 清理影响），
     * 防止 prediction 被清除后、快照到达前的竞态窗口中重复施法。 */
    const lastCastTs = lastCastTimestampBySlotRef.current[slot];
    if (lastCastTs && now - lastCastTs <= SLOT_CAST_GUARD_TIMEOUT_MS) return true;
    return false;
  }, [me]);

  /** 英雄头像 URL */
  const heroAvatarUrl = useMemo(() => {
    if (!me?.id) return '';
    return championAvatarUrls[me.id] ?? '';
  }, [me, championAvatarUrls]);

  /** 当前受控英雄的技能状态列表（按显示顺序），合并后端元数据 */
  const displaySkills = useMemo(() => {
    if (!me?.skillStates) return [];
    const mySkillsMeta = me.id ? heroSkillsMeta[me.id] : undefined;
    const mySummonerSpells = me.id ? championSummonerSpells[me.id] : undefined;
    return DISPLAY_SLOTS.map((slot) => {
      const state: SkillRuntimeState | undefined = me.skillStates[slot];
      const meta = mySkillsMeta?.[slot];
      let summonerMeta: { name: string; icon: string; description: string } | undefined;
      if (slot === 'summonerD' && mySummonerSpells?.spell1) {
        const sp = summonerSpellsMeta[mySummonerSpells.spell1];
        if (sp) summonerMeta = sp;
      }
      if (slot === 'summonerF' && mySummonerSpells?.spell2) {
        const sp = summonerSpellsMeta[mySummonerSpells.spell2];
        if (sp) summonerMeta = sp;
      }
      const effectiveMeta = summonerMeta ?? meta;
      return {
        slot,
        key: SLOT_KEY_MAP[slot] ?? slot.toUpperCase(),
        label: effectiveMeta?.name ?? state?.name ?? (SLOT_KEY_MAP[slot] ?? slot),
        icon: effectiveMeta?.icon || '',
        description: effectiveMeta?.description ?? '',
        cooldown: state ? state.remainingCooldownMs / 1000 : 0,
        maxCooldown: state ? state.maxCooldownMs / 1000 : 0,
        isReady: state?.isReady ?? true,
        color: SLOT_COLOR_MAP[slot] ?? '#888',
      };
    });
  }, [me, heroSkillsMeta, summonerSpellsMeta, championSummonerSpells]);

  /**
   * 执行施法请求（发送到服务端 + 记录最小化本地预测信息）。
   * 此函数在瞄准确认后或自动施法时调用。
   */
  const executeCast = useCallback(
    (slot: SpellSlot, aimState?: SpellAimState | null) => {
      if (!me) return false;
      if (!getSocketClient().connected) return false;
      if (hasBlockingLocalPrediction(slot)) return false;

      /* 使用最新 store 状态检查冷却，避免闭包中 me.skillStates 过时导致冷却期间重复释放 */
      const freshChampion = useGameStore.getState().champions.find((c) => c.id === me.id);
      const skillState = freshChampion?.skillStates?.[slot];
      /* skillState 为 undefined（slot 未初始化）或 isReady 非 true 时均阻塞 */
      if (!skillState?.isReady) return false;
      const runtimeSkillId = resolveRuntimeSkillId(slot);
      const activeAim = aimState ?? useGameStore.getState().spellAimState;
      const actionSlot = mapSpellSlotToActionSlot(slot);
      const actionConfig = actionSlot ? getHeroActionConfig(me.heroId, actionSlot) : null;
      const shouldLockMovement = actionConfig?.lockMovement ?? slot === 'basicAttack';
      let castStopSeq: number | undefined;
      const payload: LocalCastPayload = {
        roomId: multiplayerSession.roomId,
        requestId: nextRequestId(),
        casterId: me.id,
        slot,
        skillId: runtimeSkillId ?? skillState?.skillId ?? slot,
        clientTimestamp: Date.now(),
      };

      /* ===== 根据正式瞄准状态组装目标参数 ===== */
      if (activeAim && activeAim.slot === slot) {
        if (activeAim.targetType === 'target_unit') {
          if (!activeAim.targetEntityId) {
            return false;
          }
          payload.targetEntityId = activeAim.targetEntityId;
        }

        if (activeAim.targetType === 'target_point') {
          if (!activeAim.targetPoint) {
            return false;
          }
          payload.targetPoint = activeAim.targetPoint;
        }

        if (activeAim.targetType === 'directional') {
          if (!activeAim.targetPoint || !activeAim.targetDirection) {
            return false;
          }
          payload.targetPoint = activeAim.targetPoint;
          payload.targetDirection = activeAim.targetDirection;
        }
      }

      if (shouldLockMovement) {
        const predictor = getLocalPredictor();
        castStopSeq = predictor ? predictor.seq + 1 : undefined;
        /* 携带客户端视觉位置，让后端在施法 stop 时采纳，消除网络延迟导致的位差 */
        const currentState = predictor?.getCurrentState();
        if (currentState) {
          payload.clientPosition = { x: currentState.position.x, z: currentState.position.z };
        }
      }

      if (castStopSeq !== null && castStopSeq !== undefined) {
        payload.clientMoveSequence = castStopSeq;
      }

      const sendSucceeded = slot === 'basicAttack'
        ? emitBasicAttack(payload)
        : emitCastSpell(payload);

      if (!sendSucceeded) {
        return false;
      }

      const requestId = payload.requestId;
      const castSkillId = payload.skillId ?? slot;

      /* ===== 登记本地施法预测记录，供后续服务端事件对账 ===== */
      const restoredAimSnapshot = activeAim
        ? {
            ...activeAim,
            /* target_unit 释放后目标已消耗，恢复瞄准时不保留旧目标 */
            targetEntityId: activeAim.targetType === 'target_unit' ? null : (activeAim.targetEntityId ?? null),
          }
        : null;
      useGameStore.getState().registerLocalSpellPrediction({
        requestId,
        casterId: me.id,
        slot,
        skillId: castSkillId,
        createdAt: Date.now(),
        castInstanceId: null,
        status: 'pending',
        aimSnapshot: restoredAimSnapshot,
      });

      /* ===== 乐观更新：立即标记技能进入冷却，防止快照到达前重复释放 ===== */
      useGameStore.getState().patchChampionSkillRuntimeState(me.id, slot, {
        isReady: false,
        isCasting: true,
      });
      /* 记录独立的 slot 施法时间戳，作为 hasBlockingLocalPrediction 的兜底安全阀 */
      lastCastTimestampBySlotRef.current[slot] = Date.now();

      /* ===== 客户端预测：施法时立即锁定移动，消除等待服务端响应期间的滑行 ===== */
      if (shouldLockMovement) {
        const predictor = getLocalPredictor();
        if (predictor?.initialized) {
          predictor.issueStop();
          /* 使用 heroConfig 中的 durationMs 作为临时锁定时长，
           * 后端 spellCastStarted 回来后 applyLocalMovementLock 会用精确值覆盖。 */
          const estimatedLockMs = actionConfig?.durationMs ?? 500;
          predictor.applyMovementLock(estimatedLockMs);
        }
        /* 同步清除 store 中的移动目标，使英雄视觉上立即停止 */
        useGameStore.getState().setChampionMoveTarget(me.id, null);
      }

      /* ===== 客户端预测：施法时英雄立即转向鼠标方向（self_cast 类技能无需转向） ===== */
      {
        const castDef = getSkillCastDefinition(me.heroId, slot, runtimeSkillId);
        const aimTarget = castDef?.targetType !== 'self_cast'
          ? (activeAim?.targetPoint
            ?? activeAim?.cursorWorldPosition
            ?? useGameStore.getState().lastMouseWorldPosition)
          : null;
        if (aimTarget) {
          const dx = aimTarget.x - me.position.x;
          const dz = aimTarget.z - me.position.z;
          if (dx * dx + dz * dz > 0.001) {
            const facingRotation = Math.atan2(dx, dz);
            useGameStore.getState().setChampionFacingRotation(me.id, facingRotation);
            /* 同步更新预测器朝向，避免等待服务端响应造成转向延迟 */
            const predictor = getLocalPredictor();
            if (predictor?.initialized) {
              predictor.setFacingRotation(facingRotation);
            }
          }
        }
      }

      return true;
    },
    [me, multiplayerSession.roomId, resolveRuntimeSkillId],
  );

  /**
   * 处理技能按键/点击：
   *   - self_cast / 无需瞄准 → 直接释放
   *   - 需要瞄准 → 进入瞄准模式（重复按同一技能键 → 取消瞄准）
   */
  const handleSkillInput = useCallback(
    (slot: SpellSlot) => {
      if (!me || !CASTABLE_SLOTS.has(slot)) return;
      if (!getSocketClient().connected) return;
      if (hasBlockingLocalPrediction(slot)) return;

      /* 使用最新 store 状态检查冷却，避免闭包中 me.skillStates 过时导致冷却期间重复释放 */
      const freshChampion = useGameStore.getState().champions.find((c) => c.id === me.id);
      const skillState = freshChampion?.skillStates?.[slot];
      const runtimeSkillId = resolveRuntimeSkillId(slot);
      /* skillState 为 undefined（slot 未初始化）或 isReady 非 true 时均阻塞 */
      if (!skillState?.isReady) return;

      /* 若当前正在瞄准同一技能（非预览模式），则取消瞄准（切换行为） */
      const currentAim = useGameStore.getState().spellAimState;
      if (currentAim && currentAim.slot === slot && !currentAim.previewOnly) {
        useGameStore.getState().exitSpellAim();
        return;
      }

      /* 检查是否需要瞄准 */
      if (!requiresAiming(me.heroId, slot, runtimeSkillId)) {
        /* 不需要瞄准的技能（self_cast、回城等）直接释放 */
        useGameStore.getState().exitSpellAim();
        executeCast(slot);
        return;
      }

      const castDef = getSkillCastDefinition(me.heroId, slot, runtimeSkillId);
      if (!castDef) {
        executeCast(slot);
        return;
      }

      /* ===== 智能施法：跳过瞄准，直接以当前鼠标位置释放 ===== */
      /* basicAttack（A键）始终进入瞄准模式（与 LOL 攻击移动行为一致），不走智能施法快捷路径 */
      /* alwaysSmartCast 技能（如闪现）无论全局开关状态都强制走智能施法 */
      if ((smartCastEnabled || castDef.alwaysSmartCast) && slot !== 'basicAttack') {
        if (castDef.targetType === 'target_point' || castDef.targetType === 'directional') {
          const mousePos = useGameStore.getState().lastMouseWorldPosition;
          const mePos = me.position;
          let dx: number;
          let dz: number;
          if (mousePos) {
            dx = mousePos.x - mePos.x;
            dz = mousePos.z - mePos.z;
          } else {
            /* 鼠标位置未知时，向当前朝向最大射程方向施法 */
            dx = Math.sin(me.rotation) * castDef.range;
            dz = Math.cos(me.rotation) * castDef.range;
          }
          const distance = Math.sqrt(dx * dx + dz * dz);
          const clampedDistance = distance > 0.001 ? Math.min(distance, castDef.range) : castDef.range;
          const normalizedX = distance > 0.001 ? dx / distance : 0;
          const normalizedZ = distance > 0.001 ? dz / distance : 1;
          const targetPoint = {
            x: mePos.x + normalizedX * clampedDistance,
            y: 0,
            z: mePos.z + normalizedZ * clampedDistance,
          };
          const instantAim: SpellAimState = {
            slot,
            casterId: me.id,
            skillId: castDef.skillId,
            targetType: castDef.targetType,
            range: castDef.range,
            radius: castDef.radius,
            width: castDef.width,
            targetRules: castDef.targetRules ?? null,
            cursorWorldPosition: mousePos,
            targetPoint,
            targetDirection: { x: normalizedX, y: 0, z: normalizedZ },
            hoveredTargetEntityId: null,
            hoveredTargetAllowed: null,
            targetEntityId: null,
          };
          useGameStore.getState().exitSpellAim();
          executeCast(slot, instantAim);
          return;
        }
        /* target_unit 智能施法：尝试自动选择鼠标位置附近的有效目标 */
        if (castDef.targetType === 'target_unit') {
          const mousePos = useGameStore.getState().lastMouseWorldPosition;
          if (mousePos) {
            /* 搜索范围：英雄 + 小兵，英雄优先 */
            const allChampions = useGameStore.getState().champions;
            const allMinions = useGameStore.getState().minions;
            const TARGET_PICK_RADIUS = 2.5;
            let bestTarget: TargetableEntity | null = null;
            let bestDistSq = TARGET_PICK_RADIUS * TARGET_PICK_RADIUS;
            let bestIsChampion = false;
            const candidates: (TargetableEntity & { _isChampion: boolean })[] = [
              ...allChampions.map((c) => ({ ...c, _isChampion: true })),
              ...allMinions.map((m) => ({ ...m, statusEffects: [] as { statusId: string }[], _isChampion: false })),
            ];
            for (const candidate of candidates) {
              if (!isTargetAllowedByRules(me, candidate, castDef.targetRules)) continue;
              const cdx = candidate.position.x - mousePos.x;
              const cdz = candidate.position.z - mousePos.z;
              const distSq = cdx * cdx + cdz * cdz;
              if (distSq < bestDistSq) {
                const castDistSq = (candidate.position.x - me.position.x) ** 2 + (candidate.position.z - me.position.z) ** 2;
                if (castDistSq <= (castDef.range + 0.5) ** 2) {
                  /* 同距离内英雄优先 */
                  if (bestTarget && bestIsChampion && !candidate._isChampion && bestDistSq - distSq < 1) continue;
                  bestDistSq = distSq;
                  bestTarget = candidate;
                  bestIsChampion = candidate._isChampion;
                }
              }
            }
            if (bestTarget) {
              const instantAim: SpellAimState = {
                slot,
                casterId: me.id,
                skillId: castDef.skillId,
                targetType: castDef.targetType,
                range: castDef.range,
                radius: castDef.radius,
                width: castDef.width,
                targetRules: castDef.targetRules ?? null,
                cursorWorldPosition: mousePos,
                targetPoint: { x: bestTarget.position.x, y: 0, z: bestTarget.position.z },
                targetDirection: null,
                hoveredTargetEntityId: bestTarget.id,
                hoveredTargetAllowed: true,
                targetEntityId: bestTarget.id,
              };
              useGameStore.getState().exitSpellAim();
              executeCast(slot, instantAim);
              return;
            }
          }
          /* 智能施法 target_unit 未找到目标：不进入瞄准模式，直接忽略（与 LoL 智能施法行为一致） */
          return;
        }
      }

      /* 进入瞄准模式 */
      useGameStore.getState().enterSpellAim({
        slot,
        casterId: me.id,
        skillId: castDef.skillId,
        targetType: castDef.targetType,
        range: castDef.range,
        radius: castDef.radius,
        width: castDef.width,
        targetRules: castDef.targetRules ?? null,
        cursorWorldPosition: null,
        targetPoint: null,
        targetDirection: null,
        hoveredTargetEntityId: null,
        hoveredTargetAllowed: null,
        targetEntityId: null,
      });
    },
    [me, executeCast, hasBlockingLocalPrediction, resolveRuntimeSkillId, smartCastEnabled],
  );

  /**
   * 瞄准模式下的左键确认施法。
   * 监听全局 mousedown，在瞄准状态下左键点击触发释放。
   */
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const aim = useGameStore.getState().spellAimState;
      if (!aim) return;

      /* 仅处理 canvas 上的点击，忽略 HUD 按钮上的点击 */
      const target = e.target as HTMLElement;
      if (target.tagName !== 'CANVAS') return;

      /* 左键：确认施法（previewOnly 模式下不允许施法确认） */
      if (e.button === 0) {
        if (aim.previewOnly) return;
        /* target_unit 必须点中单位后才能释放，这里不接受点地面确认。 */
        if (aim.targetType !== 'target_unit') {
          if (executeCast(aim.slot, aim)) {
            useGameStore.getState().exitSpellAim();
          }
        }
      }
      /* 右键：取消瞄准（右键移动由 InputController 处理，不冲突） */
      if (e.button === 2) {
        useGameStore.getState().exitSpellAim();
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [executeCast]);

  /**
   * target_unit 由 InputController 先完成单位拾取，再由这里统一正式释放。
   * 这样可以避免 HUD 与场景层同时各自发请求，保证单体技能确认路径唯一。
   */
  useEffect(() => {
    if (!spellAimState || spellAimState.targetType !== 'target_unit' || !spellAimState.targetEntityId) {
      return;
    }
    if (executeCast(spellAimState.slot, spellAimState)) {
      useGameStore.getState().exitSpellAim();
    }
  }, [executeCast, spellAimState]);

  /** 键盘监听：技能键 + ESC 取消 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      /* 忽略输入框内的按键 */
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      /* 忽略浏览器自动重复派发的长按事件，避免技能键持续闪烁。 */
      if (e.repeat) return;

      /* ESC 取消瞄准 */
      if (e.key === 'Escape') {
        const aim = useGameStore.getState().spellAimState;
        if (aim) {
          useGameStore.getState().exitSpellAim();
          return;
        }
      }

      /* Shift+K 切换智能施法 */
      if (e.key.toLowerCase() === 'k' && e.shiftKey) {
        useGameStore.getState().toggleSmartCast();
        return;
      }

      const slot = KEY_TO_SLOT[e.key.toLowerCase()];
      if (slot) {
        handleSkillInput(slot);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkillInput]);

  /** 当前正在瞄准的技能槽位（用于高亮显示） */
  const aimingSlot = spellAimState?.slot ?? null;
  const aimHintText = useMemo(() => {
    if (spellAimState?.targetType === 'target_unit') {
      return '左键点敌方单位确认 · 右键/ESC取消';
    }
    return '左键确认 · 右键/ESC取消';
  }, [spellAimState]);

  return (
    <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      {/* 技能槽位：召唤师D + 召唤师F */}
      {displaySkills.map((skill) => {
        const isOnCooldown = skill.cooldown > 0;
        const cooldownLabel = isOnCooldown ? formatCooldownLabel(skill.cooldown) : '';
        const cdPercent = skill.maxCooldown > 0 ? skill.cooldown / skill.maxCooldown : 0;
        const isAiming = aimingSlot === skill.slot;
        const hasIcon = skill.icon && skill.icon.startsWith('http');
        const isHovered = hoveredSlot === skill.slot;
        return (
          <div
            key={skill.slot}
            className="relative flex flex-col items-center gap-1"
            onClick={() => handleSkillInput(skill.slot)}
            onMouseEnter={() => setHoveredSlot(skill.slot)}
            onMouseLeave={() => setHoveredSlot(null)}
          >
            <div
              className="relative w-12 h-12 rounded-lg flex items-center justify-center transition-all hover:scale-105 select-none cursor-pointer overflow-hidden"
              style={{
                background: isAiming
                  ? `linear-gradient(135deg, ${skill.color}66, ${skill.color}33)`
                  : !(skill.isReady && !isOnCooldown)
                    ? 'rgba(0,0,0,0.6)'
                    : hasIcon ? 'rgba(0,0,0,0.3)' : `linear-gradient(135deg, ${skill.color}33, ${skill.color}11)`,
                border: `2px solid ${isAiming ? skill.color : skill.isReady && !isOnCooldown ? skill.color + '88' : '#333'}`,
                boxShadow: isAiming
                  ? `0 0 14px ${skill.color}88, inset 0 0 8px ${skill.color}44`
                  : skill.isReady && !isOnCooldown
                    ? `0 0 8px ${skill.color}44`
                    : 'none',
              }}
            >
              {hasIcon && (
                <img
                  src={skill.icon}
                  alt={skill.label}
                  className="absolute inset-0 w-full h-full object-cover rounded-md"
                  style={{ opacity: skill.isReady && !isOnCooldown ? 1 : 0.35 }}
                  draggable={false}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}

              {isOnCooldown && cdPercent > 0 && (
                <div
                  className="absolute inset-0 rounded-md z-[1]"
                  style={{
                    background: `conic-gradient(from 0deg at 50% 50%, rgba(0,0,0,0.65) ${cdPercent * 360}deg, transparent ${cdPercent * 360}deg)`,
                  }}
                />
              )}

              {!hasIcon && (
                <span
                  className="text-sm font-bold z-10"
                  style={{ color: isAiming ? '#fff' : skill.isReady && !isOnCooldown ? skill.color : '#666' }}
                >
                  {skill.label.slice(0, 2)}
                </span>
              )}

              {isOnCooldown && (
                <span
                  className={`absolute z-10 font-extrabold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] bg-black/55 rounded px-1.5 py-[2px] leading-none ${cooldownLabel.length >= 3 ? 'text-[10px]' : 'text-[13px]'}`}
                >
                  {cooldownLabel}
                </span>
              )}

              {isAiming && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse z-20"
                  style={{ background: skill.color, boxShadow: `0 0 6px ${skill.color}` }}
                />
              )}
            </div>

            <span className="text-[9px] text-white/30 font-mono">{skill.key}</span>

            {isHovered && (skill.description || skill.maxCooldown > 0 || skill.label) && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 200,
                  pointerEvents: 'none',
                  minWidth: 200,
                  maxWidth: 280,
                  bottom: '100%',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    background: 'rgba(10, 12, 20, 0.96)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {hasIcon && (
                      <img src={skill.icon} alt="" style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }} draggable={false} />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 700, color: skill.color }}>{skill.label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>[{skill.key}]</span>
                  </div>
                  {skill.description && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0 }}>{skill.description}</p>
                  )}
                  {skill.maxCooldown > 0 && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6, margin: 0, marginBlockStart: 6 }}>基础冷却: {skill.maxCooldown.toFixed(1)}s</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {aimingSlot && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded-md">
          {aimHintText}
        </div>
      )}
    </div>
  );
};

export default SkillBar;
