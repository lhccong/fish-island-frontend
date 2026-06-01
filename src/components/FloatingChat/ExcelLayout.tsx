import React, { RefObject, ReactNode, useEffect, useState } from 'react';
import {
  contentToExcelCell,
  EXCEL_COLUMNS,
  EXCEL_RIBBON_TABS,
  EXCEL_SHEET_TABS,
  ExcelLayoutVariant,
  formatExcelTime,
  getExcelActiveCell,
  getExcelExtraColumnCount,
  getExcelExtraColumnKeys,
  getExcelFillerRowCount,
  getExcelLayoutMetrics,
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
  /** full=全屏/铺满；compact=普通悬浮窗；mini=小屏悬浮窗 */
  variant?: ExcelLayoutVariant;
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
  variant = 'full',
}) => {
  const activeCell = getExcelActiveCell(messages.length);
  const windowCaption = getExcelWindowCaption(workbookTitle);
  const metrics = getExcelLayoutMetrics(variant);
  const isMini = variant === 'mini';
  const isCompact = variant === 'compact' || isMini;
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const update = () => {
      setGridSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bodyRef]);

  const extraColKeys = getExcelExtraColumnKeys(getExcelExtraColumnCount(gridSize.width, variant));
  const fillerRowCount = getExcelFillerRowCount(gridSize.height, messages.length);
  const ribbonTabs = isMini ? EXCEL_RIBBON_TABS.slice(0, 3) : isCompact ? EXCEL_RIBBON_TABS.slice(0, 5) : EXCEL_RIBBON_TABS;
  const sheetTabs = isCompact ? EXCEL_SHEET_TABS.slice(0, 1) : EXCEL_SHEET_TABS;
  const dataRowCount = Math.max(1, messages.length);

  const renderExtraCells = (rowClass?: string) =>
    extraColKeys.map((key) => (
      <td key={key} className={`${styles.excelCell} ${styles.excelCellEmpty} ${rowClass || ''}`} />
    ));

  return (
    <div
      className={`${styles.excelApp} ${isMini ? styles.excelAppMini : ''} ${
        isCompact && !isMini ? styles.excelAppCompact : ''
      }`}
    >
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
          {ribbonTabs.map((tab) => (
            <span
              key={tab}
              className={`${styles.excelRibbonTab} ${tab === '开始' ? styles.excelRibbonTabActive : ''}`}
            >
              {tab}
            </span>
          ))}
        </div>
        {!isMini && (
          <div className={styles.excelRibbonToolbar}>
            <span className={styles.excelToolBtn} title="粘贴">
              📋
            </span>
            <span className={styles.excelToolDivider} />
            <span className={styles.excelToolBtn}>B</span>
            <span className={styles.excelToolBtn}>I</span>
            <span className={styles.excelToolBtn}>U</span>
            {!isCompact && (
              <>
                <span className={styles.excelToolDivider} />
                <span className={styles.excelToolGroup}>
                  <span className={styles.excelToolLabel}>宋体</span>
                  <span className={styles.excelToolLabel}>11</span>
                </span>
                <span className={styles.excelToolDivider} />
                <span className={styles.excelToolBtn}>≡</span>
                <span className={styles.excelToolBtn}>▦</span>
                <span className={styles.excelToolBtn}>Σ</span>
              </>
            )}
          </div>
        )}
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
          <div className={styles.excelGridSheet}>
            <table className={styles.excelTable}>
              <colgroup>
                <col style={{ width: metrics.rowNumWidth }} />
                <col style={{ width: metrics.colA }} />
                <col style={{ width: metrics.colB }} />
                <col className={styles.excelColC} />
                {extraColKeys.map((key) => (
                  <col key={key} style={{ width: metrics.extraColWidth }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.excelCorner} />
                  {EXCEL_COLUMNS.map((col) => (
                    <th key={col.key} className={styles.excelColHeader}>
                      <span className={styles.excelColKey}>{col.key}</span>
                    </th>
                  ))}
                  {extraColKeys.map((key) => (
                    <th key={key} className={styles.excelColHeader}>
                      <span className={styles.excelColKey}>{key}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {messages.length > 0
                  ? messages.map((msg, index) => {
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
                          {renderExtraCells()}
                        </tr>
                      );
                    })
                  : (
                    <tr>
                      <td className={styles.excelRowNum}>1</td>
                      <td className={styles.excelCell} />
                      <td className={styles.excelCell} />
                      <td className={styles.excelCell} />
                      {renderExtraCells()}
                    </tr>
                  )}
                {Array.from({ length: fillerRowCount }, (_, i) => {
                  const rowNum = dataRowCount + i + 1;
                  return (
                    <tr key={`filler-${rowNum}`} className={styles.excelFillerRow}>
                      <td className={styles.excelRowNum}>{rowNum}</td>
                      <td className={`${styles.excelCell} ${styles.excelCellEmpty}`} />
                      <td className={`${styles.excelCell} ${styles.excelCellEmpty}`} />
                      <td className={`${styles.excelCell} ${styles.excelCellEmpty}`} />
                      {renderExtraCells(styles.excelCellEmpty)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {unreadCount > 0 && (
        <button type="button" className={styles.excelNewRowsNotice} onClick={onScrollToBottom}>
          {unreadCount} 条新记录 ↓
        </button>
      )}

      <div className={styles.excelBottomBar}>
        <div className={styles.excelSheetTabs}>
          {sheetTabs.map((name, i) => (
            <span
              key={name}
              className={`${styles.excelSheetTab} ${i === 0 ? styles.excelSheetTabActive : ''}`}
            >
              {name}
            </span>
          ))}
          {!isCompact && <span className={styles.excelSheetAdd}>+</span>}
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
