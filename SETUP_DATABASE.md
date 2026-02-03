# Quick Setup Guide - Database Configuration

## 🚨 CRITICAL: You Must Complete These Steps

### 1. Run SQL Migration in Supabase (5 minutes)

**This creates the database tables!**

1. Go to: https://app.supabase.com/project/zcugdaebtnnegfqyapxe/sql
2. Click "New Query"
3. Copy ALL contents from `supabase/schema.sql`
4. Paste and click "Run"
5. Verify tables exist: Go to Table Editor → should see `profiles`, `subscriptions`, `reminders`

### 2. Set Fly.io Secrets (Already Running)

The command to set Fly.io secrets is running now. This will:
- Add Supabase credentials to your Fly.io app
- Trigger a new deployment automatically

### 3. Restart Local Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Why Tables Weren't Created

**Two issues found:**

1. ❌ **SQL migration not run** - Tables don't exist in Supabase yet
2. ❌ **Fly.io secrets not set** - Production app couldn't connect to database

**Now fixed:**
- ✅ Environment variables configured in `.env.local`
- ✅ Code updated to read from env vars
- ✅ Fly.io secrets being set (command running)
- ⏳ **YOU NEED TO:** Run SQL migration in Supabase Dashboard

## After Migration

Test locally:
1. Restart dev server
2. Sign in with Google
3. Check Supabase Table Editor → `profiles` → should see your profile

See `TROUBLESHOOTING.md` for detailed debugging steps.
