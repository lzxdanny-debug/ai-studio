'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, Share2, Link2, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from '@/lib/navigation';

// ─── Social platform config ────────────────────────────────────────
function buildShareLinks(url: string, text: string) {
  const enc = encodeURIComponent;
  return [
    {
      key: 'twitter',
      labelKey: 'share_twitter' as const,
      icon: XIcon,
      color: 'hover:bg-black/80 hover:text-white',
      href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`,
    },
    {
      key: 'facebook',
      labelKey: 'share_facebook' as const,
      icon: FacebookIcon,
      color: 'hover:bg-[#1877F2]/20 hover:text-[#1877F2]',
      // `u` = URL to share; `quote` = pre-filled post text (Facebook's supported parameter)
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`,
    },
    {
      key: 'whatsapp',
      labelKey: 'share_whatsapp' as const,
      icon: WhatsAppIcon,
      color: 'hover:bg-[#25D366]/20 hover:text-[#25D366]',
      href: `https://wa.me/?text=${enc(text + ' ' + url)}`,
    },
    {
      key: 'telegram',
      labelKey: 'share_telegram' as const,
      icon: TelegramIcon,
      color: 'hover:bg-[#229ED9]/20 hover:text-[#229ED9]',
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
    },
    {
      key: 'weibo',
      labelKey: 'share_weibo' as const,
      icon: WeiboIcon,
      color: 'hover:bg-[#E6162D]/20 hover:text-[#E6162D]',
      href: `https://service.weibo.com/share/share.php?url=${enc(url)}&title=${enc(text)}`,
    },
    {
      key: 'line',
      labelKey: 'share_line' as const,
      icon: LineIcon,
      color: 'hover:bg-[#06C755]/20 hover:text-[#06C755]',
      href: `https://social-plugins.line.me/lineit/share?url=${enc(url)}`,
    },
  ] as const;
}

// ─── SVG brand icons ──────────────────────────────────────────────
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  );
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073c0 6.027 4.388 11.024 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.79-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.612 23.097 24 18.1 24 12.073Z" />
    </svg>
  );
}
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
function WeiboIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.187-.861 1.805-.601.627.266.813.972.43 1.592zm2.563-1.171c-.17.275-.536.393-.82.262-.277-.124-.362-.44-.192-.707.17-.269.524-.387.806-.263.286.12.375.432.206.708zm1.садовые26-3.124C11.11 11.97 8.555 11.816 6.57 12.88c-1.985 1.062-2.89 3.019-2.158 4.374.734 1.356 2.934 1.612 4.916.561 1.985-1.062 2.892-3.019 2.16-4.374zm7.336-3.748c-.177-.053-.3-.09-.207-.32.201-.505.221-1.017-.003-1.547-.43-1.025-1.614-1.541-2.671-1.162-.383.137-.443.136-.527-.221-.171-.717-.686-1.33-1.388-1.577-1.433-.5-2.98.317-3.463 1.812-.083.257-.109.524-.075.787.07.544-.205.586-.605.477-1.066-.292-2.085.295-2.285 1.317-.17.864.378 1.734 1.22 1.964.145.04.247.069.127.29-.357.657-.314 1.376.038 1.947.569.928 1.722 1.279 2.703.831.166-.076.252-.082.305.1.177.618.708 1.048 1.328 1.068a1.36 1.36 0 001.41-1.068c.044-.188.123-.225.295-.147.978.43 2.033.067 2.47-.839.233-.481.218-1.009.007-1.481-.083-.183-.028-.266.16-.288.836-.099 1.549-.71 1.751-1.584.236-1.01-.342-2.008-1.312-2.358z" />
    </svg>
  );
}
function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────
interface LikeShareBarProps {
  taskId: string;
  likeCount: number;
  /** URL for sharing. If undefined, the bar is in asset-detail mode and will build URL on the fly. */
  shareUrl?: string;
  shareText?: string;
  /** If true (private asset), share is disabled and shows tooltip */
  isPrivate?: boolean;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────
export function LikeShareBar({
  taskId,
  likeCount: initialLikeCount,
  shareUrl: explicitShareUrl,
  shareText = '',
  isPrivate = false,
  className,
}: LikeShareBarProps) {
  const t = useTranslations('likeShare');
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const shareRef = useRef<HTMLDivElement>(null);

  const LIKED_KEY = `liked:${taskId}`;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liking, setLiking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync like count when prop changes (e.g. after refetch)
  useEffect(() => {
    setLikeCount(initialLikeCount);
  }, [initialLikeCount]);

  // Read localStorage once on mount
  useEffect(() => {
    try {
      setLiked(localStorage.getItem(LIKED_KEY) === '1');
    } catch { /* SSR */ }
  }, [LIKED_KEY]);

  // Close share menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (liked || liking) return;
    setLiking(true);
    // Optimistic update
    setLiked(true);
    setLikeCount((c) => c + 1);
    try {
      await apiClient.post(`/explore/${taskId}/like`);
      localStorage.setItem(LIKED_KEY, '1');
    } catch {
      // rollback
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } finally {
      setLiking(false);
    }
  };

  const getShareUrl = () => {
    if (explicitShareUrl) return explicitShareUrl;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/explore/${taskId}`;
    }
    return '';
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const shareLinks = buildShareLinks(getShareUrl(), shareText);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* ── Like button ── */}
      <button
        onClick={handleLike}
        disabled={liking}
        title={!isAuthenticated ? t('login_to_like') : liked ? t('liked') : t('like')}
        className={cn(
          'flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all select-none',
          liked
            ? 'bg-red-500/15 border-red-500/40 text-red-300'
            : 'bg-white/3 border-white/10 text-zinc-400 hover:border-red-500/30 hover:text-red-300 hover:bg-red-500/8',
          liking && 'opacity-60',
        )}
      >
        <Heart
          className={cn(
            'h-4 w-4 transition-transform',
            liked ? 'fill-current scale-110' : '',
            liking && 'animate-pulse',
          )}
        />
        <span>{likeCount > 0 ? likeCount : t('like')}</span>
      </button>

      {/* ── Share button ── */}
      <div ref={shareRef} className="relative">
        <button
          onClick={() => {
            if (isPrivate) return;
            setShareOpen((v) => !v);
          }}
          title={isPrivate ? t('private_cant_share') : t('share')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all',
            isPrivate
              ? 'border-white/5 text-zinc-700 cursor-not-allowed'
              : 'bg-white/3 border-white/10 text-zinc-400 hover:border-purple-500/30 hover:text-purple-300 hover:bg-purple-500/8',
          )}
        >
          <Share2 className="h-4 w-4" />
          <span>{t('share')}</span>
        </button>

        {/* Share dropdown — opens to the right of the button so it never clips the left edge */}
        {shareOpen && !isPrivate && (
          <div className="absolute bottom-full mb-2 left-0 z-50 w-56 rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl shadow-black/60 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {t('share_to')}
              </span>
              <button onClick={() => setShareOpen(false)} className="text-zinc-700 hover:text-zinc-400 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-2 space-y-0.5">
              {shareLinks.map(({ key, labelKey, icon: Icon, color, href }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShareOpen(false)}
                  className={cn(
                    'flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl text-sm text-zinc-300 transition-colors',
                    color,
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {t(labelKey)}
                </a>
              ))}

              {/* Copy link */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-white/8 transition-colors"
              >
                {copied
                  ? <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  : <Link2 className="h-4 w-4 flex-shrink-0" />}
                <span className={copied ? 'text-emerald-400' : ''}>{copied ? t('copied') : t('copy_link')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
