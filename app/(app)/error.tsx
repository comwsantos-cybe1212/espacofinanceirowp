'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel" style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
      <h1 className="page-title" style={{ fontSize: 20 }}>Houston, temos um problema</h1>
      <p className="muted">{error.message || 'Algo deu errado ao carregar os dados.'}</p>
      <button className="btn btn-primary" onClick={reset}>Tentar de novo</button>
    </div>
  );
}
