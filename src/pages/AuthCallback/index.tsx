import { useEffect } from 'react';
import { message } from 'antd';
import { history } from 'umi';
import { useModel } from '@umijs/max';

const AuthCallback: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenName = urlParams.get('tokenName');
      const tokenValue = urlParams.get('tokenValue');
      const error = urlParams.get('error');
      
      if (error) {
        message.error(`第三方登录失败：${error}`);
        history.push('/index');
        return;
      }
      
      if (tokenName && tokenValue) {
        try {
          // 存储 token 信息
          localStorage.setItem('tokenName', tokenName);
          localStorage.setItem('tokenValue', tokenValue);
          
          // 获取用户信息并更新状态
          // const userInfo = await getUserInfo();
          setInitialState({
            ...initialState,
            // currentUser: userInfo,
          });
          
          message.success('登录成功！');
          
          // 获取之前保存的重定向 URL
          const redirectUrl = localStorage.getItem('loginRedirectUrl') || '/';
          localStorage.removeItem('loginRedirectUrl'); // 清除存储的 URL
          
          // 重定向到之前的页面
          window.location.href = redirectUrl;
        } catch (error: any) {
          message.error(`登录失败：${error.message}`);
          history.push('/index');
        }
      }
    };

    handleAuthCallback();
  }, []);

  return null; // 这个页面不需要渲染任何内容，只需要处理回调逻辑
};

export default AuthCallback;