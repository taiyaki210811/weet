import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const lastPartnerMap = new Map<string, string>();
const blockedPairs = new Set<string>();

export function addBlockedPair(a: string, b: string) {
  blockedPairs.add(`${a}:${b}`);
  blockedPairs.add(`${b}:${a}`);
}

function isBlocked(a: string, b: string): boolean {
  return blockedPairs.has(`${a}:${b}`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, roomId, type, data, reunionToken, privateCode, moodTag, isPro } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // 2分以上放置された古い待機行を掃除
    const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("signal_rooms")
      .delete()
      .eq("status", "waiting")
      .lt("updated_at", staleThreshold);

    if (action === "match") {
      // 1. すでに自分がマッチング済みのルームにいるか確認
      const { data: existingRooms } = await supabaseAdmin
        .from("signal_rooms")
        .select("*")
        .eq("status", "matched")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingRooms && existingRooms.length > 0) {
        const room = existingRooms[0];
        const partnerId = room.user_a === userId ? room.user_b : room.user_a;
        if (partnerId) lastPartnerMap.set(userId, partnerId);
        return NextResponse.json({
          status: "matched",
          roomId: room.id,
          isInitiator: room.user_a === userId,
        });
      }

      const specialKey = privateCode
        ? `space:${privateCode}`
        : reunionToken
        ? `reunion:${reunionToken}`
        : null;

      // 2. プライベートルーム / 再会パス
      if (specialKey) {
        const { data: waitingSpecial } = await supabaseAdmin
          .from("signal_rooms")
          .select("*")
          .eq("status", "waiting")
          .eq("special_key", specialKey)
          .neq("user_a", userId)
          .order("created_at", { ascending: true })
          .limit(1);

        if (waitingSpecial && waitingSpecial.length > 0) {
          const target = waitingSpecial[0];
          const { data: updated } = await supabaseAdmin
            .from("signal_rooms")
            .update({
              user_b: userId,
              status: "matched",
              updated_at: new Date().toISOString(),
            })
            .eq("id", target.id)
            .eq("status", "waiting")
            .select()
            .single();

          if (updated) {
            lastPartnerMap.set(userId, updated.user_a);
            lastPartnerMap.set(updated.user_a, userId);
            return NextResponse.json({
              status: "matched",
              roomId: updated.id,
              isInitiator: false,
            });
          }
        }

        const { data: myWaiting } = await supabaseAdmin
          .from("signal_rooms")
          .select("*")
          .eq("status", "waiting")
          .eq("special_key", specialKey)
          .eq("user_a", userId)
          .limit(1);

        if (myWaiting && myWaiting.length > 0) {
          await supabaseAdmin
            .from("signal_rooms")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", myWaiting[0].id);
        } else {
          await supabaseAdmin
            .from("signal_rooms")
            .delete()
            .eq("status", "waiting")
            .eq("user_a", userId);

          const newId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await supabaseAdmin.from("signal_rooms").insert({
            id: newId,
            user_a: userId,
            special_key: specialKey,
            status: "waiting",
          });
        }

        return NextResponse.json({ status: "waiting" });
      }

      // 3. ランダムマッチング
      const myTag = isPro && moodTag ? moodTag : "any";

      const { data: candidates } = await supabaseAdmin
        .from("signal_rooms")
        .select("*")
        .eq("status", "waiting")
        .is("special_key", null)
        .neq("user_a", userId)
        .order("is_pro", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(20);

      const partnerRoom = (candidates || []).find((c) => {
        if (isBlocked(userId, c.user_a)) return false;
        return myTag === "any" || c.mood_tag === "any" || myTag === c.mood_tag;
      });

      if (partnerRoom) {
        const { data: updated } = await supabaseAdmin
          .from("signal_rooms")
          .update({
            user_b: userId,
            status: "matched",
            updated_at: new Date().toISOString(),
          })
          .eq("id", partnerRoom.id)
          .eq("status", "waiting")
          .select()
          .single();

        if (updated) {
          await supabaseAdmin
            .from("signal_rooms")
            .delete()
            .eq("status", "waiting")
            .eq("user_a", userId);

          lastPartnerMap.set(userId, updated.user_a);
          lastPartnerMap.set(updated.user_a, userId);
          return NextResponse.json({
            status: "matched",
            roomId: updated.id,
            isInitiator: false,
          });
        }
      }

      const { data: myRandomWaiting } = await supabaseAdmin
        .from("signal_rooms")
        .select("*")
        .eq("status", "waiting")
        .is("special_key", null)
        .eq("user_a", userId)
        .limit(1);

      if (myRandomWaiting && myRandomWaiting.length > 0) {
        await supabaseAdmin
          .from("signal_rooms")
          .update({
            mood_tag: myTag,
            is_pro: Boolean(isPro),
            updated_at: new Date().toISOString(),
          })
          .eq("id", myRandomWaiting[0].id);
      } else {
        await supabaseAdmin
          .from("signal_rooms")
          .delete()
          .eq("status", "waiting")
          .eq("user_a", userId);

        const newId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await supabaseAdmin.from("signal_rooms").insert({
          id: newId,
          user_a: userId,
          special_key: null,
          mood_tag: myTag,
          is_pro: Boolean(isPro),
          status: "waiting",
        });
      }

      return NextResponse.json({ status: "waiting" });
    }

    if (action === "send" && roomId) {
      const { data: room } = await supabaseAdmin
        .from("signal_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!room || room.status === "closed") {
        return NextResponse.json({ status: "closed" });
      }

      const partnerId = room.user_a === userId ? room.user_b : room.user_a;
      if (partnerId) {
        await supabaseAdmin.from("signal_messages").insert({
          room_id: roomId,
          to_user: partnerId,
          from_user: userId,
          type,
          data: data ?? null,
        });
      }

      if (type === "leave") {
        await supabaseAdmin
          .from("signal_rooms")
          .update({ status: "closed", updated_at: new Date().toISOString() })
          .eq("id", roomId);
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "poll" && roomId) {
      const { data: room } = await supabaseAdmin
        .from("signal_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!room || room.status === "closed") {
        return NextResponse.json({ status: "closed", messages: [] });
      }

      const { data: msgs } = await supabaseAdmin
        .from("signal_messages")
        .select("id, from_user, type, data")
        .eq("room_id", roomId)
        .eq("to_user", userId)
        .order("id", { ascending: true });

      if (msgs && msgs.length > 0) {
        const ids = msgs.map((m) => m.id);
        await supabaseAdmin.from("signal_messages").delete().in("id", ids);
      }

      const formatted = (msgs || []).map((m) => ({
        from: m.from_user,
        type: m.type,
        data: m.data,
      }));

      return NextResponse.json({ status: "open", messages: formatted });
    }

    if (action === "cancel") {
      await supabaseAdmin
        .from("signal_rooms")
        .delete()
        .eq("status", "waiting")
        .eq("user_a", userId);

      await supabaseAdmin
        .from("signal_rooms")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("status", "matched")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("Signal API Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}