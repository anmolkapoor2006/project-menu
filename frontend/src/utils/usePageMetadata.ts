import { useEffect } from 'react';

export type FaviconType = 'chef' | 'spoon' | 'admin' | 'default';

const FAVICON_MAP: Record<FaviconType, string> = {
  chef: '/favicon-chef.svg',
  spoon: '/favicon-spoon.svg',
  admin: '/favicon-admin.svg',
  default: '/favicon.svg',
};

export function updateFavicon(type: FaviconType) {
  const href = FAVICON_MAP[type] || FAVICON_MAP.default;
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function usePageMetadata(title?: string, favicon: FaviconType = 'default') {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
    updateFavicon(favicon);
  }, [title, favicon]);
}
