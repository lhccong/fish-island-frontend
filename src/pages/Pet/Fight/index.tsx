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
import { getPetBattleInfoUsingGet, battleUsingGet1 } from '@/services/backend/petBattleController';
import { challengeUsingPost } from '@/services/backend/petTournamentController';
import { challengeUsingPost1, getProgressUsingGet } from '@/services/backend/towerClimbController';
import { getPetDetailUsingGet } from '@/services/backend/fishPetController';
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

// 战斗效果类型
interface BattleEffect {
  id: string;
  type: 'damage' | 'critical' | 'miss' | 'block' | 'heal' | 'combo';
  value?: number;
  text?: string;
  position: 'left' | 'right'; // left=宠物方(我方), right=对手方(敌方)
}

const PetFight: React.FC = () => {
  const [searchParams] = useSearchParams();
  const bossId = searchParams.get('bossId');
  const opponentUserId = searchParams.get('opponentUserId');
  const targetRank = searchParams.get('targetRank');
  const isTournament = searchParams.get('from') === 'tournament';
  const isTower = searchParams.get('from') === 'tower';
  const isPetBattle = !!opponentUserId || isTournament;
  const from = searchParams.get('from') || 'ranking'; // 从哪个页面进入：ranking, tournament, tower
  const [opponent, setOpponent] = useState<Pet | null>(null);
  
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

  // 战斗效果状态 - 用于显示伤害数字、闪避、格挡等
  const [battleEffects, setBattleEffects] = useState<BattleEffect[]>([]);

  // 跳过战斗动画状态 - 使用 ref 实现同步更新
  const isSkippingRef = useRef(false);
  const [skipButtonText, setSkipButtonText] = useState<'跳过' | '跳过中...'>('跳过');

  // 爬塔模式：战斗结果（用于判断胜负）
  const towerResultRef = useRef<API.TowerClimbResultVO | null>(null);

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

  // 获取对战信息（Boss对战或宠物对战）
  useEffect(() => {
    const fetchBattleInfo = async () => {
      // 爬塔模式
      if (isTower) {
        try {
          setLoading(true);
          // 并行获取爬塔进度（含怪物信息）和用户宠物信息
          const [progressRes, petRes] = await Promise.all([
            getProgressUsingGet(),
            getPetDetailUsingGet(),
          ]);

          if (progressRes.code === 0 && progressRes.data) {
            const { nextMonster } = progressRes.data;
            if (nextMonster) {
              setBoss({
                id: nextMonster.floor ?? 1,
                name: nextMonster.name ?? `第${nextMonster.floor ?? 1}层守卫`,
                level: nextMonster.floor ?? 1,
                hp: nextMonster.health ?? 100,
                maxHp: nextMonster.health ?? 100,
                attack: nextMonster.attack ?? 10,
                defense: 0,
                avatar: nextMonster.avatarUrl ?? '👹',
                rewards: {
                  coins: nextMonster.rewardPoints ?? 0,
                  exp: 0,
                  items: [],
                },
                critRate: nextMonster.critRate ?? 0,
                dodgeRate: nextMonster.dodgeRate ?? 0,
                blockRate: nextMonster.blockRate ?? 0,
                comboRate: nextMonster.comboRate ?? 0,
                lifesteal: nextMonster.lifesteal ?? 0,
              });
            }
          } else {
            message.error(progressRes.message || '获取爬塔信息失败');
          }

          if (petRes.code === 0 && petRes.data) {
            const petData = petRes.data;
            setPet({
              id: petData.petId || 1,
              name: petData.name || '摸鱼小精灵',
              level: petData.level || 1,
              hp: 100,
              maxHp: 100,
              attack: 10,
              defense: 5,
              avatar: petData.petUrl || '🐠',
              exp: petData.exp || 0,
              maxExp: 100,
              equippedItems: petData.equippedItems as Record<string, API.ItemInstanceVO>,
            });
          }
        } catch (error: any) {
          console.error('获取爬塔信息失败:', error);
          message.error(error.message || '获取爬塔信息失败');
        } finally {
          setLoading(false);
        }
        return;
      }

      // 判断对战类型
      if (isPetBattle) {
        // 宠物对战模式（包括普通宠物对战和武道大会）
        if (!opponentUserId) {
          message.error('缺少对手用户ID参数');
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          const res = await getPetBattleInfoUsingGet({
            opponentUserId: opponentUserId as any
          });

          if (res.code === 0 && res.data) {
            const { myPet, opponentPet } = res.data;

            // 更新我的宠物数据
            if (myPet) {
              setPet({
                id: myPet.petId || 1,
                name: myPet.name || '我的宠物',
                level: myPet.level || 1,
                hp: myPet.health || 100,
                maxHp: myPet.health || 100,
                attack: myPet.attack || 10,
                defense: 5,
                avatar: myPet.avatar || '🐠',
                exp: 0,
                maxExp: 100,
                equippedItems: myPet.equippedItems as Record<string, API.ItemInstanceVO>
              });
            }

            // 更新对手宠物数据
            if (opponentPet) {
              setOpponent({
                id: opponentPet.petId || 1,
                name: opponentPet.name || '对手宠物',
                level: opponentPet.level || 1,
                hp: opponentPet.health || 100,
                maxHp: opponentPet.health || 100,
                attack: opponentPet.attack || 10,
                defense: 5,
                avatar: opponentPet.avatar || '🐱',
                exp: 0,
                maxExp: 100,
                equippedItems: opponentPet.equippedItems as Record<string, API.ItemInstanceVO>
              });
            }
          } else {
            message.error(res.message || '获取对战信息失败');
          }
        } catch (error: any) {
          console.error('获取宠物对战信息失败:', error);
          message.error(error.message || '获取对战信息失败');
        } finally {
          setLoading(false);
        }
      } else {
        // Boss对战模式
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
              const bossData = bossInfo as any;
              setBoss({
                id: bossInfo.id || 1,
                name: bossInfo.name || '未知BOSS',
                level: 30,
                hp: bossInfo.currentHealth || bossInfo.maxHealth || 1200,
                maxHp: bossInfo.maxHealth || 1200,
                attack: bossInfo.attack || 150,
                defense: 100,
                avatar: bossInfo.avatar || '👔',
                rewards: {
                  coins: bossInfo.rewardPoints || 500,
                  exp: 300,
                  items: ['自由勋章', '摸鱼许可证']
                },
                critRate: bossData.critRate || 0,
                critResistance: bossData.critResistance || 0,
                dodgeRate: bossData.dodgeRate || 0,
                dodgeResistance: bossData.dodgeResistance || 0,
                blockRate: bossData.blockRate || 0,
                blockResistance: bossData.blockResistance || 0,
                comboRate: bossData.comboRate || 0,
                comboResistance: bossData.comboResistance || 0,
                lifesteal: bossData.lifesteal || 0,
                lifestealResistance: bossData.lifestealResistance || 0
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
                defense: 5,
                avatar: petInfo.avatar || '🐠',
                exp: 0,
                maxExp: 100,
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
      }
    };

    fetchBattleInfo();
  }, [bossId, opponentUserId, isPetBattle, isTower]);

  // 添加战斗效果到界面
  const addBattleEffect = (effect: Omit<BattleEffect, 'id'>) => {
    const id = `${Date.now()}_${Math.random()}`;
    const newEffect: BattleEffect = { ...effect, id };
    setBattleEffects(prev => [...prev, newEffect]);

    // 1.5秒后移除效果
    setTimeout(() => {
      setBattleEffects(prev => prev.filter(e => e.id !== id));
    }, 1500);
  };



  // 处理单个回合的战斗结果
  const processBattleRound = (result: API.BattleResultVO | API.PetBattleResultVO, roundIndex: number) => {
    const attackerType = (result as any).attackerType || '';
    const isPetAttack = isPetBattle ? attackerType === 'MY_PET' : attackerType === 'PET';
    const currentOpponent = isPetBattle ? opponent : boss;
    const attacker = isPetAttack ? pet : currentOpponent!;
    const defender = isPetAttack ? currentOpponent! : pet;
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

    // 显示战斗效果 - 在界面上显示伤害数字/闪避/格挡等
    const targetPosition = isPetAttack ? 'right' : 'left'; // 攻击目标是对手

    if (result.isDodge) {
      addBattleEffect({
        type: 'miss',
        text: '闪避!',
        position: targetPosition
      });
    } else if (result.isBlock) {
      addBattleEffect({
        type: 'block',
        text: '格挡!',
        position: targetPosition
      });
    } else {
      // 正常伤害 - 根据是否暴击显示不同效果
      if (result.isCritical) {
        addBattleEffect({
          type: 'critical',
          value: damage,
          text: result.isCombo ? '暴击连击!' : '暴击!',
          position: targetPosition
        });
      } else if (result.isCombo) {
        addBattleEffect({
          type: 'combo',
          value: damage,
          text: '连击!',
          position: targetPosition
        });
      } else {
        addBattleEffect({
          type: 'damage',
          value: damage,
          position: targetPosition
        });
      }
    }

    // 显示吸血回复效果
    if (result.lifestealHeal && result.lifestealHeal > 0) {
      const healerPosition = isPetAttack ? 'left' : 'right'; // 吸血者是攻击方
      addBattleEffect({
        type: 'heal',
        value: result.lifestealHeal,
        text: '吸血',
        position: healerPosition
      });
    }

    // 更新血量
    if (isPetBattle) {
      // 宠物对战模式
      const petBattleResult = result as API.PetBattleResultVO;
      if (petBattleResult.myPetRemainingHealth !== undefined) {
        setPet(prev => ({ ...prev, hp: petBattleResult.myPetRemainingHealth || 0 }));
      }
      if (petBattleResult.opponentPetRemainingHealth !== undefined && opponent) {
        setOpponent(prev => prev ? ({ ...prev, hp: petBattleResult.opponentPetRemainingHealth || 0 }) : null);
      }
    } else {
      // Boss对战模式
      const bossBattleResult = result as API.BattleResultVO;
      if (bossBattleResult.petRemainingHealth !== undefined) {
        setPet(prev => ({ ...prev, hp: bossBattleResult.petRemainingHealth || 0 }));
      }
      if (bossBattleResult.bossRemainingHealth !== undefined) {
        setBoss(prev => ({ ...prev, hp: bossBattleResult.bossRemainingHealth || 0 }));
      }
    }
  };

  // 开始战斗（逐个处理战斗结果）
  const startBattle = async () => {
    // 重置跳过状态
    isSkippingRef.current = false;
    setSkipButtonText('跳过');
    // 检查参数
    if (isPetBattle && !opponentUserId) {
      message.error('缺少对手用户ID参数');
      return;
    }
    if (!isPetBattle && !isTower && !bossId) {
      message.error('缺少Boss ID参数');
      return;
    }

    try {
      setBattleStatus('fighting');
      setLoading(true);
      message.info('战斗开始！');

      // 调用接口获取所有战斗结果
      let battleResults: any[] = [];
      
      if (isTower) {
        // 爬塔挑战
        const res = await challengeUsingPost1();
        if (res.code === 0 && res.data) {
          const towerResult = res.data;
          battleResults = towerResult.battleRounds ?? [];
          towerResultRef.current = towerResult;
          // 从第一回合推算宠物最大血量并更新
          const firstRound = battleResults[0] as API.BattleResultVO | undefined;
          if (firstRound) {
            const petMaxHp = firstRound.attackerType === 'BOSS'
              ? (firstRound.petRemainingHealth ?? 0) + (firstRound.damage ?? 0)
              : firstRound.petRemainingHealth ?? 100;
            setPet(prev => ({ ...prev, maxHp: petMaxHp, hp: petMaxHp }));
          }
        }
      } else if (isTournament && targetRank) {
        // 武道大会挑战
        const res = await challengeUsingPost({ targetRank: Number(targetRank) });
        if (res.code === 0 && res.data && res.data.rounds) {
          battleResults = res.data.rounds;
        }
      } else if (isPetBattle) {
        // 普通宠物对战
        const res = await battleUsingGet1({
          opponentUserId: opponentUserId as any
        });
        if (res.code === 0 && res.data) {
          battleResults = res.data;
        }
      } else {
        // Boss对战
        const res = await battleUsingGet({ 
          bossId: Number(bossId) 
        });
        if (res.code === 0 && res.data) {
          battleResults = res.data;
        }
      }

      if (battleResults.length > 0) {
        setLoading(false);
        
        // 逐个处理每个回合，每个回合之间延迟1.5秒
        for (let i = 0; i < battleResults.length; i++) {
          // 如果点击了跳过，则快速执行剩余回合
          if (isSkippingRef.current) {
            // 快速处理剩余回合，只更新最终血量
            const lastResult = battleResults[battleResults.length - 1];
            if (isPetBattle) {
              const petBattleResult = lastResult as API.PetBattleResultVO;
              setPet(prev => ({ ...prev, hp: petBattleResult.myPetRemainingHealth || 0 }));
              if (opponent) {
                setOpponent(prev => prev ? ({ ...prev, hp: petBattleResult.opponentPetRemainingHealth || 0 }) : null);
              }
            } else {
              const bossBattleResult = lastResult as API.BattleResultVO;
              setPet(prev => ({ ...prev, hp: bossBattleResult.petRemainingHealth || 0 }));
              setBoss(prev => ({ ...prev, hp: bossBattleResult.bossRemainingHealth || 0 }));
            }
            break;
          }

          await new Promise(resolve => setTimeout(resolve, i === 0 ? 500 : 1500));

          const result = battleResults[i];
          processBattleRound(result, i);

          // 检查是否已经分出胜负（提前结束）
          let petHp: number;
          let opponentHp: number;

          if (isPetBattle) {
            const petBattleResult = result as API.PetBattleResultVO;
            petHp = petBattleResult.myPetRemainingHealth || 0;
            opponentHp = petBattleResult.opponentPetRemainingHealth || 0;
          } else {
            const bossBattleResult = result as API.BattleResultVO;
            petHp = bossBattleResult.petRemainingHealth || 0;
            opponentHp = bossBattleResult.bossRemainingHealth || 0;
          }

          if (petHp <= 0 || opponentHp <= 0) {
            // 等待最后一击的动画完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
          }
        }

        // 获取最后一回合的结果来判断胜负
        const lastResult = battleResults[battleResults.length - 1];
        let petWon: boolean;
        
        if (isTower) {
          // 爬塔模式：从 towerResultRef 中获取胜负
          petWon = towerResultRef.current?.win ?? ((lastResult as API.BattleResultVO).petRemainingHealth || 0) > 0;
        } else if (isPetBattle) {
          const petBattleResult = lastResult as API.PetBattleResultVO;
          petWon = (petBattleResult.myPetRemainingHealth || 0) > 0 && (petBattleResult.opponentPetRemainingHealth || 0) <= 0;
        } else {
          const bossBattleResult = lastResult as API.BattleResultVO;
          petWon = (bossBattleResult.petRemainingHealth || 0) > 0 && (bossBattleResult.bossRemainingHealth || 0) <= 0;
        }
        
        const opponentName = isPetBattle ? opponent?.name : boss.name;
        
        if (petWon) {
          setBattleStatus('victory');
          setBattleResult('victory');
          message.success(`恭喜！${opponentName} 被击败了！`);
          message.success('战斗胜利！');
          if (isTower) {
            // 爬塔胜利，延迟显示退出提示
            setTimeout(() => {
              setShowExitModal(true);
            }, 1500);
          } else if (!isPetBattle) {
            setShowRewards(true);
          } else {
            // 宠物对战不需要领取奖励，直接显示退出提示
            setTimeout(() => {
              setShowExitModal(true);
            }, 1500);
          }
        } else {
          setBattleStatus('defeat');
          setBattleResult('defeat');
          message.error(`${pet.name} 被击败了...`);
          message.error('战斗失败！');
          // 失败后延迟显示退出提示
          setTimeout(() => {
            setShowExitModal(true);
          }, 2000);
        }
      } else {
        message.error('战斗失败');
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

  // 退出并返回来源页面
  const handleExit = () => {
    setShowExitModal(false);
    if (isTower) {
      history.push('/point/tower'); // 返回爬塔页面
    } else if (isPetBattle) {
      if (from === 'tournament') {
        history.push('/point/tournament'); // 返回武道大会
      } else {
        history.push('/pet?tab=ranking'); // 返回排行榜
      }
    } else {
      history.push('/pet?tab=boss');
    }
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
          onClick={() => {
            if (isTower) {
              history.push('/point/tower');
            } else if (isPetBattle) {
              if (from === 'tournament') {
                history.push('/point/tournament'); // 返回武道大会
              } else {
                history.push('/pet?tab=ranking'); // 返回排行榜
              }
            } else {
              history.push('/pet?tab=boss');
            }
          }}
          className={styles.backButton}
        >
          {isTower ? '返回爬塔' : isPetBattle ? (from === 'tournament' ? '返回武道大会' : '返回排行榜') : '返回BOSS'}
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

        {isPetBattle && opponent ? (
          <div className={styles.bossHealthBar} style={{ borderColor: 'rgba(24, 144, 255, 0.4)', background: 'linear-gradient(135deg, rgba(240, 245, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)' }}>
            <div className={styles.healthBarHeader}>
              <div className={styles.healthBarInfo}>
                <div className={styles.healthBarName}>
                  <Badge count={opponent.level} color="#1890ff" size="small" /> {opponent.name}
                </div>
                <div className={styles.healthBarStats}>
                  <FireOutlined /> {opponent.attack} <SafetyOutlined /> {opponent.defense}
                </div>
              </div>
              <Avatar 
                size={40} 
                className={styles.petAvatarSmall}
                src={isUrl(opponent.avatar) ? opponent.avatar : undefined}
              >
                {!isUrl(opponent.avatar) ? opponent.avatar : undefined}
              </Avatar>
            </div>
            <Progress
              percent={(opponent.hp / opponent.maxHp) * 100}
              strokeColor={{
                '0%': '#ff4d4f',
                '50%': '#faad14',
                '100%': '#52c41a',
              }}
              showInfo={false}
              strokeWidth={12}
            />
            <div className={styles.hpText}>{opponent.hp} / {opponent.maxHp}</div>
            {/* 对手装备显示 */}
            {opponent.equippedItems && Object.keys(opponent.equippedItems).length > 0 && (
              <div className={styles.bossEquipment}>
                {Object.entries(opponent.equippedItems).map(([slot, item]) => {
                  const rarity = item.template?.rarity || 1;
                  const rarityClass = styles[`rarity${rarity}`];
                  return (
                    <div 
                      key={slot} 
                      className={`${styles.equipmentItem} ${rarityClass}`} 
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
        ) : (
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
        )}
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

        {/* 对手区域 (BOSS或对方宠物) */}
        <div className={styles.bossArea}>
          <div className={`${styles.combatant} ${currentTurn === 'boss' ? styles.activeTurn : ''}`}>
            <Avatar
              size={120}
              className={`${isPetBattle ? styles.petAvatar : styles.bossAvatar} ${bossAttacking ? styles.attacking : ''} ${bossHurt ? styles.hurt : ''}`}
              src={isUrl(isPetBattle && opponent ? opponent.avatar : boss.avatar) ? (isPetBattle && opponent ? opponent.avatar : boss.avatar) : undefined}
            >
              {!isUrl(isPetBattle && opponent ? opponent.avatar : boss.avatar) ? (isPetBattle && opponent ? opponent.avatar : boss.avatar) : undefined}
            </Avatar>
            {currentTurn === 'boss' && battleStatus === 'fighting' && (
              <div className={styles.turnIndicator}>
                <FireOutlined />
              </div>
            )}
            <div className={styles.combatantLabel}>{isPetBattle && opponent ? opponent.name : boss.name}</div>
          </div>
        </div>

        {/* 战斗效果层 - 伤害数字、闪避、格挡等 */}
        {battleEffects.map((effect) => (
          <div
            key={effect.id}
            className={`${styles.battleEffect} ${styles[effect.type]} ${styles[effect.position]}`}
          >
            {effect.value !== undefined && <span className={styles.effectValue}>{effect.value}</span>}
            {effect.text && <span className={styles.effectText}>{effect.text}</span>}
          </div>
        ))}
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
                <Button
                  type="default"
                  size="small"
                  onClick={() => {
                    isSkippingRef.current = true;
                    setSkipButtonText('跳过中...');
                  }}
                  className={styles.skipButton}
                  disabled={skipButtonText === '跳过中...'}
                >
                  {skipButtonText}
                </Button>
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
            {isTower ? '正在退出爬塔对战' : isPetBattle ? '正在退出宠物对战' : '正在退出 boss 秘境'}
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            {isTower
              ? '返回爬塔，继续挑战更高层数'
              : isPetBattle
              ? (from === 'tournament' ? '返回武道大会，继续挑战更高排名' : '期待下一次精彩对决')
              : '摸鱼小勇士们每天有两次挑战机会别忘记喔'}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PetFight;
