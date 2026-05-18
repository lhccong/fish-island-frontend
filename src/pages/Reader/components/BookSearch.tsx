import React, { useState } from 'react';
import {
  Input,
  List,
  Typography,
  Empty,
  Spin,
  Divider,
  theme
} from 'antd';

const { Text, Paragraph } = Typography;
const { Search } = Input;

interface Book {
  id: number;
  title: string;
  format: string;
  source: string;
  filePath?: string;
}

interface SearchResult {
  position: number;
  text: string;
  chapterIndex?: number;
  chapterTitle?: string;
}

interface BookSearchProps {
  book: Book;
  onSearch: (keyword: string) => void;
  onSearchResultSelect: (position: number) => void;
  results: SearchResult[];
}

const BookSearch: React.FC<BookSearchProps> = ({
  book,
  onSearch,
  onSearchResultSelect,
  results
}) => {
  const { token } = theme.useToken();
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [localResults, setLocalResults] = useState<SearchResult[]>([]);

  // 处理搜索
  const handleSearch = (value: string) => {
    if (!value.trim()) return;
    
    setKeyword(value);
    setSearching(true);
    
    // 调用父组件的搜索方法
    onSearch(value);
    
    // 模拟搜索过程
    setTimeout(() => {
      // 生成模拟的搜索结果
      const mockResults = Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => {
        const position = Math.floor(Math.random() * 10000);
        const prefix = '...';
        const highlight = value;
        const suffix = '...';
        
        let text = `${prefix}${highlight}${suffix}`;
        if (i % 3 === 0) {
          text = `${prefix}这是一段包含"${highlight}"的示例文本，用于展示搜索结果的上下文。${suffix}`;
        } else if (i % 3 === 1) {
          text = `${prefix}这个${highlight}出现在了一个句子中间的位置，周围有一些上下文。${suffix}`;
        } else {
          text = `${prefix}搜索示例，${highlight}可能出现在句子的结尾${suffix}`;
        }
        
        return {
          position,
          text,
          chapterIndex: Math.floor(position / 1000),
          chapterTitle: `第${Math.floor(position / 1000) + 1}章`
        };
      });
      
      setLocalResults(mockResults);
      setSearching(false);
    }, 1500);
  };

  // 格式化搜索结果，高亮关键词
  const formatResultText = (text: string) => {
    if (!keyword || !text) return <span>{text}</span>;
    
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    
    return (
      <span>
        {parts.map((part, index) => 
          part.toLowerCase() === keyword.toLowerCase() 
            ? <Text mark key={index}>{part}</Text> 
            : <span key={index}>{part}</span>
        )}
      </span>
    );
  };

  return (
    <div>
      <Search
        placeholder="搜索书籍内容"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onSearch={handleSearch}
        enterButton
        loading={searching}
      />
      
      <Divider orientation="left" plain>
        搜索结果
      </Divider>
      
      {searching ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="正在搜索..." />
        </div>
      ) : localResults.length > 0 ? (
        <>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            找到 {localResults.length} 个匹配结果
          </Paragraph>
          
          <List
            dataSource={localResults}
            renderItem={result => (
              <List.Item
                key={result.position}
                style={{ 
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '4px',
                  transition: 'all 0.3s',
                  marginBottom: '8px',
                  background: token.colorFillAlter
                }}
                onClick={() => onSearchResultSelect(result.position)}
                className="search-result-item"
              >
                <div>
                  {result.chapterTitle && (
                    <div style={{ marginBottom: 4 }}>
                      <Text strong>{result.chapterTitle}</Text>
                    </div>
                  )}
                  <div>{formatResultText(result.text)}</div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      位置: {result.position}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
            style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto' 
            }}
          />
        </>
      ) : keyword ? (
        <Empty 
          description="没有找到匹配的内容" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Empty 
          description="请输入关键词进行搜索" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
      
      <style>
        {`
          .search-result-item:hover {
            background-color: ${token.colorFillSecondary} !important;
            box-shadow: ${token.boxShadowTertiary};
          }
        `}
      </style>
    </div>
  );
};

export default BookSearch; 