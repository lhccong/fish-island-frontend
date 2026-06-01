import { history } from '@umijs/max';

/** 雪花 ID 等长整型：始终以字符串传递，禁止 Number() 转换 */
export function toUserIdString(id: string | number | undefined | null): string | undefined {
  if (id == null || id === '') return undefined;
  return typeof id === 'string' ? id : String(id);
}

export function isValidUserIdString(id: string): boolean {
  return /^\d+$/.test(id);
}

/** 跳转到农场；非本人时带 visitUserId 参数，由农场页加载好友地块 */
export function navigateToUserFarm(
  userId: string | number,
  options?: {
    nickname?: string;
    avatar?: string;
    isSelf?: boolean;
    onBeforeNavigate?: () => void;
  },
) {
  options?.onBeforeNavigate?.();
  if (options?.isSelf) {
    history.push('/point/farm');
    return;
  }
  const params = new URLSearchParams({ visitUserId: String(userId) });
  if (options?.nickname) params.set('visitNickname', options.nickname);
  if (options?.avatar) params.set('visitAvatar', options.avatar);
  history.push(`/point/farm?${params.toString()}`);
}
