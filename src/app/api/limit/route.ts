import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DAILY_LIMIT = 100;

function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  try {
    const { action, deviceHash } = await req.json();

    if (!deviceHash || typeof deviceHash !== "string" || deviceHash.length < 16) {
      return NextResponse.json({ error: "Invalid device hash" }, { status: 400 });
    }

    const today = getTodayJST();
    const key = `call_limit:${today}:${deviceHash}`;

    if (action === "check") {
      const currentCount = (await redis.get<number>(key)) || 0;
      return NextResponse.json({
        count: currentCount,
        remaining: Math.max(0, DAILY_LIMIT - currentCount),
        limit: DAILY_LIMIT,
      });
    }

    if (action === "consume") {
      const currentCount = (await redis.get<number>(key)) || 0;

      if (currentCount >= DAILY_LIMIT) {
        return NextResponse.json(
          { allowed: false, count: currentCount, remaining: 0, limit: DAILY_LIMIT },
          { status: 429 }
        );
      }

      const newCount = await redis.incr(key);
      if (newCount === 1) {
        await redis.expire(key, 90000);
      }

      return NextResponse.json({
        allowed: true,
        count: newCount,
        remaining: Math.max(0, DAILY_LIMIT - newCount),
        limit: DAILY_LIMIT,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Limit API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}