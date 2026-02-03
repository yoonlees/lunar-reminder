import { NextResponse } from 'next/server';
import { stripe, getStripePriceId } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/supabase';

export async function POST(request) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 }
    );
  }

  const priceId = getStripePriceId();
  if (!priceId) {
    return NextResponse.json(
      { error: 'STRIPE_PRICE_ID is not set' },
      { status: 503 }
    );
  }

  try {
    // Get the authenticated user to link subscription to their profile
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'You must be logged in to subscribe' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedPriceId = body.priceId || body.price_id;
    const finalPriceId = requestedPriceId || priceId;

    const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/$/, '') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const baseUrl = origin.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=cancel`,
      allow_promotion_codes: true,
      customer_email: user.email, // Use authenticated user's email
      metadata: {
        user_id: user.id, // Store user ID for reference
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: err.message || 'Checkout session failed' },
      { status: 500 }
    );
  }
}
