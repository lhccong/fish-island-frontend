import {
  updateMyUserUsingPost,
  userLogoutUsingPost,
  signInUsingPost,
  getLoginUserUsingGet
} from '@/services/backend/userController';
import {
  renderAuthUsingGet,
  unbindPlatform
} from '@/services/backend/restAuthController';
import {getCosCredentialUsingGet, uploadFileByMinioUsingPost} from '@/services/backend/fileController';
import {
  LockOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
  EditOutlined,
  UploadOutlined,
  AppstoreOutlined,
  SwapOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import {history, useModel} from '@umijs/max';
import {
  Avatar,
  Button,
  Form,
  FormProps,
  Input,
  message,
  Modal,
  Space,
  TimePicker,
  Tooltip,
  Select,
  Upload,
  Switch
} from 'antd';
import type {MenuInfo} from 'rc-menu/lib/interface';
import React, {useCallback, useEffect, useState, Suspense, lazy} from 'react';
import {flushSync} from 'react-dom';
import HeaderDropdown from '../HeaderDropdown';
import {useEmotionCss} from "@ant-design/use-emotion-css";
import moment, {Moment} from "moment";
import './app.css';
import {RcFile} from "antd/lib/upload";
import COS from 'cos-js-sdk-v5';
import LoginRegister from '../LoginRegister';
import { Item } from 'rc-menu';
lazy(() => import('@/components/MusicPlayer'));
export type GlobalHeaderRightProps = {
  menu?: boolean;
};
type MoYuTimeType = {
  startTime?: Moment;
  endTime?: Moment;
  lunchTime?: Moment;
  monthlySalary?: number;
};

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({menu}) => {
  const [moYuData, setMoYuData] = useState<MoYuTimeType>({
    startTime: moment('08:30', 'HH:mm'),
    endTime: moment('17:30', 'HH:mm'),
    lunchTime: moment('12:00', 'HH:mm'),
  });

  // 从 localStorage 读取数据
  useEffect(() => {
    const savedData = localStorage.getItem('moYuData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setMoYuData({
        startTime: moment(parsedData.startTime, 'HH:mm'),
        endTime: moment(parsedData.endTime, 'HH:mm'),
        lunchTime: moment(parsedData.lunchTime, 'HH:mm'),
        monthlySalary: parsedData.monthlySalary,
      });
    }
  }, []);

  const [timeInfo, setTimeInfo] = useState<{
    type: 'work' | 'lunch' | 'holiday';
    name?: string;
    timeRemaining: string;
    earnedAmount?: number;
  }>({type: 'work', timeRemaining: '00:00:00'});

  const onFinishMoYu: FormProps<MoYuTimeType>['onFinish'] = (values) => {
    // 将 Moment 对象转换为 ISO 字符串格式后存储
    const dataToSave = {
      startTime: values.startTime?.format('HH:mm'),
      endTime: values.endTime?.format('HH:mm'),
      lunchTime: values.lunchTime?.format('HH:mm'),
      monthlySalary: values.monthlySalary,
    };
    localStorage.setItem('moYuData', JSON.stringify(dataToSave));
    // 转换回 Moment 对象后设置
    setMoYuData({
      startTime: moment(values.startTime?.format('HH:mm'), 'HH:mm'),
      endTime: moment(values.endTime?.format('HH:mm'), 'HH:mm'),
      lunchTime: moment(values.lunchTime?.format('HH:mm'), 'HH:mm'),
      monthlySalary: values.monthlySalary,
    });
  };

  const onFinishFailedMoYu: FormProps<MoYuTimeType>['onFinishFailed'] = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };
  /**
   * 退出登录，并且将当前的 url 保存
   */
  const loginOut = async () => {
    await userLogoutUsingPost();
  };

  const getPlatformUsername = (platformName: string) => {
    return currentUser?.bindPlatforms?.find((platformItem: { platform: string; }) => platformItem.platform === platformName)?.nickname || '';
  };

  const handleUnbind = (platform: string, nickname: string) => {
    Modal.confirm({
      title: '确认解绑',
      content: `确定要解绑 ${platform} 账号 "${nickname}" 吗？`,
      okText: '确认解绑',
      cancelText: '取消',
      okButtonProps: {
        danger: true
      },
      async onOk() {
        try {
          const res = await unbindPlatform(platform.toLowerCase());
          if (res.code === 0) {
            message.success('解绑成功');
            // 更新用户信息
            const userInfo = await getLoginUserUsingGet();
            if (userInfo.data) {
              setInitialState((s) => ({
                ...s,
                currentUser: userInfo.data,
              }));
            }
          } else {
            message.error('解绑失败，请稍后重试');
          }
        } catch (error: any) {
          message.error(`解绑失败：${error.message}`);
        }
      },
    });
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMoneyOpen, setIsMoneyOpen] = useState(false);

  const {initialState, setInitialState} = useModel('@@initialState');
  const {currentUser}: any = initialState || {};

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editProfileForm] = Form.useForm();
  const [siteConfigForm] = Form.useForm();
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [previewAvatar, setPreviewAvatar] = useState<string>('');

  // 默认头像列表
  const defaultAvatars = [
    'https://img2.baidu.com/it/u=3757990320,1019789652&fm=253&fmt=auto&app=120&f=JPEG?w=800&h=800',
    'https://img0.baidu.com/it/u=2218138162,227420128&fm=253&fmt=auto&app=138&f=JPEG?w=607&h=607',
    'https://img2.baidu.com/it/u=2695396371,803611298&fm=253&fmt=auto&app=120&f=JPEG?w=800&h=800',
    'https://img1.baidu.com/it/u=648366534,1664954226&fm=253&fmt=auto&app=120&f=JPEG?w=800&h=800',
    'https://img0.baidu.com/it/u=925856458,2747676088&fm=253&fmt=auto?w=800&h=800',
  ];

  // 网站默认图标列表
  const defaultSiteIcons = [
    'https://www.baidu.com/favicon.ico',
    'https://g.csdnimg.cn/static/logo/favicon32.ico',
  ];

  const handleEditProfile = async (values: any) => {
    try {
      // 如果选择了默认头像，使用选中的头像
      const userAvatar = selectedAvatar || values.userAvatar;
      const res = await updateMyUserUsingPost({
        ...values,
        userAvatar,
      });
      if (res.code === 0) {
        message.success('修改信息成功！');
        setIsEditProfileOpen(false);
        // 更新当前用户信息
        setInitialState((s) => ({
          ...s, 
          currentUser: {
            ...currentUser, 
            ...values, 
            userAvatar,
          }
        }));
      }
    } catch (error: any) {
      message.error(`修改失败，${error.message}`);
    }
  };

  const [isSiteConfigOpen, setIsSiteConfigOpen] = useState(false);
  const [siteConfig, setSiteConfig] = useState(() => {
    const savedConfig = localStorage.getItem('siteConfig');
    return savedConfig ? JSON.parse(savedConfig) : {
      siteName: '摸鱼岛',
      siteIcon: 'https://pic.rmb.bdstatic.com/bjh/news/c0afb3b38710698974ac970434e8eb71.png'
    };
  });

  // 添加默认网站配置
  const defaultSiteConfig = {
    siteName: '摸鱼岛',
    siteIcon: 'https://pic.rmb.bdstatic.com/bjh/news/c0afb3b38710698974ac970434e8eb71.png'
  };

  const [isMoneyVisible, setIsMoneyVisible] = useState(() => {
    const savedVisibility = localStorage.getItem('moneyButtonVisibility');
    return savedVisibility === null ? true : savedVisibility === 'true';
  });

  const [holidayInfo, setHolidayInfo] = useState<{
    date: string;
    days: number;
    holiday: boolean;
    name: string;
  } | null>(null);

  // 假期倒计时样式
  const holidayTooltipStyle = useEmotionCss(() => ({
    '.ant-tooltip-inner': {
      background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(255, 154, 158, 0.2)',
      minWidth: '200px'
    },
    '.ant-tooltip-arrow': {
      display: 'none'
    }
  }));

  // 获取假期信息
  const fetchHolidayInfo = async () => {
    try {
      const response = await fetch('https://moyuapi.codebug.icu/holiday/next');
      const data = await response.json();
      if (data.code === 200) {
        setHolidayInfo(data.data);
      }
    } catch (error) {
      console.error('获取假期信息失败:', error);
    }
  };

  // 在组件加载时获取假期信息
  useEffect(() => {
    fetchHolidayInfo();
  }, []);

  // 计算倒计时和已赚取金额
  useEffect(() => {
    if (moYuData?.endTime && moYuData?.startTime) {
      const interval = setInterval(() => {
        const now = moment();
        const lunchTime = moment(moYuData.lunchTime);
        const endTime = moment(moYuData.endTime);

        // 计算工作日每小时收入
        const workdaysInMonth = 22; // 假设每月22个工作日
        const workHoursPerDay = moment(moYuData.endTime).diff(moment(moYuData.startTime), 'hours');
        const hourlyRate = moYuData.monthlySalary ? (moYuData.monthlySalary / (workdaysInMonth * workHoursPerDay)) : 0;

        // 计算已工作时长和收入
        const startTime = moment(moYuData.startTime);
        const workedDuration = moment.duration(
          now.isAfter(endTime) ? endTime.diff(startTime) : now.diff(startTime)
        );
        const earnedAmount = hourlyRate * workedDuration.asHours();

        // 检查是否在午餐时间前后120分钟内，且未超过午餐时间1小时
        const isNearLunch = Math.abs(now.diff(lunchTime, 'minutes')) <= 120
          && now.diff(lunchTime, 'minutes') <= 60;

        if (isNearLunch) {
          // 午餐倒计时
          const duration = moment.duration(lunchTime.diff(now));
          const hours = Math.max(0, duration.hours());
          const minutes = Math.max(0, duration.minutes());
          const seconds = Math.max(0, duration.seconds());

          // 如果所有时间都是0或负数，显示"已到午餐时间"
          if (hours <= 0 && minutes <= 0 && seconds <= 0) {
            setTimeInfo({
              type: 'lunch',
              timeRemaining: '已到午餐时间',
              earnedAmount: moYuData.monthlySalary ? earnedAmount : undefined
            });
          } else {
            setTimeInfo({
              type: 'lunch',
              timeRemaining: `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
              earnedAmount: moYuData.monthlySalary ? earnedAmount : undefined
            });
          }
        } else {
          // 下班倒计时
          const duration = moment.duration(endTime.diff(now));
          const hours = Math.max(0, duration.hours());
          const minutes = Math.max(0, duration.minutes());
          const seconds = Math.max(0, duration.seconds());

          // 如果所有时间都是0或负数，显示"已到下班时间"
          if (hours <= 0 && minutes <= 0 && seconds <= 0) {
            setTimeInfo({
              type: 'work',
              timeRemaining: '已到下班时间',
              earnedAmount: moYuData.monthlySalary ? earnedAmount : undefined
            });
          } else {
            setTimeInfo({
              type: 'work',
              timeRemaining: `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
              earnedAmount: moYuData.monthlySalary ? earnedAmount : undefined
            });
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [moYuData]);

  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [isCheckinAnimating, setIsCheckinAnimating] = useState(false);

  // 检查今日是否已签到
  useEffect(() => {
    if (currentUser?.lastSignInDate) {
      const lastSignIn = moment(currentUser.lastSignInDate);
      const today = moment().startOf('day');
      setHasCheckedIn(lastSignIn.isSame(today, 'day'));
    }
  }, [currentUser?.lastSignInDate]);

  // 处理签到
  const handleCheckin = async () => {
    if (hasCheckedIn) {
      message.info('今天已经摸鱼打卡啦！明天继续加油 🐟');
      return;
    }

    try {
      setIsCheckinAnimating(true);
      const res = await signInUsingPost();
      if (res.code === 0) {
        setHasCheckedIn(true);
        message.success('摸鱼打卡成功！获得 10 积分 🎣');
        // 更新用户信息
        const userInfo = await getLoginUserUsingGet();
        if (userInfo.data) {
          setInitialState((s) => ({
            ...s,
            currentUser: userInfo.data,
          }));
        }
      } else {
        message.error('签到失败，请稍后重试');
      }
    } catch (error) {
      message.error('签到失败，请稍后重试');
    } finally {
      setIsCheckinAnimating(false);
    }
  };

  // VIP 标识动画样式
  const vipBadgeStyle = useEmotionCss(() => ({
    position: 'absolute',
    top: -6,
    right: -8,
    fontSize: '12px',
    padding: '1px 4px',
    borderRadius: '4px',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffb700 100%)',
    color: '#873800',
    fontWeight: 'bold',
    lineHeight: 1,
    animation: 'vipFloat 3s ease-in-out infinite',
    zIndex: 1,
    transformOrigin: 'center bottom',
    boxShadow: '0 1px 2px rgba(255, 215, 0, 0.3)',
    '@keyframes vipFloat': {
      '0%, 100%': {
        transform: 'translateY(0)',
        filter: 'drop-shadow(0 1px 2px rgba(255, 215, 0, 0.4))',
      },
      '50%': {
        transform: 'translateY(-2px)',
        filter: 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.6))',
      }
    },
    '&:hover': {
      animation: 'vipPop 0.3s ease-in-out forwards',
    },
    '@keyframes vipPop': {
      '0%': {
        transform: 'scale(1)',
      },
      '50%': {
        transform: 'scale(1.1)',
      },
      '100%': {
        transform: 'scale(1.05)',
      }
    }
  }));

  const [isBossKeyOpen, setIsBossKeyOpen] = useState(false);
  const [bossKeyConfig, setBossKeyConfig] = useState(() => {
    const savedConfig = localStorage.getItem('bossKeyConfig');
    return savedConfig ? JSON.parse(savedConfig) : {
      key: 'F2',
      redirectUrl: 'https://www.deepseek.com/'
    };
  });

  // 添加键盘事件监听
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === bossKeyConfig.key) {
        window.location.href = bossKeyConfig.redirectUrl;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [bossKeyConfig]);

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: RcFile) => {
    try {
      setUploading(true);
      const res = await uploadFileByMinioUsingPost(
        { biz: 'user_avatar' },  // 参数
        {},  // body 参数
        file,  // 文件参数
        {  // 其他选项
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!res.data) {
        throw new Error('图片上传失败');
      }

      return res.data;
    } catch (error) {
      message.error(`上传失败：${error}`);
      return '';
    } finally {
      setUploading(false);
    }
  };

  // 签到按钮的样式
  const checkinButtonStyle = useEmotionCss(() => ({
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '16px',
    background: hasCheckedIn
      ? 'linear-gradient(135deg, #40a9ff 0%, #1890ff 100%)'
      : 'linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)',
    boxShadow: hasCheckedIn
      ? '0 2px 4px rgba(24, 144, 255, 0.2)'
      : '0 1px 3px rgba(0, 0, 0, 0.05)',
    border: `1px solid ${hasCheckedIn ? '#1890ff' : '#e8e8e8'}`,
    '&:hover': {
      transform: 'scale(1.03)',
      background: hasCheckedIn
        ? 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)'
        : 'linear-gradient(135deg, #f0f0f0 0%, #f5f5f5 100%)',
      boxShadow: hasCheckedIn
        ? '0 3px 6px rgba(24, 144, 255, 0.3)'
        : '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    '.checkin-emoji': {
      fontSize: '16px',
      marginRight: '4px',
      transition: 'all 0.5s ease',
      transform: isCheckinAnimating ? 'scale(1.2) rotate(360deg)' : 'scale(1)',
      display: 'inline-flex',
      alignItems: 'center',
      filter: hasCheckedIn ? 'brightness(1.1)' : 'none',
    },
    '.checkin-text': {
      fontSize: '13px',
      fontWeight: 500,
      color: hasCheckedIn ? '#ffffff' : '#595959',
      textShadow: hasCheckedIn ? '0 1px 1px rgba(0, 0, 0, 0.1)' : 'none',
    },
  }));

  const [isMusicVisible, setIsMusicVisible] = useState(() => {
    const savedVisibility = localStorage.getItem('musicPlayerVisibility');
    return savedVisibility === null ? true : savedVisibility === 'true';
  });

  // 添加标签页模式按钮样式
  const tabModeButtonStyle = useEmotionCss(() => ({
    color: '#ffffff',
    fontSize: '16px',
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 1000,
    background: '#ffa768',
    border: 'none',
    padding: '8px',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(255, 167, 104, 0.3)',
    transition: 'all 0.3s ease',
    opacity: 0,
    transform: 'translateY(-20px)',
    animation: 'slideIn 0.5s ease forwards',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(255, 167, 104, 0.4)',
      background: '#ffa768',
      color: '#ffffff',
    },
    '&:active': {
      background: '#ffa768',
      color: '#ffffff',
    },
    '& .anticon': {
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    '@keyframes slideIn': {
      '0%': {
        opacity: 0,
        transform: 'translateY(-20px)',
      },
      '100%': {
        opacity: 1,
        transform: 'translateY(0)',
      }
    }
  }));

  const [musicPlayer, setMusicPlayer] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    if (isMusicVisible) {
      import('@/components/MusicPlayer').then(module => {
        setMusicPlayer(() => module.default);
      });
    } else {
      setMusicPlayer(null);
    }

    // 添加清理函数
    return () => {
      setMusicPlayer(null);
      // 移除所有音乐播放器相关的DOM元素
      const elementsToRemove = [
        '.music-player-container',
        '#myhkTips',
        '.myhk-player',
        '.myhk-player-container',
        '.myhk-player-controls',
        '.myhk-player-progress',
        '.myhk-player-volume',
        '.myhk-player-playlist',
        '.switch-player'  // 添加 switch-player 元素
      ];
      
      elementsToRemove.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.remove();
        });
      });

      // 移除可能添加的全局样式
      const styleId = 'myhk-player-styles';
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [isMusicVisible]);

  const menuItems = [
    ...(menu
      ? [
        {
          key: 'center',
          icon: <UserOutlined/>,
          label: '个人中心',
        },
        {
          key: 'settings',
          icon: <SettingOutlined/>,
          label: '个人设置',
        },
        {
          type: 'divider' as const,
        },
      ]
      : []),
    {
      key: 'edit',
      icon: <EditOutlined/>,
      label: '修改信息',
    },
    {
      key: 'bossKey',
      icon: <LockOutlined/>,
      label: '老板键设置',
    },
    {
      key: 'siteConfig',
      icon: <SettingOutlined/>,
      label: '网站设置',
    },
    {
      key: 'toggleMoney',
      icon: <SettingOutlined/>,
      label: isMoneyVisible ? '隐藏工作时间' : '显示工作时间',
    },
    {
      key: 'toggleMusic',
      icon: <SettingOutlined/>,
      label: isMusicVisible ? '隐藏音乐播放器' : '显示音乐播放器',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined/>,
      label: '退出登录',
    },
  ];

  // @ts-ignore
  const onMenuClick = useCallback(
    (event: MenuInfo) => {
      const {key} = event;
      if (key === 'logout') {
        flushSync(() => {
          setInitialState((s) => ({...s, currentUser: undefined}));
        });
        loginOut();
        return;
      }
      if (key === 'edit') {
        setIsEditProfileOpen(true);
        // 设置初始头像预览
        if (currentUser?.userAvatar && !defaultAvatars.includes(currentUser.userAvatar)) {
          setPreviewAvatar(currentUser.userAvatar);
        }
        return;
      }
      if (key === 'bossKey') {
        setIsBossKeyOpen(true);
        return;
      }
      if (key === 'siteConfig') {
        setIsSiteConfigOpen(true);
        return;
      }
      if (key === 'toggleMoney') {
        const newValue = !isMoneyVisible;
        setIsMoneyVisible(newValue);
        localStorage.setItem('moneyButtonVisibility', newValue.toString());
        return;
      }
      if (key === 'toggleMusic') {
        const newValue = !isMusicVisible;
        setIsMusicVisible(newValue);
        localStorage.setItem('musicPlayerVisibility', newValue.toString());
        return;
      }
      history.push(`/account/${key}`);
    },
    [setInitialState, currentUser?.userAvatar, isMoneyVisible, isMusicVisible],
  );

  if (!currentUser) {
    return (
      <>
        <LoginRegister
          isModalOpen={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
        />

        <Button type="primary" shape="round" onClick={() => {
          setIsModalOpen(true);
        }}>
          登录
        </Button>

        <div className="App">
          {/* 其他内容 */}
          <Modal title="工作时间设定" footer={null} open={isMoneyOpen} onCancel={() => {
            setIsMoneyOpen(false);
          }}>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100%"}}>
              <Form
                name="basic"
                initialValues={{
                  startTime: moYuData.startTime,
                  endTime: moYuData.endTime,
                  lunchTime: moYuData.lunchTime,
                  monthlySalary: moYuData.monthlySalary,
                }}
                onFinish={onFinishMoYu}
                onFinishFailed={onFinishFailedMoYu}
                autoComplete="off"
              >
                <Form.Item label="上班时间" name="startTime">
                  <TimePicker format="HH:mm"/>
                </Form.Item>

                <Form.Item label="下班时间" name="endTime">
                  <TimePicker format="HH:mm"/>
                </Form.Item>

                <Form.Item label="午饭时间" name="lunchTime">
                  <TimePicker format="HH:mm"/>
                </Form.Item>

                <Form.Item label="月薪" name="monthlySalary">
                  <Input placeholder="选填，不填则不显示收入" type="number"/>
                </Form.Item>

                <Form.Item label="显示状态">
                  <Switch
                    checked={isMoneyVisible}
                    onChange={(checked) => {
                      setIsMoneyVisible(checked);
                      localStorage.setItem('moneyButtonVisibility', checked.toString());
                    }}
                    checkedChildren="显示"
                    unCheckedChildren="隐藏"
                  />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" onClick={() => {
                    setIsMoneyOpen(false)
                  }}>
                    保存
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </Modal>
          {isMoneyVisible && (
            <Tooltip
              title={
                holidayInfo ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#fff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      {holidayInfo.name}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#fff',
                      opacity: 0.9
                    }}>
                      {moment(holidayInfo.date).format('YYYY年MM月DD日')}
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#fff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      还有 {moment(holidayInfo.date).diff(moment(), 'days')} 天 🎉
                    </div>
                  </div>
                ) : '加载中...'
              }
              placement="top"
              overlayClassName={holidayTooltipStyle}
            >
              <Button
                type="primary"
                shape="circle"
                onClick={() => {
                  setIsMoneyOpen(true);
                }}
                className="money-button"
              >
                <div className="money-button-content">
                  <div>
                    {timeInfo.type === 'lunch' ? '🍱' : '🧑‍💻'}
                  </div>
                  <div>
                    {timeInfo.type === 'lunch' ?
                      `午餐: ${timeInfo.timeRemaining}` :
                      `下班: ${timeInfo.timeRemaining}`
                  }
                  </div>
                  {timeInfo.earnedAmount !== undefined && (
                    <div>💰：{timeInfo.earnedAmount.toFixed(2)}</div>
                  )}
                </div>
              </Button>
            </Tooltip>
          )}
        </div>
      </>
    );
  }

  return (
    <div style={{display: 'flex', alignItems: 'center'}}>
      <Tooltip title="跳转到标签模式" placement="left">
        <Button
          type="text"
          icon={<SwapOutlined />}
          onClick={() => history.push('/home')}
          className={tabModeButtonStyle}
          style={{ 
            background: '#ffa768',
            borderRadius: '50%',
            padding: 0,
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
      </Tooltip>

      <HeaderDropdown
        menu={{
          selectedKeys: [],
          onClick: onMenuClick,
          items: menuItems,
        }}
      >
        <Space>
          <div style={{position: 'relative'}}>
            {currentUser?.userAvatar ? (
              <div style={{position: 'relative'}}>
                <Avatar size="default" src={currentUser?.userAvatar}/>
                {currentUser?.avatarFramerUrl && (
                  <img
                    src={currentUser.avatarFramerUrl}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      left: '-8px',
                      width: 'calc(100% + 16px)',
                      height: 'calc(100% + 16px)',
                      pointerEvents: 'none'
                    }}
                    alt="头像框"
                  />
                )}
              </div>
            ) : (
              <Avatar size="default" icon={<UserOutlined/>}/>
            )}
          </div>
          <Tooltip title={currentUser?.userName ?? '无名'}>
            <span style={{
              maxWidth: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              verticalAlign: 'middle'
            }}>
              {currentUser?.userName?.length > 5 ? `${currentUser.userName.slice(0, 5)}...` : (currentUser?.userName ?? '无名')}
            </span>
          </Tooltip>
        </Space>
      </HeaderDropdown>

      {musicPlayer && React.createElement(musicPlayer, { playerId: "1742366149119", key: isMusicVisible.toString() })}

      {/* 添加修改信息的 Modal */}
      <Modal
        title="修改个人信息"
        open={isEditProfileOpen}
        onCancel={() => {
          setIsEditProfileOpen(false);
          setPreviewAvatar('');
          setSelectedAvatar('');
          // 重置表单
          editProfileForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editProfileForm}
          onFinish={handleEditProfile}
          initialValues={{
            userName: currentUser?.userName,
            userProfile: currentUser?.userProfile,
            userAvatar: !defaultAvatars.includes(currentUser?.userAvatar || '') ? currentUser?.userAvatar : '',
          }}
        >
          <Form.Item
            name="userName"
            label="用户名"
            rules={[
              {required: true, message: '请输入用户名！'},
              {max: 10, message: '用户名不能超过10个字符！'},
            ]}
          >
            <Input maxLength={10} showCount placeholder="请输入用户名"/>
          </Form.Item>

          <Form.Item
            label="头像选择"
            name="userAvatar"
            help="可以上传图片，输入在线图片地址，或者选择下方默认头像"
          >
            <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={async (file) => {
                  const url = await handleUpload(file);
                  if (url) {
                    setPreviewAvatar(url as any);
                    editProfileForm.setFieldValue('userAvatar', url);
                  }
                  return false;
                }}
              >
                <Button icon={<UploadOutlined/>} loading={uploading}>
                  上传头像
                </Button>
              </Upload>
              <Input
                placeholder="请输入头像地址（选填）"
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedAvatar('');
                  setPreviewAvatar(value);
                  editProfileForm.setFieldValue('userAvatar', value);
                }}
                value={editProfileForm.getFieldValue('userAvatar')}
                style={{flex: 1}}
              />
              {(previewAvatar || editProfileForm.getFieldValue('userAvatar')) && (
                <div style={{
                  marginLeft: '8px',
                  padding: '4px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px'
                }}>
                  <Avatar
                    src={previewAvatar || editProfileForm.getFieldValue('userAvatar')}
                    size={64}
                  />
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item label="默认头像">
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              {defaultAvatars.map((avatar, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedAvatar(avatar);
                    setPreviewAvatar('');
                    editProfileForm.setFieldValue('userAvatar', '');
                  }}
                  style={{
                    cursor: 'pointer',
                    border: (selectedAvatar === avatar || currentUser?.userAvatar === avatar) ? '2px solid #1890ff' : '2px solid transparent',
                    borderRadius: '4px',
                    padding: '4px',
                  }}
                >
                  <Avatar src={avatar} size={64}/>
                </div>
              ))}
            </div>
          </Form.Item>

          <Form.Item
            name="userProfile"
            label="个人简介"
            rules={[
              {max: 100, message: '个人简介不能超过100个字符！'}
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={100}
              showCount
              placeholder="请输入不超过100个字符的个人简介"
            />
          </Form.Item>

          <Form.Item label="社交账号绑定">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  {getPlatformUsername("github") ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <GithubOutlined style={{ fontSize: '16px' }} />
                     <span>{getPlatformUsername("github")}</span>
                      {/* <Button 
                        type="text" 
                        danger
                        icon={<LogoutOutlined />}
                        onClick={() => handleUnbind('github', getPlatformUsername("github"))}
                      >
                        解绑
                      </Button> */}
                    </div>
                  ) : (
                    <Button 
                      type="default"
                      icon={<GithubOutlined />}
                      onClick={async () => {
                        const res = await renderAuthUsingGet('github');
                        location.href = res.data;
                      }}
                    >
                      绑定 GitHub
                    </Button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  {getPlatformUsername("gitee") ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <img 
                        src="https://gitee.com/favicon.ico" 
                        alt="Gitee" 
                        style={{ 
                          width: '16px', 
                          height: '16px',
                          objectFit: 'contain'
                        }} 
                      />
                      <span>{getPlatformUsername("gitee")}</span>
                      {/* <Button 
                        type="text" 
                        danger
                        icon={<LogoutOutlined />}
                        onClick={() => handleUnbind('gitee', getPlatformUsername("gitee"))}
                      >
                        解绑
                      </Button> */}
                    </div>
                  ) : (
                    <Button 
                      type="default"
                      icon={<img 
                        src="https://gitee.com/favicon.ico" 
                        alt="Gitee" 
                        style={{ width: '14px', height: '14px', marginRight: '4px' }} 
                      />}
                      onClick={async () => {
                        const res = await renderAuthUsingGet('gitee');
                        location.href = res.data;
                      }}
                    >
                      绑定 Gitee
                    </Button>
                  )}
                </div>
              </div>
            </Space>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Tooltip title={hasCheckedIn ? '今日已完成摸鱼打卡' : '点击摸鱼打卡'}>
        <div
          className={checkinButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            handleCheckin();
          }}
          style={{marginLeft: 24}}
        >
          <span className="checkin-emoji">
            {hasCheckedIn ? '🐟' : '🎣'}
          </span>
          <span className="checkin-text">
            {hasCheckedIn ? '已打卡' : '摸鱼'}
          </span>
        </div>
      </Tooltip>
      <div className="App" style={{marginLeft: 'auto'}}>
        {/* 其他内容 */}
        <Modal title="工作时间设定" footer={null} open={isMoneyOpen} onCancel={() => {
          setIsMoneyOpen(false);
        }}>
          <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100%"}}>
            <Form
              name="basic"
              initialValues={{
                startTime: moYuData.startTime,
                endTime: moYuData.endTime,
                lunchTime: moYuData.lunchTime,
                monthlySalary: moYuData.monthlySalary,
              }}
              onFinish={onFinishMoYu}
              onFinishFailed={onFinishFailedMoYu}
              autoComplete="off"
            >
              <Form.Item label="上班时间" name="startTime">
                <TimePicker format="HH:mm"/>
              </Form.Item>

              <Form.Item label="下班时间" name="endTime">
                <TimePicker format="HH:mm"/>
              </Form.Item>

              <Form.Item label="午饭时间" name="lunchTime">
                <TimePicker format="HH:mm"/>
              </Form.Item>

              <Form.Item label="月薪" name="monthlySalary">
                <Input placeholder="选填，不填则不显示收入" type="number"/>
              </Form.Item>

              <Form.Item label="显示状态">
                <Switch
                  checked={isMoneyVisible}
                  onChange={(checked) => {
                    setIsMoneyVisible(checked);
                    localStorage.setItem('moneyButtonVisibility', checked.toString());
                  }}
                  checkedChildren="显示"
                  unCheckedChildren="隐藏"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" onClick={() => {
                  setIsMoneyOpen(false)
                }}>
                  保存
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Modal>
        {isMoneyVisible && (
          <Tooltip
            title={
              holidayInfo ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    {holidayInfo.name}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#fff',
                    opacity: 0.9
                  }}>
                    {moment(holidayInfo.date).format('YYYY年MM月DD日')}
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    还有 {moment(holidayInfo.date).diff(moment(), 'days')} 天 🎉
                  </div>
                </div>
              ) : '加载中...'
            }
            placement="top"
            overlayClassName={holidayTooltipStyle}
          >
            <Button
              type="primary"
              shape="circle"
              onClick={() => {
                setIsMoneyOpen(true);
              }}
              className="money-button"
            >
              <div className="money-button-content">
                <div>
                  {timeInfo.type === 'lunch' ? '🍱' : '🧑‍💻'}
                </div>
                <div>
                  {timeInfo.type === 'lunch' ?
                    `午餐: ${timeInfo.timeRemaining}` :
                    `下班: ${timeInfo.timeRemaining}`
                  }
                </div>
                {timeInfo.earnedAmount !== undefined && (
                  <div>💰：{timeInfo.earnedAmount.toFixed(2)}</div>
                )}
              </div>
            </Button>
          </Tooltip>
        )}
      </div>

      {/* 添加老板键设置Modal */}
      <Modal
        title="老板键设置"
        open={isBossKeyOpen}
        onCancel={() => setIsBossKeyOpen(false)}
        footer={null}
      >
        <Form
          initialValues={bossKeyConfig}
          onFinish={(values) => {
            setBossKeyConfig(values);
            localStorage.setItem('bossKeyConfig', JSON.stringify(values));
            message.success('老板键设置已保存');
            setIsBossKeyOpen(false);
          }}
        >
          <Form.Item
            label="触发按键"
            name="key"
            rules={[{required: true, message: '请设置触发按键！'}]}
          >
            <Select>
              <Select.Option value="F1">F1键</Select.Option>
              <Select.Option value="F2">F2键</Select.Option>
              <Select.Option value="F3">F3键</Select.Option>
              <Select.Option value="F4">F4键</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="跳转网址"
            name="redirectUrl"
            rules={[
              {required: true, message: '请输入跳转网址！'},
              {type: 'url', message: '请输入有效的网址！'}
            ]}
          >
            <Input placeholder="请输入紧急情况下要跳转的网址"/>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存设置
              </Button>
              <Button onClick={() => setIsBossKeyOpen(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="网站设置"
        open={isSiteConfigOpen}
        onCancel={() => setIsSiteConfigOpen(false)}
        footer={null}
      >
        <Form
          form={siteConfigForm}
          initialValues={siteConfig}
          onFinish={(values) => {
            setSiteConfig(values);
            localStorage.setItem('siteConfig', JSON.stringify(values));
            // 更新网站图标
            const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (link) {
              link.href = values.siteIcon;
            } else {
              const newLink = document.createElement('link');
              newLink.rel = 'icon';
              newLink.href = values.siteIcon;
              document.head.appendChild(newLink);
            }
            // 更新网站标题
            document.title = values.siteName;
            message.success('网站设置已保存');
            setIsSiteConfigOpen(false);
          }}
        >
          <Form.Item
            label="网站名称"
            name="siteName"
            rules={[{required: true, message: '请输入网站名称！'}]}
          >
            <Input placeholder="请输入网站名称"/>
          </Form.Item>

          <Form.Item
            label="网站图标"
            name="siteIcon"
            help="可以上传图片，输入在线图片地址，或者选择下方默认图标"
          >
            <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={async (file) => {
                  const url = await handleUpload(file);
                  if (url) {
                    siteConfigForm.setFieldValue('siteIcon', url);
                  }
                  return false;
                }}
              >
                <Button icon={<UploadOutlined/>} loading={uploading}>
                  上传图标
                </Button>
              </Upload>
              <Input
                placeholder="请输入图标地址（选填）"
                onChange={(e) => {
                  const value = e.target.value;
                  siteConfigForm.setFieldValue('siteIcon', value);
                }}
                value={siteConfigForm.getFieldValue('siteIcon')}
                style={{flex: 1}}
              />
              {siteConfigForm.getFieldValue('siteIcon') && (
                <div style={{
                  marginLeft: '8px',
                  padding: '4px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px'
                }}>
                  <Avatar
                    src={siteConfigForm.getFieldValue('siteIcon')}
                    size={64}
                  />
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item label="默认图标">
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              {defaultSiteIcons.map((icon, index) => (
                <div
                  key={index}
                  onClick={() => {
                    siteConfigForm.setFieldValue('siteIcon', icon);
                  }}
                  style={{
                    cursor: 'pointer',
                    border: siteConfigForm.getFieldValue('siteIcon') === icon ? '2px solid #1890ff' : '2px solid transparent',
                    borderRadius: '4px',
                    padding: '4px',
                  }}
                >
                  <Avatar src={icon} size={64}/>
                </div>
              ))}
            </div>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存设置
              </Button>
              <Button onClick={() => setIsSiteConfigOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={() => {
                  // 重置为默认配置
                  siteConfigForm.setFieldsValue(defaultSiteConfig);
                  setSiteConfig(defaultSiteConfig);
                  localStorage.setItem('siteConfig', JSON.stringify(defaultSiteConfig));
                  
                  // 更新网站图标
                  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
                  if (link) {
                    link.href = defaultSiteConfig.siteIcon;
                  } else {
                    const newLink = document.createElement('link');
                    newLink.rel = 'icon';
                    newLink.href = defaultSiteConfig.siteIcon;
                    document.head.appendChild(newLink);
                  }
                  
                  // 更新网站标题
                  document.title = defaultSiteConfig.siteName;
                  message.success('网站设置已重置为默认样式');
                }}
              >
                重置为默认样式
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
};

export const AvatarName = () => {
};
