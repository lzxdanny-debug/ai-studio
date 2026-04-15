'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// api-web (Mountsea) 统一认证页地址
// 开发环境: NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:4300
// 生产环境: NEXT_PUBLIC_AUTH_BASE_URL=https://mountsea.ai（或你的线上域名）
const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://mountsea.ai' : 'http://localhost:4300');

function LoginRedirect() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/assets';
  // prompt=login means the user explicitly logged out — force re-auth on SSO
  const prompt = searchParams.get('prompt') || '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const callbackUrl = `${window.location.origin}/auth/sso-callback`;
    const ssoUrl = new URL(`${AUTH_BASE_URL}/auth/sso`);
    ssoUrl.searchParams.set('redirect_uri', callbackUrl);
    ssoUrl.searchParams.set('app_name', 'AI 创作平台');
    if (from && from !== '/assets') {
      ssoUrl.searchParams.set('state', encodeURIComponent(from));
    }
    // Tell SSO to ignore cached session and show login form
    if (prompt === 'login') {
      ssoUrl.searchParams.set('prompt', 'login');
    }
    window.location.href = ssoUrl.toString();
  }, [from, prompt]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">正在跳转到登录页...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginRedirect />
    </Suspense>
  );
}
