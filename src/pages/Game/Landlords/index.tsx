/**
 * 斗地主房间列表页面
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Button, Tabs, List, Spin, message as antMessage, Empty, Tag, Space, Modal, Alert } from 'antd';
import { Users, RefreshCw, Plus, Lock, Crown, PlayCircle, AlertCircle } from 'lucide-react';
import { wsService } from '@/services/websocket';
import { useModel, history } from '@umijs/max';
import { RoomRestriction, RoomStateBackend } from './types';

const MSG_TYPE = {
  GAME_ROOM_LIST: 'gameRoomList',
  GAME_CREATE_ROOM: 'gameCreateRoom',
  GAME_ROOM_ADDED: 'gameRoomAdded',
  GAME_ROOM_REMOVED: 'gameRoomRemoved',
};

const codeToGameTypeName = (code: string) => {
  const map: Record<string, string> = {
    classic: 'LANDLORDS_CLASSIC',
    laizi: 'LANDLORDS_LAIZI',
  };
  return map[code] || code;
};

const gameTypeToLabel = (code: string) => {
  const map: Record<string, string> = {
    LANDLORDS_CLASSIC: '经典模式',
    LANDLORDS_LAIZI: '癞子模式',
  };
  return map[code] || code;
};

// 房间状态中文显示
const getStateLabel = (state: string) => {
  const map: Record<string, string> = {
    [RoomStateBackend.WAITING]: '等待开始',
    [RoomStateBackend.READY]: '准备中',
    [RoomStateBackend.DISTRIBUTING]: '发牌中',
    [RoomStateBackend.ROBBING]: '叫地主',
    [RoomStateBackend.PLAYING]: '游戏中',
    [RoomStateBackend.ENDING]: '结束',
    [RoomStateBackend.CLOSED]: '已关闭',
  };
  return map[state] || state;
};

// 获取房间状态颜色
const getStateColor = (state: string) => {
  const map: Record<string, string> = {
    [RoomStateBackend.WAITING]: 'default',
    [RoomStateBackend.READY]: 'processing',
    [RoomStateBackend.DISTRIBUTING]: 'processing',
    [RoomStateBackend.ROBBING]: 'warning',
    [RoomStateBackend.PLAYING]: 'error',
    [RoomStateBackend.ENDING]: 'success',
    [RoomStateBackend.CLOSED]: 'default',
  };
  return map[state] || 'default';
};

const LandlordsIndex: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const userId = currentUser?.id;

  const [selectedGameType, setSelectedGameType] = useState('classic');
  const [roomList, setRoomList] = useState<any[]>([]);
  const [restriction, setRestriction] = useState<RoomRestriction | null>(null);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState<string | null>(null);

  const handlersRef = useRef<Record<string, (data: any) => void>>({});

  const handleGameRoomList = useCallback((payload: any) => {
    const data = payload?.data ?? payload;
    if (data?.rooms) {
      // 显示所有房间，不按模式过滤
      setRoomList(data.rooms);
    }
    // 处理房间限制信息
    if (data?.restriction) {
      setRestriction(data.restriction);
    } else {
      setRestriction(null);
    }
  }, []);

  const handleGameRoomAdded = useCallback((payload: any) => {
    const data = payload?.data ?? payload;
    if (data?.roomInfo) {
      // 添加新房间到列表，不按模式过滤
      setRoomList((prev) => {
        if (prev.some((room) => room.roomId === data.roomId)) {
          return prev;
        }
        return [data.roomInfo, ...prev];
      });
    }
  }, []);

  const handleGameRoomRemoved = useCallback((payload: any) => {
    const data = payload?.data ?? payload;
    if (data?.roomId) {
      // 从列表中移除房间
      setRoomList((prev) =>
        prev.filter((room) => room.roomId !== data.roomId)
      );
    }
  }, []);

  const handleGameCreateRoom = useCallback((payload: any) => {
    const data = payload?.data ?? payload;
    if (data?.roomId) {
      history.push(`/game/landlords/${data.roomId}`);
    }
  }, []);

  const handleError = useCallback((payload: any) => {
    antMessage.error(payload?.data || '发生错误');
  }, []);

  useEffect(() => {
    if (!userId) return;

    const handlers: Record<string, (data: any) => void> = {
      [MSG_TYPE.GAME_ROOM_LIST]: handleGameRoomList,
      [MSG_TYPE.GAME_ROOM_ADDED]: handleGameRoomAdded,
      [MSG_TYPE.GAME_ROOM_REMOVED]: handleGameRoomRemoved,
      [MSG_TYPE.GAME_CREATE_ROOM]: handleGameCreateRoom,
      error: handleError,
    };

    handlersRef.current = handlers;
    Object.entries(handlers).forEach(([type, handler]) => {
      wsService.addMessageHandler(type, handler);
    });

    // 监听其他页面离开房间的事件
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'landlords_left_room' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.roomId) {
            // 离开的房间ID，去掉该限制
            setRestriction((prev) => {
              if (prev?.roomId === data.roomId) {
                return null;
              }
              return prev;
            });
          }
        } catch (err) {
          console.error('[landlords] 解析离开房间数据失败', err);
        }
        // 清除标记
        localStorage.removeItem('landlords_left_room');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      Object.keys(handlers).forEach((type) => {
        wsService.removeMessageHandler(type, handlers[type]);
      });
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [
    userId,
    handleGameRoomList,
    handleGameRoomAdded,
    handleGameRoomRemoved,
    handleGameCreateRoom,
    handleError,
  ]);

  const sendMessageWithUserId = useCallback((type: string, data: Record<string, any> = {}) => {
    if (!userId) {
      console.debug('[landlords-index] userId not ready, skip:', type);
      return;
    }

    const doSend = () => {
      wsService.send({
        type: 2,
        userId: String(userId),
        data: JSON.stringify({ type, content: JSON.stringify(data) }),
      });
    };

    if (!wsService.isConnected()) {
      const token = localStorage.getItem('tokenValue');
      if (!token) {
        antMessage.error('请先登录');
        return;
      }
      wsService.connect(token);
      let attempts = 0;
      const maxAttempts = 40;
      const checkAndSend = setInterval(() => {
        attempts++;
        if (wsService.isConnected()) {
          clearInterval(checkAndSend);
          doSend();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkAndSend);
          antMessage.error('连接服务器失败');
        }
      }, 50);
      return;
    }

    doSend();
  }, [userId]);

  const refreshRoomList = useCallback(() => {
    sendMessageWithUserId(MSG_TYPE.GAME_ROOM_LIST, {
      gameType: codeToGameTypeName(selectedGameType),
    });
  }, [sendMessageWithUserId, selectedGameType]);

  useEffect(() => {
    if (!userId) return undefined;
    refreshRoomList();
    const interval = setInterval(refreshRoomList, 5000);
    return () => clearInterval(interval);
  }, [userId, selectedGameType, refreshRoomList]);

  const handleCreateRoom = () => {
    if (!userId) {
      antMessage.error('请先登录');
      return;
    }
    // 检查房间限制
    if (restriction) {
      Modal.confirm({
        title: '房间限制',
        icon: <AlertCircle />,
        content: (
          <div>
            <p>你正在房间 <strong>{restriction.roomId}</strong> 中游戏</p>
            <p style={{ color: '#666' }}>
              当前状态：{getStateLabel(restriction.state)}
            </p>
            <p style={{ color: '#888', fontSize: 12 }}>
              请先回到该房间或等待游戏结束后再创建新房间
            </p>
          </div>
        ),
        okText: '回到原房间',
        cancelText: '留在当前页面',
        onOk: () => {
          history.push(`/game/landlords/${restriction.roomId}`);
        },
      });
      return;
    }
    sendMessageWithUserId(MSG_TYPE.GAME_CREATE_ROOM, {
      gameType: codeToGameTypeName(selectedGameType),
    });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!userId) {
      antMessage.error('请先登录');
      return;
    }
    // 检查房间限制 - 如果是回到自己的房间，直接跳转
    if (restriction && restriction.roomId !== roomId) {
      setTargetRoomId(roomId);
      setShowRestrictionModal(true);
      return;
    }
    history.push(`/game/landlords/${roomId}`);
  };

  const handleRestrictionModalOk = () => {
    if (targetRoomId) {
      history.push(`/game/landlords/${targetRoomId}`);
    } else if (restriction) {
      history.push(`/game/landlords/${restriction.roomId}`);
    }
    setShowRestrictionModal(false);
    setTargetRoomId(null);
  };

  return (
    <PageContainer
      header={{
        title: '斗地主',
        subTitle: '经典三人斗地主对战',
      }}
    >
      {/* 顶部模式选择和创建按钮 */}
      <Card
        style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg, #1a5f2a 0%, #0f3d1a 100%)',
          color: 'white',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>斗地主</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              三人对战，经典玩法。叫地主、出牌、抢分，比比谁先出完！
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<Plus size={20} />}
            onClick={handleCreateRoom}
            style={{ height: 48, paddingLeft: 24, paddingRight: 24, fontSize: 18 }}
          >
            创建房间
          </Button>
        </Space>
      </Card>

      {/* 模式选择 */}
      <Card style={{ marginBottom: 16 }}>
        <Tabs
          activeKey={selectedGameType}
          onChange={(key) => {
            setSelectedGameType(key);
          }}
          items={[
            { key: 'classic', label: '经典模式' },
            { key: 'laizi', label: '癞子模式' },
          ]}
        />
      </Card>

      {/* 房间限制提示 */}
      {restriction && (
        <Card
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #fffbe6 0%, #ffffff 100%)',
            border: '2px solid #faad14',
          }}
          bodyStyle={{ padding: 16 }}
        >
          <Space>
            <AlertCircle style={{ color: '#faad14', fontSize: 20 }} />
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                你正在房间 <strong>{restriction.roomId}</strong> 中游戏
              </div>
              <Space>
                <Tag color={getStateColor(restriction.state)}>
                  {getStateLabel(restriction.state)}
                </Tag>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => history.push(`/game/landlords/${restriction.roomId}`)}
                >
                  回到房间
                </Button>
              </Space>
            </div>
          </Space>
        </Card>
      )}

      {/* 房间列表 */}
      <Card
        title={
          <Space>
            <Users size={20} />
            <span>房间列表 ({roomList.length})</span>
            {restriction && (
              <Tag color="warning">你的操作受限</Tag>
            )}
          </Space>
        }
        extra={
          <Button
            icon={<RefreshCw size={16} />}
            onClick={refreshRoomList}
            loading={false}
          >
            刷新
          </Button>
        }
      >
        <Spin spinning={false}>
          {roomList.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <div style={{ color: '#6b7280', marginBottom: 8 }}>暂无房间</div>
                  <div style={{ color: '#9ca3af', fontSize: 14 }}>
                    点击右上角"创建房间"开始一局游戏
                  </div>
                </div>
              }
              style={{ padding: '40px 0' }}
            >
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={handleCreateRoom}
              >
                创建房间
              </Button>
            </Empty>
          ) : (
            <List
              grid={{
                gutter: 16,
                xs: 1,
                sm: 2,
                md: 2,
                lg: 3,
                xl: 3,
                xxl: 4,
              }}
              dataSource={roomList}
              renderItem={(item: any) => {
                const playerCount = item.playerCount || 0;
                const maxPlayers = item.maxPlayers || 3;
                const isFull = playerCount >= maxPlayers;
                const isPlaying = item.state === RoomStateBackend.PLAYING || item.state === RoomStateBackend.ROBBING;
                const isMyRoom = restriction?.roomId === item.roomId;

                return (
                  <List.Item>
                    <Card
                      hoverable
                      style={{
                        transition: 'all 0.2s',
                        borderColor: isMyRoom ? '#faad14' : undefined,
                      }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 'bold', fontSize: 18 }}>
                          {item.roomId}
                        </div>
                        <Space>
                          {isMyRoom && (
                            <Tag color="warning">你的房间</Tag>
                          )}
                          {isPlaying && (
                            <Tag color="error" icon={<PlayCircle />}>
                              游戏中
                            </Tag>
                          )}
                          {item.needPassword && (
                            <Tag
                              color="warning"
                              icon={<Lock size={12} />}
                              style={{ margin: 0 }}
                            >
                              有密码
                            </Tag>
                          )}
                        </Space>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#6b7280', fontSize: 14 }}>
                        <Users size={14} />
                        <span>
                          {playerCount}/{maxPlayers} 人
                        </span>
                        <span style={{ marginLeft: 'auto' }}>
                          {gameTypeToLabel(item.gameType)}
                        </span>
                      </div>
                      <Button
                        type={isMyRoom ? 'default' : 'primary'}
                        block
                        disabled={isFull && !isMyRoom}
                        onClick={() => handleJoinRoom(item.roomId)}
                      >
                        {isMyRoom ? '回到房间' : isFull ? '房间已满' : '加入房间'}
                      </Button>
                    </Card>
                  </List.Item>
                );
              }}
            />
          )}
        </Spin>
      </Card>

      {/* 房间限制提示弹窗 */}
      <Modal
        title="房间限制"
        open={showRestrictionModal}
        onOk={handleRestrictionModalOk}
        onCancel={() => {
          setShowRestrictionModal(false);
          setTargetRoomId(null);
        }}
        okText={targetRoomId ? '加入该房间' : '回到原房间'}
        cancelText="取消"
      >
        <div>
          <p>
            你正在房间 <strong>{restriction?.roomId}</strong> 中游戏
          </p>
          <p style={{ color: '#666' }}>
            当前状态：{restriction ? getStateLabel(restriction.state) : ''}
          </p>
          {targetRoomId && (
            <p style={{ color: '#888' }}>
              你想加入的房间是 <strong>{targetRoomId}</strong>
            </p>
          )}
          <p style={{ color: '#888', fontSize: 12 }}>
            请先回到原房间完成游戏，或等待游戏结束后再进行其他操作
          </p>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default LandlordsIndex;
