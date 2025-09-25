import React, { useState } from 'react';
import { Card, Typography, Row, Col, Space, Divider, Modal } from 'antd';
import { GiftOutlined, HeartOutlined, ShoppingOutlined, CloseOutlined } from '@ant-design/icons';
import styles from './index.less';

const { Title, Text, Paragraph } = Typography;

const Welfare: React.FC = () => {
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const platforms = [
    {
      id: 'meituan1',
      name: '美团外卖',
      description: '美团福利券1',
      image: '/img/美团1.jpg',
      color: '#FFD100'
    },
    {
      id: 'meituan2', 
      name: '美团外卖',
      description: '美团福利券2',
      image: '/img/美团2.jpg',
      color: '#FFD100'
    },
    {
      id: 'eleme',
      name: '饿了么',
      description: '超值外卖红包',
      image: '/img/饿了么.jpg',
      color: '#0078FF'
    },
    {
      id: 'taobao',
      name: '淘宝闪购',
      description: '限时特价商品',
      image: '/img/闪购.jpg',
      color: '#FF5000'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <GiftOutlined className={styles.titleIcon} />
          <Title level={1} className={styles.title}>
            外卖福利专区
          </Title>
          <Text className={styles.subtitle}>
            扫码领券，享受美食优惠
          </Text>
        </div>
      </div>

      <div className={styles.content}>
        <Card className={styles.introCard}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div className={styles.introHeader}>
              <ShoppingOutlined className={styles.introIcon} />
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                如何使用外卖券？
              </Title>
            </div>
            <Paragraph className={styles.introText}>
              <Text strong>1. 扫描下方二维码</Text> → 
              <Text strong>2. 领取专属优惠券</Text> → 
              <Text strong>3. 下单享受折扣</Text>
            </Paragraph>
            <Divider />
            <div className={styles.supportSection}>
              <HeartOutlined className={styles.heartIcon} />
              <Text className={styles.supportText}>
                <Text strong style={{ color: '#ff4d4f' }}>温馨提示：</Text>
                通过扫码下单不仅能享受优惠，还能给主播带来一点分红收益，
                这是对我们网站的一份支持！感谢每一位朋友的理解与支持 ❤️
              </Text>
            </div>
          </Space>
        </Card>

        <div className={styles.platformsGrid}>
          <Row gutter={[24, 24]} justify="center">
            {platforms.map((platform) => (
              <Col xs={24} sm={12} md={12} lg={6} key={platform.id}>
                <Card
                  className={styles.platformCard}
                  hoverable
                  cover={
                    <div 
                      className={styles.imageContainer}
                      onClick={() => {
                        setPreviewImage(platform.image);
                        setPreviewTitle(platform.name);
                        setPreviewVisible(true);
                      }}
                    >
                      <img
                        src={platform.image}
                        alt={platform.name}
                        className={styles.qrImage}
                      />
                      <div className={styles.imageOverlay}>
                        <Text className={styles.clickTip}>点击查看大图</Text>
                      </div>
                    </div>
                  }
                  bodyStyle={{ padding: '16px' }}
                >
                  <div className={styles.cardContent}>
                    <Title level={4} className={styles.platformName}>
                      {platform.name}
                    </Title>
                    <Text className={styles.platformDesc}>
                      {platform.description}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <Card className={styles.bottomTip}>
          <div className={styles.tipContent}>
            <GiftOutlined className={styles.tipIcon} />
            <div>
              <Title level={4} style={{ margin: '0 0 8px 0', color: '#52c41a' }}>
                更多福利持续更新中...
              </Title>
              <Text type="secondary">
                我们会定期更新各种优惠券和福利活动，记得常来看看哦！
              </Text>
            </div>
          </div>
        </Card>
      </div>

      {/* 图片预览模态框 */}
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="90vw"
        style={{ maxWidth: '800px' }}
        centered
        closeIcon={<CloseOutlined style={{ fontSize: '20px', color: '#fff' }} />}
        styles={{
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
          content: { backgroundColor: 'transparent', boxShadow: 'none' },
          header: { backgroundColor: 'rgba(0, 0, 0, 0.7)', border: 'none', color: '#fff' },
          body: { padding: 0 }
        }}
      >
        <div className={styles.previewContainer}>
          <img
            src={previewImage}
            alt={previewTitle}
            className={styles.previewImage}
          />
          <div className={styles.previewTip}>
            <Text style={{ color: '#fff', fontSize: '14px' }}>
              长按图片保存二维码到相册，然后用微信扫一扫识别
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Welfare;