# 🚀 Espaço Financeiro

Controle financeiro do casal com tema espacial, modo claro e escuro.

## Como publicar na Vercel (passo a passo)

1. **Suba este projeto para o GitHub** (um repositório novo, pode ser privado).
2. Na Vercel, clique em **Add New → Project**, escolha o repositório e clique em **Deploy**.
   O primeiro deploy pode mostrar erro de banco. É normal, ele ainda não existe.
3. **Crie o banco de dados (grátis):** no projeto da Vercel, vá em **Storage → Create Database → Neon (Postgres)**,
   aceite o plano gratuito e conecte ao projeto. A Vercel cria a variável `DATABASE_URL` sozinha.
4. **Crie a senha:** em **Settings → Environment Variables**, adicione:
   - Nome: `APP_PASSWORD`
   - Valor: a senha de 6 números que vocês combinaram (não escreva a senha em nenhum arquivo)
5. Vá em **Deployments → ⋯ → Redeploy**. Pronto! As tabelas são criadas automaticamente no primeiro acesso.

Depois de entrar, abra **Perfis → Editar nome, foto e cor** e **⚙ Ajustes → Saldo inicial**.

> Opcional: adicione também `SESSION_SECRET` com um texto longo e aleatório para assinar as sessões.

## Segurança

- A senha fica só no servidor (variável `APP_PASSWORD`), nunca no código do site.
- Sem login, nenhuma página ou dado é entregue.
- A sessão é um cookie protegido (`httpOnly`) e assinado, e vale 30 dias.
- Depois de 5 senhas erradas, o acesso fica bloqueado por 15 minutos.

## Regras do app

| Regra | Como funciona |
|---|---|
| Cartão | Compra até o dia 17 entra na fatura do mês; a partir do dia 18, na do mês seguinte. A fatura vence no dia 23. |
| Parcelado | O valor total é dividido em N parcelas, uma por fatura. Mostra quantas faltam e o mês da última. |
| Fixos | Salário, benefício e despesas fixas se repetem automaticamente por 12 meses. |
| Variáveis | Freelancer, lanche etc. acontecem uma vez. |
| Dívidas | Uma despesa vencida e não paga aparece como atrasada. |
| Saldo atual | Saldo inicial + recebido − pago − guardado. |
| Previsão | Cada mês começa com o que sobrou do anterior: + receitas − despesas. |
| Divisão em 3 | A sobra do mês vira ⅓ diversão (metade para cada perfil), ⅓ adiantar contas e ⅓ guardar. O que não for usado passa para o mês seguinte. |
| Economia | O valor guardado fica separado do saldo. |

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # ajuste DATABASE_URL
npm run dev
```

Tecnologia: Next.js 14, Postgres (Neon/Vercel) e Recharts.
