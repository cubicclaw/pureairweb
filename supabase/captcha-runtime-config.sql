-- Captcha 运行时配置（与 Admin /public-config 同源）。在 Supabase SQL Editor 对项目执行一次。
-- 使用 service_role 的 Next.js API 会绕过 RLS；匿名用户无法读写。

create table if not exists public.captcha_runtime_config (
  id smallint primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.captcha_runtime_config enable row level security;

comment on table public.captcha_runtime_config is 'Single-row JSON for slider/math toggles edited via /admin/captcha';
