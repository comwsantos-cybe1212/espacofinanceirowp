'use client';

import { useEffect, useState } from 'react';
import { createPortal, useFormState, useFormStatus } from 'react-dom';
import { saveGoal, type ActionResult } from '@/app/actions';
import type { Goal } from '@/lib/types';
import { IconPencil } from './Icons';
import InfoTip from './InfoTip';
import { resizeImage } from './Forms';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" disabled={pending}>{pending ? 'Salvando…' : 'Salvar meta'}</button>;
}

function Form({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const [state, action] = useFormState<ActionResult | null, FormData>(saveGoal, null);
  const [photo, setPhoto] = useState('');
  const [remove, setRemove] = useState(false);
  const preview = remove ? '' : photo || goal?.photo || '';
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <form action={action} className="form-grid">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <label className="field full"><span>Nome da meta<InfoTip inline align="left" text="O app usa a economia guardada e calcula quanto ainda falta juntar por mês até o prazo." /></span>
        <input className="input" name="name" defaultValue={goal?.name} placeholder="Ex.: Casa, viagem, reserva de emergência" maxLength={60} required />
      </label>
      <input type="hidden" name="photo" value={photo} />
      {remove && <input type="hidden" name="remove_photo" value="on" />}
      <div className="field full">
        <span>Foto da meta (opcional)</span>
        <div className="goal-photo-pick">
          {preview
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={preview} alt="Foto da meta" />
            : <div className="goal-photo-empty">🖼️ Uma foto do que vocês querem conquistar</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
              📷 {preview ? 'Trocar foto' : 'Escolher foto'}
              <input type="file" accept="image/*" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) { setPhoto(await resizeImage(f, 640, 360).catch(() => '')); setRemove(false); }
              }} />
            </label>
            {preview && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setPhoto(''); setRemove(true); }}>Remover foto</button>}
          </div>
        </div>
      </div>
      <label className="field"><span>Quanto precisamos (R$)</span>
        <input className="input" name="target" inputMode="decimal" placeholder="34.000,00" defaultValue={goal ? (goal.target / 100).toFixed(2).replace('.', ',') : ''} required />
      </label>
      <label className="field"><span>Até quando</span>
        <input className="input" type="month" name="deadline" defaultValue={goal?.deadline} required />
      </label>
      {state?.error && <p className="error full" role="alert">{state.error}</p>}
      <div className="full" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <Submit />
      </div>
    </form>
  );
}

export default function GoalButton({ goal }: { goal?: Goal }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {goal
        ? <button className="btn btn-sm" onClick={() => setOpen(true)}><IconPencil />Editar</button>
        : <button className="btn btn-primary" onClick={() => setOpen(true)}><span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>+</span>Nova meta</button>}
      {open && createPortal(
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 460 }}>
            <h3>{goal ? 'Editar meta' : 'Nova meta'}</h3>
            <Form goal={goal} onDone={() => setOpen(false)} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
