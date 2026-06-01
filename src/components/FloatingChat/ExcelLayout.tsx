import React, { RefObject, ReactNode } from 'react';
import {
  contentToExcelCell,
  EXCEL_COLUMNS,
  EXCEL_RIBBON_TABS,
  EXCEL_SHEET_TABS,
  formatExcelTime,
  getExcelActiveCell,
  getExcelWindowCaption,
} from './excelUtils';
import styles from './index.less';

interface ChatMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
  timestamp: Date;
}

export interface ExcelLayoutProps {
  workbookTitle: string;
  messages: ChatMessage[];
  loading: boolean;
  inputValue: string;
  unreadCount: number;
  bodyRef: RefObject<HTMLDivElement>;
  headerActions: ReactNode;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onTitleBarMouseDown?: (e: React.MouseEvent) => void;
  titleBarStatic?: boolean;
}

const ExcelLayout: React.FC<ExcelLayoutProps> = ({
  workbookTitle,
  messages,
  loading,
  inputValue,
  unreadCount,
  bodyRef,
  headerActions,
  onInputChange,
  onSend,
  onScroll,
  onScrollToBottom,
  onTitleBarMouseDown,
  titleBarStatic,
}) => {
  const activeCell = getExcelActiveCell(messages.length);
  const windowCaption = getExcelWindowCaption(workbookTitle);

  return (
    <div className={styles.excelApp}>
      <div
        className={`${styles.excelTitleBar} ${titleBarStatic ? styles.excelTitleBarStatic : ''}`}
        onMouseDown={onTitleBarMouseDown}
      >
        <div className={styles.excelTitleLeft}>
          <span className={styles.excelAppIcon} aria-hidden />
          <span className={styles.excelAppName}>Excel</span>
        </div>
        <span className={styles.excelTitleCaption}>{windowCaption}</span>
        <div className={styles.excelTitleRight} onMouseDown={(e) => e.stopPropagation()}>
          {headerActions}
        </div>
      </div>

      <div className={styles.excelRibbon}>
        <div className={styles.excelRibbonTabs}>
          {EXCEL_RIBBON_TABS.map((tab) => (
            <span
              key={tab}
              className={`${styles.excelRibbonTab} ${tab === '开始' ? styles.excelRibbonTabActive : ''}`}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className={styles.excelRibbonToolbar}>
          <span className={styles.excelToolBtn} title="粘贴">
            📋
          </span>
          <span className={styles.excelToolDivider} />
          <span className={styles.excelToolBtn}>B</span>
          <span className={styles.excelToolBtn}>I</span>
          <span className={styles.excelToolBtn}>U</span>
          <span className={styles.excelToolDivider} />
          <span className={styles.excelToolGroup}>
            <span className={styles.excelToolLabel}>宋体</span>
            <span className={styles.excelToolLabel}>11</span>
          </span>
          <span className={styles.excelToolDivider} />
          <span className={styles.excelToolBtn}>≡</span>
          <span className={styles.excelToolBtn}>▦</span>
          <span className={styles.excelToolBtn}>Σ</span>
        </div>
      </div>

      <div className={styles.excelFormulaBar}>
        <span className={styles.excelNameBox}>{activeCell}</span>
        <span className={styles.excelFxLabel}>fx</span>
        <input
          className={styles.excelFormulaInput}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="在此输入…"
          maxLength={200}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button type="button" className={styles.excelFormulaEnter} title="确认 (Enter)" onClick={onSend}>
          ↵
        </button>
      </div>

      <div className={styles.excelGridWrap} ref={bodyRef} onScroll={onScroll}>
        {loading ? (
          <div className={styles.excelLoading}>正在加载数据…</div>
        ) : (
          <table className={styles.excelTable}>
            <thead>
              <tr>
                <th className={styles.excelCorner} />
                {EXCEL_COLUMNS.map((col) => (
                  <th key={col.key} className={styles.excelColHeader}>
                    <span className={styles.excelColKey}>{col.key}</span>
                  </th>
                ))}
                <th className={styles.excelColHeaderFiller} />
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, index) => {
                const rowNum = index + 1;
                const isActiveRow = rowNum === messages.length;
                return (
                  <tr key={msg.id} className={isActiveRow ? styles.excelRowActive : undefined}>
                    <td className={styles.excelRowNum}>{rowNum}</td>
                    <td className={styles.excelCell}>{formatExcelTime(msg.timestamp)}</td>
                    <td className={styles.excelCell}>{msg.sender.name}</td>
                    <td className={`${styles.excelCell} ${styles.excelCellContent}`}>
                      {contentToExcelCell(msg.content)}
                    </td>
                    <td className={styles.excelCellFiller} />
                  </tr>
                );
              })}
              {messages.length === 0 && (
                <tr>
                  <td className={styles.excelRowNum}>1</td>
                  <td className={styles.excelCell} />
                  <td className={styles.excelCell} />
                  <td className={styles.excelCell} />
                  <td className={styles.excelCellFiller} />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {unreadCount > 0 && (
        <button type="button" className={styles.excelNewRowsNotice} onClick={onScrollToBottom}>
          {unreadCount} 条新记录 ↓
        </button>
      )}

      <div className={styles.excelBottomBar}>
        <div className={styles.excelSheetTabs}>
          {EXCEL_SHEET_TABS.map((name, i) => (
            <span
              key={name}
              className={`${styles.excelSheetTab} ${i === 0 ? styles.excelSheetTabActive : ''}`}
            >
              {name}
            </span>
          ))}
          <span className={styles.excelSheetAdd}>+</span>
        </div>
        <div className={styles.excelStatusBar}>
          <span>就绪</span>
          <span className={styles.excelStatusSep}>|</span>
          <span>共 {messages.length} 行</span>
          <span className={styles.excelStatusSep}>|</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

export default ExcelLayout;
