import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { isHttpUrl, resolveAssetUrl } from './assetUrl';
import { assetCacheService } from './AssetCacheService';

function isSameOriginHttpUrl(url: string): boolean {
  if (!isHttpUrl(url) || typeof window === 'undefined') {
    return false;
  }

  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Three.js 工具封装类
 * 统一管理资源加载、缓存、释放
 */
class ThreejsHelper {
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private loadingManager: THREE.LoadingManager;
  private modelCache: Map<string, GLTF> = new Map();
  private gltfPromiseCache: Map<string, Promise<GLTF>> = new Map();
  private gltfAvailabilityCache: Map<string, boolean> = new Map();
  private gltfAvailabilityPromiseCache: Map<string, Promise<boolean>> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private onProgressCallback?: (progress: number) => void;
  private totalItems = 0;
  private loadedItems = 0;

  constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onStart = (_url, loaded, total) => {
      this.totalItems = total;
      this.loadedItems = loaded;
    };
    this.loadingManager.onProgress = (_url, loaded, total) => {
      this.totalItems = total;
      this.loadedItems = loaded;
      const progress = total > 0 ? (loaded / total) * 100 : 0;
      this.onProgressCallback?.(progress);
    };
    this.loadingManager.onError = (url) => {
      console.error(`[ThreejsHelper] Failed to load: ${url}`);
    };

    // GLTF Loader with Draco support
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.preload();
    this.gltfLoader.setDRACOLoader(dracoLoader);

    // Texture Loader
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
  }

  /** 设置加载进度回调 */
  setProgressCallback(callback: (progress: number) => void) {
    this.onProgressCallback = callback;
  }

  /** 获取当前加载进度 (0-100) */
  getProgress(): number {
    return this.totalItems > 0 ? (this.loadedItems / this.totalItems) * 100 : 0;
  }

  async canLoadGLTF(url: string): Promise<boolean> {
    if (!url) return false;
    const resolvedUrl = resolveAssetUrl(url) ?? url;

    if (this.modelCache.has(resolvedUrl)) {
      return true;
    }

    if (this.gltfAvailabilityCache.has(resolvedUrl)) {
      return this.gltfAvailabilityCache.get(resolvedUrl)!;
    }

    if (this.gltfAvailabilityPromiseCache.has(resolvedUrl)) {
      return this.gltfAvailabilityPromiseCache.get(resolvedUrl)!;
    }

    /* ── Cache API 中已有持久化缓存，直接判定可用 ── */
    try {
      const cached = await assetCacheService.has(resolvedUrl);
      if (cached) {
        this.gltfAvailabilityCache.set(resolvedUrl, true);
        return true;
      }
    } catch { /* ignore */ }

    if (isHttpUrl(resolvedUrl) && !isSameOriginHttpUrl(resolvedUrl)) {
      this.gltfAvailabilityCache.set(resolvedUrl, true);
      return true;
    }

    const request = fetch(resolvedUrl, {
      method: 'HEAD',
      cache: 'no-store',
    }).then((response) => {
      if (!response.ok) {
        this.gltfAvailabilityCache.set(resolvedUrl, false);
        return false;
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      const isHtmlFallback = contentType.includes('text/html');
      const isBinaryLike = contentType === ''
        || contentType.includes('model/gltf-binary')
        || contentType.includes('model/gltf+json')
        || contentType.includes('application/octet-stream')
        || contentType.includes('application/gltf-buffer')
        || contentType.includes('application/json');

      const available = !isHtmlFallback && isBinaryLike;
      this.gltfAvailabilityCache.set(resolvedUrl, available);
      return available;
    }).catch(() => {
      this.gltfAvailabilityCache.set(resolvedUrl, false);
      return false;
    }).finally(() => {
      this.gltfAvailabilityPromiseCache.delete(resolvedUrl);
    });

    this.gltfAvailabilityPromiseCache.set(resolvedUrl, request);
    return request;
  }

  /**
   * 加载 glTF/GLB 模型
   * @param url 模型路径
   * @param useCache 是否使用缓存（默认 true）
   */
  async loadGLTF(url: string, useCache = true): Promise<GLTF> {
    if (!url) throw new Error('[ThreejsHelper] empty model URL');
    const resolvedUrl = resolveAssetUrl(url) ?? url;
    const available = await this.canLoadGLTF(resolvedUrl);
    if (!available) {
      throw new Error(`Model asset unavailable: ${resolvedUrl}`);
    }

    if (useCache && this.modelCache.has(resolvedUrl)) {
      return this.modelCache.get(resolvedUrl)!;
    }

    if (useCache && this.gltfPromiseCache.has(resolvedUrl)) {
      return this.gltfPromiseCache.get(resolvedUrl)!;
    }

    const request = this.loadGLTFWithPersistentCache(resolvedUrl).finally(() => {
      if (useCache) {
        this.gltfPromiseCache.delete(resolvedUrl);
      }
    });

    if (useCache) {
      this.gltfPromiseCache.set(resolvedUrl, request);
    }

    return request;
  }

  /**
   * 内部方法：带持久化缓存的 GLTF 加载。
   * 优先尝试从 AssetCacheService 读取 ArrayBuffer 并通过 gltfLoader.parse 解析；
   * 失败时退回到原始 gltfLoader.load 并将结果回写 Cache API。
   */
  private async loadGLTFWithPersistentCache(resolvedUrl: string): Promise<GLTF> {
    /* ── 尝试从 Cache API 读取并 parse ── */
    try {
      const cachedBuffer = await assetCacheService.fetchAsArrayBuffer(resolvedUrl);
      if (cachedBuffer && cachedBuffer.byteLength > 0) {
        const gltf = await this.parseGLTFFromBuffer(cachedBuffer, resolvedUrl);
        this.postProcessGLTF(gltf, resolvedUrl, true);
        return gltf;
      }
    } catch {
      /* Cache API 读取或 parse 失败，退回网络加载 */
    }

    /* ── 退回：传统 gltfLoader.load ── */
    return new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader.load(
        resolvedUrl,
        (gltf) => {
          this.postProcessGLTF(gltf, resolvedUrl, true);
          resolve(gltf);
        },
        undefined,
        (error) => {
          this.gltfAvailabilityCache.set(resolvedUrl, false);
          console.error(`[ThreejsHelper] GLTF load error: ${resolvedUrl}`, error);
          reject(error);
        },
      );
    });
  }

  /** 从 ArrayBuffer 解析 GLTF（复用已配置的 DRACOLoader） */
  private parseGLTFFromBuffer(buffer: ArrayBuffer, url: string): Promise<GLTF> {
    return new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader.parse(
        buffer,
        // resourcePath：用于解析相对引用的基路径
        url.substring(0, url.lastIndexOf('/') + 1),
        (gltf) => resolve(gltf),
        (error) => reject(error),
      );
    });
  }

  /** GLTF 加载后的通用后处理（阴影、缓存写入） */
  private postProcessGLTF(gltf: GLTF, resolvedUrl: string, saveToMemory: boolean): void {
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.gltfAvailabilityCache.set(resolvedUrl, true);
    if (saveToMemory) {
      this.modelCache.set(resolvedUrl, gltf);
    }
  }

  /**
   * 克隆已缓存的模型场景（独立实例，共享几何体/材质）
   */
  cloneModel(url: string): THREE.Group | null {
    const resolvedUrl = resolveAssetUrl(url) ?? url;
    const cached = this.modelCache.get(resolvedUrl);
    if (!cached) return null;
    return SkeletonUtils.clone(cached.scene) as THREE.Group;
  }

  getCachedGLTF(url: string): GLTF | null {
    const resolvedUrl = resolveAssetUrl(url) ?? url;
    return this.modelCache.get(resolvedUrl) ?? null;
  }

  createPreparedModelFromCache(
    url: string,
    options?: {
      targetHeight?: number;
      modelScale?: number;
      groundOffsetY?: number;
      suppressGroundOverlay?: boolean;
    },
  ): { gltf: GLTF; wrapper: THREE.Group } | null {
    const gltf = this.getCachedGLTF(url);
    if (!gltf) {
      return null;
    }

    return {
      gltf,
      wrapper: this.prepareModel(
        gltf,
        options?.targetHeight,
        options?.modelScale,
        options?.groundOffsetY,
        options?.suppressGroundOverlay,
      ),
    };
  }

  /**
   * 加载纹理
   */
  async loadTexture(url: string, useCache = true): Promise<THREE.Texture> {
    const resolvedUrl = resolveAssetUrl(url) ?? url;

    if (useCache && this.textureCache.has(resolvedUrl)) {
      return this.textureCache.get(resolvedUrl)!;
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        resolvedUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          if (useCache) {
            this.textureCache.set(resolvedUrl, texture);
          }
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`[ThreejsHelper] Texture load error: ${resolvedUrl}`, error);
          reject(error);
        },
      );
    });
  }

  /**
   * 从 GLTF 获取动画 clips
   */
  getAnimationClips(gltf: GLTF): THREE.AnimationClip[] {
    return gltf.animations || [];
  }

  /**
   * 按名称查找动画 clip
   */
  findAnimationClip(clips: THREE.AnimationClip[], name: string): THREE.AnimationClip | undefined {
    return clips.find((clip) => clip.name.toLowerCase().includes(name.toLowerCase()));
  }

  /**
   * 创建动画 Mixer 并播放指定动画
   */
  createAnimationMixer(
    model: THREE.Object3D,
    clips: THREE.AnimationClip[],
    defaultClipName = 'idle',
  ): { mixer: THREE.AnimationMixer; actions: Map<string, THREE.AnimationAction> } {
    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map<string, THREE.AnimationAction>();

    clips.forEach((clip) => {
      const action = mixer.clipAction(clip);
      actions.set(clip.name, action);
    });

    // 播放默认动画
    const defaultClip = this.findAnimationClip(clips, defaultClipName);
    if (defaultClip) {
      const action = mixer.clipAction(defaultClip);
      action.play();
    } else if (clips.length > 0) {
      mixer.clipAction(clips[0]).play();
    }

    return { mixer, actions };
  }

  /**
   * 动画切换（带 crossFade）
   */
  crossFadeAnimation(
    _mixer: THREE.AnimationMixer,
    actions: Map<string, THREE.AnimationAction>,
    fromName: string,
    toName: string,
    duration = 0.3,
  ) {
    const fromAction = actions.get(fromName);
    const toAction = actions.get(toName);
    if (!fromAction || !toAction) return;

    toAction.reset().fadeIn(duration).play();
    fromAction.fadeOut(duration);
  }

  getModelMetrics(model: THREE.Object3D): {
    size: THREE.Vector3;
    center: THREE.Vector3;
    minY: number;
    height: number;
    maxDim: number;
    isValid: boolean;
  } {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const height = box.max.y - box.min.y;
    const maxDim = Math.max(size.x, size.y, size.z);
    const isValid = [size.x, size.y, size.z, center.x, center.y, center.z, box.min.y, height, maxDim]
      .every((value) => Number.isFinite(value)) && maxDim > 0.001;

    return {
      size,
      center,
      minY: box.min.y,
      height,
      maxDim,
      isValid,
    };
  }

  /**
   * 对设施模型关闭所有 mesh 的 receiveShadow，
   * 避免塔等设施底部结构盖住桥面上的角色阴影。
   */
  private disableReceiveShadow(wrapper: THREE.Group) {
    wrapper.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = false;
      }
    });
  }

  createModelInstance(
    gltf: GLTF,
    options?: {
      targetHeight?: number;
      modelScale?: number;
      groundOffsetY?: number;
      centerXZ?: boolean;
      groundToZero?: boolean;
      suppressGroundOverlay?: boolean;
    },
  ): THREE.Group {
    const originalScene = gltf.scene;
    const metrics = this.getModelMetrics(originalScene);

    if (!metrics.isValid) {
      throw new Error('Invalid model metrics');
    }

    const clonedScene = SkeletonUtils.clone(originalScene) as THREE.Group;
    const wrapper = new THREE.Group();
    const targetHeight = options?.targetHeight ?? 2.5;
    const modelScale = options?.modelScale ?? 1;
    const groundOffsetY = options?.groundOffsetY ?? 0;
    const centerXZ = options?.centerXZ ?? true;
    const groundToZero = options?.groundToZero ?? true;
    const suppressGroundOverlay = options?.suppressGroundOverlay ?? false;
    const normalizedHeight = metrics.height > 0.001 ? metrics.height : metrics.maxDim;
    const scale = (targetHeight / normalizedHeight) * modelScale;

    wrapper.add(clonedScene);
    wrapper.scale.setScalar(Number.isFinite(scale) && scale > 0 ? scale : 0.01);
    wrapper.position.set(
      centerXZ ? -metrics.center.x * wrapper.scale.x : 0,
      (groundToZero ? -metrics.minY * wrapper.scale.y : 0) + groundOffsetY,
      centerXZ ? -metrics.center.z * wrapper.scale.z : 0,
    );

    wrapper.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    if (suppressGroundOverlay) {
      this.disableReceiveShadow(wrapper);
    }

    return wrapper;
  }

  prepareModel(gltf: GLTF, targetHeight = 2.5, modelScale = 1, groundOffsetY = 0, suppressGroundOverlay = false): THREE.Group {
    return this.createModelInstance(gltf, {
      targetHeight,
      modelScale,
      groundOffsetY,
      centerXZ: true,
      groundToZero: true,
      suppressGroundOverlay,
    });
  }

  /**
   * 居中并缩放模型（兼容旧调用，直接修改传入对象）
   */
  centerAndScaleModel(model: THREE.Object3D, targetHeight = 2.5): void {
    const metrics = this.getModelMetrics(model);

    if (!metrics.isValid) {
      model.scale.setScalar(0.01);
      model.position.set(0, 0, 0);
      return;
    }

    const normalizedHeight = metrics.height > 0.001 ? metrics.height : metrics.maxDim;
    const scale = targetHeight / normalizedHeight;
    model.scale.setScalar(scale);
    model.position.set(
      -metrics.center.x * scale,
      -metrics.minY * scale,
      -metrics.center.z * scale,
    );
  }

  /**
   * 释放指定缓存资源
   */
  disposeModel(url: string) {
    const resolvedUrl = resolveAssetUrl(url) ?? url;
    const cached = this.modelCache.get(resolvedUrl);
    if (cached) {
      cached.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      this.modelCache.delete(resolvedUrl);
    }
    this.gltfPromiseCache.delete(resolvedUrl);
    this.gltfAvailabilityCache.delete(resolvedUrl);
    this.gltfAvailabilityPromiseCache.delete(resolvedUrl);
  }

  disposeTexture(url: string) {
    const resolvedUrl = resolveAssetUrl(url) ?? url;
    const cached = this.textureCache.get(resolvedUrl);
    if (cached) {
      cached.dispose();
      this.textureCache.delete(resolvedUrl);
    }
  }

  /** 释放所有缓存 */
  disposeAll() {
    this.modelCache.forEach((_, url) => this.disposeModel(url));
    this.textureCache.forEach((_, url) => this.disposeTexture(url));
  }
}

// 单例导出
export const threejsHelper = new ThreejsHelper();
export default ThreejsHelper;
