'use client';

import { useState, useRef } from 'react';
import { X, Bug, Lightbulb, MessageSquare, Upload, ImageIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type Category = 'bug' | 'suggestion' | 'other';

interface FeedbackModalProps {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const t = useTranslations('feedback');
  const { isAuthenticated } = useAuthStore();
  const [category, setCategory] = useState<Category>('bug');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const CATEGORIES: { key: Category; label: string; icon: React.ElementType; color: string; bg: string }[] = [
    { key: 'bug', label: t('type_bug'), icon: Bug, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
    { key: 'suggestion', label: t('type_suggestion'), icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { key: 'other', label: t('type_other'), icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  ];

  const placeholderMap: Record<Category, string> = {
    bug: t('placeholder_bug'),
    suggestion: t('placeholder_suggestion'),
    other: t('placeholder_other'),
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || t('error_upload'));
      const url: string = json?.data?.url ?? json?.url ?? '';
      setScreenshotUrl(url);
      setScreenshotName(file.name);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error_upload'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) { setError(t('error_empty')); return; }
    setSubmitting(true);
    setError('');
    try {
      const body: Record<string, string> = {
        category,
        content: content.trim(),
        pagePath: window.location.pathname,
      };
      if (email.trim()) body.contactEmail = email.trim();
      if (screenshotUrl) body.screenshotUrl = screenshotUrl;

      const res = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.message || t('error_submit'));
      }
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error_submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{t('title')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          /* 成功状态 */
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="text-base font-semibold text-slate-800">{t('success_title')}</p>
            <p className="text-sm text-slate-400 text-center px-8">{t('success_desc')}</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors">
              {t('close')}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4 space-y-4">

              {/* 分类 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">{t('type_label')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(({ key, label, icon: Icon, color, bg }) => (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                        category === key ? `${bg} ${color} border-current` : 'border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 文字描述 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t('content_label')} <span className="text-red-400">{t('content_required')}</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={placeholderMap[category]}
                  maxLength={1000}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none"
                />
                <p className="text-right text-[10px] text-slate-300 mt-1">{content.length}/1000</p>
              </div>

              {/* 截图上传 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('screenshot_label')}</label>
                {isAuthenticated ? (
                  screenshotUrl ? (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <ImageIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-xs text-emerald-700 truncate flex-1">{screenshotName}</span>
                      <button onClick={() => { setScreenshotUrl(''); setScreenshotName(''); }} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-purple-300 hover:text-purple-500 transition-colors disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? t('uploading') : t('upload_hint')}
                    </button>
                  )
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 text-center">
                    {t('login_to_upload')}
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                />
              </div>

              {/* 联系邮箱 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('email_label')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!submitted && (
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              {t('cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? t('submitting') : t('submit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
