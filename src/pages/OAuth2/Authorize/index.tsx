import { authorizeUsingGet } from '@/services/backend/oAuth2Controller';
import { getAppByClientIdUsingGet } from '@/services/backend/fishAuthController';
import { getLoginUserUsingGet } from '@/services/backend/userController';
import {
  DownOutlined,
  GlobalOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import { Avatar, Button, message, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import styles from './index.less';

const OAuth2AuthorizePage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<API.LoginUserVO | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scopeExpanded, setScopeExpanded] = useState(false);
  const [appInfo, setAppInfo] = useState<API.FishAuthVO | null>(null);
  const [appLoading, setAppLoading] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const clientId = searchParams.get('client_id') || '';
  const redirectUri = searchParams.get('redirect_uri') || '';
  const responseType = searchParams.get('response_type') || 'code';
  const scope = searchParams.get('scope') || 'read';
  const state = searchParams.get('state') || '';

  // 直接调用接口判断登录状态，避免依赖 initialState 导致首次登录后闪烁跳转
  useEffect(() => {
    if (!clientId || !redirectUri) {
      message.error('缺少必要的授权参数');
      return;
    }
    getLoginUserUsingGet()
      .then((res) => {
        if (res?.code === 0 && res.data) {
          setCurrentUser(res.data as API.LoginUserVO);
          // 加载应用公开信息
          setAppLoading(true);
          getAppByClientIdUsingGet({ clientId })
            .then((appRes) => {
              if (appRes?.code === 0 && appRes.data) {
                setAppInfo(appRes.data);
              }
            })
            .finally(() => setAppLoading(false));
        } else {
          const returnPath = window.location.pathname + window.location.search;
          history.push(`/user/login?redirect=${encodeURIComponent(returnPath)}`);
        }
      })
      .catch(() => {
        const returnPath = window.location.pathname + window.location.search;
        history.push(`/user/login?redirect=${encodeURIComponent(returnPath)}`);
      })
      .finally(() => setAuthChecked(true));
  }, [clientId, redirectUri]);

  const handleAllow = async () => {
    if (!clientId || !redirectUri) {
      message.error('缺少必要的授权参数');
      return;
    }
    setLoading(true);
    try {
      const res = await authorizeUsingGet(
        {
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          scope,
          state: state || undefined,
        },
        { skipErrorHandler: true },
      );
      // 拦截器解包后 res 即为 data 字段，后端直接返回重定向 URL 字符串
      const redirectUrl = typeof res === 'string' ? res : res?.data ?? res;
      if (typeof redirectUrl === 'string' && redirectUrl.startsWith('http')) {
        window.location.href = redirectUrl;
      } else {
        message.error('授权失败，未获取到重定向地址');
      }
    } catch (error: any) {
      message.error(error?.message || '授权请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    history.push('/');
  };

  return (
    <div className={styles.container}>
      {!authChecked ? (
        <Spin size="large" style={{ margin: 'auto' }} />
      ) : (
        <>
          {/* 锁图标 */}
          <div className={styles.lockIcon}>
            <LockOutlined />
          </div>

          {/* 应用名称 */}
          <h1 className={styles.appName}>{appInfo?.appName || clientId || '第三方应用'}</h1>
          <p className={styles.subTitle}>请求访问你的摸鱼岛账户</p>

          {/* 当前用户信息卡片 */}
          <div className={styles.userCard}>
            <Avatar
              src={currentUser?.userAvatar}
              size={40}
              icon={<UserOutlined />}
              className={styles.avatar}
            />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{currentUser?.userName || '未登录'}</span>
              <span className={styles.userHandle}>以 @{currentUser?.userName} 的身份授权</span>
            </div>
          </div>

          {/* 应用信息 + 权限卡片 */}
          <div className={styles.infoCard}>
            <Spin spinning={appLoading}>
              <p className={styles.sectionTitle}>应用信息</p>
              <div className={styles.infoItem}>
                <GlobalOutlined className={styles.infoIcon} />
                <span className={styles.infoLink}>{appInfo?.appWebsite || redirectUri || '-'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>○</span>
                <span className={styles.infoText}>{appInfo?.appName || clientId}</span>
              </div>
              {appInfo?.appDesc && (
                <div className={styles.infoItem}>
                  <SafetyCertificateOutlined className={styles.infoIcon} />
                  <span className={styles.infoText}>{appInfo.appDesc}</span>
                </div>
              )}
            </Spin>

            <div className={styles.divider} />

            <p className={styles.sectionTitle}>将获取以下权限</p>
            <div className={styles.scopeItem} onClick={() => setScopeExpanded(!scopeExpanded)}>
              <UserOutlined className={styles.scopeIcon} />
              <span className={styles.scopeText}>
                获取你的用户<strong>基本信息</strong>
              </span>
              <span className={`${styles.arrowIcon} ${scopeExpanded ? styles.arrowIconExpanded : ''}`}>
                <DownOutlined />
              </span>
            </div>
            {scopeExpanded && (
              <div className={styles.scopeDetail}>
                <div>· 用户名</div>
                <div>· 头像</div>
                <div>· 用户 ID</div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className={styles.btnWrap}>
            <Spin spinning={loading}>
              <Button
                type="primary"
                block
                size="large"
                className={styles.allowBtn}
                onClick={handleAllow}
                disabled={!currentUser}
              >
                允许
              </Button>
            </Spin>
            <Button
              block
              size="large"
              className={styles.denyBtn}
              onClick={handleDeny}
            >
              拒绝
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default OAuth2AuthorizePage;
