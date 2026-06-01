import React, { useCallback, useEffect, useState } from 'react';
import { Spin, Tooltip } from 'antd';
import { useModel } from '@umijs/max';
import {
  getOtherUserPetUsingGet,
  getPetDetailUsingGet,
} from '@/services/backend/fishPetController';
import MoyuPet, { renderPetImage } from '@/components/MoyuPet';
import './FarmPetNest.less';

type FarmPetDisplay = Pick<API.PetVO, 'name' | 'level' | 'petUrl'>;

type FarmPetNestProps = {
  /** cottage：叠在右侧农舍门口内 */
  variant?: 'cottage';
  /** 拜访好友时传入其用户 ID（字符串，避免雪花 ID 精度丢失） */
  ownerUserId?: string;
  /** 拜访好友时的昵称，用于展示与弹窗标题 */
  ownerName?: string;
};

const FarmPetNest: React.FC<FarmPetNestProps> = ({
  variant = 'cottage',
  ownerUserId,
  ownerName,
}) => {
  const { initialState } = useModel('@@initialState');
  const [pet, setPet] = useState<FarmPetDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [petModalOpen, setPetModalOpen] = useState(false);
  const isVisiting = !!ownerUserId;
  const displayOwnerName = ownerName?.trim() || '好友';

  const loadPet = useCallback(async () => {
    setLoading(true);
    try {
      if (isVisiting) {
        const res = await getOtherUserPetUsingGet({
          otherUserId: ownerUserId as unknown as number,
        });
        if (res.code === 0 && res.data) {
          setPet(res.data);
        } else {
          setPet(null);
        }
        return;
      }

      if (!initialState?.currentUser) {
        setPet(null);
        return;
      }

      const res = await getPetDetailUsingGet();
      if (res.code === 0 && res.data) {
        setPet(res.data);
      } else {
        setPet(null);
      }
    } catch {
      setPet(null);
    } finally {
      setLoading(false);
    }
  }, [initialState?.currentUser, isVisiting, ownerUserId]);

  useEffect(() => {
    loadPet();
  }, [loadPet]);

  const handleOpenPet = () => {
    setPetModalOpen(true);
  };

  const handleClosePet = () => {
    setPetModalOpen(false);
    loadPet();
  };

  const tooltipTitle = isVisiting
    ? pet
      ? `${displayOwnerName}的${pet.name ?? '宠物'} Lv.${pet.level ?? 1} · 点击查看`
      : `${displayOwnerName} 还没有宠物`
    : pet
      ? `${pet.name ?? '宠物'} Lv.${pet.level ?? 1} · 点击查看`
      : '屋里空空 · 点击领养宠物';

  const wrapClass =
    variant === 'cottage'
      ? 'farm-pet-nest-wrap farm-pet-nest-wrap--cottage'
      : 'farm-pet-nest-wrap';
  const btnClass =
    variant === 'cottage'
      ? 'farm-pet-nest farm-pet-nest--cottage'
      : 'farm-pet-nest';

  return (
    <>
      <div className={wrapClass}>
        <Tooltip title={tooltipTitle}>
          <button
            type="button"
            className={btnClass}
            onClick={handleOpenPet}
            aria-label={isVisiting ? `${displayOwnerName}的宠物` : '我的宠物'}
          >
            <span className="farm-pet-nest-figure">
              {loading ? (
                <Spin size="small" />
              ) : pet?.petUrl ? (
                <span className="farm-pet-nest-pet">
                  {renderPetImage(pet.petUrl, 120, true, 'farm-pet-nest-img')}
                </span>
              ) : (
                <span className="farm-pet-nest-empty" aria-hidden>
                  🐾
                </span>
              )}
            </span>

            <span className="farm-pet-nest-label">
              {pet ? (
                <>
                  <span className="farm-pet-nest-name">{pet.name ?? '宠物'}</span>
                  <span className="farm-pet-nest-level">Lv.{pet.level ?? 1}</span>
                </>
              ) : (
                <span className="farm-pet-nest-hint">
                  {isVisiting ? '暂无宠物' : '去领养'}
                </span>
              )}
            </span>
          </button>
        </Tooltip>
      </div>

      <MoyuPet
        visible={petModalOpen}
        onClose={handleClosePet}
        otherUserId={
          isVisiting ? (ownerUserId as unknown as number) : undefined
        }
        otherUserName={isVisiting ? displayOwnerName : undefined}
      />
    </>
  );
};

export default FarmPetNest;
