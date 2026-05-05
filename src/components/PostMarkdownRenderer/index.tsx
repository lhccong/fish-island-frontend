import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { message } from 'antd';
import './index.less';

// 注册常用语言
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('c', cpp);

interface PostMarkdownRendererProps {
  content: string;
}

const PostMarkdownRenderer: React.FC<PostMarkdownRendererProps> = ({ content }) => {
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  const copyToClipboard = (code: string, key: string) => {
    navigator.clipboard.writeText(code).then(
      () => {
        setCopiedMap((prev) => ({ ...prev, [key]: true }));
        message.success('代码已复制');
        setTimeout(() => {
          setCopiedMap((prev) => ({ ...prev, [key]: false }));
        }, 2000);
      },
      () => {
        message.error('复制失败');
      },
    );
  };

  // 用于给每个代码块生成唯一 key
  let codeBlockCount = 0;

  return (
    <div className="post-markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // 代码块
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = match !== null;
            const codeStr = Array.isArray(children) ? children.join('') : String(children ?? '');

            if (!isBlock) {
              return (
                <code className="post-md-inline-code" {...props}>
                  {children}
                </code>
              );
            }

            const blockKey = `code-${codeBlockCount++}`;
            const lang = match ? match[1] : '';

            return (
              <div className="post-md-code-block">
                <div className="post-md-code-header">
                  <span className="post-md-code-lang">{lang || 'code'}</span>
                  <button
                    className="post-md-copy-btn"
                    onClick={() => copyToClipboard(codeStr.replace(/\n$/, ''), blockKey)}
                  >
                    {copiedMap[blockKey] ? (
                      <>
                        <CheckOutlined /> 已复制
                      </>
                    ) : (
                      <>
                        <CopyOutlined /> 复制
                      </>
                    )}
                  </button>
                </div>
                <SyntaxHighlighter
                  style={oneLight as any}
                  language={lang}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: '0 0 6px 6px', fontSize: '13px' }}
                  {...props}
                >
                  {codeStr.replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          // 图片自适应
          img({ src, alt, ...props }: any) {
            return (
              <img
                src={src}
                alt={alt}
                style={{ maxWidth: '100%', height: 'auto', borderRadius: 4 }}
                {...props}
              />
            );
          },
          // 表格加横向滚动
          table({ children, ...props }: any) {
            return (
              <div className="post-md-table-wrapper">
                <table {...props}>{children}</table>
              </div>
            );
          },
          // 链接新标签打开
          a({ href, children, ...props }: any) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default PostMarkdownRenderer;
