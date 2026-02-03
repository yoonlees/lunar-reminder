# Database Schema Documentation

This document describes the database schema for the Lunar Reminder application using Supabase Postgres.

## Overview

The database consists of three main tables:
- **`profiles`** - User profile information
- **`subscriptions`** - Stripe subscription data
- **`reminders`** - User-created lunar calendar reminders

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## Setup Instructions

### 1. Run the Migration

1. Navigate to your Supabase project dashboard: https://app.supabase.com
2. Go to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of [`supabase/schema.sql`](file:///Users/yoonlees/Development/lunar-reminder/supabase/schema.sql)
5. Click **Run** to execute the migration

### 2. Verify Tables

After running the migration, verify the tables were created:

1. Go to **Table Editor** in the left sidebar
2. You should see three tables: `profiles`, `subscriptions`, and `reminders`
3. Click on each table to verify the columns match the schema

### 3. Check RLS Policies

1. Click on any table in the Table Editor
2. Click the **RLS** tab
3. Verify that RLS is enabled and policies are listed

## Schema Details

### `profiles` Table

Stores user profile information synced with Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, references `auth.users(id)` |
| `email` | TEXT | User's email address |
| `full_name` | TEXT | User's full name (nullable) |
| `avatar_url` | TEXT | URL to user's avatar image (nullable) |
| `created_at` | TIMESTAMPTZ | When the profile was created |
| `updated_at` | TIMESTAMPTZ | When the profile was last updated |

**Automatic Creation:** A trigger automatically creates a profile when a user signs up via Supabase Auth.

**RLS Policies:**
- Users can view their own profile
- Users can update their own profile
- Users can insert their own profile

### `subscriptions` Table

Stores Stripe subscription information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `profiles(id)` |
| `stripe_customer_id` | TEXT | Stripe customer ID (unique) |
| `stripe_subscription_id` | TEXT | Stripe subscription ID (unique, nullable) |
| `stripe_price_id` | TEXT | Stripe price ID |
| `status` | TEXT | Subscription status (active, canceled, etc.) |
| `current_period_start` | TIMESTAMPTZ | Start of current billing period |
| `current_period_end` | TIMESTAMPTZ | End of current billing period |
| `cancel_at_period_end` | BOOLEAN | Whether subscription cancels at period end |
| `created_at` | TIMESTAMPTZ | When the subscription was created |
| `updated_at` | TIMESTAMPTZ | When the subscription was last updated |

**Valid Status Values:** `active`, `canceled`, `incomplete`, `incomplete_expired`, `past_due`, `trialing`, `unpaid`, `inactive`

**RLS Policies:**
- Users can view their own subscription
- Users can insert their own subscription
- Users can update their own subscription

### `reminders` Table

Stores user-created lunar calendar reminders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `profiles(id)` |
| `title` | TEXT | Reminder title |
| `description` | TEXT | Reminder description (nullable) |
| `lunar_date` | JSONB | Lunar date object: `{year, month, day, isLeapMonth}` |
| `solar_date` | DATE | Calculated solar date for the reminder |
| `recurrence` | TEXT | Recurrence pattern: `none`, `yearly`, `monthly` |
| `notification_enabled` | BOOLEAN | Whether notifications are enabled |
| `created_at` | TIMESTAMPTZ | When the reminder was created |
| `updated_at` | TIMESTAMPTZ | When the reminder was last updated |

**RLS Policies:**
- Users can view their own reminders
- Users can insert their own reminders
- Users can update their own reminders
- Users can delete their own reminders

## Common Queries

### Get User's Active Subscription

```sql
SELECT * FROM public.subscriptions 
WHERE user_id = auth.uid() 
AND status = 'active';
```

### Get Upcoming Reminders

```sql
SELECT * FROM public.reminders 
WHERE user_id = auth.uid() 
AND solar_date >= CURRENT_DATE 
ORDER BY solar_date ASC
LIMIT 10;
```

### Check if User Has Active Subscription

```sql
SELECT EXISTS(
  SELECT 1 FROM public.subscriptions 
  WHERE user_id = auth.uid() 
  AND status = 'active'
) AS has_active_subscription;
```

### Get All Reminders for Current Month

```sql
SELECT * FROM public.reminders 
WHERE user_id = auth.uid() 
AND EXTRACT(YEAR FROM solar_date) = EXTRACT(YEAR FROM CURRENT_DATE)
AND EXTRACT(MONTH FROM solar_date) = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY solar_date ASC;
```

## Database Helper Functions

The application provides helper functions in [`src/lib/supabase.js`](file:///Users/yoonlees/Development/lunar-reminder/src/lib/supabase.js):

### Profile Functions
- `getProfile(userId)` - Get user profile
- `createOrUpdateProfile(user)` - Create or update profile

### Subscription Functions
- `getSubscription(userId)` - Get user's subscription
- `hasActiveSubscription(userId)` - Check if user has active subscription
- `createOrUpdateSubscription(data)` - Create or update subscription

### Reminder Functions
- `getReminders(userId)` - Get all reminders for user
- `getUpcomingReminders(userId, daysAhead)` - Get upcoming reminders
- `createReminder(userId, data)` - Create new reminder
- `updateReminder(reminderId, updates)` - Update reminder
- `deleteReminder(reminderId)` - Delete reminder

## Stripe Webhook Integration

The Stripe webhook handler ([`src/app/api/stripe/webhook/route.js`](file:///Users/yoonlees/Development/lunar-reminder/src/app/api/stripe/webhook/route.js)) automatically syncs subscription data:

- **`checkout.session.completed`** - Creates subscription record when checkout completes
- **`customer.subscription.updated`** - Updates subscription status and billing period
- **`customer.subscription.deleted`** - Marks subscription as canceled

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- No user can view or modify another user's data
- Database operations are scoped to the authenticated user (`auth.uid()`)

### Automatic Profile Creation

When a user signs up via Google OAuth:
1. Supabase Auth creates a user in `auth.users`
2. A database trigger automatically creates a corresponding profile in `profiles`
3. The profile is populated with data from the OAuth provider (name, email, avatar)

## Indexes

The schema includes indexes for optimal query performance:

- `idx_subscriptions_user_id` - Fast subscription lookups by user
- `idx_subscriptions_stripe_customer_id` - Fast lookups by Stripe customer
- `idx_subscriptions_stripe_subscription_id` - Fast lookups by Stripe subscription
- `idx_subscriptions_user_status` - Composite index for user + status queries
- `idx_reminders_user_id` - Fast reminder lookups by user
- `idx_reminders_solar_date` - Fast date-based queries
- `idx_reminders_user_date` - Composite index for user + date queries

## Troubleshooting

### Profile Not Created After Signup

If a profile is not automatically created:
1. Check that the trigger `on_auth_user_created` exists
2. Verify the trigger function `handle_new_user()` is defined
3. Check Supabase logs for any trigger errors

### RLS Policy Errors

If you get RLS policy errors:
1. Verify RLS is enabled on the table
2. Check that policies exist for the operation (SELECT, INSERT, UPDATE, DELETE)
3. Ensure the user is authenticated (`auth.uid()` is not null)

### Subscription Not Saving

If subscriptions aren't saving from Stripe webhooks:
1. Check Stripe webhook logs for errors
2. Verify the webhook secret is correct
3. Check application logs for database errors
4. Ensure the user's profile exists before creating subscription
