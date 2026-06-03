import {
  getRedPacketDetailUsingGet,
  getRedPacketRecordsUsingGet,
  grabRedPacketUsingPost,
} from '@/services/backend/redPacketController';
import { isQuizRedPacket } from '@/components/RedPacketMessage';
import { GiftOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Avatar, Button, Input, message, Modal } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './index.less';

interface ExcelRedPacketCellProps {
  redPacketId: string;
}

type GrabTip = { type: 'success' | 'error'; text: string };

const ExcelRedPacketCell: React.FC<ExcelRedPacketCellProps> = ({ redPacketId }) => {
  const [detail, setDetail] = useState<API.RedPacket | null>(null);
  const [recordsVisible, setRecordsVisible] = useState(false);
  const [records, setRecords] = useState<API.VO[]>([]);
  const [grabTip, setGrabTip] = useState<GrabTip | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const grabbingRef = useRef(false);
  const grabTipTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const isQuiz = isQuizRedPacket(detail?.type);

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

  const handleGrab = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (grabbingRef.current) return;
    if (isQuiz && !userAnswer.trim()) {
      message.warning('请先输入答案！');
      return;
    }
    grabbingRef.current = true;
    try {
      const response = await grabRedPacketUsingPost({
        redPacketId,
        ...(isQuiz ? { answer: userAnswer.trim() } : {}),
      });
      if (response.code === 0) {
        const amount = response.data ?? 0;
        const text = `恭喜你抢到 ${amount} 积分！`;
        showGrabTip({ type: 'success', text });
        message.success(text);
        setUserAnswer('');
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

  const handleViewRecords = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecordsVisible(true);
    await fetchRecords();
  };

  const disabled = detail?.remainingCount === 0 || detail?.status === 2;
  const statusText =
    detail?.remainingCount === 0
      ? '已抢完'
      : detail?.status === 2
        ? '已过期'
        : `剩余 ${detail?.remainingCount ?? 0} 个`;

  return (
    <>
      <div
        className={`${styles.excelRedPacketCard} ${isQuiz ? styles.excelQuizRedPacketCard : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {isQuiz ? (
          <QuestionCircleOutlined className={styles.excelQuizRedPacketIcon} />
        ) : (
          <GiftOutlined className={styles.excelRedPacketIcon} />
        )}
        <div className={styles.excelRedPacketBody}>
          {isQuiz && <span className={styles.excelQuizRedPacketBadge}>答题红包</span>}
          <div className={styles.excelRedPacketTitle}>
            <span className={isQuiz ? styles.excelQuizRedPacketName : styles.excelRedPacketName}>
              {isQuiz ? detail?.name || '题目加载中…' : detail?.name || '红包'}
            </span>
            <span className={isQuiz ? styles.excelQuizRedPacketStatus : styles.excelRedPacketStatus}>
              {statusText}
            </span>
          </div>
          {isQuiz && !disabled && (
            <Input
              size="small"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="输入答案"
              className={styles.excelQuizAnswerInput}
              onPressEnter={(e) => {
                e.stopPropagation();
                handleGrab(e as unknown as React.MouseEvent);
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              maxLength={100}
            />
          )}
          {grabTip && (
            <div
              className={`${styles.excelRedPacketTip} ${
                grabTip.type === 'success' ? styles.excelRedPacketTipSuccess : styles.excelRedPacketTipError
              }`}
            >
              {grabTip.text}
            </div>
          )}
          <div className={styles.excelRedPacketActions}>
            <Button
              type="primary"
              size="small"
              disabled={disabled}
              className={isQuiz ? styles.excelQuizRedPacketGrabBtn : styles.excelRedPacketGrabBtn}
              onClick={handleGrab}
            >
              {isQuiz ? '提交答案' : '抢红包'}
            </Button>
            <Button type="link" size="small" className={styles.excelRedPacketLinkBtn} onClick={handleViewRecords}>
              记录
            </Button>
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
        zIndex={1000002}
      >
        <div className={styles.excelRedPacketRecords}>
          {records.length > 0 ? (
            records.map((record, index) => (
              <div key={record.id} className={styles.excelRedPacketRecordItem}>
                <Avatar src={record.userAvatar} size={28} />
                <div className={styles.excelRedPacketRecordInfo}>
                  <span className={styles.excelRedPacketRecordName}>
                    {record.userName}
                    {index === 0 && <span className={styles.excelRedPacketLucky}> 👑</span>}
                  </span>
                  <span className={styles.excelRedPacketRecordTime}>
                    {record.grabTime ? new Date(record.grabTime).toLocaleString() : ''}
                  </span>
                </div>
                <span className={styles.excelRedPacketRecordAmount}>{record.amount} 积分</span>
              </div>
            ))
          ) : (
            <div className={styles.excelRedPacketRecordsEmpty}>暂无人抢到红包</div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ExcelRedPacketCell;
