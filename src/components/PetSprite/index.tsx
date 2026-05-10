import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface PetAction {
  /** 动作名称（可选，用于 tooltip） */
  name?: string;
  /** 精灵图中的行索引（0-based） */
  row: number;
  /** 该动作的帧数 */
  frames: number;
  /** 播放一轮的时长（ms） */
  duration: number;
  /** 动作权重，用于随机选择，默认 1 */
  weight?: number;
}

export interface PetSpriteProps {
  /** 精灵图 URL（webp / png 均可） */
  spriteUrl: string;
  /** 单帧宽度（px），默认 192 */
  frameWidth?: number;
  /** 单帧高度（px），默认 208 */
  frameHeight?: number;
  /** 整张精灵图的总列数（最大帧数），用于计算 background-size */
  totalCols?: number;
  /** 整张精灵图的总行数，用于计算 background-size；不传则自动推断 */
  totalRows?: number;
  /** 动作列表，点击宠物时循环切换 */
  actions: PetAction[];
  /** 初始动作索引，默认 0 */
  defaultActionIndex?: number;
  /** 缩放比例，默认 1 */
  scale?: number;
  /** 额外 className */
  className?: string;
  /** 额外 style */
  style?: React.CSSProperties;
  /** 点击回调（在切换动作之后触发） */
  onClick?: (actionIndex: number, action: PetAction) => void;
  /** 是否启用自动播放随机动作，默认 false */
  autoPlay?: boolean;
  /** 自动播放的最小间隔时间（ms），默认 3000 */
  autoPlayMinInterval?: number;
  /** 自动播放的最大间隔时间（ms），默认 8000 */
  autoPlayMaxInterval?: number;
  /** 初始是否处于 Idle 动作（index 0），默认 true */
  startWithIdle?: boolean;
}

/**
 * PetSprite —— 通用宠物精灵图动画组件
 *
 * 使用 CSS background-position 动画逐帧播放 webp/png 精灵图。
 * 点击宠物会自动循环切换 actions 中定义的动作。
 *
 * 注意：缩放通过直接调整 width/height 和 background-size 实现，
 * 而非 transform: scale()，确保 overflow: hidden 能正确裁剪到单帧。
 */
const PetSprite: React.FC<PetSpriteProps> = ({
  spriteUrl,
  frameWidth = 192,
  frameHeight = 208,
  totalCols = 8,
  totalRows,
  actions,
  defaultActionIndex = 0,
  scale = 1,
  className,
  style,
  onClick,
  autoPlay = false,
  autoPlayMinInterval = 3000,
  autoPlayMaxInterval = 8000,
  startWithIdle = true,
}) => {
  const [actionIndex, setActionIndex] = useState(
    startWithIdle && actions.length > 0 ? 0 : Math.min(defaultActionIndex, actions.length - 1),
  );
  const lastClickRef = useRef(0);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSwitchingRef = useRef(false);

  const currentAction = actions[actionIndex] ?? actions[0];

  // 计算精灵图总行数：优先使用传入值，否则取 actions 中最大行号 + 1
  const computedTotalRows =
    totalRows ?? Math.max(...actions.map((a) => a.row)) + 1;

  // 缩放后的单帧尺寸（用于容器和 background-size）
  const scaledW = frameWidth * scale;
  const scaledH = frameHeight * scale;

  // background-size 按缩放比例同步缩小，覆盖整张精灵图
  const bgWidth = frameWidth * totalCols * scale;
  const bgHeight = frameHeight * computedTotalRows * scale;

  // 为每个动作生成唯一的 keyframe 名称，包含帧数和缩放信息
  // 名称变化时浏览器会自动重启动画，确保切换动作从第 0 帧开始
  const animName = `petSprite_r${currentAction.row}_f${currentAction.frames}_s${Math.round(scale * 100)}`;

  const keyframesStyle = useMemo(() => {
    return `
      @keyframes ${animName} {
        from { background-position-x: 0px; }
        to   { background-position-x: ${currentAction.frames * -scaledW}px; }
      }
    `;
  }, [animName, currentAction.frames, scaledW]);

  // 根据权重随机选择下一个动作
  const getRandomActionIndex = useCallback(() => {
    const totalWeight = actions.reduce((sum, a) => sum + (a.weight ?? 1), 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < actions.length; i++) {
      random -= actions[i].weight ?? 1;
      if (random <= 0) return i;
    }
    return Math.floor(Math.random() * actions.length);
  }, [actions]);

  // 自动播放逻辑
  useEffect(() => {
    if (!autoPlay || actions.length <= 1) {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      return;
    }

    const scheduleNextAction = () => {
      // 随机间隔
      const interval = autoPlayMinInterval + Math.random() * (autoPlayMaxInterval - autoPlayMinInterval);
      
      autoPlayTimerRef.current = setTimeout(() => {
        // 随机选择新动作
        let newIndex = getRandomActionIndex();
        
        // 避免连续两次选择相同动作（如果有多个动作可选）
        if (actions.length > 1 && newIndex === actionIndex) {
          newIndex = (newIndex + 1 + Math.floor(Math.random() * (actions.length - 1))) % actions.length;
        }
        
        isAutoSwitchingRef.current = true;
        setActionIndex(newIndex);
        
        // 安排下一次动作切换
        scheduleNextAction();
      }, interval);
    };

    scheduleNextAction();

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [autoPlay, actions.length, actionIndex, autoPlayMinInterval, autoPlayMaxInterval, getRandomActionIndex]);

  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 100) return;
    lastClickRef.current = now;

    // 点击时清除自动播放定时器，手动切换后重新开始
    if (autoPlay && autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }

    const nextIndex = (actionIndex + 1) % actions.length;
    setActionIndex(nextIndex);
    onClick?.(nextIndex, actions[nextIndex]);
  }, [actionIndex, actions, onClick, autoPlay]);

  const containerStyle: React.CSSProperties = {
    // 容器尺寸 = 缩放后的单帧尺寸，overflow hidden 精确裁剪到一帧
    width: scaledW,
    height: scaledH,
    overflow: 'hidden',
    display: 'inline-block',
    lineHeight: 0,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    imageRendering: 'pixelated',
    backgroundImage: `url(${spriteUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${bgWidth}px ${bgHeight}px`,
    // 定位到当前动作所在行（已按 scale 缩放）
    backgroundPositionY: `${currentAction.row * -scaledH}px`,
    // 横向逐帧动画
    animation: `${animName} ${currentAction.duration}ms steps(${currentAction.frames}) infinite`,
    ...style,
  };

  return (
    <>
      <style>{keyframesStyle}</style>
      <div
        className={className}
        style={containerStyle}
        onClick={handleClick}
        title={currentAction.name}
      />
    </>
  );
};

export default PetSprite;
