const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const crypto = require('crypto');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');

// Registration schema
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(150),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100)
});

// Login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    secret,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists' });
    }

    const id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name.trim(), normalizedEmail, passwordHash, now);

    const user = { id, name: name.trim(), email: normalizedEmail };
    const token = generateToken(user);

    res.status(201).json({
      message: 'Account registered successfully',
      user,
      token
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userData = { id: user.id, name: user.name, email: user.email };
    const token = generateToken(userData);

    res.json({
      message: 'Authentication successful',
      user: userData,
      token
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, name, email, role, specialty, location, institution, career_stage,
             preferred_specialties, default_mode, history_retention, theme, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const {
      name,
      role,
      specialty,
      location,
      institution,
      career_stage,
      preferred_specialties,
      default_mode,
      history_retention,
      theme
    } = req.body;

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          role = COALESCE(?, role),
          specialty = COALESCE(?, specialty),
          location = COALESCE(?, location),
          institution = COALESCE(?, institution),
          career_stage = COALESCE(?, career_stage),
          preferred_specialties = COALESCE(?, preferred_specialties),
          default_mode = COALESCE(?, default_mode),
          history_retention = COALESCE(?, history_retention),
          theme = COALESCE(?, theme)
      WHERE id = ?
    `).run(
      name,
      role,
      specialty,
      location,
      institution,
      career_stage,
      preferred_specialties,
      default_mode,
      history_retention,
      theme,
      req.user.id
    );

    const updated = db.prepare(`
      SELECT id, name, email, role, specialty, location, institution, career_stage,
             preferred_specialties, default_mode, history_retention, theme, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/account (for Settings page account deletion)
router.delete('/account', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM queries WHERE user_id = ?').run(req.user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    res.json({ message: 'Account and associated records deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/google (Sign in / Sign up with Google)
router.post('/google', authRateLimiter, async (req, res, next) => {
  try {
    const { email, name, googleId, picture } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = db.prepare('SELECT id, name, email, google_id FROM users WHERE email = ?').get(normalizedEmail);

    if (user) {
      // User exists - update google_id if not linked
      if (!user.google_id && googleId) {
        db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, user.id);
      }
    } else {
      // New user registering with Google
      const id = 'usr_' + crypto.randomBytes(8).toString('hex');
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const now = new Date().toISOString();
      const displayName = name && name.trim().length > 0 ? name.trim() : 'Dr. ' + normalizedEmail.split('@')[0];

      db.prepare(`
        INSERT INTO users (
          id, name, email, password_hash, created_at, role, specialty,
          location, institution, career_stage, preferred_specialties,
          default_mode, history_retention, theme, google_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        displayName,
        normalizedEmail,
        passwordHash,
        now,
        'doctor',
        'Internal Medicine',
        'Boston, MA',
        'Clinical Health Network',
        'Attending Physician',
        'Cardiology, Nephrology, Oncology',
        'doctor',
        'forever',
        'light',
        googleId || ('goog_' + crypto.randomBytes(8).toString('hex'))
      );

      user = { id, name: displayName, email: normalizedEmail };
    }

    const userData = { id: user.id, name: user.name, email: user.email };
    const token = generateToken(userData);

    res.json({
      message: 'Google authentication successful',
      user: userData,
      token
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password (Request reset code)
router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      // Return safe success message to prevent user enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, a reset code has been sent.'
      });
    }

    // Generate 6-digit code and secure token
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(24).toString('hex');
    const resetId = 'rst_' + crypto.randomBytes(8).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    db.prepare(`
      INSERT INTO password_resets (id, email, token, code, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(resetId, normalizedEmail, token, code, expiresAt, now.toISOString());

    console.log(`[Auth] Password reset code generated for ${normalizedEmail}: ${code}`);

    res.json({
      success: true,
      message: `Password reset code sent to ${normalizedEmail}`,
      token,
      previewCode: code // Exposed for fast clinical demo verification
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password (Verify code and set new password)
router.post('/reset-password', authRateLimiter, async (req, res, next) => {
  try {
    const { email, code, token, newPassword } = req.body;

    if (!email || (!code && !token)) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date().toISOString();

    let resetRecord;
    if (code) {
      resetRecord = db.prepare(`
        SELECT id, email, expires_at FROM password_resets
        WHERE email = ? AND code = ? AND used = 0 AND expires_at > ?
        ORDER BY created_at DESC LIMIT 1
      `).get(normalizedEmail, String(code).trim(), now);
    } else if (token) {
      resetRecord = db.prepare(`
        SELECT id, email, expires_at FROM password_resets
        WHERE email = ? AND token = ? AND used = 0 AND expires_at > ?
        ORDER BY created_at DESC LIMIT 1
      `).get(normalizedEmail, token, now);
    }

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset code. Please request a new one.' });
    }

    // Hash new password and update user
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(newPasswordHash, normalizedEmail);

    // Mark reset code as used
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

    console.log(`[Auth] Password updated successfully for ${normalizedEmail}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
