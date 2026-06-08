import { externalImageProps } from '@/constants';
import { parseLuckyBagInline } from '@/components/LuckyBagMessage';
import { parseRedPacketInline } from '@/components/RedPacketMessage';
import { Image } from 'antd';
import React from 'react';
import ExcelLuckyBagCell from './ExcelLuckyBagCell';
import ExcelRedPacketCell from './ExcelRedPacketCell';
import { contentToExcelCell, parseExcelCellParts } from './excelUtils';
import styles from './index.less';

interface ExcelCellContentProps {
  content: string;
  showImages: boolean;
}

const ExcelCellContent: React.FC<ExcelCellContentProps> = ({ content, showImages }) => {
  const redPacket = parseRedPacketInline(content);
  if (redPacket) {
    return (
      <span className={styles.excelCellInner}>
        {redPacket.prefix ? (
          <span className={styles.excelCellTextPart}>{redPacket.prefix}</span>
        ) : null}
        <ExcelRedPacketCell redPacketId={redPacket.redPacketId} />
      </span>
    );
  }

  const luckyBag = parseLuckyBagInline(content);
  if (luckyBag) {
    return (
      <span className={styles.excelCellInner}>
        {luckyBag.prefix ? <span className={styles.excelCellTextPart}>{luckyBag.prefix}</span> : null}
        <ExcelLuckyBagCell luckyBagId={luckyBag.luckyBagId} />
      </span>
    );
  }

  if (!showImages) {
    return <>{contentToExcelCell(content)}</>;
  }

  const parts = parseExcelCellParts(content);
  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1 && parts[0].type === 'text') {
    return <>{parts[0].value}</>;
  }

  return (
    <span className={styles.excelCellInner}>
      {parts.map((part, index) => {
        if (part.type === 'image') {
          return (
            <Image
              {...externalImageProps}
              key={`img-${index}`}
              src={part.url}
              alt=""
              className={styles.excelCellImg}
              rootClassName={styles.excelCellImgWrap}
              preview={{ getContainer: () => document.body, zIndex: 1000002 }}
            />
          );
        }
        return part.value ? (
          <span key={`text-${index}`} className={styles.excelCellTextPart}>
            {part.value}
          </span>
        ) : null;
      })}
    </span>
  );
};

export default ExcelCellContent;
