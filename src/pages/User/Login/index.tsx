import Footer from '@/components/Footer';
import { userLoginUsingPost, getLinuxDoAuthUrlUsingGet } from '@/services/backend/userController';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { Helmet, history, useModel } from '@umijs/max';
import { message, Tabs, Button } from 'antd';
import React, { useState } from 'react';
import Settings from '../../../../config/defaultSettings';
import {Link} from "umi";

// 此页面仅用于 /user/login 路径的登录功能，主注册逻辑位于 /components/RightContent/AvatarDropDown。
const Login: React.FC = () => {
  const [type, setType] = useState<string>('account');
  const { initialState, setInitialState } = useModel('@@initialState');
  const containerClassName = useEmotionCss(() => {
    return {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    };
  });

  const handleSubmit = async (values: API.UserLoginRequest) => {
    try {
      // 登录
      const res = await userLoginUsingPost({
        ...values,
      });
      if (res.code===0){
        const defaultLoginSuccessMessage = '登录成功！';
        const result = res.data as any
        localStorage.setItem('tokenName', result.saTokenInfo?.tokenName as string);
        localStorage.setItem('tokenValue', result.saTokenInfo?.tokenValue as string);
        message.success(defaultLoginSuccessMessage);
        // 保存已登录用户信息
        setInitialState({
          ...initialState,
          currentUser: res.data,
        });
        const urlParams = new URL(window.location.href).searchParams;
        history.push(urlParams.get('redirect') || '/');
      }
    } catch (error: any) {
      const defaultLoginFailureMessage = `登录失败，${error.message}`;
      message.error(defaultLoginFailureMessage);
    }
  };

  // LinuxDo 第三方登录
  const handleLinuxDoLogin = async () => {
    try {
      const res = await getLinuxDoAuthUrlUsingGet();
      if (res.code === 0 && res.data) {
        // 跳转到 LinuxDo 授权页面
        window.location.href = res.data;
      } else {
        message.error('获取 LinuxDo 授权链接失败');
      }
    } catch (error: any) {
      message.error(`LinuxDo 登录失败：${error.message}`);
    }
  };

  return (
    <div className={containerClassName}>
      <Helmet>
        <title>
          {'登录'}- {Settings.title}
        </title>
      </Helmet>
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" style={{ height: '100%' }} src="https://oss.cqbo.com/moyu/moyu.png" />}
          title="摸鱼岛"
          subTitle={'加入摸鱼岛一起来摸吧'}
          initialValues={{
            autoLogin: true,
          }}
          onFinish={async (values) => {
            await handleSubmit(values as API.UserLoginRequest);
          }}
        >
          <Tabs
            activeKey={type}
            onChange={setType}
            centered
            items={[
              {
                key: 'account',
                label: '账户密码登录',
              },
            ]}
          />
          {type === 'account' && (
            <>
              <ProFormText
                name="userAccount"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder={'请输入账号'}
                rules={[
                  {
                    required: true,
                    message: '账号是必填项！',
                  },
                ]}
              />
              <ProFormText.Password
                name="userPassword"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder={'请输入密码'}
                rules={[
                  {
                    required: true,
                    message: '密码是必填项！',
                  },
                ]}
              />
            </>
          )}

          <div
            style={{
              marginBottom: 24,
              textAlign: 'right',
            }}
          >
            <Link to="/user/register">新用户注册</Link>
          </div>

          {/* 第三方登录分割线 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '16px 0',
            color: '#999',
            fontSize: '14px'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e8e8e8' }}></div>
            <span style={{ padding: '0 16px' }}>或</span>
            <div style={{ flex: 1, height: '1px', background: '#e8e8e8' }}></div>
          </div>

          {/* LinuxDo 第三方登录按钮 */}
          <Button
            block
            size="large"
            onClick={handleLinuxDoLogin}
            style={{
              marginBottom: '16px',
              background: '#ff6b35',
              borderColor: '#ff6b35',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '44px',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e55a2b';
              e.currentTarget.style.borderColor = '#e55a2b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ff6b35';
              e.currentTarget.style.borderColor = '#ff6b35';
            }}
          >
            <img
              src="/img/logo-new-5.png"
              alt="Linux Do"
              width="20"
              height="20"
              style={{ objectFit: 'contain' }}
            />
            使用 Linux Do 登录
          </Button>
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};
export default Login;
