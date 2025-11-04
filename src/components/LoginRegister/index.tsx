import { Button, Form, message, Modal, Tabs, Input, Select } from 'antd';
import { LockOutlined, MailOutlined, QqCircleFilled, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { Helmet } from '@@/exports';
import Settings from '../../../config/defaultSettings';
import Footer from '@/components/Footer';
import { useModel } from '@umijs/max';
import { useState, useRef } from 'react';
import { Captcha } from 'aj-captcha-react';
import { BACKEND_HOST_CODE } from '@/constants';
import styles from '@/pages/User/Register/index.less';
import {
  userLoginUsingPost,
  userEmailLoginUsingPost,
  userEmailSendUsingPost,
  userEmailRegisterUsingPost,
  getLinuxDoAuthUrlUsingGet,
} from '@/services/backend/userController';

interface UserLoginRequest {
  userAccount?: string;
  userPassword?: string;
  userEmail?: string;
}

interface EmailLoginRequest {
  email: string;
  userPassword: string;
}

interface AccountLoginRequest {
  userAccount: string;
  userPassword: string;
}

interface EmailRegisterRequest {
  userAccount: string;
  userPassword: string;
  checkPassword: string;
  email: string;
  code: string;
  captchaVerification: string;
}

interface LoginRegisterProps {
  isModalOpen: boolean;
  onCancel: () => void;
  onForgotPassword?: () => void;
}

const LoginRegister: React.FC<LoginRegisterProps> = ({ isModalOpen, onCancel, onForgotPassword }) => {
  const [type, setType] = useState<string>('login');
  const [form] = Form.useForm();
  const [valueData, setValueData] = useState<API.UserRegisterRequest>();
  const ref = useRef();
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailSuffix, setEmailSuffix] = useState('qq.com');
  const { initialState, setInitialState } = useModel('@@initialState');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [registerValues, setRegisterValues] = useState<any>(null);
  const [loginValues, setLoginValues] = useState<any>(null);
  const [showLoginCaptcha, setShowLoginCaptcha] = useState(false);

  // 邮箱域名选项
  const emailDomains = [
    'qq.com',
    '163.com',
    'gmail.com',
    '126.com',
    'outlook.com',
    'foxmail.com',
    'sina.com',
    'vip.qq.com',
    '139.com',
    '88.com',
    'icloud.com'
  ];

  // 处理邮箱输入变化
  const handleEmailChange = (prefix: string, suffix: string) => {
    const fullEmail = prefix && suffix ? `${prefix}@${suffix}` : '';
    setEmailPrefix(prefix);
    setEmailSuffix(suffix);
    setEmail(fullEmail);
    // 更新表单字段值
    form.setFieldsValue({ email: fullEmail });
  };

  const containerClassName = useEmotionCss(() => {
    return {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    };
  });

  const handleSendCode = async () => {
    if (!email) {
      message.error('请输入邮箱地址');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.error('请输入正确的邮箱地址');
      return;
    }
    try {
      const res = await userEmailSendUsingPost({
        email: email,
      });
      if (res.code === 0) {
        message.success('验证码已发送到邮箱');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error: any) {
      message.error(`发送验证码失败：${error.message}`);
    }
  };

  const handleRegisterSubmit = async (values: EmailRegisterRequest) => {
    if (values.userPassword !== values.checkPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    try {
      const data = await userEmailRegisterUsingPost(values);
      if (data.code === 0) {
        const defaultLoginSuccessMessage = '注册成功！';
        message.success(defaultLoginSuccessMessage);
        setType('login');
        setShowCaptcha(false);
      }
    } catch (error: any) {
      const defaultLoginFailureMessage = '注册失败，请重试！';
      message.error(defaultLoginFailureMessage);
    }
  };

  const validateAndShowCaptcha = async (values: any) => {
    if (values.userPassword !== values.checkPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    setRegisterValues(values);
    setShowCaptcha(true);
    setTimeout(() => {
      const current = ref.current as any;
      if (current) {
        current.verify();
      }
    }, 100);
  };
  const validateAndShowLoginCaptcha = async (values: any) => {
    setLoginValues(values);
    setShowLoginCaptcha(true);
    setTimeout(() => {
      const current = ref.current as any;
      if (current) {
        current.verify();
      }
    }, 100);
  };

// 修改原来的 handleSubmit 为实际登录逻辑
  const handleLoginSubmit = async (values: UserLoginRequest) => {
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.userAccount || '');
      let res;
      if (isEmail) {
        const emailLoginData: EmailLoginRequest = {
          email: values.userAccount || '',
          userPassword: values.userPassword || '',
        };
        res = await userEmailLoginUsingPost(emailLoginData);
      } else {
        const accountLoginData: AccountLoginRequest = {
          userAccount: values.userAccount || '',
          userPassword: values.userPassword || '',
        };
        res = await userLoginUsingPost(accountLoginData);
      }

      if (res.code === 0) {
        const defaultLoginSuccessMessage = '登录成功！';
        const result = res.data as any;
        localStorage.setItem('tokenName', result.saTokenInfo?.tokenName as string);
        localStorage.setItem('tokenValue', result.saTokenInfo?.tokenValue as string);
        message.success(defaultLoginSuccessMessage);
        setInitialState({
          ...initialState,
          currentUser: res.data,
        });
        onCancel();
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
    <Modal footer={null} open={isModalOpen} onCancel={onCancel}>
      <div className={containerClassName}>
        <Helmet>
          <title>{'登录'}- {Settings.title}</title>
        </Helmet>
        <div style={{ flex: '1', padding: '32px 0' }}>
          <LoginForm
            form={form}
            contentStyle={{
              minWidth: 280,
              maxWidth: '75vw',
            }}
            logo={<img alt="logo" style={{ height: '100%' }}
                      src="https://oss.cqbo.com/moyu/moyu.png" />}
            title="摸鱼岛"
            subTitle={'加入摸鱼岛一起来摸吧'}
            initialValues={{
              autoLogin: true,
            }}
            onFinish={async (values) => {
              if (type === 'login') {
                await validateAndShowLoginCaptcha(values);
              } else if (type === 'register') {
                await validateAndShowCaptcha(values);
              }
            }}
            submitter={false}
          >
            <Tabs
              activeKey={type}
              onChange={setType}
              centered
              items={[
                {
                  key: 'login',
                  label: '登录',
                },
                {
                  key: 'register',
                  label: '注册',
                }
              ]}
            />
            {type === 'login' && (
              <>
                <ProFormText
                  name="userAccount"
                  fieldProps={{
                    size: 'large',
                    prefix: <UserOutlined />,
                  }}
                  placeholder={'请输入账号/邮箱'}
                  rules={[
                    {
                      required: true,
                      message: '账号/邮箱是必填项！',
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
                <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '8px' }}>
                  <Button
                    type="link"
                    style={{ padding: 0, fontSize: 13 }}
                    onClick={() => {
                      onCancel();
                      onForgotPassword && onForgotPassword();
                    }}
                  >
                    忘记密码？
                  </Button>
                </div>

                {/* 登录按钮 */}
                <Button
                  type="primary"
                  block
                  size="large"
                  htmlType="submit"
                  style={{
                    marginBottom: '16px',
                    height: '44px',
                    fontWeight: 500,
                  }}
                >
                  登录
                </Button>

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
              </>
            )}
            {type === 'register' && (
              <>
                <ProFormText
                  name="userAccount"
                  fieldProps={{
                    size: 'large',
                    prefix: <UserOutlined className={styles.prefixIcon} />,
                  }}
                  placeholder="请输入账号（选填）"
                />
                <ProFormText.Password
                  name="userPassword"
                  fieldProps={{
                    size: 'large',
                    prefix: <LockOutlined className={styles.prefixIcon} />,
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
                    prefix: <LockOutlined className={styles.prefixIcon} />,
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
                <Form.Item
                  name="email"
                  rules={[
                    {
                      required: true,
                      message: '邮箱是必填项！',
                    },
                    {
                      type: 'email',
                      message: '请输入正确的邮箱地址！',
                    },
                  ]}
                >
                  <Input.Group compact style={{ display: 'flex' }}>
                    <Input
                      size="large"
                      prefix={<QqCircleFilled className={styles.prefixIcon} />}
                      placeholder="请输入邮箱前缀"
                      value={emailPrefix}
                      onChange={(e) => handleEmailChange(e.target.value, emailSuffix)}
                      style={{ flex: 1 }}
                    />
                    <Input
                      size="large"
                      style={{
                        width: '40px',
                        minWidth: '40px',
                        borderLeft: 0,
                        borderRight: 0,
                        pointerEvents: 'none',
                        textAlign: 'center',
                        backgroundColor: '#fafafa',
                        color: '#000',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        padding: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      value="@"
                      disabled
                    />
                    <Select
                      size="large"
                      placeholder="qq.com"
                      value={emailSuffix}
                      onChange={(value) => handleEmailChange(emailPrefix, value)}
                      style={{ width: '140px' }}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={emailDomains.map(domain => ({
                        value: domain,
                        label: domain
                      }))}
                    />
                  </Input.Group>
                </Form.Item>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <ProFormText
                    name="code"
                    fieldProps={{
                      size: 'large',
                      prefix: <MailOutlined className={styles.prefixIcon} />,
                    }}
                    placeholder="请输入邮箱验证码"
                    rules={[
                      {
                        required: true,
                        message: '验证码是必填项！',
                      },
                    ]}
                  />
                  <Button
                    type="primary"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    style={{ height: '40px', minWidth: '120px' }}
                  >
                    {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
                  </Button>
                </div>

                {/* 注册按钮 */}
                <Button
                  type="primary"
                  block
                  size="large"
                  htmlType="submit"
                  style={{
                    marginTop: '16px',
                    marginBottom: '16px',
                    height: '44px',
                    fontWeight: 500,
                  }}
                >
                  注册
                </Button>

                <Captcha
                  onSuccess={async (data) => {
                    setValueData({
                      ...valueData,
                      captchaVerification: data.captchaVerification,
                    });
                  }}
                  path={BACKEND_HOST_CODE}
                  type="auto"
                  ref={ref}
                />
              </>
            )}
            {showCaptcha && (
              <Captcha
                onSuccess={async (data) => {
                  if (registerValues) {
                    const registerData: EmailRegisterRequest = {
                      userAccount: registerValues.userAccount || '',
                      userPassword: registerValues.userPassword,
                      checkPassword: registerValues.checkPassword,
                      email: registerValues.email,
                      code: registerValues.code,
                      captchaVerification: data.captchaVerification,
                    };
                    await handleRegisterSubmit(registerData);
                  }
                }}
                path={BACKEND_HOST_CODE}
                type="auto"
                ref={ref}
              />
            )}
            {showLoginCaptcha && (
              <Captcha
                onSuccess={async (data) => {
                  if (loginValues) {
                    const loginData: UserLoginRequest = {
                      ...loginValues,
                      captchaVerification: data.captchaVerification,
                    };
                    await handleLoginSubmit(loginData);
                  }
                }}
                path={BACKEND_HOST_CODE}
                type="auto"
                ref={ref}
              />
            )}
          </LoginForm>
        </div>
        <Footer />
      </div>
    </Modal>
  );
};

export default LoginRegister;
