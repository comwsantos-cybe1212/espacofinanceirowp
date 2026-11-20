'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { clearData, moveSavings, updateOpeningBalance, updateProfile, type ActionResult } from '@/app/actions';
import type { Profile } from '@/lib/types';
import Avatar from './Avatar';

function Submit({ children, className = 'btn btn-primary' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? '…' : children}</button>;
}

/** Guardar / resgatar da Economia. `suggested` pré-preenche o valor da regra de 3 */
export function SavingsForm({ suggested }: { suggested?: string }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(moveSavings, null);
  const ref = useRef<HTMLFormElement>(null);
  const dir = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  const set = (v: string) => () => { if (dir.current) dir.current.value = v; };
  return (
    <form ref={ref} action={action} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input ref={dir} type="hidden" name="direction" defaultValue="guardar" />
      <input className="input" name="amount" inputMode="decimal" placeholder="Valor (R$)" defaultValue={suggested} key={suggested} required />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={set('guardar')} style={{ flex: 1 }}>Guardar</button>
        <button className="btn" onClick={set('resgatar')} style={{ flex: 1 }}>Resgatar</button>
      </div>
      {state?.error && <p className="error" style={{ margin: 0 }}>{state.error}</p>}
    </form>
  );
}

export function OpeningBalanceForm({ current }: { current: string }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(updateOpeningBalance, null);
  return (
    <form action={action} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <label className="field" style={{ flex: 1, minWidth: 180 }}>
        <span>Saldo na conta quando começaram a usar o app (R$)</span>
        <input className="input" name="saldo_inicial" inputMode="decimal" defaultValue={current} />
      </label>
      <Submit>Salvar</Submit>
      {state?.ok && <span className="pos small">Salvo ✓</span>}
      {state?.error && <span className="error">{state.error}</span>}
    </form>
  );
}

/** Reduz a foto no navegador para 320px (fica leve para salvar no banco) */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 320;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('Imagem inválida'));
    img.src = url;
  });
}

export function ProfileEditor({ profile }: { profile: Profile }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(updateProfile, null);
  const [photo, setPhoto] = useState('');
  const [color, setColor] = useState(profile.color);
  const [name, setName] = useState(profile.name);
  const preview: Profile = { ...profile, name, color, photo: photo || profile.photo };

  return (
    <form action={action} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input type="hidden" name="id" value={profile.id} />
      <input type="hidden" name="photo" value={photo} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar profile={preview} size={72} />
        <label className="btn btn-sm">
          Trocar foto
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setPhoto(await resizeImage(f).catch(() => ''));
          }} />
        </label>
      </div>
      <label className="field"><span>Nome</span><input className="input" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required /></label>
      <label className="field"><span>Cor nos gráficos</span>
        <input type="color" name="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 60, height: 38, background: 'transparent', border: 'none', cursor: 'pointer' }} />
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Submit>Salvar perfil</Submit>
        {state?.ok && <span className="pos small">Salvo ✓</span>}
        {state?.error && <span className="error">{state.error}</span>}
      </div>
    </form>
  );
}

/** Um clique para guardar o valor sugerido */
export function QuickSave({ cents }: { cents: number }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(moveSavings, null);
  const value = (cents / 100).toFixed(2).replace('.', ',');
  return (
    <form action={action}>
      <input type="hidden" name="amount" value={value} />
      <input type="hidden" name="direction" value="guardar" />
      <input type="hidden" name="note" value="Regra de 3" />
      <Submit className="btn btn-primary btn-sm">Guardar R$ {value}</Submit>
      {state?.error && <p className="error" style={{ margin: '6px 0 0' }}>{state.error}</p>}
    </form>
  );
}

/** Recomeçar: apagar despesas, receitas, economia e/ou saldo inicial */
export function ClearDataForm() {
  const [state, action] = useFormState<ActionResult | null, FormData>(clearData, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="stack" style={{ gap: 10 }}
      onSubmit={(e) => { if (!window.confirm('Apagar definitivamente os dados marcados? Isso não pode ser desfeito.')) e.preventDefault(); }}>
      <label className="check"><input type="checkbox" name="despesas" /> Todas as despesas (inclui cartão e parcelamentos)</label>
      <label className="check"><input type="checkbox" name="receitas" /> Todas as receitas</label>
      <label className="check"><input type="checkbox" name="economia" /> Economia guardada</label>
      <label className="check"><input type="checkbox" name="saldo" /> Saldo inicial</label>
      <label className="check"><input type="checkbox" name="metas" /> Metas</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Submit className="btn btn-danger">Apagar selecionados</Submit>
        {state?.ok && <span className="pos small">Apagado ✓</span>}
        {state?.error && <span className="error">{state.error}</span>}
      </div>
    </form>
  );
}
