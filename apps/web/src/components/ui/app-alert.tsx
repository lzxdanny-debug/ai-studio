'use client';

import { useState, useCallback, createPortal } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertType = 'error' | 'warning' | 'info' | 'success';

interface AlertState {
  message: string;
  type: AlertType;
  title?: string;
}

const TYPE_CONFIG: Record<AlertType, { icon: React.ElementType; iconClass: string; borderClass: string; bgClass: string }> = {
  error:   { icon: AlertCircle,   iconClass: 'text-red-400',    borderClass: 'border-red-500/20',    bgClass: 'bg-red-500/5' },
  warning: { icon: AlertCircle,   iconClass: 'text-amber-400',  borderClass: 'border-amber-500/20',  bgClass: 'bg-amber-500/5' },
  info:    { icon: Info,          iconClass: 'text-blue-400',   borderClass: 'border-blue-500/20',   bgClass: 'bg-blue-500/5' },
  success: { icon: CheckCircle,   iconClass: 'text-green-400',  borderClass: 'border-green-500/20',  bgClass: 'bg-green-500/5' },
};

export function useAppAlert() {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = useCallback((message: string, type: AlertType = 'error', title?: string) => {
    setAlert({ message, type, title });
  }, []);

  const closeAlert = useCallback(() => setAlert(null), []);

  const AppAlertModal = alert ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAlert} />

      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-sm rounded-2xl border shadow-2xl',
        'bg-[#1a1a2e] text-white',
        TYPE_CONFIG[alert.type].borderClass,
      )}>
        {/* Header */}
        <div className={cn('flex items-center gap-3 px-5 py-4 rounded-t-2xl', TYPE_CONFIG[alert.type].bgClass)}>
          {(() => { const Icon = TYPE_CONFIG[alert.type].icon; return <Icon className={cn('h-5 w-5 flex-shrink-0', TYPE_CONFIG[alert.type].iconClass)} />; })()}
          <span className="text-sm font-semibold flex-1">
            {alert.title ?? (alert.type === 'error' ? '错误' : alert.type === 'warning' ? '提示' : '通知')}
          </span>
          <button onClick={closeAlert} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{alert.message}</p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end">
          <button
            onClick={closeAlert}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium text-zinc-200 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return { showAlert, AppAlertModal };
}
