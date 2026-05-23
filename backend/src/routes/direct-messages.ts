import { Hono } from "hono";
import { db } from "../db";

export const directMessagesRouter = new Hono();

// GET /api/dm/conversations?userId=X
// Returns all direct conversations for a user, separated by status
directMessagesRouter.get("/conversations", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId required" }, 400);

  // Get all conversations where user is either userA or userB
  const conversations = await db.directConversation.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: {
        select: { id: true, name: true, avatarUrl: true },
      },
      userB: {
        select: { id: true, name: true, avatarUrl: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
  });

  // Separate into requests and accepted conversations
  const accepted: typeof conversations = [];
  const pendingReceived: typeof conversations = []; // requests to this user
  const pendingSent: typeof conversations = []; // requests from this user

  for (const conv of conversations) {
    if (conv.status === "accepted") {
      accepted.push(conv);
    } else if (conv.status === "pending") {
      // userB is the recipient of the request
      if (conv.userBId === userId) {
        pendingReceived.push(conv);
      } else {
        pendingSent.push(conv);
      }
    }
  }

  // Format conversations
  const formatConversation = (conv: (typeof conversations)[0]) => {
    const otherUser = conv.userAId === userId ? conv.userB : conv.userA;
    const lastMsg = conv.messages[0];
    return {
      id: conv.id,
      status: conv.status,
      otherUser,
      lastMessage: lastMsg
        ? { text: lastMsg.text, senderName: lastMsg.sender.name, createdAt: lastMsg.createdAt.toISOString() }
        : null,
      lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
      createdAt: conv.createdAt.toISOString(),
    };
  };

  return c.json({
    accepted: accepted.map(formatConversation),
    pendingReceived: pendingReceived.map(formatConversation),
    pendingSent: pendingSent.map(formatConversation),
  });
});

// POST /api/dm/request
// Send a message request to another user (or find existing conversation)
directMessagesRouter.post("/request", async (c) => {
  const body = await c.req.json<{ senderId: string; recipientId: string; message?: string }>();
  const { senderId, recipientId, message } = body;

  if (!senderId || !recipientId) {
    return c.json({ error: "senderId and recipientId required" }, 400);
  }

  if (senderId === recipientId) {
    return c.json({ error: "Cannot message yourself" }, 400);
  }

  // Check if recipient exists
  const recipient = await db.profile.findUnique({ where: { id: recipientId } });
  if (!recipient) {
    return c.json({ error: "User not found" }, 404);
  }

  // Check if blocked
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: recipientId },
        { blockerId: recipientId, blockedId: senderId },
      ],
    },
  });
  if (block) {
    return c.json({ error: "Cannot message this user" }, 403);
  }

  // Check for existing conversation (in either direction)
  let conversation = await db.directConversation.findFirst({
    where: {
      OR: [
        { userAId: senderId, userBId: recipientId },
        { userAId: recipientId, userBId: senderId },
      ],
    },
  });

  if (conversation) {
    // If it was declined, allow re-requesting
    if (conversation.status === "declined") {
      conversation = await db.directConversation.update({
        where: { id: conversation.id },
        data: {
          status: "pending",
          userAId: senderId,
          userBId: recipientId,
          updatedAt: new Date(),
        },
      });
    }
    // If already pending or accepted, just return it
  } else {
    // Create new conversation
    conversation = await db.directConversation.create({
      data: {
        userAId: senderId,
        userBId: recipientId,
        status: "pending",
      },
    });
  }

  // If there's an initial message, create it
  if (message?.trim()) {
    const msg = await db.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId,
        text: message.trim(),
      },
    });
    await db.directConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: msg.createdAt },
    });
  }

  // Create notification for recipient
  await db.notification.create({
    data: {
      userId: recipientId,
      type: "message_request",
      title: "New message request",
      body: `${(await db.profile.findUnique({ where: { id: senderId } }))?.name ?? "Someone"} wants to message you`,
      data: JSON.stringify({ conversationId: conversation.id, senderId }),
    },
  });

  return c.json({ conversation }, 201);
});

// POST /api/dm/conversations/:id/accept
directMessagesRouter.post("/conversations/:id/accept", async (c) => {
  const conversationId = c.req.param("id");
  const body = await c.req.json<{ userId: string }>();
  const { userId } = body;

  if (!userId) return c.json({ error: "userId required" }, 400);

  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) return c.json({ error: "Conversation not found" }, 404);

  // Only the recipient (userB) can accept
  if (conversation.userBId !== userId) {
    return c.json({ error: "Not authorized to accept this request" }, 403);
  }

  if (conversation.status !== "pending") {
    return c.json({ error: "Request is no longer pending" }, 400);
  }

  const updated = await db.directConversation.update({
    where: { id: conversationId },
    data: { status: "accepted" },
  });

  // Notify the sender
  await db.notification.create({
    data: {
      userId: conversation.userAId,
      type: "message_request_accepted",
      title: "Message request accepted",
      body: `Your message request was accepted!`,
      data: JSON.stringify({ conversationId: conversation.id }),
    },
  });

  return c.json({ conversation: updated });
});

// POST /api/dm/conversations/:id/decline
directMessagesRouter.post("/conversations/:id/decline", async (c) => {
  const conversationId = c.req.param("id");
  const body = await c.req.json<{ userId: string }>();
  const { userId } = body;

  if (!userId) return c.json({ error: "userId required" }, 400);

  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) return c.json({ error: "Conversation not found" }, 404);

  // Only the recipient (userB) can decline
  if (conversation.userBId !== userId) {
    return c.json({ error: "Not authorized to decline this request" }, 403);
  }

  if (conversation.status !== "pending") {
    return c.json({ error: "Request is no longer pending" }, 400);
  }

  const updated = await db.directConversation.update({
    where: { id: conversationId },
    data: { status: "declined" },
  });

  return c.json({ conversation: updated });
});

// GET /api/dm/conversations/:id/messages
directMessagesRouter.get("/conversations/:id/messages", async (c) => {
  const conversationId = c.req.param("id");
  const userId = c.req.query("userId");
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const before = c.req.query("before"); // cursor: message id

  if (!userId) return c.json({ error: "userId required" }, 400);

  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) return c.json({ error: "Conversation not found" }, 404);

  // Verify user is part of this conversation
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // For pending requests, only allow if it's the sender or recipient
  // Recipient can read the initial message before accepting

  const messages = await db.directMessage.findMany({
    where: {
      conversationId,
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

  return c.json({
    messages: messages.reverse(),
    hasMore: messages.length === limit,
    status: conversation.status,
  });
});

// POST /api/dm/conversations/:id/messages
directMessagesRouter.post("/conversations/:id/messages", async (c) => {
  const conversationId = c.req.param("id");
  const body = await c.req.json<{ senderId: string; text: string }>();
  const { senderId, text } = body;

  if (!senderId || !text?.trim()) {
    return c.json({ error: "senderId and text required" }, 400);
  }

  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) return c.json({ error: "Conversation not found" }, 404);

  // Verify user is part of this conversation
  if (conversation.userAId !== senderId && conversation.userBId !== senderId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Only allow sending if accepted, OR if sender is userA (initial request message)
  if (conversation.status !== "accepted" && conversation.userAId !== senderId) {
    return c.json({ error: "Cannot send messages until request is accepted" }, 403);
  }

  // Check block status
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: conversation.userAId, blockedId: conversation.userBId },
        { blockerId: conversation.userBId, blockedId: conversation.userAId },
      ],
    },
  });
  if (block) {
    return c.json({ error: "Cannot message this user" }, 403);
  }

  const message = await db.directMessage.create({
    data: {
      conversationId,
      senderId,
      text: text.trim(),
    },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  // Update lastMessageAt
  await db.directConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt },
  });

  return c.json({ message }, 201);
});

// GET /api/dm/conversation-with?userId=X&otherUserId=Y
// Check if a conversation exists between two users
directMessagesRouter.get("/conversation-with", async (c) => {
  const userId = c.req.query("userId");
  const otherUserId = c.req.query("otherUserId");

  if (!userId || !otherUserId) {
    return c.json({ error: "userId and otherUserId required" }, 400);
  }

  const conversation = await db.directConversation.findFirst({
    where: {
      OR: [
        { userAId: userId, userBId: otherUserId },
        { userAId: otherUserId, userBId: userId },
      ],
    },
  });

  return c.json({ conversation });
});

// GET /api/dm/pending-count?userId=X
// Get count of pending message requests for a user
directMessagesRouter.get("/pending-count", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId required" }, 400);

  const count = await db.directConversation.count({
    where: {
      userBId: userId,
      status: "pending",
    },
  });

  return c.json({ count });
});
