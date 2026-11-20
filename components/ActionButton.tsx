'use client';

import { useTransition } from 'react';

type Props = {
  action: () => Promise<void>;
  confirm?: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
};

/** Botão que chama uma ação do servidor (com confirmação opcional) */
export default function ActionButton({ action, confirm, className = 'btn btn-sm', title, children }: Props) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      title={title}
      aria-label={title}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault(); // evita abrir/fechar <details> quando o botão está no resumo
        if (confirm && !window.confirm(confirm)) return;
        start(() => action());
      }}
    >
      {children}
    </button>
  );
}
