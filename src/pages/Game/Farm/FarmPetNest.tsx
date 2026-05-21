import React, { useCallback, useEffect, useState } from 'react';
import { Spin, Tooltip } from 'antd';
import { useModel } from '@umijs/max';
import { getPetDetailUsingGet } from '@/services/backend/fishPetController';
import MoyuPet, { renderPetImage } from '@/components/MoyuPet';
import './FarmPetNest.less';

type FarmPetNestProps = {
  /** cottage：疊在右側農舍門口內 */
  variant?: 'cottage';
};

const FarmPetNest: React.FC<FarmPetNestProps> = ({ variant = 'cottage' }) => {
  const { initialState } = useModel('@@initialState');
  const [pet, setPet] = useState<API.PetVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [petModalOpen, setPetModalOpen] = useState(false);

  const loadPet = useCallback(async () => {
    if (!initialState?.currentUser) {
      setPet(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
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
  }, [initialState?.currentUser]);

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

  const tooltipTitle = pet
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
            aria-label="我的宠物"
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
                <span className="farm-pet-nest-hint">去领养</span>
              )}
            </span>
          </button>
        </Tooltip>
      </div>

      <MoyuPet visible={petModalOpen} onClose={handleClosePet} />
    </>
  );
};

export default FarmPetNest;
