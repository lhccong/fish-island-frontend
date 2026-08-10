/**
 * 内嵌聊天侧栏 - 直接显示在房间侧栏内（与 ChatPanel 浮窗模式不同）
 *
 * 斗地主房间内只允许发送预设的快捷短语，禁止自由输入，避免无关聊天打扰游戏
 */
import React, { useState, useRef, useEffect } from 'react';
import { Button, Dropdown } from 'antd';
import { DownOutlined, SmileOutlined } from '@ant-design/icons';
import { ChatMessage } from '../types';

export interface ChatSidebarProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  currentUserId?: string | number;
  title?: string;
}

// 斗地主内置快捷短语
const QUICK_PHRASES = [
  '快点啊，我等到花儿都谢了！',
  '牌不错，心情美美哒~',
  '不好意思，我先走了 :)',
  '再来一局吧！',
  '别急，让我再想想。',
  '别催了，我正在算牌。',
  '打得不错，佩服佩服！',
  '哇，这牌运也太好了吧！',
  '不行，我得压你一手。',
  '你这牌打得太好了，认输。',
  '你这牌打得也太臭了吧！',
  '哈哈，我终于赢了！',
  '唉，又输了。',
  '地主就是不一样啊！',
  '农民也不容易啊！',
  '炸弹！炸到你不要不要的~',
  '顺子！我出顺子！',
  '王炸！哈哈哈哈！',
  '这局算你走运！',
  '下局我一定赢回来！',
];

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  messages,
  onSend,
  currentUserId,
  title = '聊天',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新消息滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 点击预设短语即发送
  const handlePickPhrase = (phrase: string) => {
    onSend(phrase);
  };

  // 构建下拉菜单项
  const phraseMenu = {
    items: QUICK_PHRASES.map((phrase, idx) => ({
      key: `phrase-${idx}`,
      label: phrase,
      onClick: () => handlePickPhrase(phrase),
    })),
    style: { maxHeight: 280, overflowY: 'auto' as const },
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#374151',
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      {/* 消息列表 */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#fafafa',
          borderRadius: 6,
          padding: 8,
          fontSize: 12,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#d1d5db', marginTop: 20 }}>
            暂无消息
          </div>
        ) : (
          messages.map((msg) => {
            // 优先用消息自带标记，避免 userId 异步未就绪时被误判
            const isMe =
              msg.isMe ??
              (currentUserId != null && String(msg.userId) === String(currentUserId));
            return (
              <div
                key={msg.id}
                style={{
                  marginBottom: 8,
                  textAlign: isMe ? 'right' : 'left',
                }}
              >
                {isMe ? (
                  <>
                    <span style={{ color: '#1f2937' }}>{msg.content}</span>
                    {msg.userName ? '：' : ''}
                    <span style={{ color: '#6b7280', fontWeight: 500 }}>
                      {msg.userName}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#6b7280', fontWeight: 500 }}>
                      {msg.userName}
                    </span>
                    {msg.userName ? '：' : ''}
                    <span style={{ color: '#1f2937' }}>{msg.content}</span>
                  </>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷短语区（替代自由输入） */}
      <div
        style={{
          marginTop: 8,
          flex: '0 0 auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Dropdown
          menu={phraseMenu}
          trigger={['click']}
          placement="topRight"
          overlayStyle={{ maxWidth: 240 }}
        >
          <Button
            type="primary"
            size="small"
            icon={<SmileOutlined />}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            发送快捷短语 <DownOutlined />
          </Button>
        </Dropdown>
      </div>
    </div>
  );
};

export default ChatSidebar;