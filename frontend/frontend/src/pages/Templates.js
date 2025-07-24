// src/pages/Templates.js
import React, { useEffect, useState } from 'react';

export default function Templates({ onEditTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch templates from backend
  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:4000/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const deleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`http://localhost:4000/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const duplicateTemplate = async (template) => {
    const duplicated = {
      ...template,
      id: undefined, // new ID will be assigned by backend
      createdAt: undefined,
      updatedAt: undefined,
      pages: JSON.parse(JSON.stringify(template.pages)), // deep clone
    };
    try {
      const res = await fetch('http://localhost:4000/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicated),
      });
      if (!res.ok) throw new Error('Failed to duplicate template');
      const newTemplate = await res.json();
      setTemplates((prev) => [...prev, newTemplate]);
      alert('Template duplicated successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Loading templates...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Templates</h2>
      {templates.length === 0 && <p>No templates found.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {templates.map((t) => (
          <li
            key={t.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 6,
              marginBottom: 10,
              padding: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>{t.pages[0]?.name || 'Unnamed Template'}</strong><br />
              <small>Created: {new Date(t.createdAt).toLocaleString()}</small>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onEditTemplate(t.id)}>Edit</button>
              <button onClick={() => duplicateTemplate(t)}>Duplicate</button>
              <button onClick={() => deleteTemplate(t.id)} style={{ color: 'red' }}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
