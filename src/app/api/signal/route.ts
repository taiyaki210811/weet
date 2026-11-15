import { NextResponse } from "next/server";

type Waiter = {
  userId: string;
  isPro: boolean;
  moodTag: string;
  joinedAt: number;
};

type Message = {
  from: string;
  type: string;
  data?: unknown;
};

type Room = {
  id: string;
  users: [string, string];
  messages: Record<string, Message[]>;
  createdAt: number;
};

const randomQueue: Waiter[] = [];
const privateRoomsWaiting = new Map<string, string>();
const userToRoom = new Map<string, string>();
const rooms = new Map<string, Room>();

// 通報用：userId -> 直近の相手userId（サーバー内部のみ保持・クライアントには絶対に返さない）
export const lastPartnerMap = new Map<string, string>();
// ブロック済みペア（"userA:userB"）
const blockedPairs = new Set<string>();

export function addBlockedPair(a: string, b: string) {
  blockedPairs.add(`${a}:${b}`);
  blockedPairs.add(`${b}:${a}`);
}

function isBlocked(a: string, b: string): boolean {
  return blockedPairs.has(`${a}:${b}`);
}

function createRoom(userA: string, userB: string): string {
  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  rooms.set(roomId, {
    id: roomId,
    users: [userA, userB],
    messages: {
      [userA]: [],
      [userB]: [],
    },
    createdAt: Date.now(),
  });
  userToRoom.set(userA, roomId);
  userToRoom.set(userB, roomId);
  lastPartnerMap.set(userA, userB);
  lastPartnerMap.set(userB, userA);
  return roomId;
}

function removeFromRandomQueue(userId: string) {
  const idx = randomQueue.findIndex((w) => w.userId === userId);
  if (idx !== -1) randomQueue.splice(idx, 1);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, roomId, type, data, reunionToken, privateCode, moodTag, isPro } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (action === "match") {
      const existingRoomId = userToRoom.get(userId);
      if (existingRoomId && rooms.has(existingRoomId)) {
        const room = rooms.get(existingRoomId)!;
        const isInitiator = room.users[0] === userId;
        return NextResponse.json({
          status: "matched",
          roomId: existingRoomId,
          isInitiator,
        });
      }

      const specialKey = privateCode ? `space:${privateCode}` : reunionToken ? `reunion:${reunionToken}` : null;
      if (specialKey) {
        const waitingUser = privateRoomsWaiting.get(specialKey);
        if (!waitingUser || waitingUser === userId) {
          privateRoomsWaiting.set(specialKey, userId);
          return NextResponse.json({ status: "waiting" });
        }
        privateRoomsWaiting.delete(specialKey);
        const newRoomId = createRoom(waitingUser, userId);
        return NextResponse.json({
          status: "matched",
          roomId: newRoomId,
          isInitiator: false,
        });
      }

      const myTag = isPro && moodTag ? moodTag : "any";
      removeFromRandomQueue(userId);

      const matchIndex = randomQueue.findIndex((candidate) => {
        if (candidate.userId === userId) return false;
        if (isBlocked(userId, candidate.userId)) return false;
        const tagMatch =
          myTag === "any" ||
          candidate.moodTag === "any" ||
          myTag === candidate.moodTag;
        return tagMatch;
      });

      if (matchIndex !== -1) {
        const partner = randomQueue.splice(matchIndex, 1)[0];
        const newRoomId = createRoom(partner.userId, userId);
        return NextResponse.json({
          status: "matched",
          roomId: newRoomId,
          isInitiator: false,
        });
      }

      const waiter: Waiter = {
        userId,
        isPro: Boolean(isPro),
        moodTag: myTag,
        joinedAt: Date.now(),
      };
      if (waiter.isPro) {
        randomQueue.unshift(waiter);
      } else {
        randomQueue.push(waiter);
      }

      return NextResponse.json({ status: "waiting" });
    }

    if (action === "send" && roomId) {
      const room = rooms.get(roomId);
      if (!room) {
        userToRoom.delete(userId);
        return NextResponse.json({ status: "closed" });
      }

      const partnerId = room.users.find((id) => id !== userId);
      if (partnerId && room.messages[partnerId]) {
        room.messages[partnerId].push({ from: userId, type, data });
      }

      if (type === "leave") {
        userToRoom.delete(userId);
        if (partnerId) userToRoom.delete(partnerId);
        rooms.delete(roomId);
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "poll" && roomId) {
      const room = rooms.get(roomId);
      if (!room) {
        userToRoom.delete(userId);
        return NextResponse.json({ status: "closed", messages: [] });
      }

      const msgs = room.messages[userId] || [];
      room.messages[userId] = [];
      return NextResponse.json({ status: "open", messages: msgs });
    }

    if (action === "cancel") {
      removeFromRandomQueue(userId);
      userToRoom.delete(userId);
      for (const [k, v] of privateRoomsWaiting.entries()) {
        if (v === userId) privateRoomsWaiting.delete(k);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("Signal API Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}