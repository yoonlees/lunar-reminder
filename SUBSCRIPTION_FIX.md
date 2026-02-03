# Subscription Creation Fix

## Problem Identified

The Stripe webhook couldn't create subscription records because:
- `session.customer_email` was `null` in the checkout session
- The webhook tried to look up the user by email but couldn't find them
- Error: `Could not find user for email: null`

## Root Cause

The Stripe checkout session wasn't configured to collect or include the customer's email address.

## Solution Implemented

Updated `/src/app/api/stripe/checkout/route.js` to:

1. **Require authentication** - Users must be logged in to subscribe
2. **Include customer email** - Pass `user.email` to Stripe checkout
3. **Add metadata** - Store `user_id` in session metadata for reference

### Code Changes

```javascript
// Get the authenticated user
const user = await getCurrentUser();
if (!user || !user.email) {
  return NextResponse.json(
    { error: 'You must be logged in to subscribe' },
    { status: 401 }
  );
}

// Create checkout session with user's email
const session = await stripe.checkout.sessions.create({
  // ... other config
  customer_email: user.email,  // ← This fixes the issue!
  metadata: {
    user_id: user.id,
  },
});
```

## How It Works Now

1. User signs in with Google → Profile created in Supabase ✅
2. User clicks subscribe → Checkout checks authentication
3. Stripe checkout includes user's email
4. Webhook receives `checkout.session.completed` event
5. Webhook looks up user by email → **Now succeeds!** ✅
6. Subscription saved to database ✅

## Testing Instructions

### Local Testing

1. **Restart dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Test the flow**:
   - Go to http://localhost:3000
   - Sign in with Google
   - Click subscribe button
   - Complete checkout with test card: `4242 4242 4242 4242`
   - Check browser console for logs

3. **Verify in Supabase**:
   - Go to Table Editor → `subscriptions`
   - You should see a new row with your subscription data

### Production Testing (Fly.io)

The deployment is currently running. Once complete:

1. Go to https://lunar-reminder.fly.dev
2. Sign in with Google
3. Complete a subscription
4. Check Supabase Table Editor for the subscription record

### Check Logs

**Local:**
- Check terminal running `npm run dev`
- Look for: `Subscription saved to database: <id>`

**Production:**
```bash
fly logs -a lunar-reminder
```
Look for the same success message.

## Expected Behavior

### Before Fix ❌
```
Checkout completed: cs_test_... null
Could not find user for email: null
```

### After Fix ✅
```
Checkout completed: cs_test_... user@example.com
Subscription saved to database: abc-123-def-456
```

## Deployment Status

- ✅ Code committed
- 🔄 Deploying to Fly.io (in progress)
- ⏳ Waiting for deployment to complete

Once deployment finishes, test on production!
