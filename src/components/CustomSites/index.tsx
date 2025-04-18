import React, { useState, useEffect } from 'react';
import { Input, Button, Form, message, Tooltip } from 'antd';
import {
  PlusOutlined,
  CloseOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import styles from './index.less';

interface CustomSite {
  title: string;
  url: string;
  icon: string;
}

interface CustomSitesProps {
  visible: boolean;
  onClose: () => void;
  onAddSite: (site: CustomSite) => void;
  sites: CustomSite[];
}

const CustomSites: React.FC<CustomSitesProps> = ({ visible, onClose, onAddSite, sites }) => {
  const [form] = Form.useForm();
  const [collapsed, setCollapsed] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const sidebar = document.querySelector(`.${styles.sidebar}`);
      if (sidebar && !sidebar.contains(target)) {
        setCollapsed(true);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // 获取网页标题的函数
  const fetchPageTitle = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/);
      return match ? match[1] : url;
    } catch (error) {
      console.error('获取网页标题失败:', error);
      return url;
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      let url = values.url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      const hostname = new URL(url).hostname;
      let title = values.title;

      // 如果用户没有填写标题，则自动获取网页标题
      if (!title) {
        title = await fetchPageTitle(url);
      }

      const newSite: CustomSite = {
        title: title,
        url: url,
        icon: values.icon || `https://${hostname}/favicon.ico`,
      };

      onAddSite(newSite);
      form.resetFields();
      setCollapsed(true);
      message.success('网站添加成功！');
    } catch (error) {
      message.error('添加网站失败，请检查网址是否正确');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (event: React.MouseEvent, type: 'add' | 'manage') => {
    event.stopPropagation();
    if (!collapsed && ((type === 'add' && showForm) || (type === 'manage' && !showForm))) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
      setShowForm(type === 'add');
    }
  };

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`} onClick={e => e.stopPropagation()}>
      <div className={styles.buttonGroup}>
        <Tooltip title="添加网站" placement="left">
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={(e) => handleButtonClick(e, 'add')}
            className={styles.actionButton}
          />
        </Tooltip>
        <Tooltip title="管理网站" placement="left">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={(e) => handleButtonClick(e, 'manage')}
            className={styles.actionButton}
          />
        </Tooltip>
      </div>

      <div className={styles.sidebarContent}>
        {showForm ? (
          <div className={styles.formSection}>
            <Form form={form} onFinish={handleSubmit} layout="vertical">
              <Form.Item
                name="title"
              >
                <Input
                  placeholder="网站名称（可选，留空将自动获取）"
                  className={styles.input}
                  prefix={<span className={styles.inputPrefix}>名称</span>}
                />
              </Form.Item>
              <Form.Item
                name="url"
                rules={[
                  { required: true, message: '请输入网站地址' },
                  {
                    pattern: /^(https?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+.*$/,
                    message: '请输入有效的网址'
                  }
                ]}
              >
                <Input
                  placeholder="https://"
                  className={styles.input}
                  prefix={<span className={styles.inputPrefix}>网址</span>}
                />
              </Form.Item>
              <Form.Item name="icon">
                <Input
                  placeholder="图标地址（可选）"
                  className={styles.input}
                  prefix={<span className={styles.inputPrefix}>图标</span>}
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className={styles.submitButton}
                icon={<PlusOutlined />}
                loading={loading}
              >
                添加网站
              </Button>
            </Form>
          </div>
        ) : (
          <div className={styles.sitesList}>
            <h4>已添加的网站</h4>
            {sites.map((site, index) => (
              <div key={index} className={styles.siteItem}>
                <img src={site.icon} alt={site.title} className={styles.siteIcon} />
                <span className={styles.siteTitle}>{site.title}</span>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    className={styles.deleteButton}
                  />
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomSites;
