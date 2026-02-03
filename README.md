# Lunar Reminder

A Korean lunar/solar calendar app with Google sign-in and Stripe subscriptions.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) with [React 19](https://react.dev) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com) via PostCSS |
| **Auth** | [Supabase Auth](https://supabase.com/docs/guides/auth) (Google OAuth) |
| **Database** | [Supabase Postgres](https://supabase.com/docs/guides/database) (user profiles, subscriptions, reminders) |
| **Payments** | [Stripe](https://stripe.com) — Checkout for subscriptions, webhooks for events |
| **Calendar logic** | [korean-lunar-calendar](https://www.npmjs.com/package/korean-lunar-calendar), [lunar-javascript](https://www.npmjs.com/package/lunar-javascript) (solar terms, lunar dates, holidays) |
| **Hosting** | [Fly.io](https://fly.io) (listens on `0.0.0.0:3000`) |

- **Frontend:** Single-page calendar UI (`src/app`, `src/components`), Korean locale for greetings and labels.
- **Backend:** Next.js API routes under `src/app/api` (Stripe checkout + webhook).
- **Database:** Supabase Postgres with tables for user profiles, subscriptions, and reminders. See [README_DATABASE.md](README_DATABASE.md) for schema details.
- **Config:** Env vars in `.env.local`; see `.env.example` for Stripe and Supabase.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Database (Supabase)

1. **Create Supabase Project:** Sign up at [supabase.com](https://supabase.com) and create a new project.
2. **Run Migration:** Go to SQL Editor in your Supabase dashboard and run the SQL from `supabase/schema.sql` to create tables for profiles, subscriptions, and reminders.
3. **Configure OAuth:** In Supabase Dashboard → Authentication → Providers, enable Google OAuth and add your Google OAuth credentials.
4. **Verify Setup:** Check Table Editor to ensure `profiles`, `subscriptions`, and `reminders` tables exist with RLS enabled.

See [README_DATABASE.md](README_DATABASE.md) for detailed schema documentation.

### Stripe (Payments)

1. Copy `.env.example` to `.env.local` and set:
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_PRICE_ID` (create a Product and Price in [Stripe Dashboard](https://dashboard.stripe.com/products))
2. **Webhook (Fly.io):** In Stripe Dashboard → Developers → Webhooks, add endpoint `https://<your-app>.fly.dev/api/stripe/webhook` and subscribe to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Use the signing secret as `STRIPE_WEBHOOK_SECRET`.
3. Set the same env vars in Fly.io: `fly secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... STRIPE_PRICE_ID=price_...` (and optionally `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` if the client needs it).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy

- **Fly.io:** This app is configured for [Fly.io](https://fly.io) (see `fly.toml`). The dev and start scripts bind to `0.0.0.0:3000` so the app is reachable in containers. Set Stripe and Supabase env vars with `fly secrets set`.
- [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for other platforms (e.g. Vercel).
