export function isHttpUrl(url?: string | null): boolean {
  return Boolean(url) && /^https?:\/\//i.test(url ?? '');
}

export function resolveAssetUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  if (isHttpUrl(url)) {
    return url;
  }

  if (typeof window === 'undefined') {
    return url;
  }

  return new URL(url, window.location.origin).toString();
}

export function getAssetDirectory(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  const normalized = url.split('?')[0]?.split('#')[0] ?? url;
  const slashIndex = normalized.lastIndexOf('/');
  if (slashIndex < 0) {
    return undefined;
  }

  return normalized.slice(0, slashIndex + 1);
}
