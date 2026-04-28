/**
 * NTP 式客户端–服务端时钟同步。
 *
 * 原理：
 * 1. 客户端发送 battle:ping { clientSendTime }
 * 2. 服务端返回 battle:pong { clientSendTime, serverTime }
 * 3. RTT = now - clientSendTime
 * 4. oneWay ≈ RTT / 2
 * 5. offset = serverTime + oneWay - now  （正值 = 服务端领先客户端）
 *
 * 维护一个滑动窗口，取 RTT 最小的样本的 offset 作为最终估算，
 * 因为 RTT 最小的样本受排队延迟干扰最少，其 offset 最接近真实值。
 */

export interface ClockSyncSample {
  clientSendTime: number;
  clientReceiveTime: number;
  serverTime: number;
  rtt: number;
  offset: number;
}

export interface ClockSyncState {
  /** 已收集的样本数 */
  sampleCount: number;
  /** 当前估算的时钟偏移（毫秒），正值 = 服务端领先 */
  offset: number;
  /** 当前估算的 RTT（毫秒） */
  rtt: number;
  /** 最佳样本的 RTT（窗口内 RTT 最小值） */
  bestRtt: number;
}

const DEFAULT_WINDOW_SIZE = 8;
const DEFAULT_PING_INTERVAL_MS = 5000;
const DEFAULT_PING_TIMEOUT_MS = 4000;

export class ClockSync {
  private samples: ClockSyncSample[] = [];
  private readonly windowSize: number;
  private readonly pingIntervalMs: number;
  private readonly pingTimeoutMs: number;

  /** 当前最佳估算 */
  private _offset = 0;
  private _rtt = 0;
  private _bestRtt = Infinity;
  private _sampleCount = 0;

  /** 定时器 */
  private intervalId: ReturnType<typeof setInterval> | null = null;
  /** 发送 ping 的回调 */
  private sendPingFn: ((clientSendTime: number) => void) | null = null;
  /** 待回复的 ping 超时 */
  private pendingTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingClientSendTime: number | null = null;

  constructor(options?: {
    windowSize?: number;
    pingIntervalMs?: number;
    pingTimeoutMs?: number;
  }) {
    this.windowSize = options?.windowSize ?? DEFAULT_WINDOW_SIZE;
    this.pingIntervalMs = options?.pingIntervalMs ?? DEFAULT_PING_INTERVAL_MS;
    this.pingTimeoutMs = options?.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT_MS;
  }

  /**
   * 启动定时 ping。
   * @param sendPing 发送 ping 的回调，参数为 clientSendTime
   */
  start(sendPing: (clientSendTime: number) => void): void {
    this.sendPingFn = sendPing;
    this.stop();
    /* 立即发一次 */
    this.sendPing();
    this.intervalId = setInterval(() => this.sendPing(), this.pingIntervalMs);
  }

  stop(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.pendingTimeout != null) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    this.pendingClientSendTime = null;
  }

  /**
   * 重置所有状态（断线重连时调用）。
   */
  reset(): void {
    this.stop();
    this.samples = [];
    this._offset = 0;
    this._rtt = 0;
    this._bestRtt = Infinity;
    this._sampleCount = 0;
  }

  /**
   * 当收到 battle:pong 时调用。
   */
  onPong(serverTime: number, clientSendTime: number): void {
    const now = performance.now();
    const clientSendPerf = this.pendingClientSendTime;

    /* 清除超时计时器 */
    if (this.pendingTimeout != null) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    /* 容错：如果 clientSendTime 不匹配当前 pending，忽略 */
    if (clientSendPerf == null) {
      return;
    }
    this.pendingClientSendTime = null;

    const rtt = now - clientSendPerf;
    if (rtt < 0 || rtt > this.pingTimeoutMs) {
      return;
    }

    const oneWay = rtt / 2;
    /* offset = serverTime - (clientSendWallTime + oneWay)
     * 这里用 Date.now() 近似 clientSendWallTime + elapsed */
    const clientNowWall = Date.now();
    const offset = serverTime + oneWay - clientNowWall;

    const sample: ClockSyncSample = {
      clientSendTime,
      clientReceiveTime: clientNowWall,
      serverTime,
      rtt,
      offset,
    };

    this.samples.push(sample);
    if (this.samples.length > this.windowSize) {
      this.samples.shift();
    }
    this._sampleCount++;

    /* 从窗口中取 RTT 最小的样本的 offset */
    let bestSample = this.samples[0];
    for (const s of this.samples) {
      if (s.rtt < bestSample.rtt) {
        bestSample = s;
      }
    }
    this._bestRtt = bestSample.rtt;
    this._offset = bestSample.offset;
    this._rtt = rtt;
  }

  /**
   * 估算当前服务端时间（毫秒）。
   */
  estimatedServerTime(): number {
    return Date.now() + this._offset;
  }

  /**
   * 获取同步状态。
   */
  getState(): ClockSyncState {
    return {
      sampleCount: this._sampleCount,
      offset: Math.round(this._offset),
      rtt: Math.round(this._rtt),
      bestRtt: Math.round(this._bestRtt === Infinity ? 0 : this._bestRtt),
    };
  }

  get offset(): number { return this._offset; }
  get rtt(): number { return this._rtt; }
  get bestRtt(): number { return this._bestRtt; }
  get sampleCount(): number { return this._sampleCount; }

  private sendPing(): void {
    if (!this.sendPingFn) return;
    const clientSendTime = Date.now();
    this.pendingClientSendTime = performance.now();

    this.sendPingFn(clientSendTime);

    /* 超时处理 */
    if (this.pendingTimeout != null) {
      clearTimeout(this.pendingTimeout);
    }
    this.pendingTimeout = setTimeout(() => {
      this.pendingClientSendTime = null;
      this.pendingTimeout = null;
    }, this.pingTimeoutMs);
  }
}
