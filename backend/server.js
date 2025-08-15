import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

// For __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

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
`);

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

// Incidents
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

// ---- START SERVER ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SQLite backend running at http://localhost:${PORT}`);
});
