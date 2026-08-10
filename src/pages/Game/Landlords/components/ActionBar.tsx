/**
 * 操作栏组件 - 根据游戏阶段渲染对应操作
 * 等待：准备/开始/离开
 * 叫分：不叫/1/2/3分
 * 出牌：重选/不出/出牌
 * AI托管：托管/取消托管
 */
import React from 'react';
import { Button, Space } from 'antd';
import { isWaitingPhase, isPlayingPhase, isRobbingPhase } from '../types/phase';

export interface ActionBarProps {
  phase: string;
  // 通用
  isOwner?: boolean;
  isReady?: boolean;
  canStart?: boolean;
  disabled?: boolean;
  timeLeft?: number;
  // 当前最高叫分（用于判断是否有人叫了3分）
  highestRobScore?: number;

  // 出牌
  canPlay?: boolean;
  selectedCount?: number;
  onReady?: () => void;
  onStart?: () => void;
  onPlay?: () => void;
  onPass?: () => void;
  onReselect?: () => void;

  // 叫分
  isMyTurnToRob?: boolean;
  onSkipRob?: () => void;
  onRobLandlord?: (score: number) => void;

  // AI托管
  isRobotControlled?: boolean;
  onCancelRobot?: () => void;
  onSetRobot?: () => void;

  // 离开
  onLeave?: () => void;

  // 等待提示
  waitForName?: string;
  waitForAction?: 'play' | 'rob';
}

const ActionBar: React.FC<ActionBarProps> = ({
  phase,
  isOwner = false,
  isReady = false,
  canStart = false,
  disabled = false,
  timeLeft = 0,
  highestRobScore = 0,
  canPlay = false,
  selectedCount = 0,
  onReady,
  onStart,
  onPlay,
  onPass,
  onReselect,
  isMyTurnToRob = false,
  onSkipRob,
  onRobLandlord,
  isRobotControlled = false,
  onCancelRobot,
  onSetRobot,
  onLeave,
  waitForName,
  waitForAction = 'play',
}) => {
  // 等待阶段
  if (isWaitingPhase(phase)) {
    return (
      <Space style={{ width: '100%', justifyContent: 'center' }}>
        <Button onClick={onReady} type={isReady ? 'default' : 'primary'}>
          {isReady ? '取消准备' : '准备'}
        </Button>
        {isOwner && (
          <Button
            type="primary"
            onClick={onStart}
            disabled={!canStart}
            style={{ backgroundColor: '#16a34a' }}
          >
            开始游戏
          </Button>
        )}
        <Button danger onClick={onLeave}>
          离开
        </Button>
      </Space>
    );
  }

  // 叫分阶段
  if (isRobbingPhase(phase)) {
    // 如果有人叫了3分，显示等待地主确定
    if (highestRobScore === 3) {
      return (
        <span style={{ color: '#6b7280' }}>
          等待地主确定...
        </span>
      );
    }

    if (isMyTurnToRob) {
      return (
        <Space style={{ width: '100%', justifyContent: 'center' }} size="middle">
          <Button
            onClick={() => {
              onSkipRob?.();
            }}
          >
            不叫
          </Button>
          <Button
            type="primary"
            onClick={() => onRobLandlord?.(1)}
            style={{ backgroundColor: '#f59e0b' }}
          >
            叫1分
          </Button>
          <Button
            type="primary"
            onClick={() => onRobLandlord?.(2)}
            style={{ backgroundColor: '#f59e0b' }}
          >
            叫2分
          </Button>
          <Button
            type="primary"
            onClick={() => onRobLandlord?.(3)}
            style={{ backgroundColor: '#dc2626' }}
          >
            叫3分
          </Button>
        </Space>
      );
    }
    return (
      <span style={{ color: '#6b7280' }}>
        等待 {waitForName} 叫地主...
      </span>
    );
  }

  // 出牌阶段
  if (isPlayingPhase(phase)) {
    if (canPlay) {
      return (
        <Space style={{ width: '100%', justifyContent: 'center' }} size="middle">
          {selectedCount > 0 && (
            <Button onClick={onReselect}>重选</Button>
          )}
          <Button onClick={onPass}>不出</Button>
          <Button
            type="primary"
            onClick={onPlay}
            disabled={disabled || selectedCount === 0}
            style={{ backgroundColor: '#16a34a' }}
          >
            出牌 {selectedCount > 0 && `(${selectedCount})`}
          </Button>
          {isRobotControlled ? (
            <Button danger onClick={onCancelRobot}>取消AI托管</Button>
          ) : (
            <Button onClick={onSetRobot}>AI托管</Button>
          )}
        </Space>
      );
    }
    if (selectedCount > 0) {
      return (
        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <Button onClick={onReselect}>重选</Button>
          <span style={{ color: '#6b7280' }}>
            等待 {waitForName} {waitForAction === 'play' ? '出牌' : '操作'}...
          </span>
          {isRobotControlled ? (
            <Button danger onClick={onCancelRobot}>取消AI托管</Button>
          ) : (
            <Button onClick={onSetRobot}>AI托管</Button>
          )}
        </Space>
      );
    }
    return (
      <Space style={{ width: '100%', justifyContent: 'center' }}>
        <span style={{ color: '#6b7280' }}>
          等待 {waitForName} {waitForAction === 'play' ? '出牌' : '操作'}...
        </span>
        {isRobotControlled ? (
          <Button danger onClick={onCancelRobot}>取消AI托管</Button>
        ) : (
          <Button onClick={onSetRobot}>AI托管</Button>
        )}
      </Space>
    );
  }

  return null;
};

export default ActionBar;