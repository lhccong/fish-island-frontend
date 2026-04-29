import React, { lazy, Suspense, useState } from 'react';
const ReactMarkdown = lazy(() => import('react-markdown'));
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';

// 注册常用语言
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('java', java);

interface MarkdownRendererProps {
  content: string;
}

/**
 * 简单的Markdown渲染组件
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // 用于跟踪复制状态
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 复制代码到剪贴板
  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code).then(
      () => {
        setCopiedIndex(index);
        message.success('代码已复制到剪贴板');
        // 2秒后重置复制状态
        setTimeout(() => {
          setCopiedIndex(null);
        }, 2000);
      },
      (err) => {
        console.error('复制失败: ', err);
        message.error('复制失败');
      }
    );
  };

  // 追踪代码块索引
  let codeBlockIndex = 0;

  return (
    <div className="markdown-content">
      <Suspense fallback={null}>
        <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isCodeBlock = match !== null;
            
            // 对于代码块，需要索引
            const currentIndex = isCodeBlock ? codeBlockIndex++ : -1;
            
            // 确保children是字符串
            const codeContent = Array.isArray(children) 
              ? children.join('') 
              : String(children || '');
            
            return isCodeBlock ? (
              <div className="code-block-wrapper">
                <div className="code-block-header">
                  <span className="code-language">{match ? match[1] : 'code'}</span>
                  <Button
                    className="copy-button"
                    type="text"
                    size="small"
                    icon={copiedIndex === currentIndex ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() => copyToClipboard(codeContent, currentIndex)}
                  >
                    {copiedIndex === currentIndex ? '已复制' : '复制'}
                  </Button>
                </div>
                <SyntaxHighlighter
                  style={prism as any}
                  language={match ? match[1] : ''}
                  PreTag="div"
                  {...props}
                >
                  {codeContent.replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
      </Suspense>
    </div>
  );
};

export default MarkdownRenderer; 