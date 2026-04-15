// Re-export locale-aware navigation utilities from next-intl.
// Using these instead of next/link and next/navigation ensures that
// generated hrefs automatically include the correct locale prefix.
import { createNavigation } from 'next-intl/navigation';
import { routing } from '@/i18n/routing';

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
