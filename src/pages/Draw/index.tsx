import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, List, Button, Typography, Space, Badge, Input, Modal, Form, message, Empty, Avatar, Tooltip, Tag, Row, Col, Switch, Popconfirm, Radio, InputNumber } from 'antd';
import { SearchOutlined, PlusOutlined, UserOutlined, TeamOutlined, ClockCircleOutlined, InfoCircleOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllRoomsUsingGet, createRoomUsingPost, joinRoomUsingPost, removeRoomUsingPost } from '@/services/backend/drawGameController';
import { useModel, history } from '@umijs/max';
import './index.less';
import { wsService } from '@/services/websocket';

const { Text } = Typography;

// 使用与后端接口一致的类型
type RoomItem = API.DrawRoomVO;

const DrawRoomPage: React.FC = () => {
  // 使用initialState获取当前用户信息
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  // 调试信息
  console.log('initialState:', initialState);
  console.log('currentUser:', currentUser);

  // 状态管理
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [createRoomVisible, setCreateRoomVisible] = useState(false);
  const [customRounds, setCustomRounds] = useState<boolean>(false);

  const [form] = Form.useForm();

  // 获取房间列表
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await getAllRoomsUsingGet();
      if (res.data && res.code === 0) {
        setRooms(res.data);
      } else {
        message.error('获取房间列表失败');
      }
    } catch (error) {
      console.error('获取房间列表出错:', error);
      message.error('获取房间列表出错');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载房间列表
  useEffect(() => {
    fetchRooms();
  }, []);

  // 过滤房间列表
  const filteredRooms = rooms.filter(room =>
    (room.creatorName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    room.roomId?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    room.wordHint?.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  // 判断当前用户是否是管理员
  const isAdmin = currentUser?.userRole === 'admin';

  // 删除房间
  const handleRemoveRoom = async (roomId: string) => {
    try {
      const res = await removeRoomUsingPost({ roomId });
      if (res.data && res.code === 0) {
        message.success('房间删除成功');
        fetchRooms(); // 刷新房间列表
      } else {
        message.error(res.message || '删除房间失败');
      }
    } catch (error) {
      console.error('删除房间出错:', error);
      message.error('删除房间失败，请稍后再试');
    }
  };

  // 计算房间剩余时间
  const getRemainingTime = (room: RoomItem) => {
    if (!room.roundEndTime) return null;

    const now = Date.now();
    const endTime = room.roundEndTime;
    const remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000));

    return remainingSeconds > 0 ? `${remainingSeconds}秒` : '即将结束';
  };

  // 创建房间
  const handleCreateRoom = async (values: any) => {
    try {
      const res = await createRoomUsingPost({
        maxPlayers: values.maxPlayers,
        totalRounds: values.totalRounds || 3,
        creatorOnlyMode: !values.creatorOnlyMode,
        wordType: values.wordType || '', // 添加词库类型参数
      });

      if (res.data && res.code === 0) {
        message.success('创建房间成功');
        setCreateRoomVisible(false);
        form.resetFields();
        setCustomRounds(false);

        // 创建完后直接进入房间
        history.push(`/game/draw/${res.data}`);
      } else {
        message.error(res.message || '创建房间失败');
      }
    } catch (error) {
      console.error('创建房间出错:', error);
      message.error('创建房间失败，请稍后再试');
    }
  };

  // 添加发送邀请的函数
  const [hasSentInvitation, setHasSentInvitation] = useState(false);
  const [invitationCooldown, setInvitationCooldown] = useState(0);
  
  const handleSendInvitation = (roomId: string | undefined) => {
    if (!currentUser?.id) {
      message.error('请先登录！');
      return;
    }

    if (hasSentInvitation) {
      message.warning('你已经发送过邀请了，请等待60秒后再试');
      return;
    }

    // 发送邀请消息到聊天室
    wsService.send({
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: {
          message: {
            id: `${Date.now()}`,
            content: `[invite/draw]${roomId}[/invite]`,
            sender: {
              id: String(currentUser.id),
              name: currentUser.userName || '游客',
              avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
              level: currentUser.level || 1,
              isAdmin: currentUser.userRole === 'admin',
            },
            timestamp: new Date(),
          },
        },
      },
    });

    setHasSentInvitation(true);
    setInvitationCooldown(60);
    message.success('邀请已发送到聊天室');

    // 设置60秒冷却时间
    const timer = setInterval(() => {
      setInvitationCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setHasSentInvitation(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleJoinButtonClick = async (room: RoomItem, isUserInRoom: boolean | undefined)=> {
    if (isUserInRoom || room.status === 'PLAYING') {
      // 如果用户已在房间或者是观战模式，直接进入
      history.push(`/game/draw/${room.roomId}`);
      handleJoinRoom(room);
    }
  }
  // 加入房间
  const handleJoinRoom = async (room: RoomItem) => {
    // 如果房间已满
    if (room.currentPlayers && room.maxPlayers && room.currentPlayers >= room.maxPlayers) {
      message.error('房间已满');
      return;
    }

    if (!room.roomId) {
      message.error('房间ID无效');
      return;
    }

    try {
      const res = await joinRoomUsingPost({ roomId: room.roomId });
      if (res.data && res.code === 0) {
        message.success('加入房间成功');
        history.push(`/game/draw/${room.roomId}`);
      } else {
        message.error(res.message || '加入房间失败');
      }
    } catch (error) {
      console.error('加入房间出错:', error);
      message.error('加入房间失败，请稍后再试');
    }
  };

  return (
    <PageContainer
      header={{
        title: '你画我猜房间列表',
      }}
    >
      <Row justify="center">
        <Col xs={24} sm={24} md={20} lg={18} xl={16}>
          <div className="room-controls">
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} size="large">
              <div>
                <Input
                  placeholder="搜索房间"
                  prefix={<SearchOutlined className="search-icon" />}
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                  className="search-input"
                />
              </div>
              <div>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateRoomVisible(true)}
                    className="create-button"
                  >
                    创建房间
                  </Button>
                  <Button
                    onClick={fetchRooms}
                    loading={loading}
                    icon={<ReloadOutlined />}
                  >
                    刷新
                  </Button>
                </Space>
              </div>
            </Space>
          </div>

          <Card
            className="room-list-card"
            loading={loading}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px' }}>
                <span>房间列表</span>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  共 {filteredRooms.length} 个房间
                </Text>
              </div>
            }
            headStyle={{ padding: '16px 12px' }}
          >
            {filteredRooms.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={filteredRooms}
                renderItem={room => {
                  const remainingTime = getRemainingTime(room);
                  const isRoomFull = !!(room.currentPlayers && room.maxPlayers && room.currentPlayers >= room.maxPlayers);

                  // 检查当前用户是否已在房间中
                  const isUserInRoom = currentUser && room.participants &&
                    room.participants.some(player => {
                      if (!currentUser || !player.userId) return false;

                      // 将两个ID都转换为字符串进行比较
                      const currentUserId = String(currentUser.id);
                      const playerUserId = String(player.userId);


                      return currentUserId === playerUserId;
                    });

                  // 判断当前用户是否是房主
                  const isRoomCreator = currentUser && room.creatorId === currentUser.id;
                  
                  // 判断用户是否可以删除房间（房主或管理员）
                  const canDeleteRoom = isRoomCreator || isAdmin;


                  return (
                    <List.Item
                      className="room-list-item"
                      actions={[
                        <Button
                          type="primary"
                          onClick={() => handleJoinButtonClick(room, isUserInRoom)}
                          className={`join-button ${isUserInRoom ? 'join-button-detail' :
                            (room.status === 'WAITING' ? 'join-button-waiting' : 'join-button-playing')}`}
                        >
                          {isUserInRoom ? '查看详情' : (room.status === 'WAITING' ? '加入' : '观战')}
                        </Button>,
                        <Button 
                          type="primary" 
                          onClick={() => handleSendInvitation(room.roomId)}
                          disabled={hasSentInvitation}
                          style={{ display: isRoomCreator ? 'block' : 'none' }}
                        >
                          {hasSentInvitation ? `冷却中 (${invitationCooldown}s)` : '发送邀请'}
                        </Button>,
                        canDeleteRoom && (
                          <Popconfirm
                            title="确定要删除该房间吗？"
                            onConfirm={() => handleRemoveRoom(room.roomId!)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              size="middle"
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        )
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar src={room.creatorAvatar} size={40} className="room-avatar" />
                        }
                        title={
                          <div className="room-title">
                            <Text strong className="room-name">{room.creatorName}的房间</Text>
                            <Badge
                              status={room.status === 'WAITING' ? 'success' : 'processing'}
                              text={
                                <span className={`room-status ${room.status === 'WAITING' ? 'status-waiting' : 'status-playing'}`}>
                                  {room.status === 'WAITING' ? '等待中' : '游戏中'}
                                </span>
                              }
                            />
                            {room.status === 'PLAYING' && room.currentDrawerName && (
                              <Tag color="blue">
                                当前绘画者: {room.currentDrawerName}
                              </Tag>
                            )}
                            {isUserInRoom && (
                              <Tag color="success" className="user-joined-tag">
                                已加入
                              </Tag>
                            )}
                          </div>
                        }
                        description={
                          <div className="room-info">
                            <div className="room-owner">
                              <UserOutlined className="owner-icon" />
                              <span>房主: {room.creatorName}</span>
                            </div>
                            <div className="room-players">
                              <TeamOutlined className="players-icon" />
                              <span className={isRoomFull ? 'room-full' : ''}>
                                {room.currentPlayers}/{room.maxPlayers}
                              </span>
                            </div>
                            {room.status === 'PLAYING' && remainingTime && (
                              <div className="room-timer">
                                <ClockCircleOutlined />
                                <span>剩余时间: {remainingTime}</span>
                              </div>
                            )}
                            {/* 隐藏提示词 */}
                            <div className="room-create-time">
                              <span>创建时间: {new Date(room.createTime || '').toLocaleString()}</span>
                              <Tooltip title={`房间ID: ${room.roomId}`}>
                                <InfoCircleOutlined style={{ marginLeft: 8, cursor: 'pointer' }} />
                              </Tooltip>
                            </div>
                            {room.participants && room.participants.length > 0 && (
                              <div className="room-participants">
                                <span>参与者: </span>
                                <Avatar.Group maxCount={5} size={20}>
                                  {room.participants.map((player, index) => (
                                    <Tooltip
                                      key={index}
                                      title={
                                        <>
                                          {player.userName}
                                          {currentUser && String(player.userId) === String(currentUser.id) && ' (你)'}
                                        </>
                                      }
                                    >
                                      <Avatar
                                        src={player.userAvatar}
                                        size={20}
                                        style={currentUser && String(player.userId) === String(currentUser.id) ?
                                          { border: '2px solid #52c41a' } : undefined}
                                      />
                                    </Tooltip>
                                  ))}
                                </Avatar.Group>
                                {currentUser && room.participants.some(p =>
                                  String(p.userId) === String(currentUser.id)
                                ) && (
                                  <Tag color="success" style={{ marginLeft: 8 }}>已加入</Tag>
                                )}
                              </div>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty
                description="暂无房间，创建一个吧！"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '40px 0', padding: '20px 0' }}
                imageStyle={{ height: 60 }}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateRoomVisible(true)}
                  style={{ marginTop: 16 }}
                >
                  创建房间
                </Button>
              </Empty>
            )}
          </Card>
        </Col>
      </Row>

      {/* 创建房间的模态框 */}
      <Modal
        title={<div className="create-room-title">创建你画我猜房间</div>}
        open={createRoomVisible}
        onCancel={() => {
          setCreateRoomVisible(false);
          setCustomRounds(false);
        }}
        footer={null}
        className="create-room-modal"
        width={420}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRoom}
          initialValues={{
            maxPlayers: 8,
            totalRounds: 6,
            creatorOnlyMode: true,
            wordType: 'default', 
          }}
          className="create-room-form"
        >
          <Form.Item
            name="maxPlayers"
            label={<span className="form-label">最大玩家数</span>}
            rules={[{ required: true, message: '请选择最大玩家数' }]}
          >
            <Input
              type="number"
              min={2}
              max={20}
              prefix={<TeamOutlined className="input-prefix-icon" />}
              className="styled-input"
            />
          </Form.Item>

          <Form.Item
            name="totalRounds"
            label={<span className="form-label">游戏轮数</span>}
            rules={[{ required: true, message: '请选择游戏轮数' }]}
          >
            <div>
              <Radio.Group 
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setCustomRounds(true);
                  } else {
                    setCustomRounds(false);
                    form.setFieldsValue({ totalRounds: e.target.value });
                  }
                }}
                defaultValue={6}
              >
                <Radio.Button value={3}>3轮</Radio.Button>
                <Radio.Button value={6}>6轮</Radio.Button>
                <Radio.Button value={8}>8轮</Radio.Button>
                <Radio.Button value={12}>12轮</Radio.Button>
                <Radio.Button value="custom">自定义</Radio.Button>
              </Radio.Group>
              
              {customRounds && (
                <InputNumber 
                  min={1} 
                  max={20} 
                  className="styled-input" 
                  style={{ marginTop: 8, width: '100%' }}
                  onChange={(value) => form.setFieldsValue({ totalRounds: value })}
                  placeholder="请输入轮数(1-20)"
                />
              )}
            </div>
          </Form.Item>

          <Form.Item
            name="wordType"
            label={<span className="form-label">词库类型</span>}
            rules={[{ required: true, message: '请选择词库类型' }]}
          >
            <Radio.Group>
              <Radio.Button value="default">默认词库</Radio.Button>
              <Radio.Button value="hero">王者荣耀</Radio.Button>
              <Radio.Button value="idiom">成语</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="creatorOnlyMode"
            label={<span className="form-label">轮换模式</span>}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item className="submit-button-container">
            <Button type="primary" htmlType="submit" block className="create-room-button">
              创建房间
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default DrawRoomPage;
