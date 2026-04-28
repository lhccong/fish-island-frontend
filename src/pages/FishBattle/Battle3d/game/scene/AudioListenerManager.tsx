/**
 * AudioListenerManager —— 空间音效听者位置管理器。
 *
 * 无渲染输出的组件，挂载在 <Canvas> 内部。
 * 每帧将本机英雄的世界坐标同步到模块级变量，
 * 供 Champion.tsx 播放空间音效时作为听者位置使用。
 *
 * 注意：Web Audio API 的 AudioListener 位置在 AudioPreloader.playSpatial()
 * 中于每次播放时即时设置，此处仅提供位置查询接口。
 */

import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { getLocalPredictor } from '../../network/NetworkSyncRegistry';
import { GAME_CONFIG } from '../../config/gameConfig';

/** 模块级缓存：本机英雄当前世界坐标（每帧更新）。 */
const _listenerPosition = new THREE.Vector3();
/** 模块级缓存：本机英雄当前朝向（每帧更新）。 */
let _listenerRotation = 0;
/** 模块级标记：是否已初始化过（至少更新过一次）。 */
let _initialized = false;

/**
 * 获取当前听者位置（本机英雄位置）。
 * 供其他模块（如 Champion.tsx）在播放空间音效时读取。
 */
export function getListenerPosition(): { x: number; y: number; z: number } {
  return _listenerPosition;
}

/**
 * 获取当前听者朝向（本机英雄旋转弧度）。
 */
export function getListenerRotation(): number {
  return _listenerRotation;
}

/**
 * 听者位置是否已就绪（至少同步过一次）。
 */
export function isListenerReady(): boolean {
  return _initialized;
}

const AudioListenerManager: React.FC = () => {
  useFrame(() => {
    if (!GAME_CONFIG.audio.enabled) return;

    const me = useGameStore.getState().champions.find((c) => c.isMe);
    if (!me) return;

    let pos = me.position;
    let rot = me.rotation;

    if (GAME_CONFIG.multiplayer.enabled) {
      const predictor = getLocalPredictor();
      if (predictor?.initialized) {
        const predicted = predictor.getCurrentState();
        pos = predicted.position;
        rot = predicted.rotation;
      }
    }

    _listenerPosition.copy(pos);
    _listenerRotation = rot;
    _initialized = true;
  });

  return null;
};

export default AudioListenerManager;
