import React from 'react';
import FarmPetNest from './FarmPetNest';
import './FarmCottageDeco.less';

const FARM_COTTAGE_IMG = 'https://oss.cqbo.com/moyu/farm/xiaowu.png';

type FarmCottageDecoProps = {
  /** 拜访好友时传入，农舍内展示对方宠物 */
  ownerUserId?: string;
  ownerName?: string;
};

/** 田地右侧农舍，宠物住在屋内 */
const FarmCottageDeco: React.FC<FarmCottageDecoProps> = ({
  ownerUserId,
  ownerName,
}) => (
  <div className="farm-cottage-deco-wrap">
    <div className="farm-cottage-stage">
      <img
        className="farm-cottage-img"
        src={FARM_COTTAGE_IMG}
        alt=""
        draggable={false}
      />
      <FarmPetNest
        variant="cottage"
        ownerUserId={ownerUserId}
        ownerName={ownerName}
      />
    </div>
  </div>
);

export default FarmCottageDeco;
