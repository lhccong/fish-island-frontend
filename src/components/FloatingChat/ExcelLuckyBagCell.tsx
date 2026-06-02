import {
  getLuckyBagDetailUsingGet,
  joinLuckyBagUsingPost,
} from '@/services/backend/luckyBagController';
import { LUCKY_BAG_IMAGE } from '@/components/LuckyBagMessage';
import { message } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './index.less';

interface ExcelLuckyBagCellProps {
  luckyBagId: string;
}

const ExcelLuckyBagCell: React.FC<ExcelLuckyBagCellProps> = ({ luckyBagId }) => {
  const [joined, setJoined] = useState(false);
  const [ended, setEnded] = useState(false);
  const [joining, setJoining] = useState(false);
  const joiningRef = useRef(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await getLuckyBagDetailUsingGet({ luckyBagId });
      const detail = res.data;
      if (!detail) return;
      setJoined(!!detail.joined);
      setEnded(detail.status === 2 || detail.status === 3);
    } catch {
      // 忽略预检失败，点击时仍尝试参与
    }
  }, [luckyBagId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (joiningRef.current || joined || ended) return;

    joiningRef.current = true;
    setJoining(true);
    try {
      const response = await joinLuckyBagUsingPost({ luckyBagId });
      if (response.code === 0 && response.data) {
        message.success('参与成功，等待开奖！');
        setJoined(true);
        await fetchDetail();
      } else {
        message.error(response.message || '参与失败，福袋可能已结束！');
        await fetchDetail();
      }
    } catch {
      message.error('参与失败，福袋可能已结束！');
    } finally {
      setJoining(false);
      setTimeout(() => {
        joiningRef.current = false;
      }, 500);
    }
  };

  const label = joining
    ? '参与中…'
    : joined
      ? '已参与福袋'
      : ended
        ? '福袋已结束'
        : '点击参与福袋';

  return (
    <button
      type="button"
      className={`${styles.excelLuckyBagTag} ${joined ? styles.excelLuckyBagJoined : ''} ${
        ended && !joined ? styles.excelLuckyBagEnded : ''
      }`}
      disabled={joining || joined || ended}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={handleJoin}
    >
      <img src={LUCKY_BAG_IMAGE} alt="" className={styles.excelLuckyBagImg} />
      <span>{label}</span>
    </button>
  );
};

export default ExcelLuckyBagCell;
