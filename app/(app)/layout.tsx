import Link from 'next/link';
import Nav from '@/components/Nav';
import ThemeToggle from '@/components/ThemeToggle';
import AddTransaction from '@/components/TransactionForm';
import { IconGear } from '@/components/Icons';
import { db } from '@/lib/db';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sql = await db();
  const profiles = [...(await sql<Profile[]>`select id, name, color, photo from profiles order by id`)];

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="brand">
            <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden>
              <defs><radialGradient id="pg" cx=".35" cy=".3"><stop offset="0" stopColor="#9be9ff" /><stop offset=".5" stopColor="#4a6bff" /><stop offset="1" stopColor="#2a1670" /></radialGradient></defs>
              <circle cx="32" cy="32" r="17" fill="url(#pg)" />
              <ellipse cx="32" cy="33" rx="28" ry="7" fill="none" stroke="#ff8ad8" strokeWidth="3.5" transform="rotate(-15 32 33)" />
            </svg>
            <div className="brand-name">ESPAÇO<span>FINANCEIRO</span></div>
          </Link>
          <nav className="top-nav"><Nav /></nav>
          <div className="header-tools">
            <AddTransaction profiles={profiles} />
            <ThemeToggle />
            <Link href="/ajustes" className="btn btn-ghost icon-btn" title="Ajustes" aria-label="Ajustes"><IconGear /></Link>
          </div>
        </div>
      </header>
      <main className="main">{children}</main>
      <nav className="bottom-nav"><Nav mobile /></nav>
    </>
  );
}
