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
    create type public.order_status as enum (
      'created',
      'pending',
      'confirmed',
      'processing',
      'packed',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'returned'
    );
  end if;
end $$;

do $$
declare
  has_pending boolean;
begin
  select exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'order_status'
      and e.enumlabel = 'pending'
  ) into has_pending;

  if not has_pending then
    if not exists (
      select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = 'order_status_new'
    ) then
      create type public.order_status_new as enum (
        'created',
        'pending',
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned'
      );
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'orders'
        and column_name = 'order_status'
    ) then
      alter table public.orders
        alter column order_status drop default,
        alter column order_status type public.order_status_new using order_status::text::public.order_status_new,
        alter column order_status set default 'pending';
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'order_status_history'
        and column_name = 'status'
    ) then
      alter table public.order_status_history
        alter column status type public.order_status_new using status::text::public.order_status_new;
    end if;

    drop type public.order_status;
    alter type public.order_status_new rename to order_status;
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

create table if not exists public.verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_verification_tokens_token on public.verification_tokens(token);
create index if not exists idx_verification_tokens_user on public.verification_tokens(user_id);
create index if not exists idx_verification_tokens_expires_at on public.verification_tokens(expires_at);

create unique index if not exists idx_verification_tokens_user_unique
  on public.verification_tokens(user_id);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_token on public.password_reset_tokens(token);
create index if not exists idx_password_reset_tokens_user on public.password_reset_tokens(user_id);
create index if not exists idx_password_reset_tokens_expires_at on public.password_reset_tokens(expires_at);

create unique index if not exists idx_password_reset_tokens_user_unique
  on public.password_reset_tokens(user_id);

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
  order_id uuid references public.orders(id) on delete set null,
  name text not null,
  title text,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

alter table public.product_reviews add column if not exists order_id uuid;
alter table public.product_reviews add column if not exists title text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_reviews_order_id_fkey'
  ) then
    alter table public.product_reviews
      add constraint product_reviews_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete set null;
  end if;
end $$;

create index if not exists idx_product_reviews_product on public.product_reviews(product_id);
create index if not exists idx_product_reviews_order on public.product_reviews(order_id);

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
  order_status public.order_status not null default 'pending',
  payment_method text not null default 'cod' check (payment_method in ('cod', 'card', 'other')),
  payment_intent_id text not null default '',
  transaction_id text,
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  tracking_number text,
  courier_name text,
  admin_note text,
  tracking_added_at timestamptz,
  shipped_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  returned_at timestamptz,
  cancelled_at timestamptz,
  invoice_number text,
  coupon_id uuid,
  coupon_code text,
  coupon_title text,
  coupon_discount_type text check (coupon_discount_type in ('percentage', 'fixed')),
  coupon_discount_value numeric(12,2),
  coupon_discount_amount numeric(12,2) not null default 0 check (coupon_discount_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists subtotal_amount numeric(12,2);
alter table public.orders add column if not exists shipping_total numeric(12,2);
alter table public.orders add column if not exists discount_total numeric(12,2);
alter table public.orders add column if not exists product_cost_total numeric(12,2);
alter table public.orders add column if not exists profit_total numeric(12,2);
alter table public.orders add column if not exists coupon_id uuid;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists coupon_title text;
alter table public.orders add column if not exists coupon_discount_type text;
alter table public.orders add column if not exists coupon_discount_value numeric(12,2);
alter table public.orders add column if not exists coupon_discount_amount numeric(12,2);
alter table public.orders add column if not exists transaction_id text;
alter table public.orders add column if not exists paid_amount numeric(12,2);
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists courier_name text;
alter table public.orders add column if not exists admin_note text;
alter table public.orders add column if not exists tracking_added_at timestamptz;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists out_for_delivery_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists returned_at timestamptz;
alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders add column if not exists invoice_number text;
update public.orders set payment_method = 'cod' where payment_method is null;
update public.orders set subtotal_amount = coalesce(total_amount, 0) where subtotal_amount is null;
update public.orders set shipping_total = 0 where shipping_total is null;
update public.orders set discount_total = 0 where discount_total is null;
update public.orders set product_cost_total = 0 where product_cost_total is null;
update public.orders set profit_total = coalesce(total_amount, 0) where profit_total is null;
update public.orders set coupon_discount_amount = 0 where coupon_discount_amount is null;
update public.orders set paid_amount = coalesce(total_amount, 0) where paid_amount is null and payment_status = 'paid';
update public.orders set paid_amount = 0 where paid_amount is null;
update public.orders set order_status = 'pending' where order_status = 'created';
alter table public.orders alter column payment_method set default 'cod';
alter table public.orders alter column payment_method set not null;
alter table public.orders alter column subtotal_amount set default 0;
alter table public.orders alter column shipping_total set default 0;
alter table public.orders alter column discount_total set default 0;
alter table public.orders alter column product_cost_total set default 0;
alter table public.orders alter column profit_total set default 0;
alter table public.orders alter column coupon_discount_amount set default 0;
alter table public.orders alter column paid_amount set default 0;
alter table public.orders alter column subtotal_amount set not null;
alter table public.orders alter column shipping_total set not null;
alter table public.orders alter column discount_total set not null;
alter table public.orders alter column product_cost_total set not null;
alter table public.orders alter column profit_total set not null;
alter table public.orders alter column coupon_discount_amount set not null;
alter table public.orders alter column paid_amount set not null;

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_coupon_discount_type_check'
  ) then
    alter table public.orders
      add constraint orders_coupon_discount_type_check
      check (coupon_discount_type is null or coupon_discount_type in ('percentage', 'fixed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_order_status_check'
  ) then
    alter table public.orders
      add constraint orders_order_status_check
      check (
        order_status in (
          'pending',
          'confirmed',
          'processing',
          'packed',
          'shipped',
          'out_for_delivery',
          'delivered',
          'cancelled',
          'returned'
        )
      );
  end if;
end $$;

create index if not exists idx_orders_user_created on public.orders(user_id, created_at desc);
create index if not exists idx_orders_status_created on public.orders(order_status, created_at desc);
create index if not exists idx_orders_payment_status_created on public.orders(payment_status, created_at desc);
create index if not exists idx_orders_tracking_number on public.orders(tracking_number) where tracking_number is not null;

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
  sku text,
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
alter table public.order_items add column if not exists sku text;
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

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_status public.order_status not null,
  note text,
  changed_by uuid references public.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_order_status_history_order_changed
  on public.order_status_history(order_id, changed_at desc);

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
  business_hours text not null default 'Mon - Sat, 9:00 AM - 7:00 PM',
  support_note text not null default 'Visit our showroom or contact our team for personalized recommendations.',
  contact_image_url text not null default 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80',
  currency text not null default 'Rs.',
  free_shipping_threshold numeric(12,2) not null default 199,
  theme_accent text not null default '#0959a4',
  hero_title text not null default 'Craft your space with timeless pieces.',
  hero_subtitle text not null default 'Discover premium furniture, decor, and lifestyle objects inspired by natural materials and modern living.',
  hero_primary_button_text text not null default 'Shop Now',
  hero_primary_button_link text not null default '/shop',
  hero_secondary_button_text text not null default 'View Collection',
  hero_secondary_button_link text not null default '/shop',
  hero_image_url text not null default 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id)
);

alter table public.store_settings add column if not exists support_email text;
alter table public.store_settings add column if not exists store_address text;
alter table public.store_settings add column if not exists business_hours text not null default 'Mon - Sat, 9:00 AM - 7:00 PM';
alter table public.store_settings add column if not exists support_note text not null default 'Visit our showroom or contact our team for personalized recommendations.';
alter table public.store_settings add column if not exists contact_image_url text not null default 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80';
alter table public.store_settings add column if not exists hero_title text not null default 'Craft your space with timeless pieces.';
alter table public.store_settings add column if not exists hero_subtitle text not null default 'Discover premium furniture, decor, and lifestyle objects inspired by natural materials and modern living.';
alter table public.store_settings add column if not exists hero_primary_button_text text not null default 'Shop Now';
alter table public.store_settings add column if not exists hero_primary_button_link text not null default '/shop';
alter table public.store_settings add column if not exists hero_secondary_button_text text not null default 'View Collection';
alter table public.store_settings add column if not exists hero_secondary_button_link text not null default '/shop';
alter table public.store_settings add column if not exists hero_image_url text not null default 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80';

drop trigger if exists trg_store_settings_updated_at on public.store_settings;
create trigger trg_store_settings_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

insert into public.store_settings(id)
values (true)
on conflict (id) do nothing;

-- Contact inquiries
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied')),
  admin_reply text,
  replied_at timestamptz,
  replied_by uuid,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_messages add column if not exists admin_reply text;
alter table public.contact_messages add column if not exists replied_at timestamptz;
alter table public.contact_messages add column if not exists replied_by uuid;
alter table public.contact_messages add column if not exists internal_note text;

create index if not exists idx_contact_messages_status_created
  on public.contact_messages(status, created_at desc);

create index if not exists idx_contact_messages_email_created
  on public.contact_messages(email, created_at desc);

drop trigger if exists trg_contact_messages_updated_at on public.contact_messages;
create trigger trg_contact_messages_updated_at
before update on public.contact_messages
for each row execute function public.set_updated_at();

-- Newsletter subscribers
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references public.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source text not null default 'website',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newsletter_subscribers add column if not exists user_id uuid;
alter table public.newsletter_subscribers add column if not exists status text;
alter table public.newsletter_subscribers add column if not exists source text;
alter table public.newsletter_subscribers add column if not exists subscribed_at timestamptz;
alter table public.newsletter_subscribers add column if not exists unsubscribed_at timestamptz;
alter table public.newsletter_subscribers add column if not exists created_at timestamptz;
alter table public.newsletter_subscribers add column if not exists updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'newsletter_subscribers_status_check'
  ) then
    alter table public.newsletter_subscribers
      add constraint newsletter_subscribers_status_check
      check (status in ('active', 'unsubscribed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'newsletter_subscribers_user_id_fkey'
  ) then
    alter table public.newsletter_subscribers
      add constraint newsletter_subscribers_user_id_fkey
      foreign key (user_id) references public.users(id) on delete set null;
  end if;
end $$;

update public.newsletter_subscribers set status = 'active' where status is null;
update public.newsletter_subscribers set source = 'website' where source is null or trim(source) = '';
update public.newsletter_subscribers set subscribed_at = now() where subscribed_at is null;
update public.newsletter_subscribers set created_at = now() where created_at is null;
update public.newsletter_subscribers set updated_at = now() where updated_at is null;

alter table public.newsletter_subscribers alter column status set default 'active';
alter table public.newsletter_subscribers alter column source set default 'website';
alter table public.newsletter_subscribers alter column subscribed_at set default now();
alter table public.newsletter_subscribers alter column created_at set default now();
alter table public.newsletter_subscribers alter column updated_at set default now();

alter table public.newsletter_subscribers alter column status set not null;
alter table public.newsletter_subscribers alter column source set not null;
alter table public.newsletter_subscribers alter column subscribed_at set not null;
alter table public.newsletter_subscribers alter column created_at set not null;
alter table public.newsletter_subscribers alter column updated_at set not null;

create unique index if not exists idx_newsletter_subscribers_email_unique on public.newsletter_subscribers(email);
create unique index if not exists idx_newsletter_subscribers_email_lower_unique on public.newsletter_subscribers(lower(email));
create index if not exists idx_newsletter_subscribers_status_created on public.newsletter_subscribers(status, created_at desc);
create index if not exists idx_newsletter_subscribers_user on public.newsletter_subscribers(user_id);

drop trigger if exists trg_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger trg_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();

-- Coupons
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount_amount numeric(12,2) check (maximum_discount_amount >= 0),
  scope_type text not null default 'all' check (scope_type in ('all', 'products', 'categories')),
  applicable_product_ids uuid[] not null default '{}'::uuid[],
  applicable_categories text[] not null default '{}'::text[],
  start_date date,
  end_date date,
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  total_usage_limit integer check (total_usage_limit is null or total_usage_limit > 0),
  per_user_usage_limit integer check (per_user_usage_limit is null or per_user_usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or start_date <= end_date),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

alter table public.coupons add column if not exists title text;
alter table public.coupons add column if not exists discount_type text;
alter table public.coupons add column if not exists discount_value numeric(12,2);
alter table public.coupons add column if not exists minimum_order_amount numeric(12,2);
alter table public.coupons add column if not exists maximum_discount_amount numeric(12,2);
alter table public.coupons add column if not exists scope_type text;
alter table public.coupons add column if not exists applicable_product_ids uuid[];
alter table public.coupons add column if not exists applicable_categories text[];
alter table public.coupons add column if not exists start_date date;
alter table public.coupons add column if not exists end_date date;
alter table public.coupons add column if not exists status text;
alter table public.coupons add column if not exists total_usage_limit integer;
alter table public.coupons add column if not exists per_user_usage_limit integer;
alter table public.coupons add column if not exists usage_count integer;

update public.coupons set title = code where title is null;
update public.coupons set discount_type = coalesce(discount_type, 'percentage') where discount_type is null;
update public.coupons set discount_value = coalesce(discount_value, 0) where discount_value is null;
update public.coupons set minimum_order_amount = coalesce(minimum_order_amount, 0) where minimum_order_amount is null;
update public.coupons set scope_type = coalesce(scope_type, 'all') where scope_type is null;
update public.coupons set applicable_product_ids = '{}'::uuid[] where applicable_product_ids is null;
update public.coupons set applicable_categories = '{}'::text[] where applicable_categories is null;
update public.coupons set status = coalesce(status, 'inactive') where status is null;
update public.coupons set usage_count = coalesce(usage_count, 0) where usage_count is null;

alter table public.coupons alter column title set not null;
alter table public.coupons alter column discount_type set not null;
alter table public.coupons alter column discount_value set not null;
alter table public.coupons alter column minimum_order_amount set not null;
alter table public.coupons alter column scope_type set not null;
alter table public.coupons alter column applicable_product_ids set not null;
alter table public.coupons alter column applicable_categories set not null;
alter table public.coupons alter column status set not null;
alter table public.coupons alter column usage_count set not null;

alter table public.coupons alter column minimum_order_amount set default 0;
alter table public.coupons alter column scope_type set default 'all';
alter table public.coupons alter column status set default 'inactive';
alter table public.coupons alter column applicable_product_ids set default '{}'::uuid[];
alter table public.coupons alter column applicable_categories set default '{}'::text[];
alter table public.coupons alter column usage_count set default 0;

create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_coupons_status_dates on public.coupons(status, start_date, end_date);
create index if not exists idx_coupons_scope_type on public.coupons(scope_type);

drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

create table if not exists public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  coupon_code text not null,
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  used_at timestamptz not null default now(),
  unique (order_id)
);

alter table public.coupon_usages add column if not exists coupon_code text;
alter table public.coupon_usages add column if not exists discount_amount numeric(12,2);
update public.coupon_usages set discount_amount = coalesce(discount_amount, 0) where discount_amount is null;
update public.coupon_usages set coupon_code = coalesce(coupon_code, '') where coupon_code is null;
alter table public.coupon_usages alter column discount_amount set default 0;
alter table public.coupon_usages alter column discount_amount set not null;
alter table public.coupon_usages alter column coupon_code set not null;

create index if not exists idx_coupon_usages_coupon_user on public.coupon_usages(coupon_id, user_id);
create index if not exists idx_coupon_usages_coupon_used_at on public.coupon_usages(coupon_id, used_at desc);
create index if not exists idx_coupon_usages_user_used_at on public.coupon_usages(user_id, used_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_coupon_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_coupon_id_fkey
      foreign key (coupon_id) references public.coupons(id) on delete set null;
  end if;
end $$;

-- Storefront banners (admin-managed CMS banners)
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  button_text text,
  button_link text,
  section text not null check (section in ('promo_strip', 'category_promo', 'featured_section', 'secondary_banner')),
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or start_date <= end_date)
);

create index if not exists idx_banners_section_status_order on public.banners(section, status, display_order);
create index if not exists idx_banners_active_window on public.banners(status, start_date, end_date);

drop trigger if exists trg_banners_updated_at on public.banners;
create trigger trg_banners_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

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

-- Custom project requests (customer quotation workflow)
create table if not exists public.custom_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  email text not null,
  mobile text not null,
  description text not null,
  specifications text,
  budget numeric(12,2),
  deadline date,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'quoted', 'accepted', 'declined', 'link_sent', 'approved', 'rejected')),
  quotation_price numeric(12,2),
  admin_message text,
  quote_valid_until date,
  quote_approved_at timestamptz,
  quote_approved_by_user_id uuid references public.users(id) on delete set null,
  customer_response text check (customer_response in ('accepted', 'declined')),
  accepted_at timestamptz,
  declined_at timestamptz,
  purchase_link text,
  purchase_link_message text,
  purchase_link_sent_at timestamptz,
  purchase_deadline timestamptz,
  admin_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_projects
  add column if not exists quote_valid_until date,
  add column if not exists quote_approved_at timestamptz,
  add column if not exists quote_approved_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists customer_response text check (customer_response in ('accepted', 'declined')),
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists purchase_link text,
  add column if not exists purchase_link_message text,
  add column if not exists purchase_link_sent_at timestamptz,
  add column if not exists purchase_deadline timestamptz;

alter table public.custom_projects
  drop constraint if exists custom_projects_status_check;

alter table public.custom_projects
  add constraint custom_projects_status_check
  check (status in ('pending', 'reviewed', 'quoted', 'accepted', 'declined', 'link_sent', 'approved', 'rejected'));

create index if not exists idx_custom_projects_user_created
  on public.custom_projects(user_id, created_at desc);

create index if not exists idx_custom_projects_status_created
  on public.custom_projects(status, created_at desc);

create index if not exists idx_custom_projects_quote_valid_until
  on public.custom_projects(quote_valid_until);

create index if not exists idx_custom_projects_purchase_deadline
  on public.custom_projects(purchase_deadline);

drop trigger if exists trg_custom_projects_updated_at on public.custom_projects;
create trigger trg_custom_projects_updated_at
before update on public.custom_projects
for each row execute function public.set_updated_at();

create table if not exists public.custom_project_images (
  id uuid primary key default gen_random_uuid(),
  custom_project_id uuid not null references public.custom_projects(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_project_images_project
  on public.custom_project_images(custom_project_id, sort_order asc, created_at asc);

create table if not exists public.custom_project_quote_history (
  id uuid primary key default gen_random_uuid(),
  custom_project_id uuid not null references public.custom_projects(id) on delete cascade,
  previous_quotation_price numeric(12,2),
  previous_admin_message text,
  previous_quote_valid_until date,
  new_quotation_price numeric(12,2),
  new_admin_message text,
  new_quote_valid_until date,
  changed_by_admin_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_project_quote_history_project_created
  on public.custom_project_quote_history(custom_project_id, created_at desc);

create table if not exists public.custom_project_notifications (
  id uuid primary key default gen_random_uuid(),
  custom_project_id uuid not null references public.custom_projects(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  recipient_email text,
  recipient_role text not null default 'customer' check (recipient_role in ('customer', 'admin')),
  event_type text not null,
  title text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_project_notifications_project_created
  on public.custom_project_notifications(custom_project_id, created_at desc);

create index if not exists idx_custom_project_notifications_user_unread
  on public.custom_project_notifications(user_id, is_read, created_at desc);

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
alter table public.verification_tokens enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.order_status_history enable row level security;
alter table public.store_settings enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.custom_projects enable row level security;
alter table public.custom_project_images enable row level security;
alter table public.custom_project_quote_history enable row level security;
alter table public.custom_project_notifications enable row level security;
alter table public.banners enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usages enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;

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
drop policy if exists "dev_all_order_status_history" on public.order_status_history;
create policy "dev_all_order_status_history" on public.order_status_history for all using (true) with check (true);
drop policy if exists "dev_all_user_addresses" on public.user_addresses;
create policy "dev_all_user_addresses" on public.user_addresses for all using (true) with check (true);
drop policy if exists "dev_all_verification_tokens" on public.verification_tokens;
create policy "dev_all_verification_tokens" on public.verification_tokens for all using (true) with check (true);
drop policy if exists "dev_all_password_reset_tokens" on public.password_reset_tokens;
create policy "dev_all_password_reset_tokens" on public.password_reset_tokens for all using (true) with check (true);
drop policy if exists "dev_all_store_settings" on public.store_settings;
create policy "dev_all_store_settings" on public.store_settings for all using (true) with check (true);
drop policy if exists "dev_all_banners" on public.banners;
create policy "dev_all_banners" on public.banners for all using (true) with check (true);
drop policy if exists "dev_all_coupons" on public.coupons;
create policy "dev_all_coupons" on public.coupons for all using (true) with check (true);
drop policy if exists "dev_all_coupon_usages" on public.coupon_usages;
create policy "dev_all_coupon_usages" on public.coupon_usages for all using (true) with check (true);
drop policy if exists "dev_all_contact_messages" on public.contact_messages;
create policy "dev_all_contact_messages" on public.contact_messages for all using (true) with check (true);
drop policy if exists "dev_all_newsletter_subscribers" on public.newsletter_subscribers;
create policy "dev_all_newsletter_subscribers" on public.newsletter_subscribers for all using (true) with check (true);
drop policy if exists "dev_all_chat_conversations" on public.chat_conversations;
create policy "dev_all_chat_conversations" on public.chat_conversations for all using (true) with check (true);
drop policy if exists "dev_all_chat_messages" on public.chat_messages;
create policy "dev_all_chat_messages" on public.chat_messages for all using (true) with check (true);
drop policy if exists "dev_all_custom_projects" on public.custom_projects;
create policy "dev_all_custom_projects" on public.custom_projects for all using (true) with check (true);
drop policy if exists "dev_all_custom_project_images" on public.custom_project_images;
create policy "dev_all_custom_project_images" on public.custom_project_images for all using (true) with check (true);
drop policy if exists "dev_all_custom_project_quote_history" on public.custom_project_quote_history;
create policy "dev_all_custom_project_quote_history" on public.custom_project_quote_history for all using (true) with check (true);
drop policy if exists "dev_all_custom_project_notifications" on public.custom_project_notifications;
create policy "dev_all_custom_project_notifications" on public.custom_project_notifications for all using (true) with check (true);
