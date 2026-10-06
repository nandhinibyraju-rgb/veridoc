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

module.exports = router;
