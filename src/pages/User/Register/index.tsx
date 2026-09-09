import Footer from '@/components/Footer';
import {BACKEND_HOST_CODE, SYSTEM_LOGO} from '@/constants';
import {userRegisterUsingPost} from '@/services/backend/userController';
import {LockOutlined, UserOutlined} from '@ant-design/icons';
import {LoginForm, ProFormText} from '@ant-design/pro-components';
import {Captcha} from 'aj-captcha-react';
import {message, Tabs} from 'antd';
import React, {useRef, useState} from 'react';
import {history} from 'umi';
import styles from './index.less';

// 此页面仅用于 /user/register 路径的注册功能，主注册逻辑位于 /components/RightContent/AvatarDropDown。
const Register: React.FC = () => {
  const [type, setType] = useState<string>('account');
  const [valueData, setValueData] = useState<API.UserRegisterRequest>();

  const ref = useRef();

  const click = () => {
    const current = ref.current as any;
    current.verify();
    console.log(current.verify());
  };
  // 表单提交
  const handleSubmit = async (values: API.UserRegisterRequest) => {
    const {userPassword, checkPassword} = values;
    // 校验
    if (userPassword !== checkPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    try {
      // 注册
      const data = await userRegisterUsingPost(values);
      if (data.code === 0) {
        const defaultLoginSuccessMessage = '注册成功！';
        message.success(defaultLoginSuccessMessage);

        history.push({
          pathname: '/user/login',
        });
      }
    } catch (error: any) {
      const defaultLoginFailureMessage = '注册失败，请重试！';
      message.error(defaultLoginFailureMessage);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <LoginForm
          submitter={{
            searchConfig: {
              submitText: '注册',
            },
          }}
          logo={<img alt="logo" src={SYSTEM_LOGO}/>}
          title="摸鱼岛"
          initialValues={{
            autoLogin: true,
          }}
          onFinish={async (values) => {
            click();
            setValueData(values);
          }}
        >
          <Tabs activeKey={type} onChange={setType}>
            <Tabs.TabPane key="account" tab={'账号密码注册'}/>
          </Tabs>
          {type === 'account' && (
            <>
              <ProFormText
                name="userAccount"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined className={styles.prefixIcon}/>,
                }}
                placeholder="请输入账号"
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
                  prefix: <LockOutlined className={styles.prefixIcon}/>,
                }}
                placeholder="请输入密码"
                rules={[
                  {
                    required: true,
                    message: '密码是必填项！',
                  },
                  {
                    min: 8,
                    type: 'string',
                    message: '长度不能小于 8',
                  },
                ]}
              />
              <ProFormText.Password
                name="checkPassword"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined className={styles.prefixIcon}/>,
                }}
                placeholder="请再次输入密码"
                rules={[
                  {
                    required: true,
                    message: '确认密码是必填项！',
                  },
                  {
                    min: 8,
                    type: 'string',
                    message: '长度不能小于 8',
                  },
                ]}
              />
              <Captcha
                onSuccess={async (data) => {
                  const value = valueData as any;
                  if (value) {
                    value.captchaVerification = data.captchaVerification;
                    await handleSubmit(value);
                  }
                }}
                path={BACKEND_HOST_CODE}
                type="auto"
                ref={ref}
              ></Captcha>
            </>
          )}
        </LoginForm>
      </div>
      <Footer/>
    </div>
  );
};

export default Register;
