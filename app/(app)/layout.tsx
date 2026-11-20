import Link from 'next/link';
import Mascot from '@/components/Mascot';
import Nav from '@/components/Nav';
import ThemeToggle from '@/components/ThemeToggle';
import AddTransaction from '@/components/TransactionForm';
import { IconGear, IconUsers } from '@/components/Icons';
import { db } from '@/lib/db';
import { todayBR } from '@/lib/dates';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

function Brand() {
  return (
    <Link href="/" className="brand">
      <Mascot size={42} />
      <div>
        <div className="brand-name">Espaço Financeiro</div>
        <div className="brand-sub">finanças em outra órbita</div>
      </div>
    </Link>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sql = await db();
  const [profiles, [{ atrasadas }]] = await Promise.all([
    sql<Profile[]>`select id, name, color, photo from profiles order by id`,
    sql`select count(*)::int as atrasadas from transactions where kind = 'despesa' and not paid and due_date < ${todayBR()}`,
  ]);

  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <Nav />
        <div className="status-card">
          <Mascot size={36} mood={atrasadas > 0 ? 'alerta' : 'ok'} />
          {atrasadas > 0 ? <span><strong className="neg">Alerta de órbita:</strong> {atrasadas} conta(s) atrasada(s).</span> : <span>Órbita estável! Suas finanças em dia.</span>}
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <Brand />
          <div className="topbar-tools">
            <ThemeToggle />
            <Link href="/perfis" className="btn btn-ghost icon-btn only-mobile" title="Perfis" aria-label="Perfis"><IconUsers /></Link>
            <Link href="/ajustes" className="btn btn-ghost icon-btn only-mobile" title="Ajustes" aria-label="Ajustes"><IconGear /></Link>
            <AddTransaction profiles={[...profiles]} />
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
      <nav className="bottom-nav"><Nav mobile /></nav>
    </div>
  );
}
