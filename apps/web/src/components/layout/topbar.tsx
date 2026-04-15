'use client';

import { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';

const FeedbackModal = lazy(() =>
  import('@/components/feedback/feedback-modal').then((m) => ({ default: m.FeedbackModal })),
);
import { History, Coins, Globe, ChevronDown, LogOut, User, Sparkles, Shield, MessageSquarePlus } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useCredits } from '@/hooks/use-credits';
import { formatCredits } from '@/lib/utils';

const LOCALES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

function LanguageDropdown() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname(); // locale-stripped path
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchTo = (target: string) => {
    setOpen(false);
    if (target === locale) return;
    // next-intl router.push with locale option handles prefix automatically
    router.push(pathname, { locale: target });
  };

  const current = LOCALES.find((l) => l.value === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors text-xs"
      >
        <Globe className="h-3.5 w-3.5" />
        {/* Hide label + chevron on mobile — globe icon alone is enough */}
        <span className="hidden md:inline">{current.label}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform hidden md:inline-block', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-32 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl overflow-hidden z-50">
          {LOCALES.map((l) => (
            <button
              key={l.value}
              onClick={() => switchTo(l.value)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left',
                l.value === locale
                  ? 'text-white bg-white/8'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', l.value === locale ? 'bg-purple-400' : 'opacity-0')} />
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const t = useTranslations('nav');
  const { user, logout } = useAuthStore();

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/');
  };

  const handleFeedback = () => {
    setOpen(false);
    setFeedbackOpen(true);
  };

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 pl-2 md:pl-3 border-l border-white/10 hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white">
              {user?.displayName?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          {/* Display name + chevron only on desktop */}
          <span className="text-xs text-zinc-400 hidden md:block max-w-[80px] truncate">
            {user?.displayName}
          </span>
          <ChevronDown className={cn('h-3 w-3 text-zinc-600 transition-transform hidden md:block', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl overflow-hidden z-50">
            <div className="px-3 py-2.5 border-b border-white/5">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.displayName}</p>
              <p className="text-[10px] text-zinc-600 truncate">{user?.email}</p>
            </div>
            <Link
              href="/assets"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              {t('assets')}
            </Link>
            {user?.role === 'admin' && (
              <a
                href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002/admin'}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-white/5 transition-colors"
              >
                <Shield className="h-3.5 w-3.5" />
                {t('admin_panel')}
              </a>
            )}
            <div className="border-t border-white/5 mt-0.5">
              <button
                onClick={handleFeedback}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                {t('feedback')}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('logout')}
              </button>
            </div>
          </div>
        )}
      </div>

      {feedbackOpen && createPortal(
        <Suspense fallback={null}>
          <FeedbackModal onClose={() => setFeedbackOpen(false)} />
        </Suspense>,
        document.body,
      )}
    </>
  );
}

export function TopBar() {
  const t = useTranslations('nav');
  const { isAuthenticated } = useAuthStore();
  const { data: credits } = useCredits();

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-30">
      {/* Mobile: Logo；Desktop: empty placeholder */}
      <Link href="/" className="md:hidden flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-bold text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI Studio
        </span>
      </Link>
      <div className="hidden md:block" />

      <div className="flex items-center gap-1.5 md:gap-2">
        {isAuthenticated && (
          <>
            <Link
              href="/pricing"
              className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-400 font-medium">
                {credits ? formatCredits(credits.balance) : '--'}
              </span>
            </Link>

            <Link
              href="/history"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors text-xs"
            >
              <History className="h-3.5 w-3.5" />
              {t('history')}
            </Link>
          </>
        )}

        <LanguageDropdown />

        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <div className="flex items-center gap-1 md:gap-1.5 pl-2 border-l border-white/10">
            <Link href="/login" className="hidden md:block px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              {t('login')}
            </Link>
            <Link
              href="/register"
              className="px-2.5 md:px-3 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all"
            >
              {t('register')}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
