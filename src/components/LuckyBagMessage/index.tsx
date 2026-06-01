import {
  getLuckyBagDetailUsingGet,
  getLuckyBagWinRecordsUsingGet,
  joinLuckyBagUsingPost,
} from '@/services/backend/luckyBagController';
import { Avatar, Button, message, Modal } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './index.less';

export const LUCKY_BAG_IMAGE = 'https://oss.cqbo.com/moyu/fudai.jpg';
export const LUCKY_BAG_TAG_REGEX = /\[luckybag\]([^\[\]]*)\[\/luckybag\]/i;

/** 纯福袋消息时解析福袋 ID */
export function extractLuckyBagId(content: string): string | null {
  const trimmed = content.trim();
  const match = LUCKY_BAG_TAG_REGEX.exec(trimmed);
  if (!match || match[0] !== trimmed) return null;
  return match[1];
}

/** 解析带前缀文字的福袋消息 */
export function parseLuckyBagInline(content: string): { prefix: string; luckyBagId: string } | null {
  const match = LUCKY_BAG_TAG_REGEX.exec(content);
  if (!match) return null;
  const prefix = content.replace(match[0], '').trim();
  return { prefix, luckyBagId: match[1] };
}

function getStatusText(detail: API.LuckyBag | null): string {
  if (!detail) return '加载中...';
  if (detail.status === 2) return '已过期';
  if (detail.status === 3) return '已开奖';
  return '进行中';
}

function isJoinDisabled(detail: API.LuckyBag | null): boolean {
  if (!detail) return true;
  if (detail.status === 2 || detail.status === 3) return true;
  if (detail.joined) return true;
  return false;
}

function getDrawTime(detail: API.LuckyBag | null): string {
  return formatDateTime(detail?.drawTime || detail?.expireTime);
}

function formatDateTime(time?: string): string {
  if (!time) return '-';
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return time;
  return date.toLocaleString();
}

type JoinTip = { type: 'success' | 'error'; text: string };

interface LuckyBagModalProps {
  luckyBagId: string;
  open: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export const LuckyBagModal: React.FC<LuckyBagModalProps> = ({ luckyBagId, open, onClose, onJoined }) => {
  const [detail, setDetail] = useState<API.LuckyBag | null>(null);
  const [recordsVisible, setRecordsVisible] = useState(false);
  const [records, setRecords] = useState<API.VO2[]>([]);
  const [joinTip, setJoinTip] = useState<JoinTip | null>(null);
  const joiningRef = useRef(false);
  const joinTipTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchDetail = useCallback(async () => {
    try {
      const response = await getLuckyBagDetailUsingGet({ luckyBagId });
      if (response.data) {
        setDetail(response.data);
      }
    } catch (e) {
      console.error('获取福袋详情失败', e);
    }
  }, [luckyBagId]);

  const fetchRecords = useCallback(async () => {
    try {
      const response = await getLuckyBagWinRecordsUsingGet({ luckyBagId });
      if (response.data) {
        const sorted = [...response.data].sort((a, b) => (b.amount || 0) - (a.amount || 0));
        setRecords(sorted);
      }
    } catch {
      message.error('获取福袋记录失败！');
    }
  }, [luckyBagId]);

  useEffect(() => {
    if (open) {
      fetchDetail();
      setJoinTip(null);
    } else {
      setRecordsVisible(false);
    }
  }, [open, fetchDetail]);

  useEffect(() => {
    return () => {
      if (joinTipTimerRef.current) clearTimeout(joinTipTimerRef.current);
    };
  }, []);

  const showJoinTip = (tip: JoinTip) => {
    setJoinTip(tip);
    if (joinTipTimerRef.current) clearTimeout(joinTipTimerRef.current);
    joinTipTimerRef.current = setTimeout(() => setJoinTip(null), 3000);
  };

  const handleJoin = async () => {
    if (joiningRef.current) return;
    joiningRef.current = true;
    try {
      const response = await joinLuckyBagUsingPost({ luckyBagId });
      if (response.code === 0 && response.data) {
        const text = '参与成功，等待开奖！';
        showJoinTip({ type: 'success', text });
        message.success(text);
        await fetchDetail();
        onJoined?.();
      } else {
        const errText = response.message || '参与失败，福袋可能已结束！';
        showJoinTip({ type: 'error', text: errText });
        message.error(errText);
      }
    } catch {
      const errText = '参与失败，福袋可能已结束！';
      showJoinTip({ type: 'error', text: errText });
      message.error(errText);
    } finally {
      setTimeout(() => {
        joiningRef.current = false;
      }, 500);
    }
  };

  const handleViewRecords = async () => {
    setRecordsVisible(true);
    await fetchRecords();
  };

  const typeLabel = detail?.type === 2 ? '平均分配' : '随机分配';

  return (
    <>
      <Modal
        title="福袋详情"
        open={open}
        onCancel={onClose}
        footer={null}
        width={400}
        destroyOnClose
        getContainer={() => document.body}
        zIndex={1000000}
      >
        <div className={styles.luckyBagModalContent}>
          <div className={styles.luckyBagHeader}>
            <img src={LUCKY_BAG_IMAGE} alt="福袋" className={styles.luckyBagModalImage} />
            <div className={styles.luckyBagHeaderInfo}>
              <div className={styles.luckyBagName}>{detail?.name || '福袋'}</div>
              {detail?.creatorName && (
                <div className={styles.luckyBagCreator}>发起人：{detail.creatorName}</div>
              )}
            </div>
          </div>
          <div className={styles.luckyBagMeta}>
            <div className={styles.luckyBagMetaItem}>
              总积分<span className={styles.metaValue}>{detail?.totalAmount ?? '-'} </span>
            </div>
            <div className={styles.luckyBagMetaItem}>
              中奖人数<span className={styles.metaValue}>{detail?.winnerCount ?? '-'} </span>
            </div>
            <div className={styles.luckyBagMetaItem}>
              参与人数<span className={styles.metaValue}>{detail?.participantCount ?? 0} </span>
            </div>
            <div className={styles.luckyBagMetaItem}>
              分配方式<span className={styles.metaValue}>{typeLabel}</span>
            </div>
          </div>
          <div className={styles.luckyBagDrawTime}>开奖时间：{getDrawTime(detail)}</div>
          <div className={styles.luckyBagStatus}>
            {getStatusText(detail)}
            {detail?.joined !== undefined && (
              <span className={detail.joined ? styles.joinedTag : styles.notJoinedTag}>
                {detail.joined ? '已参与' : '未参与'}
              </span>
            )}
          </div>
          {joinTip && (
            <div className={`${styles.joinTip} ${styles[`joinTip_${joinTip.type}`]}`}>{joinTip.text}</div>
          )}
          <div className={styles.luckyBagActions}>
            <Button type="primary" onClick={handleJoin} disabled={isJoinDisabled(detail)}>
              {detail?.joined ? '已参与' : '参与福袋'}
            </Button>
            <Button onClick={handleViewRecords}>查看记录</Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="福袋中奖记录"
        open={recordsVisible}
        onCancel={() => setRecordsVisible(false)}
        footer={null}
        width={360}
        destroyOnClose
        getContainer={() => document.body}
        zIndex={1000001}
      >
        <div className={styles.luckyBagRecords}>
          <div className={styles.recordsList}>
            {records.length > 0 ? (
              records.map((record, index) => (
                <div key={record.id} className={styles.recordItem}>
                  <Avatar src={record.userAvatar} size={32} />
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>
                      {record.userName}
                      {index === 0 && ' 🏆'}
                    </div>
                    <div className={styles.winTime}>
                      {record.winTime ? new Date(record.winTime).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className={styles.amount}>{record.amount} 积分</div>
                </div>
              ))
            ) : (
              <div className={styles.emptyRecords}>暂无中奖记录</div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

interface LuckyBagMessageProps {
  luckyBagId: string;
  prefix?: string;
}

const LuckyBagMessage: React.FC<LuckyBagMessageProps> = ({ luckyBagId, prefix }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className={styles.luckyBagInline}>
        {prefix && <div className={styles.luckyBagPrefix}>{prefix}</div>}
        <div className={styles.luckyBagTrigger} onClick={() => setModalOpen(true)} role="button" tabIndex={0}>
          <img src={LUCKY_BAG_IMAGE} alt="福袋" className={styles.luckyBagImage} />
          <span className={styles.luckyBagTriggerText}>点击参与福袋</span>
        </div>
      </div>
      <LuckyBagModal luckyBagId={luckyBagId} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default LuckyBagMessage;
