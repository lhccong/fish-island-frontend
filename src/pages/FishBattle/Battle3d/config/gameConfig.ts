import type { EmoteDefinition, HeroActionSlot, HeroAssetConfig, HeroLineupConfig, MapConfig } from '../types/game';
import { MULTIPLAYER_RUNTIME_CONFIG, MULTIPLAYER_SPAWN_LAYOUTS, MULTIPLAYER_TEST_LINEUP } from './multiplayerShared.js';

/**
 * 地图基础配置。
 * 统一管理地图尺寸、可走范围、建筑布局和出生点位置。
 */
const MAP_CONFIG_VALUE: MapConfig = {
  /** 地图整体宽度。 */
  width: 160,
  /** 地图整体纵深。 */
  depth: 54,
  /** 中央桥面的有效宽度。 */
  bridgeWidth: 40,
  /** 中央桥面的有效长度。 */
  bridgeLength: 270,
  /** @see battle-map-config.json → map.playableBounds（运行时由 useSharedMapConfig 覆盖） */
  playableBounds: {
    minX: 0, maxX: 0, minZ: 0, maxZ: 0,
  },
  /** @see battle-map-config.json → structures.towers（运行时由 useSharedMapConfig 覆盖） */
  towers: [
    { position: [0, 0, 0], team: 'blue', type: 'outer' },
    { position: [0, 0, 0], team: 'blue', type: 'inner' },
    { position: [0, 0, 0], team: 'blue', type: 'nexusGuard' },
    { position: [0, 0, 0], team: 'blue', type: 'nexusGuard' },
    { position: [0, 0, 0], team: 'red', type: 'outer' },
    { position: [0, 0, 0], team: 'red', type: 'inner' },
    { position: [0, 0, 0], team: 'red', type: 'nexusGuard' },
    { position: [0, 0, 0], team: 'red', type: 'nexusGuard' },
  ],
  /** @see battle-map-config.json → structures.nexuses（运行时由 useSharedMapConfig 覆盖） */
  nexuses: [
    { position: [0, 0, 0], team: 'blue' },
    { position: [0, 0, 0], team: 'red' },
  ],
  /** @see battle-map-config.json → healthRelics.items（运行时由 useSharedMapConfig 覆盖） */
  healthRelics: [
    { position: [0, 0, 0] },
    { position: [0, 0, 0] },
    { position: [0, 0, 0] },
    { position: [0, 0, 0] },
  ],
  /** @see battle-map-config.json → structures.inhibitors（运行时由 useSharedMapConfig 覆盖） */
  inhibitors: [
    { position: [0, 0, 0], team: 'blue' },
    { position: [0, 0, 0], team: 'red' },
  ],
  /** 建筑碰撞体列表 [x, z, radius]，运行时由 useSharedMapConfig 从后端覆盖。 */
  structureColliders: [] as Array<[number, number, number]>,
  /** 双方初始编队落点。 */
  spawnLayouts: {
    /** 蓝队初始编队。 */
    blue: MULTIPLAYER_SPAWN_LAYOUTS.blue,
    /** 红队初始编队。 */
    red: MULTIPLAYER_SPAWN_LAYOUTS.red,
  },
};

/**
 * 游戏主配置总表。
 * 所有可动态调整的地图、镜头、HUD、环境、英雄资源与调试参数都优先收口在这里。
 */
export const GAME_CONFIG = {
  /** 地图主配置。 */
  map: MAP_CONFIG_VALUE,
  camera: {
    /** 相机视野角度。 */
    fov: 50,
    /** 相机近裁剪面。 */
    near: 0.1,
    /** 相机远裁剪面。 */
    far: 500,
    /** 初始是否锁定到本地玩家。 */
    defaultLocked: true,
    /** 初始观察目标点。 */
    initialTarget: [0, 0, 0] as [number, number, number],
    /** 默认斜视角偏移量。 */
    baseOffset: [-22, 44, 26] as [number, number, number],
    /** 初始镜头缩放值。 */
    initialZoom: 25,
    /** 是否启用开场远→近推镜动画。 */
    introEnabled: true,
    /** 开场推镜起始缩放值（远景），数值越大镜头越远。 */
    introStartZoom: 50,
    /** 开场推镜插值速率，值越大推进越快（每秒指数衰减系数）。 */
    introSpeed: 1,
    /** 玩家镜头锁定跟随开关快捷键（类似英雄联盟 Y 键）。 */
    lockToggleKey: 'KeyY',
    /** 左键拖动屏幕时是否自动解除玩家镜头跟随锁定。 */
    dragUnlocksCamera: true,
    /** 滚轮缩放最小值。 */
    minZoom: 10,
    /** 滚轮缩放最大值。 */
    maxZoom: 35,
    /** 每次滚轮缩放步进。 */
    zoomStep: 2,
    /** 左键拖动镜头时的基础平移速度。 */
    dragPanSpeed: 0.01,
    /** 边缘滚屏触发区域宽度，单位像素。 */
    edgePanMargin: 24,
    /** 边缘滚屏基础速度。 */
    edgePanSpeed: 16,
    /** 导播自由视角是否允许边缘滚屏。 */
    enableEdgePan: true,
    /** 目标点插值速度。 */
    targetLerp: 8,
    /** 相机位置插值速度。 */
    positionLerp: 7,
    bounds: {
      /** 自由镜头最小 X 边界。 */
      minX: -135,
      /** 自由镜头最大 X 边界。 */
      maxX: 135,
      /** 自由镜头最小 Z 边界。 */
      minZ: -26,
      /** 自由镜头最大 Z 边界。 */
      maxZ: 26,
    },
  },

  input: {
    rightClickIndicator: {
      /** 右键移动指示器显示时长。 */
      durationMs: 850,
      cursor: {
        /** 是否启用右键指针素材配置。 */
        enabled: true,
        /** 常态鼠标指针资源路径。 */
        defaultPath: '/cursors/summoner/normal.cur',
        /** 右键点击后的短暂反馈指针资源路径。 */
        clickPath: '/cursors/summoner/link.cur',
        /** 指针热点 X 坐标。 */
        hotspotX: 6,
        /** 指针热点 Y 坐标。 */
        hotspotY: 4,
        /** 点击反馈持续时长。 */
        clickFeedbackMs: 160,
        /** 自定义指针失效时回退到的 CSS 指针值。 */
        fallback: 'auto',
      },
      ground: {
        /** 地面落点标识模型路径。 */
        modelPath: undefined as string | undefined,
        /** 地面标识模型目标高度。 */
        targetHeight: 1.2,
        /** 地面标识模型待机动画片段名。 */
        animationClipName: undefined as string | undefined,
        /** 地面标识基础抬升高度，避免与地面闪烁。 */
        offsetY: 0.045,
        /** 地面标识外环半径。 */
        outerRadius: 0.55,
        /** 地面标识内环半径。 */
        innerRadius: 0.54,
        /** 落点中心亮斑半径。 */
        centerRadius: 0.2,
        /** 外环扩散的最大倍率。 */
        rippleScale: 1.38,
        /** 第一层外扩光环半径。 */
        rippleOuterRadius: 0.6,
        /** 第二层外扩光环半径。 */
        rippleFarOuterRadius: 0.7,
        /** 地面标识主色。 */
        color: 0xa9d8f0,
        /** 地面标识发光色。 */
        emissive: 0x5cb6df,
        /** 地面标识发光强度。 */
        emissiveIntensity: 1.2,
        /** 指令确认高光色。 */
        highlight: 0xeaf7ff,
      },
    },
    spectator: {
      /** 导播模式切换快捷键。 */
      toggleModeKey: 'KeyV',
      /** 切换到上一位观战目标快捷键。 */
      previousTargetKey: 'BracketLeft',
      /** 切换到下一位观战目标快捷键。 */
      nextTargetKey: 'BracketRight',
      /** 回到本地玩家快捷键。 */
      focusMeKey: 'KeyF',
    },
  },

  render: {
    /**
     * 渲染质量档位。
     * - 'low'：低端设备友好，关闭阴影/Bloom/雪花，DPR 限制为 1。
     * - 'medium'：平衡档，512 阴影贴图，DPR [1, 1.5]。
     * - 'high'：高画质，1024 阴影贴图，完整特效。
     * - 'ultra'：极高画质，2048 阴影贴图，DPR [1, 2]。
     */
    qualityPreset: 'low' as 'low' | 'medium' | 'high' | 'ultra',
    /** Canvas DPR 范围。 */
    dpr: [1, 1] as [number, number],
    /** 是否启用阴影。 */
    enableShadows: false,
    /** 阴影贴图分辨率。 */
    shadowMapSize: 512,
    /** 是否启用 Bloom。 */
    enableBloom: false,
    /** Bloom 强度。 */
    bloomIntensity: 0.28,
    /** Bloom 触发阈值。 */
    bloomThreshold: 0.9,
    /** Bloom 平滑系数。 */
    bloomSmoothing: 0.35,
    /** 是否启用雪花效果。 */
    enableSnow: false,
    /** 雪花粒子数量。 */
    snowCount: 0,
    /** 全局曝光值。 */
    toneMappingExposure: 1,
    /** 英雄模型默认标准化高度。 */
    heroTargetHeight: 2.6,
    /** 是否显示性能监控面板（FPS / CPU / GPU / draw calls / 三角形等）。 */
    showPerfMonitor: false,
  },

  /** 空间音效配置。借鉴英雄联盟的距离衰减与左右声道定位。 */
  audio: {
    /** 是否启用空间音效（关闭则退回固定音量播放）。 */
    enabled: true,
    /** 非本机英雄语音的额外音量倍率。1 为原始音量，0.5 为半音量。 */
    remoteVoiceVolumeMultiplier: 0.3,
    /** 全音量范围半径（距离本机英雄），在此半径内音量不衰减。 */
    innerRadius: 15,
    /** 音量完全衰减到 0 的距离。 */
    outerRadius: 20,
    /** 衰减模型: 'linear' | 'inverse' | 'exponential'。 */
    distanceModel: 'linear' as DistanceModelType,
    /** 衰减因子（仅 inverse / exponential 模型生效）。 */
    rolloffFactor: 1,
    /** 超过此距离的音效直接不播放，节省资源。 */
    maxAudioDistance: 25,
  },

  /** 简易视野配置。敌方英雄超出视距时隐藏，无战争迷雾贴图。 */
  vision: {
    /** 是否启用简易视野系统。 */
    enabled: true,
    /** 己方英雄视野半径（单位：世界坐标）。 */
    sightRadius: 35,
    /** 超出视距后额外保留的缓冲距离（迟滞），防止视距边缘反复闪烁。 */
    hysteresis: 3,
  },

  hud: {
    overhead: {
      /** 头顶 HUD 纹理宽度。 */
      textureWidth: 420,
      /** 头顶 HUD 纹理高度。 */
      textureHeight: 164,
      /** 自己名字字号。 */
      nameFontSize: 30,
      /** 其他角色名字字号。 */
      secondaryNameFontSize: 28,
      /** 血量数字字号。 */
      hpValueFontSize: 20,
      /** 蓝量数字字号。 */
      mpValueFontSize: 15,
      /** 等级数字字号。 */
      levelFontSize: 20,
      /** 血条分段数量。 */
      hpSegments: 24,
      /** 血条 sprite 的 Y 轴挂点。 */
      hpSpritePositionY: 5.0,
      /** 血条 sprite 的缩放尺寸。 */
      hpSpriteScale: [5.4, 2.26, 1] as [number, number, number],
      /** 表情 sprite 的 Y 轴挂点。 */
      emoteSpritePositionY: 8.0,
      /** 表情 sprite 的缩放尺寸。 */
      emoteSpriteScale: [1.5, 1.5, 1] as [number, number, number],
    },
  },

  emotes: {
    /** 可选表情定义列表。支持直接增删改以实现自定义表情。 */
    definitions: [
      {
        /** 表情唯一标识。 */
        id: 'poro',
        /** 表情使用的 emoji 字符。 */
        emoji: '🐾',
        /** UI 中显示的中文名称。 */
        label: '魄罗',
        /** 表情主色。 */
        color: '#d8f3ff',
        /** 表情强调色。 */
        accent: '#79d9ff',
      },
      {
        id: 'laugh',
        emoji: '😄',
        label: '大笑',
        color: '#ffe19a',
        accent: '#ffb348',
      },
      {
        id: 'cry',
        emoji: '😭',
        label: '哭泣',
        color: '#b8d9ff',
        accent: '#6aa7ff',
      },
      {
        id: 'angry',
        emoji: '😠',
        label: '愤怒',
        color: '#ffb2a8',
        accent: '#ff6a57',
      },
      {
        id: 'nice',
        emoji: '👍',
        label: 'Nice',
        color: '#b8ffd6',
        accent: '#4de191',
      },
      {
        id: 'love',
        emoji: '❤️',
        label: '爱心',
        color: '#ffc3db',
        accent: '#ff6ba3',
      },
      {
        id: 'surprised',
        emoji: '😲',
        label: '惊讶',
        color: '#f8edb6',
        accent: '#e7c84f',
      },
      {
        id: 'tease',
        emoji: '😜',
        label: '调皮',
        color: '#d9c8ff',
        accent: '#a56eff',
      },
    ] as EmoteDefinition[],
    /** 角色头顶表情持续显示时长。 */
    worldDisplayDurationMs: 1800,
    wheel: {
      /** 表情轮盘整体直径（含语音外圈）。 */
      size: 380,
      /** 表情轮盘外环半径。 */
      outerRadius: 116,
      /** 表情轮盘内环半径。 */
      innerRadius: 42,
      /** 命中检测在外环之外的额外容差。 */
      selectionOverflow: 26,
      /** 单个扇区表情图标容器尺寸。 */
      itemSize: 46,
      /** 扇区中表情 emoji 字号。 */
      emojiFontSize: 26,
      /** 扇区中表情名称字号。 */
      labelFontSize: 9,
      /** 轮盘中心标题字号。 */
      centerTitleFontSize: 9,
      /** 轮盘中心表情字号。 */
      centerEmojiFontSize: 22,
      /** 轮盘中心说明字号。 */
      centerHintFontSize: 10,
      /** 语音外圈半径。 */
      voiceRingOuterRadius: 158,
      /** 语音外圈单项容器尺寸。 */
      voiceRingItemSize: 40,
      /** 语音外圈 emoji 字号。 */
      voiceRingEmojiFontSize: 20,
      /** 语音外圈标签字号。 */
      voiceRingLabelFontSize: 12,
      /** 语音外圈选中溢出容差。 */
      voiceRingSelectionOverflow: 30,
    },
    announcement: {
      /** 是否显示表情发送侧栏轮播提示。 */
      enabled: true,
      /** 轮播栏出现在屏幕哪一侧。 */
      side: 'right' as 'left' | 'right',
      /** 轮播栏距离屏幕对应侧边缘的偏移像素。 */
      horizontalOffsetPx: 16,
      /** 轮播栏距离顶部的偏移像素。 */
      topOffsetPx: 80,
      /** 同时可见的最大提示条数。 */
      visibleCount: 4,
      /** 轮播队列最多保留的提示条数。 */
      maxQueue: 8,
      /** 单条提示的显示停留时长（毫秒），超时后开始淡出。 */
      itemDisplayDurationMs: 3000,
      /** 新条目滑入动画时长（毫秒）。 */
      enterAnimationMs: 300,
      /** 过期条目淡出动画时长（毫秒）。 */
      exitAnimationMs: 400,
      /** 条目之间的垂直间距像素。 */
      itemGapPx: 6,
      /** 提示条左右内边距。 */
      paddingX: 12,
      /** 提示条上下内边距。 */
      paddingY: 6,
      /** 提示文案字号。 */
      fontSize: 13,
      /** 提示中 emoji 字号。 */
      emojiFontSize: 18,
    },
  },

  environment: {
    bridge: {
      /** 桥体主体厚度。 */
      bodyHeight: 0.7,
      /** 桥体在桥宽基础上的额外外扩宽度。 */
      bodyExtraWidth: 0.42,
      /** 桥体支撑在桥宽基础上的额外外扩宽度。 */
      supportExtraWidth: 0.16,
      /** 上层护栏距离桥边的外扩距离。 */
      railingOffset: 0.62,
      /** 下层护栏距离桥边的外扩距离。 */
      lowerRailingOffset: 0.5,
      /** 桥面主平面高度。 */
      topSurfaceY: 0.024,
      /** 桥面冰层装饰高度。 */
      iceOverlayY: 0.086,
      /** 桥侧描边高度。 */
      edgeLineY: 0.134,
      /** 桥中央主高亮高度。 */
      centerLineY: 0.172,
      /** 桥中央扩散高亮高度。 */
      centerGlowY: 0.118,
      /** 中央遗迹底盘高度。 */
      ruinsBaseY: 0.028,
      /** 中央遗迹光环高度。 */
      ruinsRingY: 0.082,
      /** 桥体支撑距离桥两端的内缩距离。 */
      supportInsetX: 50,
      /** 桥体支撑沿 X 轴的间隔。 */
      supportSpacing: 20,
      /** 围栏立柱距离桥两端的内缩距离。 */
      railingPostInsetX: 32,
      /** 围栏立柱沿 X 轴的间隔。 */
      railingPostSpacing: 6,
      /** 围栏横梁距离桥两端的内缩距离。 */
      railingBeamInsetX: 30,
      /** 两端装饰柱距离桥两端的内缩距离。 */
      pillarInsetX: 30,
    },
    /** 中央遗迹（桥面正中心的悬浮冰晶区域）。@see battle-map-config.json → ruins */
    ruins: {
      modelPath: undefined as string | undefined,
      targetHeight: 0,
      rotationY: 0,
      idleClip: undefined as string | undefined,
    },
    /** 草丛视觉配置。@see battle-map-config.json → bushes.visual */
    bushes: {
      left:   { x: 0, wallInset: 0, size: [0, 0, 0] as [number, number, number], modelPath: undefined as string | undefined, targetHeight: 0, rotationY: 0, animations: { idleClip: undefined as string | undefined } },
      center: { x: 0, wallInset: 0, size: [0, 0, 0] as [number, number, number], modelPath: undefined as string | undefined, targetHeight: 0, rotationY: 0, animations: { idleClip: undefined as string | undefined } },
      right:  { x: 0, wallInset: 0, size: [0, 0, 0] as [number, number, number], modelPath: undefined as string | undefined, targetHeight: 0, rotationY: 0, animations: { idleClip: undefined as string | undefined } },
    },
    /** 实例化草地配置。@see battle-map-config.json → bushes.grass */
    grass: {
      modelPath: undefined as string | undefined,
      count: 0,
      scaleMin: 0,
      scaleMax: 0,
      heightScale: 0,
      swayIntensity: 0,
    },
    /** 防御塔视觉配置。@see battle-map-config.json → structures.towerVisual */
    towers: {
      blueOuterModelPath: undefined as string | undefined,
      blueOuterDestroyedModelPath: undefined as string | undefined,
      blueInnerModelPath: undefined as string | undefined,
      blueInnerDestroyedModelPath: undefined as string | undefined,
      blueNexusGuardModelPath: undefined as string | undefined,
      blueNexusGuardDestroyedModelPath: undefined as string | undefined,
      redOuterModelPath: undefined as string | undefined,
      redOuterDestroyedModelPath: undefined as string | undefined,
      redInnerModelPath: undefined as string | undefined,
      redInnerDestroyedModelPath: undefined as string | undefined,
      redNexusGuardModelPath: undefined as string | undefined,
      redNexusGuardDestroyedModelPath: undefined as string | undefined,
      blueRotationY: 0,
      redRotationY: 0,
      outerTargetHeight: 0, outerModelScale: 0, outerGroundOffsetY: 0,
      outerDestroyedTargetHeight: 0, outerDestroyedModelScale: 0, outerDestroyedGroundOffsetY: -5,
      outerIdleClip: undefined as string | undefined, outerDeathClip: undefined as string | undefined,
      innerTargetHeight: 0, innerModelScale: 0, innerGroundOffsetY: 0,
      innerDestroyedTargetHeight: 0, innerDestroyedModelScale: 0, innerDestroyedGroundOffsetY: -5,
      innerIdleClip: undefined as string | undefined, innerDeathClip: undefined as string | undefined,
      nexusGuardTargetHeight: 0, nexusGuardModelScale: 0, nexusGuardGroundOffsetY: 0,
      nexusGuardDestroyedTargetHeight: 0, nexusGuardDestroyedModelScale: 0, nexusGuardDestroyedGroundOffsetY: -5,
      nexusGuardIdleClip: undefined as string | undefined, nexusGuardDeathClip: undefined as string | undefined,
      outerMaxHp: 0, innerMaxHp: 0, nexusGuardMaxHp: 0,
    },
    /** 水晶枢纽视觉配置。@see battle-map-config.json → structures.nexusVisual */
    nexus: {
      blueModelPath: undefined as string | undefined,
      blueDestroyedModelPath: undefined as string | undefined,
      redModelPath: undefined as string | undefined,
      redDestroyedModelPath: undefined as string | undefined,
      targetHeight: 0, modelScale: 0, groundOffsetY: 0,
      blueRotationY: 0, redRotationY: 0,
      idleClip: undefined as string | undefined, damagedClip: undefined as string | undefined, criticalClip: undefined as string | undefined, deathClip: undefined as string | undefined,
      maxHp: 0, damagedThreshold: 0, criticalThreshold: 0,
    },
    /** 兵营水晶视觉配置。@see battle-map-config.json → structures.inhibitorVisual */
    inhibitor: {
      maxHp: 0,
      blue: {
        destroyedModelPath: undefined as string | undefined,
        modelPath: undefined as string | undefined, targetHeight: 0, modelScale: 0, groundOffsetY: 0, rotationY: 0,
        idleClip: undefined as string | undefined, deathClip: undefined as string | undefined,
      },
      red: {
        destroyedModelPath: undefined as string | undefined,
        modelPath: undefined as string | undefined, targetHeight: 0, modelScale: 0, groundOffsetY: 0, rotationY: 0,
        idleClip: undefined as string | undefined, deathClip: undefined as string | undefined,
      },
    },
    /** 补血道具视觉配置。@see battle-map-config.json → healthRelics.visual */
    relic: {
      modelPath: undefined as string | undefined,
      targetHeight: 0, rotationY: 0,
      idleClip: undefined as string | undefined,
      floatHeight: 0, bobAmplitude: 0, bobSpeed: 0,
      ringOuterRadius: 0, ringInnerRadius: 0,
    },
    /** 泉水视觉配置。@see battle-map-config.json → fountain */
    fountain: {
      blue: {
        position: [0, 0, 0] as [number, number, number], radius: 0,
        modelPath: undefined as string | undefined, targetHeight: 0, rotationY: 0, idleClip: undefined as string | undefined,
      },
      red: {
        position: [0, 0, 0] as [number, number, number], radius: 0,
        modelPath: undefined as string | undefined, targetHeight: 0, rotationY: 0, idleClip: undefined as string | undefined,
      },
    },
    /** 小兵模型与动画配置。@see battle-map-config.json → minions.melee/caster.visual + healthBar */
    minion: {
      melee: {
        blue:  { modelPath: undefined as string | undefined, targetHeight: 0, modelScale: 0, groundOffsetY: 0, rotationY: 0 },
        red:   { modelPath: undefined as string | undefined, targetHeight: 0, modelScale: 0, groundOffsetY: 0, rotationY: 0 },
        idleClip: undefined as string | undefined, runClip: undefined as string | undefined, attackClip: undefined as string | undefined, deathClip: undefined as string | undefined,
      },
      caster: {
        blue:  { modelPath: undefined as string | undefined, targetHeight: 0, modelScale: 0, groundOffsetY: 0, rotationY: 0 },
        red:   { modelPath: undefined as string | undefined, targetHeight: 0, modelScale: 0, groundOffsetY: 0, rotationY: 0 },
        idleClip: undefined as string | undefined, runClip: undefined as string | undefined, attackClip: undefined as string | undefined, deathClip: undefined as string | undefined,
      },
      healthBarWidth: 0, healthBarHeight: 0, healthBarOffsetY: 0,
    },
  },

  /**
   * 英雄资源与对局阵容配置。
   *
   * 字段说明：
   * - `lineup`：对局阵容实例表。每一项都明确声明 `team`、`heroId`、`playerName`，并允许双方重复使用同一英雄。
   * - `skin`：阵容实例级皮肤名。填写后会优先按 `/models/heroes/${heroId}/${skin}.glb` 解析该实例模型路径。
   * - `isControlled`：标记本地玩家默认控制的唯一实例；若配置缺失或重复，运行时会做安全回退。
   * - `assets`：英雄资源配置表，键为 heroId。
   * - `modelPath`：当前直接启用的模型路径，可写本地静态资源路径，也可写任意远程 URL。
   * - `animations`：该英雄的动作片段、状态别名与播放行为覆盖配置；不填写时沿用默认模板。
   * - `voices`：英雄语音配置，支持普攻、Q/W/E/R、回城和静止待机语音。
   * - `modelScale`：模型相对统一英雄基准高度的尺寸倍率。`1` 为默认观感，大于 1 更大，小于 1 更小。
   * - `groundOffsetY`：模型完成归一化后的额外落地偏移量。负值下压模型，正值上抬模型。
   * - `overhead`：头顶血条与表情挂点的覆盖配置。
   */
  heroes: {
    /**
     * 当前对局阵容实例表。
     *
     * 约束说明：
     * - 阵容允许蓝红双方重复使用同一 `heroId`。
     * - 每个实例都必须显式声明所属队伍与玩家展示名。
     * - 若同一英雄需要在不同实例上使用不同皮肤，请直接在该实例上填写 `skin`。
     * - `isControlled` 建议全表只设置一个，用于唯一定位本地玩家控制角色。
     */
    lineup: MULTIPLAYER_TEST_LINEUP as HeroLineupConfig[],
    /** 英雄资源配置表，键为 heroId，值为当前启用模型、动画、语音、尺寸与挂点配置。运行时由后端下发。 */
    assets: {} as Record<string, HeroAssetConfig>,
  },

  multiplayer: {
    /** 是否启用联机模式。关闭后页面不会自动连接 Socket。 */
    enabled: true,
    /** Socket 服务端地址。开发环境默认连本机 3001 端口。 */
    socketServerUrl: 'http://localhost:8131',
    /** 默认联机房间 ID。当前 demo 固定为单房间。 */
    roomId: MULTIPLAYER_RUNTIME_CONFIG.roomId,
    /** 单房间最多允许自动分配的玩家人数。 */
    maxPlayers: MULTIPLAYER_RUNTIME_CONFIG.maxPlayers,
    /** 服务端权威状态推进帧率。 */
    simulationTickRate: MULTIPLAYER_RUNTIME_CONFIG.simulationTickRate,
    /** 服务端向客户端广播快照的频率。 */
    snapshotRate: MULTIPLAYER_RUNTIME_CONFIG.snapshotRate,
    /** 远端英雄插值延迟（毫秒），越大越平滑但延迟越高。 */
    interpolationDelayMs: MULTIPLAYER_RUNTIME_CONFIG.interpolationDelayMs,
    /** 固定 tick 步长（秒），用于本地预测重放。 */
    tickDt: MULTIPLAYER_RUNTIME_CONFIG.tickDt,
    /** @deprecated 旧平滑参数，保留兼容。 */
    renderDelayMs: MULTIPLAYER_RUNTIME_CONFIG.renderDelayMs,
    /** 客户端位置平滑强度，数值越大越快追上服务端权威位置。 */
    positionSmoothing: MULTIPLAYER_RUNTIME_CONFIG.positionSmoothing,
    /** 客户端朝向平滑强度，数值越大越快追上服务端权威朝向。 */
    rotationSmoothing: MULTIPLAYER_RUNTIME_CONFIG.rotationSmoothing,
    /** 允许在客户端暂存的快照数量上限，用于诊断显示与后续扩展。 */
    maxBufferedSnapshots: MULTIPLAYER_RUNTIME_CONFIG.maxBufferedSnapshots,
    /** 是否显示联机诊断面板。 */
    showDiagnosticsPanel: MULTIPLAYER_RUNTIME_CONFIG.showDiagnosticsPanel,
    /** 是否在诊断面板中显示帧率。 */
    showFps: MULTIPLAYER_RUNTIME_CONFIG.showFps,
    /** 客户端断线后 HUD 提示文案。 */
    disconnectMessage: MULTIPLAYER_RUNTIME_CONFIG.disconnectMessage,
  },

  debug: {
    worldCoordinates: {
      /** 是否默认显示世界坐标调试标签。 */
      enabled: false,
      /** 显示/隐藏世界坐标的快捷键。 */
      toggleKey: 'KeyG',
      /** 是否显示英雄标签。 */
      showChampions: true,
      /** 是否显示建筑标签。 */
      showStructures: true,
      /** 坐标保留的小数位。 */
      precision: 2,
      /** 标签相对对象的默认抬升高度。 */
      offsetY: 5.6,
      /** 标签字体大小，单位 px。 */
      fontSize: 28,
      /** 标签字体族。 */
      fontFamily: '黑体',
      /** drei Html 的 distanceFactor，数值越小标签越大。 */
      distanceFactor: 12,
    },
    animationHotkeys: {
      /** A 键触发的动作槽位。 */
      KeyA: 'basicAttack',
      /** Q 键触发的动作槽位。 */
      KeyQ: 'q',
      /** W 键触发的动作槽位。 */
      KeyW: 'w',
      /** E 键触发的动作槽位。 */
      KeyE: 'e',
      /** R 键触发的动作槽位。 */
      KeyR: 'r',
      /** B 键触发的动作槽位。 */
      KeyB: 'recall',
    } as Record<string, HeroActionSlot>,
    spectator: {
      /** 是否默认展示导播调试面板。 */
      showPanel: false,
    },
    /** 调试用自由三维视角配置，用于检查模型贴地等问题；与玩家镜头锁定、导播模式独立。 */
    freeCamera: {
      /** 是否默认启用调试自由视角。 */
      enabled: false,
      /** 切换调试自由三维视角的快捷键。 */
      toggleKey: 'KeyO',
    },
  },
} as const;
