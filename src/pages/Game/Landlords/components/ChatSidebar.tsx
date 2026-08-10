/**
 * 内嵌聊天侧栏 - 直接显示在房间侧栏内（与 ChatPanel 浮窗模式不同）
 */
import React, { useState, useRef, useEffect } from 'react';
import { Input } from 'antd';
import { Send } from 'lucide-react';
import { ChatMessage } from '../types';

export interface ChatSidebarProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  currentUserId?: string | number;
  title?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  messages,
  onSend,
  currentUserId,
  title = '聊天',
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新消息滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const v = inputValue.trim();
    if (!v) return;
    onSend(v);
    setInputValue('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
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
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#d1d5db', marginTop: 20 }}>
            暂无消息
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUserId != null && String(msg.userId) === String(currentUserId);
            return (
              <div
                key={msg.id}
                style={{
                  marginBottom: 8,
                  textAlign: isMe ? 'right' : 'left',
                }}
              >
                <span style={{ color: '#6b7280', fontWeight: 500 }}>
                  {msg.userName}
                  {isMe && ' (我)'}:
                </span>{' '}
                <span style={{ color: '#1f2937' }}>{msg.content}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <Input
        placeholder="说点什么..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onPressEnter={handleSend}
        style={{ marginTop: 8 }}
        size="small"
        suffix={
          <Send
            size={14}
            style={{ cursor: 'pointer', color: inputValue.trim() ? '#16a34a' : '#9ca3af' }}
            onClick={handleSend}
          />
        }
        maxLength={200}
      />
    </div>
  );
};

export default ChatSidebar;