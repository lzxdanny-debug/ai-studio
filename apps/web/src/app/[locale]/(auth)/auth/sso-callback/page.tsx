'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/navigation';
import { useAuthStore } from '@/stores/auth.store';
import apiClient from '@/lib/api';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SSOCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { initFromTokens } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const ssoToken = searchParams.get('sso_token');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error === 'not_authenticated') {
      // Silent SSO: api-web has no active session — just navigate to the
      // intended destination without showing an error.
      const destination = state ? decodeURIComponent(state) : '/';
      router.replace(destination);
      return;
    }

    if (error) {
      setErrorMsg(decodeURIComponent(error));
      setStatus('error');
      return;
    }

    if (!ssoToken) {
      setErrorMsg('未收到 SSO 令牌，请重新登录');
      setStatus('error');
      return;
    }

    // Exchange Mountsea SSO token for local JWT
    (async () => {
      try {
        const res = await apiClient.post('/auth/sso-exchange', { ssoToken }) as any;
        const { accessToken, refreshToken } = res.data ?? res;
        await initFromTokens(accessToken, refreshToken);

        // Redirect to original destination (stored in state) or default
        const destination = state ? decodeURIComponent(state) : '/assets';
        router.replace(destination);
      } catch (err: any) {
        setErrorMsg(err?.message || 'SSO 登录失败，请重试');
        setStatus('error');
      }
    })();
  }, [searchParams, initFromTokens, router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">登录失败</h2>
          <p className="text-muted-foreground mb-6">{errorMsg}</p>
          <Button onClick={() => router.push('/login')}>返回登录</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">正在完成登录，请稍候...</p>
      </div>
    </div>
  );
}

export default function SSOCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <SSOCallbackContent />
    </Suspense>
  );
}
