import {
  getRedPacketDetailUsingGet,
  getRedPacketRecordsUsingGet,
  grabRedPacketUsingPost,
} from '@/services/backend/redPacketController';
import { GiftOutlined } from '@ant-design/icons';
import { Avatar, Button, message, Modal } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './index.less';

export const RED_PACKET_TAG_REGEX = /\[redpacket\]([^\[\]]*)\[\/redpacket\]/i;

/** 纯红包消息时解析红包 ID */
export function extractRedPacketId(content: string): string | null {
  const trimmed = content.trim();
  const match = RED_PACKET_TAG_REGEX.exec(trimmed);
  if (!match || match[0] !== trimmed) return null;
  return match[1];
}

interface RedPacketMessageProps {
  redPacketId: string;
}

type GrabTip = { type: 'success' | 'error'; text: string };

const RedPacketMessage: React.FC<RedPacketMessageProps> = ({ redPacketId }) => {
  const [detail, setDetail] = useState<API.RedPacket | null>(null);
  const [recordsVisible, setRecordsVisible] = useState(false);
  const [records, setRecords] = useState<API.VO[]>([]);
  const [grabTip, setGrabTip] = useState<GrabTip | null>(null);
  const grabbingRef = useRef(false);
  const grabTipTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchDetail = useCallback(async () => {
    try {
      const response = await getRedPacketDetailUsingGet({ redPacketId });
      if (response.data) {
        setDetail(response.data as API.RedPacket);
      }
    } catch (e) {
      console.error('获取红包详情失败', e);
    }
  }, [redPacketId]);

  const fetchRecords = useCallback(async () => {
    try {
      const response = await getRedPacketRecordsUsingGet({ redPacketId });
      if (response.data) {
        const sorted = [...response.data].sort((a, b) => (b.amount || 0) - (a.amount || 0));
        setRecords(sorted);
      }
    } catch {
      message.error('获取红包记录失败！');
    }
  }, [redPacketId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    return () => {
      if (grabTipTimerRef.current) clearTimeout(grabTipTimerRef.current);
    };
  }, []);

  const showGrabTip = (tip: GrabTip) => {
    setGrabTip(tip);
    if (grabTipTimerRef.current) clearTimeout(grabTipTimerRef.current);
    grabTipTimerRef.current = setTimeout(() => setGrabTip(null), 3000);
  };

  const handleGrab = async () => {
    if (grabbingRef.current) return;
    grabbingRef.current = true;
    try {
      const response = await grabRedPacketUsingPost({ redPacketId });
      if (response.code === 0) {
        const amount = response.data ?? 0;
        const text = `恭喜你抢到 ${amount} 积分！`;
        showGrabTip({ type: 'success', text });
        message.success(text);
        await fetchDetail();
        if (recordsVisible) await fetchRecords();
      } else {
        const errText = response.message || '红包已被抢完或已过期！';
        showGrabTip({ type: 'error', text: errText });
        message.error(errText);
      }
    } catch {
      const errText = '红包已被抢完或已过期！';
      showGrabTip({ type: 'error', text: errText });
      message.error(errText);
    } finally {
      setTimeout(() => {
        grabbingRef.current = false;
      }, 500);
    }
  };

  const handleViewRecords = async () => {
    setRecordsVisible(true);
    await fetchRecords();
  };

  const disabled = detail?.remainingCount === 0 || detail?.status === 2;

  return (
    <>
      <div className={styles.redPacketMessage}>
        <div className={styles.redPacketContent}>
          <GiftOutlined className={styles.redPacketIcon} />
          <div className={styles.redPacketInfo}>
            <div className={styles.redPacketTitle}>
              <span className={styles.redPacketText}>{detail?.name || '红包'}</span>
              <span className={styles.redPacketStatus}>
                {detail?.remainingCount === 0
                  ? '（已抢完）'
                  : detail?.status === 2
                    ? '（已过期）'
                    : `（剩余${detail?.remainingCount ?? 0}个）`}
              </span>
            </div>
            {grabTip && (
              <div className={`${styles.grabTip} ${styles[`grabTip_${grabTip.type}`]}`}>{grabTip.text}</div>
            )}
            <div className={styles.redPacketActions}>
              <Button
                type="primary"
                size="small"
                onClick={handleGrab}
                className="grabRedPacketButton"
                disabled={disabled}
              >
                抢红包
              </Button>
              <Button type="link" size="small" onClick={handleViewRecords} className="viewRecordsButton">
                查看记录
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="红包记录"
        open={recordsVisible}
        onCancel={() => setRecordsVisible(false)}
        footer={null}
        width={360}
        destroyOnClose
        getContainer={() => document.body}
        zIndex={1000000}
      >
        <div className={styles.redPacketRecords}>
          <div className={styles.recordsList}>
            {records.length > 0 ? (
              records.map((record, index) => (
                <div key={record.id} className={styles.recordItem}>
                  <Avatar src={record.userAvatar} size={32} />
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>
                      {record.userName}
                      {index === 0 && <span className={styles.luckyKing}>👑 手气王</span>}
                    </div>
                    <div className={styles.grabTime}>
                      {new Date(record.grabTime || '').toLocaleString()}
                    </div>
                  </div>
                  <div className={styles.amount}>{record.amount} 积分</div>
                </div>
              ))
            ) : (
              <div className={styles.emptyRecords}>
                <GiftOutlined className={styles.emptyIcon} />
                <span>暂无人抢到红包</span>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RedPacketMessage;
