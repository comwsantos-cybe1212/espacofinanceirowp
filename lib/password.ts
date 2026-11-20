/** Senha configurada na Vercel, sem espaços nem aspas colados por engano */
export function cleanSecret(v: string | undefined | null): string {
  return String(v ?? '').trim().replace(/^["']+|["']+$/g, '').trim();
}
