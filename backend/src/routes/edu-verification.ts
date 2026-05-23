import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db';
import crypto from 'crypto';

const app = new Hono();

// Rate limiting tracking (in-memory for simplicity)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_SENDS_PER_DAY = 5;
const COOLDOWN_MS = 60 * 1000; // 60 seconds between sends
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 8;

function hashCode(code: string, salt: string): string {
  return crypto.createHash('sha256').update(code + salt).digest('hex');
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check rate limits
function checkRateLimit(userId: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(userId);

  if (!existing || existing.resetAt < now) {
    // Reset daily limit
    rateLimitMap.set(userId, { count: 0, resetAt: now + 24 * 60 * 60 * 1000 });
    return { allowed: true };
  }

  if (existing.count >= MAX_SENDS_PER_DAY) {
    return { allowed: false, waitSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  return { allowed: true };
}

// ========================================
// POST /api/edu-verification/send
// Send verification code to .edu email
// ========================================

const sendCodeSchema = z.object({
  userId: z.string(),
  eduEmail: z.string().email(),
});

app.post('/send', zValidator('json', sendCodeSchema), async (c) => {
  const { userId, eduEmail } = c.req.valid('json');

  // Validate .edu domain
  if (!eduEmail.toLowerCase().endsWith('.edu')) {
    return c.json({ error: 'Email must be a .edu address' }, 400);
  }

  // Check rate limits
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return c.json({
      error: `Too many verification attempts. Please try again in ${Math.ceil(rateCheck.waitSeconds! / 3600)} hours.`
    }, 429);
  }

  // Check if user exists
  const profile = await db.profile.findUnique({ where: { id: userId } });
  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Check cooldown (last verification attempt)
  const existingVerification = await db.eduVerification.findUnique({
    where: { userId }
  });

  if (existingVerification) {
    const timeSinceCreated = Date.now() - existingVerification.createdAt.getTime();
    if (timeSinceCreated < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - timeSinceCreated) / 1000);
      return c.json({
        error: `Please wait ${waitSeconds} seconds before requesting another code.`
      }, 429);
    }
  }

  // Generate code and hash
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = hashCode(code, salt) + ':' + salt;
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  // Upsert verification record
  await db.eduVerification.upsert({
    where: { userId },
    update: {
      eduEmail,
      codeHash,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    },
    create: {
      userId,
      eduEmail,
      codeHash,
      expiresAt,
    },
  });

  // Update profile with pending edu email
  await db.profile.update({
    where: { id: userId },
    data: { eduEmail },
  });

  // Increment rate limit counter
  const limit = rateLimitMap.get(userId)!;
  limit.count += 1;

  // In production, send email via Resend or similar service
  // For development, we'll log the code
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    console.log(`[DEV] Verification code for ${eduEmail}: ${code}`);
    // Return code in dev mode for testing
    return c.json({
      success: true,
      message: 'Verification code sent',
      expiresAt: expiresAt.toISOString(),
      // Only in dev mode
      devCode: code,
    });
  }

  // In production, actually send the email
  // TODO: Integrate with email service (Resend, SendGrid, etc.)
  // For now, return success without the code
  return c.json({
    success: true,
    message: 'Verification code sent to your .edu email',
    expiresAt: expiresAt.toISOString(),
  });
});

// ========================================
// POST /api/edu-verification/confirm
// Verify the code
// ========================================

const confirmCodeSchema = z.object({
  userId: z.string(),
  code: z.string().length(6),
});

app.post('/confirm', zValidator('json', confirmCodeSchema), async (c) => {
  const { userId, code } = c.req.valid('json');

  // Find verification record
  const verification = await db.eduVerification.findUnique({
    where: { userId },
  });

  if (!verification) {
    return c.json({ error: 'No verification pending. Please request a new code.' }, 404);
  }

  // Check if expired
  if (verification.expiresAt < new Date()) {
    await db.eduVerification.delete({ where: { userId } });
    return c.json({ error: 'Code has expired. Please request a new code.' }, 400);
  }

  // Check max attempts
  if (verification.attempts >= MAX_ATTEMPTS) {
    await db.eduVerification.delete({ where: { userId } });
    return c.json({ error: 'Too many failed attempts. Please request a new code.' }, 400);
  }

  // Increment attempts
  await db.eduVerification.update({
    where: { userId },
    data: { attempts: { increment: 1 } },
  });

  // Verify code
  const parts = verification.codeHash.split(':');
  const storedHash = parts[0];
  const salt = parts[1] ?? '';
  const providedHash = hashCode(code, salt);

  if (providedHash !== storedHash) {
    const remaining = MAX_ATTEMPTS - verification.attempts - 1;
    return c.json({
      error: `Invalid code. ${remaining} attempts remaining.`,
      attemptsRemaining: remaining,
    }, 400);
  }

  // Success! Update profile
  await db.profile.update({
    where: { id: userId },
    data: {
      eduVerified: true,
      eduVerifiedAt: new Date(),
    },
  });

  // Delete verification record
  await db.eduVerification.delete({ where: { userId } });

  return c.json({
    success: true,
    message: 'Email verified successfully!',
    eduEmail: verification.eduEmail,
    verifiedAt: new Date().toISOString(),
  });
});

// ========================================
// GET /api/edu-verification/status/:userId
// Check verification status
// ========================================

app.get('/status/:userId', async (c) => {
  const userId = c.req.param('userId');

  if (!userId) {
    return c.json({ error: 'User ID required' }, 400);
  }

  const profile = await db.profile.findUnique({
    where: { id: userId },
    select: {
      eduEmail: true,
      eduVerified: true,
      eduVerifiedAt: true,
    },
  });

  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  const pendingVerification = await db.eduVerification.findUnique({
    where: { userId },
    select: {
      eduEmail: true,
      expiresAt: true,
      attempts: true,
    },
  });

  return c.json({
    eduEmail: profile.eduEmail,
    isVerified: profile.eduVerified,
    verifiedAt: profile.eduVerifiedAt?.toISOString() ?? null,
    pending: pendingVerification ? {
      email: pendingVerification.eduEmail,
      expiresAt: pendingVerification.expiresAt.toISOString(),
      attemptsRemaining: MAX_ATTEMPTS - pendingVerification.attempts,
    } : null,
  });
});

export default app;
