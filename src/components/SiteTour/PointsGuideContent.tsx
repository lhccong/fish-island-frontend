import React from 'react';
import {
  CalendarOutlined,
  CameraOutlined,
  EnvironmentOutlined,
  LikeOutlined,
  MessageOutlined,
  RedEnvelopeOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import styles from './index.less';

type PointsMethod = {
  icon: React.ReactNode;
  label: string;
  points: string;
};

const OTHER_METHODS: PointsMethod[] = [
  { icon: <CalendarOutlined />, label: '每日签到', points: '+10' },
  { icon: <EnvironmentOutlined />, label: '农场种菜', points: '收获可得' },
  { icon: <TrophyOutlined />, label: '宠物 BOSS', points: '排名结算' },
  { icon: <CameraOutlined />, label: '发布鱼小圈', points: '+5/条' },
  { icon: <LikeOutlined />, label: '点赞鱼小圈', points: '+5/条' },
  { icon: <RedEnvelopeOutlined />, label: '抢红包', points: '随机获得' },
];

type PointsGuideContentProps = {
  onOpenChat: () => void;
};

const PointsGuideContent: React.FC<PointsGuideContentProps> = ({ onOpenChat }) => {
  return (
    <div className={styles.pointsGuide}>
      <div className={styles.chatHighlight}>
        <div className={styles.chatHighlightHeader}>
          <span className={styles.chatIcon}>
            <MessageOutlined />
          </span>
          <div className={styles.chatHighlightInfo}>
            <span className={styles.chatHighlightTitle}>聊天室发言</span>
            <span className={styles.chatHighlightDesc}>每日发言满 10 条</span>
          </div>
          <span className={styles.pointsBadge}>+10 积分</span>
        </div>
        <p className={styles.chatHighlightTip}>
          在鱼窝聊天室多发言，轻松完成每日积分任务，还能和鱼友一起摸鱼。
        </p>
        <Button
          type="primary"
          icon={<MessageOutlined />}
          className={styles.openChatBtn}
          onClick={onOpenChat}
          block
        >
          打开聊天室
        </Button>
      </div>

      <div className={styles.otherMethods}>
        <div className={styles.otherTitle}>更多积分途径</div>
        <div className={styles.methodGrid}>
          {OTHER_METHODS.map((method) => (
            <div key={method.label} className={styles.methodItem}>
              <span className={styles.methodIcon}>{method.icon}</span>
              <div className={styles.methodInfo}>
                <span className={styles.methodLabel}>{method.label}</span>
                <span className={styles.methodPoints}>{method.points}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PointsGuideContent;
