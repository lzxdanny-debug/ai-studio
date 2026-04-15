import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Server-side layout that generates Open Graph / Twitter Card meta tags
 * for the explore detail page. The page itself is a client component so
 * generateMetadata must live here instead.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ taskId: string; locale: string }>;
}): Promise<Metadata> {
  const { taskId } = await params;

  try {
    const res = await fetch(`${API_BASE}/explore/${taskId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};

    const json = await res.json();
    const task = json.data ?? json;

    const prompt: string = task.prompt || '';
    const title = prompt
      ? `${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''} — AI Studio`
      : 'AI Studio — AI Generated Content';
    const description = prompt || 'AI generated video, image or music from AI Studio.';

    // For images: use first result URL (video thumbnail won't work directly,
    // but image and music cover URLs work as OG images).
    const ogImage: string | undefined =
      task.type === 'image'
        ? task.resultUrls?.[0]
        : task.type === 'music'
          ? task.resultUrls?.[1] // cover image is index 1 for music
          : undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: prompt }] } : {}),
      },
      twitter: {
        card: ogImage ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default function ExploreDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
