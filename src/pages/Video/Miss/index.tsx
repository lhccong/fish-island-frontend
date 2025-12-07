import React, { useState, useEffect } from 'react';
import { Button, message, Spin, Card } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { getMissVideo } from '@/services/backend/videoController';
import './index.less';

const MissVideo: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [videoKey, setVideoKey] = useState<number>(0); // 用于强制重新渲染视频

  const fetchVideo = async () => {
    setLoading(true);
    try {
      const response = await getMissVideo();
      if (response.code === 0) {
        // 从嵌套的data中获取视频URL
        const videoUrl = response.data.data;
        setVideoUrl(videoUrl);
        setVideoKey(prev => prev + 1); // 更新key强制重新渲染
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
    <div className="miss-video-page">
    <div className="miss-video-container">
      <Card 
        className="video-card"
      >
        <div className="video-wrapper">
          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
              <p>正在加载视频...</p>
            </div>
          ) : videoUrl ? (
             <video
               key={videoKey}
               controls
               autoPlay
               loop
               className="video-player"
               onError={() => {
                 message.error('视频加载失败，请点击下一个视频');
               }}
             >
              <source src={videoUrl} type="video/mp4" />
              您的浏览器不支持视频播放。
            </video>
          ) : (
            <div className="no-video">
              <PlayCircleOutlined style={{ fontSize: '48px', color: '#ccc' }} />
              <p>暂无视频</p>
            </div>
          )}
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
    </div>
  );
};

export default MissVideo;
