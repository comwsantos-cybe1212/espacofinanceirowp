import 'server-only';
import postgres from 'postgres';

const g = globalThis as unknown as { __sql?: postgres.Sql; __schema?: Promise<void> };

function client(): postgres.Sql {
  if (!g.__sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('Banco de dados não configurado: defina DATABASE_URL (veja o README).');
    const local = /localhost|127\.0\.0\.1/.test(url);
    g.__sql = postgres(url, { ssl: local ? false : 'require', max: 1, prepare: false, idle_timeout: 20 });
  }
  return g.__sql;
}

async function migrate(sql: postgres.Sql) {
  await sql`create table if not exists profiles (
    id serial primary key, name text not null, color text not null, photo text)`;
  await sql`create table if not exists transactions (
    id serial primary key,
    profile_id int references profiles(id) on delete set null,
    kind text not null,               -- receita | despesa
    subtype text,                     -- salario | beneficio | freelancer | outra
    category text not null,
    description text not null,
    amount int not null,              -- centavos
    due_date text not null,           -- data de vencimento/recebimento (YYYY-MM-DD)
    month text not null,              -- mês de competência (YYYY-MM)
    recurrence text not null,         -- fixa | variavel
    payment text not null,            -- conta | cartao
    group_id text,                    -- série (fixa 12 meses ou parcelamento)
    inst_no int not null default 1,
    inst_total int not null default 1,
    purchase_date text,
    paid boolean not null default false,
    paid_at text,
    created_at timestamptz not null default now())`;
  await sql`create index if not exists transactions_month_idx on transactions(month)`;
  await sql`create table if not exists savings (
    id serial primary key, date text not null, amount int not null, note text,
    created_at timestamptz not null default now())`;
  await sql`create table if not exists goals (
    id serial primary key, name text not null, target int not null, deadline text not null,
    done boolean not null default false, done_at text, created_at timestamptz not null default now())`;
  await sql`create table if not exists settings (key text primary key, value text not null)`;
  await sql`create table if not exists login_attempts (ip text primary key, fails int not null, last_at timestamptz not null)`;
  const [{ count }] = await sql`select count(*)::int as count from profiles`;
  if (count === 0) {
    await sql`insert into profiles (name, color, photo) values
      ('Pedro', '#4de3ff', '/fotos/pedro.jpg'), ('Wesley', '#ff6ec7', '/fotos/wesley.jpg')`;
  }
  // Bancos criados antes dos nomes definitivos
  await sql`update profiles set name = 'Pedro', photo = coalesce(photo, '/fotos/pedro.jpg') where name = 'Pessoa 1'`;
  await sql`update profiles set name = 'Wesley', photo = coalesce(photo, '/fotos/wesley.jpg') where name = 'Pessoa 2'`;
}

/** Retorna o cliente SQL garantindo que as tabelas existem (criadas no primeiro acesso) */
export async function db(): Promise<postgres.Sql> {
  const sql = client();
  if (!g.__schema) g.__schema = migrate(sql).catch((e) => { g.__schema = undefined; throw e; });
  await g.__schema;
  return sql;
}
