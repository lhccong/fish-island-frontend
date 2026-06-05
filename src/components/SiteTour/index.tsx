import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { history } from '@umijs/max';
import { Tour, type TourProps } from 'antd';
import { activateFloatingChat } from '@/components/FloatingChat';
import { findTourTarget, START_SITE_TOUR_EVENT } from './constants';
import PointsGuideContent from './PointsGuideContent';
import styles from './index.less';

type StepDefinition = {
  title: string;
  description: ReactNode;
  selectors?: string[];
  center?: boolean;
};

const buildStepDefinitions = (onOpenChat: () => void): StepDefinition[] => [
  {
    title: '欢迎来到摸鱼岛 🐟',
    description: '这里是一个有趣的在线摸鱼社区。接下来带你快速了解网站的主要功能和使用方式。',
    center: true,
  },
  {
    title: '网站导航',
    description: '通过顶部或侧边导航，可以进入鱼窝聊天、摸鱼阅读、小游戏、积分玩法等各个模块。',
    selectors: [
      '.ant-pro-top-nav-header-menu',
      '.ant-pro-sider-menu',
      '.ant-layout-sider-children',
    ],
  },
  {
    title: '用户中心',
    description: '点击头像可查看消息通知；在下拉菜单中可以修改个人信息、切换主题、管理网站设置等。',
    selectors: ['[data-tour="user-avatar"]'],
  },
  {
    title: '标签模式',
    description: '一键切换到浏览器伪装页面，适合需要快速切换场景时使用。',
    selectors: ['[data-tour="tab-mode"]'],
  },
  {
    title: '悬浮聊天',
    description: '右下角悬浮聊天窗口，支持 Excel 伪装模式，让你在工作界面中也能悄悄摸鱼聊天。',
    selectors: ['[data-tour="floating-chat"]'],
  },
  {
    title: '摸鱼计时',
    description: '显示距离下班或午餐的倒计时，以及今日摸鱼收入，可在头像菜单中显示或隐藏。',
    selectors: ['[data-tour="money-button"]', '.money-button'],
  },
  {
    title: '积分获取途径',
    description: <PointsGuideContent onOpenChat={onOpenChat} />,
    center: true,
  },
  {
    title: '开始摸鱼吧！',
    description: '随时可在头像菜单中再次打开「网站引导」。祝你摸鱼愉快！',
    center: true,
  },
];

const buildTourSteps = (onOpenChat: () => void): TourProps['steps'] => {
  return buildStepDefinitions(onOpenChat).reduce<NonNullable<TourProps['steps']>>((steps, definition) => {
    if (definition.center) {
      steps.push({
        title: definition.title,
        description: definition.description,
        target: null,
      });
      return steps;
    }

    const target = findTourTarget(definition.selectors || []);
    if (!target) {
      return steps;
    }

    steps.push({
      title: definition.title,
      description: definition.description,
      target: () => target,
    });
    return steps;
  }, []);
};

const SiteTour: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourProps['steps']>([]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOpenChat = useCallback(() => {
    setOpen(false);
    if (history.location.pathname === '/chat') {
      activateFloatingChat('normal');
      return;
    }
    history.push('/chat');
  }, []);

  useEffect(() => {
    const handleStartTour = () => {
      const nextSteps = buildTourSteps(handleOpenChat);
      if (nextSteps.length === 0) {
        return;
      }
      setSteps(nextSteps);
      setOpen(true);
    };

    window.addEventListener(START_SITE_TOUR_EVENT, handleStartTour);
    return () => {
      window.removeEventListener(START_SITE_TOUR_EVENT, handleStartTour);
    };
  }, [handleOpenChat]);

  if (!steps?.length) {
    return null;
  }

  return (
    <Tour
      open={open}
      onClose={handleClose}
      onFinish={handleClose}
      steps={steps}
      classNames={{ root: styles.siteTour }}
      scrollIntoViewOptions={{ block: 'center', behavior: 'smooth' }}
      gap={{ offset: 8, radius: 6 }}
    />
  );
};

export default SiteTour;
export { startSiteTour } from './constants';
