'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconCard, IconDashboard, IconList, IconRocket, IconUsers } from './Icons';

const LINKS = [
  { href: '/', label: 'Início', Icon: IconDashboard },
  { href: '/lancamentos', label: 'Lançamentos', short: 'Lançar', Icon: IconList },
  { href: '/cartao', label: 'Cartão', Icon: IconCard },
  { href: '/projecao', label: 'Previsão', Icon: IconRocket },
  { href: '/perfis', label: 'Perfis', Icon: IconUsers },
];

export default function Nav({ mobile }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <>
      {LINKS.map(({ href, label, short, Icon }) => {
        const active = href === '/' ? path === '/' : path.startsWith(href);
        return (
          <Link key={href} href={href} className={`nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
            <Icon />
            <span>{mobile && short ? short : label}</span>
          </Link>
        );
      })}
    </>
  );
}
