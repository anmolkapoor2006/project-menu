interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const menuCache = new Map<string, CacheEntry<any>>();

export function getCachedMenu<T = any>(slug: string): T | null {
  const entry = menuCache.get(slug);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    menuCache.delete(slug);
    return null;
  }
  return entry.data;
}

export function setCachedMenu(slug: string, data: any, ttlSeconds = 60): void {
  menuCache.set(slug, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function clearMenuCache(slug?: string): void {
  if (slug) {
    menuCache.delete(slug);
  } else {
    menuCache.clear();
  }
}
