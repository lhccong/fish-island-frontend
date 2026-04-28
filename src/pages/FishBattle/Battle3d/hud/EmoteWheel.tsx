import React, { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import { EMOTES } from '../config/emoteConfig';
import { getHeroVoiceConfig } from '../config/heroConfig';
import { emitEmoteCommand, emitVoiceCommand } from '../network/socketClient';
import { useGameStore } from '../store/useGameStore';
import type { HeroWheelVoice } from '../types/game';

interface PointerState {
  x: number;
  y: number;
}

interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(centerX: number, centerY: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const startInner = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const endInner = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function getViewportBounds(viewport: HTMLDivElement | null): ViewportBounds {
  if (!viewport) {
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  const rect = viewport.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function toViewportPointer(event: MouseEvent, bounds: ViewportBounds): PointerState {
  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
}

function clampCenter(pointer: PointerState, bounds: ViewportBounds, voiceCount: number) {
  const { horizontal, vertical } = getWheelPadding(voiceCount);
  const minX = bounds.width <= horizontal * 2 ? bounds.width / 2 : horizontal;
  const maxX = bounds.width <= horizontal * 2 ? bounds.width / 2 : bounds.width - horizontal;
  const minY = bounds.height <= vertical * 2 ? bounds.height / 2 : vertical;
  const maxY = bounds.height <= vertical * 2 ? bounds.height / 2 : bounds.height - vertical;
  return {
    x: Math.min(maxX, Math.max(minX, pointer.x)),
    y: Math.min(maxY, Math.max(minY, pointer.y)),
  };
}

function getVoiceRingMetrics() {
  const { voiceRingOuterRadius, voiceRingItemSize } = GAME_CONFIG.emotes.wheel;
  const cardWidth = voiceRingItemSize * 1.56;
  const cardHeight = voiceRingItemSize * 0.94;

  return {
    cardWidth,
    cardHeight,
    frameInnerRadius: voiceRingOuterRadius - cardHeight * 0.9,
    frameOuterRadius: voiceRingOuterRadius + cardHeight * 0.44,
    labelOffsetY: voiceRingOuterRadius - cardHeight * 1.68,
  };
}

interface RingItemPosition {
  angle: number;
  x: number;
  y: number;
}

function getRingItemPosition(index: number, count: number, radius: number): RingItemPosition {
  const safeCount = Math.max(1, count);
  const angle = (Math.PI * 2 * index) / safeCount - Math.PI / 2;
  return {
    angle,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function getWheelPadding(voiceCount: number) {
  const wheel = GAME_CONFIG.emotes.wheel;
  const voiceRingMetrics = getVoiceRingMetrics();
  const selectedScale = 1.12;
  const horizontalReach = voiceCount > 0
    ? wheel.voiceRingOuterRadius + (voiceRingMetrics.cardWidth * selectedScale) / 2
    : wheel.outerRadius + wheel.selectionOverflow;
  const verticalReach = voiceCount > 0
    ? wheel.voiceRingOuterRadius + (voiceRingMetrics.cardHeight * selectedScale) / 2
    : wheel.outerRadius + wheel.selectionOverflow;

  return {
    horizontal: Math.max(wheel.size / 2, horizontalReach) + 18,
    vertical: Math.max(wheel.size / 2, verticalReach) + 18,
  };
}

/** 轮盘选中结果：表情内圈 index 或语音外圈 index。 */
interface WheelSelection {
  /** 表情内圈选中索引，-1 表示未选中。 */
  emoteIndex: number;
  /** 语音外圈选中索引，-1 表示未选中。 */
  voiceIndex: number;
}

function getWheelSelection(pointer: PointerState, center: PointerState, voiceCount: number): WheelSelection {
  const none: WheelSelection = { emoteIndex: -1, voiceIndex: -1 };
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const wheel = GAME_CONFIG.emotes.wheel;
  const voiceRingMetrics = getVoiceRingMetrics();

  // 语音外圈判定
  if (voiceCount > 0) {
    const hitPaddingX = Math.min(
      Math.max(8, wheel.voiceRingSelectionOverflow * 0.35),
      voiceRingMetrics.cardWidth * 0.2,
    );
    const hitPaddingY = Math.min(
      Math.max(6, wheel.voiceRingSelectionOverflow * 0.35),
      voiceRingMetrics.cardHeight * 0.35,
    );

    for (let index = 0; index < voiceCount; index += 1) {
      const position = getRingItemPosition(index, voiceCount, wheel.voiceRingOuterRadius);
      const cardCenterX = center.x + position.x;
      const cardCenterY = center.y + position.y;

      if (
        pointer.x >= cardCenterX - voiceRingMetrics.cardWidth / 2 - hitPaddingX
        && pointer.x <= cardCenterX + voiceRingMetrics.cardWidth / 2 + hitPaddingX
        && pointer.y >= cardCenterY - voiceRingMetrics.cardHeight / 2 - hitPaddingY
        && pointer.y <= cardCenterY + voiceRingMetrics.cardHeight / 2 + hitPaddingY
      ) {
        return { emoteIndex: -1, voiceIndex: index };
      }
    }
  }

  // 表情内圈判定
  if (
    EMOTES.length > 0
    && distance >= wheel.innerRadius
    && distance <= wheel.outerRadius + wheel.selectionOverflow
  ) {
    const step = (Math.PI * 2) / EMOTES.length;
    const normalizedAngle = (Math.atan2(dy, dx) + Math.PI * 2 + Math.PI / 2 + step / 2) % (Math.PI * 2);
    return { emoteIndex: Math.floor(normalizedAngle / step), voiceIndex: -1 };
  }

  return none;
}

function pickRandomItem<T>(items?: T[]): T | undefined {
  if (!items?.length) {
    return undefined;
  }

  return items[Math.floor(Math.random() * items.length)];
}

/** 单条表情公告 */
const EmoteAnnouncementItem: React.FC<{
  item: { emoteId: string; playerName: string; createdAt: number; expiresAt: number };
  index: number;
}> = ({ item }) => {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const cfg = GAME_CONFIG.emotes.announcement;
  const emote = EMOTES.find((e) => e.id === item.emoteId);

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setPhase('visible'), cfg.enterAnimationMs);
    return () => window.clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    const remaining = item.expiresAt - Date.now();
    if (remaining <= cfg.exitAnimationMs) {
      setPhase('exit');
      return;
    }
    const fadeTimer = window.setTimeout(() => setPhase('exit'), remaining - cfg.exitAnimationMs);
    return () => window.clearTimeout(fadeTimer);
  }, [item.expiresAt]);

  const isRight = cfg.side === 'right';
  const slideDistance = 120;

  const animStyle: React.CSSProperties =
    phase === 'enter'
      ? { opacity: 0, transform: `translateX(${isRight ? slideDistance : -slideDistance}px)` }
      : phase === 'exit'
        ? { opacity: 0, transform: `translateX(${isRight ? slideDistance : -slideDistance}px)`, transition: `opacity ${cfg.exitAnimationMs}ms ease, transform ${cfg.exitAnimationMs}ms ease` }
        : { opacity: 1, transform: 'translateX(0)', transition: `opacity ${cfg.enterAnimationMs}ms ease, transform ${cfg.enterAnimationMs}ms ease` };

  return (
    <div
      className="flex items-center rounded-lg border font-semibold text-white shadow-[0_8px_24px_rgba(2,6,23,0.4)] backdrop-blur-md whitespace-nowrap"
      style={{
        padding: `${cfg.paddingY}px ${cfg.paddingX}px`,
        fontSize: cfg.fontSize,
        borderColor: 'rgba(121, 217, 255, 0.35)',
        background: `linear-gradient(135deg, ${emote?.accent ?? '#69d2ff'}18, rgba(6,10,24,0.88))`,
        ...animStyle,
      }}
    >
      <span className="leading-none mr-1.5" style={{ fontSize: cfg.emojiFontSize }}>
        {emote?.emoji ?? '✨'}
      </span>
      <span className="truncate">{item.playerName}</span>
    </div>
  );
};

/** 侧面纵向列表轮播 */
const EmoteAnnouncementList: React.FC<{
  items: { emoteId: string; playerName: string; createdAt: number; expiresAt: number; id: string }[];
}> = ({ items }) => {
  const cfg = GAME_CONFIG.emotes.announcement;
  const isRight = cfg.side === 'right';
  const visible = items.slice(0, cfg.visibleCount);

  return (
    <div
      className="absolute z-[170] pointer-events-none flex flex-col"
      style={{
        top: cfg.topOffsetPx,
        [isRight ? 'right' : 'left']: cfg.horizontalOffsetPx,
        gap: cfg.itemGapPx,
      }}
    >
      {visible.map((item, i) => (
        <EmoteAnnouncementItem key={item.id} item={item} index={i} />
      ))}
    </div>
  );
};

interface EmoteWheelProps {
  viewportRef: RefObject<HTMLDivElement>;
}

const EmoteWheel: React.FC<EmoteWheelProps> = ({ viewportRef }) => {
  const activeEmotes = useGameStore((s) => s.activeEmotes);
  const triggerChampionEmote = useGameStore((s) => s.triggerChampionEmote);
  const setChampionVoiceRequest = useGameStore((s) => s.setChampionVoiceRequest);
  const myChampion = useGameStore((s) => s.champions.find((item) => item.isMe) ?? null);
  const multiplayerEnabled = GAME_CONFIG.multiplayer.enabled;
  const announcementItems = useMemo(
    () => {
      const now = Date.now();
      const exitMs = GAME_CONFIG.emotes.announcement.exitAnimationMs;
      return [...activeEmotes]
        .filter((item) => item.expiresAt - now > exitMs)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, GAME_CONFIG.emotes.announcement.maxQueue);
    },
    [activeEmotes],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [pointer, setPointer] = useState<PointerState>({ x: 0, y: 0 });
  const [center, setCenter] = useState<PointerState>({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(-1);
  const pointerRef = useRef(pointer);
  const centerRef = useRef(center);
  const isOpenRef = useRef(isOpen);
  const selectedIndexRef = useRef(selectedIndex);
  const selectedVoiceIndexRef = useRef(selectedVoiceIndex);

  const heroVoiceConfig = useMemo(() => {
    if (!myChampion) return undefined;
    return getHeroVoiceConfig(myChampion.heroId);
  }, [myChampion]);
  const customWheelVoices: HeroWheelVoice[] = useMemo(() => heroVoiceConfig?.customWheel ?? [], [heroVoiceConfig]);
  const voiceRingMetrics = useMemo(() => getVoiceRingMetrics(), []);

  /** 播放语音外圈的英雄自定义语音。 */
  const playWheelVoice = React.useCallback((voiceItem: HeroWheelVoice) => {
    if (!myChampion) {
      return;
    }
    const voiceUrl = pickRandomItem(voiceItem.voiceUrls);
    if (!voiceUrl) {
      return;
    }

    const request = {
      nonce: Date.now() + Math.random(),
      slot: 'customWheel' as const,
      customVoiceId: voiceItem.id,
      voiceUrl,
      volume: Math.min(1, Math.max(0, voiceItem.voiceVolume ?? 1)),
    };

    setChampionVoiceRequest(myChampion.id, request);

    if (!multiplayerEnabled) {
      return;
    }

    emitVoiceCommand({
      championId: myChampion.id,
      request,
    });
  }, [multiplayerEnabled, myChampion, setChampionVoiceRequest]);

  useEffect(() => {
    pointerRef.current = pointer;
  }, [pointer]);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    selectedVoiceIndexRef.current = selectedVoiceIndex;
  }, [selectedVoiceIndex]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const nextPointer = toViewportPointer(event, getViewportBounds(viewportRef.current));
      setPointer(nextPointer);
      if (isOpenRef.current) {
        const sel = getWheelSelection(nextPointer, centerRef.current, customWheelVoices.length);
        setSelectedIndex(sel.emoteIndex);
        setSelectedVoiceIndex(sel.voiceIndex);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 't' || !myChampion) {
        return;
      }

      const nextCenter = clampCenter(pointerRef.current, getViewportBounds(viewportRef.current), customWheelVoices.length);
      setCenter(nextCenter);
      centerRef.current = nextCenter;
      const sel = getWheelSelection(pointerRef.current, nextCenter, customWheelVoices.length);
      setSelectedIndex(sel.emoteIndex);
      selectedIndexRef.current = sel.emoteIndex;
      setSelectedVoiceIndex(sel.voiceIndex);
      selectedVoiceIndexRef.current = sel.voiceIndex;
      setIsOpen(true);
      isOpenRef.current = true;
      event.preventDefault();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 't') {
        return;
      }

      if (isOpenRef.current && myChampion) {
        // 表情内圈选中
        if (selectedIndexRef.current >= 0 && EMOTES[selectedIndexRef.current]) {
          const selectedEmote = EMOTES[selectedIndexRef.current];
          triggerChampionEmote(myChampion.id, selectedEmote.id, GAME_CONFIG.emotes.worldDisplayDurationMs);
          if (multiplayerEnabled) {
            emitEmoteCommand({
              championId: myChampion.id,
              emoteId: selectedEmote.id,
              durationMs: GAME_CONFIG.emotes.worldDisplayDurationMs,
            });
          }
        }
        // 语音外圈选中
        if (selectedVoiceIndexRef.current >= 0 && customWheelVoices[selectedVoiceIndexRef.current]) {
          playWheelVoice(customWheelVoices[selectedVoiceIndexRef.current]);
        }
      }

      if (isOpenRef.current) {
        event.preventDefault();
      }
      setIsOpen(false);
      setSelectedIndex(-1);
      setSelectedVoiceIndex(-1);
      isOpenRef.current = false;
      selectedIndexRef.current = -1;
      selectedVoiceIndexRef.current = -1;
    };

    const handleCancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !isOpenRef.current) {
        return;
      }

      setIsOpen(false);
      setSelectedIndex(-1);
      setSelectedVoiceIndex(-1);
      isOpenRef.current = false;
      selectedIndexRef.current = -1;
      selectedVoiceIndexRef.current = -1;
      event.preventDefault();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleCancel);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleCancel);
    };
  }, [customWheelVoices, multiplayerEnabled, myChampion, playWheelVoice, triggerChampionEmote, viewportRef]);

  return (
    <>
      {GAME_CONFIG.emotes.announcement.enabled && announcementItems.length > 0 && (
        <EmoteAnnouncementList items={announcementItems} />
      )}

      {isOpen && (
        <div className="absolute inset-0 z-[160] pointer-events-none select-none">
          <div
            className="absolute rounded-full border shadow-[0_40px_120px_rgba(2,8,20,0.55)] backdrop-blur-xl"
            style={{
              left: center.x - GAME_CONFIG.emotes.wheel.size / 2,
              top: center.y - GAME_CONFIG.emotes.wheel.size / 2,
              width: GAME_CONFIG.emotes.wheel.size,
              height: GAME_CONFIG.emotes.wheel.size,
              borderColor: 'rgba(140, 203, 255, 0.35)',
              background: 'radial-gradient(circle, rgba(10,18,34,0.9) 0%, rgba(4,8,18,0.72) 55%, rgba(4,8,18,0.35) 100%)',
            }}
          >
            <svg
              width={GAME_CONFIG.emotes.wheel.size}
              height={GAME_CONFIG.emotes.wheel.size}
              viewBox={`0 0 ${GAME_CONFIG.emotes.wheel.size} ${GAME_CONFIG.emotes.wheel.size}`}
            >
              <defs>
                <filter id="emoteGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#69d2ff" floodOpacity="0.42" />
                </filter>
                <filter id="voiceGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#ffd36a" floodOpacity="0.34" />
                </filter>
                <linearGradient id="outerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#69d2ff" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#c7ad69" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#69d2ff" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id="voiceRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6ab9ff" stopOpacity="0.34" />
                  <stop offset="55%" stopColor="#ffd36a" stopOpacity="0.52" />
                  <stop offset="100%" stopColor="#79d9ff" stopOpacity="0.34" />
                </linearGradient>
              </defs>
              {customWheelVoices.length > 0 && (
                <>
                  <circle
                    cx={GAME_CONFIG.emotes.wheel.size / 2}
                    cy={GAME_CONFIG.emotes.wheel.size / 2}
                    r={voiceRingMetrics.frameOuterRadius}
                    fill="none"
                    stroke="url(#voiceRingGrad)"
                    strokeWidth="10"
                    opacity={0.34}
                  />
                  <circle
                    cx={GAME_CONFIG.emotes.wheel.size / 2}
                    cy={GAME_CONFIG.emotes.wheel.size / 2}
                    r={voiceRingMetrics.frameInnerRadius}
                    fill="none"
                    stroke="rgba(120, 170, 214, 0.24)"
                    strokeWidth="1.5"
                    strokeDasharray="5 8"
                  />
                  {customWheelVoices.map((voice, index) => {
                    const position = getRingItemPosition(index, customWheelVoices.length, GAME_CONFIG.emotes.wheel.voiceRingOuterRadius);
                    const angle = (position.angle * 180) / Math.PI + 90;
                    const start = polarToCartesian(
                      GAME_CONFIG.emotes.wheel.size / 2,
                      GAME_CONFIG.emotes.wheel.size / 2,
                      voiceRingMetrics.frameInnerRadius - 8,
                      angle,
                    );
                    const end = polarToCartesian(
                      GAME_CONFIG.emotes.wheel.size / 2,
                      GAME_CONFIG.emotes.wheel.size / 2,
                      voiceRingMetrics.frameOuterRadius + 6,
                      angle,
                    );

                    return (
                      <line
                        key={voice.id}
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke="rgba(255, 216, 116, 0.18)"
                        strokeWidth="1.2"
                      />
                    );
                  })}
                </>
              )}
              {/* 外圈装饰环 */}
              <circle
                cx={GAME_CONFIG.emotes.wheel.size / 2}
                cy={GAME_CONFIG.emotes.wheel.size / 2}
                r={GAME_CONFIG.emotes.wheel.outerRadius + 4}
                fill="none"
                stroke="url(#outerRingGrad)"
                strokeWidth="2"
                opacity={0.7}
              />
              <circle
                cx={GAME_CONFIG.emotes.wheel.size / 2}
                cy={GAME_CONFIG.emotes.wheel.size / 2}
                r={GAME_CONFIG.emotes.wheel.outerRadius + 10}
                fill="none"
                stroke="rgba(105, 210, 255, 0.12)"
                strokeWidth="1"
                strokeDasharray="6 4"
              />
              {EMOTES.map((emote, index) => {
                const angleStep = 360 / EMOTES.length;
                const centerAngle = angleStep * index;
                const startAngle = centerAngle - angleStep / 2;
                const endAngle = centerAngle + angleStep / 2;
                const isSelected = selectedIndex === index;
                return (
                  <path
                    key={emote.id}
                    d={describeArc(
                      GAME_CONFIG.emotes.wheel.size / 2,
                      GAME_CONFIG.emotes.wheel.size / 2,
                      GAME_CONFIG.emotes.wheel.innerRadius,
                      GAME_CONFIG.emotes.wheel.outerRadius,
                      startAngle,
                      endAngle,
                    )}
                    fill={isSelected ? 'rgba(105, 210, 255, 0.25)' : 'rgba(14, 24, 43, 0.38)'}
                    stroke={isSelected ? emote.accent : 'rgba(158, 191, 226, 0.12)'}
                    strokeWidth={isSelected ? 3 : 0.8}
                    filter={isSelected ? 'url(#emoteGlow)' : undefined}
                  />
                );
              })}
              <circle
                cx={GAME_CONFIG.emotes.wheel.size / 2}
                cy={GAME_CONFIG.emotes.wheel.size / 2}
                r={GAME_CONFIG.emotes.wheel.innerRadius - 6}
                fill="rgba(6, 12, 24, 0.96)"
                stroke="rgba(199, 173, 105, 0.8)"
                strokeWidth="2"
              />
              <circle
                cx={GAME_CONFIG.emotes.wheel.size / 2}
                cy={GAME_CONFIG.emotes.wheel.size / 2}
                r={GAME_CONFIG.emotes.wheel.innerRadius - 20}
                fill="rgba(12, 24, 44, 0.8)"
                stroke="rgba(121, 217, 255, 0.22)"
                strokeWidth="1"
              />
            </svg>

            <div className="absolute inset-0">
              {EMOTES.map((emote, index) => {
                const position = getRingItemPosition(
                  index,
                  EMOTES.length,
                  (GAME_CONFIG.emotes.wheel.innerRadius + GAME_CONFIG.emotes.wheel.outerRadius) / 2,
                );
                const x = GAME_CONFIG.emotes.wheel.size / 2 + position.x;
                const y = GAME_CONFIG.emotes.wheel.size / 2 + position.y;
                const isSelected = selectedIndex === index;
                return (
                  <div
                    key={emote.id}
                    className="absolute flex flex-col items-center justify-center text-white transition-all duration-150"
                    style={{
                      left: x,
                      top: y,
                      width: GAME_CONFIG.emotes.wheel.itemSize,
                      height: GAME_CONFIG.emotes.wheel.itemSize,
                      background: isSelected
                        ? `radial-gradient(circle, ${emote.accent}2f 0%, transparent 70%)`
                        : 'none',
                      boxShadow: 'none',
                      transform: `translate(-50%, -50%) scale(${isSelected ? 1.15 : 1})`,
                      filter: isSelected ? `drop-shadow(0 0 8px ${emote.accent}60)` : 'none',
                    }}
                  >
                    <span className="leading-none" style={{ fontSize: GAME_CONFIG.emotes.wheel.emojiFontSize }}>{emote.emoji}</span>
                    <span
                      className="mt-1 font-semibold tracking-wide"
                      style={{
                        fontSize: GAME_CONFIG.emotes.wheel.labelFontSize,
                        color: isSelected ? emote.color : '#d5e2f0',
                      }}
                    >
                      {emote.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 语音外圈 */}
            {customWheelVoices.length > 0 && (
              <div className="absolute inset-0">
                {customWheelVoices.map((voice, index) => {
                  const position = getRingItemPosition(index, customWheelVoices.length, GAME_CONFIG.emotes.wheel.voiceRingOuterRadius);
                  const x = GAME_CONFIG.emotes.wheel.size / 2 + position.x;
                  const y = GAME_CONFIG.emotes.wheel.size / 2 + position.y;
                  const isSelected = selectedVoiceIndex === index;
                  return (
                    <div
                      key={voice.id}
                      className="absolute flex flex-col items-center justify-center border text-white transition-all duration-150"
                      style={{
                        left: x,
                        top: y,
                        width: voiceRingMetrics.cardWidth,
                        height: voiceRingMetrics.cardHeight,
                        borderRadius: 18,
                        borderColor: isSelected ? 'rgba(255, 215, 106, 0.88)' : 'rgba(158, 191, 226, 0.22)',
                        background: isSelected
                          ? 'linear-gradient(180deg, rgba(255, 215, 106, 0.18) 0%, rgba(21, 28, 43, 0.96) 100%)'
                          : 'linear-gradient(180deg, rgba(18, 28, 45, 0.94) 0%, rgba(8, 12, 24, 0.96) 100%)',
                        boxShadow: isSelected ? '0 0 22px rgba(255, 215, 106, 0.22)' : '0 8px 18px rgba(0, 0, 0, 0.16)',
                        transform: `translate(-50%, -50%) scale(${isSelected ? 1.12 : 1})`,
                      }}
                    >
                      <span className="leading-none" style={{ fontSize: GAME_CONFIG.emotes.wheel.voiceRingEmojiFontSize }}>{voice.emoji}</span>
                      <span
                        className="mt-0.5 font-semibold tracking-[0.08em]"
                        style={{
                          fontSize: GAME_CONFIG.emotes.wheel.voiceRingLabelFontSize,
                          color: isSelected ? '#ffe38c' : '#d3deea',
                        }}
                      >
                        {voice.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1 text-white">
                <span
                  className="font-semibold uppercase tracking-[0.35em]"
                  style={{ fontSize: GAME_CONFIG.emotes.wheel.centerTitleFontSize }}
                >
                  {selectedVoiceIndex >= 0 ? '语音' : '表情'}
                </span>
                <span className="leading-none" style={{ fontSize: GAME_CONFIG.emotes.wheel.centerEmojiFontSize }}>
                  {selectedIndex >= 0 ? EMOTES[selectedIndex].emoji : selectedVoiceIndex >= 0 ? customWheelVoices[selectedVoiceIndex]?.emoji ?? '🔊' : '✨'}
                </span>
                <span className="font-medium text-white/70" style={{ fontSize: GAME_CONFIG.emotes.wheel.centerHintFontSize }}>
                  {selectedVoiceIndex >= 0 ? '松开 T 播放语音' : '松开 T 发送表情'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmoteWheel;
