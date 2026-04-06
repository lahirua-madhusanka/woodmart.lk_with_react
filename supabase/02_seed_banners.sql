-- Seed sample storefront banners for all non-hero sections.
-- Safe to run multiple times: each insert is guarded by NOT EXISTS.

insert into public.banners (
  title,
  subtitle,
  image_url,
  button_text,
  button_link,
  section,
  display_order,
  status,
  start_date,
  end_date
)
select
  'Weekend Flash Deals',
  'Limited-time offers on selected collections.',
  'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1600&q=80',
  'Shop Deals',
  '/shop?sort=discount',
  'promo_strip',
  0,
  'active',
  current_date - interval '1 day',
  current_date + interval '30 day'
where not exists (
  select 1 from public.banners where section = 'promo_strip' and title = 'Weekend Flash Deals'
);

insert into public.banners (
  title,
  subtitle,
  image_url,
  button_text,
  button_link,
  section,
  display_order,
  status,
  start_date,
  end_date
)
select
  'Dining Collection Refresh',
  'Modern wood finishes for warm family spaces.',
  'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=1600&q=80',
  'Explore Dining',
  '/shop?category=dining',
  'category_promo',
  0,
  'active',
  current_date - interval '1 day',
  current_date + interval '45 day'
where not exists (
  select 1 from public.banners where section = 'category_promo' and title = 'Dining Collection Refresh'
);

insert into public.banners (
  title,
  subtitle,
  image_url,
  button_text,
  button_link,
  section,
  display_order,
  status,
  start_date,
  end_date
)
select
  'Featured Craftsmanship',
  'Hand-selected premium pieces, curated weekly.',
  'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=1600&q=80',
  'View Featured',
  '/shop?featured=true',
  'featured_section',
  0,
  'active',
  current_date - interval '1 day',
  current_date + interval '60 day'
where not exists (
  select 1 from public.banners where section = 'featured_section' and title = 'Featured Craftsmanship'
);

insert into public.banners (
  title,
  subtitle,
  image_url,
  button_text,
  button_link,
  section,
  display_order,
  status,
  start_date,
  end_date
)
select
  'Custom Build Inspiration',
  'Need something unique? Start your custom request.',
  'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&q=80',
  'Start Custom Project',
  '/custom-project',
  'secondary_banner',
  0,
  'active',
  current_date - interval '1 day',
  current_date + interval '90 day'
where not exists (
  select 1 from public.banners where section = 'secondary_banner' and title = 'Custom Build Inspiration'
);
