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
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    pages TEXT,
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
`);

// ---- TEMPLATES ROUTES ----

// Get all templates
app.get('/templates', (req, res) => {
  const rows = db.prepare('SELECT * FROM templates').all();
  res.json(rows.map(r => ({
    ...r,
    pages: JSON.parse(r.pages)
  })));
});

// Get single template by ID
app.get('/templates/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Template not found' });
  r.pages = JSON.parse(r.pages);
  res.json(r);
});

// Create new template
app.post('/templates', (req, res) => {
  const id = uuidv4();
  const { pages } = req.body;
  if (!pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'Pages array is required' });
  }
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO templates (id, pages, createdAt, updatedAt) VALUES (?, ?, ?, ?)')
    .run(id, JSON.stringify(pages), createdAt, createdAt);
  res.status(201).json({
    id, pages, createdAt, updatedAt: createdAt
  });
});

// Update template
app.put('/templates/:id', (req, res) => {
  const { pages } = req.body;
  if (!pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'Pages array is required' });
  }
  const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const updatedAt = new Date().toISOString();
  db.prepare('UPDATE templates SET pages = ?, updatedAt = ? WHERE id = ?')
    .run(JSON.stringify(pages), updatedAt, req.params.id);
  res.json({
    id: req.params.id,
    pages,
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

// ---- START SERVER ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SQLite backend running at http://localhost:${PORT}`);
});
