'use client';

import { useState, useRef, useEffect } from 'react';
import { Link, usePathname, useRouter } from '@/lib/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import {
  Sparkles, Video, Image as ImageIcon, Music, MessageSquare,
  Compass, FolderOpen, History, Coins,
  Home, Plus, ChevronRight, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://mountsea.ai' : 'http://localhost:4300');

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');
  const locale = useLocale();
  const { isAuthenticated } = useAuthStore();
  const consoleUrl = `${AUTH_BASE_URL}/${locale}/console`;
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (createBtnRef.current && !createBtnRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const creationItems = [
    { href: '/video', label: t('video'), icon: Video },
    { href: '/image', label: t('image'), icon: ImageIcon },
    { href: '/music', label: t('music'), icon: Music },
    { href: '/chat', label: t('chat'), icon: MessageSquare },
  ];

  const exploreItems = [
    { href: '/explore', label: t('explore'), icon: Compass },
    { href: '/pricing', label: t('pricing'), icon: Coins },
  ];

  const mainItems = [
    { href: '/', label: t('home'), icon: Home },
    ...(isAuthenticated ? [
      { href: '/assets', label: t('assets'), icon: FolderOpen },
      { href: '/history', label: t('history'), icon: History },
    ] : []),
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[220px] flex-col bg-[#0f0f0f] border-r border-white/5 z-40 select-none">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent leading-none">
            AI Studio
          </span>
        </Link>
      </div>

      {/* Create New Button */}
      <div className="px-3 mb-4" ref={createBtnRef}>
        <button
          onClick={() => setCreateMenuOpen((v) => !v)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 hover:-translate-y-px"
        >
          <Plus className="h-4 w-4" />
          {t('create_new')}
        </button>
        {/* Creation type popover — anchored to bottom of button */}
        {createMenuOpen && (
          <div className="absolute left-3 right-3 mt-1.5 z-50 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl shadow-black/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/5">
              <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">选择创作类型</span>
            </div>
            {[
              { href: '/video', icon: Video, label: '视频生成', desc: '文字或图片生成视频', color: 'text-purple-400', bg: 'bg-purple-500/15' },
              { href: '/image', icon: ImageIcon, label: '图像生成', desc: '文字描述生成图片', color: 'text-pink-400', bg: 'bg-pink-500/15' },
              { href: '/music', icon: Music, label: '音乐生成', desc: 'AI 作词作曲', color: 'text-amber-400', bg: 'bg-amber-500/15' },
              { href: '/chat', icon: MessageSquare, label: 'AI 对话', desc: '多模型智能问答', color: 'text-green-400', bg: 'bg-green-500/15' },
            ].map(({ href, icon: Icon, label, desc, color, bg }) => (
              <button
                key={href}
                onClick={() => { setCreateMenuOpen(false); router.push(href as any); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left group"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium">{label}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable nav area */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
        {/* Main */}
        {mainItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href as any}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
              isActive(href)
                ? 'bg-white/10 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {/* Creation Section */}
        <div className="pt-4 pb-1">
          <span className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
            {t('section_creation')}
          </span>
        </div>
        {creationItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href as any}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
              isActive(href)
                ? 'bg-white/10 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {/* Explore Section */}
        <div className="pt-4 pb-1">
          <span className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
            {t('section_explore')}
          </span>
        </div>
        {exploreItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href as any}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
              isActive(href)
                ? 'bg-white/10 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {/* Mountsea Console external link */}
        <a
          href={consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-zinc-400 hover:text-zinc-200 hover:bg-white/5 group"
        >
          <ExternalLink className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{t('mountsea_console')}</span>
        </a>
      </nav>
    </aside>
  );
}
