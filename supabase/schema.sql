-- =====================================================
-- Lunar Reminder Database Schema
-- =====================================================
-- This schema creates tables for user profiles, subscriptions, and reminders
-- with Row Level Security (RLS) policies enabled

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
-- Stores user profile information synced with Supabase Auth

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE
-- =====================================================
-- Stores Stripe subscription information for users

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    status TEXT NOT NULL DEFAULT 'inactive',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'inactive'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
    ON public.subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON public.subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for subscriptions updated_at
CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 3. REMINDERS TABLE
-- =====================================================
-- Stores user-created lunar calendar reminders

CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    lunar_date JSONB NOT NULL,
    solar_date DATE NOT NULL,
    recurrence TEXT DEFAULT 'none',
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_recurrence CHECK (recurrence IN ('none', 'yearly', 'monthly'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_solar_date ON public.reminders(solar_date);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminders
CREATE POLICY "Users can view their own reminders"
    ON public.reminders
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
    ON public.reminders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
    ON public.reminders
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
    ON public.reminders
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for reminders updated_at
CREATE TRIGGER set_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- INDEXES AND PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Composite index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
    ON public.subscriptions(user_id, status);

-- Index for upcoming reminders query
CREATE INDEX IF NOT EXISTS idx_reminders_user_date 
    ON public.reminders(user_id, solar_date);

-- =====================================================
-- HELPFUL QUERIES (for reference)
-- =====================================================

-- Get active subscription for a user:
-- SELECT * FROM public.subscriptions 
-- WHERE user_id = auth.uid() AND status = 'active';

-- Get upcoming reminders for a user:
-- SELECT * FROM public.reminders 
-- WHERE user_id = auth.uid() 
-- AND solar_date >= CURRENT_DATE 
-- ORDER BY solar_date ASC;

-- Check if user has active subscription:
-- SELECT EXISTS(
--   SELECT 1 FROM public.subscriptions 
--   WHERE user_id = auth.uid() AND status = 'active'
-- ) AS has_active_subscription;
