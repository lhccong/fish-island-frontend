import React, { useState, useEffect, useRef } from 'react';
import {
  Input,
  Button,
  message,
  List,
  Spin,
  Empty,
  Typography,
  Tooltip
} from 'antd';
import { BookOutlined, SearchOutlined, LoadingOutlined, GlobalOutlined, DownOutlined } from '@ant-design/icons';
import { ACCESS_TOKEN } from '@/constants';

const { Search } = Input;

// 全局变量
const SEARCH_URL = 'https://reader.yucoder.cn/reader3/searchBookMultiSSE';

interface BookImportProps {
  onAddLocalBook: (book: any) => void;
  onAddOnlineBook: (book: any) => void;
}

interface SearchResult {
  bookUrl: string;
  origin: string;
  originName: string;
  type: number;
  name: string;
  author: string;
  kind: string;
  coverUrl: string;
  intro: string;
  wordCount: string;
  latestChapterTitle: string;
  tocUrl: string;
  time: number;
  originOrder: number;
  infoHtml: string;
  tocHtml: string;
}

const BookImport: React.FC<BookImportProps> = ({ onAddOnlineBook }) => {
  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [lastIndex, setLastIndex] = useState(-1);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 使用ref保存EventSource实例和最后index值，便于后续清理
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastIndexRef = useRef<number>(-1);

  // 同步lastIndex到ref
  useEffect(() => {
    lastIndexRef.current = lastIndex;
  }, [lastIndex]);

  // 处理搜索关键词变更
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };

  // 清理EventSource连接
  const cleanupEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      cleanupEventSource();
    };
  }, []);

  // 处理搜索请求
  const handleSearch = async () => {
    if (!searchKeyword) {
      message.error('请输入搜索关键词');
      return;
    }

    // 重置搜索状态
    setSearchResults([]);
    setSearching(true);
    setLastIndex(-1);
    lastIndexRef.current = -1;
    setPage(1);
    setHasMore(false);

    // 清理之前可能存在的连接
    cleanupEventSource();

    // 构建搜索URL
    const queryParams = new URLSearchParams({
      key: searchKeyword,
      bookSourceUrl: '',
      bookSourceGroup: '',
      concurrentCount: '8',
      lastIndex: '-1',
      page: '1',
      accessToken: ACCESS_TOKEN
    });

    const searchUrl = `${SEARCH_URL}?${queryParams.toString()}`;

    try {
      // 创建SSE连接
      const eventSource = new EventSource(searchUrl);
      eventSourceRef.current = eventSource;

      let newResults: SearchResult[] = [];

      // 监听message事件
      eventSource.onmessage = (event) => {
        try {
          // 提取data部分
          const data = event.data.trim();
          if (!data) return;

          // 解析JSON
          const parsedData = JSON.parse(data);
          setLastIndex(parsedData.lastIndex);

          // 过滤封面为空的数据
          let filteredData = parsedData.data && Array.isArray(parsedData.data) ? parsedData.data.filter((item: SearchResult) => item.coverUrl) : [];

          // 合并搜索结果
          if (filteredData.length > 0) {
            newResults = [...newResults, ...filteredData];
            setSearchResults(prevResults => [...prevResults, ...filteredData]);
          }
        } catch (error) {
          console.error('解析SSE消息失败:', error);
        }
      };

      // 监听end事件
      eventSource.addEventListener('end', (event) => {
        try {
          const data = event.data.trim();
          if (!data) return;

          const parsedData = JSON.parse(data);

          // 更新lastIndex
          if (parsedData.lastIndex !== undefined) {
            setLastIndex(parsedData.lastIndex);
          }

          // 根据isEnd确定是否还有更多数据
          setHasMore(parsedData.isEnd === false);

          // 完成搜索
          eventSource.close();
          eventSourceRef.current = null;
          setSearching(false);
        } catch (error) {
          console.error('解析end事件失败:', error);
        }
      });

      // 监听错误
      eventSource.onerror = (error) => {
        console.error('SSE连接错误:', error);
        message.error('搜索请求异常，请稍后重试');
        eventSource.close();
        eventSourceRef.current = null;
        setSearching(false);
      };

      // 监听连接关闭
      eventSource.addEventListener('complete', () => {

        eventSource.close();
        eventSourceRef.current = null;
        setSearching(false);

        // 如果没有收到end事件，我们假设有更多结果
        if (newResults.length > 0) {
          setHasMore(true);
        }
      });

    } catch (error) {
      console.error('创建SSE连接失败:', error);
      message.error('搜索请求失败，请检查网络连接');
      setSearching(false);
    }
  };

  // 加载更多结果
  const loadMore = () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    // 构建搜索URL
    const queryParams = new URLSearchParams({
      key: searchKeyword,
      bookSourceUrl: '',
      bookSourceGroup: '',
      concurrentCount: '8',
      lastIndex: lastIndexRef.current.toString(),
      page: nextPage.toString(),
      accessToken: ACCESS_TOKEN
    });

    const searchUrl = `${SEARCH_URL}?${queryParams.toString()}`;

    try {
      // 创建SSE连接
      const eventSource = new EventSource(searchUrl);
      eventSourceRef.current = eventSource;

      let newResults: SearchResult[] = [];

      // 监听message事件
      eventSource.onmessage = (event) => {
        try {
          // 提取data部分
          const data = event.data.trim();
          if (!data) return;

          // 解析JSON
          const parsedData = JSON.parse(data);
          setLastIndex(parsedData.lastIndex);
          let filteredData = parsedData.data && Array.isArray(parsedData.data) ? parsedData.data.filter((item: SearchResult) => item.coverUrl) : [];
          // 合并搜索结果
          if (filteredData && Array.isArray(filteredData) && filteredData.length > 0) {
            newResults = [...newResults, ...filteredData];
            setSearchResults(prevResults => [...prevResults, ...filteredData]);
          }
        } catch (error) {
          console.error('解析SSE消息失败:', error);
        }
      };

      // 监听end事件
      eventSource.addEventListener('end', (event) => {
        try {
          const data = event.data.trim();
          if (!data) return;

          const parsedData = JSON.parse(data);


          // 更新lastIndex
          if (parsedData.lastIndex !== undefined) {
            setLastIndex(parsedData.lastIndex);
          }

          // 根据isEnd确定是否还有更多数据
          setHasMore(parsedData.isEnd === false);

          // 完成加载
          eventSource.close();
          eventSourceRef.current = null;
          setLoadingMore(false);
          setPage(nextPage);
        } catch (error) {
          console.error('解析end事件失败:', error);
        }
      });

      // 监听错误
      eventSource.onerror = (error) => {
        console.error('SSE连接错误:', error);
        eventSource.close();
        eventSourceRef.current = null;
        setLoadingMore(false);
      };

      // 监听连接关闭
      eventSource.addEventListener('complete', () => {

        eventSource.close();
        eventSourceRef.current = null;
        setLoadingMore(false);
        setPage(nextPage);

        // 如果没有收到end事件，我们假设有更多结果
        if (newResults.length > 0) {
          setHasMore(true);
        }
      });

    } catch (error) {
      console.error('创建SSE连接失败:', error);
      message.error('加载更多失败，请检查网络连接');
      setLoadingMore(false);
    }
  };

  // 将搜索结果添加到书架
  const addSearchResultToShelf = (result: SearchResult) => {
    const newBook = {
      id: Date.now(),
      title: result.name,
      author: result.author || '未知作者',
      cover: result.coverUrl,
      format: 'online',
      source: 'online',
      url: result.bookUrl,
      sourceInfo: {
        name: result.originName || "未知来源",
        url: result.origin
      },
      chapters: [], // 初始为空，后续会从URL加载章节
      lastReadPosition: 0,
      lastReadChapter: 0,
      lastReadTime: null
    };

    onAddOnlineBook(newBook);
    message.success(`已添加《${result.name}》到书架`);
  };

  return (
    <div style={{ position: 'relative', height: '70vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#fff',
          padding: '12px 0',
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        <Search
          placeholder="输入书名或作者搜索"
          enterButton="搜索"
          size="large"
          loading={searching && searchResults.length === 0}
          value={searchKeyword}
          onChange={handleKeywordChange}
          onSearch={handleSearch}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {searching && searchResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
              tip="正在搜索..."
            />
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <List
              itemLayout="vertical"
              dataSource={searchResults}
              renderItem={result => (
                <List.Item
                  key={`${result.bookUrl}-${result.origin}`}
                  actions={[
                    <Button
                      key="add"
                      type="primary"
                      size="small"
                      onClick={() => addSearchResultToShelf(result)}
                    >
                      添加到书架
                    </Button>
                  ]}
                  extra={
                    result.coverUrl ? (
                      <img
                        width={70}
                        alt={result.name}
                        src={result.coverUrl}
                        style={{ maxHeight: 100, objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.appendChild(
                            (() => {
                              const div = document.createElement('div');
                              div.style.width = '70px';
                              div.style.height = '100px';
                              div.style.backgroundColor = '#eee';
                              div.style.display = 'flex';
                              div.style.alignItems = 'center';
                              div.style.justifyContent = 'center';

                              const icon = document.createElement('span');
                              icon.className = 'anticon anticon-book';
                              icon.style.fontSize = '24px';
                              icon.style.color = '#999';

                              div.appendChild(icon);
                              return div;
                            })()
                          );
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 70,
                        height: 100,
                        background: '#eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <BookOutlined style={{ fontSize: 24, color: '#999' }} />
                      </div>
                    )
                  }
                  style={{ padding: '8px 0' }}
                >
                  <List.Item.Meta
                    title={
                      <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                        {result.name}
                      </div>
                    }
                    description={
                      <>
                        <div style={{ fontSize: '13px' }}>作者: {result.author || '未知'}</div>
                        <div style={{ fontSize: '12px', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {result.kind && (
                            <span>分类/时间: {result.kind.split(',')[0]}</span>
                          )}
                          {result.wordCount && (
                            <span>字数: {result.wordCount}</span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: '#1890ff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          <GlobalOutlined style={{ marginRight: 4 }} />
                          {result.originName || result.origin}
                        </div>
                      </>
                    }
                  />
                  {result.intro && (
                    <Tooltip
                      title={
                        <div style={{
                          width: '100%',
                          padding: '10px',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          wordWrap: 'break-word',
                          fontSize: '14px',
                          lineHeight: '1.8'
                        }}>
                          {result.intro}
                        </div>
                      }
                      placement="bottomLeft"
                      color="#fff"
                      overlayInnerStyle={{
                        color: '#333',
                        minWidth: '400px',
                        maxWidth: '600px',
                        maxHeight: '400px',
                        overflow: 'auto'
                      }}
                    >
                      <div style={{
                        fontSize: 13,
                        color: '#666',
                        margin: '4px 0 0',
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }}>
                        {result.intro}
                      </div>
                    </Tooltip>
                  )}
                </List.Item>
              )}
              footer={
                hasMore ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '12px 0',
                      cursor: 'pointer',
                      color: '#1890ff'
                    }}
                    onClick={loadMore}
                  >
                    {loadingMore ? (
                      <Spin size="small" />
                    ) : (
                      <>
                        <DownOutlined style={{ marginRight: 8 }} />
                        加载更多
                      </>
                    )}
                  </div>
                ) : null
              }
            />

            {searching && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Spin size="small" tip="搜索中..." />
              </div>
            )}
          </>
        ) : searchKeyword && !searching ? (
          <Empty description="没有找到相关书籍" />
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            color: '#999'
          }}>
            <SearchOutlined style={{ fontSize: 40, color: '#ccc', display: 'block', marginBottom: 16 }} />
            <p>输入关键词搜索书籍</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookImport;
