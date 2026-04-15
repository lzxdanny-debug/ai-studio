import { BookOpen } from 'lucide-react';

interface DocLinkProps {
  href: string;
  label?: string;
}

export function DocLink({ href, label = 'API 文档' }: DocLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 border border-white/8 hover:border-purple-500/30 transition-colors"
    >
      <BookOpen className="h-3 w-3 flex-shrink-0" />
      {label}
    </a>
  );
}
