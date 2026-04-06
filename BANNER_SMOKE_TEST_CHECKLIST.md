# Banner CMS Smoke Test Checklist

Use this checklist after schema + seed are applied.

## 1) Setup

1. Run [supabase/01_schema.sql](supabase/01_schema.sql).
2. Run [supabase/02_seed_banners.sql](supabase/02_seed_banners.sql).
3. Start backend and frontend.

## 2) Admin CRUD

1. Open admin banners page.
2. Create a banner with:
   - section: promo_strip
   - status: active
   - start date: today
   - end date: today + 7 days
3. Expected: success toast + row appears immediately.
4. Edit title/subtitle/display order.
5. Expected: row updates without refresh.
6. Toggle status to inactive.
7. Expected: status badge changes and save toast appears.
8. Toggle back to active.

## 3) Upload Flow

1. Click Upload and choose an image.
2. Expected: upload success toast.
3. Expected: image URL field auto-fills.
4. Expected: preview image renders.

## 4) Storefront Rendering by Section

1. Open home page and verify each section renders at least one banner:
   - promo_strip
   - category_promo
   - featured_section
   - secondary_banner
2. Expected: CTA button routes correctly for internal links.
3. Expected: external links open in new tab.

## 5) Date Window Behavior

1. In admin, set end date to yesterday for one active banner.
2. Refresh home page.
3. Expected: that banner does not render.
4. Remove end date or set future date.
5. Expected: banner renders again.

## 6) Fallback Behavior

1. Set all banners in one section to inactive.
2. Refresh home page.
3. Expected: fallback appears for that section (or Promo fallback in promo_strip).

## 7) API Sanity

1. GET /api/store/banners?section=promo_strip
2. Expected: returns only active, in-window banners.
3. GET /api/admin/banners (admin token)
4. Expected: returns full banner list including inactive rows.
