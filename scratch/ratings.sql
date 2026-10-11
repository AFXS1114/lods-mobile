-- 1. Create Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  rider_rating INTEGER CHECK (rider_rating >= 1 AND rider_rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Update Orders Table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_rated BOOLEAN DEFAULT false;

-- 3. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;

-- 4. RLS Policies
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can create ratings" ON public.ratings;
CREATE POLICY "Clients can create ratings" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can see own ratings" ON public.ratings;
CREATE POLICY "Clients can see own ratings" ON public.ratings FOR SELECT TO authenticated USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Riders can see ratings assigned to them" ON public.ratings;
CREATE POLICY "Riders can see ratings assigned to them" ON public.ratings FOR SELECT TO authenticated USING (auth.uid() = rider_id);
