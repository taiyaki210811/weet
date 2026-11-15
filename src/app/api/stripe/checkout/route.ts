import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();
    if (!userId || !email) {
      return NextResponse.json({ error: "ユーザー情報が不足しています" }, { status: 400 });
    }

    const priceId =
      process.env.STRIPE_PRO_PRICE_ID ||
      process.env.STRIPE_PRICE_ID ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: ".env.local に Stripe の料金ID（price_...）が設定されていません" },
        { status: 500 }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe Checkout Error:", err);
    const msg = err instanceof Error ? err.message : "決済セッションの作成に失敗しました";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}