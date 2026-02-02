import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set; Stripe API will not work.');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' })
  : null;

export function getStripePriceId() {
  return process.env.STRIPE_PRICE_ID || null;
}
