import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { createHmac, randomBytes, createHash, timingSafeEqual } from 'crypto';
import { localDb } from '../lib/localDb';
import { isSelfHosted, config } from '../config';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1).max(100),
});

function hashPassword(password: string): string {
  return createHash('sha256').update(password + 'kontroapi_salt_v1').digest('hex');
}

function generateToken(userId: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  })).toString('base64url');
  const sig = createHmac('sha256', config.JWT_SECRET || 'dev-secret')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function verifyToken(token: string): { sub: string; email: string } | null {
  try {
    const [header, payload, sig] = token.split('.');
    if (!header || !payload || !sig) return null;
    const expectedSig = createHmac('sha256', config.JWT_SECRET || 'dev-secret')
      .update(`${header}.${payload}`)
      .digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

router.post('/login', rateLimit, async (req: Request, res: Response) => {
  if (!isSelfHosted) {
    return res.status(404).json({ success: false, message: 'Not available in cloud mode' });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid input' });
  }

  const { email, password } = parsed.data;
  const hash = hashPassword(password);

  const result = await localDb.query(
    `SELECT id, email, full_name, plan, role FROM users WHERE email = $1 AND password_hash = $2 LIMIT 1`,
    [email.toLowerCase(), hash]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const user = result.rows[0];
  const token = generateToken(user.id, user.email);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        plan: user.plan,
        role: user.role,
      },
    },
  });
});

router.post('/register', rateLimit, async (req: Request, res: Response) => {
  if (!isSelfHosted) {
    return res.status(404).json({ success: false, message: 'Not available in cloud mode' });
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password, full_name } = parsed.data;
  const hash = hashPassword(password);

  try {
    const result = await localDb.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, full_name, plan, role`,
      [email.toLowerCase(), hash, full_name]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          plan: user.plan,
          role: user.role,
        },
      },
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    throw err;
  }
});

router.get('/me', async (req: Request, res: Response) => {
  if (!isSelfHosted) {
    return res.status(404).json({ success: false, message: 'Not available in cloud mode' });
  }

  const auth = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!auth) {
    return res.status(401).json({ success: false, message: 'No token' });
  }

  const decoded = verifyToken(auth);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  const result = await localDb.query(
    `SELECT id, email, full_name, plan, role, phone, session_limit, billing_status FROM users WHERE id = $1`,
    [decoded.sub]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  res.json({ success: true, data: result.rows[0] });
});

export default router;
