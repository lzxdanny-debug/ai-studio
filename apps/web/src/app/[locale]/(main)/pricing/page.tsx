'use client';

import { ExternalLink, Sparkles, Coins, ArrowRight, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/hooks/use-credits';
import { useAuthStore } from '@/stores/auth.store';
import { formatCredits } from '@/lib/utils';
import { Link } from '@/lib/navigation';

const MOUNTSEA_PRICING_URL = 'https://shanhaiapi.com/zh/pricing/';

export default function PricingPage() {
  const t = useTranslations('pricing');
  const { isAuthenticated } = useAuthStore();
  const { data: credits } = useCredits();

  return (
    <div className="overflow-y-auto h-full">
      <div className="container mx-auto px-4 py-16 max-w-2xl flex flex-col items-center text-center gap-8">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          {t('badge')}
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Credit balance card */}
        <div className="w-full rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Coins className="h-6 w-6 text-amber-400" />
          </div>

          {isAuthenticated ? (
            <>
              <p className="text-sm text-muted-foreground">{t('current_balance')}</p>
              <p className="text-4xl font-bold text-amber-400">
                {credits ? formatCredits(credits.balance) : '—'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t('not_logged_in')}</p>
              <Link
                href="/login"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                {t('not_logged_in')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* CTA button */}
        <Button
          variant="gradient"
          size="lg"
          className="gap-2 px-8 w-full sm:w-auto"
          onClick={() => window.open(MOUNTSEA_PRICING_URL, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          {t('go_recharge')}
        </Button>

        {/* Hint */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl px-4 py-3 max-w-md text-left">
          <Info className="h-4 w-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
          <p>{t('go_recharge_hint')}</p>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60">
          {t('sync_hint')}。{t('contact')}{' '}
          <a href="mailto:hy@mountsea.ai" className="text-primary hover:underline">
            hy@mountsea.ai
          </a>
        </p>

      </div>
    </div>
  );
}
