import { GAME_CONFIG } from './gameConfig';

/**
 * 相机配置导出类型。
 * 这里将总配置中的相机参数展开为可复用的运行时对象，避免被字面量类型过度收窄。
 */
export const CAMERA_CONFIG: {
  /** 相机视野角度。 */
  fov: number;
  /** 相机近裁剪面。 */
  near: number;
  /** 相机远裁剪面。 */
  far: number;
  /** 初始是否锁定到本地玩家。 */
  defaultLocked: boolean;
  /** 初始观察目标点。 */
  initialTarget: [number, number, number];
  /** 默认视角偏移量。 */
  baseOffset: [number, number, number];
  /** 初始镜头缩放值。 */
  initialZoom: number;
  /** 是否启用开场远→近推镜动画。 */
  introEnabled: boolean;
  /** 开场推镜起始缩放值（远景）。 */
  introStartZoom: number;
  /** 开场推镜插值速率。 */
  introSpeed: number;
  /** 视角锁定/解锁切换快捷键。 */
  lockToggleKey: string;
  /** 左键拖动屏幕时是否自动解锁视角跟随。 */
  dragUnlocksCamera: boolean;
  /** 滚轮缩放最小值。 */
  minZoom: number;
  /** 滚轮缩放最大值。 */
  maxZoom: number;
  /** 缩放步进。 */
  zoomStep: number;
  /** 左键拖动镜头时的基础平移速度。 */
  dragPanSpeed: number;
  /** 边缘滚屏触发区域宽度。 */
  edgePanMargin: number;
  /** 边缘滚屏基础速度。 */
  edgePanSpeed: number;
  /** 是否允许边缘滚屏。 */
  enableEdgePan: boolean;
  /** 目标点插值速度。 */
  targetLerp: number;
  /** 相机位置插值速度。 */
  positionLerp: number;
  bounds: {
    /** 自由镜头最小 X。 */
    minX: number;
    /** 自由镜头最大 X。 */
    maxX: number;
    /** 自由镜头最小 Z。 */
    minZ: number;
    /** 自由镜头最大 Z。 */
    maxZ: number;
  };
} = {
  /** 从总配置展开一份可安全复用的相机配置对象。 */
  ...GAME_CONFIG.camera,
  /** 复制初始目标点，避免外部误改总配置引用。 */
  initialTarget: [...GAME_CONFIG.camera.initialTarget] as [number, number, number],
  /** 复制相机偏移量，保证运行时可安全读取。 */
  baseOffset: [...GAME_CONFIG.camera.baseOffset] as [number, number, number],
  /** 复制相机平移边界。 */
  bounds: { ...GAME_CONFIG.camera.bounds },
};
