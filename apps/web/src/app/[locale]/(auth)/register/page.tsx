'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://mountsea.ai' : 'http://localhost:4300');

export default function RegisterPage() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const callbackUrl = `${window.location.origin}/auth/sso-callback`;
    const ssoUrl = new URL(`${AUTH_BASE_URL}/auth/sso`);
    ssoUrl.searchParams.set('redirect_uri', callbackUrl);
    ssoUrl.searchParams.set('app_name', 'AI 创作平台');
    ssoUrl.searchParams.set('view', 'register');
    window.location.href = ssoUrl.toString();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">正在跳转到注册页...</p>
      </div>
    </div>
  );
}
