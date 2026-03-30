-- Supabase PostgreSQL schema for Woodmart.lk
-- Based on existing Mongo models: User, Product(+reviews), Cart, Order

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('user', 'admin');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'paid', 'failed');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('created', 'processing', 'shipped', 'delivered', 'cancelled');
  end if;
end $$;

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Users (keeps your current custom auth model)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role public.user_role not null default 'user',
  email_verified boolean not null default false,
  email_verified_at timestamptz,
  email_verification_token_hash text,
  email_verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists email_verified boolean;
alter table public.users add column if not exists email_verified_at timestamptz;
alter table public.users add column if not exists email_verification_token_hash text;
alter table public.users add column if not exists email_verification_expires_at timestamptz;
update public.users set email_verified = true where email_verified is null;
alter table public.users alter column email_verified set default false;
alter table public.users alter column email_verified set not null;

create index if not exists idx_users_email_verification_token_hash on public.users(email_verification_token_hash);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  price numeric(12,2) not null check (price >= 0),
  discount_price numeric(12,2) check (discount_price >= 0),
  product_cost numeric(12,2) not null default 0 check (product_cost >= 0),
  shipping_price numeric(12,2) not null default 0 check (shipping_price >= 0),
  category text not null,
  stock integer not null default 0 check (stock >= 0),
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  sku text,
  brand text not null default '',
  featured boolean not null default false,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists sku text;
alter table public.products add column if not exists brand text not null default '';
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists status text not null default 'active';
alter table public.products add column if not exists product_cost numeric(12,2);
alter table public.products add column if not exists shipping_price numeric(12,2);
update public.products set product_cost = 0 where product_cost is null;
update public.products set shipping_price = 0 where shipping_price is null;
alter table public.products alter column product_cost set default 0;
alter table public.products alter column shipping_price set default 0;
alter table public.products alter column product_cost set not null;
alter table public.products alter column shipping_price set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_status_check'
  ) then
    alter table public.products
      add constraint products_status_check
      check (status in ('draft', 'active', 'archived'));
  end if;
end $$;

create unique index if not exists idx_products_sku_unique on public.products(sku) where sku is not null;

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_created_at on public.products(created_at desc);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- Categories (admin-managed list)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

insert into public.categories (name)
select distinct category
from public.products
where category is not null and trim(category) <> ''
on conflict (name) do nothing;

-- Product images (Mongo images[])
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order <= 5),
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product on public.product_images(product_id);
create unique index if not exists idx_product_images_product_sort_unique on public.product_images(product_id, sort_order);

create or replace function public.enforce_product_images_limit()
returns trigger
language plpgsql
as $$
declare
  image_count integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into image_count
    from public.product_images
    where product_id = new.product_id;

    if image_count >= 6 then
      raise exception 'A product can have at most 6 images';
    end if;
  elsif tg_op = 'UPDATE' and new.product_id <> old.product_id then
    select count(*) into image_count
    from public.product_images
    where product_id = new.product_id;

    if image_count >= 6 then
      raise exception 'A product can have at most 6 images';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_product_images_limit on public.product_images;

create trigger trg_enforce_product_images_limit
before insert or update on public.product_images
for each row execute function public.enforce_product_images_limit();

-- Product reviews (Mongo embedded reviews[])
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists idx_product_reviews_product on public.product_reviews(product_id);

drop trigger if exists trg_product_reviews_updated_at on public.product_reviews;
create trigger trg_product_reviews_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

-- Wishlist (Mongo users.wishlist[])
create table if not exists public.user_wishlist (
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Carts
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_carts_updated_at on public.carts;
create trigger trg_carts_updated_at
before update on public.carts
for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cart_id, product_id)
);

drop trigger if exists trg_cart_items_updated_at on public.cart_items;
create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  subtotal_amount numeric(12,2) not null default 0 check (subtotal_amount >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  product_cost_total numeric(12,2) not null default 0 check (product_cost_total >= 0),
  profit_total numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  payment_status public.payment_status not null default 'pending',
  order_status public.order_status not null default 'created',
  payment_method text not null default 'cod' check (payment_method in ('cod', 'card', 'other')),
  payment_intent_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists subtotal_amount numeric(12,2);
alter table public.orders add column if not exists shipping_total numeric(12,2);
alter table public.orders add column if not exists discount_total numeric(12,2);
alter table public.orders add column if not exists product_cost_total numeric(12,2);
alter table public.orders add column if not exists profit_total numeric(12,2);
update public.orders set payment_method = 'cod' where payment_method is null;
update public.orders set subtotal_amount = coalesce(total_amount, 0) where subtotal_amount is null;
update public.orders set shipping_total = 0 where shipping_total is null;
update public.orders set discount_total = 0 where discount_total is null;
update public.orders set product_cost_total = 0 where product_cost_total is null;
update public.orders set profit_total = coalesce(total_amount, 0) where profit_total is null;
alter table public.orders alter column payment_method set default 'cod';
alter table public.orders alter column payment_method set not null;
alter table public.orders alter column subtotal_amount set default 0;
alter table public.orders alter column shipping_total set default 0;
alter table public.orders alter column discount_total set default 0;
alter table public.orders alter column product_cost_total set default 0;
alter table public.orders alter column profit_total set default 0;
alter table public.orders alter column subtotal_amount set not null;
alter table public.orders alter column shipping_total set not null;
alter table public.orders alter column discount_total set not null;
alter table public.orders alter column product_cost_total set not null;
alter table public.orders alter column profit_total set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_method_check'
  ) then
    alter table public.orders
      add constraint orders_payment_method_check
      check (payment_method in ('cod', 'card', 'other'));
  end if;
end $$;

create index if not exists idx_orders_user_created on public.orders(user_id, created_at desc);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  image text not null,
  price numeric(12,2) not null check (price >= 0),
  list_price numeric(12,2) not null default 0 check (list_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  product_cost numeric(12,2) not null default 0 check (product_cost >= 0),
  shipping_price numeric(12,2) not null default 0 check (shipping_price >= 0),
  quantity integer not null check (quantity >= 1),
  line_subtotal numeric(12,2) not null default 0 check (line_subtotal >= 0),
  line_shipping_total numeric(12,2) not null default 0 check (line_shipping_total >= 0),
  line_discount_total numeric(12,2) not null default 0 check (line_discount_total >= 0),
  line_product_cost_total numeric(12,2) not null default 0 check (line_product_cost_total >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0),
  line_profit_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.order_items add column if not exists list_price numeric(12,2);
alter table public.order_items add column if not exists discount_amount numeric(12,2);
alter table public.order_items add column if not exists product_cost numeric(12,2);
alter table public.order_items add column if not exists shipping_price numeric(12,2);
alter table public.order_items add column if not exists line_subtotal numeric(12,2);
alter table public.order_items add column if not exists line_shipping_total numeric(12,2);
alter table public.order_items add column if not exists line_discount_total numeric(12,2);
alter table public.order_items add column if not exists line_product_cost_total numeric(12,2);
alter table public.order_items add column if not exists line_total numeric(12,2);
alter table public.order_items add column if not exists line_profit_total numeric(12,2);
update public.order_items set list_price = coalesce(price, 0) where list_price is null;
update public.order_items set discount_amount = 0 where discount_amount is null;
update public.order_items set product_cost = 0 where product_cost is null;
update public.order_items set shipping_price = 0 where shipping_price is null;
update public.order_items set line_subtotal = coalesce(price, 0) * coalesce(quantity, 1) where line_subtotal is null;
update public.order_items set line_shipping_total = coalesce(shipping_price, 0) * coalesce(quantity, 1) where line_shipping_total is null;
update public.order_items set line_discount_total = coalesce(discount_amount, 0) * coalesce(quantity, 1) where line_discount_total is null;
update public.order_items set line_product_cost_total = coalesce(product_cost, 0) * coalesce(quantity, 1) where line_product_cost_total is null;
update public.order_items set line_total = coalesce(line_subtotal, coalesce(price, 0) * coalesce(quantity, 1)) + coalesce(line_shipping_total, 0) where line_total is null;
update public.order_items set line_profit_total = coalesce(line_subtotal, coalesce(price, 0) * coalesce(quantity, 1)) - (coalesce(line_product_cost_total, 0) + coalesce(line_shipping_total, 0) + coalesce(line_discount_total, 0)) where line_profit_total is null;
alter table public.order_items alter column list_price set default 0;
alter table public.order_items alter column discount_amount set default 0;
alter table public.order_items alter column product_cost set default 0;
alter table public.order_items alter column shipping_price set default 0;
alter table public.order_items alter column line_subtotal set default 0;
alter table public.order_items alter column line_shipping_total set default 0;
alter table public.order_items alter column line_discount_total set default 0;
alter table public.order_items alter column line_product_cost_total set default 0;
alter table public.order_items alter column line_total set default 0;
alter table public.order_items alter column line_profit_total set default 0;
alter table public.order_items alter column list_price set not null;
alter table public.order_items alter column discount_amount set not null;
alter table public.order_items alter column product_cost set not null;
alter table public.order_items alter column shipping_price set not null;
alter table public.order_items alter column line_subtotal set not null;
alter table public.order_items alter column line_shipping_total set not null;
alter table public.order_items alter column line_discount_total set not null;
alter table public.order_items alter column line_product_cost_total set not null;
alter table public.order_items alter column line_total set not null;
alter table public.order_items alter column line_profit_total set not null;

create index if not exists idx_order_items_order on public.order_items(order_id);

create table if not exists public.order_shipping_addresses (
  order_id uuid primary key references public.orders(id) on delete cascade,
  full_name text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null default '',
  postal_code text not null,
  country text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_shipping_addresses add column if not exists state text;
update public.order_shipping_addresses set state = '' where state is null;
alter table public.order_shipping_addresses alter column state set default '';
alter table public.order_shipping_addresses alter column state set not null;

drop trigger if exists trg_order_shipping_addresses_updated_at on public.order_shipping_addresses;
create trigger trg_order_shipping_addresses_updated_at
before update on public.order_shipping_addresses
for each row execute function public.set_updated_at();

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_addresses_user on public.user_addresses(user_id);

drop trigger if exists trg_user_addresses_updated_at on public.user_addresses;
create trigger trg_user_addresses_updated_at
before update on public.user_addresses
for each row execute function public.set_updated_at();

-- Optional: settings table for admin configuration
create table if not exists public.store_settings (
  id boolean primary key default true,
  store_name text not null default 'Woodmart.lk',
  support_email text,
  contact_number text,
  store_address text,
  currency text not null default 'Rs.',
  free_shipping_threshold numeric(12,2) not null default 199,
  theme_accent text not null default '#0959a4',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id)
);

alter table public.store_settings add column if not exists support_email text;
alter table public.store_settings add column if not exists store_address text;

drop trigger if exists trg_store_settings_updated_at on public.store_settings;
create trigger trg_store_settings_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

insert into public.store_settings(id)
values (true)
on conflict (id) do nothing;

-- Customer support chat
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.users(id) on delete cascade,
  admin_id uuid references public.users(id) on delete set null,
  last_message_text text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_conversations_last_message_at
  on public.chat_conversations(last_message_at desc);

drop trigger if exists trg_chat_conversations_updated_at on public.chat_conversations;
create trigger trg_chat_conversations_updated_at
before update on public.chat_conversations
for each row execute function public.set_updated_at();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid references public.users(id) on delete set null,
  message_text text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_conversation_created
  on public.chat_messages(conversation_id, created_at asc);

create index if not exists idx_chat_messages_unread
  on public.chat_messages(is_read, conversation_id)
  where is_read = false;

-- RLS baseline: keep ON for future security hardening.
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_reviews enable row level security;
alter table public.categories enable row level security;
alter table public.user_wishlist enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_shipping_addresses enable row level security;
alter table public.user_addresses enable row level security;
alter table public.store_settings enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- Temporary permissive policies for development.
-- Replace with strict authenticated policies before production.
drop policy if exists "dev_all_users" on public.users;
create policy "dev_all_users" on public.users for all using (true) with check (true);
drop policy if exists "dev_all_products" on public.products;
create policy "dev_all_products" on public.products for all using (true) with check (true);
drop policy if exists "dev_all_product_images" on public.product_images;
create policy "dev_all_product_images" on public.product_images for all using (true) with check (true);
drop policy if exists "dev_all_product_reviews" on public.product_reviews;
create policy "dev_all_product_reviews" on public.product_reviews for all using (true) with check (true);
drop policy if exists "dev_all_categories" on public.categories;
create policy "dev_all_categories" on public.categories for all using (true) with check (true);
drop policy if exists "dev_all_user_wishlist" on public.user_wishlist;
create policy "dev_all_user_wishlist" on public.user_wishlist for all using (true) with check (true);
drop policy if exists "dev_all_carts" on public.carts;
create policy "dev_all_carts" on public.carts for all using (true) with check (true);
drop policy if exists "dev_all_cart_items" on public.cart_items;
create policy "dev_all_cart_items" on public.cart_items for all using (true) with check (true);
drop policy if exists "dev_all_orders" on public.orders;
create policy "dev_all_orders" on public.orders for all using (true) with check (true);
drop policy if exists "dev_all_order_items" on public.order_items;
create policy "dev_all_order_items" on public.order_items for all using (true) with check (true);
drop policy if exists "dev_all_order_shipping_addresses" on public.order_shipping_addresses;
create policy "dev_all_order_shipping_addresses" on public.order_shipping_addresses for all using (true) with check (true);
drop policy if exists "dev_all_user_addresses" on public.user_addresses;
create policy "dev_all_user_addresses" on public.user_addresses for all using (true) with check (true);
drop policy if exists "dev_all_store_settings" on public.store_settings;
create policy "dev_all_store_settings" on public.store_settings for all using (true) with check (true);
drop policy if exists "dev_all_chat_conversations" on public.chat_conversations;
create policy "dev_all_chat_conversations" on public.chat_conversations for all using (true) with check (true);
drop policy if exists "dev_all_chat_messages" on public.chat_messages;
create policy "dev_all_chat_messages" on public.chat_messages for all using (true) with check (true);
