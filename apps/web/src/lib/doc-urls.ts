export const DOCS_BASE = 'https://docs.mountsea.ai';

export const MODEL_DOC_URLS: Record<string, string> = {
  // ─── Video ───────────────────────────────────────────────
  'veo2':        `${DOCS_BASE}/api-reference/gemini/introduction`,
  'veo3':        `${DOCS_BASE}/api-reference/gemini/introduction`,
  'veo3-fast':   `${DOCS_BASE}/api-reference/gemini/introduction`,
  'sora-2':      `${DOCS_BASE}/api-reference/sora/introduction`,
  'grok-video':  `${DOCS_BASE}/api-reference/xai/introduction`,

  // ─── Image ───────────────────────────────────────────────
  'nano-banana':     `${DOCS_BASE}/api-reference/gemini/introduction`,
  'nano-banana-pro': `${DOCS_BASE}/api-reference/gemini/introduction`,
  'nano-banana-2':   `${DOCS_BASE}/api-reference/gemini/introduction`,
  'grok-image':      `${DOCS_BASE}/api-reference/xai/introduction`,

  // ─── Music ───────────────────────────────────────────────
  'chirp-v55':  `${DOCS_BASE}/api-reference/suno/generate`,
  'chirp-v50':  `${DOCS_BASE}/api-reference/suno/generate`,
  'Lyria 3 Pro': `${DOCS_BASE}/api-reference/producer/introduction`,

  // ─── Chat ────────────────────────────────────────────────
  'gpt-5.1':                    `${DOCS_BASE}/api-reference/chat/completions`,
  'gpt-5.2':                    `${DOCS_BASE}/api-reference/chat/completions`,
  'claude-sonnet-4-6':          `${DOCS_BASE}/api-reference/chat/completions`,
  'claude-opus-4-6':            `${DOCS_BASE}/api-reference/chat/completions`,
  'claude-haiku-4-5-20251001':  `${DOCS_BASE}/api-reference/chat/completions`,
  'gemini-3-pro':               `${DOCS_BASE}/api-reference/chat/completions`,
  'gemini-3-flash':             `${DOCS_BASE}/api-reference/chat/completions`,
  'gemini-2.5-pro':             `${DOCS_BASE}/api-reference/chat/completions`,
  'gemini-2.5-flash':           `${DOCS_BASE}/api-reference/chat/completions`,
};

export function getDocUrl(model: string): string {
  return MODEL_DOC_URLS[model] ?? `${DOCS_BASE}/introduction`;
}
