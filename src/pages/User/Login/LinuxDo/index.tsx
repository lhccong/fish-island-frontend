import React, { useEffect, useState } from 'react';
import { useModel, history } from '@umijs/max';
import { message, Spin, Result } from 'antd';
import { linuxDoCallbackUsingGet } from '@/services/backend/userController';
import styles from './index.less';

const LinuxDoCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { initialState, setInitialState } = useModel('@@initialState');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 从URL获取参数
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code) {
          setError('缺少授权码，登录失败');
          setLoading(false);
          return;
        }

        // 调用后台接口获取用户信息
        const response = await linuxDoCallbackUsingGet({
          code,
          state: state || undefined,
        });

        if (response.code === 0 && response.data) {
          const result = response.data;
          
          // 存储token信息
          if (result.saTokenInfo) {
            localStorage.setItem('tokenName', result.saTokenInfo.tokenName as string);
            localStorage.setItem('tokenValue', result.saTokenInfo.tokenValue as string);
          }

          // 保存已登录用户信息到全局状态
          setInitialState({
            ...initialState,
            currentUser: result,
          });

          message.success('Linux Do 登录成功！');
          
          // 跳转到主页或重定向页面
          const redirectUrl = urlParams.get('redirect') || '/';
          history.push(redirectUrl);
        } else {
          setError(response.message || 'Linux Do 登录失败');
        }
      } catch (error: any) {
        console.error('Linux Do 登录回调处理失败:', error);
        setError(`登录失败: ${error.message || '未知错误'}`);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [initialState, setInitialState]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Spin size="large" />
          <div className={styles.loadingText}>正在处理 Linux Do 登录...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Result
          status="error"
          title="登录失败"
          subTitle={error}
          extra={[
            <a key="retry" href="/user/login">
              返回登录页
            </a>
          ]}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Result
        status="success"
        title="登录成功"
        subTitle="正在跳转到主页..."
      />
    </div>
  );
};

export default LinuxDoCallback;





