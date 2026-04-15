import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SilentSsoCheck } from '@/components/silent-sso-check';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-[#0a0a0a] flex overflow-hidden">
      {/* Silently sync login state from api-web (Mountsea) once per session */}
      <SilentSsoCheck />
      <Sidebar />
      {/* Right column: top bar + scrollable/constrained main */}
      {/* md:ml-[220px] — mobile has no sidebar so no offset needed */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[220px]">
        <TopBar />
        {/*
          overflow-hidden here so child pages that use h-full can measure
          correctly. Pages that need vertical scroll should add
          overflow-y-auto inside themselves.
        */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
        {/* Spacer that reserves room for the fixed MobileNav on mobile (matches nav height incl. safe area) */}
        <div
          className="flex-shrink-0 md:hidden"
          style={{ height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        />
      </div>
      <MobileNav />
    </div>
  );
}
