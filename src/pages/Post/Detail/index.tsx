import React, {useEffect, useState, useRef} from 'react';
import {useParams, history, Link} from 'umi';
import {Card, Avatar, Typography, Space, Divider, List, Button, message, Spin, Input, Pagination, Modal, Popover, Image, Alert, Tooltip, Dropdown, Menu} from 'antd';
import {
  LikeOutlined,
  LikeFilled,
  StarOutlined,
  StarFilled,
  MessageOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  UpOutlined,
  DownOutlined,
  SmileOutlined,
  PictureOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  MoreOutlined
} from '@ant-design/icons';
import {
  getPostVoByIdUsingGet,
  deletePostUsingPost1,
  randomThumbUserUsingPost,
  getPostRewardTokenUsingGet,
  getCurrentRewardUserUsingGet
} from '@/services/backend/postController';
import {doThumbUsingPost1} from '@/services/backend/postThumbController';
import {doPostFavourUsingPost} from '@/services/backend/postFavourController';
import {
  addCommentUsingPost,
  getCommentTreeUsingPost,
  getChildCommentsUsingPost,
  deletePostUsingPost as deleteCommentUsingPost
} from '@/services/backend/commentController';
import {doThumbUsingPost} from '@/services/backend/commentThumbController';
import {getLoginUserUsingGet} from '@/services/backend/userController';
import {uploadFileByMinioUsingPost} from '@/services/backend/fileController';
import Vditor from 'vditor';
import moment from 'moment';
import 'moment/locale/zh-cn';
import 'vditor/dist/index.css';
import './index.less';
import EmoticonPicker from '@/components/EmoticonPicker';
import data from '@emoji-mart/data';
import zhData from '@emoji-mart/data/i18n/zh.json';
import Picker from '@emoji-mart/react';

const {Title, Text, Paragraph} = Typography;
const {TextArea} = Input;

moment.locale('zh-cn');

// 添加 emoji 类型定义
interface EmojiData {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
}

// 扩展 CommentNodeVO 类型
interface ExtendedCommentNodeVO extends API.CommentNodeVO {
  hasThumb?: boolean;
  showReplyBox?: boolean;
  replyContent?: string;
  replyLoading?: boolean;
  children?: ExtendedCommentNodeVO[];
  previewChildren?: ExtendedCommentNodeVO[];
  childrenExpanded?: boolean; // 控制子评论的展开/收起状态
  hasLoadedAllChildren?: boolean; // 标记是否已加载全部子评论
  parentComment?: {
    user?: {
      userName?: string;
    }
  };
}

const PostDetail: React.FC = () => {
  const {id} = useParams<{ id: string }>();
  const [post, setPost] = useState<API.PostVO>();
  const [comments, setComments] = useState<ExtendedCommentNodeVO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [commentLoading, setCommentLoading] = useState<boolean>(false);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [commentContent, setCommentContent] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<API.UserVO>();
  const [commentPagination, setCommentPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [commentCollapsed, setCommentCollapsed] = useState<boolean>(false);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  // 添加表情相关状态
  const [isEmoticonPickerVisible, setIsEmoticonPickerVisible] = useState<boolean>(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState<boolean>(false);
  const inputRef = useRef<any>(null);
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [replyPastedImages, setReplyPastedImages] = useState<{[commentId: string]: string[]}>({});
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [uploadingReplyImage, setUploadingReplyImage] = useState<{[commentId: string]: boolean}>({});
  const [randomThumbLoading, setRandomThumbLoading] = useState<boolean>(false);
  const [randomThumbModalVisible, setRandomThumbModalVisible] = useState<boolean>(false);
  const [randomIndexInput, setRandomIndexInput] = useState<string>('');
  const [rewardTokenLoading, setRewardTokenLoading] = useState<boolean>(false);
  const [rewardUser, setRewardUser] = useState<API.UserRewardVO | null>(null);
  const [rewardUserLoading, setRewardUserLoading] = useState<boolean>(false);

  // 处理图片压缩
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 如果图片尺寸过大，先缩小尺寸
          const maxDimension = 2000; // 最大尺寸
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建画布上下文'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // 尝试不同的质量级别，直到文件大小小于 1MB
          let quality = 0.9;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          while (compressedDataUrl.length > 1024 * 1024 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // 将 DataURL 转换回 File 对象
          const arr = compressedDataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);

          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }

          const compressedFile = new File([u8arr], file.name, { type: mime || 'image/jpeg' });
          resolve(compressedFile);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
    });
  };

  // 处理图片上传 - 主评论
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);

      // 如果文件大小超过 1MB，进行压缩
      if (file.size > 1024 * 1024) {
        const compressedFile = await compressImage(file);
        if (compressedFile) {
          file = compressedFile;
        }
      }

      // 调用上传接口
      const res = await uploadFileByMinioUsingPost(
        { biz: 'user_post' }, // 业务标识参数
        {}, // body 参数
        file, // 文件参数
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!res.data) {
        throw new Error('图片上传失败');
      }

      // 添加上传的图片URL到预览列表
      setPastedImages([...pastedImages, res.data]);
    } catch (error) {
      message.error(`上传失败：${error}`);
    } finally {
      setUploadingImage(false);
    }
  };

  // 处理粘贴事件 - 主评论
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          await handleImageUpload(blob);
        }
        break;
      }
    }
  };

  // 处理删除粘贴图片
  const handleRemoveImage = (index: number) => {
    setPastedImages(pastedImages.filter((_, i) => i !== index));
  };

  // 处理图片上传 - 回复评论
  const handleReplyImageUpload = async (commentId: number | string, file: File) => {
    const commentIdStr = commentId.toString();
    try {
      // 设置对应评论的上传状态
      setUploadingReplyImage(prev => ({
        ...prev,
        [commentIdStr]: true
      }));

      // 如果文件大小超过 1MB，进行压缩
      if (file.size > 1024 * 1024) {
        const compressedFile = await compressImage(file);
        if (compressedFile) {
          file = compressedFile;
        }
      }

      // 调用上传接口
      const res = await uploadFileByMinioUsingPost(
        { biz: 'post_comment_reply' }, // 业务标识参数
        {}, // body 参数
        file, // 文件参数
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!res.data) {
        throw new Error('图片上传失败');
      }

      // 添加上传的图片URL到对应评论的预览列表
      setReplyPastedImages(prev => {
        const currentImages = prev[commentIdStr] || [];
        return {
          ...prev,
          [commentIdStr]: [...currentImages, res.data]
        };
      });
    } catch (error) {
      message.error(`上传失败：${error}`);
    } finally {
      setUploadingReplyImage(prev => ({
        ...prev,
        [commentIdStr]: false
      }));
    }
  };

  // 处理粘贴事件 - 回复评论
  const handleReplyPaste = async (commentId: number | string, e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          await handleReplyImageUpload(commentId, blob);
        }
        break;
      }
    }
  };

  // 处理删除回复中的粘贴图片
  const handleRemoveReplyImage = (commentId: number | string, index: number) => {
    const commentIdStr = commentId.toString();
    setReplyPastedImages(prev => {
      const currentImages = [...(prev[commentIdStr] || [])];
      currentImages.splice(index, 1);
      return {
        ...prev,
        [commentIdStr]: currentImages
      };
    });
  };

  // 格式化时间
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    const date = moment(timeString);
    const now = moment();

    if (now.diff(date, 'days') < 1) {
      // 今天内的时间显示为"xx小时前"或"xx分钟前"
      return date.fromNow();
    } else if (now.diff(date, 'days') < 7) {
      // 一周内的显示为"周几 HH:mm"
      return date.format('dddd HH:mm');
    } else if (now.year() === date.year()) {
      // 今年内的显示为"MM-DD HH:mm"
      return date.format('MM-DD HH:mm');
    } else {
      // 往年的显示为"YYYY-MM-DD HH:mm"
      return date.format('YYYY-MM-DD HH:mm');
    }
  };

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const res = await getLoginUserUsingGet();
      if (res.data) {
        setCurrentUser(res.data);
      }
    } catch (error) {
    }
  };

  // 获取帖子详情
  const fetchPostDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const res = await getPostVoByIdUsingGet({
        id: id
      } as any);

      if (res.data) {
        setPost(res.data);
        // 使用 Vditor 预览模式渲染内容
        setTimeout(() => {
          if (contentRef.current && res.data?.content) {
            Vditor.preview(contentRef.current, res.data?.content, {
              mode: 'light',
              hljs: {
                style: 'github',
                lineNumber: true,
              },
              speech: {
                enable: true,
              },
              anchor: 1,
              after() {
                // 渲染完成后的回调
                contentRef.current?.querySelectorAll('pre code').forEach((block) => {
                  // 为代码块添加复制按钮
                  Vditor.codeRender(block as HTMLElement);
                });

                // 处理表格和图片，确保不会导致横向滚动
                contentRef.current?.querySelectorAll('table').forEach((table) => {
                  table.style.maxWidth = '100%';
                  table.style.display = 'block';
                  table.style.overflowX = 'auto';
                  table.style.width = 'fit-content';
                  table.style.margin = '0 auto';
                });

                contentRef.current?.querySelectorAll('img').forEach((img) => {
                  img.style.maxWidth = '100%';
                  img.style.height = 'auto';
                  // 防止图片加载后撑开容器
                  img.addEventListener('load', () => {
                    img.style.maxWidth = '100%';
                  });
                });

                // 处理可能导致溢出的元素
                contentRef.current?.querySelectorAll('iframe, video, embed, object').forEach((elem) => {
                  elem.setAttribute('style', 'max-width: 100%; width: 100%;');
                });

                // 处理长链接文本
                contentRef.current?.querySelectorAll('a').forEach((link) => {
                  link.style.wordBreak = 'break-word';
                  link.style.overflowWrap = 'break-word';
                });

                // 处理代码块
                contentRef.current?.querySelectorAll('pre').forEach((pre) => {
                  pre.style.maxWidth = '100%';
                  pre.style.overflowX = 'auto';
                  pre.style.whiteSpace = 'pre-wrap';
                  pre.style.wordBreak = 'break-word';
                });
              }
            });
          }
        }, 0);
      }
    } catch (error) {
      message.error('获取帖子详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取评论列表
  const fetchComments = async () => {
    if (!id) return;

    setCommentsLoading(true);
    try {
      const res = await getCommentTreeUsingPost({
        postId: id as unknown as number,
        current: commentPagination.current,
        pageSize: commentPagination.pageSize,
        sortField: 'createTime',
        sortOrder: 'descend'
      });

      if (res.data) {
        // 将API返回的评论数据转换为ExtendedCommentNodeVO类型
        const commentsList = res.data.records || [];
        // 为每个评论添加额外的UI状态属性
        const enhancedComments = commentsList.map((comment: any) => ({
          ...comment,
          showReplyBox: false,
          replyContent: '',
          replyLoading: false,
          childrenExpanded: true, // 默认展开子评论
          hasLoadedAllChildren: false, // 默认未加载全部子评论
          // 确保 childCount 存在，如果API没有返回，则使用 previewChildren 的长度作为默认值
          childCount: comment.childCount !== undefined ? comment.childCount : (comment.previewChildren?.length || 0),
          // 处理previewChildren
          previewChildren: comment.previewChildren ? comment.previewChildren.map((child: any) => ({
            ...child,
            showReplyBox: false,
            replyContent: '',
            replyLoading: false
          })) : [],
          // 处理children
          children: comment.children ? comment.children.map((child: any) => ({
            ...child,
            showReplyBox: false,
            replyContent: '',
            replyLoading: false
          })) : []
        }));
        setComments(enhancedComments);
        setCommentPagination({
          ...commentPagination,
          total: res.data.total || 0
        });
      }
    } catch (error) {
      message.error('获取评论失败');
    } finally {
      setCommentsLoading(false);
    }
  };

  // 加载更多子评论
  const loadMoreChildComments = async (rootId: number | string) => {
    if (!id) return;

    try {
      const res = await getChildCommentsUsingPost({
        rootId: rootId as any,
        current: 1,
        pageSize: 20, // 一次性获取较多子评论
        sortField: 'createTime',
        sortOrder: 'ascend'
      });

      if (res.data && res.data.records) {
        // 处理子评论数据
        const childComments = res.data.records.map((child: any) => ({
          ...child,
          showReplyBox: false,
          replyContent: '',
          replyLoading: false
        }));

        // 更新评论列表中对应根评论的子评论
        setComments(comments.map(comment => {
          if (comment.id === rootId) {
            return {
              ...comment,
              children: childComments,
              previewChildren: [], // 清空预览子评论，避免重复显示
              hasLoadedAllChildren: true // 标记已加载全部子评论
            };
          }
          return comment;
        }));
      }
    } catch (error) {
      message.error('获取子评论失败');
    }
  };

  // 处理评论分页变化
  const handleCommentPageChange = (page: number) => {
    setCommentPagination({
      ...commentPagination,
      current: page
    });
  };

  // 点赞帖子
  const handleThumbPost = async () => {
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }
    if (!id || !post) return;

    try {
      await doThumbUsingPost1({
        postId: id
      } as any);

      // 不刷新整个页面，只更新点赞状态和数量
      setPost({
        ...post,
        hasThumb: !post.hasThumb,
        thumbNum: post.hasThumb ? (post.thumbNum || 1) - 1 : (post.thumbNum || 0) + 1
      });
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 收藏帖子
  const handleFavourPost = async () => {
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }
    if (!id || !post) return;

    try {
      await doPostFavourUsingPost({
        postId: id
      } as any);

      // 不刷新整个页面，只更新收藏状态和数量
      setPost({
        ...post,
        hasFavour: !post.hasFavour,
        favourNum: post.hasFavour ? (post.favourNum || 1) - 1 : (post.favourNum || 0) + 1
      });
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 点赞评论
  const handleThumbComment = async (commentId: number | string) => {
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }
    try {
      await doThumbUsingPost({
        commentId: commentId
      } as any);

      // 不刷新整个页面，只更新该评论的点赞状态和数量
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            hasThumb: !comment.hasThumb,
            thumbNum: comment.hasThumb ? (comment.thumbNum || 1) - 1 : (comment.thumbNum || 0) + 1
          };
        }
        // 检查子评论
        if (comment.children && comment.children.length > 0) {
          return {
            ...comment,
            children: comment.children.map(child => {
              if (child.id === commentId) {
                return {
                  ...child,
                  hasThumb: !child.hasThumb,
                  thumbNum: child.hasThumb ? (child.thumbNum || 1) - 1 : (child.thumbNum || 0) + 1
                };
              }
              return child;
            })
          };
        }
        // 检查预览子评论
        if (comment.previewChildren && comment.previewChildren.length > 0) {
          return {
            ...comment,
            previewChildren: comment.previewChildren.map(child => {
              if (child.id === commentId) {
                return {
                  ...child,
                  hasThumb: !child.hasThumb,
                  thumbNum: child.hasThumb ? (child.thumbNum || 1) - 1 : (child.thumbNum || 0) + 1
                };
              }
              return child;
            })
          };
        }
        return comment;
      }));
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 切换回复框显示状态
  const toggleReplyBox = (commentId: number | string) => {

    // 清空该评论的粘贴图片
    setReplyPastedImages(prev => {
      const newImages = {...prev};
      delete newImages[commentId.toString()];
      return newImages;
    });

    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        const newShowReplyBox = !comment.showReplyBox;

        return {
          ...comment,
          showReplyBox: newShowReplyBox,
          // 如果是打开回复框，则初始化回复内容为空字符串
          replyContent: newShowReplyBox ? '' : comment.replyContent
        };
      }

      // 检查子评论
      if (comment.children && comment.children.length > 0) {
        let found = false;
        const updatedChildren = comment.children.map(child => {
          if (child.id === commentId) {
            found = true;
            const newShowReplyBox = !child.showReplyBox;

            return {
              ...child,
              showReplyBox: newShowReplyBox,
              // 如果是打开回复框，则初始化回复内容为空字符串
              replyContent: newShowReplyBox ? '' : child.replyContent
            };
          }
          return child;
        });

        if (found) {
          return {
            ...comment,
            children: updatedChildren
          };
        }
      }

      // 检查预览子评论
      if (comment.previewChildren && comment.previewChildren.length > 0) {
        let found = false;
        const updatedPreviewChildren = comment.previewChildren.map(child => {
          if (child.id === commentId) {
            found = true;
            const newShowReplyBox = !child.showReplyBox;

            return {
              ...child,
              showReplyBox: newShowReplyBox,
              // 如果是打开回复框，则初始化回复内容为空字符串
              replyContent: newShowReplyBox ? '' : child.replyContent
            };
          }
          return child;
        });

        if (found) {
          return {
            ...comment,
            previewChildren: updatedPreviewChildren
          };
        }
      }

      return comment;
    }));
  };

  // 更新回复内容
  const updateReplyContent = (commentId: number | string, content: string) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replyContent: content
        };
      }
      // 检查子评论
      if (comment.children && comment.children.length > 0) {
        const updatedChildren = comment.children.map(child => {
          if (child.id === commentId) {
            return {
              ...child,
              replyContent: content
            };
          }
          return child;
        });

        return {
          ...comment,
          children: updatedChildren
        };
      }
      // 检查预览子评论
      if (comment.previewChildren && comment.previewChildren.length > 0) {
        const updatedPreviewChildren = comment.previewChildren.map(child => {
          if (child.id === commentId) {
            return {
              ...child,
              replyContent: content
            };
          }
          return child;
        });

        return {
          ...comment,
          previewChildren: updatedPreviewChildren
        };
      }
      return comment;
    }));
  };

  // 提交回复
  const handleSubmitReply = async (parentId: number | string, rootId: number | string | null = null) => {

    // 找到对应的评论
    let replyContent = '';
    let foundComment: ExtendedCommentNodeVO | undefined;

    // 查找评论及其回复内容
    for (const comment of comments) {
      // 检查是否是根评论
      if (comment.id === parentId) {
        replyContent = comment.replyContent || '';
        foundComment = comment;
        break;
      }

      // 检查子评论
      if (comment.children && comment.children.length > 0) {
        const child = comment.children.find(c => c.id === parentId);
        if (child) {
          replyContent = child.replyContent || '';
          foundComment = child;
          break;
        }
      }

      // 检查预览子评论
      if (comment.previewChildren && comment.previewChildren.length > 0) {
        const child = comment.previewChildren.find(c => c.id === parentId);
        if (child) {
          replyContent = child.replyContent || '';
          foundComment = child;
          break;
        }
      }
    }


    const parentIdStr = parentId.toString();
    const pastedImagesForComment = replyPastedImages[parentIdStr] || [];

    if (!replyContent.trim() && pastedImagesForComment.length === 0) {
      message.warning('回复内容不能为空');
      return;
    }

    if (!foundComment) {
      message.warning('回复失败：未找到对应的评论');
      return;
    }

    if (!currentUser) {
      message.warning('请先登录');
      return;
    }

    if (!id) return;

    // 确保rootId有效，如果没有提供，则使用parentId作为rootId
    const finalRootId = rootId || parentId;

    // 更新评论的加载状态
    setComments(comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replyLoading: true
        };
      }
      if (comment.children) {
        return {
          ...comment,
          children: comment.children.map(child => {
            if (child.id === parentId) {
              return {
                ...child,
                replyLoading: true
              };
            }
            return child;
          })
        };
      }
      if (comment.previewChildren) {
        return {
          ...comment,
          previewChildren: comment.previewChildren.map(child => {
            if (child.id === parentId) {
              return {
                ...child,
                replyLoading: true
              };
            }
            return child;
          })
        };
      }
      return comment;
    }));

    try {
      // 组合回复内容，包括粘贴的图片
      let finalContent = replyContent.trim();

      // 添加图片标签
      if (pastedImagesForComment.length > 0) {
        pastedImagesForComment.forEach(imageUrl => {
          finalContent += `\n[img]${imageUrl}[/img]`;
        });
      }

      await addCommentUsingPost({
        postId: id as unknown as number,
        content: finalContent,
        parentId: parentId as unknown as number,
        rootId: finalRootId as unknown as number
      } as any);

      message.success('回复成功');

      // 清空回复框并隐藏
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replyContent: '',
            showReplyBox: false,
            replyLoading: false
          };
        }
        if (comment.children) {
          return {
            ...comment,
            children: comment.children.map(child => {
              if (child.id === parentId) {
                return {
                  ...child,
                  replyContent: '',
                  showReplyBox: false,
                  replyLoading: false
                };
              }
              return child;
            })
          };
        }
        if (comment.previewChildren) {
          return {
            ...comment,
            previewChildren: comment.previewChildren.map(child => {
              if (child.id === parentId) {
                return {
                  ...child,
                  replyContent: '',
                  showReplyBox: false,
                  replyLoading: false
                };
              }
              return child;
            })
          };
        }
        return comment;
      }));

      // 清空该评论的粘贴图片
      setReplyPastedImages(prev => {
        const newImages = {...prev};
        delete newImages[parentIdStr];
        return newImages;
      });

      // 重新获取评论列表，显示最新评论
      fetchComments();

      // 更新帖子的评论数
      if (post) {
        setPost({
          ...post,
          commentNum: (post.commentNum || 0) + 1
        });
      }
    } catch (error) {
      message.error('回复失败');
      // 重置加载状态
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replyLoading: false
          };
        }
        if (comment.children) {
          return {
            ...comment,
            children: comment.children.map(child => {
              if (child.id === parentId) {
                return {
                  ...child,
                  replyLoading: false
                };
              }
              return child;
            })
          };
        }
        if (comment.previewChildren) {
          return {
            ...comment,
            previewChildren: comment.previewChildren.map(child => {
              if (child.id === parentId) {
                return {
                  ...child,
                  replyLoading: false
                };
              }
              return child;
            })
          };
        }
        return comment;
      }));
    }
  };

  // 处理删除评论
  const handleDeleteComment = async (commentId: number | string) => {
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条评论吗？删除后将无法恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await deleteCommentUsingPost({
            id: commentId
          } as any);

          if (res.data) {
            message.success('评论删除成功');

            // 从评论列表中移除已删除的评论
            setComments(comments.filter(comment => {
              // 如果是根评论被删除
              if (comment.id === commentId) {
                return false;
              }

              // 检查子评论是否被删除
              if (comment.children && comment.children.length > 0) {
                comment.children = comment.children.filter(child => child.id !== commentId);
              }

              // 检查预览子评论是否被删除
              if (comment.previewChildren && comment.previewChildren.length > 0) {
                comment.previewChildren = comment.previewChildren.filter(child => child.id !== commentId);
              }

              return true;
            }));

            // 更新帖子的评论数
            if (post) {
              setPost({
                ...post,
                commentNum: Math.max((post.commentNum || 0) - 1, 0)
              });
            }
          } else {
            message.error('评论删除失败');
          }
        } catch (error) {
          message.error('删除评论失败');
        }
      }
    });
  };

  // 切换子评论的展开/收起状态
  const toggleChildrenExpanded = (commentId: number | string) => {

    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          childrenExpanded: !comment.childrenExpanded
        };
      }
      return comment;
    }));
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!commentContent.trim() && pastedImages.length === 0) {
      message.warning('评论内容不能为空');
      return;
    }
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }
    if (!id) return;

    setCommentLoading(true);
    try {
      // 组合评论内容，包括上传的图片URL
      let finalContent = commentContent.trim();

      // 添加图片标签
      pastedImages.forEach(imageUrl => {
        finalContent += `\n[img]${imageUrl}[/img]`;
      });

      await addCommentUsingPost({
        postId: id as unknown as number,
        content: finalContent,
      } as any);

      message.success('评论成功');
      setCommentContent('');
      setPastedImages([]); // 清空粘贴的图片

      // 重新获取评论列表，显示最新评论
      setCommentPagination({
        ...commentPagination,
        current: 1 // 重置到第一页以查看新评论
      });
      fetchComments();

      // 更新帖子的评论数
      if (post) {
        setPost({
          ...post,
          commentNum: (post.commentNum || 0) + 1
        });
      }
    } catch (error) {
      message.error('评论失败');
    } finally {
      setCommentLoading(false);
    }
  };

  // 渲染评论项
  const renderCommentItem = (item: ExtendedCommentNodeVO, isChild = false, rootId: number | string | null = null) => {

    // 确定当前评论的根评论ID
    const currentRootId = isChild ? rootId : item.id;

    // 处理评论内容中的表情包图片
    const renderCommentContent = (content?: string) => {
      if (!content) return '';

      // 图片标签匹配正则表达式
      const imgRegex = new RegExp('\\[img\\](.*?)\\[/img\\]', 'g');

      if (content.match(imgRegex)) {
        // 如果包含图片标签，需要特殊处理
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = imgRegex.exec(content)) !== null) {
          // 添加图片前的文本
          if (match.index > lastIndex) {
            parts.push(<span key={`text-${match.index}`}>{content.slice(lastIndex, match.index)}</span>);
          }

          // 添加图片
          const imageUrl = match[1];
          parts.push(
            <Image
              key={`img-${match.index}`}
              src={imageUrl}
              alt="表情"
              className="comment-emoticon"
              preview={{
                mask: false,
              }}
              style={{ maxHeight: '100px', margin: '2px 0' }}
            />
          );

          lastIndex = match.index + match[0].length;
        }

        // 添加剩余的文本
        if (lastIndex < content.length) {
          parts.push(<span key={`text-end`}>{content.slice(lastIndex)}</span>);
        }

        return <div className="comment-content-with-emoticon">{parts}</div>;
      }

      return content;
    };

    const commentIdStr = item.id?.toString() || '';
    const commentPastedImages = replyPastedImages[commentIdStr] || [];
    const isUploading = uploadingReplyImage[commentIdStr];

    return (
      <div className={`comment-item ${isChild ? 'child-comment' : ''}`} key={item.id}>
        <div className="comment-item-avatar">
          <Avatar src={item.user?.userAvatar} size={isChild ? 32 : 36}/>
        </div>
        <div className="comment-item-content">
          <div className="comment-item-header">
            <Text strong>{item.user?.userName}</Text>
            <div className="comment-item-meta">
              <Text type="secondary">{formatTime(item.createTime)}</Text>
              {canDeleteComment(item.user?.id) && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined/>}
                  onClick={() => handleDeleteComment(item.id || 0)}
                  className="delete-button"
                />
              )}
            </div>
          </div>
          <div className="comment-item-body">
            {item.parentComment && (
              <div className="reply-info">
                回复 <Text strong>{item.parentComment.user?.userName}</Text>:
              </div>
            )}
            <Paragraph ellipsis={{ rows: 20, expandable: true, symbol: '展开' }}>
              {renderCommentContent(item.content)}
            </Paragraph>
          </div>
          <div className="comment-item-actions">
            <Button
              type="text"
              icon={<CommentOutlined/>}
              onClick={() => toggleReplyBox(item.id || 0)}
              className="reply-button"
            >
              回复
            </Button>
            <Button
              type="text"
              icon={item.hasThumb ? <LikeFilled/> : <LikeOutlined/>}
              onClick={() => handleThumbComment(String(item.id))}
              className={item.hasThumb ? 'like-button active' : 'like-button'}
            >
              {item.thumbNum || 0}
            </Button>
          </div>

          {item.showReplyBox && (
            <div className="reply-box">
              <TextArea
                placeholder={`回复 ${item.user?.userName}...`}
                autoSize={{minRows: 2, maxRows: 4}}
                value={item.replyContent || ''}
                onChange={(e) => {
                  updateReplyContent(item.id || 0, e.target.value);
                }}
                onFocus={() => {
                  if (item.replyContent === undefined) {
                    updateReplyContent(item.id || 0, '');
                  }
                }}
                onPaste={(e) => handleReplyPaste(item.id || 0, e)}
                className="reply-textarea"
                disabled={isUploading}
              />

              {isUploading && (
                <div className="uploading-indicator">
                  <LoadingOutlined spin /> 正在上传图片...
                </div>
              )}

              {/* 粘贴图片预览 */}
              {commentPastedImages.length > 0 && (
                <div className="pasted-images-preview">
                  {commentPastedImages.map((imageUrl, index) => (
                    <div key={index} className="pasted-image-item">
                      <Image
                        src={imageUrl}
                        alt="粘贴图片"
                        className="pasted-image"
                        preview={{mask: false}}
                      />
                      <Button
                        type="text"
                        danger
                        icon={<CloseCircleOutlined />}
                        className="remove-image-btn"
                        onClick={() => handleRemoveReplyImage(item.id || 0, index)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="reply-actions">
                <Button
                  size="small"
                  onClick={() => toggleReplyBox(item.id || 0)}
                >
                  取消
                </Button>
                <Popover
                  content={
                    <div className="emoji-picker">
                      <Picker
                        data={data}
                        i18n={zhData}
                        onEmojiSelect={(emoji: any) => handleReplyEmojiClick(item.id || 0, emoji)}
                        theme="light"
                        locale="zh"
                        previewPosition="none"
                        skinTonePosition="none"
                      />
                    </div>
                  }
                  trigger="click"
                  placement="topLeft"
                  overlayClassName="emoji-popover"
                >
                  <Button
                    size="small"
                    icon={<SmileOutlined />}
                    className="emoji-button"
                  />
                </Popover>
                <Popover
                  content={<EmoticonPicker onSelect={(url) => handleReplyEmoticonSelect(item.id || 0, url)} />}
                  trigger="click"
                  placement="topLeft"
                  overlayClassName="emoticon-popover"
                >
                  <Button
                    size="small"
                    icon={<PictureOutlined />}
                    className="emoticon-button"
                  />
                </Popover>
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined/>}
                  loading={item.replyLoading}
                  onClick={() => handleSubmitReply(item.id || 0, currentRootId)}
                  disabled={(!item.replyContent?.trim() && commentPastedImages.length === 0) || isUploading}
                >
                  回复
                </Button>
              </div>
            </div>
          )}

          {/* 渲染子评论 */}
          {!isChild && ((item.previewChildren && item.previewChildren.length > 0) || (item.children && item.children.length > 0)) && (
            <div className="child-comments-header">
              {/* 子评论数量和展开/收起按钮 */}
              <div className="child-comments-count">
                {item.childCount || (item.previewChildren?.length || 0) || (item.children?.length || 0)} 条回复
              </div>
              <Button
                type="link"
                size="small"
                onClick={() => toggleChildrenExpanded(item.id || 0)}
              >
                {item.childrenExpanded ? '收起' : '展开'}
              </Button>
            </div>
          )}

          {/* 渲染预览子评论 */}
          {!isChild && item.childrenExpanded && item.previewChildren && item.previewChildren.length > 0 && !item.hasLoadedAllChildren && (
            <div className="child-comments">
              {item.previewChildren.map(child => renderCommentItem(child, true, item.id))}

              {/* 显示加载更多按钮 */}
              {item.childCount !== undefined && item.childCount > (item.previewChildren?.length || 0) && (
                <div className="load-more-comments">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => loadMoreChildComments(item.id || 0)}
                  >
                    查看全部 {item.childCount} 条回复
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 如果已经加载了完整的子评论列表，则显示它们 */}
          {!isChild && item.childrenExpanded && item.children && item.children.length > 0 && (
            <div className="child-comments">
              {item.children.map(child => renderCommentItem(child, true, item.id))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 判断当前用户是否有权限编辑或删除帖子
  const canEditPost = () => {
    if (!currentUser || !post) return false;

    // 管理员可以编辑所有帖子
    if (currentUser.userRole === 'admin') return true;

    // 普通用户只能编辑自己的帖子
    return currentUser.id === post.userId;
  };

  // 判断当前用户是否有权限删除评论
  const canDeleteComment = (commentUserId?: number) => {
    if (!currentUser) return false;

    // 管理员可以删除任何评论
    if (currentUser.userRole === 'admin') return true;

    // 普通用户只能删除自己的评论
    return currentUser.id === commentUserId;
  };

  // 抽取随机点赞用户（仅帖子创建者可用）
  const handleRandomThumbUser = async (randomIndex?: number) => {
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }
    if (!post || !post.id) {
      message.warning('帖子信息异常');
      return;
    }
    if (currentUser.id !== post.userId) {
      message.warning('仅帖子创建者可使用该功能');
      return;
    }

    if (!randomIndex || randomIndex <= 0) {
      message.warning('请输入大于 0 的随机数');
      return;
    }

    if (typeof post.thumbNum === 'number' && post.thumbNum > 0 && randomIndex > post.thumbNum) {
      message.warning(`随机数不能大于当前点赞数，请输入 1 ~ ${post.thumbNum} 之间的整数`);
      return;
    }

    setRandomThumbLoading(true);
    try {
      const res = await randomThumbUserUsingPost({
        postId: post.id as number,
        randomIndex: randomIndex
      });

      if (!res.data) {
        message.warning('当前暂无可抽取的点赞用户');
        return;
      }

      const rewardUser = res.data;

      Modal.info({
        title: '抽取结果',
        content: (
          <div style={{ marginTop: 12 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space>
                <Avatar src={rewardUser.userAvatar} />
                <span>{rewardUser.userName || '匿名用户'}</span>
              </Space>
              {rewardUser.userProfile && (
                <div>
                  <Text type="secondary">个人简介：</Text>
                  <Paragraph style={{ marginBottom: 0 }}>{rewardUser.userProfile}</Paragraph>
                </div>
              )}
              {rewardUser.rewardToken && (
                <div>
                  <Text>兑奖口令：</Text>
                  <Paragraph copyable style={{ marginBottom: 0 }}>
                    {rewardUser.rewardToken}
                  </Paragraph>
                </div>
              )}
            </Space>
          </div>
        ),
        okText: '我知道了'
      });
    } catch (e) {
      message.error('抽取点赞用户失败，请稍后重试');
    } finally {
      setRandomThumbLoading(false);
    }
  };

  // 获取帖子兑奖加密 token（所有用户可用）
  const handleGetPostRewardToken = async () => {
    if (!post || !post.id) {
      message.warning('帖子信息异常');
      return;
    }

    setRewardTokenLoading(true);
    try {
      const res = await getPostRewardTokenUsingGet({
        postId: post.id as number
      });

      if (!res.data || !res.data.rewardToken) {
        message.warning('暂未获取到兑奖 token');
        return;
      }

      Modal.info({
        title: '帖子兑奖 Token',
        content: (
          <div style={{ marginTop: 12 }}>
            <Text>请妥善保管该 Token：</Text>
            <Paragraph copyable style={{ marginTop: 8, marginBottom: 0 }}>
              {res.data.rewardToken}
            </Paragraph>
          </div>
        ),
        okText: '已复制'
      });
    } catch (e) {
      message.error('获取帖子兑奖 token 失败，请稍后重试');
    } finally {
      setRewardTokenLoading(false);
    }
  };

  // 获取中奖用户信息
  const handleGetRewardUser = async () => {
    if (!post || !post.id) {
      message.warning('帖子信息异常');
      return;
    }

    setRewardUserLoading(true);
    try {
      const res = await getCurrentRewardUserUsingGet({
        postId: post.id as number
      });
      if (res.data) {
        setRewardUser(res.data);

        const user = res.data;
        Modal.info({
          title: '中奖用户信息',
          content: (
            <div style={{ marginTop: 12 }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space>
                  <Avatar src={user.userAvatar} />
                  <span>{user.userName || '匿名用户'}</span>
                </Space>
                {user.userProfile && (
                  <div>
                    <Text type="secondary">个人简介：</Text>
                    <Paragraph style={{ marginBottom: 0 }}>{user.userProfile}</Paragraph>
                  </div>
                )}
                {user.rewardToken && (
                  <div>
                    <Text>兑奖口令：</Text>
                    <Paragraph copyable style={{ marginBottom: 0 }}>
                      {user.rewardToken}
                    </Paragraph>
                  </div>
                )}
              </Space>
            </div>
          ),
          okText: '我知道了'
        });
      } else {
        setRewardUser(null);
        message.warning('当前暂无中奖用户');
      }
    } catch (error: any) {
      // 如果接口返回错误，说明没有中奖用户
      setRewardUser(null);
      message.warning('当前暂无中奖用户');
    } finally {
      setRewardUserLoading(false);
    }
  };

  // 编辑帖子
  const handleEditPost = () => {
    if (!id) return;
    history.push(`/post/edit/${id}`);
  };

  // 显示删除确认对话框
  const showDeleteConfirm = () => {
    setDeleteModalVisible(true);
  };

  // 处理删除帖子
  const handleDeletePost = async () => {
    if (!id) return;

    setDeleteLoading(true);
    try {
      // 直接使用字符串ID，避免精度丢失
      const res = await deletePostUsingPost1({id: id});

      if (res.data) {
        message.success('帖子删除成功');
        // 删除成功后返回帖子列表页
        history.push('/post');
      } else {
        message.error('帖子删除失败');
      }
    } catch (error) {
      message.error('删除帖子失败');
    } finally {
      setDeleteLoading(false);
      setDeleteModalVisible(false);
    }
  };

  // 切换评论区收缩状态
  const toggleCommentCollapse = () => {
    setCommentCollapsed(!commentCollapsed);
  };

  // 添加滚动监听
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 添加窗口大小监听
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize(); // 初始化
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 初始化数据
  useEffect(() => {
    if (id) {
      fetchCurrentUser();
      fetchPostDetail();
    }
  }, [id]);

  // 当评论分页参数变化时，重新获取评论
  useEffect(() => {
    if (id) {
      fetchComments();
    }
  }, [id, commentPagination.current]);

  // 处理表情包选择
  const handleEmoticonSelect = (url: string) => {
    // 直接提交表情图片评论，不在输入框显示图片代码
    setIsEmoticonPickerVisible(false);

    // 检查当前用户是否登录
    if (!currentUser) {
      message.warning('请先登录');
      return;
    }

    if (!id) return;

    // 直接提交评论
    setCommentLoading(true);
    addCommentUsingPost({
      postId: id as unknown as number,
      content: `[img]${url}[/img]`,
    } as any).then(() => {
      message.success('评论成功');
      // 重新获取评论列表，显示最新评论
      setCommentPagination({
        ...commentPagination,
        current: 1 // 重置到第一页以查看新评论
      });
      fetchComments();

      // 更新帖子的评论数
      if (post) {
        setPost({
          ...post,
          commentNum: (post.commentNum || 0) + 1
        });
      }
    }).catch(() => {
      message.error('评论失败');
    }).finally(() => {
      setCommentLoading(false);
    });
  };

  // 处理 emoji 选择
  const handleEmojiClick = (emoji: EmojiData) => {
    setCommentContent((prev) => prev + emoji.native);
    setIsEmojiPickerVisible(false);
    // 让输入框获得焦点
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const emojiPickerContent = (
    <div className="emoji-picker">
      <Picker
        data={data}
        i18n={zhData}
        onEmojiSelect={handleEmojiClick}
        theme="light"
        locale="zh"
        previewPosition="none"
        skinTonePosition="none"
      />
    </div>
  );

  // 处理回复中的表情包选择
  const handleReplyEmoticonSelect = (commentId: number | string, url: string) => {
    // 关闭表情选择器
    setIsEmoticonPickerVisible(false);

    if (!currentUser) {
      message.warning('请先登录');
      return;
    }

    if (!id) return;

    // 查找评论信息，获取根评论ID
    const parentId = typeof commentId === 'number' || typeof commentId === 'string' ? commentId : 0;
    let rootId: number | string | null = null;

    // 遍历评论列表查找父评论和根评论信息
    for (const comment of comments) {
              // 如果是根评论
        if (comment.id === commentId) {
          rootId = comment.id || null;
          break;
        }

        // 检查子评论
        if (comment.children && comment.children.length > 0) {
          const child = comment.children.find(c => c.id === commentId);
          if (child) {
            rootId = comment.id || null;
            break;
          }
        }

        // 检查预览子评论
        if (comment.previewChildren && comment.previewChildren.length > 0) {
          const child = comment.previewChildren.find(c => c.id === commentId);
          if (child) {
            rootId = comment.id || null;
            break;
          }
        }
    }

    // 确保rootId有效，如果没有提供，则使用parentId作为rootId
    const finalRootId = rootId || parentId;

    // 更新评论的加载状态
    setComments(comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replyLoading: true
        };
      }
      if (comment.children) {
        return {
          ...comment,
          children: comment.children.map(child => {
            if (child.id === parentId) {
              return {
                ...child,
                replyLoading: true
              };
            }
            return child;
          })
        };
      }
      if (comment.previewChildren) {
        return {
          ...comment,
          previewChildren: comment.previewChildren.map(child => {
            if (child.id === parentId) {
              return {
                ...child,
                replyLoading: true
              };
            }
            return child;
          })
        };
      }
      return comment;
    }));

    // 直接提交回复
    addCommentUsingPost({
      postId: id as unknown as number,
      content: `[img]${url}[/img]`,
      parentId: parentId as unknown as number,
      rootId: finalRootId !== null ? finalRootId as unknown as number : undefined
    } as any).then(() => {
      message.success('回复成功');

      // 清空回复框并隐藏
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replyContent: '',
            showReplyBox: false,
            replyLoading: false
          };
        }
        if (comment.children) {
          return {
            ...comment,
            children: comment.children.map(child => {
              if (child.id === parentId) {
                return {
                  ...child,
                  replyContent: '',
                  showReplyBox: false,
                  replyLoading: false
                };
              }
              return child;
            })
          };
        }
        if (comment.previewChildren) {
          return {
            ...comment,
            previewChildren: comment.previewChildren.map(child => {
              if (child.id === parentId) {
                return {
                  ...child,
                  replyContent: '',
                  showReplyBox: false,
                  replyLoading: false
                };
              }
              return child;
            })
          };
        }
        return comment;
      }));

      // 重新获取评论列表，显示最新评论
      fetchComments();

      // 更新帖子的评论数
      if (post) {
        setPost({
          ...post,
          commentNum: (post.commentNum || 0) + 1
        });
      }
    }).catch(() => {
      message.error('回复失败');

      // 重置加载状态
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replyLoading: false
          };
        }
        if (comment.children) {
          return {
            ...comment,
            children: comment.children.map(child => {
              if (child.id === parentId) {
                return {
                  ...child,
                  replyLoading: false
                };
              }
              return child;
            })
          };
        }
        if (comment.previewChildren) {
          return {
            ...comment,
            previewChildren: comment.previewChildren.map(child => {
              if (child.id === parentId) {
                return {
                  ...child,
                  replyLoading: false
                };
              }
              return child;
            })
          };
        }
        return comment;
      }));
    });
  };

  // 处理回复中的 emoji 选择
  const handleReplyEmojiClick = (commentId: number | string, emoji: EmojiData) => {
    // 更新对应评论的回复内容
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replyContent: (comment.replyContent || '') + emoji.native
        };
      }
      // 检查子评论
      if (comment.children && comment.children.length > 0) {
        const updatedChildren = comment.children.map(child => {
          if (child.id === commentId) {
            return {
              ...child,
              replyContent: (child.replyContent || '') + emoji.native
            };
          }
          return child;
        });
        return {
          ...comment,
          children: updatedChildren
        };
      }
      // 检查预览子评论
      if (comment.previewChildren && comment.previewChildren.length > 0) {
        const updatedPreviewChildren = comment.previewChildren.map(child => {
          if (child.id === commentId) {
            return {
              ...child,
              replyContent: (child.replyContent || '') + emoji.native
            };
          }
          return child;
        });
        return {
          ...comment,
          previewChildren: updatedPreviewChildren
        };
      }
      return comment;
    }));
  };

  if (loading) {
    return (
      <div className="post-detail-loading">
        <Spin size="large"/>
      </div>
    );
  }

  if (!post) {
    return <div className="post-detail-not-found">帖子不存在或已被删除</div>;
  }

  return (
    <div className="post-detail-container">
      <div className="post-detail-header">
        <Link to="/post">
          <div className="back-button">
            <ArrowLeftOutlined/>
            <span>返回帖子列表</span>
          </div>
        </Link>
        <div className="post-actions-buttons">
          {canEditPost() && (
            <>
              {/* 编辑按钮 */}
              <Button
                type="primary"
                icon={<EditOutlined/>}
                onClick={handleEditPost}
                style={{marginRight: 8}}
              >
                编辑帖子
              </Button>
              {/* 删除按钮 */}
              <Button
                danger
                icon={<DeleteOutlined/>}
                onClick={showDeleteConfirm}
                style={{marginRight: 8}}
              >
                删除帖子
              </Button>
              {/* 更多操作下拉菜单 */}
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item
                      key="reward-user"
                      onClick={handleGetRewardUser}
                      disabled={rewardUserLoading}
                    >
                      {rewardUserLoading ? '加载中...' : '查看中奖用户'}
                    </Menu.Item>
                    <Menu.Item
                      key="reward-token"
                      onClick={handleGetPostRewardToken}
                      disabled={rewardTokenLoading}
                    >
                      {rewardTokenLoading ? '加载中...' : '获取兑奖 Token'}
                    </Menu.Item>
                    <Menu.Item
                      key="random-thumb"
                      onClick={() => setRandomThumbModalVisible(true)}
                      disabled={randomThumbLoading}
                    >
                      {randomThumbLoading ? '加载中...' : '抽取点赞用户'}
                    </Menu.Item>
                  </Menu>
                }
                placement="bottomRight"
              >
                <Button icon={<MoreOutlined />} style={{marginRight: 8}}>
                  更多操作
                </Button>
              </Dropdown>
            </>
          )}
          {!canEditPost() && (
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item
                    key="reward-user"
                    onClick={handleGetRewardUser}
                    disabled={rewardUserLoading}
                  >
                    {rewardUserLoading ? '加载中...' : '查看中奖用户'}
                  </Menu.Item>
                  <Menu.Item
                    key="reward-token"
                    onClick={handleGetPostRewardToken}
                    disabled={rewardTokenLoading}
                  >
                    {rewardTokenLoading ? '加载中...' : '获取兑奖 Token'}
                  </Menu.Item>
                </Menu>
              }
              placement="bottomRight"
            >
              <Button icon={<MoreOutlined />}>
                更多操作
              </Button>
            </Dropdown>
          )}
        </div>
      </div>

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

      {/* 抽取点赞用户 - 输入随机数弹窗 */}
      <Modal
        title="抽取点赞用户"
        open={randomThumbModalVisible}
        onOk={async () => {
          const value = parseInt(randomIndexInput, 10);
          if (Number.isNaN(value) || value <= 0) {
            message.warning('请输入大于 0 的整数随机数');
            return;
          }
          if (typeof post.thumbNum === 'number' && post.thumbNum > 0 && value > post.thumbNum) {
            message.warning(`随机数不能大于当前点赞数，请输入 1 ~ ${post.thumbNum} 之间的整数`);
            return;
          }
          setRandomThumbModalVisible(false);
          setRandomIndexInput('');
          await handleRandomThumbUser(value);
        }}
        onCancel={() => {
          setRandomThumbModalVisible(false);
          setRandomIndexInput('');
        }}
        okText="开始抽取"
        cancelText="取消"
        confirmLoading={randomThumbLoading}
      >
        <div>
          <p style={{ marginBottom: 8 }}>
            请输入一个你自己选择的随机数（例如 123、999 等），系统会根据该随机数从点赞用户中抽取一位。
          </p>
          {typeof post.thumbNum === 'number' && post.thumbNum > 0 && (
            <p style={{ marginBottom: 8, color: '#888' }}>
              当前点赞数：{post.thumbNum}，建议输入 1 ~ {post.thumbNum} 之间的整数。
            </p>
          )}
          <Input
            value={randomIndexInput}
            onChange={(e) => setRandomIndexInput(e.target.value)}
            placeholder="请输入随机数，例如 123"
          />
        </div>
      </Modal>

      <div className="post-detail-layout">
        <div className="post-detail-main" ref={mainContentRef}>
          <Card className="post-detail-card">
            <div className="post-detail-title">
              <Title level={3}>{post.title}</Title>
              <div className="post-detail-meta">
                <Space>
                  <Avatar src={post.user?.userAvatar} size="small"/>
                  <Text strong>{post.user?.userName}</Text>
                  <Text type="secondary">{formatTime(post.createTime)}</Text>
                  {/* 显示中奖用户头像 */}
                  {rewardUser && (
                    <Tooltip
                      title={
                        <div style={{ padding: '4px 0' }}>
                          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>🎉 中奖用户</div>
                          <div style={{ marginBottom: 4 }}>
                            <Text strong style={{ color: '#fff' }}>{rewardUser.userName}</Text>
                          </div>
                          {rewardUser.userProfile && (
                            <div style={{ marginBottom: 4, fontSize: '12px', color: '#fff' }}>
                              {rewardUser.userProfile}
                            </div>
                          )}
                          {rewardUser.rewardToken && (
                            <div style={{ marginTop: 8, fontSize: '12px', color: '#fff', opacity: 0.8 }}>
                              兑奖Token: {rewardUser.rewardToken}
                            </div>
                          )}
                        </div>
                      }
                      placement="top"
                    >
                      <Space>
                        <Text type="secondary" style={{ fontSize: '12px' }}>🎉</Text>
                        <Avatar 
                          src={rewardUser.userAvatar} 
                          size="small"
                          style={{ cursor: 'pointer', border: '2px solid #ffd700' }}
                        />
                        <Text type="secondary" style={{ fontSize: '12px' }}>中奖用户</Text>
                      </Space>
                    </Tooltip>
                  )}
                </Space>
              </div>
            </div>
            <Divider/>

            {/* AI 生成的摘要 */}
            {post.summary && post.summary.trim() !== '' && (
              <div className="post-detail-summary">
                <Alert
                  message={
                    <div className="summary-header">
                      <RobotOutlined /> AI 生成摘要
                    </div>
                  }
                  description={post.summary}
                  type="info"
                  showIcon={false}
                  style={{
                    marginBottom: 16,
                    background: '#FFF5EB',
                    borderColor: '#FFA768'
                  }}
                />
              </div>
            )}

            <div className="post-detail-body">
              {/* Vditor 预览区域 */}
              <div ref={contentRef} className="vditor-reset"></div>
            </div>
          </Card>
        </div>

        <div className={`post-detail-sidebar ${commentCollapsed ? 'collapsed' : ''} ${isScrolling ? 'sticky' : ''}`}>
          <div
            className="comment-collapse-button"
            onClick={toggleCommentCollapse}
            data-tooltip={commentCollapsed ? '展开评论' : '收起评论'}
          >
            {isMobile ?
              (commentCollapsed ? <DownOutlined/> : <UpOutlined/>) :
              (commentCollapsed ? <LeftOutlined/> : <RightOutlined/>)
            }
          </div>
          <Card
            className="post-detail-comments"
            title={
              <div className="comments-header">
                <span>评论</span>
                <span className="comment-count">{commentPagination.total}</span>
              </div>
            }
            extra={
              <div className="post-actions">
                <Button
                  type="text"
                  icon={post.hasThumb ? <LikeFilled/> : <LikeOutlined/>}
                  onClick={handleThumbPost}
                  className={post.hasThumb ? 'action-button active' : 'action-button'}
                >
                  {post.thumbNum || 0}
                </Button>
                <Button
                  type="text"
                  icon={post.hasFavour ? <StarFilled/> : <StarOutlined/>}
                  onClick={handleFavourPost}
                  className={post.hasFavour ? 'action-button active' : 'action-button'}
                >
                  {post.favourNum || 0}
                </Button>
                <Button
                  type="text"
                  icon={<MessageOutlined/>}
                  className="action-button"
                >
                  {post.commentNum || 0}
                </Button>
              </div>
            }
            bodyStyle={{
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 120px)',
              visibility: commentCollapsed ? 'hidden' : 'visible',
              overflow: 'hidden',
              width: '100%',
              maxWidth: '100%'
            }}
          >
            {!commentCollapsed && (
              <>
                <div className="comment-fixed-top">
                  <div className="comment-editor">
                    <div className="comment-avatar">
                      <Avatar src={currentUser?.userAvatar} size={40}/>
                    </div>
                    <div className="comment-input">
                      <TextArea
                        placeholder={uploadingImage ? "正在上传图片..." : "写下你的评论或粘贴图片..."}
                        autoSize={{minRows: 2, maxRows: 6}}
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        className="comment-textarea"
                        ref={commentTextareaRef}
                        onPaste={handlePaste}
                        disabled={uploadingImage}
                      />

                      {uploadingImage && (
                        <div className="uploading-indicator">
                          <LoadingOutlined spin /> 正在上传图片...
                        </div>
                      )}

                      {/* 粘贴图片预览 */}
                      {pastedImages.length > 0 && (
                        <div className="pasted-images-preview">
                          {pastedImages.map((imageUrl, index) => (
                            <div key={index} className="pasted-image-item">
                              <Image
                                src={imageUrl}
                                alt="粘贴图片"
                                className="pasted-image"
                                preview={{mask: false}}
                              />
                              <Button
                                type="text"
                                danger
                                icon={<CloseCircleOutlined />}
                                className="remove-image-btn"
                                onClick={() => handleRemoveImage(index)}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="comment-toolbar">
                        <Popover
                          content={emojiPickerContent}
                          trigger="click"
                          visible={isEmojiPickerVisible}
                          onVisibleChange={setIsEmojiPickerVisible}
                          placement="topLeft"
                          overlayClassName="emoji-popover"
                        >
                          <Button
                            type="text"
                            icon={<SmileOutlined />}
                            className="emoji-button"
                          />
                        </Popover>
                        <Popover
                          content={<EmoticonPicker onSelect={handleEmoticonSelect} />}
                          trigger="click"
                          visible={isEmoticonPickerVisible}
                          onVisibleChange={setIsEmoticonPickerVisible}
                          placement="topLeft"
                          overlayClassName="emoticon-popover"
                        >
                          <Button
                            type="text"
                            icon={<PictureOutlined />}
                            className="emoticon-button"
                          />
                        </Popover>
                        <Button
                          type="primary"
                          icon={<SendOutlined/>}
                          onClick={handleSubmitComment}
                          loading={commentLoading}
                          disabled={(!commentContent.trim() && pastedImages.length === 0) || uploadingImage}
                        >
                          发布评论
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="comment-scrollable-content">
                  {commentsLoading ? (
                    <div className="comments-loading">
                      <Spin/>
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="comment-list">
                      {comments.map(item => renderCommentItem(item))}

                      {commentPagination.total > commentPagination.pageSize && (
                        <div className="comment-pagination">
                          <Pagination
                            current={commentPagination.current}
                            pageSize={commentPagination.pageSize}
                            total={commentPagination.total}
                            onChange={handleCommentPageChange}
                            size="small"
                            simple
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="no-comments">
                      <MessageOutlined style={{fontSize: 24}}/>
                      <p>暂无评论，快来发表第一条评论吧！</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
