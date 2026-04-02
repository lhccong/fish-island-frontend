import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Progress, Avatar, Badge, message, Modal, Spin } from 'antd';
import { 
  ThunderboltOutlined, 
  HeartOutlined, 
  FireOutlined, 
  SafetyOutlined,
  TrophyOutlined,
  PlayCircleOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useSearchParams, history } from '@umijs/max';
import { getBossBattleInfoUsingGet, battleUsingGet } from '@/services/backend/bossController';
import styles from './index.less';

// 宠物数据接口
interface Pet {
  id: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  avatar: string;
  exp: number;
  maxExp: number;
  equippedItems?: Record<string, API.ItemInstanceVO>;
}

// BOSS数据接口
interface Boss {
  id: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  avatar: string;
  rewards: {
    coins: number;
    exp: number;
    items: string[];
  };
  // 新增战斗属性
  critRate?: number;
  critResistance?: number;
  dodgeRate?: number;
  dodgeResistance?: number;
  blockRate?: number;
  blockResistance?: number;
  comboRate?: number;
  comboResistance?: number;
  lifesteal?: number;
  lifestealResistance?: number;
}

// 战斗消息类型
type BattleMessageType = 'attack' | 'critical' | 'miss' | 'heal';

  // 战斗状态
type BattleStatus = 'idle' | 'fighting' | 'victory' | 'defeat';

const PetFight: React.FC = () => {
  const [searchParams] = useSearchParams();
  const bossId = searchParams.get('bossId');
  
  // 状态管理
  const [battleStatus, setBattleStatus] = useState<BattleStatus>('idle');
  const [currentTurn, setCurrentTurn] = useState<'pet' | 'boss'>('pet');
  const [showRewards, setShowRewards] = useState(false);
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // 碰撞效果状态
  const [petAttacking, setPetAttacking] = useState(false);
  const [bossAttacking, setBossAttacking] = useState(false);
  const [petHurt, setPetHurt] = useState(false);
  const [bossHurt, setBossHurt] = useState(false);
  const [showCollisionEffect, setShowCollisionEffect] = useState(false);
  
  // 装备攻击动画状态 - 当前飞出的装备索引
  const [attackingEquipIndex, setAttackingEquipIndex] = useState<number>(0);

  // 宠物数据
  const [pet, setPet] = useState<Pet>({
    id: 1,
    name: '摸鱼小精灵',
    level: 1,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    avatar: '🐠',
    exp: 0,
    maxExp: 100
  });

  // BOSS数据
  const [boss, setBoss] = useState<Boss>({
    id: 1,
    name: '压榨王CEO',
    level: 30,
    hp: 1200,
    maxHp: 1200,
    attack: 150,
    defense: 100,
    avatar: '👔',
    rewards: {
      coins: 500,
      exp: 300,
      items: ['自由勋章', '摸鱼许可证']
    }
  });

  // 判断是否为URL
  const isUrl = (str: string | undefined): boolean => {
    if (!str) return false;
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/');
  };

  // 获取Boss对战信息
  useEffect(() => {
    const fetchBattleInfo = async () => {
      if (!bossId) {
        message.error('缺少Boss ID参数');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await getBossBattleInfoUsingGet({ 
          bossId: Number(bossId) 
        });
        
        if (res.code === 0 && res.data) {
          const { bossInfo, petInfo } = res.data;
          
          // 更新Boss数据
          if (bossInfo) {
            setBoss({
              id: bossInfo.id || 1,
              name: bossInfo.name || '未知BOSS',
              level: 30, // API中没有level，使用默认值
              hp: bossInfo.currentHealth || bossInfo.maxHealth || 1200,
              maxHp: bossInfo.maxHealth || 1200,
              attack: bossInfo.attack || 150,
              defense: 100, // API中没有defense，使用默认值
              avatar: bossInfo.avatar || '👔',
              rewards: {
                coins: bossInfo.rewardPoints || 500,
                exp: 300, // API中没有exp，使用默认值
                items: ['自由勋章', '摸鱼许可证'] // API中没有items，使用默认值
              },
              // 新增战斗属性
              critRate: bossInfo.critRate || 0,
              critResistance: bossInfo.critResistance || 0,
              dodgeRate: bossInfo.dodgeRate || 0,
              dodgeResistance: bossInfo.dodgeResistance || 0,
              blockRate: bossInfo.blockRate || 0,
              blockResistance: bossInfo.blockResistance || 0,
              comboRate: bossInfo.comboRate || 0,
              comboResistance: bossInfo.comboResistance || 0,
              lifesteal: bossInfo.lifesteal || 0,
              lifestealResistance: bossInfo.lifestealResistance || 0
            });
          }
          
          // 更新宠物数据
          if (petInfo) {
            setPet({
              id: petInfo.petId || 1,
              name: petInfo.name || '摸鱼小精灵',
              level: petInfo.level || 1,
              hp: petInfo.health || 100,
              maxHp: petInfo.health || 100,
              attack: petInfo.attack || 10,
              defense: 5, // API中没有defense，使用默认值
              avatar: petInfo.avatar || '🐠',
              exp: 0, // API中没有exp，使用默认值
              maxExp: 100, // API中没有maxExp，使用默认值
              equippedItems: petInfo.equippedItems
            });
          }
        } else {
          message.error(res.message || '获取对战信息失败');
        }
      } catch (error: any) {
        console.error('获取Boss对战信息失败:', error);
        message.error(error.message || '获取对战信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchBattleInfo();
  }, [bossId]);

  // 显示战斗提示
  const showBattleMessage = (messageText: string, type: BattleMessageType) => {
    if (type === 'critical') {
      message.error(messageText, 2);
    } else if (type === 'miss') {
      message.warning(messageText, 2);
    } else {
      message.info(messageText, 2);
    }
  };



  // 处理单个回合的战斗结果
  const processBattleRound = (result: API.BattleResultVO, roundIndex: number) => {
    const attackerType = result.attackerType || '';
    const isPetAttack = attackerType === 'PET';
    const attacker = isPetAttack ? pet : boss;
    const defender = isPetAttack ? boss : pet;
    const damage = result.damage || 0;
    
    // 触发碰撞效果
    setShowCollisionEffect(true);
    setTimeout(() => setShowCollisionEffect(false), 300);

    // 攻击者前冲效果
    if (isPetAttack) {
      setPetAttacking(true);
      setTimeout(() => setPetAttacking(false), 500);
      setCurrentTurn('pet');
      // 触发装备飞出攻击动画
      const equipCount = pet.equippedItems ? Object.keys(pet.equippedItems).length : 0;
      if (equipCount > 0) {
        setAttackingEquipIndex(prev => (prev + 1) % equipCount);
      }
    } else {
      setBossAttacking(true);
      setTimeout(() => setBossAttacking(false), 500);
      setCurrentTurn('boss');
    }

    // 被攻击者震动效果（只在有伤害时）
    if (damage > 0) {
      setTimeout(() => {
        if (isPetAttack) {
          setBossHurt(true);
          setTimeout(() => setBossHurt(false), 300);
        } else {
          setPetHurt(true);
          setTimeout(() => setPetHurt(false), 300);
        }
      }, 200);
    }

    // 显示战斗消息
    if (result.isDodge) {
      showBattleMessage(
        `${defender.name} 闪避了 ${attacker.name} 的攻击！`,
        'miss'
      );
    } else {
      const criticalText = result.isCritical ? ' 暴击！' : '';
      const comboText = result.isCombo ? ' 连击！' : '';
      const messageType = result.isCritical ? 'critical' : 'attack';
      
      showBattleMessage(
        `${attacker.name} 对 ${defender.name} 造成了 ${damage} 点伤害！${criticalText}${comboText}`,
        messageType
      );
    }

    // 更新血量
    if (result.petRemainingHealth !== undefined) {
      setPet(prev => ({ ...prev, hp: result.petRemainingHealth || 0 }));
    }
    if (result.bossRemainingHealth !== undefined) {
      setBoss(prev => ({ ...prev, hp: result.bossRemainingHealth || 0 }));
    }
  };

  // 开始战斗（逐个处理战斗结果）
  const startBattle = async () => {
    if (!bossId) {
      message.error('缺少Boss ID参数');
      return;
    }

    try {
      setBattleStatus('fighting');
      setLoading(true);
      showBattleMessage('战斗开始！', 'attack');

      // 调用接口获取所有战斗结果
      const res = await battleUsingGet({ 
        bossId: Number(bossId) 
      });

      if (res.code === 0 && res.data && res.data.length > 0) {
        setLoading(false);
        const battleResults = res.data;
        
        // 逐个处理每个回合，每个回合之间延迟1.5秒
        for (let i = 0; i < battleResults.length; i++) {
          await new Promise(resolve => setTimeout(resolve, i === 0 ? 500 : 1500));
          
          const result = battleResults[i];
          processBattleRound(result, i);

          // 检查是否已经分出胜负（提前结束）
          const petHp = result.petRemainingHealth || 0;
          const bossHp = result.bossRemainingHealth || 0;
          
          if (petHp <= 0 || bossHp <= 0) {
            // 等待最后一击的动画完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
          }
        }

        // 获取最后一回合的结果来判断胜负
        const lastResult = battleResults[battleResults.length - 1];
        const petWon = (lastResult.petRemainingHealth || 0) > 0 && (lastResult.bossRemainingHealth || 0) <= 0;
        
        if (petWon) {
          setBattleStatus('victory');
          setBattleResult('victory');
          showBattleMessage(`恭喜！${boss.name} 被击败了！`, 'attack');
          message.success('战斗胜利！');
          setShowRewards(true);
        } else {
          setBattleStatus('defeat');
          setBattleResult('defeat');
          showBattleMessage(`${pet.name} 被击败了...`, 'attack');
          message.error('战斗失败！');
          // 失败后延迟显示退出提示
          setTimeout(() => {
            setShowExitModal(true);
          }, 2000);
        }
      } else {
        message.error(res.message || '战斗失败');
        setBattleStatus('idle');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('战斗失败:', error);
      message.error(error.message || '战斗失败');
      setBattleStatus('idle');
      setLoading(false);
    }
  };

  // 领取奖励
  const claimRewards = () => {
    // 这里可以调用API领取奖励
    setPet(prev => ({
      ...prev,
      exp: Math.min(prev.maxExp, prev.exp + boss.rewards.exp)
    }));
    
    message.success(`获得了 ${boss.rewards.coins} 摸鱼币和 ${boss.rewards.exp} 经验值！`);
    setShowRewards(false);
    // 胜利后延迟显示退出提示
    setTimeout(() => {
      setShowExitModal(true);
    }, 1000);
  };

  // 退出并返回 pet 页面的 boss tab
  const handleExit = () => {
    setShowExitModal(false);
    history.push('/pet?tab=boss');
  };

  if (loading) {
    return (
      <div className={styles.fightContainer}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <Spin size="large" />
          <div>加载对战信息中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fightContainer}>
      {/* 返回按钮 */}
      <div className={styles.backButtonContainer}>
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/pet?tab=boss')}
          className={styles.backButton}
        >
          返回BOSS
        </Button>
      </div>
      
      {/* 血条区域 */}
      <div className={styles.healthBarsContainer}>
        <div className={styles.petHealthBar}>
          <div className={styles.healthBarHeader}>
            <Avatar 
              size={40} 
              className={styles.petAvatarSmall}
              src={isUrl(pet.avatar) ? pet.avatar : undefined}
            >
              {!isUrl(pet.avatar) ? pet.avatar : undefined}
            </Avatar>
            <div className={styles.healthBarInfo}>
              <div className={styles.healthBarName}>
                {pet.name} <Badge count={pet.level} color="#1890ff" size="small" />
              </div>
              <div className={styles.healthBarStats}>
                <FireOutlined /> {pet.attack} <SafetyOutlined /> {pet.defense}
              </div>
            </div>
          </div>
          <Progress
            percent={(pet.hp / pet.maxHp) * 100}
            strokeColor={{
              '0%': '#ff4d4f',
              '50%': '#faad14',
              '100%': '#52c41a',
            }}
            showInfo={false}
            strokeWidth={12}
          />
          <div className={styles.hpText}>{pet.hp} / {pet.maxHp}</div>
          {/* 宠物装备显示 */}
          {pet.equippedItems && Object.keys(pet.equippedItems).length > 0 && (
            <div className={styles.petEquipment}>
              {Object.entries(pet.equippedItems).map(([slot, item], index) => {
                const rarity = item.template?.rarity || 1;
                const rarityClass = styles[`rarity${rarity}`];
                const isAttacking = index === attackingEquipIndex && petAttacking;
                return (
                  <div 
                    key={slot} 
                    className={`${styles.equipmentItem} ${rarityClass} ${isAttacking ? styles.attacking : ''}`} 
                    title={`${item.template?.name || '装备'} (品级${rarity})`}
                  >
                    {item.template?.icon ? (
                      <img 
                        src={item.template.icon} 
                        alt={item.template.name || '装备'} 
                        className={styles.equipmentImg}
                        onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className={styles.equipmentFallback}>⚔️</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.vsIndicatorSmall}>
          <div className={styles.vsTextSmall}>VS</div>
          {/* 碰撞特效 */}
          {showCollisionEffect && (
            <div className={styles.collisionEffect}>
              <div className={styles.collisionRing}></div>
              <div className={styles.collisionSpark}></div>
            </div>
          )}
        </div>

        <div className={styles.bossHealthBar}>
          <div className={styles.healthBarHeader}>
            <div className={styles.healthBarInfo}>
              <div className={styles.healthBarName}>
                <Badge count={boss.level} color="#f5222d" size="small" /> {boss.name}
              </div>
              <div className={styles.healthBarStats}>
                <FireOutlined /> {boss.attack} <SafetyOutlined /> {boss.defense}
              </div>
              <div className={styles.bossExtraStats}>
                {boss.critRate ? <span title="暴击率">💥{(boss.critRate * 100).toFixed(0)}%</span> : null}
                {boss.dodgeRate ? <span title="闪避率">💨{(boss.dodgeRate * 100).toFixed(0)}%</span> : null}
                {boss.blockRate ? <span title="格挡率">🛡️{(boss.blockRate * 100).toFixed(0)}%</span> : null}
                {boss.comboRate ? <span title="连击率">⚡{(boss.comboRate * 100).toFixed(0)}%</span> : null}
                {boss.lifesteal ? <span title="吸血">🩸{(boss.lifesteal * 100).toFixed(0)}%</span> : null}
              </div>
            </div>
            <Avatar 
              size={40} 
              className={styles.bossAvatarSmall}
              src={isUrl(boss.avatar) ? boss.avatar : undefined}
            >
              {!isUrl(boss.avatar) ? boss.avatar : undefined}
            </Avatar>
          </div>
          <Progress
            percent={(boss.hp / boss.maxHp) * 100}
            strokeColor={{
              '0%': '#ff4d4f',
              '50%': '#faad14',
              '100%': '#52c41a',
            }}
            showInfo={false}
            strokeWidth={12}
          />
          <div className={styles.hpText}>{boss.hp} / {boss.maxHp}</div>
          {/* BOSS装备占位符 */}
          <div className={styles.bossEquipment}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.equipmentPlaceholder}>
                <span className={styles.equipmentPlaceholderIcon}>🔒</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 战斗场景 */}
      <div className={styles.battleArena}>
        <div className={styles.arenaBackground}>
          <div className={styles.arenaDecoration}></div>
        </div>

        {/* 宠物区域 */}
        <div className={styles.petArea}>
          <div className={`${styles.combatant} ${currentTurn === 'pet' ? styles.activeTurn : ''}`}>
            <Avatar 
              size={120} 
              className={`${styles.petAvatar} ${petAttacking ? styles.attacking : ''} ${petHurt ? styles.hurt : ''}`}
              src={isUrl(pet.avatar) ? pet.avatar : undefined}
            >
              {!isUrl(pet.avatar) ? pet.avatar : undefined}
            </Avatar>
            {currentTurn === 'pet' && battleStatus === 'fighting' && (
              <div className={styles.turnIndicator}>
                <FireOutlined />
              </div>
            )}
            <div className={styles.combatantLabel}>{pet.name}</div>
          </div>
        </div>

        {/* BOSS区域 */}
        <div className={styles.bossArea}>
          <div className={`${styles.combatant} ${currentTurn === 'boss' ? styles.activeTurn : ''}`}>
            <Avatar 
              size={120} 
              className={`${styles.bossAvatar} ${bossAttacking ? styles.attacking : ''} ${bossHurt ? styles.hurt : ''}`}
              src={isUrl(boss.avatar) ? boss.avatar : undefined}
            >
              {!isUrl(boss.avatar) ? boss.avatar : undefined}
            </Avatar>
            {currentTurn === 'boss' && battleStatus === 'fighting' && (
              <div className={styles.turnIndicator}>
                <FireOutlined />
              </div>
            )}
            <div className={styles.combatantLabel}>{boss.name}</div>
          </div>
        </div>
      </div>

      {/* 控制面板 */}
      <div className={styles.controlPanel}>
        <Card className={styles.controlCard}>
          <div className={styles.battleControls}>
            {battleStatus === 'idle' && (
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={startBattle}
                className={styles.startButton}
                disabled={loading}
              >
                开始战斗
              </Button>
            )}

            {battleStatus === 'fighting' && (
              <div className={styles.fightingControls}>
                <Spin size="large" />
                <span style={{ marginLeft: 10 }}>战斗中...</span>
              </div>
            )}

            {(battleStatus === 'victory' || battleStatus === 'defeat') && (
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={startBattle}
                className={styles.restartButton}
              >
                再次挑战
              </Button>
            )}
          </div>

          {/* 战斗状态指示器 */}
          <div className={styles.battleStatus}>
            <div className={`${styles.statusIndicator} ${styles[battleStatus]}`}>
              {battleStatus === 'idle' && '准备战斗'}
              {battleStatus === 'fighting' && (
                <>
                  <Spin size="small" />
                  <span>战斗中...</span>
                </>
              )}
              {battleStatus === 'victory' && '🎉 胜利！'}
              {battleStatus === 'defeat' && '💔 失败...'}
            </div>
          </div>
        </Card>
      </div>


      {/* 奖励弹窗 */}
      <Modal
        title={
          <div className={styles.rewardModalTitle}>
            <TrophyOutlined />
            <span>战斗胜利！</span>
          </div>
        }
        open={showRewards}
        onOk={claimRewards}
        onCancel={() => setShowRewards(false)}
        okText="领取奖励"
        cancelText="稍后领取"
        className={styles.rewardModal}
      >
        <div className={styles.rewardContent}>
          <div className={styles.congratulations}>
            🎉 恭喜击败了 {boss.name}！
          </div>
          
          <div className={styles.rewardList}>
            <div className={styles.rewardItem}>
              <span className={styles.rewardIcon}>💰</span>
              <span className={styles.rewardText}>摸鱼币 +{boss.rewards.coins}</span>
            </div>
            <div className={styles.rewardItem}>
              <span className={styles.rewardIcon}>⭐</span>
              <span className={styles.rewardText}>经验值 +{boss.rewards.exp}</span>
            </div>
            {boss.rewards.items.map((item, index) => (
              <div key={index} className={styles.rewardItem}>
                <span className={styles.rewardIcon}>🏆</span>
                <span className={styles.rewardText}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* 退出提示弹窗 */}
      <Modal
        open={showExitModal}
        onOk={handleExit}
        onCancel={handleExit}
        okText="确定"
        cancelButtonProps={{ style: { display: 'none' } }}
        closable={false}
        maskClosable={false}
        className={styles.exitModal}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
            正在退出 boss 秘境
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            摸鱼小勇士们明天见
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PetFight;
