import { NOS, type Profile } from '@/lib/types';

export default function Avatar({ profile: p, size = 36 }: { profile: Profile | undefined; size?: number }) {
  const profile = p ?? NOS; // sem perfil = gasto de nós dois
  const style = { width: size, height: size, fontSize: size * 0.42, ['--ring' as string]: profile?.color ?? '#626aa0' } as React.CSSProperties;
  if (profile?.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.photo} alt={profile.name} className="avatar" style={style} />;
  }
  return <span className="avatar" style={style} aria-label={profile?.name ?? 'Sem perfil'}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</span>;
}
