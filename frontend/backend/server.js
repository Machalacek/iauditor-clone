const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory store for templates
const templates = {};

// Get all templates (optionally support filter later)
app.get('/templates', (req, res) => {
  const allTemplates = Object.values(templates);
  res.json(allTemplates);
});

// Get single template by ID
app.get('/templates/:id', (req, res) => {
  const id = req.params.id;
  const template = templates[id];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

// Create new template
app.post('/templates', (req, res) => {
  const id = uuidv4();
  const { pages } = req.body;

  if (!pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'Pages array is required' });
  }

  const newTemplate = {
    id,
    pages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  templates[id] = newTemplate;
  res.status(201).json(newTemplate);
});

// Update existing template
app.put('/templates/:id', (req, res) => {
  const id = req.params.id;
  const existing = templates[id];
  if (!existing) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const { pages } = req.body;
  if (!pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'Pages array is required' });
  }

  const updatedTemplate = {
    ...existing,
    pages,
    updatedAt: new Date().toISOString(),
  };

  templates[id] = updatedTemplate;
  res.json(updatedTemplate);
});

// Delete template
app.delete('/templates/:id', (req, res) => {
  const id = req.params.id;
  if (!templates[id]) {
    return res.status(404).json({ error: 'Template not found' });
  }
  delete templates[id];
  res.json({ message: 'Template deleted' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Template backend server running on http://localhost:${PORT}`);
});
