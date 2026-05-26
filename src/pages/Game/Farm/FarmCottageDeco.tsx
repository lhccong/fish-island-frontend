import React from 'react';
import FarmPetNest from './FarmPetNest';
import './FarmCottageDeco.less';

const FARM_COTTAGE_IMG = 'https://oss.cqbo.com/moyu/farm/xiaowu.png';

/** 田地右側農舍，寵物住在屋內 */
const FarmCottageDeco: React.FC = () => (
  <div className="farm-cottage-deco-wrap">
    <div className="farm-cottage-stage">
      <img
        className="farm-cottage-img"
        src={FARM_COTTAGE_IMG}
        alt=""
        draggable={false}
      />
      <FarmPetNest variant="cottage" />
    </div>
  </div>
);

export default FarmCottageDeco;
