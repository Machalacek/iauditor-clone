import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { randomUUID, webcrypto } from 'crypto';

// For __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_change_me';

/** Allow multiple frontends:
 *  - Set CLIENT_URLS as a comma-separated list of origins (e.g. "https://iauditor-clone-xxx.vercel.app, http://localhost:3000")
 *  - We also allow *.vercel.app by hostname pattern.
 */
const ALLOWED_ORIGINS = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Always allow localhost in dev
if (!ALLOWED_ORIGINS.includes('http://localhost:3000')) {
  ALLOWED_ORIGINS.push('http://localhost:3000');
}

const corsOptions = {
  origin(origin, cb) {
    // Allow server-to-server / curl (no origin) and SSR
    if (!origin) return cb(null, true);
    try {
      const host = new URL(origin).hostname;
      const allowed =
        ALLOWED_ORIGINS.includes(origin) ||
        /\.vercel\.app$/.test(host); // any Vercel preview/prod frontend
      return allowed ? cb(null, true) : cb(new Error(`CORS blocked: ${origin}`));
    } catch {
      return cb(new Error(`CORS parse error: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());

// quick health check
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// SQLite database file in backend/database.db
const db = new Database(path.join(__dirname, 'database.db'));

// ---- DB SETUP ----
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pages TEXT,
    access TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    templateId TEXT,
    templateName TEXT,
    answers TEXT,
    status TEXT,
    createdAt TEXT
  );
  -- Projects core table
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    archived INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  );

  /* === NEW: users table === */
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    team TEXT,
    phone TEXT,
    avatarUrl TEXT,
    active INTEGER DEFAULT 1,
    lastSeen TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );

  /* === NEW: organizations (singleton) === */
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT,
    ownerEmail TEXT,
    phone TEXT,
    website TEXT,
    logoURL TEXT,
    updatedAt TEXT
  );

  /* === NEW: invites === */
  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    position TEXT,
    token TEXT UNIQUE NOT NULL,
    accepted INTEGER DEFAULT 0,
    invitedAt TEXT NOT NULL
  );

  /* === NEW: notifications === */
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,          -- internal row id
    notifId TEXT NOT NULL,        -- transfer/group id, e.g. gearId_timestamp
    userId TEXT NOT NULL,
    type TEXT NOT NULL,           -- e.g. 'gear-transfer'
    payload TEXT,                 -- JSON (from, to, gearId, etc.)
    pending INTEGER DEFAULT 1,    -- 1 = waiting, 0 = resolved
    decision TEXT,                -- 'accepted' | 'denied' | NULL
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

// ---- ONE-TIME ADMIN SEED ----
(() => {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const adminPass  = process.env.ADMIN_PASSWORD;
  const adminName  = process.env.ADMIN_NAME || 'Admin';
  if (!adminEmail || !adminPass) return;

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!exists) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(adminPass, 10);
    db.prepare(`
      INSERT INTO users (id, email, passwordHash, name, role, active, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'admin', 1, ?, ?)
    `).run(id, adminEmail, passwordHash, adminName, now, now);
    console.log(`Seeded admin user: ${adminEmail}`);
  }
})();

// Ensure singleton org row exists
const orgExists = db.prepare('SELECT id FROM organizations WHERE id = ?').get('org');
if (!orgExists) {
  db.prepare(`
    INSERT INTO organizations (id, name, ownerEmail, phone, website, logoURL, updatedAt)
    VALUES ('org', '', '', '', '', '', ?)
  `).run(new Date().toISOString());
}

// --- Add columns to "projects" if missing ---
const hasCol = (col) =>
  db.prepare(`PRAGMA table_info(projects)`).all().some(r => r.name === col);

if (!hasCol('address'))         db.prepare(`ALTER TABLE projects ADD COLUMN address TEXT`).run();
if (!hasCol('orientationTime')) db.prepare(`ALTER TABLE projects ADD COLUMN orientationTime TEXT`).run();
if (!hasCol('csoName'))         db.prepare(`ALTER TABLE projects ADD COLUMN csoName TEXT`).run();
if (!hasCol('csoNumber'))       db.prepare(`ALTER TABLE projects ADD COLUMN csoNumber TEXT`).run();

db.exec(`
  -- Materials used on a project
  CREATE TABLE IF NOT EXISTS project_materials (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    cost REAL,
    note TEXT,
    createdAt TEXT,
    FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
  );
  -- Incident reports for a project
  CREATE TABLE IF NOT EXISTS project_incidents (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT,
    date TEXT,
    createdAt TEXT,
    FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

// ---- AUTH HELPERS ----
function issueToken(user) {
  return jwt.sign(
    { uid: user.id, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { uid, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// ---- AUTH + USERS ROUTES ----

// ---- MICROSOFT LOGIN (Azure AD / Entra) ----
import { Issuer, generators } from 'openid-client';

const MS_TENANT_ID = process.env.MS_TENANT_ID || 'common';
const MS_CLIENT_ID = process.env.MS_CLIENT_ID || '';
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET || '';
const MS_REDIRECT_URL = process.env.MS_REDIRECT_URL || `http://localhost:${PORT}/auth/ms/callback`;

let msClient;
let codeVerifier; // PKCE

async function getMsClient() {
  if (msClient) return msClient;
  const issuer = await Issuer.discover(`https://login.microsoftonline.com/${MS_TENANT_ID}/v2.0`);
  msClient = new issuer.Client({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    redirect_uris: [MS_REDIRECT_URL],
    response_types: ['code'],
  });
  return msClient;
}

// Step 1: Redirect to Microsoft
app.get('/auth/ms/login', async (req, res) => {
  try {
    const client = await getMsClient();
    codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const url = client.authorizationUrl({
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    res.redirect(url);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Microsoft login init failed' });
  }
});

// Step 2: Callback from Microsoft
app.get('/auth/ms/callback', async (req, res) => {
  try {
    const client = await getMsClient();
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(MS_REDIRECT_URL, params, { code_verifier: codeVerifier });
    const claims = tokenSet.claims(); // {sub, email?, name?, preferred_username?}

    const email = (claims.email || claims.preferred_username || '').toLowerCase();
    if (!email) return res.status(400).send('No email claim returned from Microsoft.');

    const now = new Date().toISOString();

    // upsert user
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO users (id, email, passwordHash, name, role, active, createdAt, updatedAt, lastSeen)
        VALUES (?, ?, ?, ?, 'user', 1, ?, ?, ?)
      `).run(
        id,
        email,
        bcrypt.hashSync(uuidv4(), 10), // random placeholder (password not used for MS login)
        claims.name || email,
        now, now, now
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      db.prepare('UPDATE users SET lastSeen = ?, updatedAt = ? WHERE id = ?').run(now, now, user.id);
    }

    const safe = (({ id, email, name, role, team, phone, avatarUrl, active, lastSeen, createdAt, updatedAt }) =>
      ({ id, email, name, role, team, phone, avatarUrl, active, lastSeen, createdAt, updatedAt }))(user);
    const token = issueToken(safe);

    // Redirect back to frontend with our JWT
    // Prefer FRONT_URL if set, otherwise first allowed origin, else localhost.
    const FRONT_URL =
      process.env.FRONT_URL ||
      (ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS[0] : 'http://localhost:3000');

    const redirectUrl = `${FRONT_URL}/?token=${encodeURIComponent(token)}`;
    res.redirect(redirectUrl);
  } catch (e) {
    console.error(e);
    res.status(500).send('Microsoft callback failed.');
  }
});

// Register
app.post('/auth/register', (req, res) => {
  const { email, password, name, team, phone } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const id = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, email, passwordHash, name, team, phone, role, active, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, 'user', 1, ?, ?)
  `).run(id, email.toLowerCase(), passwordHash, name || '', team || '', phone || '', now, now);

  const user = db.prepare('SELECT id, email, name, role, team, phone, avatarUrl, active, lastSeen, createdAt, updatedAt FROM users WHERE id = ?').get(id);
  const token = issueToken(user);
  res.status(201).json({ token, user });
});

// Login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.active) return res.status(403).json({ error: 'Account deactivated' });

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET lastSeen = ?, updatedAt = ? WHERE id = ?').run(now, now, user.id);

  const safe = (({ id, email, name, role, team, phone, avatarUrl, active, lastSeen, createdAt, updatedAt }) =>
    ({ id, email, name, role, team, phone, avatarUrl, active, lastSeen, createdAt, updatedAt }))(user);
  const token = issueToken(safe);
  res.json({ token, user: safe });
});

// Current user
app.get('/auth/me', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT id, email, name, role, team, phone, avatarUrl, active, lastSeen, createdAt, updatedAt FROM users WHERE id = ?')
    .get(req.user.uid);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// Users list (admin)
app.get('/users', authMiddleware, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT id, email, name, role, team, phone, avatarUrl, active, lastSeen, createdAt, updatedAt FROM users ORDER BY createdAt DESC').all();
  res.json(rows);
});

// Get one user (self or admin)
app.get('/users/:id', authMiddleware, (req, res) => {
  if (req.user.uid !== req.params.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const row = db.prepare('SELECT id, email, name, role, team, phone, avatarUrl, active, lastSeen, createdAt, updatedAt FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// Update user (self can edit own basic fields; role/active only by admin)
app.patch('/users/:id', authMiddleware, (req, res) => {
  const isSelf = req.user.uid === req.params.id;
  const isAdmin = req.user.role === 'admin';

  const allowedSelf = ['name', 'team', 'phone', 'avatarUrl'];
  const allowedAdmin = ['role', 'active', ...allowedSelf];

  const fields = Object.keys(req.body || {});
  const allowed = (isAdmin ? allowedAdmin : allowedSelf);
  if (fields.some(f => !allowed.includes(f))) return res.status(403).json({ error: 'Forbidden field(s)' });

  const updates = [];
  const params = [];
  fields.forEach(f => { updates.push(`${f} = ?`); params.push(req.body[f]); });

  if (updates.length === 0) return res.status(400).json({ error: 'No fields' });

  const now = new Date().toISOString();
  updates.push('updatedAt = ?'); params.push(now, req.params.id);

  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  const info = db.prepare(sql).run(...params);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });

  const row = db.prepare('SELECT id, email, name, role, team, phone, avatarUrl, active, lastSeen, createdAt, updatedAt FROM users WHERE id = ?').get(req.params.id);
  res.json(row);
});

// ---- TEMPLATES ROUTES ----

// Get all templates
app.get('/templates', (req, res) => {
  const rows = db.prepare('SELECT * FROM templates').all();
  res.json(rows.map(r => ({
    ...r,
    pages: JSON.parse(r.pages),
    access: r.access || 'all'
  })));
});

// Get single template by ID
app.get('/templates/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Template not found' });
  r.pages = JSON.parse(r.pages);
  r.access = r.access || 'all';
  res.json(r);
});

// Create new template
app.post('/templates', (req, res) => {
  const { pages, access } = req.body;
  if (!pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'Pages array is required' });
  }
  const createdAt = new Date().toISOString();
  // DO NOT specify the id—let SQLite assign it!
  const result = db.prepare(
    'INSERT INTO templates (pages, access, createdAt, updatedAt) VALUES (?, ?, ?, ?)'
  ).run(
    JSON.stringify(pages), access || 'all', createdAt, createdAt
  );
  // Get the integer ID just created
  const id = result.lastInsertRowid;
  res.status(201).json({
    id, pages, access: access || 'all', createdAt, updatedAt: createdAt
  });
});

// Update template
app.put('/templates/:id', (req, res) => {
  const { pages, access } = req.body;
  if (!pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'Pages array is required' });
  }
  const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const updatedAt = new Date().toISOString();
  db.prepare(
    'UPDATE templates SET pages = ?, access = ?, updatedAt = ? WHERE id = ?'
  ).run(
    JSON.stringify(pages), access || 'all', updatedAt, req.params.id
  );
  res.json({
    id: req.params.id,
    pages,
    access: access || 'all',
    createdAt: t.createdAt,
    updatedAt
  });
});

// Delete template
app.delete('/templates/:id', (req, res) => {
  const info = db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Template not found' });
  res.json({ message: 'Template deleted' });
});

// ---- INSPECTIONS ROUTES ----

// List all inspections
app.get('/inspections', (req, res) => {
  const rows = db.prepare('SELECT * FROM inspections').all();
  res.json(rows.map(r => ({
    ...r,
    answers: JSON.parse(r.answers)
  })));
});

// Get single inspection
app.get('/inspections/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Inspection not found' });
  r.answers = JSON.parse(r.answers);
  res.json(r);
});

// Create new inspection
app.post('/inspections', (req, res) => {
  const id = uuidv4();
  const { templateId, templateName, answers, status, createdAt } = req.body;
  if (!templateId || !templateName) {
    return res.status(400).json({ error: 'Missing templateId or templateName' });
  }
  const cAt = createdAt || new Date().toISOString();
  db.prepare('INSERT INTO inspections (id, templateId, templateName, answers, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, templateId, templateName, JSON.stringify(answers || {}), status || 'incomplete', cAt);
  res.status(201).json({
    id, templateId, templateName, answers, status: status || 'incomplete', createdAt: cAt
  });
});

// Delete inspection
app.delete('/inspections/:id', (req, res) => {
  const info = db.prepare('DELETE FROM inspections WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Inspection not found' });
  res.json({ message: 'Inspection deleted' });
});

// ---- ORGANIZATION SETTINGS ROUTES ----
app.get('/org', (req, res) => {
  const row = db.prepare('SELECT * FROM organizations WHERE id = "org"').get();
  res.json(row || {});
});

app.patch('/org', authMiddleware, adminOnly, (req, res) => {
  const fields = ['name', 'ownerEmail', 'phone', 'website', 'logoURL'];
  const updates = [];
  const params = [];

  fields.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(req.body, f)) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());

  const sql = `UPDATE organizations SET ${updates.join(', ')} WHERE id = 'org'`;
  db.prepare(sql).run(...params);

  const row = db.prepare('SELECT * FROM organizations WHERE id = "org"').get();
  res.json(row);
});

// ---- INVITES ROUTES ----
// List all invites
app.get('/invites', authMiddleware, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM invites ORDER BY invitedAt DESC').all();
  res.json(rows);
});

// Create invite
app.post('/invites', authMiddleware, adminOnly, (req, res) => {
  const { email, name, role = 'user', position = '' } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  const id = randomUUID();
  const token = [...webcrypto.getRandomValues(new Uint8Array(18))]
    .map(b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62])
    .join('');
  const invitedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO invites (id, email, name, role, position, token, accepted, invitedAt)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, email, name || '', role, position, token, invitedAt);
  res.status(201).json({ id, email, name: name || '', role, position, token, accepted: 0, invitedAt });
});

// Delete/revoke invite
app.delete('/invites/:id', authMiddleware, adminOnly, (req, res) => {
  const info = db.prepare('DELETE FROM invites WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Invite not found' });
  res.json({ message: 'Invite deleted' });
});

// (Optional) Mark accepted — call from registration flow
app.post('/invites/:token/accept', (req, res) => {
  const info = db.prepare('UPDATE invites SET accepted = 1 WHERE token = ?').run(req.params.token);
  if (info.changes === 0) return res.status(404).json({ error: 'Invite not found' });
  res.json({ message: 'Invite accepted' });
});

// ---- PROJECTS ROUTES ----

// Get all projects
app.get('/projects', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all();
  res.json(rows.map(r => ({
    ...r,
    archived: !!r.archived,
    active: !!r.active
  })));
});

// Get one project
app.get('/projects/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  res.json({ ...row, archived: !!row.archived, active: !!row.active });
});

// Create project
app.post('/projects', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO projects (id, name, archived, active, createdAt, updatedAt) VALUES (?, ?, 0, 1, ?, ?)')
    .run(id, name.trim(), now, now);
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json({ ...row, archived: !!row.archived, active: !!row.active });
});

// Partial update (address, orientationTime, csoName, csoNumber, name)
app.patch('/projects/:id', (req, res) => {
  const fields = ['name', 'address', 'orientationTime', 'csoName', 'csoNumber'];
  const updates = [];
  const params = [];
  fields.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(req.body, f)) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  const now = new Date().toISOString();
  updates.push('updatedAt = ?');
  params.push(now, req.params.id);

  const sql = `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`;
  const info = db.prepare(sql).run(...params);
  if (info.changes === 0) return res.status(404).json({ error: 'Project not found' });

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ ...row, archived: !!row.archived, active: !!row.active });
});

// Archive / restore project
app.patch('/projects/:id/archive', (req, res) => {
  const { archived } = req.body;
  const now = new Date().toISOString();
  const info = db.prepare('UPDATE projects SET archived = ?, active = ?, updatedAt = ? WHERE id = ?')
    .run(archived ? 1 : 0, archived ? 0 : 1, now, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Project not found' });
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ ...row, archived: !!row.archived, active: !!row.active });
});

// Delete project
app.delete('/projects/:id', (req, res) => {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Project not found' });
  res.json({ message: 'Project deleted' });
});

// Materials
app.get('/projects/:id/materials', (req, res) => {
  const rows = db.prepare('SELECT * FROM project_materials WHERE projectId = ? ORDER BY createdAt DESC').all(req.params.id);
  res.json(rows);
});
app.post('/projects/:id/materials', (req, res) => {
  const { name, quantity, unit, cost, note } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO project_materials (id, projectId, name, quantity, unit, cost, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, name.trim(), quantity ?? null, unit ?? null, cost ?? null, note ?? null, now);
  const row = db.prepare('SELECT * FROM project_materials WHERE id = ?').get(id);
  res.status(201).json(row);
});
app.delete('/projects/:id/materials/:mid', (req, res) => {
  const info = db.prepare('DELETE FROM project_materials WHERE id = ? AND projectId = ?').run(req.params.mid, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Material not found' });
  res.json({ message: 'Material deleted' });
});

// ---- Incidents
app.get('/projects/:id/incidents', (req, res) => {
  const rows = db.prepare('SELECT * FROM project_incidents WHERE projectId = ? ORDER BY createdAt DESC').all(req.params.id);
  res.json(rows);
});
app.post('/projects/:id/incidents', (req, res) => {
  const { title, description, severity, date } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO project_incidents (id, projectId, title, description, severity, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, title.trim(), description ?? null, severity ?? null, date ?? null, now);
  const row = db.prepare('SELECT * FROM project_incidents WHERE id = ?').get(id);
  res.status(201).json(row);
});
app.delete('/projects/:id/incidents/:iid', (req, res) => {
  const info = db.prepare('DELETE FROM project_incidents WHERE id = ? AND projectId = ?').run(req.params.iid, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Incident not found' });
  res.json({ message: 'Incident deleted' });
});

/* ==== Uploads (no Firebase) ==== */
const upload = multer({ dest: path.join(__dirname, 'uploads') });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

/* ==== Minimal Gear endpoints ==== */
db.exec(`
  CREATE TABLE IF NOT EXISTS gear (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    status TEXT,
    assignedTo TEXT,
    assignedProject TEXT,
    serialNumber TEXT,
    notes TEXT,
    imageUrl TEXT,
    pendingTransfer TEXT,  -- store JSON
    createdAt TEXT,
    updatedAt TEXT
  );
`);
// Ensure 'activity' column exists (JSON text)
try { db.prepare(`ALTER TABLE gear ADD COLUMN activity TEXT`).run(); } catch {}

// Get all gear
app.get('/gear', (req, res) => {
  const rows = db.prepare('SELECT * FROM gear ORDER BY createdAt DESC').all();
  res.json(rows.map(r => ({
    ...r,
    pendingTransfer: r.pendingTransfer ? JSON.parse(r.pendingTransfer) : null,
    activity: r.activity ? JSON.parse(r.activity) : []
  })));
});

app.post('/gear', (req, res) => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const row = { ...req.body, id, createdAt: now, updatedAt: now, pendingTransfer: null, activity: [] };
  db.prepare(`INSERT INTO gear (id, name, category, status, assignedTo, assignedProject, serialNumber, notes, imageUrl, pendingTransfer, activity, createdAt, updatedAt)
              VALUES (@id, @name, @category, @status, @assignedTo, @assignedProject, @serialNumber, @notes, @imageUrl, @pendingTransfer, @activity, @createdAt, @updatedAt)`)
    .run({ ...row, pendingTransfer: null, activity: JSON.stringify([]) });
  res.status(201).json(row);
});
app.patch('/gear/:id', (req, res) => {
  const fields = ['name','category','status','assignedTo','assignedProject','serialNumber','notes','imageUrl','pendingTransfer'];
  const updates = [];
  const params = [];
  fields.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(req.body, f)) {
      updates.push(`${f} = ?`);
      params.push(f === 'pendingTransfer' && req.body[f] ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'No fields' });
  updates.push('updatedAt = ?'); params.push(new Date().toISOString(), req.params.id);
  const sql = `UPDATE gear SET ${updates.join(', ')} WHERE id = ?`;
  const info = db.prepare(sql).run(...params);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  const r = db.prepare('SELECT * FROM gear WHERE id = ?').get(req.params.id);
  res.json({ ...r, pendingTransfer: r.pendingTransfer ? JSON.parse(r.pendingTransfer) : null });
});


/* ==== Gear Transfer (backend-persisted pendingTransfer) ==== */

// Initiate a transfer: sets pendingTransfer on the gear row
app.post('/gear/:id/transfer', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { to, from, requestedBy, notifId } = req.body || {};
  if (!to || !to.userId) return res.status(400).json({ error: 'to.userId is required' });

  const now = new Date().toISOString();
  const pending = { notifId, to, from, date: now, requestedBy };

  const info = db.prepare(
    `UPDATE gear SET pendingTransfer = ?, updatedAt = ? WHERE id = ?`
  ).run(JSON.stringify(pending), now, id);

  if (info.changes === 0) return res.status(404).json({ error: 'Gear not found' });

  const row = db.prepare(`SELECT * FROM gear WHERE id = ?`).get(id);
  res.json({
    ...row,
    pendingTransfer: row.pendingTransfer ? JSON.parse(row.pendingTransfer) : null,
    activity: row.activity ? JSON.parse(row.activity) : [],
  });
});

// Decide a transfer: accept or deny; on accept, move assignment; always clear pendingTransfer
app.post('/gear/:id/transfer/decision', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { decision, by } = req.body || {};
  if (!['accepted', 'denied'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be accepted|denied' });
  }
  const gear = db.prepare(`SELECT * FROM gear WHERE id = ?`).get(id);
  if (!gear) return res.status(404).json({ error: 'Gear not found' });

  const now = new Date().toISOString();
  const pending = gear.pendingTransfer ? JSON.parse(gear.pendingTransfer) : null;
  const activity = gear.activity ? JSON.parse(gear.activity) : [];

  if (!pending) {
    db.prepare(`UPDATE gear SET pendingTransfer = NULL, updatedAt = ? WHERE id = ?`)
      .run(now, id);
  } else if (decision === 'accepted') {
    db.prepare(
      `UPDATE gear
       SET assignedTo = ?, assignedProject = ?, pendingTransfer = NULL, activity = ?, updatedAt = ?
       WHERE id = ?`
    ).run(
      pending.to.userId,
      pending.to.projectId || '',
      JSON.stringify([
        ...activity,
        {
          type: 'transfer-accepted',
          date: now,
          from: { assignedTo: pending.from?.userId || '', assignedProject: pending.from?.projectId || '' },
          to:   { assignedTo: pending.to.userId,        assignedProject: pending.to.projectId || '' },
          by,
        },
      ]),
      now,
      id
    );
  } else {
    db.prepare(
      `UPDATE gear
       SET pendingTransfer = NULL, activity = ?, updatedAt = ?
       WHERE id = ?`
    ).run(
      JSON.stringify([
        ...activity,
        {
          type: 'transfer-denied',
          date: now,
          from: { assignedTo: pending.from?.userId || '', assignedProject: pending.from?.projectId || '' },
          to:   { assignedTo: pending.to.userId,        assignedProject: pending.to.projectId || '' },
          by,
        },
      ]),
      now,
      id
    );
  }

  const out = db.prepare(`SELECT * FROM gear WHERE id = ?`).get(id);
  res.json({
    ...out,
    pendingTransfer: out.pendingTransfer ? JSON.parse(out.pendingTransfer) : null,
    activity: out.activity ? JSON.parse(out.activity) : [],
  });
});

/* ==== Notifications API ==== */

// Create notifications for a list of userIds
app.post('/notifications', authMiddleware, (req, res) => {
  const { notifId, type, userIds, payload } = req.body || {};
  if (!notifId || !type || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO notifications (id, notifId, userId, type, payload, pending, decision, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 1, NULL, ?, ?)`
  );
  const payloadStr = payload ? JSON.stringify(payload) : null;

  const tx = db.transaction((ids) => {
    ids.forEach((userId) => {
      stmt.run(uuidv4(), notifId, userId, type, payloadStr, now, now);
    });
  });
  tx(userIds);

  res.status(201).json({ created: userIds.length });
});

// Mark all notifications with a notifId as decided (no Firestore)
app.post('/notifications/decision', authMiddleware, (req, res) => {
  const { notifId, decision } = req.body || {};
  if (!notifId || !decision || !['accepted', 'denied'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const now = new Date().toISOString();
  const info = db.prepare(
    `UPDATE notifications
     SET pending = 0, decision = ?, updatedAt = ?
     WHERE notifId = ?`
  ).run(decision, now, notifId);

  res.json({ updated: info.changes });
});

// ---- START SERVER ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SQLite backend running at http://localhost:${PORT}`);
});


