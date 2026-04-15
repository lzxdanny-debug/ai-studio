'use client';

import { useState, type ReactNode } from 'react';
import {
  Home, Compass, Plus, FolderOpen, History,
  Video, Image as ImageIcon, Music, MessageSquare, X,
} from 'lucide-react';
import { Link, usePathname, useRouter } from '@/lib/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

function NavTab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href as any}
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative',
        active ? 'text-purple-400' : 'text-zinc-600 hover:text-zinc-400',
      )}
    >
      {/* Active indicator bar at top */}
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-purple-400" />
      )}
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}

export function MobileNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const CREATE_ITEMS = [
    { href: '/video', icon: Video, label: t('video'), color: 'text-purple-400', bg: 'bg-purple-500/15' },
    { href: '/image', icon: ImageIcon, label: t('image'), color: 'text-pink-400', bg: 'bg-pink-500/15' },
    { href: '/music', icon: Music, label: t('music'), color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { href: '/chat', icon: MessageSquare, label: t('chat'), color: 'text-green-400', bg: 'bg-green-500/15' },
  ];

  return (
    <>
      {/* Create type sheet (slides up from bottom) */}
      {createOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="absolute bottom-20 left-3 right-3 rounded-2xl border border-white/10 bg-[#1a1a1a] overflow-hidden shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {t('create_new')}
              </span>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 p-2 gap-2">
              {CREATE_ITEMS.map(({ href, icon: Icon, label, color, bg }) => (
                <button
                  key={href}
                  onClick={() => {
                    setCreateOpen(false);
                    router.push(href as any);
                  }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                    <Icon className={cn('h-4 w-4', color)} />
                  </div>
                  <span className="text-sm text-zinc-200">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar — h-16 + env(safe-area-inset-bottom) for notched phones */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md border-t border-white/5 flex items-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Home */}
        <NavTab href="/" label={t('home')} icon={<Home className="h-5 w-5" />} active={isActive('/')} />

        {/* Explore */}
        <NavTab href="/explore" label={t('explore')} icon={<Compass className="h-5 w-5" />} active={isActive('/explore')} />

        {/* Create — center elevated button */}
        <div className="flex-1 flex justify-center items-center">
          <button
            onClick={() => setCreateOpen(true)}
            className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/40 active:scale-95 transition-transform"
            aria-label={t('create_new')}
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Assets */}
        <NavTab href={isAuthenticated ? '/assets' : '/login'} label={t('assets')} icon={<FolderOpen className="h-5 w-5" />} active={isActive('/assets')} />

        {/* History */}
        <NavTab href={isAuthenticated ? '/history' : '/login'} label={t('history')} icon={<History className="h-5 w-5" />} active={isActive('/history')} />
      </nav>
    </>
  );
}
