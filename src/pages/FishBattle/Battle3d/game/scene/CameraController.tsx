import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CAMERA_CONFIG } from '../../config/cameraConfig';
import { getLocalPredictor } from '../../network/NetworkSyncRegistry';
import { useGameStore } from '../../store/useGameStore';

const CAMERA_MOVE_FORWARD = new THREE.Vector3(-CAMERA_CONFIG.baseOffset[0], 0, -CAMERA_CONFIG.baseOffset[2]).normalize();
const CAMERA_MOVE_RIGHT = new THREE.Vector3().crossVectors(CAMERA_MOVE_FORWARD, new THREE.Vector3(0, 1, 0)).normalize();
const DRAGGABLE_CAMERA_MODES = new Set(['playerLocked', 'directorFree', 'spectatorFollow']);

const CameraController: React.FC = () => {
  const { camera, gl } = useThree();
  const cameraMode = useGameStore((s) => s.cameraMode);
  const isPlayerCameraLocked = useGameStore((s) => s.isPlayerCameraLocked);
  const debugFreeCamera = useGameStore((s) => s.debugFreeCamera);
  const me = useGameStore((s) => s.champions.find((champion) => champion.isMe) ?? null);
  const spectatorTarget = useGameStore((s) => (s.spectatorTargetId
    ? s.champions.find((champion) => champion.id === s.spectatorTargetId) ?? null
    : null));
  const activeFocusTarget = cameraMode === 'spectatorFollow'
    ? (spectatorTarget ?? me)
    : cameraMode === 'directorFree'
      ? (spectatorTarget ?? me)
      : me;
  const canDragCamera = DRAGGABLE_CAMERA_MODES.has(cameraMode);
  const setPlayerCameraLocked = useGameStore((s) => s.setPlayerCameraLocked);
  const introFinishedRef = useRef(!CAMERA_CONFIG.introEnabled);
  const zoomRef = useRef(CAMERA_CONFIG.introEnabled ? CAMERA_CONFIG.introStartZoom : CAMERA_CONFIG.initialZoom);
  const targetRef = useRef(new THREE.Vector3(...CAMERA_CONFIG.initialTarget));
  const lookAtRef = useRef(new THREE.Vector3(...CAMERA_CONFIG.initialTarget));
  const positionRef = useRef(new THREE.Vector3());
  const activeFocusTargetRef = useRef(activeFocusTarget);
  const pointerRef = useRef({ x: 0, y: 0, inside: false });
  const isDraggingRef = useRef(false);
  const dragStartedAtRef = useRef(0);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragDeltaRef = useRef({ x: 0, y: 0 });
  const desiredPositionRef = useRef(new THREE.Vector3());
  const keysRef = useRef<Set<string>>(new Set());
  const orbitRef = useRef<any>(null);
  /** 联机模式下，第一次检测到 me 时硬 snap 相机，避免从地图中心 lerp 到英雄位置。 */
  const hasSnappedToMeRef = useRef(false);
  /** 上一帧 me.isDead 状态，用于检测复活并自动回到玩家位置。 */
  const wasDeadRef = useRef(false);

  const getFocusPosition = (focusTarget = activeFocusTargetRef.current) => {
    if (!focusTarget) {
      return null;
    }
    if (focusTarget.isMe) {
      const predictor = getLocalPredictor();
      if (predictor?.initialized) {
        return predictor.getCurrentState().position;
      }
    }
    return focusTarget.position;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!pointerRef.current.inside) return;
      keysRef.current.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.code); };
    const onBlur = () => { keysRef.current.clear(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    const startZoom = CAMERA_CONFIG.introEnabled ? CAMERA_CONFIG.introStartZoom : CAMERA_CONFIG.initialZoom;
    const zoomScale = startZoom / CAMERA_CONFIG.baseOffset[1];
    const initialPosition = new THREE.Vector3(
      CAMERA_CONFIG.baseOffset[0] * zoomScale,
      startZoom,
      CAMERA_CONFIG.baseOffset[2] * zoomScale,
    );

    camera.position.copy(initialPosition);
    camera.lookAt(...CAMERA_CONFIG.initialTarget);
    positionRef.current.copy(initialPosition);
    lookAtRef.current.set(...CAMERA_CONFIG.initialTarget);
    targetRef.current.set(...CAMERA_CONFIG.initialTarget);
    zoomRef.current = startZoom;
    introFinishedRef.current = !CAMERA_CONFIG.introEnabled;
  }, [camera]);

  useEffect(() => {
    activeFocusTargetRef.current = activeFocusTarget;
    /* 英雄首次出现时，无论 isPlayerCameraLocked 状态如何都硬 snap 相机到英雄位置，
     * 避免开局相机停留在地图中心 (0,0,0) 再缓慢 lerp 过去。 */
    if (activeFocusTarget && !hasSnappedToMeRef.current) {
      const focusPosition = getFocusPosition(activeFocusTarget);
      if (focusPosition && focusPosition.lengthSq() > 0.01) {
        targetRef.current.set(focusPosition.x, focusPosition.y, focusPosition.z);
        lookAtRef.current.copy(targetRef.current);
        const snapZoomScale = zoomRef.current / CAMERA_CONFIG.baseOffset[1];
        positionRef.current.set(
          targetRef.current.x + CAMERA_CONFIG.baseOffset[0] * snapZoomScale,
          targetRef.current.y + zoomRef.current,
          targetRef.current.z + CAMERA_CONFIG.baseOffset[2] * snapZoomScale,
        );
        camera.position.copy(positionRef.current);
        camera.lookAt(lookAtRef.current);
        hasSnappedToMeRef.current = true;
      }
    }
  }, [activeFocusTarget, camera]);

  useEffect(() => {
    const updatePointerState = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointerRef.current.x = event.clientX - rect.left;
      pointerRef.current.y = event.clientY - rect.top;
      pointerRef.current.inside = event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom;
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }

      if (!canDragCamera || debugFreeCamera) {
        return;
      }

      updatePointerState(event);
      isDraggingRef.current = true;
      dragStartedAtRef.current = performance.now();
      dragOriginRef.current = { x: event.clientX, y: event.clientY };
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      /* 不再在 mousedown 时解锁相机——改为在实际拖拽发生时解锁，
       * 避免每次左键点击（移动/攻击）都把 Y 键锁定状态取消。 */
    };

    const DRAG_UNLOCK_THRESHOLD = 4; // 像素阈值，超过才视为拖拽
    const DRAG_UNLOCK_HOLD_MS = 120;

    const handleMouseMove = (event: MouseEvent) => {
      updatePointerState(event);
      if (!isDraggingRef.current || !lastPointerRef.current) {
        return;
      }

      const dx = event.clientX - lastPointerRef.current.x;
      const dy = event.clientY - lastPointerRef.current.y;
      const origin = dragOriginRef.current;
      const totalDx = origin ? event.clientX - origin.x : 0;
      const totalDy = origin ? event.clientY - origin.y : 0;
      const dragExceededThreshold = Math.abs(totalDx) > DRAG_UNLOCK_THRESHOLD
        || Math.abs(totalDy) > DRAG_UNLOCK_THRESHOLD;
      const dragHeldLongEnough = dragStartedAtRef.current > 0
        && (performance.now() - dragStartedAtRef.current) >= DRAG_UNLOCK_HOLD_MS;
      let canApplyDrag = cameraMode !== 'playerLocked' || !useGameStore.getState().isPlayerCameraLocked;

      /* 拖拽解锁相机：仅当 isPlayerCameraLocked 为 false（即非 Y 键主动锁定）时，
       * 拖拽才会切换到自由视角。Y 键锁定期间拖拽不解锁，与英雄联盟行为一致。 */
      if (!canApplyDrag && CAMERA_CONFIG.dragUnlocksCamera && dragExceededThreshold && dragHeldLongEnough) {
        setPlayerCameraLocked(false);
        canApplyDrag = true;
      }

      if (canApplyDrag) {
        dragDeltaRef.current.x = dx;
        dragDeltaRef.current.y = dy;
      }
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
    };

    const stopDragging = () => {
      isDraggingRef.current = false;
      dragStartedAtRef.current = 0;
      dragOriginRef.current = null;
      lastPointerRef.current = null;
      dragDeltaRef.current.x = 0;
      dragDeltaRef.current.y = 0;
    };

    const handleLeave = () => {
      pointerRef.current.inside = false;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomRef.current = THREE.MathUtils.clamp(
        zoomRef.current + Math.sign(event.deltaY) * CAMERA_CONFIG.zoomStep,
        CAMERA_CONFIG.minZoom,
        CAMERA_CONFIG.maxZoom,
      );
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!pointerRef.current.inside) return;
      const focusTarget = activeFocusTargetRef.current;
      const focusPosition = getFocusPosition(focusTarget);

      /* 空格键：一次性回到玩家位置（不锁定） */
      if (!event.repeat && event.code === 'Space' && focusPosition) {
        targetRef.current.set(focusPosition.x, focusPosition.y, focusPosition.z);
        return;
      }

      /* Y 键：切换镜头锁定/解锁（使用 togglePlayerCameraLock 确保 cameraMode 也同步为 playerLocked） */
      if (!event.repeat && event.code === 'KeyY') {
        useGameStore.getState().togglePlayerCameraLock();
        const newLocked = useGameStore.getState().isPlayerCameraLocked;
        if (newLocked && focusPosition) {
          targetRef.current.set(focusPosition.x, focusPosition.y, focusPosition.z);
        }
        return;
      }
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('blur', stopDragging);
    gl.domElement.addEventListener('mouseleave', handleLeave);
    gl.domElement.addEventListener('wheel', handleWheel, { passive: false });
    gl.domElement.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('blur', stopDragging);
      gl.domElement.removeEventListener('mouseleave', handleLeave);
      gl.domElement.removeEventListener('wheel', handleWheel);
      gl.domElement.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canDragCamera, cameraMode, debugFreeCamera, gl.domElement, setPlayerCameraLocked]);

  useFrame((_, delta) => {
    const keys = keysRef.current;
    const wasdSpeed = CAMERA_CONFIG.edgePanSpeed * delta;

    /* 检测英雄从死亡→复活，自动 snap 相机到复活位置 */
    const meNow = activeFocusTargetRef.current;
    const isDeadNow = meNow?.isDead ?? false;
    if (wasDeadRef.current && !isDeadNow && meNow?.isMe) {
      const respawnPos = getFocusPosition(meNow);
      if (respawnPos) {
        targetRef.current.set(respawnPos.x, respawnPos.y, respawnPos.z);
        lookAtRef.current.copy(targetRef.current);
        const snapZoomScale = zoomRef.current / CAMERA_CONFIG.baseOffset[1];
        positionRef.current.set(
          targetRef.current.x + CAMERA_CONFIG.baseOffset[0] * snapZoomScale,
          targetRef.current.y + zoomRef.current,
          targetRef.current.z + CAMERA_CONFIG.baseOffset[2] * snapZoomScale,
        );
        camera.position.copy(positionRef.current);
        camera.lookAt(lookAtRef.current);
      }
    }
    wasDeadRef.current = isDeadNow;

    if (!introFinishedRef.current) {
      zoomRef.current += (CAMERA_CONFIG.initialZoom - zoomRef.current) * (1 - Math.exp(-CAMERA_CONFIG.introSpeed * delta));
      if (Math.abs(zoomRef.current - CAMERA_CONFIG.initialZoom) < 0.15) {
        zoomRef.current = CAMERA_CONFIG.initialZoom;
        introFinishedRef.current = true;
      }
    }

    if (((cameraMode === 'playerLocked' && isPlayerCameraLocked) || cameraMode === 'spectatorFollow') && activeFocusTarget) {
      const focusPosition = getFocusPosition(activeFocusTarget);
      if (!focusPosition) {
        return;
      }
      if (!hasSnappedToMeRef.current) {
        /* snap 之前：不更新 targetRef，避免 lerp 追踪 (0,0,0) 导致相机飘到中场。
         * 等到英雄位置有效（非原点）时一次性硬 snap。 */
        if (focusPosition.lengthSq() > 0.01) {
          targetRef.current.set(
            focusPosition.x,
            focusPosition.y,
            focusPosition.z,
          );
          lookAtRef.current.copy(targetRef.current);
          const snapZoomScale = zoomRef.current / CAMERA_CONFIG.baseOffset[1];
          positionRef.current.set(
            targetRef.current.x + CAMERA_CONFIG.baseOffset[0] * snapZoomScale,
            targetRef.current.y + zoomRef.current,
            targetRef.current.z + CAMERA_CONFIG.baseOffset[2] * snapZoomScale,
          );
          camera.position.copy(positionRef.current);
          camera.lookAt(lookAtRef.current);
          hasSnappedToMeRef.current = true;
        }
      } else {
        targetRef.current.set(
          focusPosition.x,
          focusPosition.y,
          focusPosition.z,
        );
      }
    }

    if (debugFreeCamera) {
      if (orbitRef.current && keys.size > 0) {
        const target = orbitRef.current.target as THREE.Vector3;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const moveVec = new THREE.Vector3();
        if (keys.has('KeyW')) moveVec.addScaledVector(forward, wasdSpeed);
        if (keys.has('KeyS')) moveVec.addScaledVector(forward, -wasdSpeed);
        if (keys.has('KeyD')) moveVec.addScaledVector(right, wasdSpeed);
        if (keys.has('KeyA')) moveVec.addScaledVector(right, -wasdSpeed);
        if (moveVec.lengthSq() > 0) {
          target.add(moveVec);
          camera.position.add(moveVec);
        }
      }
      return;
    }

    if (canDragCamera && (dragDeltaRef.current.x !== 0 || dragDeltaRef.current.y !== 0)) {
      const panScale = CAMERA_CONFIG.dragPanSpeed * (zoomRef.current / CAMERA_CONFIG.minZoom);
      targetRef.current.addScaledVector(CAMERA_MOVE_RIGHT, -dragDeltaRef.current.x * panScale);
      targetRef.current.addScaledVector(CAMERA_MOVE_FORWARD, dragDeltaRef.current.y * panScale);
      dragDeltaRef.current.x = 0;
      dragDeltaRef.current.y = 0;
    }

    if (cameraMode === 'directorFree' && CAMERA_CONFIG.enableEdgePan && pointerRef.current.inside && !isDraggingRef.current) {
      let horizontal = 0;
      let vertical = 0;

      if (pointerRef.current.x < CAMERA_CONFIG.edgePanMargin) {
        horizontal = -(1 - pointerRef.current.x / CAMERA_CONFIG.edgePanMargin);
      } else if (pointerRef.current.x > gl.domElement.clientWidth - CAMERA_CONFIG.edgePanMargin) {
        horizontal = (pointerRef.current.x - (gl.domElement.clientWidth - CAMERA_CONFIG.edgePanMargin)) / CAMERA_CONFIG.edgePanMargin;
      }

      if (pointerRef.current.y < CAMERA_CONFIG.edgePanMargin) {
        vertical = -(1 - pointerRef.current.y / CAMERA_CONFIG.edgePanMargin);
      } else if (pointerRef.current.y > gl.domElement.clientHeight - CAMERA_CONFIG.edgePanMargin) {
        vertical = (pointerRef.current.y - (gl.domElement.clientHeight - CAMERA_CONFIG.edgePanMargin)) / CAMERA_CONFIG.edgePanMargin;
      }

      if (horizontal !== 0 || vertical !== 0) {
        const panScale = CAMERA_CONFIG.edgePanSpeed * (zoomRef.current / CAMERA_CONFIG.minZoom) * delta;
        targetRef.current.addScaledVector(CAMERA_MOVE_RIGHT, horizontal * panScale);
        targetRef.current.addScaledVector(CAMERA_MOVE_FORWARD, vertical * panScale);
      }
    }

    if (cameraMode === 'directorFree' && keys.size > 0) {
      const kbPanScale = wasdSpeed * (zoomRef.current / CAMERA_CONFIG.minZoom);
      if (keys.has('KeyW')) targetRef.current.addScaledVector(CAMERA_MOVE_FORWARD, -kbPanScale);
      if (keys.has('KeyS')) targetRef.current.addScaledVector(CAMERA_MOVE_FORWARD, kbPanScale);
      if (keys.has('KeyA')) targetRef.current.addScaledVector(CAMERA_MOVE_RIGHT, -kbPanScale);
      if (keys.has('KeyD')) targetRef.current.addScaledVector(CAMERA_MOVE_RIGHT, kbPanScale);
    }

    targetRef.current.x = THREE.MathUtils.clamp(targetRef.current.x, CAMERA_CONFIG.bounds.minX, CAMERA_CONFIG.bounds.maxX);
    targetRef.current.z = THREE.MathUtils.clamp(targetRef.current.z, CAMERA_CONFIG.bounds.minZ, CAMERA_CONFIG.bounds.maxZ);

    const zoomScale = zoomRef.current / CAMERA_CONFIG.baseOffset[1];
    if (isDraggingRef.current && canDragCamera) {
      lookAtRef.current.copy(targetRef.current);
    } else {
      lookAtRef.current.lerp(targetRef.current, 1 - Math.exp(-CAMERA_CONFIG.targetLerp * delta));
    }
    desiredPositionRef.current.set(
      lookAtRef.current.x + CAMERA_CONFIG.baseOffset[0] * zoomScale,
      lookAtRef.current.y + zoomRef.current,
      lookAtRef.current.z + CAMERA_CONFIG.baseOffset[2] * zoomScale,
    );
    positionRef.current.lerp(
      desiredPositionRef.current,
      1 - Math.exp(-CAMERA_CONFIG.positionLerp * delta),
    );

    camera.position.copy(positionRef.current);
    camera.lookAt(lookAtRef.current);
  });

  if (debugFreeCamera) {
    return (
      <OrbitControls
        ref={orbitRef}
        args={[camera, gl.domElement]}
        enableDamping
        dampingFactor={0.12}
        minDistance={3}
        maxDistance={200}
        maxPolarAngle={Math.PI * 0.48}
      />
    );
  }

  return null;
};

export default CameraController;
