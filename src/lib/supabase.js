
import { createClient } from '@supabase/supabase-js'

// Read Supabase credentials from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zcugdaebtnnegfqyapxe.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdWdkYWVidG5uZWdmcXlhcHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTA4MjAsImV4cCI6MjA4NTE4NjgyMH0.wjqwCihrcwN4b00nBqw_9BC88jcXD6tF_ByxhUzCW9I';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Get a Supabase client with the Service Role key
 * WARNING: access to this client bypasses Row Level Security.
 * Use this only on the server for admin tasks.
 */
export function getServiceSupabase() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to anon key.');
        return supabase;
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

// =====================================================
// AUTH FUNCTIONS
// =====================================================

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
            // redirectTo: typeof window !== 'undefined' ? window.location.origin : 'https://lunar.kiwishare.com'
        }
    });
    if (error) console.error('Error logging in:', error);
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
}

export async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
}

/**
 * Create a Supabase client for server-side use (API routes)
 * This client can read auth cookies from the request
 * @param {Request} request - The Next.js request object
 * @returns {Object} Server-side Supabase client
 */
export function createServerClient(request) {
    const { createClient } = require('@supabase/supabase-js');

    // Get cookies from request headers
    const cookieHeader = request.headers.get('cookie') || '';

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            storage: {
                getItem: (key) => {
                    // Parse cookies and find the auth token
                    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                        const [name, value] = cookie.trim().split('=');
                        acc[name] = value;
                        return acc;
                    }, {});
                    return cookies[key] || null;
                },
                setItem: () => { }, // No-op for server
                removeItem: () => { }, // No-op for server
            },
        },
    });
}

/**
 * Get current user from server-side request
 * Use this in API routes instead of getCurrentUser()
 * @param {Request} request - The Next.js request object
 * @returns {Promise<Object|null>} User object or null
 */
export async function getServerUser(request) {
    const serverClient = createServerClient(request);
    const { data: { session } } = await serverClient.auth.getSession();
    return session?.user ?? null;
}

// =====================================================
// PROFILE FUNCTIONS
// =====================================================

/**
 * Get user profile by user ID
 * @param {string} userId - The user's UUID
 * @returns {Promise<Object|null>} User profile or null
 */
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
}

/**
 * Create or update user profile
 * @param {Object} user - User object from Supabase Auth
 * @returns {Promise<Object|null>} Created/updated profile or null
 */
export async function createOrUpdateProfile(user) {
    if (!user) return null;

    const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        console.error('Error creating/updating profile:', error);
        return null;
    }
    return data;
}

// =====================================================
// SUBSCRIPTION FUNCTIONS
// =====================================================

/**
 * Get user's subscription
 * @param {string} userId - The user's UUID
 * @returns {Promise<Object|null>} Subscription data or null
 */
export async function getSubscription(userId) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No subscription found
            return null;
        }
        console.error('Error fetching subscription:', error);
        return null;
    }
    return data;
}

/**
 * Check if user has active subscription
 * @param {string} userId - The user's UUID
 * @returns {Promise<boolean>} True if user has active subscription
 */
export async function hasActiveSubscription(userId) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return false;
        }
        console.error('Error checking subscription:', error);
        return false;
    }
    return !!data;
}

/**
 * Create or update subscription from Stripe webhook
 * @param {Object} subscriptionData - Subscription data from Stripe
 * @param {Object} supabaseClient - Optional Supabase client (use service role client for webhooks)
 * @returns {Promise<Object|null>} Created/updated subscription or null
 */
export async function createOrUpdateSubscription(subscriptionData, supabaseClient = supabase) {
    const {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd
    } = subscriptionData;

    if (!userId || !stripeCustomerId) {
        console.error('Missing required subscription data');
        return null;
    }

    // First, check if subscription exists by stripe_customer_id
    const { data: existing } = await supabaseClient
        .from('subscriptions')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

    const payload = {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId || null,
        stripe_price_id: stripePriceId || null,
        status: status || 'inactive',
        current_period_start: currentPeriodStart || null,
        current_period_end: currentPeriodEnd || null,
        cancel_at_period_end: cancelAtPeriodEnd || false,
        updated_at: new Date().toISOString()
    };

    let result;
    if (existing) {
        // Update existing subscription
        result = await supabaseClient
            .from('subscriptions')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single();
    } else {
        // Create new subscription
        result = await supabaseClient
            .from('subscriptions')
            .insert(payload)
            .select()
            .single();
    }

    if (result.error) {
        console.error('Error creating/updating subscription:', result.error);
        return null;
    }
    return result.data;
}

// =====================================================
// REMINDER FUNCTIONS
// =====================================================

/**
 * Get all reminders for a user
 * @param {string} userId - The user's UUID
 * @returns {Promise<Array>} Array of reminders
 */
export async function getReminders(userId) {
    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .order('solar_date', { ascending: true });

    if (error) {
        console.error('Error fetching reminders:', error);
        return [];
    }
    return data || [];
}

/**
 * Get upcoming reminders for a user
 * @param {string} userId - The user's UUID
 * @param {number} daysAhead - Number of days to look ahead (default: 30)
 * @returns {Promise<Array>} Array of upcoming reminders
 */
export async function getUpcomingReminders(userId, daysAhead = 30) {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .gte('solar_date', today)
        .lte('solar_date', futureDateStr)
        .order('solar_date', { ascending: true });

    if (error) {
        console.error('Error fetching upcoming reminders:', error);
        return [];
    }
    return data || [];
}

/**
 * Create a new reminder
 * @param {string} userId - The user's UUID
 * @param {Object} reminderData - Reminder data
 * @returns {Promise<Object|null>} Created reminder or null
 */
export async function createReminder(userId, reminderData) {
    const {
        title,
        description,
        lunarDate,
        solarDate,
        recurrence,
        notificationEnabled
    } = reminderData;

    if (!title || !lunarDate || !solarDate) {
        console.error('Missing required reminder data');
        return null;
    }

    const { data, error } = await supabase
        .from('reminders')
        .insert({
            user_id: userId,
            title,
            description: description || null,
            lunar_date: lunarDate,
            solar_date: solarDate,
            recurrence: recurrence || 'none',
            notification_enabled: notificationEnabled !== undefined ? notificationEnabled : true
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating reminder:', error);
        return null;
    }
    return data;
}

/**
 * Update a reminder
 * @param {string} reminderId - The reminder's UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated reminder or null
 */
export async function updateReminder(reminderId, updates) {
    const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', reminderId)
        .select()
        .single();

    if (error) {
        console.error('Error updating reminder:', error);
        return null;
    }
    return data;
}

/**
 * Delete a reminder
 * @param {string} reminderId - The reminder's UUID
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteReminder(reminderId) {
    const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

    if (error) {
        console.error('Error deleting reminder:', error);
        return false;
    }
    return true;
}
