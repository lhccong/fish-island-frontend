import React from 'react';
import { Button } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import styles from './index.less';

interface LoginPlaceholderProps {
  icon?: string;
  title: string;
  subtitle: string;
}

const LoginPlaceholder: React.FC<LoginPlaceholderProps> = ({
  icon = '🐟',
  title,
  subtitle,
}) => {
  return (
    <div className={styles.loginPlaceholder}>
      <div className={styles.loginIcon}>{icon}</div>
      <div className={styles.loginTitle}>{title}</div>
      <div className={styles.loginSubtitle}>{subtitle}</div>
      <Button
        type="primary"
        size="large"
        icon={<LoginOutlined />}
        onClick={() =>
          history.push(
            `/user/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
          )
        }
      >
        去登录
      </Button>
    </div>
  );
};

export default LoginPlaceholder;
