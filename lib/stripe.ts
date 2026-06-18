import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
  apiVersion: "2026-04-22.dahlia",
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
