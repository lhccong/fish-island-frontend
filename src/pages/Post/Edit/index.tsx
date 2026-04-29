import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Form, Select, Space, message, Spin, Modal } from 'antd';
import { history, useParams } from '@umijs/max';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { listTagsVoByPageUsingPost } from '@/services/backend/tagsController';
import { editPostUsingPost, getPostVoByIdUsingGet } from '@/services/backend/postController';
import { getLoginUserUsingGet } from '@/services/backend/userController';
import { uploadFileByMinioUsingPost } from '@/services/backend/fileController';
import { BACKEND_HOST_LOCAL } from '@/constants';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import '../Create/index.less';

const { Option } = Select;

const PostEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [vd, setVd] = useState<any>(null);
  const [tags, setTags] = useState<API.TagsVO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
  const [post, setPost] = useState<API.PostVO>();
  const [currentUser, setCurrentUser] = useState<API.UserVO>();
  const [hasEditPermission, setHasEditPermission] = useState<boolean>(false);

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const res = await getLoginUserUsingGet();
      if (res.data) {
        setCurrentUser(res.data);
        return res.data;
      }
    } catch (error) {
      console.error('获取用户信息失败', error);
      message.error('获取用户信息失败');
    }
    return undefined;
  };

  // 检查用户是否有权限编辑帖子
  const checkEditPermission = (postData: API.PostVO, userData?: API.LoginUserVO) => {
    if (!userData) return false;

    // 管理员可以编辑任何帖子
    if (userData.userRole === 'admin') {
      return true;
    }

    // 普通用户只能编辑自己的帖子
    return userData.id === postData.userId;
  };

  // 获取标签列表
  const fetchTags = async () => {
    try {
      const result = await listTagsVoByPageUsingPost({
        pageSize: 20, // 获取足够多的标签
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



  // 先获取用户信息和帖子详情，再初始化编辑器
  useEffect(() => {
    setLoading(true);
    fetchTags();

    // 初始化数据
    const initData = async () => {
      if (!id) return;

      try {
        // 先获取当前用户信息
        const userData = await fetchCurrentUser();

        // 再获取帖子详情
        const res = await getPostVoByIdUsingGet({
          id: id
        } as any);

        if (res.data) {
          setPost(res.data);

          // 检查用户是否有权限编辑该帖子
          const hasPermission = checkEditPermission(res.data, userData);
          setHasEditPermission(hasPermission);

          if (!hasPermission) {
            message.error('您没有权限编辑该帖子');
            history.push(`/post/${id}`);
            return;
          }

          setContent(res.data.content || '');

          // 设置表单初始值
          form.setFieldsValue({
            title: res.data.title,
            tags: res.data.tagList,
          });

          // 获取到帖子内容后再初始化编辑器
          initEditor(res.data.content || '');
        }
      } catch (error) {
        message.error('获取帖子详情失败');
        history.push('/moments/post');
      }
    };

    initData();

  }, []);

  // 初始化编辑器
  const initEditor = (initialContent: string) => {
    // 清除可能存在的旧编辑器实例
    if (vd) {
      vd.destroy();
    }

    // 初始化编辑器配置
    const vditor = new Vditor('vditor-container', {
      height: 500,
      mode: 'wysiwyg', // 所见即所得模式
      placeholder: '请输入帖子内容...',
      value: initialContent, // 设置初始内容
      toolbar: [
        'emoji', 'headings', 'bold', 'italic', 'strike', 'link', '|',
        'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
        'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|',
        'upload', 'table', '|',
        'undo', 'redo', '|',
        'fullscreen', 'preview', 'help', 'both', 'edit-mode',
      ],
      cache: {
        enable: false, // 禁用缓存功能
      },
      counter: {
        enable: true,
        type: 'markdown',
      },
      preview: {
        hljs: {
          style: 'github',
          lineNumber: true,
        },
        markdown: {
          sanitize: false, // 不过滤HTML标签
          linkBase: '', // 链接相对基础路径
          autoSpace: true, // 自动空格
        },
        actions: ['desktop'], // 预览操作
      },
      upload: {
        accept: 'image/*', // 图片类型
        fieldName: 'file',
        url: `${BACKEND_HOST_LOCAL}/api/file/minio/upload`, // 使用系统配置的API地址
        extraData: { biz: 'user_post' }, // 要携带的额外的formData参数
        headers: {
          // 从localStorage获取token
          ...(() => {
            const tokenName = localStorage.getItem('tokenName');
            const tokenValue = localStorage.getItem('tokenValue');
            return tokenName && tokenValue ? { [tokenName]: tokenValue } : {};
          })()
        },
        error: (msg: string) => {
          console.error('图片上传错误:', msg);
          message.error(`图片上传失败: ${msg}`);
        },
        filename(name) {  // 过滤特殊字符
          return name
            .replace(/[^(a-zA-Z0-9\u4e00-\u9fa5\.)]/g, "")
            .replace(/[\?\\/:|<>\*\[\]\(\)\$%\{\}@~]/g, "")
            .replace("/\\s/g", "");
        },
        max: 5 * 1024 * 1024, // 最大5MB
        multiple: false,
        withCredentials: true,
        // 图片上传校验
        validate(files) {
          const isLt5M = files[0].size / 1024 / 1024 < 5;
          if (!isLt5M) {
            message.error('上传图片大小不能超过 5MB!');
            return false;
          }
          if (!files[0].type.includes('image')) {
            message.error('仅支持上传图片！');
            return false;
          }
          return true;
        },
        format(files, responseText) {
          try {
            console.log('上传响应:', responseText);
            const res = JSON.parse(responseText);

            if (res.code === 0 && res.data) {
              message.success('图片上传成功');

              // 延迟执行，确保编辑器能正确处理图片
              setTimeout(() => {
                if (vd) {
                  // 获取当前内容并刷新
                  const currentContent = vd.getValue();
                  vd.setValue(currentContent);
                }
              }, 100);

              // 返回符合Vditor要求的格式
              return JSON.stringify({
                msg: '',
                code: 0,
                data: {
                  errFiles: [],
                  succMap: {
                    [files[0].name]: res.data
                  }
                }
              });
            } else {
              message.error(res.message || '图片上传失败');
              return JSON.stringify({
                msg: res.message || '上传失败',
                code: 1,
                data: null
              });
            }
          } catch (error) {
            console.error('图片上传解析出错:', error);
            message.error('图片上传出错');
            return JSON.stringify({
              msg: '解析错误',
              code: 1,
              data: null
            });
          }
        }
      },
      after: () => {
        setVd(vditor);
        setLoading(false);
      },
    });
    return () => {
      if (vditor) {
        vditor.destroy();
      }
    };
  };

  // 准备更新，检查内容并显示详情模态框
  const handlePrepareSubmit = () => {
    if (!vd) {
      message.error('编辑器未初始化');
      return;
    }

    const editorContent = vd.getValue();
    if (!editorContent || editorContent.trim() === '') {
      message.error('帖子内容不能为空');
      return;
    }

    setContent(editorContent);
    // 显示详情模态框
    setShowDetailsModal(true);
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (!id || !post) return;

    // 再次检查权限
    if (!hasEditPermission) {
      message.error('您没有权限编辑该帖子');
      setShowDetailsModal(false);
      history.push(`/post/${id}`);
      return;
    }

    setSubmitting(true);
    try {
      // 使用字符串ID，避免精度丢失
      const postData: API.PostEditRequest  = {
        id: id, // 直接使用字符串ID
        title: values.title,
        content: content,
        tags: values.tags,
      };

      const result = await editPostUsingPost(postData);
      if (result.code === 0 && result.data) {
        message.success('帖子更新成功');
        setShowDetailsModal(false);
        history.push(`/post/${id}`);
      } else {
        message.error(result.message || '更新失败，请重试');
      }
    } catch (error) {
      console.error('更新帖子失败:', error);
      message.error('更新失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="post-create-container">
      <Card className="post-create-card">
        <div className="post-create-header">
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push(`/post/${id}`)}
            className="back-button"
          >
            返回帖子详情
          </Button>
          <h2>编辑帖子</h2>
        </div>

        <Spin spinning={loading}>
          <div className="editor-container">
            <div id="vditor-container" className="vditor-container"></div>

            <div className="editor-actions">
              <Space>
                <Button onClick={() => history.push(`/post/${id}`)}>取消</Button>
                <Button type="primary" onClick={handlePrepareSubmit}>
                  保存修改
                </Button>
              </Space>
            </div>
          </div>
        </Spin>
      </Card>

      {/* 帖子详情模态框 */}
      <Modal
        title="确认帖子信息"
        open={showDetailsModal}
        footer={null}
        onCancel={() => setShowDetailsModal(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="post-form"
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入帖子标题' }]}
          >
            <Input placeholder="请输入帖子标题" maxLength={100} showCount />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
            rules={[{ required: true, message: '请选择至少一个标签' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择标签"
              style={{ width: '100%' }}
              maxTagCount={5}
            >
              {tags.map(tag => (
                <Option key={tag.id} value={tag.tagsName || ''}>
                  {tag.tagsName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item className="post-form-buttons">
            <Space>
              <Button onClick={() => setShowDetailsModal(false)}>返回编辑</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                保存修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PostEdit;
