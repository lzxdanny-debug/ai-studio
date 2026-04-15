'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Sparkles, Video, Image, Music, MessageSquare, Compass,
  FolderOpen, History, Coins, LogOut, Languages
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useCredits } from '@/hooks/use-credits';
import { formatCredits } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function useLocale() {
  const pathname = usePathname();
  return pathname.startsWith('/en') ? 'en' : 'zh';
}

function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const toggle = () => {
    if (locale === 'zh') {
      const newPath = '/en' + (pathname === '/' ? '' : pathname);
      router.push(newPath);
    } else {
      const newPath = pathname.replace(/^\/en/, '') || '/';
      router.push(newPath);
    }
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      title="Switch Language"
    >
      <Languages className="h-3.5 w-3.5" />
      {locale === 'zh' ? 'EN' : '中'}
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');
  const { user, isAuthenticated, logout } = useAuthStore();
  const { data: credits } = useCredits();

  const navItems = [
    { href: '/video', label: t('video'), icon: Video },
    { href: '/image', label: t('image'), icon: Image },
    { href: '/music', label: t('music'), icon: Music },
    { href: '/chat', label: t('chat'), icon: MessageSquare },
    { href: '/explore', label: t('explore'), icon: Compass },
    ...(isAuthenticated
      ? [
          { href: '/assets', label: t('assets'), icon: FolderOpen },
          { href: '/history', label: t('history'), icon: History },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const isActive = (href: string) => {
    const localePath = pathname.replace(/^\/en/, '') || '/';
    return localePath === href || localePath.startsWith(href + '/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
          <Sparkles className="h-6 w-6 text-purple-400" />
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t('brand')}
          </span>
        </Link>

        {/* Nav Items */}
        <nav className="hidden md:flex items-center gap-0.5 mx-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {isAuthenticated ? (
            <>
              <Link
                href="/pricing"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
              >
                <Coins className="h-4 w-4" />
                {credits ? formatCredits(credits.balance) : '--'}
              </Link>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground hidden sm:block max-w-24 truncate">
                  {user?.displayName}
                </span>
                <Button variant="ghost" size="icon" onClick={handleLogout} title={t('logout')}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">{t('login')}</Button>
              </Link>
              <Link href="/register">
                <Button variant="gradient" size="sm">{t('register')}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden flex items-center justify-around px-2 py-2 border-t border-border/40 overflow-x-auto">
        {navItems.slice(0, 6).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 text-xs px-2 flex-shrink-0',
              isActive(href) ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
