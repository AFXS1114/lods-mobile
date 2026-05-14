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

-- 4.5 Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_no TEXT NOT NULL,
  landmark TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  loyalty_count INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Realtime
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['orders', 'menu_items', 'users', 'clients'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Table % is already in supabase_realtime.', tbl;
    END;
  END LOOP;
END;
$$;

-- 6. Row Level Security (RLS) Configuration
-- Secure policies bound to Supabase Auth UUIDs

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop existing old/new policies to ensure idempotence
DROP POLICY IF EXISTS "Mobile App Read Merchants" ON public.merchants;
DROP POLICY IF EXISTS "Mobile App Access Users" ON public.users;
DROP POLICY IF EXISTS "Mobile App Access Orders" ON public.orders;
DROP POLICY IF EXISTS "Mobile App Access Menu Items" ON public.menu_items;

DROP POLICY IF EXISTS "Clients access own profile" ON public.clients;
DROP POLICY IF EXISTS "Merchants access own profile" ON public.merchants;
DROP POLICY IF EXISTS "Anyone can read merchants" ON public.merchants;
DROP POLICY IF EXISTS "Riders access own profile" ON public.users;
DROP POLICY IF EXISTS "Riders see own orders" ON public.orders;
DROP POLICY IF EXISTS "Merchants access own menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can read menu items" ON public.menu_items;

-- Create Secure Policies
CREATE POLICY "Clients access own profile" ON public.clients FOR ALL TO authenticated USING (auth.uid() = id);
CREATE POLICY "Merchants access own profile" ON public.merchants FOR ALL TO authenticated USING (auth.uid() = id);
CREATE POLICY "Anyone can read merchants" ON public.merchants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Riders access own profile" ON public.users FOR ALL TO authenticated USING (auth.uid() = id);

CREATE POLICY "Riders see own orders" ON public.orders FOR ALL TO authenticated USING (auth.uid() = rider_id);
-- Note: If merchants need to view/update orders, you may need an additional policy here checking `auth.uid() = merchant_id` if that column exists on orders.

CREATE POLICY "Merchants access own menu items" ON public.menu_items FOR ALL TO authenticated USING (auth.uid() = merchant_id);
CREATE POLICY "Anyone can read menu items" ON public.menu_items FOR SELECT TO authenticated USING (true);

-- 7. Supabase Auth Integration & Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Trigger to automatically create a row in users or merchants when signing up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'rider' THEN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
  ELSIF NEW.raw_user_meta_data->>'role' = 'merchant' THEN
    INSERT INTO public.merchants (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
  ELSIF NEW.raw_user_meta_data->>'role' = 'client' THEN
    INSERT INTO public.clients (
      id, email, full_name, address, contact_no, landmark, latitude, longitude
    )
    VALUES (
      NEW.id, 
      NEW.email, 
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'contact_no',
      NEW.raw_user_meta_data->>'landmark',
      NULLIF(NULLIF(NEW.raw_user_meta_data->>'latitude', ''), 'null')::DOUBLE PRECISION,
      NULLIF(NULLIF(NEW.raw_user_meta_data->>'longitude', ''), 'null')::DOUBLE PRECISION
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 8. ONE-TIME MIGRATION: Plaintext Passwords -> Supabase Auth
-- Run this ONCE to migrate your existing users.
-- ============================================================

/*
-- Migrate existing Riders
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, 
  email_confirmed_at, recovery_sent_at, last_sign_in_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
  confirmation_token, email_change, email_change_token_new, recovery_token
)
SELECT 
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, crypt(password, gen_salt('bf')),
  now(), now(), now(), 
  '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'rider'), now(), now(),
  '', '', '', ''
FROM public.users
WHERE email IS NOT NULL AND password IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Migrate existing Merchants
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, 
  email_confirmed_at, recovery_sent_at, last_sign_in_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
  confirmation_token, email_change, email_change_token_new, recovery_token
)
SELECT 
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, crypt(password, gen_salt('bf')),
  now(), now(), now(), 
  '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'merchant'), now(), now(),
  '', '', '', ''
FROM public.merchants
WHERE email IS NOT NULL AND password IS NOT NULL
ON CONFLICT (id) DO NOTHING;
*/
