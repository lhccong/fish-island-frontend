import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Tabs, Button, Progress, Card, Avatar, Row, Col, Input, Form, message, Tooltip, Popover, Spin, Radio } from 'antd';
import {
  HeartOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  GiftOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  SkinOutlined,
  SmileOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,

  StarOutlined,
  CrownOutlined,
  FireOutlined,
} from '@ant-design/icons';
import styles from './index.less';
import { getPetDetailUsingGet, createPetUsingPost, feedPetUsingPost, patPetUsingPost, updatePetNameUsingPost, getOtherUserPetUsingGet } from '@/services/backend/fishPetController';
import { listPetSkinsUsingGet, exchangePetSkinUsingPost, setPetSkinUsingPost } from '@/services/backend/petSkinController';
import { listMyItemInstancesByPageUsingPost } from '@/services/backend/itemInstancesController';
import { useModel } from '@umijs/max';

export interface PetInfo {
  id: string;
  name: string;
  level: number;
  exp: number;
  maxExp: number;
  hunger: number;
  maxHunger: number;
  mood: number;
  maxMood: number;
  avatar: string;
  skills: PetSkill[];
  items: PetItem[];
  achievements: PetAchievement[];
}

interface PetSkill {
  id: string;
  name: string;
  description: string;
  level: number;
  icon: string;
}

interface PetItem {
  id: string;
  name: string;
  description: string;
  count: number;
  icon: string;
  type: 'food' | 'toy' | 'special';
}

interface PetAchievement {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  icon: string;
  progress: number;
  maxProgress: number;
}

interface MoyuPetProps {
  visible?: boolean;
  onClose?: () => void;
  otherUserId?: number; // 添加查看其他用户宠物的ID
  otherUserName?: string; // 其他用户的名称
  isPageComponent?: boolean; // 是否作为页面组件直接显示，而不是弹窗
}

// 宠物规则说明组件
const PetRules = () => (
  <div className={styles.petRules}>
    <h3>宠物系统规则</h3>
    <div className={styles.ruleSection}>
      <h4>经验与等级</h4>
      <ul>
        <li>宠物每小时自动获得1点经验值</li>
        <li>每积累100点经验值可升一级</li>
        <li>如果饥饿度和心情值都为0，宠物将不会获得经验值</li>
      </ul>
    </div>
    <div className={styles.ruleSection}>
      <h4>互动操作</h4>
      <ul>
        <li>喂食：增加20点饥饿度、5点心情值和1点经验值，消耗5积分</li>
        <li>抚摸：增加15点心情值和1点经验值，消耗3积分</li>
        <li>互动操作没有冷却时间限制</li>
        <li>修改名称：消耗100积分</li>
      </ul>
    </div>
    <div className={styles.ruleSection}>
      <h4>积分获取</h4>
      <ul>
        <li>宠物每天自动产出积分，积分数量等于宠物等级</li>
        <li>每天最高可获得10积分</li>
        <li>如果饥饿度和心情值都为0，宠物将不会产出积分</li>
      </ul>
    </div>
    <div className={styles.ruleSection}>
      <h4>宠物系统</h4>
      <ul>
        <li>可以在商店中使用积分购买不同的宠物</li>
        <li>已购买的宠物会显示在宠物馆中，可以随时切换使用</li>
        <li>宠物一旦购买成功，永久拥有</li>
      </ul>
    </div>
  </div>
);

// 商店 Tab 组件
interface ShopTabsProps {
  renderSkinsList: (showAll: boolean) => React.ReactNode;
}

const ShopTabs: React.FC<ShopTabsProps> = ({ renderSkinsList }) => {
  const [shopType, setShopType] = useState<'skin' | 'props'>('skin');

  return (
    <div className={styles.shopContainer}>
      <div className={styles.shopTypeSelector}>
        <Radio.Group
          value={shopType}
          onChange={(e) => setShopType(e.target.value)}
          buttonStyle="solid"
          size="large"
        >
          <Radio.Button value="skin">
            <SkinOutlined /> 宠物商店
          </Radio.Button>
          <Radio.Button value="props">
            <GiftOutlined /> 道具商店
          </Radio.Button>
        </Radio.Group>
      </div>

      <div className={styles.shopContent}>
        {shopType === 'skin' ? (
          renderSkinsList(true)
        ) : (
          <div className={styles.shopEmpty}>
            <div className={styles.emptyIcon}>🛒</div>
            <div className={styles.emptyText}>更多道具即将上架，敬请期待！</div>
          </div>
        )}
      </div>
    </div>
  );
};

const MoyuPet: React.FC<MoyuPetProps> = ({ visible, onClose, otherUserId, otherUserName, isPageComponent = false }) => {
  const { initialState } = useModel('@@initialState');
  const [pet, setPet] = useState<API.PetVO | API.OtherUserPetVO | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [petName, setPetName] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [patLoading, setPatLoading] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isOtherUserEmptyPet, setIsOtherUserEmptyPet] = useState(false); // 添加状态来跟踪是否是其他用户的空宠物状态
  const isOtherUser = !!otherUserId; // 是否查看其他用户的宠物
  const [skins, setSkins] = useState<API.PetSkinVO[]>([]);
  const [skinLoading, setSkinLoading] = useState(false);
  const [exchangeLoading, setExchangeLoading] = useState<number | null>(null);
  const [setCurrentSkinLoading, setSetCurrentSkinLoading] = useState<number | null>(null);
  
  // 物品列表相关状态
  const [items, setItems] = useState<API.ItemInstanceVO[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsCurrent, setItemsCurrent] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);

  // 获取宠物数据
  const fetchPetData = async () => {
    setLoading(true);
    try {
      if (isOtherUser && otherUserId) {
        // 获取其他用户的宠物信息
        const res = await getOtherUserPetUsingGet({ otherUserId });
        if (res.code === 0 && res.data) {
          // 其他用户的宠物可能没有exp属性，所以不需要处理
          setPet(res.data);
          setIsOtherUserEmptyPet(false);
        } else {
          // 显示空宠物界面而不是关闭
          setPet(null);
          setIsCreating(false);
          setIsOtherUserEmptyPet(true);
        }
      } else {
        // 检查当前用户是否登录
        if (!initialState?.currentUser) {
          // 如果未登录，不发送请求
          setLoading(false);
          if (!isPageComponent) {
            onClose?.(); // 关闭弹窗，只有在非页面组件模式下才关闭
            message.warning('请先登录');
          }
          return;
        }

        // 获取当前用户的宠物信息
        const res = await getPetDetailUsingGet();
        if (res.code === 0 && res.data) {
          // 处理数值精度问题
          if (res.data.exp) {
            res.data.exp = Math.floor(res.data.exp);
          }
          if (res.data.mood) {
            res.data.mood = Math.floor(res.data.mood);
          }
          if (res.data.hunger) {
            res.data.hunger = Math.floor(res.data.hunger);
          }
          setPet(res.data);
          setIsOtherUserEmptyPet(false); // 确保重置其他用户空宠物状态
          setIsCreating(false); // 确保不显示创建表单
        } else if (res.code === 0 && !res.data) {
          // 如果没有宠物，显示创建宠物表单
          setPet(null);
          setIsCreating(true);
          setIsOtherUserEmptyPet(false); // 确保重置其他用户空宠物状态
        }
      }
    } catch (error: any) {
      console.error('获取宠物信息失败', error);
      message.error('获取宠物信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建宠物
  const handleCreatePet = async () => {
    if (!petName.trim()) {
      message.warning('请输入宠物名称');
      return;
    }

    setLoading(true);
    try {
      const res = await createPetUsingPost({
        name: petName
      });

      if (res.code === 0 && res.data) {
        message.success('创建宠物成功');
        setIsCreating(false);
        fetchPetData(); // 重新获取宠物数据
      }
    } catch (error) {
      console.error('创建宠物失败', error);
      message.error('创建宠物失败');
    } finally {
      setLoading(false);
    }
  };

  // 喂食宠物
  const handleFeed = async () => {
    if (!pet?.petId) return;

    setFeedLoading(true);
    try {
      const res = await feedPetUsingPost({ petId: pet.petId });
      if (res.code === 0 && res.data) {
        message.success('喂食成功');
        // 处理数值精度问题
        if (res.data.exp) {
          res.data.exp = Math.floor(res.data.exp);
        }
        if (res.data.mood) {
          res.data.mood = Math.floor(res.data.mood);
        }
        if (res.data.hunger) {
          res.data.hunger = Math.floor(res.data.hunger);
        }
        setPet(res.data);
      }
    } catch (error) {
    } finally {
      setFeedLoading(false);
    }
  };

  // 抚摸宠物
  const handlePat = async () => {
    if (!pet?.petId) return;

    setPatLoading(true);
    try {
      const res = await patPetUsingPost({ petId: pet.petId });
      if (res.code === 0 && res.data) {
        message.success('抚摸成功');
        // 处理数值精度问题
        if (res.data.exp) {
          res.data.exp = Math.floor(res.data.exp);
        }
        if (res.data.mood) {
          res.data.mood = Math.floor(res.data.mood);
        }
        if (res.data.hunger) {
          res.data.hunger = Math.floor(res.data.hunger);
        }
        setPet(res.data);
      }
    } catch (error) {
      console.error('抚摸失败', error);
    } finally {
      setPatLoading(false);
    }
  };

  // 修改宠物名称
  const handleRename = async () => {
    if (!pet?.petId || !newName.trim()) {
      message.warning('请输入新的宠物名称');
      return;
    }

    // 确认是否修改名称
    Modal.confirm({
      title: '确认修改宠物名称',
      content: '修改宠物名称将消耗100积分，确定要继续吗？',
      okText: '确认修改',
      cancelText: '取消',
      onOk: async () => {
        setRenameLoading(true);
        try {
          const res = await updatePetNameUsingPost({
            petId: pet.petId,
            name: newName
          });

          if (res.code === 0 && res.data) {
            message.success('修改名称成功');
            setPet({...pet, name: newName});
            setIsRenaming(false);
            setNewName('');
          } else {
            message.error(res.message || '修改名称失败');
          }
        } catch (error) {
          console.error('修改名称失败', error);
          message.error('修改名称失败，可能是积分不足');
        } finally {
          setRenameLoading(false);
        }
      }
    });
  };

  // 获取宠物列表
  const fetchPetSkins = async () => {
    if (isOtherUser) return; // 如果是查看其他用户的宠物，不需要获取宠物列表

    // 检查当前用户是否登录
    if (!initialState?.currentUser) {
      // 如果未登录，不发送请求
      return;
    }

    setSkinLoading(true);
    try {
      const res = await listPetSkinsUsingGet({
        current: 1,
        pageSize: 100,
      });

      if (res.code === 0 && res.data?.records) {
        // 添加原皮卡片，ID为-1
        const originalSkin: API.PetSkinVO = {
          skinId: -1,
          name: '原皮',
          description: '最初的样子，朴素而自然',
          url: 'https://oss.cqbo.com/moyu/pet/超级玛丽马里奥 (73)_爱给网_aigei_com.png', // 使用默认图片，可以根据实际情况调整
          points: 0,
          owned: true, // 默认拥有
        };

        // 将原皮添加到宠物列表的开头
        setSkins([originalSkin, ...res.data.records]);
      } else {
        message.error(res.message || '获取宠物列表失败');
      }
    } catch (error) {
      console.error('获取宠物列表失败', error);
      message.error('获取宠物列表失败');
    } finally {
      setSkinLoading(false);
    }
  };

  // 兑换宠物
  const handleExchangeSkin = async (skinId: number) => {
    // 添加二次确认
    Modal.confirm({
      title: '确认购买宠物',
      content: `确定要花费 ${skins.find(skin => skin.skinId === skinId)?.points || 0} 积分购买该宠物吗？`,
      okText: '确认购买',
      cancelText: '取消',
      onOk: async () => {
        setExchangeLoading(skinId);
        try {
          const res = await exchangePetSkinUsingPost({
            skinId
          });

          if (res.code === 0 && res.data) {
            message.success('购买宠物成功');
            // 更新宠物列表中的owned状态
            setSkins(skins.map(skin =>
              skin.skinId === skinId ? { ...skin, owned: true } : skin
            ));
            // 重新获取宠物信息，更新宠物列表
            fetchPetData();
          } else {
            message.error(res.message || '购买宠物失败');
          }
        } catch (error) {
          console.error('购买宠物失败', error);
          message.error('购买宠物失败，可能是积分不足');
        } finally {
          setExchangeLoading(null);
        }
      }
    });
  };

  // 设置当前宠物
  const handleSetCurrentSkin = async (skinId: number) => {
    if (!pet?.petId) return;

    setSetCurrentSkinLoading(skinId);
    try {
      // 如果是原皮(ID为-1)，需要特殊处理
      if (skinId === -1) {
        // 这里假设后端API支持传入-1作为原皮ID
        // 如果后端不支持，可能需要修改后端代码或使用其他方式处理
        const res = await setPetSkinUsingPost({
          skinId: -1
        });

        if (res.code === 0 && res.data) {
          message.success('设置原皮成功');
          setPet(res.data);
        } else {
          message.error(res.message || '设置原皮失败');
        }
      } else {
        // 正常宠物处理
        const res = await setPetSkinUsingPost({
          skinId
        });

        if (res.code === 0 && res.data) {
          message.success('设置宠物成功');
          setPet(res.data);
        } else {
          message.error(res.message || '设置宠物失败');
        }
      }
    } catch (error) {
      console.error('设置宠物失败', error);
      message.error('设置宠物失败');
    } finally {
      setSetCurrentSkinLoading(null);
    }
  };

  // 获取物品列表
  const fetchItems = async () => {
    if (isOtherUser) return; // 查看其他用户时不获取物品

    setItemsLoading(true);
    try {
      const res = await listMyItemInstancesByPageUsingPost({
        current: itemsCurrent,
        pageSize: itemsPageSize,
      });

      if (res.code === 0 && res.data) {
        setItems(res.data.records || []);
        setItemsTotal(res.data.total || 0);
      } else {
        message.error(res.message || '获取物品列表失败');
      }
    } catch (error) {
      console.error('获取物品列表失败', error);
      message.error('获取物品列表失败');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (isPageComponent || visible) {
      // 重置状态，避免显示上一次的结果
      setPet(null);
      setIsCreating(false);
      setIsOtherUserEmptyPet(false);
      fetchPetData();
      fetchPetSkins(); // 获取宠物列表
    }
  }, [visible, otherUserId, isPageComponent]);

  // 获取物品列表
  useEffect(() => {
    if ((isPageComponent || visible) && !isOtherUser) {
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPageComponent, visible, itemsCurrent, itemsPageSize]);

  // 创建宠物表单
  if (isCreating) {
    if (isPageComponent) {
      return (
        <div style={{ padding: '20px 0' }}>
          <Form layout="vertical">
            <Form.Item label="给你的宠物起个名字">
              <Input
                placeholder="请输入宠物名称"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                maxLength={10}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                onClick={handleCreatePet}
                loading={loading}
                block
              >
                创建宠物
              </Button>
            </Form.Item>
          </Form>
        </div>
      );
    }

    return (
      <Modal
        title="创建你的摸鱼宠物"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={400}
      >
        <div style={{ padding: '20px 0' }}>
          <Form layout="vertical">
            <Form.Item label="给你的宠物起个名字">
              <Input
                placeholder="请输入宠物名称"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                maxLength={10}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                onClick={handleCreatePet}
                loading={loading}
                block
              >
                创建宠物
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    );
  }

  // 加载中或没有宠物数据
  if (loading) {
    if (isPageComponent) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          加载中...
        </div>
      );
    }

    return (
      <Modal
        title="我的摸鱼宠物"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          加载中...
        </div>
      </Modal>
    );
  }

  // 显示其他用户的空宠物状态
  if (isOtherUserEmptyPet) {
    if (isPageComponent) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}><SmileOutlined /></div>
          <div style={{ fontSize: '16px' }}>该用户还没有养宠物哦~</div>
        </div>
      );
    }

    return (
      <Modal
        title={
          <div className={styles.petModalTitle}>
            <span className={styles.petIcon}>🐟</span>
            <span>{`${otherUserName || '用户'}的宠物`}</span>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
        className={styles.petModal}
      >
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}><SmileOutlined /></div>
          <div style={{ fontSize: '16px' }}>该用户还没有养宠物哦~</div>
        </div>
      </Modal>
    );
  }

  // 渲染宠物列表
  const renderSkinsList = (showAll = false) => {
    // 如果showAll为true，显示所有宠物（商店），否则只显示已拥有的宠物（宠物馆）
    const filteredSkins = showAll ? skins : skins.filter(skin => skin.owned);

    if (skinLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin tip="加载中..." />
        </div>
      );
    }

    if (filteredSkins.length === 0) {
      return (
        <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
          <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>
            {showAll ? '🛒' : '👕'}
          </div>
          <div className={styles.emptyText} style={{ fontSize: '16px' }}>
            {showAll ? '暂无可购买的宠物' : '暂无已拥有的宠物'}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.skinsList}>
        <Row gutter={[12, 12]}>
          {filteredSkins.map((skin) => (
            <Col span={8} key={skin.skinId}>
              <Card
                className={`${styles.skinCard} ${skin.owned ? styles.ownedSkin : ''}`}
                hoverable
                size="small"
                cover={
                  <div className={styles.skinImageContainer}>
                    <img
                      alt={skin.name}
                      src={skin.url}
                      className={styles.skinImage}
                    />
                    {skin.owned && (
                      (skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                      (skin.skinId !== -1 && pet?.petUrl === skin.url)
                    ) && (
                      <div className={styles.currentSkinBadge}>
                        当前使用
                      </div>
                    )}
                  </div>
                }
                bodyStyle={{ padding: '12px 16px' }}
              >
                <Card.Meta
                  title={<div className={styles.skinTitle}>{skin.name}</div>}
                  description={<div className={styles.skinDescription}>{skin.description}</div>}
                />
                <div className={styles.skinPrice}>
                  {skin.points} 积分
                </div>
                <div className={styles.skinActions}>
                  {skin.owned ? (
                    <Button
                      type="primary"
                      size="small"
                      disabled={(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                               (skin.skinId !== -1 && pet?.petUrl === skin.url)}
                      onClick={() => handleSetCurrentSkin(skin.skinId || 0)}
                      loading={setCurrentSkinLoading === skin.skinId}
                      icon={(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                            (skin.skinId !== -1 && pet?.petUrl === skin.url) ? <CheckOutlined /> : <SkinOutlined />}
                    >
                      {(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                       (skin.skinId !== -1 && pet?.petUrl === skin.url) ? '当前使用中' : '使用'}
                    </Button>
                  ) : showAll ? (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleExchangeSkin(skin.skinId || 0)}
                      loading={exchangeLoading === skin.skinId}
                      icon={<ShoppingOutlined />}
                    >
                      购买
                    </Button>
                  ) : null}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  // 根据isPageComponent决定是否渲染为Modal或直接内容
  if (isPageComponent) {
    return (
      <div className={styles.petContainer}>
        <div className={styles.pageComponentHeader}>
          <h2 className={styles.pageComponentTitle}>🐟</h2>
          <Popover
            content={<PetRules />}
            title="宠物系统说明"
            placement="bottom"
            trigger="click"
            overlayStyle={{ width: 300 }}
            overlayInnerStyle={{
              backgroundColor: '#fff',
              boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
            }}
          >
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              size="small"
              className={styles.titleHelpButton}
            >
              系统说明
            </Button>
          </Popover>
        </div>

        {/* 使用分栏布局 */}
        <Row gutter={24} className={styles.petMainLayout}>
          {/* 左侧装备界面 */}
          <Col span={10} className={styles.petLeftColumn}>
            <div className={styles.equipmentInterface}>
              {/* 顶部宠物信息 */}
              <div className={styles.petHeader}>
                <div className={styles.petNameSection}>
                  {!isOtherUser && !isRenaming ? (
                    <Tooltip title="点击修改名称（消耗100积分）">
                      <span
                        className={styles.editableName}
                        onClick={() => setIsRenaming(true)}
                      >
                        {pet?.name}
                        <EditOutlined className={styles.editIcon} />
                      </span>
                    </Tooltip>
                  ) : isRenaming ? (
                    <div className={styles.renameContainer}>
                      <Input
                        size="small"
                        placeholder="请输入新名称"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        maxLength={10}
                        autoFocus
                        className={styles.renameInput}
                        prefix={<EditOutlined />}
                        suffix={
                          <span className={styles.charCount}>
                            {newName.length}/10
                          </span>
                        }
                      />
                      <div className={styles.renameActions}>
                        <Button
                          size="small"
                          type="primary"
                          onClick={handleRename}
                          loading={renameLoading}
                          icon={<CheckOutlined />}
                        >
                          确定
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {setIsRenaming(false); setNewName('');}}
                          icon={<CloseOutlined />}
                          className={styles.cancelButton}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span>{pet?.name}</span>
                  )}
                </div>
              </div>

              {/* 装备栏布局 */}
              <div className={styles.equipmentLayout}>
                {/* 左侧装备栏 */}
                <div className={styles.leftEquipments}>
                  <div className={styles.equipSlot} data-slot="weapon">
                    <Tooltip title="武器 - 空闲">
                      <div className={styles.emptySlot}>
                        <ThunderboltOutlined className={styles.slotIcon} />
                      </div>
                    </Tooltip>
                  </div>
                  <div className={styles.equipSlot} data-slot="armor">
                    <Tooltip title="护甲 - 空闲">
                      <div className={styles.emptySlot}>
                        <StarOutlined className={styles.slotIcon} />
                      </div>
                    </Tooltip>
                  </div>
                  <div className={styles.equipSlot} data-slot="accessory1">
                    <Tooltip title="饰品1 - 空闲">
                      <div className={styles.emptySlot}>
                        <StarOutlined className={styles.slotIcon} />
                      </div>
                    </Tooltip>
                  </div>
                </div>

                {/* 中央宠物展示 */}
                <div className={styles.petDisplay}>
                  <div className={styles.petAvatar}>
                    <Avatar src={pet?.petUrl} size={140} />
                  </div>
                  <div className={styles.petLevel}>Lv.{pet?.level || 1}</div>
                </div>

                {/* 右侧装备栏 */}
                <div className={styles.rightEquipments}>
                  <div className={styles.equipSlot} data-slot="helmet">
                    <Tooltip title="头盔 - 空闲">
                      <div className={styles.emptySlot}>
                        <CrownOutlined className={styles.slotIcon} />
                      </div>
                    </Tooltip>
                  </div>
                  <div className={styles.equipSlot} data-slot="necklace">
                    <Tooltip title="项链 - 空闲">
                      <div className={styles.emptySlot}>
                        <GiftOutlined className={styles.slotIcon} />
                      </div>
                    </Tooltip>
                  </div>
                  <div className={styles.equipSlot} data-slot="accessory2">
                    <Tooltip title="饰品2 - 空闲">
                      <div className={styles.emptySlot}>
                        <HeartOutlined className={styles.slotIcon} />
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </div>



              {/* 底部状态和操作 */}
              <div className={styles.petStats}>
                {/* 进度条区域 */}
                <div className={styles.statusBars}>
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>
                      <HeartOutlined /> 心情:
                    </span>
                    <div className={styles.statusProgressContainer}>
                      <Progress
                        percent={((pet?.mood || 0) / ((pet as any)?.maxMood || 100)) * 100}
                        status="active"
                        strokeColor="#ff7875"
                        size="small"
                        format={() => `${pet?.mood || 0}/${(pet as any)?.maxMood || 100}`}
                      />
                      <Tooltip title="心情值影响宠物的积分产出和经验获取">
                        <InfoCircleOutlined className={styles.statusInfo} />
                      </Tooltip>
                    </div>
                  </div>
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>
                      <ThunderboltOutlined /> 饥饿:
                    </span>
                    <div className={styles.statusProgressContainer}>
                      <Progress
                        percent={((pet?.hunger || 0) / ((pet as any)?.maxHunger || 100)) * 100}
                        status="active"
                        strokeColor="#52c41a"
                        size="small"
                        format={() => `${pet?.hunger || 0}/${(pet as any)?.maxHunger || 100}`}
                      />
                      <Tooltip title="饥饿值影响宠物的积分产出和经验获取">
                        <InfoCircleOutlined className={styles.statusInfo} />
                      </Tooltip>
                    </div>
                  </div>
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>
                      <ExperimentOutlined /> 经验:
                    </span>
                    <div className={styles.statusProgressContainer}>
                      <Progress
                        percent={pet && (pet as any).exp ? (Math.floor((pet as any).exp) / ((pet as any)?.maxExp || 100) * 100) : 0}
                        status="active"
                        strokeColor="#ffa768"
                        size="small"
                        format={() => `${Math.floor((pet as any)?.exp || 0)}/${(pet as any)?.maxExp || 100}`}
                      />
                      <Tooltip title="每100点经验可提升1级">
                        <InfoCircleOutlined className={styles.statusInfo} />
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className={styles.powerScore}>
                  <span className={styles.scoreIcon}>⚡</span>
                  <span className={styles.scoreText}>宠物战力 {Math.floor((pet?.level || 1) * 100 + (pet?.mood || 0) + (pet?.hunger || 0))}</span>
                </div>

                {!isOtherUser && (
                  <div className={styles.quickActions}>
                    <Button
                      type="primary"
                      onClick={handleFeed}
                      loading={feedLoading}
                      icon={<GiftOutlined />}
                      className={styles.quickActionBtn}
                      size="small"
                    >
                      喂食
                    </Button>
                    <Button
                      type="primary"
                      onClick={handlePat}
                      loading={patLoading}
                      icon={<HeartOutlined />}
                      className={styles.quickActionBtn}
                      size="small"
                    >
                      抚摸
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* 右侧Tab内容 */}
          <Col span={14} className={styles.petRightColumn}>
            <Tabs
          defaultActiveKey={isOtherUser ? "skills" : "items"}
          items={[
            ...(isOtherUser ? [] : [{
              key: 'items',
              label: (
                <span>
                  <GiftOutlined /> 物品
                </span>
              ),
              children: (
                <div className={styles.itemsContainer}>
                  <Spin spinning={itemsLoading}>
                    {items.length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {items.map((item) => (
                          <Col span={8} key={item.id}>
                            <Card className={styles.itemCard}>
                              <div className={styles.itemIcon}>
                                {item.template?.icon ? (
                                  <img src={item.template.icon} alt={item.template.name} style={{ width: 40, height: 40 }} />
                                ) : (
                                  '📦'
                                )}
                              </div>
                              <div className={styles.itemName}>{item.template?.name || '未知物品'}</div>
                              <div className={styles.itemCount}>数量: {item.quantity || 0}</div>
                              <div className={styles.itemDesc}>{item.template?.description || '暂无描述'}</div>
                              <div className={styles.itemActions}>
                                <Button
                                  type="primary"
                                  size="small"
                                  disabled
                                >
                                  使用
                                </Button>
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                        <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
                        <div className={styles.emptyText} style={{ fontSize: '16px' }}>暂无物品</div>
                      </div>
                    )}
                  </Spin>
                </div>
              ),
            }]),
            {
              key: 'skills',
              label: (
                <span>
                  <ThunderboltOutlined /> 技能
                </span>
              ),
              children: (
                <div className={styles.skillsContainer}>
                  <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
                    <div className={styles.emptyText} style={{ fontSize: '16px' }}>技能系统即将开放，敬请期待！</div>
                  </div>
                </div>
              ),
            },
            ...(isOtherUser ? [] : [{
              key: 'shop',
              label: (
                <span>
                  <ShoppingOutlined /> 商店
                </span>
              ),
              children: (
                <div className={styles.shopContainer}>
                  {isOtherUser ? (
                    <div className={styles.shopEmpty}>
                      <div className={styles.emptyIcon}>🛒</div>
                      <div className={styles.emptyText}>无法查看其他用户的商店</div>
                    </div>
                  ) : (
                    <ShopTabs renderSkinsList={renderSkinsList} />
                  )}
                </div>
              ),
            }]),
            {
              key: 'skin',
              label: (
                <span>
                  <SkinOutlined /> 宠物馆
                </span>
              ),
              children: (
                <div className={styles.skinContainer}>
                  {isOtherUser ? (
                    <div className={styles.otherUserSkins}>
                      {pet?.skins && pet.skins.length > 0 ? (
                        <div className={styles.skinsList}>
                          <Row gutter={[12, 12]}>
                            {pet.skins.map((skin) => (
                              <Col span={8} key={skin.skinId}>
                                <Card
                                  className={`${styles.skinCard} ${styles.ownedSkin}`}
                                  hoverable
                                  size="small"
                                  cover={
                                    <div className={styles.skinImageContainer}>
                                      <img
                                        alt={skin.name}
                                        src={skin.url}
                                        className={styles.skinImage}
                                      />
                                      {(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                                       (skin.skinId !== -1 && pet?.petUrl === skin.url) ? (
                                        <div className={styles.currentSkinBadge}>
                                          当前使用
                                        </div>
                                      ) : null}
                                    </div>
                                  }
                                  bodyStyle={{ padding: '12px 16px' }}
                                >
                                  <Card.Meta
                                    title={<div className={styles.skinTitle}>{skin.name}</div>}
                                    description={<div className={styles.skinDescription}>{skin.description}</div>}
                                  />
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <div style={{ fontSize: '16px', marginBottom: '20px' }}>
                            当前宠物
                          </div>
                          <Avatar src={pet?.petUrl} size={100} />
                        </div>
                      )}
                    </div>
                  ) : (
                    renderSkinsList(false)
                  )}
                </div>
              ),
            },
            {
              key: 'achievements',
              label: (
                <span>
                  <TrophyOutlined /> 成就
                </span>
              ),
              children: (
                <div className={styles.achievementsContainer}>
                  <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>🏆</div>
                    <div className={styles.emptyText} style={{ fontSize: '16px' }}>成就系统即将开放，敬请期待！</div>
                  </div>
                </div>
              ),
            },
          ]}
        />
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <Modal
      title={
        <div className={styles.petModalTitle}>
          <span className={styles.petIcon}>🐟</span>
          <span>
            {isOtherUser ? `${otherUserName || '用户'}的宠物` : '我的摸鱼宠物'}
            <Popover
              content={<PetRules />}
              title="宠物系统说明"
              placement="bottom"
              trigger="click"
              overlayStyle={{ width: 300 }}
              overlayInnerStyle={{
                backgroundColor: '#fff',
                boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                size="small"
                className={styles.titleHelpButton}
              />
            </Popover>
          </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      className={styles.petModal}
    >
      <div className={styles.petContainer}>
        <div className={styles.petInfo}>
          <div className={styles.petAvatar}>
            <Avatar src={pet?.petUrl} size={100} />
          </div>
          <div className={styles.petDetails}>
            <div className={styles.petName}>
              <span className={styles.name}>
                {pet?.name}
                {!isOtherUser && !isRenaming ? (
                  <Tooltip title="修改名称需要消耗100积分">
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setIsRenaming(true)}
                      icon={<EditOutlined />}
                      className={styles.renameButton}
                    >
                      修改
                    </Button>
                  </Tooltip>
                ) : isRenaming ? (
                  <div className={styles.renameContainer}>
                    <Input
                      size="small"
                      placeholder="请输入新名称"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={10}
                      autoFocus
                      className={styles.renameInput}
                      prefix={<EditOutlined />}
                      suffix={
                        <span className={styles.charCount}>
                          {newName.length}/10
                        </span>
                      }
                    />
                    <div className={styles.renameActions}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={handleRename}
                        loading={renameLoading}
                        icon={<CheckOutlined />}
                      >
                        确定
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {setIsRenaming(false); setNewName('');}}
                        icon={<CloseOutlined />}
                        className={styles.cancelButton}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : null}
              </span>
              <span className={styles.level}>Lv.{pet?.level || 1}</span>
            </div>
            <div className={styles.petStatus}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>
                  <HeartOutlined /> 心情:
                </span>
                <div className={styles.statusProgressContainer}>
                  <Progress
                    percent={((pet?.mood || 0) / ((pet as any)?.maxMood || 100)) * 100}
                    status="active"
                    strokeColor="#ff7875"
                    size="small"
                    format={() => `${pet?.mood || 0}/${(pet as any)?.maxMood || 100}`}
                  />
                  <Tooltip title="心情值影响宠物的积分产出和经验获取">
                    <InfoCircleOutlined className={styles.statusInfo} />
                  </Tooltip>
                </div>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>
                  <ThunderboltOutlined /> 饥饿:
                </span>
                <div className={styles.statusProgressContainer}>
                  <Progress
                    percent={((pet?.hunger || 0) / ((pet as any)?.maxHunger || 100)) * 100}
                    status="active"
                    strokeColor="#52c41a"
                    size="small"
                    format={() => `${pet?.hunger || 0}/${(pet as any)?.maxHunger || 100}`}
                  />
                  <Tooltip title="饥饿值影响宠物的积分产出和经验获取">
                    <InfoCircleOutlined className={styles.statusInfo} />
                  </Tooltip>
                </div>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>
                  <ExperimentOutlined /> 经验:
                </span>
                <div className={styles.statusProgressContainer}>
                  {pet && (
                    <>
                      <Progress
                        percent={(pet as any).exp ? (Math.floor((pet as any).exp) / ((pet as any)?.maxExp || 100) * 100) : 0}
                        status="active"
                        strokeColor="#1890ff"
                        size="small"
                        format={() => `${Math.floor((pet as any).exp || 0)}/${(pet as any)?.maxExp || 100}`}
                      />
                    </>
                  )}
                  <Tooltip title="每100点经验可提升1级">
                    <InfoCircleOutlined className={styles.statusInfo} />
                  </Tooltip>
                </div>
              </div>
            </div>
            {!isOtherUser && (
              <div className={styles.petActions} style={{ marginTop: 10 }}>
                <Button
                  type="primary"
                  onClick={handleFeed}
                  loading={feedLoading}
                  style={{ marginRight: 8 }}
                  icon={<GiftOutlined />}
                  className={styles.actionButton}
                >
                  喂食 <span className={styles.costBadge}>-5积分</span>
                  <span className={styles.expBadge}>+1经验</span>
                </Button>
                <Button
                  type="primary"
                  onClick={handlePat}
                  loading={patLoading}
                  icon={<HeartOutlined />}
                  className={styles.actionButton}
                >
                  抚摸 <span className={styles.costBadge}>-3积分</span>
                  <span className={styles.expBadge}>+1经验</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <Tabs
          defaultActiveKey={isOtherUser ? "skills" : "items"}
          items={[
            ...(isOtherUser ? [] : [{
              key: 'items',
              label: (
                <span>
                  <GiftOutlined /> 物品
                </span>
              ),
              children: (
                <div className={styles.itemsContainer}>
                  <Spin spinning={itemsLoading}>
                    {items.length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {items.map((item) => (
                          <Col span={8} key={item.id}>
                            <Card className={styles.itemCard}>
                              <div className={styles.itemIcon}>
                                {item.template?.icon ? (
                                  <img src={item.template.icon} alt={item.template.name} style={{ width: 40, height: 40 }} />
                                ) : (
                                  '📦'
                                )}
                              </div>
                              <div className={styles.itemName}>{item.template?.name || '未知物品'}</div>
                              <div className={styles.itemCount}>数量: {item.quantity || 0}</div>
                              <div className={styles.itemDesc}>{item.template?.description || '暂无描述'}</div>
                              <div className={styles.itemActions}>
                                <Button
                                  type="primary"
                                  size="small"
                                  disabled
                                >
                                  使用
                                </Button>
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                        <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
                        <div className={styles.emptyText} style={{ fontSize: '16px' }}>暂无物品</div>
                      </div>
                    )}
                  </Spin>
                </div>
              ),
            }]),
            {
              key: 'skills',
              label: (
                <span>
                  <ThunderboltOutlined /> 技能
                </span>
              ),
              children: (
                <div className={styles.skillsContainer}>
                  <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
                    <div className={styles.emptyText} style={{ fontSize: '16px' }}>技能系统即将开放，敬请期待！</div>
                  </div>
                </div>
              ),
            },
            ...(isOtherUser ? [] : [{
              key: 'shop',
              label: (
                <span>
                  <ShoppingOutlined /> 商店
                </span>
              ),
              children: (
                <div className={styles.shopContainer}>
                  {isOtherUser ? (
                    <div className={styles.shopEmpty}>
                      <div className={styles.emptyIcon}>🛒</div>
                      <div className={styles.emptyText}>无法查看其他用户的商店</div>
                    </div>
                  ) : (
                    <ShopTabs renderSkinsList={renderSkinsList} />
                  )}
                </div>
              ),
            }]),
            {
              key: 'skin',
              label: (
                <span>
                  <SkinOutlined /> 宠物馆
                </span>
              ),
              children: (
                <div className={styles.skinContainer}>
                  {isOtherUser ? (
                    <div className={styles.otherUserSkins}>
                      {pet?.skins && pet.skins.length > 0 ? (
                        <div className={styles.skinsList}>
                          <Row gutter={[12, 12]}>
                            {pet.skins.map((skin) => (
                              <Col span={8} key={skin.skinId}>
                                <Card
                                  className={`${styles.skinCard} ${styles.ownedSkin}`}
                                  hoverable
                                  size="small"
                                  cover={
                                    <div className={styles.skinImageContainer}>
                                      <img
                                        alt={skin.name}
                                        src={skin.url}
                                        className={styles.skinImage}
                                      />
                                      {(skin.skinId === -1 && (!pet?.petUrl || pet.petUrl === skin.url)) ||
                                       (skin.skinId !== -1 && pet?.petUrl === skin.url) ? (
                                        <div className={styles.currentSkinBadge}>
                                          当前使用
                                        </div>
                                      ) : null}
                                    </div>
                                  }
                                  bodyStyle={{ padding: '12px 16px' }}
                                >
                                  <Card.Meta
                                    title={<div className={styles.skinTitle}>{skin.name}</div>}
                                    description={<div className={styles.skinDescription}>{skin.description}</div>}
                                  />
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <div style={{ fontSize: '16px', marginBottom: '20px' }}>
                            当前宠物
                          </div>
                          <Avatar src={pet?.petUrl} size={100} />
                        </div>
                      )}
                    </div>
                  ) : (
                    renderSkinsList(false)
                  )}
                </div>
              ),
            },
            {
              key: 'achievements',
              label: (
                <span>
                  <TrophyOutlined /> 成就
                </span>
              ),
              children: (
                <div className={styles.achievementsContainer}>
                  <div className={styles.shopEmpty} style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div className={styles.emptyIcon} style={{ fontSize: '48px', marginBottom: '20px' }}>🏆</div>
                    <div className={styles.emptyText} style={{ fontSize: '16px' }}>成就系统即将开放，敬请期待！</div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};

// 添加一个新的MiniPet组件，用于在聊天输入框上方显示
export interface MiniPetProps {
  onClick?: () => void;
}

// 使用全局变量缓存宠物数据，避免组件重新渲染时重复请求
let cachedPet: API.PetVO | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存时间

export const MiniPet: React.FC<MiniPetProps> = ({ onClick }) => {
  const { initialState } = useModel('@@initialState');
  const [pet, setPet] = useState<API.PetVO | null>(cachedPet);
  const [loading, setLoading] = useState(!cachedPet);
  const [position, setPosition] = useState(() => {
    // 从localStorage读取保存的位置，如果没有则使用默认值
    const savedPosition = localStorage.getItem('miniPetPosition');
    return savedPosition ? JSON.parse(savedPosition) : { x: 20, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const petRef = useRef<HTMLDivElement>(null);
  const initialPosition = useRef({ x: 0, y: 0 });

  // 获取宠物数据，使用缓存减少请求
  const fetchPetData = async (force = false) => {
    // 检查用户是否登录
    if (!initialState?.currentUser) {
      // 如果用户未登录，不发送请求
      setLoading(false);
      return;
    }

    // 如果有缓存且未过期，直接使用缓存数据
    const now = Date.now();
    if (!force && cachedPet && (now - lastFetchTime < CACHE_DURATION)) {
      setPet(cachedPet);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getPetDetailUsingGet();
      if (res.code === 0 && res.data) {
        // 更新缓存和状态
        cachedPet = res.data;
        lastFetchTime = now;
        setPet(res.data);
      }
    } catch (error) {
      console.error('获取宠物信息失败', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理拖动开始
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();

    let clientX, clientY;
    if ('touches' in e) {
      // 触摸事件
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // 鼠标事件
      clientX = e.clientX;
      clientY = e.clientY;
      e.preventDefault(); // 只在鼠标事件中阻止默认行为
    }

    // 记录初始位置，用于判断是否真的发生了拖动
    initialPosition.current = { ...position };

    setIsDragging(true);
    setStartPos({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  // 处理拖动过程
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const newX = clientX - startPos.x;
    const newY = clientY - startPos.y;

    // 限制宠物不能拖出屏幕
    const petElement = petRef.current;
    if (petElement) {
      const petWidth = petElement.offsetWidth;
      const petHeight = petElement.offsetHeight;
      const maxX = window.innerWidth - petWidth;
      const maxY = window.innerHeight - petHeight;

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: boundedX, y: boundedY });
    }
  }, [isDragging, startPos]);

  // 处理拖动结束
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);

      // 判断是否真的发生了拖动
      const hasMoved = initialPosition.current.x !== position.x || initialPosition.current.y !== position.y;

      if (hasMoved) {
        // 标记刚刚完成了拖动操作
        setWasDragging(true);
        // 保存位置到localStorage
        localStorage.setItem('miniPetPosition', JSON.stringify(position));

        // 100ms后重置拖动标记，这样点击事件才能再次被触发
        // 减少时间以提高响应速度
        setTimeout(() => {
          setWasDragging(false);
        }, 100);
      }
    }
  }, [isDragging, position]);

  // 处理点击事件
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 只有在非拖动状态下才触发点击事件
    if (!isDragging && !wasDragging && onClick) {
      onClick();
    }
  };

  // 添加单独的点击处理函数，确保点击能正常触发
  const handlePetClick = () => {
    if (!isDragging && !wasDragging && onClick) {
      onClick();
    }
  };

  useEffect(() => {
    // 初始加载时获取数据
    fetchPetData();

    // 每30分钟刷新一次宠物数据，减少请求频率
    const intervalId = setInterval(() => fetchPetData(true), CACHE_DURATION);

    // 添加拖动相关的事件监听
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (loading || !pet) {
    return null;
  }

  return (
    <div
      ref={petRef}
      className={`${styles.miniPet} ${isDragging ? styles.dragging : ''}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onClick={handlePetClick} // 使用专门的点击处理函数
    >
      <div onClick={handlePetClick} style={{ width: '100%', height: '100%' }}>
        <Tooltip title={`${pet.name} (Lv.${pet.level}) - 可拖动调整位置`}>
          <img
            src={pet.petUrl}
            alt="我的宠物"
            className={styles.miniPetImage}
            draggable={false}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default MoyuPet;

