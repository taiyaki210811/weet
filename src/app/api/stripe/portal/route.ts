import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "メールアドレスが見つかりません" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // メールアドレスからStripeの顧客データを検索
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: "Stripeの決済履歴が見つかりません（テスト切替でPROにした場合は対象外です）" },
        { status: 404 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: origin,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: unknown) {
    console.error("Stripe Portal Error:", err);
    const msg = err instanceof Error ? err.message : "管理画面の起動に失敗しました";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}