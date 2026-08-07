/**
 * 获取操作结果显示文本
 * 只对 ROB_RESULT 和 PASS_RESULT 返回文字（叫分、不出）
 * 出牌、地主确定等不显示文字
 *
 * 注意：事件类型常量已合并到 GameEvent 枚举（types/enums/game.ts）
 * 后端 ActionResultResp.event 的值与 GameEvent 一致
 */
export const getActionDisplayText = (
  event: string | undefined,
  message: string | undefined,
): string | undefined => {
  if (!event || !message) return undefined;
  switch (event) {
    case 'ROB_RESULT':
    case 'PASS_RESULT':
      return message;
    default:
      return undefined;
  }
};