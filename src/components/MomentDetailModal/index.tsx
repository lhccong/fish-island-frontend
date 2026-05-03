import React, { useEffect, useState } from 'react';
import { Avatar, Button, Image, Input, InputNumber, message, Modal, Spin, Tooltip } from 'antd';
import { CloseOutlined, EnvironmentOutlined, GiftOutlined, HeartFilled, HeartOutlined, LoadingOutlined, MessageOutlined } from '@ant-design/icons';

import {
  addCommentUsingPost1,
  getMomentDetailUsingGet,
  listCommentsUsingPost,
  rewardMomentUsingPost,
  toggleLikeUsingPost,
} from '@/services/backend/momentsController';
import { useModel } from '@umijs/max';
import moment from 'moment';
import './index.less';

interface MomentDetailModalProps {
  /** 动态 id，传入时自动加载；null 表示关闭 */
  momentId: number | null;
  onClose: () => void;
  /** 点赞状态变化后通知父组件更新列表 */
  onLikeChange?: (momentId: number, liked: boolean, likeNum: number) => void;
  /** 评论数变化后通知父组件 */
  onCommentCountChange?: (momentId: number, count: number) => void;
}

const MomentDetailModal: React.FC<MomentDetailModalProps> = ({
  momentId,
  onClose,
  onLikeChange,
  onCommentCountChange,
}) => {
  const [detailMoment, setDetailMoment] = useState<API.MomentsVO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [comments, setComments] = useState<API.MomentsCommentVO[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ commentId: number; userName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 打赏弹窗状态
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [rewardPoints, setRewardPoints] = useState<number>(10);
  const [rewarding, setRewarding] = useState(false);

  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};

  // 加载详情
  useEffect(() => {
    if (!momentId) {
      setDetailMoment(null);
      setComments([]);
      return;
    }
    setDetailLoading(true);
    setDetailMoment(null);
    setComments([]);
    Promise.all([
      getMomentDetailUsingGet({ id: momentId }),
      listCommentsUsingPost({ momentId, current: 1, pageSize: 50 }),
    ])
      .then(([detailRes, commentRes]) => {
        if (detailRes.data) setDetailMoment(detailRes.data);
        setComments(commentRes.data?.records || []);
      })
      .catch(() => message.error('加载动态详情失败'))
      .finally(() => setDetailLoading(false));
  }, [momentId]);

  const handleClose = () => {
    setCommentInput('');
    setReplyTarget(null);
    onClose();
  };

  // 打赏
  const handleReward = async () => {
    if (!detailMoment?.id || !currentUser) return;
    setRewarding(true);
    try {
      const res = await rewardMomentUsingPost({ momentId: detailMoment.id, points: rewardPoints });
      if (res.data) {
        message.success(`打赏 ${rewardPoints} 积分成功！`);
        setRewardModalVisible(false);
        setRewardPoints(10);
      }
    } catch {
      message.error('打赏失败');
    } finally {
      setRewarding(false);
    }
  };

  // 点赞
  const handleLike = async () => {
    if (!detailMoment?.id || !currentUser) return;
    try {
      const res = await toggleLikeUsingPost({ momentId: detailMoment.id });
      if (res.code === 0) {
        const newLiked = !detailMoment.liked;
        const newNum = (detailMoment.likeNum || 0) + (newLiked ? 1 : -1);
        setDetailMoment((prev) => prev ? { ...prev, liked: newLiked, likeNum: newNum } : prev);
        onLikeChange?.(detailMoment.id, newLiked, newNum);
      }
    } catch {
      // ignore
    }
  };

  // 提交评论
  const handleSubmitComment = async () => {
    const content = commentInput.trim();
    if (!content || !detailMoment?.id) return;
    setSubmitting(true);
    try {
      const res = await addCommentUsingPost1({
        momentId: detailMoment.id,
        content,
        parentId: replyTarget?.commentId,
      });
      if (res.data) {
        message.success('评论成功');
        setCommentInput('');
        setReplyTarget(null);
        const updated = await listCommentsUsingPost({ momentId: detailMoment.id, current: 1, pageSize: 50 });
        const newComments = updated.data?.records || [];
        setComments(newComments);
        // 统计总评论数（含子评论）
        const total = newComments.reduce((acc, c) => acc + 1 + (c.children?.length || 0), 0);
        onCommentCountChange?.(detailMoment.id, total);
      }
    } catch {
      message.error('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const images = (detailMoment?.mediaJson || []).filter((i) => i.type === 'image').map((i) => i.url!);
  const cols = images.length === 1 ? 1 : images.length === 2 || images.length === 4 ? 2 : 3;

  // 渲染评论内容（支持 [img:url] 格式图片）
  const renderCommentContent = (content?: string) => {
    if (!content) return null;
    const imgRegex = /\[img:(https?:\/\/[^\]]+)\]/g;
    const textParts: React.ReactNode[] = [];
    const imgUrls: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = imgRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        textParts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
      }
      imgUrls.push(match[1]);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      textParts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
    }
    return (
      <>
        {textParts.length > 0 && <span className="detail-comment-text-part">{textParts}</span>}
        {imgUrls.length > 0 && (
          <Image.PreviewGroup>
            <div className="detail-comment-img-grid">
              {imgUrls.map((url, i) => (
                <Image
                  key={i}
                  src={url}
                  className="detail-comment-img-item"
                  preview={{ src: url }}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        )}
      </>
    );
  };

  return (
    <>
    <Modal
      open={!!momentId}
      onCancel={handleClose}
      footer={null}
      width={600}
      centered
      destroyOnClose
      title={
        detailMoment ? (
          <div className="detail-modal-title">
            <Avatar size={32} src={detailMoment.userAvatar}>
              {detailMoment.userName?.charAt(0)}
            </Avatar>
            <span className="detail-modal-username">{detailMoment.userName}</span>
            <span className="detail-modal-time">{moment(detailMoment.createTime).fromNow()}</span>
          </div>
        ) : (
          '动态详情'
        )
      }
    >
      {detailLoading ? (
        <div className="detail-modal-loading">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
        </div>
      ) : detailMoment ? (
        <div className="detail-modal-body">
          {/* 正文 */}
          {detailMoment.content && (
            <div className="detail-content">{detailMoment.content}</div>
          )}

          {/* 图片九宫格 */}
          {images.length > 0 && (
            <Image.PreviewGroup>
              <div
                className="detail-images"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: cols === 1 ? 300 : 400 }}
              >
                {images.slice(0, 9).map((url, i) => (
                  <Image
                    key={i}
                    src={url}
                    className="detail-image-item"
                    preview={{ src: url }}
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          )}

          {/* 位置 */}
          {detailMoment.location && (
            <div className="detail-location">
              <EnvironmentOutlined />
              <span>{detailMoment.location}</span>
            </div>
          )}

          {/* 点赞 */}
          <div className="detail-actions">
            <span
              className={`detail-action-btn ${detailMoment.liked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              {detailMoment.liked ? <HeartFilled /> : <HeartOutlined />}
              <span>{detailMoment.likeNum || 0}</span>
            </span>
            <span className="detail-action-btn">
              <MessageOutlined />
              <span>{comments.reduce((acc, c) => acc + 1 + (c.children?.length || 0), 0)}</span>
            </span>
            {currentUser && currentUser.id !== detailMoment.userId && (
              <Tooltip title="打赏">
                <span
                  className="detail-action-btn reward-btn"
                  onClick={() => { setRewardPoints(10); setRewardModalVisible(true); }}
                >
                  <GiftOutlined />
                </span>
              </Tooltip>
            )}
          </div>

          {/* 评论列表 */}
          {comments.length > 0 && (
            <div className="detail-comments">
              {comments.map((comment) => (
                <div key={comment.id} className="detail-comment-item">
                  <Avatar size={28} src={comment.userAvatar} className="detail-comment-avatar">
                    {comment.userName?.charAt(0)}
                  </Avatar>
                  <div className="detail-comment-body">
                    <span className="detail-comment-name">{comment.userName}</span>
                    <div className="detail-comment-content">{renderCommentContent(comment.content)}</div>
                    <div className="detail-comment-meta">
                      <span>{moment(comment.createTime).fromNow()}</span>
                      <span
                        className="detail-reply-btn"
                        onClick={() => setReplyTarget({ commentId: comment.id!, userName: comment.userName! })}
                      >
                        回复
                      </span>
                    </div>

                    {/* 子评论 */}
                    {(comment.children || []).map((child) => (
                      <div key={child.id} className="detail-child-comment">
                        <Avatar size={22} src={child.userAvatar}>
                          {child.userName?.charAt(0)}
                        </Avatar>
                        <div className="detail-comment-body">
                          <span className="detail-comment-name">{child.userName}</span>
                          {child.replyUserName && (
                            <span className="detail-reply-to">
                              回复 <span>{child.replyUserName}</span>
                            </span>
                          )}
                          <div className="detail-comment-content">{renderCommentContent(child.content)}</div>
                          <div className="detail-comment-meta">
                            <span>{moment(child.createTime).fromNow()}</span>
                            <span
                              className="detail-reply-btn"
                              onClick={() => setReplyTarget({ commentId: comment.id!, userName: child.userName! })}
                            >
                              回复
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 评论输入区 */}
          <div className="detail-input-area">
            {replyTarget && (
              <div className="detail-reply-hint">
                回复 <span>{replyTarget.userName}</span>
                <CloseOutlined onClick={() => setReplyTarget(null)} />
              </div>
            )}
            <div className="detail-input-row">
              <Input
                placeholder={replyTarget ? `回复 ${replyTarget.userName}...` : '写评论...'}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onPressEnter={handleSubmitComment}
                maxLength={200}
                className="detail-input"
              />
              <Button
                type="primary"
                size="small"
                loading={submitting}
                disabled={!commentInput.trim()}
                onClick={handleSubmitComment}
                className="detail-send-btn"
              >
                发送
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>

    {/* 打赏弹窗 */}
    <Modal
      title={<span><GiftOutlined style={{ color: '#f4ac70', marginRight: 8 }} />打赏积分</span>}
      open={rewardModalVisible}
      onCancel={() => { setRewardModalVisible(false); setRewardPoints(10); }}
      footer={null}
      width={360}
      centered
      destroyOnClose
    >
      <div className="reward-modal-content">
        <p className="reward-desc">选择打赏积分数量，积分将从你的账户中扣除</p>
        <div className="reward-presets">
          {[1, 5, 10, 20].map((v) => (
            <span
              key={v}
              className={`reward-preset-item ${rewardPoints === v ? 'active' : ''}`}
              onClick={() => setRewardPoints(v)}
            >
              {v} 积分
            </span>
          ))}
        </div>
        <InputNumber
          min={1}
          max={20}
          value={rewardPoints}
          onChange={(v) => setRewardPoints(v || 1)}
          addonAfter="积分"
          style={{ width: '100%', marginTop: 12 }}
        />
        <div className="reward-footer">
          <Button onClick={() => { setRewardModalVisible(false); setRewardPoints(10); }}>取消</Button>
          <Button type="primary" loading={rewarding} onClick={handleReward}>
            确认打赏
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
};

export default MomentDetailModal;
