-- ===============================================================
-- CROPSA CATALOG - SUPABASE DATABASE SCHEMA
-- Generated for project: krxghdnhqqjjospwspaf
-- ===============================================================

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  contact_info TEXT,
  category_ids JSONB DEFAULT '[]'::jsonb,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  image_url TEXT,
  parent_id TEXT,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SUB CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.sub_categories (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  sub_category_id TEXT,
  product_type TEXT,
  secondary_category_ids JSONB DEFAULT '[]'::jsonb,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  characteristics JSONB DEFAULT '[]'::jsonb,
  composition JSONB DEFAULT '[]'::jsonb,
  usage JSONB DEFAULT '[]'::jsonb,
  application_rate TEXT,
  main_image_id TEXT,
  main_image_url TEXT,
  image_rotation INT DEFAULT 0,
  search_tags JSONB DEFAULT '[]'::jsonb,
  cost_price NUMERIC,
  stock_quantity INT,
  min_stock_alert INT,
  is_out_of_stock BOOLEAN DEFAULT false,
  gallery_image_ids JSONB DEFAULT '[]'::jsonb,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  allow_piece_order BOOLEAN DEFAULT true,
  allow_carton_order BOOLEAN DEFAULT false,
  pieces_per_carton INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for blazing fast catalog searches and filtering
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sub_category ON public.products(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);

-- 5. PACKAGES TABLE
CREATE TABLE IF NOT EXISTS public.packages (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT NOT NULL,
  display_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cost_price NUMERIC,
  currency TEXT DEFAULT 'EGP',
  allow_piece_order BOOLEAN DEFAULT true,
  allow_carton_order BOOLEAN DEFAULT false,
  pieces_per_carton INT DEFAULT 1,
  stock_quantity INT,
  min_stock_alert INT,
  is_out_of_stock BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_product ON public.packages(product_id);

-- 6. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  governorate TEXT,
  address TEXT,
  notes TEXT,
  total_amount NUMERIC,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. ISLAMIC FINANCING REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.financing_requests (
  id TEXT PRIMARY KEY,
  request_number TEXT,
  customer_name TEXT,
  national_id TEXT,
  phone TEXT,
  governorate TEXT,
  address TEXT,
  land_area TEXT,
  crop_type TEXT,
  requested_amount NUMERIC,
  financing_type TEXT,
  tenor_months INT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. UNIFIED CATALOG SNAPSHOT (Single-query high-speed hydration)
CREATE TABLE IF NOT EXISTS public.catalog_snapshots (
  id TEXT PRIMARY KEY DEFAULT 'latest',
  version INT DEFAULT 1,
  data JSONB NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- ===============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allows public reads & full sync operations via Supabase publishable key
-- ===============================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for companies" ON public.companies;
CREATE POLICY "Public access for companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for categories" ON public.categories;
CREATE POLICY "Public access for categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for sub_categories" ON public.sub_categories;
CREATE POLICY "Public access for sub_categories" ON public.sub_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for products" ON public.products;
CREATE POLICY "Public access for products" ON public.products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for packages" ON public.packages;
CREATE POLICY "Public access for packages" ON public.packages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for settings" ON public.settings;
CREATE POLICY "Public access for settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for orders" ON public.orders;
CREATE POLICY "Public access for orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.financing_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for financing_requests" ON public.financing_requests;
CREATE POLICY "Public access for financing_requests" ON public.financing_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.catalog_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for catalog_snapshots" ON public.catalog_snapshots;
CREATE POLICY "Public access for catalog_snapshots" ON public.catalog_snapshots FOR ALL USING (true) WITH CHECK (true);
