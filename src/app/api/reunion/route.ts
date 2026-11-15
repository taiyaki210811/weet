import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SEVEN_DAYS_SEC = 60 * 60 * 24 * 7; // 7日間有効

export async function POST(req: NextRequest) {
  try {
    const { action, token } = await req.json();

    // ① 双方合意時に7日間有効な再会パスを発行
    if (action === "create") {
      const randomPart = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const newToken = `pass_${randomPart}`;
      const key = `reunion_pass:${newToken}`;

      await redis.set(key, { createdAt: Date.now(), status: "valid" }, { ex: SEVEN_DAYS_SEC });

      return NextResponse.json({ token: newToken });
    }

    // ② URLからアクセスされた時にパスが有効かチェック
    if (action === "verify") {
      if (!token || typeof token !== "string") {
        return NextResponse.json({ valid: false }, { status: 400 });
      }
      const key = `reunion_pass:${token}`;
      const data = await redis.get(key);

      if (!data) {
        return NextResponse.json({ valid: false });
      }

      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Reunion API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}