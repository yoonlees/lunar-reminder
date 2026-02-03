import { NextResponse } from 'next/server';
import { stripe, getStripePriceId } from '@/lib/stripe';
import { getServerUser } from '@/lib/supabase';

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
    const body = await request.json().catch(() => ({}));
    
    // Try to get user from server-side session (cookies) first
    let serverUser = null;
    try {
      serverUser = await getServerUser(request);
    } catch (err) {
      // If server-side auth fails (e.g., cookies not configured), fall back to client-provided info
      console.log('Server-side auth check failed, using client-provided user info');
    }

    // Use server user if available, otherwise use client-provided info
    const userEmail = serverUser?.email || body.email || body.customer_email;
    const userId = serverUser?.id || body.user_id;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'You must be logged in to subscribe' },
        { status: 401 }
      );
    }

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
      customer_email: userEmail, // Use email from request
      metadata: {
        user_id: userId || '', // Store user ID if provided
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
