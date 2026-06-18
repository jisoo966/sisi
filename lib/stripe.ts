import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return _stripe;
}

// Keep stripe export for backward compat — lazily initialized
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as never)[prop as keyof Stripe];
  },
});

export const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_PRICE_ID_MONTHLY!,
    amount: 999,
    label: "monthly",
    billingPeriod: "/ month",
  },
  annual: {
    priceId: process.env.STRIPE_PRICE_ID_ANNUAL!,
    amount: 7999,
    label: "annual",
    billingPeriod: "/ year",
  },
} as const;
