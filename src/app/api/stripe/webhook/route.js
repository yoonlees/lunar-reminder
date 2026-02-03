import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServiceSupabase, createOrUpdateSubscription } from '@/lib/supabase';

export async function POST(request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not set' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout completed:', session.id, session.customer_email);

        // Get user ID from customer email
        const supabaseAdmin = getServiceSupabase();
        const { data: userData, error: userError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', session.customer_email)
          .single();

        if (userError || !userData) {
          console.error('Could not find user for email:', session.customer_email, userError);
          break;
        }

        // Save subscription to database
        const subscriptionData = {
          userId: userData.id,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          stripePriceId: session.line_items?.data?.[0]?.price?.id || process.env.STRIPE_PRICE_ID,
          status: 'active',
          currentPeriodStart: session.subscription ? new Date(session.created * 1000).toISOString() : null,
          currentPeriodEnd: null, // Will be updated by subscription.updated event
          cancelAtPeriodEnd: false
        };

        const savedSubscription = await createOrUpdateSubscription(subscriptionData, supabaseAdmin);
        if (savedSubscription) {
          console.log('Subscription saved to database:', savedSubscription.id);
        } else {
          console.error('Failed to save subscription to database');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);

        // Get user ID from customer
        const supabaseAdmin = getServiceSupabase();
        const { data: subData, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (subError || !subData) {
          console.error('Could not find subscription for customer:', subscription.customer, subError);
          break;
        }

        // Update subscription in database
        const subscriptionData = {
          userId: subData.user_id,
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price?.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        };

        const updatedSubscription = await createOrUpdateSubscription(subscriptionData, supabaseAdmin);
        if (updatedSubscription) {
          console.log('Subscription updated in database:', updatedSubscription.id);
        } else {
          console.error('Failed to update subscription in database');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);

        // Get user ID from customer
        const supabaseAdmin = getServiceSupabase();
        const { data: subData, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (subError || !subData) {
          console.error('Could not find subscription for customer:', subscription.customer, subError);
          break;
        }

        // Mark subscription as canceled in database
        const subscriptionData = {
          userId: subData.user_id,
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price?.id,
          status: 'canceled',
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: false
        };

        const canceledSubscription = await createOrUpdateSubscription(subscriptionData, supabaseAdmin);
        if (canceledSubscription) {
          console.log('Subscription marked as canceled in database:', canceledSubscription.id);
        } else {
          console.error('Failed to mark subscription as canceled in database');
        }
        break;
      }

      default:
        console.log('Unhandled Stripe event:', event.type);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
