/**
 * 快照环形缓冲区，用于远端英雄的时间插值渲染。
 *
 * 核心思路：
 * 1. 服务端快照到达后按 serverTime 排序入缓冲区。
 * 2. 渲染时计算 renderTime = estimatedServerTime - interpolationDelayMs，
 *    从缓冲区中找到包夹 renderTime 的两帧快照 {from, to}。
 * 3. 计算 alpha = (renderTime - from.serverTime) / (to.serverTime - from.serverTime)，
 *    对远端英雄做线性插值。
 *
 * 泛型 T 为快照类型，要求至少包含 serverTime 字段。
 */

export interface Timestamped {
  serverTime: number;
  serverTick?: number;
}

export interface InterpolationPair<T extends Timestamped> {
  from: T;
  to: T;
  /** 0 ~ 1 之间的插值因子 */
  alpha: number;
}

export interface InterpolationFrame<T extends Timestamped> extends InterpolationPair<T> {
  cacheKey: string;
}

const DEFAULT_MAX_SIZE = 8;

export class SnapshotBuffer<T extends Timestamped> {
  private buffer: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize?: number) {
    this.maxSize = maxSize ?? DEFAULT_MAX_SIZE;
  }

  /**
   * 推入一帧快照。自动按 serverTime 升序插入并裁剪过旧数据。
   */
  push(snapshot: T): void {
    /* 插入到正确位置（绝大多数情况下是末尾） */
    const st = snapshot.serverTime;
    if (this.buffer.length === 0 || st >= this.buffer[this.buffer.length - 1].serverTime) {
      this.buffer.push(snapshot);
    } else {
      /* 乱序到达，找到合适位置插入 */
      let i = this.buffer.length - 1;
      while (i >= 0 && this.buffer[i].serverTime > st) {
        i--;
      }
      this.buffer.splice(i + 1, 0, snapshot);
    }

    /* 裁剪 */
    while (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * 获取用于插值的快照对。
   *
   * @param renderTime 渲染时间（服务端时钟域）
   * @returns 插值对，或 null（缓冲区不足）
   */
  getInterpolationPair(renderTime: number): InterpolationPair<T> | null {
    if (this.buffer.length < 2) {
      return null;
    }

    /* 找到第一个 serverTime > renderTime 的帧 */
    let toIndex = -1;
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i].serverTime > renderTime) {
        toIndex = i;
        break;
      }
    }

    if (toIndex <= 0) {
      /* renderTime 在所有快照之前或等于第一帧 → 使用最早两帧做外推（钳位 alpha 到 0） */
      if (toIndex === 0) {
        return {
          from: this.buffer[0],
          to: this.buffer[1],
          alpha: 0,
        };
      }
      /* renderTime 在所有快照之后 → 使用最新两帧做外推（alpha > 1，由调用方决定是否钳位） */
      const last = this.buffer.length - 1;
      const from = this.buffer[last - 1];
      const to = this.buffer[last];
      const span = to.serverTime - from.serverTime;
      if (span <= 0) {
        return { from, to, alpha: 1 };
      }
      const alpha = (renderTime - from.serverTime) / span;
      return { from, to, alpha: Math.min(alpha, 2) };
    }

    const from = this.buffer[toIndex - 1];
    const to = this.buffer[toIndex];
    const span = to.serverTime - from.serverTime;
    if (span <= 0) {
      return { from, to, alpha: 1 };
    }
    const alpha = (renderTime - from.serverTime) / span;
    return { from, to, alpha: Math.max(0, Math.min(1, alpha)) };
  }

  /**
   * 获取带 cacheKey 的插值帧视图，便于上层复用整帧计算结果。
   */
  getInterpolationFrame(renderTime: number): InterpolationFrame<T> | null {
    const pair = this.getInterpolationPair(renderTime);
    if (!pair) {
      return null;
    }
    const alphaKey = Math.round(pair.alpha * 1000);
    return {
      ...pair,
      cacheKey: `${pair.from.serverTime}:${pair.to.serverTime}:${alphaKey}`,
    };
  }

  /**
   * 获取最新快照。
   */
  latest(): T | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  /**
   * 获取缓冲区大小。
   */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * 清空缓冲区。
   */
  clear(): void {
    this.buffer = [];
  }
}
