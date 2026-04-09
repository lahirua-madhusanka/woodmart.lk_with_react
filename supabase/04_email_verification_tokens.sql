-- Email verification tokens for user registration flow
-- Safe to run multiple times.

create table if not exists public.verification_tokens (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists verification_tokens_token_key
  on public.verification_tokens(token);

create index if not exists verification_tokens_user_id_idx
  on public.verification_tokens(user_id);

create index if not exists verification_tokens_expires_at_idx
  on public.verification_tokens(expires_at);

-- Optional cleanup job pattern (run periodically):
-- delete from public.verification_tokens where expires_at < now();
