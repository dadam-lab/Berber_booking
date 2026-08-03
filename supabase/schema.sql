-- Barber Booking System - Supabase Schema Definition
-- Run this script in your Supabase SQL Editor to initialize all tables, RLS policies, and default seed data.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    note TEXT,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_title TEXT NOT NULL,
    service_price DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS public.availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    time TIME NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    is_vacation BOOLEAN DEFAULT FALSE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    UNIQUE(date, time)
);

-- 5. GALLERY TABLE
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    caption TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability_date ON public.availability(date);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_client_email ON public.orders(client_email);

-- Disable RLS for simple API public access or set permissive RLS policies
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery DISABLE ROW LEVEL SECURITY;

-- SEED INITIAL SETTINGS
INSERT INTO public.settings (key, value) VALUES
    ('barber_name', 'Alex "Blade" Cutting'),
    ('barber_role', 'Master Barber & Stylist'),
    ('barber_bio', 'Více než 10 let zkušeností v oboru. Nabízím klasické i moderní střihy, úpravu vousů horkým ručníkem a prémiovou péči pro každého muže.'),
    ('barber_avatar', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800'),
    ('logo_url', ''),
    ('contact_phone', '+420 777 888 999'),
    ('contact_email', 'info@barberstudio.cz'),
    ('sender_email', 'rezervace@barberstudio.cz'),
    ('contact_address', 'Vodičkova 12, 110 00 Praha 1'),
    ('google_maps_iframe', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2560.106443048995!2d14.42231267683935!3d50.08182791368817!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470b94ea8e7b1a11%3A0x2863fb7aa5b47a1!2sVodi%C4%8Dkova%2012%2C%20110%2000%20Nov%C3%A9%20M%C4%9Bsto!5e0!3m2!1scs!2scz!4v1700000000000!5m2!1scs!2scz'),
    ('primary_color', '#0f172a'),
    ('secondary_color', '#d97706'),
    ('bg_color', '#020617'),
    ('card_bg', '#0f172a'),
    ('text_color', '#f8fafc'),
    ('accent_color', '#f59e0b'),
    ('admin_password', 'admin'),
    ('resend_api_key', ''),
    ('google_calendar_id', ''),
    ('google_service_account_email', ''),
    ('google_private_key', '')
ON CONFLICT (key) DO NOTHING;

-- SEED INITIAL SERVICES
INSERT INTO public.services (title, description, price, duration_minutes, is_active) VALUES
    ('Klasický střih', 'Mytí, střih nůžkami i strojkem, úprava obočí, kontur a úprava vlasů stylingovým produktem.', 550.00, 45, true),
    ('Úprava vousů Hot Towel', 'Tradiční holení břitvou s napářkou horkým ručníkem, vytvarování a ošetření olejem.', 400.00, 30, true),
    ('VIP Kompletní balíček', 'Kombinace střihu vlasů, úpravy vousů horkým ručníkem, depilace voskem a masáže hlavy.', 850.00, 60, true),
    ('Juniorský střih (do 15 let)', 'Moderní dětský střih přizpůsobený přání zákazníka.', 400.00, 30, true)
ON CONFLICT DO NOTHING;

-- SEED SAMPLE GALLERY IMAGES
INSERT INTO public.gallery (image_url, caption, order_index) VALUES
    ('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800', 'Klasický Fade a precizní vousy', 1),
    ('https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800', 'Detailní úprava kontur břitvou', 2),
    ('https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=800', 'Interiér našeho barber shopu', 3),
    ('https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&q=80&w=800', 'Tradiční péče s horkým ručníkem', 4)
ON CONFLICT DO NOTHING;
