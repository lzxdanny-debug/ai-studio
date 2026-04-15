import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  localePrefix: 'as-needed',
  // Disable browser-language auto-detection so the default locale is always
  // Chinese unless the user explicitly navigates to /en/...
  localeDetection: false,
});
