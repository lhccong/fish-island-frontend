import React, {useEffect, useState} from 'react';
import {Avatar, Badge, Button, Card, Input, List, message, Modal, Skeleton, Spin, Tabs, Tag} from 'antd';
import type {SizeType} from 'antd/es/config-provider/SizeContext';
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  FireOutlined,
  LikeFilled,
  LikeOutlined,
  MessageOutlined,
  PlusOutlined,
  RiseOutlined,
  SearchOutlined,
  UpOutlined,
  UserOutlined
} from '@ant-design/icons';
import {history, Link} from '@umijs/max';
import {deletePostUsingPost1, listPostVoByPageUsingPost} from '@/services/backend/postController';
import {listTagsVoByPageUsingPost} from '@/services/backend/tagsController';
import {getLoginUserUsingGet} from '@/services/backend/userController';
import './index.less';
import moment from 'moment';
import InfiniteScroll from 'react-infinite-scroll-component';
import {doThumbUsingPost1} from "@/services/backend/postThumbController";

const {TabPane} = Tabs;
const {Search} = Input;

const PostPage: React.FC = () => {
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [posts, setPosts] = useState<API.PostVO[]>([]);
  const [hotTopics, setHotTopics] = useState<API.HotPostDataVO[]>([]);
  const [tags, setTags] = useState<API.TagsVO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<string>('latest');
  const [currentUser, setCurrentUser] = useState<API.UserVO>();
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  const [myPostsVisible, setMyPostsVisible] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });
  const [hasMore, setHasMore] = useState<boolean>(true);

  // 检测是否为移动设备
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const res = await getLoginUserUsingGet();
      if (res.data) {
        setCurrentUser(res.data);
      }
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  };

  // 获取标签列表
  const fetchTags = async () => {
    try {
      const result = await listTagsVoByPageUsingPost({
        pageSize: 20, // 一次性获取足够多的标签
        current: 1,
      });
      if (result.data?.records) {
        setTags(result.data.records);
      }
    } catch (error) {
      console.error('获取标签列表失败:', error);
      message.error('获取标签列表失败');
    }
  };

  // 根据标签获取颜色
  const getTagColor = (tag: API.TagsVO | undefined) => {
    // 如果标签有自定义颜色，则使用自定义颜色
    if (tag && tag.color) {
      return tag.color;
    }
    // 默认颜色
    return 'blue';
  };

  // 渲染标签图标
  const renderTagIcon = (tag: API.TagsVO | undefined) => {
    if (tag && tag.icon) {
      // 如果是URL图标，渲染为img标签
      if (tag.icon.startsWith('http')) {
        return <img src={tag.icon} alt={tag.tagsName} style={{width: 16, height: 16, marginRight: 4}}/>;
      }
      // 否则可能是图标名称，可以根据需求处理
      return <span style={{marginRight: 4}}>{tag.icon}</span>;
    }
    return null;
  };

  // 获取热门话题
  const fetchHotTopics = async () => {
    try {
      // 使用热门讨论的参数获取热门话题
      const params: API.PostQueryRequest = {
        current: 1,
        pageSize: 5,
        sortField: 'thumbNum', // 按点赞数排序
        sortOrder: 'descend',
      };

      const result = await listPostVoByPageUsingPost(params);
      if (result.data?.records) {
        setHotTopics(result.data.records.map(post => ({
          title: post.title || '',
          url: `/post/${post.id}`,
          followerCount: post.commentNum || 0, // 使用评论数作为参与人数
        })));
      }
    } catch (error) {
      console.error('获取热门话题失败:', error);
      message.error('获取热门话题失败');
    }
  };

  // 获取帖子列表
  const fetchPosts = async () => {
    setLoading(true);
    try {
      // 构建查询参数
      const params: API.PostQueryRequest = {
        current: pagination.current,
        pageSize: pagination.pageSize,
        searchText: searchQuery || undefined,
      };

      // 根据当前选中的标签筛选
      if (selectedTag) {
        params.tags = [tags.find(tag => tag.id === selectedTag)?.tagsName || ''];
      }

      // 根据当前选中的Tab设置排序
      if (currentTab === 'hot') {
        params.sortField = 'thumbNum'; // 按点赞数排序
        params.sortOrder = 'descend';
      } else if (currentTab === 'featured') {
        params.isFeatured = 1; // 精华内容
      } else if (currentTab === 'my') {
        // 我的帖子，传递当前用户ID
        if (currentUser?.id) {
          params.userId = currentUser.id;
        } else {
          // 如果用户未登录，显示提示信息
          message.warning('请先登录查看我的帖子');
          setMyPostsVisible(false);
          return;
        }
        params.sortField = 'createTime';
        params.sortOrder = 'descend';
      } else {
        // 默认按创建时间排序
        params.sortField = 'createTime';
        params.sortOrder = 'descend';
      }

      const result = await listPostVoByPageUsingPost(params);
      if (result.data) {
        // 如果是第一页，直接设置数据
        if (pagination.current === 1) {
          setPosts(result.data.records || []);
        } else {
          // 否则，追加数据
          setPosts(prevPosts => [...prevPosts, ...(result.data?.records || [])]);
        }

        setPagination({
          ...pagination,
          total: result.data.total || 0,
        });

        // 判断是否还有更多数据
        setHasMore((result.data.records?.length || 0) > 0 && (pagination.current * pagination.pageSize) < (result.data.total || 0));
      }
    } catch (error) {
      console.error('获取帖子列表失败:', error);
      message.error('获取帖子列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 判断当前用户是否有权限删除帖子
  const canDeletePost = (post: API.PostVO) => {
    if (!currentUser) return false;

    // 管理员可以删除所有帖子
    if (currentUser.userRole === 'admin') return true;

    // 普通用户只能删除自己的帖子
    return currentUser.id === post.userId;
  };

  // 显示删除确认对话框
  const showDeleteConfirm = (postId: any) => {
    // 确保ID是字符串类型
    setPostToDelete(String(postId));
    setDeleteModalVisible(true);
  };

  // 处理删除帖子
  const handleDeletePost = async () => {
    if (!postToDelete) return;

    setDeleteLoading(true);
    try {
      // 直接使用字符串ID，避免精度丢失
      const res = await deletePostUsingPost1({id: String(postToDelete)});

      if (res.data) {
        message.success('帖子删除成功');
        // 删除成功后刷新帖子列表
        fetchPosts();
      } else {
        message.error('帖子删除失败');
      }
    } catch (error) {
      console.error('删除帖子失败:', error);
      message.error('删除帖子失败');
    } finally {
      setDeleteLoading(false);
      setDeleteModalVisible(false);
      setPostToDelete(null);
    }
  };

  // 切换搜索框显示/隐藏
  const toggleSearchVisible = () => {
    setSearchVisible(!searchVisible);
  };

  // 初始化数据
  useEffect(() => {
    fetchTags();
    fetchHotTopics();
    fetchCurrentUser();
  }, []);

  // 当分页、标签选择、搜索条件或Tab变化时，重新获取帖子列表
  useEffect(() => {
    fetchPosts();
  }, [pagination.current, pagination.pageSize, selectedTag, searchQuery, currentTab]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPagination({...pagination, current: 1}); // 重置到第一页
    setPosts([]); // 清空现有数据
    setHasMore(true); // 重置hasMore状态
  };

  // 处理Tab切换
  const handleTabChange = (key: string) => {
    setCurrentTab(key);
    setPagination({...pagination, current: 1}); // 重置到第一页
    setPosts([]); // 清空现有数据
    setHasMore(true); // 重置hasMore状态

    // 如果切换到"我的帖子"标签，检查用户是否已登录
    if (key === 'my' && !currentUser) {
      message.warning('请先登录查看我的帖子');
      // 可以选择跳转到登录页面
      // history.push('/user/login');
    }
  };

  // 加载更多数据
  const loadMoreData = () => {
    if (loading) return;
    setPagination(prev => ({...prev, current: prev.current + 1}));
  };

  // 处理分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination({
      ...pagination,
      current: page,
      pageSize: pageSize || pagination.pageSize,
    });
  };

  // 跳转到发布帖子页面
  const handleCreatePost = () => {
    history.push('/post/create');
  };

  // 格式化时间
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return moment(timeString).format('YYYY-MM-DD HH:mm');
  };

  // 处理标签点击
  const handleTagClick = (tagId: number | null) => {
    setSelectedTag(tagId);
    setPagination({...pagination, current: 1}); // 重置到第一页
    setPosts([]); // 清空现有数据
    setHasMore(true); // 重置hasMore状态
  };

  // 渲染骨架屏
  const renderPostSkeleton = () => {
    return Array(3).fill(null).map((_, index) => (
      <div key={index} className="skeleton-item">
        <div className="skeleton-header">
          <Skeleton.Avatar active size={isMobile ? 32 : 40} className="skeleton-avatar"/>
          <div className="skeleton-info">
            <Skeleton.Input style={{width: '150px', marginBottom: '8px'}} active/>
            <Skeleton.Input style={{width: '100px'}} active/>
          </div>
        </div>
        <Skeleton title={{width: '80%'}} paragraph={{rows: 2}} active/>
      </div>
    ));
  };

  useEffect(() => {
    // 检测窗口宽度，设置是否为移动设备
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 576);
    };

    // 初始检测
    checkMobile();

    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);

    // 组件卸载时移除监听
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 在组件内添加点赞处理函数
  const handleThumbPost = async (postId: string, currentThumbStatus: boolean, currentThumbNum: number) => {
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }

    try {
      await doThumbUsingPost1({
        postId: postId
      } as any);

      // 更新该帖子的点赞状态和数量
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            hasThumb: !currentThumbStatus,
            thumbNum: currentThumbStatus ? (currentThumbNum - 1) : (currentThumbNum + 1)
          };
        }
        return post;
      }));
    } catch (error) {
      message.error('操作失败');
    }
  };

  return (
    <div className="post-page">
      {/* 删除确认对话框 */}
      <Modal
        title="删除确认"
        open={deleteModalVisible}
        onOk={handleDeletePost}
        onCancel={() => setDeleteModalVisible(false)}
        okText="确认删除"
        cancelText="取消"
        confirmLoading={deleteLoading}
      >
        <p>确定要删除这篇帖子吗？删除后将无法恢复。</p>
      </Modal>

      <div className="post-container">
        <div className="post-main">
          <Card className="post-filter-card">
            <div className="filter-container">

              <div className="category-filter">
                <span className="filter-label">标签：</span>
                <div className="tag-container">
                  <Tag
                    color="orange"
                    className={selectedTag === null ? 'category-tag active' : 'category-tag'}
                    onClick={() => handleTagClick(null)}
                  >
                    全部
                  </Tag>
                  {tags.map(tag => (
                    <Tag
                      key={tag.id}
                      color={getTagColor(tag)}
                      className={selectedTag === tag.id ? 'category-tag active' : 'category-tag'}
                      onClick={() => handleTagClick(tag.id || null)}
                    >
                      {renderTagIcon(tag)}
                      {tag.tagsName}
                    </Tag>
                  ))}
                </div>
              </div>
              {/* 搜索框开关 */}
              <div className="search-toggle">
                <Button
                  type="link"
                  onClick={toggleSearchVisible}
                  icon={searchVisible ? <UpOutlined/> : <FilterOutlined/>}
                >
                  {searchVisible ? '收起搜索' : '展开搜索'}
                </Button>
              </div>

              {/* 可收起的搜索框 */}
              {searchVisible && (
                <div className="post-search">
                  <Input
                    placeholder="搜索帖子"
                    prefix={<SearchOutlined className="search-icon"/>}
                    allowClear
                    className="search-input"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onPressEnter={() => handleSearch(searchText)}
                  />
                  <Button
                    type="primary"
                    icon={<SearchOutlined/>}
                    className="search-button"
                    onClick={() => handleSearch(searchText)}
                  >
                    {!isMobile && '搜索'}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="post-list-card">
            <div className="post-list-header">
              <div className="tabs-container">
                <Tabs
                  defaultActiveKey="latest"
                  className="post-tabs"
                  activeKey={currentTab}
                  onChange={handleTabChange}
                  size={isMobile ? "small" as SizeType : "middle" as SizeType}
                >
                  <TabPane
                    tab={<span>{!isMobile && <ClockCircleOutlined/>} 最新发布</span>}
                    key="latest"
                  />
                  <TabPane
                    tab={<span>{!isMobile && <FireOutlined/>} 热门讨论</span>}
                    key="hot"
                  />
                  <TabPane
                    tab={<span>{!isMobile && <RiseOutlined/>} 精华内容</span>}
                    key="featured"
                  />
                  <TabPane
                    tab={<span>{!isMobile && <UserOutlined/>} 我的帖子</span>}
                    key="my"
                  />
                </Tabs>
              </div>
              <div className="button-container">
                <Button
                  type="primary"
                  icon={<PlusOutlined/>}
                  onClick={handleCreatePost}
                >
                  {isMobile ? "发布" : "发布帖子"}
                </Button>
              </div>
            </div>

            <div id="scrollableDiv" style={{overflow: 'auto', padding: '0 16px'}}>
              {loading && posts.length === 0 ? (
                renderPostSkeleton()
              ) : (
                <InfiniteScroll
                  dataLength={posts.length}
                  next={loadMoreData}
                  hasMore={hasMore}
                  loader={
                    <div className="loading-container">
                      <Spin size="large" tip="加载中..."/>
                    </div>
                  }
                  endMessage={
                    <div className="loading-container" style={{color: '#999'}}>
                      没有更多帖子了
                    </div>
                  }
                  scrollableTarget="scrollableDiv"
                >
                  <List
                    itemLayout="vertical"
                    size="large"
                    dataSource={posts}
                    renderItem={item => (
                      <List.Item
                        key={item.id}
                        className="post-item"
                        onClick={() => history.push(`/post/${String(item.id)}`)}
                        style={{cursor: 'pointer'}}
                        actions={[
                          // 在移动端不显示阅读量、点赞数和评论数
                          !isMobile &&
                          <span onClick={(e) => e.stopPropagation()}><EyeOutlined/> 浏览 {item.viewNum || 0}</span>,
                          !isMobile &&
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleThumbPost(String(item.id), item.hasThumb || false, item.thumbNum || 0);
                            }}
                            className={item.hasThumb ? 'like-button active' : 'like-button'}
                          >
                            {item.hasThumb ? <LikeFilled/> : <LikeOutlined/>} 点赞 {item.thumbNum || 0}
                          </span>,
                          !isMobile &&
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              history.push(`/post/${String(item.id)}`);
                            }}
                            className="comment-link"
                          >
                            <MessageOutlined/> 评论 {item.commentNum || 0}
                          </span>,
                          canDeletePost(item) && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                history.push(`/post/edit/${item.id}`);
                              }}
                              className="edit-action"
                            >
                              <EditOutlined style={{color: '#1890ff'}}/> {isMobile ? '' : '编辑'}
                            </span>
                          ),
                          canDeletePost(item) && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                // 直接传递原始ID，避免Number()转换导致精度丢失
                                showDeleteConfirm(item.id);
                              }}
                              className="delete-action"
                            >
                              <DeleteOutlined style={{color: '#ff4d4f'}}/> {isMobile ? '' : '删除'}
                            </span>
                          ),
                        ].filter(Boolean)}
                      >
                        <div className="post-item-header">
                          <Avatar src={item.user?.userAvatar || 'https://joeschmoe.io/api/v1/random'}
                                  size={isMobile ? 32 : 40}/>
                          <div className="post-author-info">
                            <div className="author-name">
                              <span>{item.user?.userName || '匿名用户'}</span>
                              <span className="post-time">{formatTime(item.createTime)}</span>
                            </div>
                            <div className="post-tags">
                              {item.tagList && item.tagList.map((tag, index) => {
                                // 查找对应的标签对象以获取颜色和图标
                                const tagObj = tags.find(t => t.tagsName === tag);
                                const color = tagObj ? getTagColor(tagObj) : 'blue';
                                // 在移动设备上限制显示的标签数量
                                if (isMobile && index > 1) return null;
                                return (
                                  <Tag
                                    key={index}
                                    color={color}
                                    className="category-tag-small"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {renderTagIcon(tagObj)}
                                    {tag}
                                  </Tag>
                                );
                              })}
                              {/* 如果在移动设备上有更多标签，显示+N */}
                              {isMobile && item.tagList && item.tagList.length > 2 && (
                                <Tag className="category-tag-small">
                                  +{item.tagList.length - 2}
                                </Tag>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="post-content-wrapper">
                          <div className="post-title">
                            {item.title}
                          </div>

                          {item.latestComment && (
                            <div className="post-content hot-comment">
                              {item.latestComment.content}
                            </div>
                          )}
                        </div>
                      </List.Item>
                    )}
                  />
                </InfiniteScroll>
              )}
            </div>
          </Card>
        </div>

        <div className="post-sidebar">
          <Card title="热门话题" className="hot-topics-card">
            <List
              size="small"
              dataSource={hotTopics}
              renderItem={(item, index) => (
                <List.Item className="hot-topic-item">
                  <Badge
                    count={index + 1}
                    style={{
                      backgroundColor: index < 3 ? '#ff4d4f' : '#999',
                      marginRight: '8px'
                    }}
                  />
                  <Link to={item.url || '#'}>{item.title}</Link>
                  <span className="topic-count">{item.followerCount || 0}人参与</span>
                </List.Item>
              )}
            />
          </Card>

          <Card title="社区公告" className="announcement-card">
            <p>🎉 欢迎来到摸鱼论坛！</p>
            <p>🚀 新功能上线：表情包发送功能已开放</p>
            <p>📢 社区规则已更新，请遵守社区规范</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PostPage;
