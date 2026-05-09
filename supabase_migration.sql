-- ============================================================
-- LODS Mobile 2 — Supabase Migration (FULL & IDEMPOTENT)
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Orders Table Updates
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS merchant_status TEXT DEFAULT NULL;

-- 2. Merchants Table Updates (for Login & Push)
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;

-- 3. Users Table Updates (for Riders: Tracking, Login, Push)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'Motorcycle';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS contact TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gps_timestamp TIMESTAMPTZ DEFAULT NULL;

-- 4. Create Menu Items Table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Realtime
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['orders', 'menu_items', 'users'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Table % is already in supabase_realtime.', tbl;
    END;
  END LOOP;
END;
$$;

-- 6. Row Level Security (RLS) Configuration
-- IMPORTANT: This allows the mobile app (anon role) to access the tables.

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid "already exists" errors
DROP POLICY IF EXISTS "Mobile App Read Merchants" ON public.merchants;
DROP POLICY IF EXISTS "Mobile App Access Users" ON public.users;
DROP POLICY IF EXISTS "Mobile App Access Orders" ON public.orders;
DROP POLICY IF EXISTS "Mobile App Access Menu Items" ON public.menu_items;

-- Create Policies
CREATE POLICY "Mobile App Read Merchants" ON public.merchants 
  FOR SELECT TO anon USING (true);

CREATE POLICY "Mobile App Access Users" ON public.users 
  FOR ALL TO anon USING (true);

CREATE POLICY "Mobile App Access Orders" ON public.orders 
  FOR ALL TO anon USING (true);

CREATE POLICY "Mobile App Access Menu Items" ON public.menu_items 
  FOR ALL TO anon USING (true);

-- 7. Indexes for Login Performance
CREATE INDEX IF NOT EXISTS idx_merchants_email_login ON public.merchants (email);
CREATE INDEX IF NOT EXISTS idx_users_email_login ON public.users (email);
