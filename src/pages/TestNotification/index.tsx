import React, { useState } from 'react';
import { Button, Input, message } from 'antd';
import { startNotification, stopNotification } from '@/utils/notification';

const TestNotification: React.FC = () => {
  const [testMessage, setTestMessage] = useState('这是一条测试消息');
  const [notificationInterval, setNotificationInterval] = useState<number | null>(null);

  const handleStartFlash = () => {
    // 如果已经有闪烁效果，先停止
    if (notificationInterval !== null) {
      stopNotification(notificationInterval);
    }
    
    // 开始新的闪烁效果
    const interval = startNotification(testMessage);
    if (typeof interval === 'number') {
      setNotificationInterval(interval);
      message.success('开始闪烁效果');
    }
  };

  const handleStopFlash = () => {
    if (notificationInterval !== null) {
      stopNotification(notificationInterval);
      setNotificationInterval(null);
      message.success('停止闪烁效果');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>通知功能测试</h1>
      <div style={{ marginBottom: '20px' }}>
        <Input
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder="输入测试消息"
          style={{ width: '300px', marginRight: '10px' }}
        />
        <Button type="primary" onClick={handleStartFlash} style={{ marginRight: '10px' }}>
          开始闪烁
        </Button>
        <Button onClick={handleStopFlash}>
          停止闪烁
        </Button>
      </div>
      <div>
        <p>测试步骤：</p>
        <ol>
          <li>输入测试消息内容</li>
          <li>点击"开始闪烁"按钮</li>
          <li>观察浏览器标题和标签图标是否在红蓝色之间闪烁</li>
          <li>点击"停止闪烁"按钮，闪烁效果应该停止</li>
        </ol>
      </div>
    </div>
  );
};

export default TestNotification; 