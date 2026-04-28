import * as THREE from 'three';

/**
 * 本地玩家客户端预测 + 服务端 reconciliation。
 *
 * 工作流程：
 * 1. 玩家发出移动指令时，调用 issueMove/issueStop，立即在本地预测位置变化。
 * 2. 每帧调用 predict(delta) 推进本地预测位置（按 moveSpeed 向 moveTarget 移动）。
 * 3. 收到服务端快照时，调用 onServerSnapshot：
 *    a. 以服务端位置为基准（因为服务端是权威）
 *    b. 丢弃 seq ≤ lastProcessedInputSeq 的旧输入
 *    c. 从服务端位置起，重放所有未确认的输入（每个输入按固定 tickDt 推进）
 *    d. 得到最终预测位置
 *
 * 为避免视觉跳变，预测位置与渲染位置之间使用 lerp 平滑。
 */

export interface PredictionInput {
  seq: number;
  type: 'move' | 'stop';
  /** move 目标点 */
  targetX?: number;
  targetZ?: number;
  /** 时间戳（毫秒），用于诊断 */
  timestamp: number;
}

export interface PredictedState {
  /** 预测后的世界坐标 */
  position: THREE.Vector3;
  /** 预测后的朝向弧度 */
  rotation: number;
  /** 当前移动目标 */
  moveTarget: THREE.Vector3 | null;
  /** 是否正在移动 */
  isMoving: boolean;
}

/** 地图边界常量，与后端保持一致 */
const MAP_X_MIN = -125;
const MAP_X_MAX = 125;
const MAP_Z_MIN = -19.6;
const MAP_Z_MAX = 19.6;
/** 到达目标的停止阈值，与后端保持一致 */
const STOP_THRESHOLD = 0.08;

const STRUCTURE_COLLIDERS: Array<[number, number, number]> = [
  [-25, 0, 2.5],
  [-55, 0, 2.5],
  [-100, -5.4, 2.5],
  [-100, 5.4, 2.5],
  [25, 0, 2.5],
  [55, 0, 2.5],
  [100, -5.4, 2.5],
  [100, 5.4, 2.5],
  [-80, 0, 5.5],
  [80, 0, 5.5],
  [-110, 0, 6.5],
  [115, 0, 6.5],
];
const CHAMPION_COLLISION_RADIUS = 0.5;

export class LocalPlayerPredictor {
  /** 未确认的输入缓冲区 */
  private inputBuffer: PredictionInput[] = [];
  /** 当前输入序列号（单调递增） */
  private currentSeq = 0;

  /** 正确的移动目标（通过输入重放始终保持正确） */
  private currentMoveTarget: THREE.Vector3 | null = null;
  private moveSpeed = 3;
  private lastAckedSeq = 0;
  private _initialized = false;
  private predictedRotation = 0;

  /** 临时向量，避免 GC */
  private readonly _tmpDir = new THREE.Vector3();

  /* ── Demo 风格渲染管线（与 demo 完全一致的策略） ──
   * targetPosition = 服务端权威位置 + 帧间外推
   * visualPosition = targetPosition 的 lerp 平滑输出
   * 相机和英雄共享 visualPosition，永远同步，不做 reconciliation。 */
  private serverPosition = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private visualPosition = new THREE.Vector3();
  private visualRotation = 0;
  private visualInitialized = false;
  /** 超过此距离平方时硬 snap */
  private static readonly SNAP_DIST_SQ = 4.0;
  /** 视觉 lerp 速率：正常帧近乎即时追踪，快照到达时 3-5 帧平滑收敛 */
  private static readonly VISUAL_LERP_RATE = 35;
  /**
   * 漂移修正速率。每帧温和地将 targetPosition 拉向 serverPosition。
   * 值远低于外推速度，方向切换时后撤不可感知；停止后通过 snap 快速对齐。
   */
  private static readonly DRIFT_CORRECTION_RATE = 2;
  /** 停止状态的视觉 lerp 速率（低于移动时的 35，确保 stop/cast 后位置过渡平滑不瞬移） */
  private static readonly STOPPED_VISUAL_LERP_RATE = 8;
  private movementLockedUntil = 0;
  /** 施法朝向保护截止时间：在此之前 onServerSnapshot 不覆盖 predictedRotation */
  private castRotationProtectedUntil = 0;
  private static readonly CAST_ROTATION_PROTECT_MS = 300;

  constructor(private tickDt = 0.05) {}

  /**
   * 初始化预测器状态（加入房间时 / 重连时调用）。
   */
  init(position: THREE.Vector3, rotation: number, moveSpeed: number): void {
    this.serverPosition.copy(position);
    this.targetPosition.copy(position);
    this.visualPosition.copy(position);
    this.visualRotation = rotation;
    this.predictedRotation = rotation;
    this.moveSpeed = moveSpeed;
    this.currentMoveTarget = null;
    this.inputBuffer = [];
    this.currentSeq = 0;
    this.lastAckedSeq = 0;
    this._initialized = true;
    this.visualInitialized = true;
    this.movementLockedUntil = 0;
  }

  /** 是否已初始化（收到首个快照后为 true）。 */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * 发出移动指令。返回分配的 seq 供网络发送。
   */
  issueMove(targetX: number, targetZ: number): number {
    const seq = ++this.currentSeq;
    const input: PredictionInput = {
      seq,
      type: 'move',
      targetX,
      targetZ,
      timestamp: Date.now(),
    };
    this.inputBuffer.push(input);
    this.currentMoveTarget = new THREE.Vector3(
      clamp(targetX, MAP_X_MIN, MAP_X_MAX),
      0,
      clamp(targetZ, MAP_Z_MIN, MAP_Z_MAX),
    );
    return seq;
  }

  /**
   * 发出停止指令。返回分配的 seq。
   */
  issueStop(): number {
    const seq = ++this.currentSeq;
    const input: PredictionInput = {
      seq,
      type: 'stop',
      timestamp: Date.now(),
    };
    this.inputBuffer.push(input);
    this.currentMoveTarget = null;
    return seq;
  }

  /**
   * 立即设置预测朝向（施法转向时调用），跳过等待服务端快照。
   */
  setFacingRotation(rotation: number): void {
    this.predictedRotation = rotation;
    this.visualRotation = rotation;
    this.castRotationProtectedUntil = Date.now() + LocalPlayerPredictor.CAST_ROTATION_PROTECT_MS;
  }

  applyMovementLock(durationMs: number): void {
    const nextLockedUntil = Date.now() + Math.max(0, durationMs);
    this.movementLockedUntil = Math.max(this.movementLockedUntil, nextLockedUntil);
    this.currentMoveTarget = null;
    /* 保留 stop 类型输入以维持 seq 对账连续性，仅丢弃 move 类型外推目标。 */
    this.inputBuffer = this.inputBuffer.filter((input) => input.type !== 'move');
    /* 冻结 targetPosition 到当前视觉位置，防止后续漂移修正拉偏。 */
    if (this.visualInitialized) {
      this.targetPosition.copy(this.visualPosition);
    }
  }

  private isMovementLocked(now = Date.now()): boolean {
    return this.movementLockedUntil > now;
  }

  /**
   * 每帧推进渲染位置（Demo 风格：外推 + lerp）。
   *
   * 与旧版 reconciliation 方案不同，此方法采用和 demo 完全一致的策略：
   * 1. 向 moveTarget 外推 targetPosition（服务端快照间保持连续移动）
   * 2. visualPosition 始终 lerp 追踪 targetPosition（平滑一切跳变）
   * 不做位置重放，不做偏差修正——位置权威性完全交给服务端快照。
   */
  predict(delta: number): PredictedState {
    const movementLocked = this.isMovementLocked();

    /* 0. 漂移修正：温和地将 targetPosition 拉向最新服务端位置。
     *    有未确认的 stop 指令时跳过——客户端已决定停止，不应被仍在前进的服务端位置拉偏。
     *    方向相反时跳过——服务端会通过后续快照自然追上。 */
    const hasPendingStop = this.inputBuffer.some(i => i.type === 'stop');
    const cdx = this.serverPosition.x - this.targetPosition.x;
    const cdz = this.serverPosition.z - this.targetPosition.z;
    const cdistSq = cdx * cdx + cdz * cdz;
    if (!movementLocked && !hasPendingStop && cdistSq > 0.0001 && cdistSq < LocalPlayerPredictor.SNAP_DIST_SQ) {
      let applyDrift = true;
      if (this.currentMoveTarget) {
        const mdx = this.currentMoveTarget.x - this.targetPosition.x;
        const mdz = this.currentMoveTarget.z - this.targetPosition.z;
        if (cdx * mdx + cdz * mdz < 0) {
          applyDrift = false;
        }
      }
      if (applyDrift) {
        const ct = 1 - Math.exp(-LocalPlayerPredictor.DRIFT_CORRECTION_RATE * delta);
        this.targetPosition.x += cdx * ct;
        this.targetPosition.z += cdz * ct;
      }
    }

    /* 1. 外推：向当前 moveTarget 推进 targetPosition */
    if (!movementLocked && this.currentMoveTarget) {
      const dir = this._tmpDir;
      dir.set(
        this.currentMoveTarget.x - this.targetPosition.x,
        0,
        this.currentMoveTarget.z - this.targetPosition.z,
      );
      const dist = dir.length();
      if (dist > STOP_THRESHOLD) {
        dir.divideScalar(dist);
        const step = Math.min(dist, this.moveSpeed * delta);
        this.targetPosition.x = clamp(
          this.targetPosition.x + dir.x * step, MAP_X_MIN, MAP_X_MAX,
        );
        this.targetPosition.z = clamp(
          this.targetPosition.z + dir.z * step, MAP_Z_MIN, MAP_Z_MAX,
        );
        resolveStructureCollision(this.targetPosition);
        /* 施法朝向保护期内不覆盖——避免移动外推把刚 snap 的施法朝向冲掉 */
        if (this.castRotationProtectedUntil <= Date.now()) {
          this.predictedRotation = Math.atan2(dir.x, dir.z);
        }
      }
    }

    /* 2. 平滑：visualPosition lerp 追踪 targetPosition */
    if (!this.visualInitialized) {
      this.visualPosition.copy(this.targetPosition);
      this.visualRotation = this.predictedRotation;
      this.visualInitialized = true;
    } else {
      const dx = this.targetPosition.x - this.visualPosition.x;
      const dz = this.targetPosition.z - this.visualPosition.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > LocalPlayerPredictor.SNAP_DIST_SQ) {
        this.visualPosition.copy(this.targetPosition);
      } else {
        /* 移动中用高速 lerp(35) 保持响应；停止/施法后用低速 lerp(8) 平滑过渡 */
        const lerpRate = this.currentMoveTarget
          ? LocalPlayerPredictor.VISUAL_LERP_RATE
          : LocalPlayerPredictor.STOPPED_VISUAL_LERP_RATE;
        const t = 1 - Math.exp(-lerpRate * delta);
        this.visualPosition.x += dx * t;
        this.visualPosition.y = this.targetPosition.y;
        this.visualPosition.z += dz * t;
      }
      /* 旋转 lerp */
      const PI2 = Math.PI * 2;
      const rotDelta = ((this.predictedRotation - this.visualRotation + Math.PI) % PI2 + PI2) % PI2 - Math.PI;
      if (Math.abs(rotDelta) < 0.02) {
        this.visualRotation = this.predictedRotation;
      } else {
        this.visualRotation += rotDelta * (1 - Math.exp(-LocalPlayerPredictor.VISUAL_LERP_RATE * delta));
      }
    }

    return {
      position: this.visualPosition,
      rotation: this.visualRotation,
      moveTarget: this.currentMoveTarget,
      isMoving: this.currentMoveTarget !== null,
    };
  }

  getCurrentState(): PredictedState {
    return {
      position: this.visualInitialized ? this.visualPosition : this.targetPosition,
      rotation: this.visualInitialized ? this.visualRotation : this.predictedRotation,
      moveTarget: this.currentMoveTarget,
      isMoving: this.currentMoveTarget !== null,
    };
  }

  /**
   * 收到服务端快照后更新状态（Demo 风格：无 reconciliation）。
   *
   * 仅将 targetPosition 重置到服务端权威位置，并通过重放输入类型确定正确的 moveTarget。
   * 位置平滑完全由 predict() 的外推 + lerp 管线处理。
   */
  onServerSnapshot(
    serverPosition: { x: number; y: number; z: number },
    serverRotation: number,
    serverMoveTarget: { x: number; y: number; z: number } | null,
    serverMoveSpeed: number,
    lastProcessedInputSeq: number,
  ): void {
    this.moveSpeed = serverMoveSpeed;
    this.lastAckedSeq = lastProcessedInputSeq;
    const movementLocked = this.isMovementLocked();

    /* 丢弃已确认的输入 */
    this.inputBuffer = this.inputBuffer.filter((input) => input.seq > lastProcessedInputSeq);

    /* 始终记录最新服务端权威位置（供 predict 漂移修正使用）。
     * 不再硬重置 targetPosition，避免方向切换时的后撤跳变。
     * 停止且无未确认输入时直接 snap，确保静止精度。 */
    this.serverPosition.set(serverPosition.x, serverPosition.y, serverPosition.z);
    /* 停止且无未确认输入时将 targetPosition 对齐到服务端权威位置。 */
    if (!movementLocked && this.inputBuffer.length === 0 && !serverMoveTarget) {
      this.targetPosition.set(serverPosition.x, serverPosition.y, serverPosition.z);
    }
    /* movementLocked 期间将 targetPosition 对齐到服务端权威位置。 */
    if (movementLocked) {
      this.targetPosition.set(serverPosition.x, serverPosition.y, serverPosition.z);
    }

    /* 通过重放未确认输入的类型确定正确的 moveTarget
     *（只重放指令类型，不做位置推进——位置由外推 + lerp 处理） */
    let replayTarget: THREE.Vector3 | null = null;
    if (!movementLocked) {
      replayTarget = serverMoveTarget
        ? new THREE.Vector3(serverMoveTarget.x, serverMoveTarget.y, serverMoveTarget.z)
        : null;
      for (const input of this.inputBuffer) {
        if (input.type === 'move' && input.targetX != null && input.targetZ != null) {
          replayTarget = new THREE.Vector3(
            clamp(input.targetX, MAP_X_MIN, MAP_X_MAX),
            0,
            clamp(input.targetZ, MAP_Z_MIN, MAP_Z_MAX),
          );
        } else if (input.type === 'stop') {
          replayTarget = null;
        }
      }
    }
    this.currentMoveTarget = replayTarget;
    /* 施法朝向保护期间不覆盖本地设置的朝向，避免旧快照把施法转向回退 */
    if (this.castRotationProtectedUntil <= Date.now()) {
      this.predictedRotation = serverRotation;
    }

    /* 大距离跳变（回城/传送）：硬 snap 视觉位置 */
    if (this.visualInitialized) {
      const dx = this.targetPosition.x - this.visualPosition.x;
      const dz = this.targetPosition.z - this.visualPosition.z;
      if (dx * dx + dz * dz > LocalPlayerPredictor.SNAP_DIST_SQ) {
        this.visualPosition.copy(this.targetPosition);
        this.visualRotation = serverRotation;
      }
    }
  }

  /**
   * 获取当前输入序列号（供网络发送使用）。
   */
  get seq(): number {
    return this.currentSeq;
  }

  /**
   * 获取未确认输入数量（诊断用）。
   */
  get pendingInputCount(): number {
    return this.inputBuffer.length;
  }

  /**
   * 重置（断线重连时调用）。
   */
  reset(): void {
    this.inputBuffer = [];
    this.currentSeq = 0;
    this.lastAckedSeq = 0;
    this.currentMoveTarget = null;
    this._initialized = false;
    this.visualInitialized = false;
    this.serverPosition.set(0, 0, 0);
    this.movementLockedUntil = 0;
    this.castRotationProtectedUntil = 0;
  }
}

function resolveStructureCollision(position: THREE.Vector3): void {
  for (const [cx, cz, structureRadius] of STRUCTURE_COLLIDERS) {
    const minDist = structureRadius + CHAMPION_COLLISION_RADIUS;
    const dx = position.x - cx;
    const dz = position.z - cz;
    const distSq = dx * dx + dz * dz;
    const minDistSq = minDist * minDist;

    if (distSq < minDistSq && distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const pushFactor = minDist / dist;
      position.x = cx + dx * pushFactor;
      position.z = cz + dz * pushFactor;
    } else if (distSq <= 1e-8) {
      position.x = cx + minDist;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
