# Database Troubleshooting Guide

## Issue: Login and Subscription Not Creating Database Entries

### Root Causes Identified

1. **Environment Variables Not Set** ✅ FIXED
   - Supabase credentials were hardcoded instead of using env vars
   - Updated `src/lib/supabase.js` to read from `process.env`
   - Added credentials to `.env.local`

2. **SQL Migration Not Run** ⚠️ CHECK THIS
   - The database tables may not exist yet
   - Need to run the SQL migration in Supabase Dashboard

3. **Fly.io Secrets Not Set** ⚠️ CHECK THIS
   - Fly.io deployment needs Supabase env vars
   - Need to set secrets for production

---

## Step-by-Step Fix

### 1. ✅ Update Local Environment (DONE)

The following files have been updated:
- `src/lib/supabase.js` - Now reads from environment variables
- `.env.local` - Supabase credentials added
- `.env.example` - Updated to show required variables

### 2. ⚠️ Run SQL Migration in Supabase (DO THIS NOW)

**CRITICAL:** You must run the SQL migration to create the database tables!

1. Go to your Supabase Dashboard: https://app.supabase.com/project/zcugdaebtnnegfqyapxe
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd+Enter)

**Expected Output:**
- Should see "Success. No rows returned"
- This creates 3 tables: `profiles`, `subscriptions`, `reminders`

**Verify Tables Were Created:**
1. Go to **Table Editor** in the left sidebar
2. You should see three tables listed:
   - `profiles`
   - `subscriptions`
   - `reminders`
3. Click on each table to verify columns exist

### 3. ⚠️ Set Fly.io Secrets (DO THIS AFTER MIGRATION)

Your Fly.io deployment needs the Supabase credentials:

```bash
fly secrets set \
  NEXT_PUBLIC_SUPABASE_URL=https://zcugdaebtnnegfqyapxe.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdWdkYWVidG5uZWdmcXlhcHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTA4MjAsImV4cCI6MjA4NTE4NjgyMH0.wjqwCihrcwN4b00nBqw_9BC88jcXD6tF_ByxhUzCW9I \
  -a lunar-reminder
```

This will automatically trigger a new deployment.

### 4. 🔄 Restart Your Local Dev Server

After updating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

---

## Testing the Fix

### Test 1: Profile Creation on Login

1. **Clear browser cache** (important!)
2. Go to http://localhost:3000
3. Click "Sign in with Google"
4. Complete the OAuth flow
5. **Check Supabase:**
   - Go to Table Editor → `profiles`
   - You should see a new row with your email

**If profile is NOT created:**
- Check browser console for errors
- Check Supabase logs: Dashboard → Logs → Postgres Logs
- Verify the trigger exists: SQL Editor → run `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`

### Test 2: Subscription Creation

1. Complete a Stripe checkout
2. **Check Supabase:**
   - Go to Table Editor → `subscriptions`
   - You should see a new row with your subscription data

**If subscription is NOT created:**
- Check server logs for webhook errors
- Check Stripe webhook logs: Dashboard → Developers → Webhooks → Events
- Verify webhook endpoint is correct: `https://lunar-reminder.fly.dev/api/stripe/webhook`

---

## Common Issues & Solutions

### Issue: "relation 'public.profiles' does not exist"

**Solution:** You haven't run the SQL migration yet. Follow Step 2 above.

### Issue: Profile created but subscription not saved

**Possible causes:**
1. Webhook not configured in Stripe
2. Webhook secret incorrect
3. User email doesn't match profile email

**Debug steps:**
1. Check Stripe webhook logs for delivery status
2. Check server logs: `fly logs -a lunar-reminder`
3. Verify webhook handler is receiving events

### Issue: "RLS policy violation" errors

**Solution:** 
1. Verify RLS policies exist: SQL Editor → run `SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'subscriptions', 'reminders');`
2. If no policies, re-run the SQL migration

### Issue: Changes work locally but not on Fly.io

**Solution:** You forgot to set Fly.io secrets. Run the command in Step 3.

---

## Verification Checklist

- [ ] SQL migration run in Supabase Dashboard
- [ ] Tables visible in Table Editor (`profiles`, `subscriptions`, `reminders`)
- [ ] RLS policies enabled on all tables
- [ ] Fly.io secrets set for Supabase credentials
- [ ] Local dev server restarted
- [ ] Test login creates profile entry
- [ ] Test subscription creates subscription entry

---

## Quick Debug Commands

### Check if tables exist (run in Supabase SQL Editor):
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'subscriptions', 'reminders');
```

### Check if RLS is enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'subscriptions', 'reminders');
```

### Check if trigger exists:
```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### View current Fly.io secrets:
```bash
fly secrets list -a lunar-reminder
```

---

## Next Steps After Fix

Once everything is working:

1. **Test the full flow:**
   - Sign in with Google → verify profile created
   - Complete Stripe checkout → verify subscription created
   - Check that RLS prevents accessing other users' data

2. **Deploy to Fly.io:**
   ```bash
   fly deploy -a lunar-reminder
   ```

3. **Monitor logs:**
   ```bash
   fly logs -a lunar-reminder
   ```

4. **Verify production:**
   - Test login on https://lunar-reminder.fly.dev
   - Check Supabase Table Editor for new entries
