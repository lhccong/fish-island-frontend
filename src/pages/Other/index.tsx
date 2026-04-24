import React from 'react';
import { Card, Typography, Space, Row, Col, message } from 'antd';
import { LinkOutlined, PlayCircleOutlined, DesktopOutlined, MobileOutlined } from '@ant-design/icons';
import './index.less';

const { Title, Paragraph } = Typography;

const OtherProducts: React.FC = () => {
  const handleCopyUrl = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText('https://tv.yucoder.cn').then(() => {
      message.success('网址已复制到剪贴板');
    });
  };

  return (
    <div className="other-products-container">
      <Title level={2}>摸鱼岛出品🌟</Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={24} md={12} lg={8}>
          <a
            href="https://tv.yucoder.cn"
            target="_blank"
            rel="noopener noreferrer"
            className="card-link"
          >
            <Card
              cover={
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <PlayCircleOutlined style={{ fontSize: '64px', color: '#1890ff' }} />
                </div>
              }
              title={
                <Space>
                  <Title level={3}>摸鱼 TV</Title>
                  <a
                    href="#"
                    onClick={handleCopyUrl}
                    className="copy-link"
                  >
                    <LinkOutlined />
                  </a>
                </Space>
              }
            >
              <Paragraph>
                摸鱼 TV 是一个专注于提供优质电视节目和综艺内容的平台。在这里你可以观看热播电视剧、热门综艺节目、经典电影等，支持高清播放、收藏追剧等功能，让你在工作之余享受轻松愉快的观影时光。
              </Paragraph>
              <Paragraph className="visit-link">
                <span className="link-text">立即访问</span>
              </Paragraph>
            </Card>
          </a>
        </Col>

        {/* utools 端 */}
        <Col xs={24} sm={24} md={12} lg={8}>
          <a
            href="https://u.tools/"
            target="_blank"
            rel="noopener noreferrer"
            className="card-link"
          >
            <Card
              cover={
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <DesktopOutlined style={{ fontSize: '64px', color: '#722ed1' }} />
                </div>
              }
              title={
                <Space>
                  <Title level={3}>uTools 端</Title>
                </Space>
              }
            >
              <Paragraph>
                下载 uTools 应用，在插件市场搜索「摸鱼岛」即可安装使用。uTools 是一个极简、插件化的现代桌面软件，让你在工作时快速访问摸鱼岛的各种功能。
              </Paragraph>
              <Paragraph className="visit-link">
                <span className="link-text">立即下载 uTools</span>
              </Paragraph>
            </Card>
          </a>
        </Col>

        {/* App 端 */}
        <Col xs={24} sm={24} md={12} lg={8}>
          <div className="card-link" style={{ cursor: 'default' }}>
            <Card
              cover={
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <MobileOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
                </div>
              }
              title={
                <Space>
                  <Title level={3}>App 端</Title>
                </Space>
              }
            >
              <Paragraph>
                <strong>安卓用户：</strong>加入 QQ 群下载安装包进行安装。<br /><br />
                <strong>iOS 用户：</strong>前往 App Store 搜索「Expo Go」下载安装，注册账户后将邮箱发给岛主，即可直接邀请你进入应用。
              </Paragraph>
              <Paragraph className="visit-link">
                <span className="link-text" style={{ color: '#999' }}>移动办公 随时摸鱼</span>
              </Paragraph>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default OtherProducts;
