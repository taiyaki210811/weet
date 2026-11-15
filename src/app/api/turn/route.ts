import { NextResponse } from "next/server";

export async function POST() {
  const tokenId = process.env.CLOUDFLARE_TURN_TOKEN_ID;
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

  if (!tokenId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare TURN credentials not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${tokenId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 86400 }),
      }
    );

    const data = await response.json();
    console.log("Cloudflare TURN raw response:", JSON.stringify(data));

    // Cloudflareのレスポンス形式（配列または単一オブジェクト）に対応
    const rawServers = Array.isArray(data.iceServers)
      ? data.iceServers
      : data.iceServers
      ? [data.iceServers]
      : [];

    // stun: を除外し、有効な turn: / turns: URLを持つサーバーだけを残す
    const turnOnlyServers = rawServers
      .map((server: RTCIceServer) => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        const filteredUrls = urls.filter(
          (u) => typeof u === "string" && (u.startsWith("turn:") || u.startsWith("turns:"))
        );
        return {
          ...server,
          urls: filteredUrls,
        };
      })
      .filter((server: { urls: string[] }) => server.urls.length > 0);

    return NextResponse.json({ iceServers: turnOnlyServers });
  } catch (err) {
    console.error("TURN fetch error:", err);
    return NextResponse.json({ error: "Failed to generate TURN credentials" }, { status: 500 });
  }
}