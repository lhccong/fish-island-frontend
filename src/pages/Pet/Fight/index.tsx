import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Progress, Avatar, Badge, message, Modal, Spin } from 'antd';
import { 
  ThunderboltOutlined, 
  HeartOutlined, 
  FireOutlined, 
  SafetyOutlined,
  TrophyOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
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
}

// 战斗消息类型
type BattleMessageType = 'attack' | 'critical' | 'miss' | 'heal';

// 战斗状态
type BattleStatus = 'idle' | 'fighting' | 'victory' | 'defeat' | 'paused';

const PetFight: React.FC = () => {
  // 状态管理
  const [battleStatus, setBattleStatus] = useState<BattleStatus>('idle');
  const [currentTurn, setCurrentTurn] = useState<'pet' | 'boss'>('pet');
  const [isAutoFighting, setIsAutoFighting] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);
  
  // 碰撞效果状态
  const [petAttacking, setPetAttacking] = useState(false);
  const [bossAttacking, setBossAttacking] = useState(false);
  const [petHurt, setPetHurt] = useState(false);
  const [bossHurt, setBossHurt] = useState(false);
  const [showCollisionEffect, setShowCollisionEffect] = useState(false);

  // 定时器引用
  const battleTimer = useRef<NodeJS.Timeout | null>(null);

  // 模拟宠物数据
  const [pet, setPet] = useState<Pet>({
    id: 1,
    name: '摸鱼小精灵',
    level: 25,
    hp: 850,
    maxHp: 850,
    attack: 120,
    defense: 80,
    avatar: '🐠',
    exp: 1250,
    maxExp: 2000
  });

  // 模拟BOSS数据
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

  // 计算伤害
  const calculateDamage = (attacker: Pet | Boss, defender: Pet | Boss): number => {
    const baseDamage = attacker.attack;
    const defense = defender.defense;
    const randomFactor = 0.8 + Math.random() * 0.4; // 80%-120%的随机伤害
    
    // 暴击判定 (15%概率)
    const isCritical = Math.random() < 0.15;
    const criticalMultiplier = isCritical ? 1.5 : 1;
    
    // 闪避判定 (10%概率)
    const isMiss = Math.random() < 0.1;
    if (isMiss) return 0;
    
    const finalDamage = Math.max(1, Math.floor((baseDamage - defense * 0.5) * randomFactor * criticalMultiplier));
    return finalDamage;
  };

  // 碰撞效果函数
  const triggerCollisionEffect = (attacker: 'pet' | 'boss', damage: number) => {
    // 显示碰撞特效
    setShowCollisionEffect(true);
    setTimeout(() => setShowCollisionEffect(false), 300);

    // 攻击者前冲效果（只影响头像）
    if (attacker === 'pet') {
      setPetAttacking(true);
      setTimeout(() => setPetAttacking(false), 500);
    } else {
      setBossAttacking(true);
      setTimeout(() => setBossAttacking(false), 500);
    }

    // 被攻击者震动效果（只影响头像，且只在有伤害时）
    if (damage > 0) {
      setTimeout(() => {
        if (attacker === 'pet') {
          setBossHurt(true);
          setTimeout(() => setBossHurt(false), 300);
        } else {
          setPetHurt(true);
          setTimeout(() => setPetHurt(false), 300);
        }
      }, 200); // 延迟一点显示被攻击效果
    }
  };

  // 执行攻击
  const performAttack = (attacker: 'pet' | 'boss') => {
    if (battleStatus !== 'fighting') return;

    const isPlayerTurn = attacker === 'pet';
    const attackerData = isPlayerTurn ? pet : boss;
    const defenderData = isPlayerTurn ? boss : pet;
    const damage = calculateDamage(attackerData, defenderData);

    // 触发碰撞效果
    triggerCollisionEffect(attacker, damage);

    if (damage === 0) {
      showBattleMessage(
        `${attackerData.name} 的攻击被 ${defenderData.name} 闪避了！`,
        'miss'
      );
    } else {
      const isCritical = damage > attackerData.attack;
      const logType = isCritical ? 'critical' : 'attack';
      const criticalText = isCritical ? ' 暴击！' : '';
      
      showBattleMessage(
        `${attackerData.name} 对 ${defenderData.name} 造成了 ${damage} 点伤害！${criticalText}`,
        logType
      );

      // 更新血量
      if (isPlayerTurn) {
        setBoss(prev => ({
          ...prev,
          hp: Math.max(0, prev.hp - damage)
        }));
      } else {
        setPet(prev => ({
          ...prev,
          hp: Math.max(0, prev.hp - damage)
        }));
      }
    }

    // 切换回合
    setCurrentTurn(isPlayerTurn ? 'boss' : 'pet');
  };

  // 检查战斗结束
  useEffect(() => {
    if (battleStatus === 'fighting') {
      if (pet.hp <= 0) {
        setBattleStatus('defeat');
        setBattleResult('defeat');
        setIsAutoFighting(false);
        if (battleTimer.current) {
          clearTimeout(battleTimer.current);
        }
        showBattleMessage(`${pet.name} 被击败了...`, 'attack');
        message.error('战斗失败！');
      } else if (boss.hp <= 0) {
        setBattleStatus('victory');
        setBattleResult('victory');
        setIsAutoFighting(false);
        if (battleTimer.current) {
          clearTimeout(battleTimer.current);
        }
        showBattleMessage(`恭喜！${boss.name} 被击败了！`, 'attack');
        message.success('战斗胜利！');
        setShowRewards(true);
      }
    }
  }, [pet.hp, boss.hp, battleStatus]);

  // 自动战斗逻辑
  useEffect(() => {
    if (isAutoFighting && battleStatus === 'fighting') {
      battleTimer.current = setTimeout(() => {
        performAttack(currentTurn);
      }, 1500); // 每1.5秒执行一次攻击
    }

    return () => {
      if (battleTimer.current) {
        clearTimeout(battleTimer.current);
      }
    };
  }, [isAutoFighting, battleStatus, currentTurn]);

  // 开始战斗
  const startBattle = () => {
    setBattleStatus('fighting');
    setCurrentTurn('pet');
    setIsAutoFighting(true);
    showBattleMessage('战斗开始！', 'attack');
  };

  // 暂停/继续战斗
  const toggleBattle = () => {
    if (battleStatus === 'fighting') {
      setBattleStatus('paused');
      setIsAutoFighting(false);
      if (battleTimer.current) {
        clearTimeout(battleTimer.current);
      }
    } else if (battleStatus === 'paused') {
      setBattleStatus('fighting');
      setIsAutoFighting(true);
    }
  };

  // 重置战斗
  const resetBattle = () => {
    setBattleStatus('idle');
    setIsAutoFighting(false);
    setBattleResult(null);
    setShowRewards(false);
    setCurrentTurn('pet');
    
    // 重置血量
    setPet(prev => ({ ...prev, hp: prev.maxHp }));
    setBoss(prev => ({ ...prev, hp: prev.maxHp }));
    
    if (battleTimer.current) {
      clearTimeout(battleTimer.current);
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
    resetBattle();
  };

  return (
    <div className={styles.fightContainer}>
      {/* 血条区域 */}
      <div className={styles.healthBarsContainer}>
        <div className={styles.petHealthBar}>
          <div className={styles.healthBarHeader}>
            <Avatar size={40} className={styles.petAvatarSmall}>
              {pet.avatar}
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
            </div>
            <Avatar size={40} className={styles.bossAvatarSmall}>
              {boss.avatar}
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
            <Avatar size={120} className={`${styles.petAvatar} ${petAttacking ? styles.attacking : ''} ${petHurt ? styles.hurt : ''}`}>
              {pet.avatar}
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
            <Avatar size={120} className={`${styles.bossAvatar} ${bossAttacking ? styles.attacking : ''} ${bossHurt ? styles.hurt : ''}`}>
              {boss.avatar}
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
              >
                开始自动战斗
              </Button>
            )}

            {(battleStatus === 'fighting' || battleStatus === 'paused') && (
              <div className={styles.fightingControls}>
                <Button
                  type={battleStatus === 'fighting' ? 'default' : 'primary'}
                  size="large"
                  icon={battleStatus === 'fighting' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={toggleBattle}
                  className={styles.toggleButton}
                >
                  {battleStatus === 'fighting' ? '暂停战斗' : '继续战斗'}
                </Button>
                
                <Button
                  size="large"
                  icon={<ReloadOutlined />}
                  onClick={resetBattle}
                  className={styles.resetButton}
                >
                  重新开始
                </Button>
              </div>
            )}

            {(battleStatus === 'victory' || battleStatus === 'defeat') && (
              <Button
                type="primary"
                size="large"
                icon={<ReloadOutlined />}
                onClick={resetBattle}
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
                  <span>激烈战斗中...</span>
                </>
              )}
              {battleStatus === 'paused' && '战斗暂停'}
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
    </div>
  );
};

export default PetFight;
