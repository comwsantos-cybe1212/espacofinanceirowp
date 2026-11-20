/** Mascote astronauta do Espaço Financeiro */
export default function Mascot({ size = 40, mood = 'ok' }: { size?: number; mood?: 'ok' | 'alerta' }) {
  const eye = mood === 'ok' ? '#5eead4' : '#fca5a5';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M12 12l1.2 2.6L16 16l-2.8 1.2L12 20l-1.2-2.8L8 16l2.8-1.4z" fill="#f472b6" />
      <circle cx="54" cy="14" r="1.6" fill="#a78bfa" />
      <line x1="32" y1="10" x2="32" y2="16" stroke="#7c3aed" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="8" r="3" fill="#ec4899" />
      <circle cx="32" cy="36" r="20" fill="url(#mg)" />
      <rect x="18" y="28" width="28" height="15" rx="7.5" fill="#1e1b4b" />
      {mood === 'ok' ? (
        <>
          <path d="M24 35.5q2.5-3 5 0" stroke={eye} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M35 35.5q2.5-3 5 0" stroke={eye} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="26.5" cy="35.5" r="2.4" fill={eye} />
          <circle cx="37.5" cy="35.5" r="2.4" fill={eye} />
        </>
      )}
      <circle cx="13" cy="37" r="3" fill="#7c3aed" />
      <circle cx="51" cy="37" r="3" fill="#7c3aed" />
      <defs>
        <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a78bfa" /><stop offset="1" stopColor="#6d28d9" /></linearGradient>
      </defs>
    </svg>
  );
}
