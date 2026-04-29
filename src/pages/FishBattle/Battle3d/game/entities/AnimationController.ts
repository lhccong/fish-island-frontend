import * as THREE from 'three';
import type { AnimationClipRequest, AnimationState, HeroAnimationConfig } from '../../types/game';

const STANDARD_STATES: AnimationState[] = ['standby', 'idle', 'run', 'attack', 'cast', 'death'];

/**
 * 英雄动画状态机
 * 支持 idle/run/attack/cast/death 状态切换，带 crossFade
 */
export class AnimationController {
  private mixer: THREE.AnimationMixer;
  private animationConfig?: HeroAnimationConfig;
  // @ts-ignore
  private stateActions: Map<AnimationState, THREE.AnimationAction[]> = new Map(
    STANDARD_STATES.map((state) => [state, []] as const),
  );
  private clipActions: Map<string, THREE.AnimationAction> = new Map();
  private currentState: AnimationState = 'idle';
  private currentAction: THREE.AnimationAction | null = null;
  private currentMode: 'state' | 'clip' = 'state';
  private crossFadeDuration: number;
  /** 去抖动：记录最近一次状态切换的时间戳和上一个状态，
   * 仅对"乒乓切换"（A→B→A 模式）进行去抖，正常的新状态切换不受阻。 */
  private lastStateChangeTime = 0;
  private previousState: AnimationState = 'idle';
  private static readonly STATE_DEBOUNCE_MS = 100;
  private handleFinished = (event: { action?: THREE.AnimationAction }) => {
    if (this.currentMode !== 'clip' || !event.action || event.action !== this.currentAction) {
      return;
    }

    this.currentMode = 'state';
    /* 重置去抖状态：clip 结束后首次状态切换不应被陈旧的 debounce 数据误拦。
     * 否则 clip 期间存储的 currentState 与 clip 前的 previousState 可能形成
     * 伪乒乓模式，导致 handleFinished 之后的第一次 setState 被错误跳过。 */
    this.lastStateChangeTime = 0;

    const fallbackAction = this.resolveStateAction(this.currentState);
    if (!fallbackAction) {
      return;
    }

    this.playAction(fallbackAction, {
      loop: this.currentState !== 'death',
      clampWhenFinished: this.currentState === 'death',
      playbackRate: 1,
      reset: true,
    });
  };

  constructor(
    model: THREE.Object3D,
    clips: THREE.AnimationClip[],
    animationConfig?: HeroAnimationConfig,
    crossFadeDuration = 0.3,
  ) {
    this.mixer = new THREE.AnimationMixer(model);
    this.animationConfig = animationConfig;
    this.crossFadeDuration = crossFadeDuration;
    this.mixer.addEventListener('finished', this.handleFinished);

    clips.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      this.clipActions.set(clip.name, action);
      const state = this.mapClipNameToState(clip.name);
      if (state) {
        this.stateActions.get(state)?.push(action);
      }
    });

    const idleAction = this.resolveStateAction('idle');
    if (idleAction) {
      this.playAction(idleAction, {
        loop: true,
        clampWhenFinished: false,
        playbackRate: 1,
        reset: false,
      });
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[AnimationController] No idle-like action resolved for model.', this.getAvailableClipNames());
    }
  }

  /** 将 clip 名称映射到标准状态名 */
  private mapClipNameToState(clipName: string): AnimationState | null {
    const lower = clipName.toLowerCase();
    const aliases = this.animationConfig?.stateAliases;

    if (lower.includes('standby') || lower.includes('wait') || lower.includes('relax') || lower.includes('rest')) return 'standby';

    for (const state of STANDARD_STATES) {
      const candidates = aliases?.[state];
      if (candidates?.some((candidate) => lower.includes(candidate.toLowerCase()))) {
        return state;
      }
    }

    if (lower.includes('idle') || lower.includes('stand')) return 'idle';
    if (lower.includes('run') || lower.includes('walk') || lower.includes('move')) return 'run';
    if (lower.includes('attack') || lower.includes('hit')) return 'attack';
    if (lower.includes('cast') || lower.includes('spell') || lower.includes('skill')) return 'cast';
    if (lower.includes('death') || lower.includes('die') || lower.includes('dead')) return 'death';
    return null;
  }

  private getPreferredStateAction(state: AnimationState): THREE.AnimationAction | undefined {
    const preferredClipName = this.animationConfig?.stateClips?.[state];
    if (preferredClipName) {
      const direct = this.clipActions.get(preferredClipName);
      if (direct) {
        return direct;
      }

      const lower = preferredClipName.toLowerCase();
      const fuzzyMatch = Array.from(this.clipActions.entries()).find(([clipName]) => clipName.toLowerCase().includes(lower))?.[1];
      if (fuzzyMatch) {
        return fuzzyMatch;
      }
    }

    return this.stateActions.get(state)?.[0];
  }

  private resolveStateAction(state: AnimationState): THREE.AnimationAction | undefined {
    if (state === 'idle') {
      return this.getPreferredStateAction('idle') || this.getPreferredStateAction('standby');
    }

    if (state === 'standby') {
      return this.getPreferredStateAction('standby') || this.getPreferredStateAction('idle');
    }

    return this.getPreferredStateAction(state) || this.getPreferredStateAction('idle') || this.getPreferredStateAction('standby');
  }

  private playAction(
    action: THREE.AnimationAction,
    options: {
      loop: boolean;
      clampWhenFinished: boolean;
      playbackRate?: number;
      reset: boolean;
    },
  ) {
    if (this.currentAction && this.currentAction !== action) {
      this.currentAction.fadeOut(this.crossFadeDuration);
    }

    action.enabled = true;
    action.loop = options.loop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.clampWhenFinished = options.clampWhenFinished;
    action.setEffectiveTimeScale(options.playbackRate ?? 1);

    if (options.reset) {
      action.reset();
    }

    action.fadeIn(this.crossFadeDuration).play();
    this.currentAction = action;
  }

  /** 切换到指定动画状态 */
  setState(newState: AnimationState) {
    if (this.currentMode === 'clip') {
      this.currentState = newState;
      return;
    }

    const prevState = this.currentState;
    this.currentState = newState;

    if (prevState === newState && this.currentAction) {
      const preferredAction = this.resolveStateAction(newState);
      if (!preferredAction || preferredAction === this.currentAction) {
        return;
      }
    }

    /* 乒乓去抖动：仅当检测到 A→B→A 式来回切换（即 newState 等于上一个前状态）
     * 且距上次状态切换不足 STATE_DEBOUNCE_MS 时才跳过此次 crossFade，
     * 避免网络快照延迟导致 idle↔run 高频乒乓时每帧都触发动画过渡。
     * 正常的非乒乓切换（如从 idle 首次进入 run）不受去抖影响，保持即时响应。 */
    const now = performance.now();
    if (prevState !== newState && this.lastStateChangeTime > 0
        && (now - this.lastStateChangeTime) < AnimationController.STATE_DEBOUNCE_MS
        && newState === this.previousState) {
      return;
    }

    const nextAction = this.resolveStateAction(newState);
    if (!nextAction) {
      return;
    }

    if (prevState !== newState) {
      this.previousState = prevState;
      this.lastStateChangeTime = now;
    }

    this.currentMode = 'state';
    this.playAction(nextAction, {
      loop: newState !== 'death',
      clampWhenFinished: newState === 'death',
      playbackRate: 1,
      reset: false,
    });
  }

  playClip(request: AnimationClipRequest): boolean {
    const nextAction = this.clipActions.get(request.clipName);
    if (!nextAction) {
      return false;
    }

    const loop = request.loop ?? false;
    this.currentMode = 'clip';
    this.playAction(nextAction, {
      loop,
      clampWhenFinished: !loop,
      playbackRate: request.playbackRate,
      reset: request.reset ?? true,
    });
    return true;
  }

  cancelClip() {
    if (this.currentMode !== 'clip') {
      return;
    }

    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction = null;
    }

    this.currentMode = 'state';
  }

  /** 获取当前动画状态 */
  getState(): AnimationState {
    return this.currentState;
  }

  /** 每帧更新 mixer */
  update(delta: number) {
    this.mixer.update(delta);
  }

  /** 获取所有可用动画名称 */
  getAvailableStates(): string[] {
    return STANDARD_STATES.filter((state) => (this.stateActions.get(state)?.length ?? 0) > 0);
  }

  getAvailableClipNames(): string[] {
    return Array.from(this.clipActions.keys());
  }

  /** 释放资源 */
  dispose() {
    this.mixer.removeEventListener('finished', this.handleFinished);
    this.mixer.stopAllAction();
    this.stateActions.clear();
    this.clipActions.clear();
  }
}
