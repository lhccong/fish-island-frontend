import React, { useState, useEffect } from 'react';
import { Button, message, Spin, Card } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { getRandomBilibiliVideo } from '@/services/backend/videoController';
import './index.less';

const BilibiliVideo: React.FC = () => {
  const [videoData, setVideoData] = useState<{bvid: string; url: string} | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [videoKey, setVideoKey] = useState<number>(0);

  const fetchVideo = async () => {
    setLoading(true);
    try {
      const response = await getRandomBilibiliVideo();
      if (response.code === 0) {
        setVideoData(response.data);
        setVideoKey(prev => prev + 1);
        // message.success('视频加载成功！');
      } else {
        message.error(response.message || '获取视频失败');
      }
    } catch (error) {
      console.error('获取视频失败:', error);
      message.error('获取视频失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleNextVideo = () => {
    fetchVideo();
  };


  useEffect(() => {
    fetchVideo();
  }, []);

  return (
    <div className="bilibili-video-container">
      <Card 
        className="video-card"
      >
        <div className="video-wrapper">
          <div className="video-iframe-container">
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
                <p>正在加载视频...</p>
              </div>
            ) : videoData ? (
              <iframe
                key={videoKey}
                src={`https://player.bilibili.com/player.html?bvid=${videoData.bvid}&autoplay=0`}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
                className="bilibili-iframe"
                onError={() => {
                  message.error('视频加载失败，请点击下一个视频');
                }}
              />
            ) : (
              <div className="no-video">
                <PlayCircleOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <p>暂无视频</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="video-actions">
          <Button 
            type="primary" 
            size="large"
            icon={<ReloadOutlined />} 
            onClick={handleNextVideo}
            loading={loading}
            block
          >
            下一个视频
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default BilibiliVideo;
