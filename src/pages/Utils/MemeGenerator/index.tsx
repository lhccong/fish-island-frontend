// 表情包生成器 - 主入口页面
import React, { useState } from 'react';
import { Tooltip, Modal, Input, Button, message } from 'antd';
import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { getBackendUrl, setBackendUrl, isCustomBackend } from './api';
import MemeList from './components/MemeList';
import MemeGeneratorView from './components/MemeGeneratorView';
import './index.less';

const MemeGenerator: React.FC = () => {
  const [currentMemeKey, setCurrentMemeKey] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [backendInput, setBackendInput] = useState('');
  const [backendStatus, setBackendStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');

  // 打开设置弹窗
  const openSettings = () => {
    setBackendInput(isCustomBackend() ? getBackendUrl() : '');
    setBackendStatus('idle');
    setShowSettings(true);
  };

  // 测试连接
  const testConnection = async () => {
    const url = backendInput.replace(/\/+$/, '').trim() || getBackendUrl();
    setBackendStatus('testing');
    try {
      const res = await fetch(`${url}/meme/version`);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          setBackendStatus('error');
        } else {
          const text = await res.text();
          if (/^\d+\.\d+/.test(text.trim())) {
            setBackendStatus('ok');
          } else {
            setBackendStatus('error');
          }
        }
      } else {
        setBackendStatus('error');
      }
    } catch {
      setBackendStatus('error');
    }
  };

  // 保存后端地址
  const saveBackend = () => {
    setBackendUrl(backendInput);
    setShowSettings(false);
    message.success('后端地址已保存，页面即将刷新');
    setTimeout(() => window.location.reload(), 500);
  };

  // 重置后端地址
  const resetBackend = () => {
    setBackendInput('');
    setBackendStatus('idle');
  };

  // 使用说明内容
  const helpContent = (
    <div style={{ maxWidth: 420, fontSize: 13, lineHeight: 1.8 }}>
      <p><strong>🎉 表情包生成器使用说明</strong></p>
      <p>前端默认连接 <code>http://localhost:2233</code> 作为后端地址。你可以通过页面右上角的设置按钮（⚙）修改后端地址，配置会保存在浏览器 localStorage 中。</p>
      <p style={{ marginTop: 8 }}><strong>🔧 自建后端服务</strong></p>
      <p>后端项目：<a href="https://github.com/MemeCrafters/meme-generator-rs" target="_blank" rel="noreferrer">meme-generator-rs</a></p>
      <ul style={{ paddingLeft: 16, margin: '4px 0' }}>
        <li>一款基于 Rust 的高性能表情包生成器后端，支持制作各种沙雕表情包</li>
        <li>支持通过加载动态链接库加载额外表情</li>
        <li>详细使用与配置请参阅 <a href="https://github.com/MemeCrafters/meme-generator-rs/wiki" target="_blank" rel="noreferrer">Wiki 文档</a></li>
        <li>表情列表预览请参阅 <a href="https://github.com/MemeCrafters/meme-generator-rs/wiki/%E8%A1%A8%E6%83%85%E5%88%97%E8%A1%A8" target="_blank" rel="noreferrer">表情列表</a></li>
      </ul>
      <p style={{ marginTop: 8 }}><strong>⚠️ 已知问题</strong></p>
      <ul style={{ paddingLeft: 16, margin: '4px 0' }}>
        <li>Windows 下需安装 <a href="https://aka.ms/vs/17/release/VC_redist.x64.exe" target="_blank" rel="noreferrer">Visual C++ 运行时</a></li>
        <li>Linux 下字体异常时，可设置 <code>export LANG=en_US.UTF-8</code></li>
      </ul>
      <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>本工具表情素材来自网络，如有侵权请联系删除。</p>
    </div>
  );

  return (
    <div className="meme-generator-container">
      {/* Header */}
      <header className="meme-header">
        <div className="meme-header-inner">
          <div className="meme-header-left" onClick={() => setCurrentMemeKey(null)} style={{ cursor: 'pointer' }}>
            <span className="meme-header-logo">😂</span>
            <h1 className="meme-header-title">表情包生成器</h1>
          </div>
          <div className="meme-header-right">
            {/* 使用说明 */}
            <Tooltip
              title={helpContent}
              placement="bottomRight"
              overlayStyle={{ maxWidth: 460 }}
              overlayInnerStyle={{ background: '#fff', color: '#333', boxShadow: '0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12)' }}
              color="#fff"
            >
              <button className="meme-header-icon-btn">
                <QuestionCircleOutlined style={{ fontSize: 18 }} />
              </button>
            </Tooltip>
            {/* 后端设置 */}
            <button
              className={`meme-header-icon-btn ${isCustomBackend() ? 'meme-header-icon-btn-active' : ''}`}
              onClick={openSettings}
              title="后端设置"
            >
              <SettingOutlined style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="meme-main">
        {currentMemeKey ? (
          <MemeGeneratorView memeKey={currentMemeKey} onBack={() => setCurrentMemeKey(null)} />
        ) : (
          <MemeList onSelectMeme={setCurrentMemeKey} />
        )}
      </main>

      {/* Footer */}
      <footer className="meme-footer">
        <p>Meme Generator — 表情包生成器</p>
      </footer>

      {/* 后端设置弹窗 */}
      <Modal
        title="后端设置"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        destroyOnClose
        className="meme-settings-modal"
      >
        <div className="meme-settings-body">
          <div className="meme-settings-field">
            <label className="meme-settings-label">后端地址</label>
            <div className="meme-settings-input-row">
              <Input
                value={backendInput}
                onChange={(e) => setBackendInput(e.target.value)}
                placeholder="默认: http://localhost:2233"
                onPressEnter={testConnection}
              />
              {backendInput && (
                <Button onClick={resetBackend} size="small">重置</Button>
              )}
            </div>
            <p className="meme-settings-hint">输入后端服务器的完整地址，例如 http://127.0.0.1:2233</p>
          </div>
          <div className="meme-settings-actions">
            <Button onClick={testConnection} loading={backendStatus === 'testing'}>
              测试连接
            </Button>
            {backendStatus === 'ok' && <span className="meme-settings-status-ok">✓ 连接成功</span>}
            {backendStatus === 'error' && <span className="meme-settings-status-error">✗ 连接失败</span>}
          </div>
          <div className="meme-settings-footer">
            <Button onClick={() => setShowSettings(false)}>取消</Button>
            <Button type="primary" onClick={saveBackend}>保存并刷新</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MemeGenerator;
