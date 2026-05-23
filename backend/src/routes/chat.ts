import { Hono } from "hono";
import { db } from "../db";

export const chatRouter = new Hono();

// GET /api/chat/rooms?userId=X
// Returns all chat rooms the user has access to:
// 1. Group rooms: one per group the user is a member of
// 2. Mixer rooms: one per mixer where user's group is involved AND user is social_chair or admin
// Auto-creates rooms that don't exist yet.
chatRouter.get("/rooms", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId required" }, 400);

  // Get user's group memberships
  const memberships = await db.groupMember.findMany({
    where: { userId },
    include: { group: true },
  });

  const rooms: Array<{
    id: string;
    type: "group" | "mixer" | "openMixer";
    name: string;
    coverImageUrl?: string | null;
    lastMessageAt?: string | null;
    lastMessage?: { text: string; senderName: string } | null;
    unreadCount: number;
    mixerId?: string;
    groupId?: string;
    openMixerId?: string;
    otherGroupName?: string;
  }> = [];

  // 1. Group chat rooms — one per group membership
  for (const membership of memberships) {
    const group = membership.group;

    // Find or create the group chat room
    let room = await db.chatRoom.findFirst({
      where: { type: "group", groupId: group.id },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
    });

    if (!room) {
      room = await db.chatRoom.create({
        data: {
          type: "group",
          groupId: group.id,
          name: group.name,
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
      });
    }

    const lastMsg = room.messages[0] ?? null;
    rooms.push({
      id: room.id,
      type: "group",
      name: group.name,
      coverImageUrl: group.coverImageUrl,
      groupId: group.id,
      lastMessageAt: room.lastMessageAt?.toISOString() ?? null,
      lastMessage: lastMsg
        ? { text: lastMsg.text, senderName: lastMsg.sender.name }
        : null,
      unreadCount: 0,
    });
  }

  // 2. Mixer chat rooms — only for social chairs/admins
  const socialChairGroupIds = memberships
    .filter((m) => m.role === "social_chair" || m.role === "admin")
    .map((m) => m.groupId);

  if (socialChairGroupIds.length > 0) {
    // Find mixers where user is a social chair of one of the groups
    const mixers = await db.mixer.findMany({
      where: {
        status: { in: ["upcoming", "locked", "live"] },
        OR: [
          { groupAId: { in: socialChairGroupIds } },
          { groupBId: { in: socialChairGroupIds } },
        ],
      },
      include: {
        groupA: { select: { id: true, name: true, coverImageUrl: true } },
        groupB: { select: { id: true, name: true, coverImageUrl: true } },
      },
    });

    for (const mixer of mixers) {
      // Determine the other group
      const isGroupA = socialChairGroupIds.includes(mixer.groupAId);
      const myGroup = isGroupA ? mixer.groupA : mixer.groupB;
      const otherGroup = isGroupA ? mixer.groupB : mixer.groupA;

      // Find or create the mixer chat room
      let room = await db.chatRoom.findFirst({
        where: { type: "mixer", mixerId: mixer.id },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
      });

      if (!room) {
        room = await db.chatRoom.create({
          data: {
            type: "mixer",
            mixerId: mixer.id,
            name: `${myGroup.name} x ${otherGroup.name}`,
          },
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { sender: { select: { id: true, name: true } } },
            },
          },
        });
      }

      const lastMsg = room.messages[0] ?? null;
      rooms.push({
        id: room.id,
        type: "mixer",
        name: `${myGroup.name} x ${otherGroup.name}`,
        coverImageUrl: otherGroup.coverImageUrl,
        mixerId: mixer.id,
        lastMessageAt: room.lastMessageAt?.toISOString() ?? null,
        lastMessage: lastMsg
          ? { text: lastMsg.text, senderName: lastMsg.sender.name }
          : null,
        unreadCount: 0,
        otherGroupName: otherGroup.name,
      });
    }
  }

  // Sort by lastMessageAt desc, then by createdAt of room
  // 3. Open mixer chat rooms — for mixers the user is in
  const openMixerParticipations = await db.openMixerParticipant.findMany({
    where: { userId },
    include: {
      openMixer: {
        include: {
          _count: { select: { participants: true } },
        },
      },
    },
  });

  // Also include mixers user is hosting
  const hostedOpenMixers = await db.openMixer.findMany({
    where: {
      hostId: userId,
      status: { in: ["open", "full", "live"] },
    },
  });

  const openMixerIds = new Set([
    ...openMixerParticipations.map((p) => p.openMixerId),
    ...hostedOpenMixers.map((m) => m.id),
  ]);

  for (const omId of openMixerIds) {
    const mixer = openMixerParticipations.find((p) => p.openMixerId === omId)?.openMixer
      ?? hostedOpenMixers.find((m) => m.id === omId);
    if (!mixer) continue;

    let omRoom = await db.chatRoom.findFirst({
      where: { type: "openMixer", openMixerId: omId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
    });

    if (!omRoom) {
      omRoom = await db.chatRoom.create({
        data: {
          type: "openMixer",
          openMixerId: omId,
          name: mixer.title,
          isOpen: mixer.status !== "completed" && mixer.status !== "cancelled",
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
      });
    }

    const lastMsg = omRoom.messages[0] ?? null;
    rooms.push({
      id: omRoom.id,
      type: "openMixer" as const,
      name: mixer.title,
      openMixerId: omId,
      lastMessageAt: omRoom.lastMessageAt?.toISOString() ?? null,
      lastMessage: lastMsg
        ? { text: lastMsg.text, senderName: lastMsg.sender.name }
        : null,
      unreadCount: 0,
    });
  }

  rooms.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return c.json({ rooms });
});

// GET /api/chat/rooms/:roomId/messages?userId=X&limit=50&before=cursorId
chatRouter.get("/rooms/:roomId/messages", async (c) => {
  const roomId = c.req.param("roomId");
  const userId = c.req.query("userId");
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const before = c.req.query("before"); // cursor: message id

  if (!userId) return c.json({ error: "userId required" }, 400);

  // Verify user has access to this room
  const room = await db.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) return c.json({ error: "Room not found" }, 404);

  // Access check: group room -> must be a member; mixer room -> must be social chair of one of the groups
  if (room.type === "group" && room.groupId) {
    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: room.groupId, userId } },
    });
    if (!membership) return c.json({ error: "Forbidden" }, 403);
  } else if (room.type === "mixer" && room.mixerId) {
    const mixer = await db.mixer.findUnique({ where: { id: room.mixerId } });
    if (!mixer) return c.json({ error: "Mixer not found" }, 404);
    const membership = await db.groupMember.findFirst({
      where: {
        userId,
        groupId: { in: [mixer.groupAId, mixer.groupBId] },
        role: { in: ["social_chair", "admin"] },
      },
    });
    if (!membership) return c.json({ error: "Forbidden" }, 403);
  } else if (room.type === "openMixer" && room.openMixerId) {
    const mixer = await db.openMixer.findUnique({
      where: { id: room.openMixerId },
      include: { participants: { where: { userId } } },
    });
    if (!mixer) return c.json({ error: "Mixer not found" }, 404);
    const isHost = mixer.hostId === userId;
    const isParticipant = mixer.participants.length > 0;
    if (!isHost && !isParticipant) return c.json({ error: "Forbidden" }, 403);
    if (!room.isOpen) return c.json({ error: "This chat has been closed" }, 403);
  }

  const messages = await db.chatMessage.findMany({
    where: {
      roomId,
      ...(before ? { id: { lt: before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  // Fetch change request details for any system messages
  const changeRequestIds = messages
    .filter((m) => m.messageType === "change_request" && m.changeRequestId)
    .map((m) => m.changeRequestId as string);

  const changeRequests = changeRequestIds.length > 0
    ? await db.mixerChangeRequest.findMany({
        where: { id: { in: changeRequestIds } },
        include: { mixer: { include: { groupA: true, groupB: true } } },
      })
    : [];

  const crById = Object.fromEntries(changeRequests.map((cr) => [cr.id, cr]));

  const enriched = messages.reverse().map((m) => ({
    ...m,
    changeRequest: m.changeRequestId ? (crById[m.changeRequestId] ?? null) : null,
  }));

  return c.json({ messages: enriched, hasMore: messages.length === limit });
});

// POST /api/chat/rooms/:roomId/messages
chatRouter.post("/rooms/:roomId/messages", async (c) => {
  const roomId = c.req.param("roomId");
  const body = await c.req.json<{ senderId: string; text: string }>();
  const { senderId, text } = body;

  if (!senderId || !text?.trim()) return c.json({ error: "senderId and text required" }, 400);

  // Verify room exists
  const room = await db.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) return c.json({ error: "Room not found" }, 404);

  // Access check
  if (room.type === "group" && room.groupId) {
    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: room.groupId, userId: senderId } },
    });
    if (!membership) return c.json({ error: "Forbidden" }, 403);
  } else if (room.type === "mixer" && room.mixerId) {
    const mixer = await db.mixer.findUnique({ where: { id: room.mixerId } });
    if (!mixer) return c.json({ error: "Mixer not found" }, 404);
    const membership = await db.groupMember.findFirst({
      where: {
        userId: senderId,
        groupId: { in: [mixer.groupAId, mixer.groupBId] },
        role: { in: ["social_chair", "admin"] },
      },
    });
    if (!membership) return c.json({ error: "Forbidden" }, 403);
  } else if (room.type === "openMixer" && room.openMixerId) {
    const mixer = await db.openMixer.findUnique({
      where: { id: room.openMixerId },
      include: { participants: { where: { userId: senderId } } },
    });
    if (!mixer) return c.json({ error: "Mixer not found" }, 404);
    const isHost = mixer.hostId === senderId;
    const isParticipant = mixer.participants.length > 0;
    if (!isHost && !isParticipant) return c.json({ error: "Forbidden" }, 403);
    if (!room.isOpen) return c.json({ error: "This chat has been closed" }, 403);
  }

  const message = await db.chatMessage.create({
    data: {
      roomId,
      senderId,
      text: text.trim(),
    },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  // Update lastMessageAt on room
  await db.chatRoom.update({
    where: { id: roomId },
    data: { lastMessageAt: message.createdAt },
  });

  return c.json({ message }, 201);
});

// GET /api/chat/open-mixer-room?openMixerId=X&userId=Y
// Returns (or creates) the chat room for an open mixer. Only participants/host can access.
chatRouter.get("/open-mixer-room", async (c) => {
  const openMixerId = c.req.query("openMixerId");
  const userId = c.req.query("userId");
  if (!openMixerId || !userId) return c.json({ error: "openMixerId and userId required" }, 400);

  // Verify user is host or participant
  const mixer = await db.openMixer.findUnique({
    where: { id: openMixerId },
    include: { participants: { where: { userId } } },
  });
  if (!mixer) return c.json({ error: "Mixer not found" }, 404);

  const isHost = mixer.hostId === userId;
  const isParticipant = mixer.participants.length > 0;
  if (!isHost && !isParticipant) return c.json({ error: "Forbidden" }, 403);

  // Find or create the room
  let room = await db.chatRoom.findFirst({
    where: { type: "openMixer", openMixerId },
  });

  if (!room) {
    room = await db.chatRoom.create({
      data: {
        type: "openMixer",
        openMixerId,
        name: mixer.title,
        isOpen: mixer.status !== "completed" && mixer.status !== "cancelled",
      },
    });
  }

  return c.json({ room: { id: room.id, name: room.name, isOpen: room.isOpen } });
});

// POST /api/chat/open-mixer-room/:openMixerId/close
chatRouter.post("/open-mixer-room/:openMixerId/close", async (c) => {
  const openMixerId = c.req.param("openMixerId");
  await db.chatRoom.updateMany({
    where: { type: "openMixer", openMixerId },
    data: { isOpen: false },
  });
  return c.json({ success: true });
});
