'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconCard, IconDashboard, IconGear, IconList, IconRocket, IconTarget, IconUsers } from './Icons';

const LINKS = [
  { href: '/', label: 'Início', Icon: IconDashboard, mobile: true },
  { href: '/lancamentos', label: 'Lançamentos', short: 'Lançar', Icon: IconList, mobile: true },
  { href: '/cartao', label: 'Cartão', Icon: IconCard, mobile: true },
  { href: '/projecao', label: 'Previsão', Icon: IconRocket, mobile: true },
  { href: '/metas', label: 'Metas', Icon: IconTarget, mobile: true },
  { href: '/perfis', label: 'Perfis', Icon: IconUsers },
  { href: '/ajustes', label: 'Ajustes', Icon: IconGear },
];

export default function Nav({ mobile }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <>
      {LINKS.filter((l) => !mobile || l.mobile).map(({ href, label, short, Icon }) => {
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
