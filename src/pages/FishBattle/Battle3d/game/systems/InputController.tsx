import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/gameConfig';
import { CAMERA_CONFIG } from '../../config/cameraConfig';
import { isTargetAllowedByRules, type TargetableEntity } from '../../config/skillDefinitions';
import { MAP_CONFIG } from '../../config/mapConfig';
import { emitMoveCommand, emitStopCommand } from '../../network/socketClient';
import { getLocalPredictor } from '../../network/NetworkSyncRegistry';
import { useGameStore } from '../../store/useGameStore';

const MOVE_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const RAYCASTER = new THREE.Raycaster();
const POINTER = new THREE.Vector2();
const INTERSECTION = new THREE.Vector3();

const InputController: React.FC = () => {
  const { camera, gl, scene } = useThree();
  const pointerInsideRef = useRef(false);
  const moveSequenceRef = useRef(0);
  const pendingPointerSampleRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const pointerFrameRequestRef = useRef<number | null>(null);
  const me = useGameStore((s) => {
    const controlledChampionId = s.multiplayerSession.controlledChampionId;
    if (GAME_CONFIG.multiplayer.enabled && controlledChampionId) {
      return s.champions.find((champion) => champion.id === controlledChampionId) ?? null;
    }
    return s.champions.find((champion) => champion.isMe) ?? null;
  });
  const togglePlayerCameraLock = useGameStore((s) => s.togglePlayerCameraLock);
  const toggleDirectorMode = useGameStore((s) => s.toggleDirectorMode);
  const cycleSpectatorTarget = useGameStore((s) => s.cycleSpectatorTarget);
  const focusControlledChampion = useGameStore((s) => s.focusControlledChampion);
  const toggleWorldCoordinates = useGameStore((s) => s.toggleWorldCoordinates);
  const toggleDebugFreeCamera = useGameStore((s) => s.toggleDebugFreeCamera);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const debugFreeCamera = useGameStore((s) => s.debugFreeCamera);
  const showMoveIndicator = useGameStore((s) => s.showMoveIndicator);
  const setChampionMoveTarget = useGameStore((s) => s.setChampionMoveTarget);
  const stopChampion = useGameStore((s) => s.stopChampion);
  const setLastMouseWorldPosition = useGameStore((s) => s.setLastMouseWorldPosition);
  const cursorConfig = GAME_CONFIG.input.rightClickIndicator.cursor;
  const spectatorConfig = GAME_CONFIG.input.spectator;
  const debugConfig = GAME_CONFIG.debug.worldCoordinates;
  const multiplayerEnabled = GAME_CONFIG.multiplayer.enabled;

  const meId = me?.id ?? null;

  useEffect(() => {
    const onPointerEnter = () => { pointerInsideRef.current = true; };
    const onPointerLeave = () => { pointerInsideRef.current = false; };
    const container = gl.domElement.closest('.fb-content') ?? gl.domElement.parentElement;
    if (container) {
      container.addEventListener('pointerenter', onPointerEnter);
      container.addEventListener('pointerleave', onPointerLeave);
    }
    return () => {
      if (container) {
        container.removeEventListener('pointerenter', onPointerEnter);
        container.removeEventListener('pointerleave', onPointerLeave);
      }
    };
  }, [gl.domElement]);

  useEffect(() => {
    if (!meId) return;
    if (!me) return;

    const setPointerFromClient = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      POINTER.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      POINTER.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      RAYCASTER.setFromCamera(POINTER, camera);
    };

    const setPointerFromEvent = (event: MouseEvent) => {
      setPointerFromClient(event.clientX, event.clientY);
    };

    const getGroundIntersection = (event: MouseEvent): THREE.Vector3 | null => {
      setPointerFromEvent(event);
      const hit = RAYCASTER.ray.intersectPlane(MOVE_PLANE, INTERSECTION);
      if (!hit) return null;
      return new THREE.Vector3(hit.x, 0, hit.z);
    };

    /**
     * 通用目标选取：射线检测 champion 和 minion，返回 TargetableEntity。
     * 优先返回 champion（英雄优先级高于小兵）。
     */
    const getTargetEntityAtClient = (clientX: number, clientY: number): TargetableEntity | null => {
      setPointerFromClient(clientX, clientY);
      const intersections = RAYCASTER.intersectObjects(scene.children, true);
      let bestMinion: TargetableEntity | null = null;
      for (const intersection of intersections) {
        let current: THREE.Object3D | null = intersection.object;
        while (current) {
          const userData = current.userData as {
            entityType?: string;
            championId?: string;
            minionId?: string;
          };
          if (userData?.entityType === 'champion' && typeof userData.championId === 'string') {
            const liveChampions = useGameStore.getState().champions;
            const targetChampion = liveChampions.find((champion) => champion.id === userData.championId) ?? null;
            if (!targetChampion || targetChampion.isDead) {
              current = current.parent;
              continue;
            }
            return targetChampion;
          }
          if (userData?.entityType === 'minion' && typeof userData.minionId === 'string' && !bestMinion) {
            const liveMinions = useGameStore.getState().minions;
            const targetMinion = liveMinions.find((m) => m.id === userData.minionId) ?? null;
            if (targetMinion && !targetMinion.isDead) {
              bestMinion = targetMinion;
            }
          }
          current = current.parent;
        }
      }
      return bestMinion;
    };

    const getTargetEntityFromEvent = (event: MouseEvent): TargetableEntity | null => {
      return getTargetEntityAtClient(event.clientX, event.clientY);
    };

    const getLiveControlledChampion = () => {
      const state = useGameStore.getState();
      const controlledChampionId = state.multiplayerSession.controlledChampionId ?? meId;
      if (!controlledChampionId) {
        return null;
      }
      return state.champions.find((champion) => champion.id === controlledChampionId) ?? null;
    };

    const flushPointerTracking = () => {
      pointerFrameRequestRef.current = null;
      const sample = pendingPointerSampleRef.current;
      if (!sample) {
        return;
      }

      setPointerFromClient(sample.clientX, sample.clientY);
      const groundHit = RAYCASTER.ray.intersectPlane(MOVE_PLANE, INTERSECTION);
      if (groundHit) {
        setLastMouseWorldPosition({ x: groundHit.x, y: 0, z: groundHit.z });
      }

      const aim = useGameStore.getState().spellAimState;
      const liveControlledChampion = getLiveControlledChampion();
      if (!aim || aim.targetType !== 'target_unit' || !liveControlledChampion) {
        return;
      }

      const targetEntity = getTargetEntityAtClient(sample.clientX, sample.clientY);
      const isAllowedByRules = !!targetEntity && isTargetAllowedByRules(liveControlledChampion, targetEntity, aim.targetRules);
      const isInRange = !!targetEntity && liveControlledChampion.position.distanceTo(targetEntity.position) <= aim.range + 0.001;
      const hoveredTargetEntityId = targetEntity?.id ?? null;
      const hoveredTargetAllowed = !!targetEntity && isAllowedByRules && isInRange;
      if (aim.hoveredTargetEntityId === hoveredTargetEntityId && aim.hoveredTargetAllowed === hoveredTargetAllowed) {
        return;
      }
      useGameStore.getState().updateSpellAim({
        hoveredTargetEntityId,
        hoveredTargetAllowed,
      });
    };

    const isPlayablePoint = (point: THREE.Vector3) => (
      point.x >= MAP_CONFIG.playableBounds.minX
      && point.x <= MAP_CONFIG.playableBounds.maxX
      && point.z >= MAP_CONFIG.playableBounds.minZ
      && point.z <= MAP_CONFIG.playableBounds.maxZ
    );

    const buildCursorValue = (path: string) => `url(${path}) ${cursorConfig.hotspotX} ${cursorConfig.hotspotY}, ${cursorConfig.fallback}`;
    const cursorHost = gl.domElement.parentElement;

    const resetCursor = () => {
      const value = cursorConfig.enabled ? buildCursorValue(cursorConfig.defaultPath) : cursorConfig.fallback;
      gl.domElement.style.cursor = value;
      if (cursorHost) {
        cursorHost.style.cursor = value;
      }
    };

    const flashClickCursor = () => {
      if (!cursorConfig.enabled || !cursorConfig.clickPath) {
        return;
      }

      const value = buildCursorValue(cursorConfig.clickPath);
      gl.domElement.style.cursor = value;
      if (cursorHost) {
        cursorHost.style.cursor = value;
      }
      window.setTimeout(resetCursor, cursorConfig.clickFeedbackMs);
    };

    const issueMoveSequence = () => {
      const diagnostics = useGameStore.getState().multiplayerSession.diagnostics;
      if (diagnostics.lastSentMoveSequence === 0 && diagnostics.lastAckedMoveSequence === 0) {
        moveSequenceRef.current = 0;
      }
      const nextSequence = Math.max(
        moveSequenceRef.current,
        diagnostics.lastSentMoveSequence,
        diagnostics.lastAckedMoveSequence,
      ) + 1;
      const clientTimestamp = Date.now();
      return { clientMoveSequence: nextSequence, clientTimestamp };
    };

    const commitMoveSequence = (nextSequence: number, clientTimestamp: number) => {
      moveSequenceRef.current = nextSequence;
      useGameStore.setState((state) => ({
        multiplayerSession: {
          ...state.multiplayerSession,
          diagnostics: {
            ...state.multiplayerSession.diagnostics,
            lastSentMoveSequence: nextSequence,
            lastMoveCommandSentAt: clientTimestamp,
          },
        },
      }));
    };

    resetCursor();

    const handleMouseMove = (event: MouseEvent) => {
      pendingPointerSampleRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (pointerFrameRequestRef.current === null) {
        pointerFrameRequestRef.current = window.requestAnimationFrame(flushPointerTracking);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const aim = useGameStore.getState().spellAimState;
      const liveControlledChampion = getLiveControlledChampion();
      if (aim && event.button === 0 && aim.targetType === 'target_unit') {
        event.preventDefault();
        if (!liveControlledChampion) {
          return;
        }
        const targetEntity = getTargetEntityFromEvent(event);
        const isAllowedByRules = !!targetEntity && isTargetAllowedByRules(liveControlledChampion, targetEntity, aim.targetRules);
        const isInRange = !!targetEntity && liveControlledChampion.position.distanceTo(targetEntity.position) <= aim.range + 0.001;
        const isAllowed = !!targetEntity && isAllowedByRules && isInRange;
        if (!targetEntity || !isAllowed) {
          useGameStore.getState().updateSpellAim({
            hoveredTargetEntityId: targetEntity?.id ?? null,
            hoveredTargetAllowed: false,
            targetEntityId: null,
          });
          return;
        }
        useGameStore.getState().updateSpellAim({
          hoveredTargetEntityId: targetEntity.id,
          hoveredTargetAllowed: true,
          targetEntityId: targetEntity.id,
        });
        return;
      }

      if (event.button !== 2) return;
      event.preventDefault();
      event.stopPropagation();
      /* 断线状态下禁止发送任何操作命令 */
      if (multiplayerEnabled && useGameStore.getState().multiplayerSession.status !== 'connected') return;
      /* 瞄准模式下右键：先取消瞄准，然后继续执行移动（与 LoL 行为一致） */
      if (useGameStore.getState().spellAimState) {
        useGameStore.getState().exitSpellAim();
      }
      /* 死亡状态禁止移动 */
      if (liveControlledChampion?.isDead) return;
      /* 施法动画锁定期间禁止移动 */
      if (liveControlledChampion && liveControlledChampion.movementLockedUntil > Date.now()) return;
      if ((cameraMode !== 'playerLocked' && cameraMode !== 'spectatorFollow') || debugFreeCamera) return;
      if (!meId || cameraMode !== 'playerLocked') return;
      const point = getGroundIntersection(event);
      if (!point) return;
      if (!isPlayablePoint(point)) return;
      flashClickCursor();
      if (multiplayerEnabled) {
        /* 立即驱动本地预测器，角色无需等待服务端回传即可开始移动 */
        const predictor = getLocalPredictor();
        const moveMeta = issueMoveSequence();
        const sentMoveSequence = predictor ? predictor.seq + 1 : moveMeta.clientMoveSequence;
        const didSend = emitMoveCommand({
          championId: meId,
          target: { x: point.x, y: point.y, z: point.z },
          targetPoint: { x: point.x, y: point.y, z: point.z },
          inputMode: 'mouse' as const,
          clientMoveSequence: sentMoveSequence,
          clientTimestamp: moveMeta.clientTimestamp,
        });
        if (!didSend) {
          return;
        }
        commitMoveSequence(sentMoveSequence, moveMeta.clientTimestamp);
        predictor?.issueMove(point.x, point.z);
      }
      setChampionMoveTarget(meId, point, 'mouse');
      showMoveIndicator(point);
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.code === 'KeyS') {
        if (!meId || cameraMode !== 'playerLocked') {
          return;
        }
        if (multiplayerEnabled && useGameStore.getState().multiplayerSession.status !== 'connected') return;
        const liveControlledChampion = getLiveControlledChampion();
        if (!liveControlledChampion || liveControlledChampion.isDead) return;
        if (liveControlledChampion.movementLockedUntil > Date.now()) return;
        if (multiplayerEnabled) {
          const predictor = getLocalPredictor();
          const moveMeta = issueMoveSequence();
          const stopSeq = predictor ? predictor.seq + 1 : moveMeta.clientMoveSequence;
          /* 携带客户端视觉位置，让后端在 stop 时采纳，消除网络延迟导致的前后端位差 */
          const currentState = predictor?.getCurrentState();
          const didSend = emitStopCommand({
            championId: meId,
            clientMoveSequence: stopSeq,
            clientTimestamp: moveMeta.clientTimestamp,
            clientPosition: currentState ? { x: currentState.position.x, z: currentState.position.z } : undefined,
          });
          /* 无论 emit 是否成功，都更新本地预测器和 store，
           * 避免 socket 短暂断连导致本地状态仍保持移动。服务端会通过后续快照协调。 */
          if (didSend) {
            commitMoveSequence(stopSeq, moveMeta.clientTimestamp);
          }
          predictor?.issueStop();
        }
        stopChampion(meId);
        return;
      }

      if (!pointerInsideRef.current) return;

      if (event.code === CAMERA_CONFIG.lockToggleKey) {
        togglePlayerCameraLock();
        return;
      }

      if (event.code === spectatorConfig.toggleModeKey) {
        toggleDirectorMode();
        return;
      }

      if (event.code === spectatorConfig.previousTargetKey) {
        cycleSpectatorTarget(-1);
        return;
      }

      if (event.code === spectatorConfig.nextTargetKey) {
        cycleSpectatorTarget(1);
        return;
      }

      if (event.code === spectatorConfig.focusMeKey) {
        focusControlledChampion();
        return;
      }

      if (GAME_CONFIG.debug.worldCoordinates.enabled && event.code === debugConfig.toggleKey) {
        toggleWorldCoordinates();
        return;
      }

      if (GAME_CONFIG.debug.freeCamera.enabled && event.code === GAME_CONFIG.debug.freeCamera.toggleKey) {
        toggleDebugFreeCamera();
      }
    };

    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (pointerFrameRequestRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRequestRef.current);
        pointerFrameRequestRef.current = null;
      }
      pendingPointerSampleRef.current = null;
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      gl.domElement.style.cursor = '';
      if (cursorHost) {
        cursorHost.style.cursor = '';
      }
    };
  }, [camera, cameraMode, cursorConfig.clickFeedbackMs, cursorConfig.clickPath, cursorConfig.defaultPath, cursorConfig.enabled, cursorConfig.fallback, cursorConfig.hotspotX, cursorConfig.hotspotY, cycleSpectatorTarget, debugConfig.toggleKey, debugFreeCamera, focusControlledChampion, gl.domElement, me, meId, multiplayerEnabled, scene.children, setChampionMoveTarget, showMoveIndicator, spectatorConfig.focusMeKey, spectatorConfig.nextTargetKey, spectatorConfig.previousTargetKey, spectatorConfig.toggleModeKey, stopChampion, toggleDebugFreeCamera, toggleDirectorMode, togglePlayerCameraLock, toggleWorldCoordinates]);

  return null;
};

export default InputController;
