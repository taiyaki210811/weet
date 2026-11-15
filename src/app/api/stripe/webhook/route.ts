import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Webhook Signature Error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const email = session.customer_details?.email || session.customer_email;

      if (userId) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ is_pro: true })
          .eq("id", userId);
        if (error) throw error;
      } else if (email) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ is_pro: true })
          .eq("email", email);
        if (error) throw error;
      } else {
        throw new Error("No userId or email found in checkout session");
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ is_pro: false })
          .eq("id", userId);
        if (error) throw error;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook DB Update Error:", err);
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }
}