import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

const app = new Hono();

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'profile-media');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ========================================
// POST /api/profile-media/upload-avatar
// Upload avatar image
// ========================================

app.post('/upload-avatar', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return c.json({ error: 'File and userId are required' }, 400);
    }

    // Validate user exists
    const profile = await db.profile.findUnique({ where: { id: userId } });
    if (!profile) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'File too large. Maximum size: 5MB' }, 400);
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `avatar-${userId}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const storagePath = `uploads/profile-media/${filename}`;

    // Delete old avatar if exists
    if (profile.avatarUrl && profile.avatarUrl.startsWith('uploads/')) {
      const oldPath = path.join(process.cwd(), profile.avatarUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    // Update profile
    const updatedProfile = await db.profile.update({
      where: { id: userId },
      data: { avatarUrl: storagePath },
      include: {
        college: true,
        interests: { include: { interest: true } },
        groupMemberships: { include: { group: true } },
      },
    });

    return c.json({
      success: true,
      avatarUrl: storagePath,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

// ========================================
// POST /api/profile-media/upload-header
// Upload header/banner image
// ========================================

app.post('/upload-header', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return c.json({ error: 'File and userId are required' }, 400);
    }

    // Validate user exists
    const profile = await db.profile.findUnique({ where: { id: userId } });
    if (!profile) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'File too large. Maximum size: 5MB' }, 400);
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `header-${userId}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const storagePath = `uploads/profile-media/${filename}`;

    // Delete old header if exists
    if (profile.headerUrl && profile.headerUrl.startsWith('uploads/')) {
      const oldPath = path.join(process.cwd(), profile.headerUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    // Update profile
    const updatedProfile = await db.profile.update({
      where: { id: userId },
      data: { headerUrl: storagePath },
      include: {
        college: true,
        interests: { include: { interest: true } },
        groupMemberships: { include: { group: true } },
      },
    });

    return c.json({
      success: true,
      headerUrl: storagePath,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Header upload error:', error);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

// ========================================
// DELETE /api/profile-media/avatar/:userId
// Remove avatar
// ========================================

app.delete('/avatar/:userId', async (c) => {
  const userId = c.req.param('userId');

  if (!userId) {
    return c.json({ error: 'User ID required' }, 400);
  }

  const profile = await db.profile.findUnique({ where: { id: userId } });
  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Delete file if exists
  if (profile.avatarUrl && profile.avatarUrl.startsWith('uploads/')) {
    const filepath = path.join(process.cwd(), profile.avatarUrl);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  // Update profile
  await db.profile.update({
    where: { id: userId },
    data: { avatarUrl: null },
  });

  return c.json({ success: true });
});

// ========================================
// DELETE /api/profile-media/header/:userId
// Remove header
// ========================================

app.delete('/header/:userId', async (c) => {
  const userId = c.req.param('userId');

  if (!userId) {
    return c.json({ error: 'User ID required' }, 400);
  }

  const profile = await db.profile.findUnique({ where: { id: userId } });
  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Delete file if exists
  if (profile.headerUrl && profile.headerUrl.startsWith('uploads/')) {
    const filepath = path.join(process.cwd(), profile.headerUrl);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  // Update profile
  await db.profile.update({
    where: { id: userId },
    data: { headerUrl: null },
  });

  return c.json({ success: true });
});

// ========================================
// GET /api/profile-media/file/:filename
// Serve media files
// ========================================

app.get('/file/:filename', async (c) => {
  const filename = c.req.param('filename');

  if (!filename) {
    return c.json({ error: 'Filename required' }, 400);
  }

  const filepath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return c.json({ error: 'File not found' }, 404);
  }

  const buffer = fs.readFileSync(filepath);
  const ext = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };

  const contentType = mimeTypes[ext ?? ''] || 'application/octet-stream';

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

export default app;
