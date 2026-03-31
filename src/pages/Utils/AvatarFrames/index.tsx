import React, { useState, useEffect } from 'react';
import { Avatar, Button, message, Spin, Tabs, Modal, Card, List, Typography, Tag } from 'antd';
import { ShopOutlined, CrownOutlined, GiftOutlined, ExclamationCircleOutlined, CreditCardOutlined, CheckCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { getLoginUserUsingGet } from '@/services/backend/userController';
import { listAvatarFrameVoByPageUsingPost, exchangeFrameUsingPost, setCurrentFrameUsingPost } from '@/services/backend/avatarFrameController';
import { listPropsPageUsingGet, purchasePropsUsingPost } from '@/services/backend/propsController';
import { listMyPointsRecordsUsingGet } from '@/services/backend/userPointsRecordController';
import styles from './index.module.less';
import './index.less';
import { useModel } from '@umijs/max';
import InfiniteScroll from 'react-infinite-scroll-component';
import {history} from "@@/core/history";

const { confirm } = Modal;

const AvatarFrames: React.FC = () => {
  const { setInitialState } = useModel('@@initialState');
  const [activeTab, setActiveTab] = useState<string>('frames');
  const [frames, setFrames] = useState<API.AvatarFrameVO[]>([]);
  const [props, setProps] = useState<API.PropsVO[]>([]);
  const [pointsRecords, setPointsRecords] = useState<API.VO[]>([]);
  const [currentUser, setCurrentUser] = useState<API.LoginUserVO | null>(null);
  const [previewFrame, setPreviewFrame] = useState<API.AvatarFrameVO | null>(null);
  const [framesCurrent, setFramesCurrent] = useState<number>(1);
  const [propsCurrent, setPropsCurrent] = useState<number>(1);
  const [pointsCurrent, setPointsCurrent] = useState<number>(1);
  const [framesLoading, setFramesLoading] = useState<boolean>(true);
  const [propsLoading, setPropsLoading] = useState<boolean>(true);
  const [pointsLoading, setPointsLoading] = useState<boolean>(false);
  const [hasMoreFrames, setHasMoreFrames] = useState<boolean>(true);
  const [hasMoreProps, setHasMoreProps] = useState<boolean>(true);
  const [hasMorePoints, setHasMorePoints] = useState<boolean>(true);

  // 获取当前登录用户
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getLoginUserUsingGet();
        if (res.data) {
          setCurrentUser(res.data);
        }
      } catch (error) {
        message.error('获取用户信息失败');
      }
    };
    fetchUser();
  }, []);

  // 获取头像框列表
  const fetchFrames = async (page: number) => {
    try {
      setFramesLoading(true);
      const res = await listAvatarFrameVoByPageUsingPost({
        current: page,
        pageSize: 10,
      });
      if (res?.data) {
        // 添加空头像框作为第一个选项（仅在第一页）
        if (page === 1) {
          const emptyFrame: API.AvatarFrameVO = {
            id: -1,
            name: '',
            points: 0,
            url: '',
            hasOwned: true
          };
          setFrames([emptyFrame, ...(res.data.records ?? [])]);
        } else {
          setFrames(prev => [...prev, ...(res.data?.records ?? [])]);
        }
        setHasMoreFrames((res.data?.records?.length ?? 0) > 0);
      }
    } catch (error) {
      message.error('获取头像框列表失败');
    } finally {
      setFramesLoading(false);
    }
  };

  // 获取道具列表
  const fetchProps = async (page: number) => {
    try {
      setPropsLoading(true);
      const res = await listPropsPageUsingGet({
        current: page,
        pageSize: 10,
      });
      if (res?.data) {
        if (page === 1) {
          setProps(res.data.records ?? []);
        } else {
          setProps(prev => [...prev, ...(res.data?.records ?? [])]);
        }
        setHasMoreProps((res.data?.records?.length ?? 0) > 0);
      }
    } catch (error) {
      message.error('获取道具列表失败');
    } finally {
      setPropsLoading(false);
    }
  };

  // 初始加载头像框数据
  useEffect(() => {
    fetchFrames(1);
  }, []);

  const loadMoreFrames = () => {
    if (framesLoading) return;
    const nextPage = framesCurrent + 1;
    setFramesCurrent(nextPage);
    fetchFrames(nextPage);
  };

  const loadMoreProps = () => {
    if (propsLoading) return;
    const nextPage = propsCurrent + 1;
    setPropsCurrent(nextPage);
    fetchProps(nextPage);
  };

  // 获取积分记录列表
  const fetchPointsRecords = async (page: number) => {
    try {
      setPointsLoading(true);
      const res = await listMyPointsRecordsUsingGet({
        current: page,
        pageSize: 10,
      });
      if (res?.data) {
        if (page === 1) {
          setPointsRecords(res.data.records ?? []);
        } else {
          setPointsRecords(prev => [...prev, ...(res.data?.records ?? [])]);
        }
        setHasMorePoints((res.data?.records?.length ?? 0) > 0);
      }
    } catch (error) {
      message.error('获取积分记录失败');
    } finally {
      setPointsLoading(false);
    }
  };

  const loadMorePointsRecords = () => {
    if (pointsLoading) return;
    const nextPage = pointsCurrent + 1;
    setPointsCurrent(nextPage);
    fetchPointsRecords(nextPage);
  };

  const handlePurchase = async (frame: API.AvatarFrameVO) => {
    if (!currentUser) {
      message.error('请先登录');
      return;
    }

    const availablePoints = (currentUser.points ?? 0) - (currentUser.usedPoints ?? 0);
    if (availablePoints < (frame.points ?? 0)) {
      message.error('可用积分不足');
      return;
    }

    try {
      const res = await exchangeFrameUsingPost({
        frameId: frame.id ?? 0,
      });
      if (res.data) {
        message.success('购买成功！');
        // 刷新用户信息和头像框列表
        const userRes = await getLoginUserUsingGet();
        if (userRes.data) {
          setCurrentUser(userRes.data);
        }
        // 重新加载第一页数据
        setFramesCurrent(1);
        fetchFrames(1);
      }
    } catch (error) {
      message.error('购买失败，请重试');
    }
  };

  const showPurchaseConfirm = (prop: API.PropsVO) => {
    if (!currentUser) {
      message.error('请先登录');
      return;
    }

    const availablePoints = (currentUser.points ?? 0) - (currentUser.usedPoints ?? 0);
    if (availablePoints < (prop.points ?? 0)) {
      message.error('可用积分不足');
      return;
    }

    confirm({
      title: '确认购买',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>您确定要购买 <strong>{prop.name}</strong> 吗？</p>
          <p>将消耗 <strong style={{ color: '#ff4d4f' }}>{prop.points}</strong> 积分</p>
          <p>购买后不可退还</p>
        </div>
      ),
      okText: '确认购买',
      cancelText: '取消',
      onOk() {
        return handlePurchaseProps(prop);
      },
    });
  };

  const handlePurchaseProps = async (prop: API.PropsVO) => {
    try {
      const res = await purchasePropsUsingPost({
        propsId: prop.frameId ?? 0,
      });
      if (res.data) {
        message.success('购买成功！');
        // 刷新用户信息
        const userRes = await getLoginUserUsingGet();
        if (userRes.data) {
          setCurrentUser(userRes.data);
        }
        // 重新加载第一页数据
        setPropsCurrent(1);
        fetchProps(1);
      }
    } catch (error) {
      message.error('购买失败，请重试');
    }
  };

  const handleSetFrame = async (frame: API.AvatarFrameVO) => {
    try {
      const res = await setCurrentFrameUsingPost({
        frameId: frame.id ?? 0,
      });
      if (res.data) {
        message.success('设置成功！');
        // 刷新用户信息
        const userRes = await getLoginUserUsingGet();
        if (userRes.data) {
          setCurrentUser(userRes.data);
          // 更新全局状态
          setInitialState((s) => ({
            ...s,
            currentUser: userRes.data,
          }));
        }
      }
    } catch (error) {
      message.error('设置失败，请重试');
    }
  };

  // 头像框标签页内容
  const renderAvatarFrames = () => (
    <InfiniteScroll
      dataLength={frames.length}
      next={loadMoreFrames}
      hasMore={hasMoreFrames}
      loader={
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      }
      endMessage={
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          没有更多头像框了
        </div>
      }
    >
      <div className={styles.frameList}>
        {frames.map((frame) => (
          <div
            key={frame.id}
            className={styles.frameItem}
            onMouseEnter={() => setPreviewFrame(frame)}
            onMouseLeave={() => setPreviewFrame(null)}
          >
            <div className={styles.framePreview}>
              <div className={styles.frameDisplay}>
                <div className={styles.placeholderCircle} />
                {frame.id !== -1 && (
                  <img
                    src={frame.url}
                    className={styles.avatarFrame}
                    alt={frame.name}
                  />
                )}
              </div>
            </div>
            <div className={styles.frameInfo}>
              <h3>{frame.name}</h3>
              <div className={styles.priceTag}>
                {frame.points} 积分
              </div>
              {frame.hasOwned ? (
                <Button
                  type="primary"
                  onClick={() => handleSetFrame(frame)}
                  className={styles.purchaseButton}
                >
                  使用
                </Button>
              ) : (
                <Button
                  type="default"
                  danger
                  onClick={() => handlePurchase(frame)}
                  className={styles.purchaseButton}
                >
                  立即兑换
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </InfiniteScroll>
  );

  // 其他物品标签页内容
  const renderOtherItems = () => (
    <InfiniteScroll
      dataLength={props.length}
      next={loadMoreProps}
      hasMore={hasMoreProps}
      loader={
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      }
      endMessage={
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          没有更多道具了
        </div>
      }
    >
      <div className={styles.frameList}>
        {props.length > 0 ? (
          props.map((prop) => (
            <div
              key={prop.frameId}
              className={styles.frameItem}
            >
              <div className={styles.framePreview}>
                <div className={styles.propsDisplay}>
                  <img
                    src={prop.imgUrl}
                    className={styles.propsImage}
                    alt={prop.name}
                  />
                </div>
              </div>
              <div className={styles.frameInfo}>
                <h3>{prop.name}</h3>
                <p className={styles.propsDescription}>
                  {prop.description}
                </p>
                <div className={styles.priceTag}>
                  {prop.points} 积分
                </div>
                <Button
                  type="default"
                  danger
                  onClick={() => showPurchaseConfirm(prop)}
                  className={styles.purchaseButton}
                >
                  立即兑换
                </Button>
              </div>
            </div>
          ))
        ) : (
          // 加载中或无数据时显示占位内容
          <>
            <div className={styles.frameItem}>
              <div className={styles.framePreview}>
                <div className={styles.comingSoonItem}>
                  <GiftOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  <p>
                    {propsLoading ? '加载中...' : '暂无道具'}
                  </p>
                </div>
              </div>
              <div className={styles.frameInfo}>
                <div className={styles.priceTag}>
                  ??? 积分
                </div>
                <Button
                  type="default"
                  disabled
                  className={styles.purchaseButton}
                >
                  敬请期待
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </InfiniteScroll>
  );

  const renderMonthlyCard = () => {
    const features = [
      {
        title: '永久会员资格',
        description: '一次支持，即可获得网站永久会员身份。',
        tag: '永久有效',
      },
      {
        title: '每日积分奖励',
        description: '成为会员后，每日登录可额外获得 10 点可用积分。',
        tag: '+10 积分/天',
      },
      {
        title: '每日免费红包',
        description: '会员每天发送的第一个红包将不消耗任何积分。',
        tag: '每日一次',
      },
      {
        title: '双倍红包机会',
        description: '会员每日可发送两次红包，而普通用户只能发送一次。',
        tag: '特权',
      },
      {
        title: '解锁高级功能',
        description: '无需达到 2100 积分，会员可直接解锁发红包等高级功能。',
        tag: '立即解锁',
      },
    ];

    return (
      <div className="monthlyCardContainer">
        <Card
          className="monthlyCard"
          title={
            <>
              <div>摸鱼月卡</div>
              <div className="cardSubtitle">支持网站，享受更多特权</div>
            </>
          }
        >
          <List
            className="privilegeList"
            itemLayout="horizontal"
            dataSource={features}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<CheckCircleOutlined className="privilegeIcon" />}
                  title={
                    <>
                      {item.title} <Tag className="priceTag">{item.tag}</Tag>
                    </>
                  }
                  description={item.description}
                />
              </List.Item>
            )}
          />
          <div className="supportButtonContainer">
            <Button type="primary" size="large" onClick={() => history.push('/rank/reward')}>
              前往支持
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  // 积分记录标签页内容
  const renderPointsRecords = () => (
    <InfiniteScroll
      dataLength={pointsRecords.length}
      next={loadMorePointsRecords}
      hasMore={hasMorePoints}
      loader={
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      }
      endMessage={
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          没有更多记录了
        </div>
      }
    >
      <div className="pointsRecordsList" style={{ padding: '0 20px' }}>
        {pointsRecords.map((record) => (
          <Card
            key={record.id}
            size="small"
            style={{
              marginBottom: '12px',
              borderRadius: '8px',
              border: '1px solid #f0f0f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '15px', marginBottom: '4px' }}>
                  {record.description || record.sourceTypeText || '积分变动'}
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                  {record.createTime}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '16px',
                  color: record.changeType === 1 ? '#52c41a' : '#ff4d4f'
                }}>
                  {record.changeType === 1 ? '+' : '-'}{record.changePoints}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  可用: {(record.afterPoints ?? 0) - (record.afterUsedPoints ?? 0)}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {pointsRecords.length === 0 && !pointsLoading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <HistoryOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>暂无积分记录</div>
          </div>
        )}
      </div>
    </InfiniteScroll>
  );

  const tabItems = [
    {
      key: 'frames',
      label: (
        <span>
          <CrownOutlined />
          头像框
        </span>
      ),
      children: renderAvatarFrames(),
    },
    {
      key: 'others',
      label: (
        <span>
          <GiftOutlined />
          其他物品
        </span>
      ),
      children: renderOtherItems(),
    },
    {
      key: 'monthlyCard',
      label: (
        <span>
          <CreditCardOutlined />
          相关物品介绍
        </span>
      ),
      children: renderMonthlyCard(),
    },
    {
      key: 'pointsRecords',
      label: (
        <span>
          <HistoryOutlined />
          积分记录
        </span>
      ),
      children: renderPointsRecords(),
    },
  ];

  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);

    // 重置数据和页码
    if (key === 'frames') {
      // 如果切换到头像框标签，重置头像框数据和页码
      setFramesCurrent(1);
      setFrames([]);
      setHasMoreFrames(true);
      fetchFrames(1);
    } else if (key === 'others') {
      // 如果切换到其他物品标签，重置道具数据和页码
      setPropsCurrent(1);
      setProps([]);
      setHasMoreProps(true);
      fetchProps(1);
    } else if (key === 'monthlyCard') {
      // 切换到月卡标签，不需要加载数据
    } else if (key === 'pointsRecords') {
      // 如果切换到积分记录标签，重置积分记录数据和页码
      setPointsCurrent(1);
      setPointsRecords([]);
      setHasMorePoints(true);
      fetchPointsRecords(1);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h1>
            <ShopOutlined style={{ marginRight: 8 }} />
            摸鱼商店
          </h1>
          <p className={styles.subtitle}>用摸鱼积分兑换你想要的物品吧</p>
        </div>
        <div className={styles.userPreview}>
          <div className={styles.avatarWithFrame}>
            <Avatar src={currentUser?.userAvatar} size={120} />
            {(currentUser?.avatarFramerUrl || (previewFrame && previewFrame.id !== -1)) && (
              <img
                src={previewFrame ? previewFrame.url : ""}
                className={styles.avatarFrame}
                alt={previewFrame ? previewFrame.name : "当前头像框"}
              />
            )}
          </div>
          <div className={styles.userPoints}>
            当前积分：{currentUser?.points ?? 0}
            <span className={styles.availablePoints}>
              （可用：{(currentUser?.points ?? 0) - (currentUser?.usedPoints ?? 0)}）
            </span>
          </div>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          className={styles.shopTabs}
        />
      </div>
    </div>
  );
};

export default AvatarFrames;
