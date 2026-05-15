import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ subscription_status: "premium" })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted":
    case "customer.subscription.paused": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(sub.customer as string);
      if (!customer.deleted) {
        const userId = customer.metadata?.supabase_user_id;
        if (userId) {
          await supabase
            .from("profiles")
            .update({ subscription_status: "free" })
            .eq("id", userId);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(sub.customer as string);
      if (!customer.deleted) {
        const userId = customer.metadata?.supabase_user_id;
        if (userId) {
          const status = sub.status === "active" ? "premium" : "free";
          await supabase
            .from("profiles")
            .update({ subscription_status: status })
            .eq("id", userId);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
