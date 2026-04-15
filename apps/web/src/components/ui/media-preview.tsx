'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

/** 视频：进入视口自动静音循环播放，离开暂停 */
export function AutoPlayVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      preload="metadata"
      muted
      loop
      playsInline
    />
  );
}

/** 图片：hover 时 Ken Burns 缓慢缩放 */
export function KenBurnsImage({
  src,
  alt,
  className,
  wrapperClassName,
}: {
  src: string;
  alt?: string;
  className?: string;
  wrapperClassName?: string;
}) {
  return (
    <div className={cn('overflow-hidden w-full h-full', wrapperClassName)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ''}
        className={cn(
          'w-full h-full object-cover transition-transform duration-[8000ms] ease-in-out group-hover:scale-110',
          className,
        )}
      />
    </div>
  );
}

/** 音乐：跳动音波条 */
export function MusicBars({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-end gap-[3px] h-8', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white/80"
          style={{
            animation: `musicBar 0.9s ease-in-out ${i * 0.12}s infinite alternate`,
            height: `${20 + Math.sin(i) * 10}px`,
          }}
        />
      ))}
    </div>
  );
}
