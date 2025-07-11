// src/api.js

const BASE_URL = 'https://your-backend-url.com/api/templates'; // Replace with your backend URL

export async function fetchTemplates() {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return await res.json();
}

export async function saveTemplate(template) {
  // If has id, update; else create new
  if (template.id) {
    const res = await fetch(`${BASE_URL}/${template.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!res.ok) throw new Error('Failed to update template');
    return await res.json();
  } else {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!res.ok) throw new Error('Failed to create template');
    return await res.json();
  }
}

export async function deleteTemplate(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete template');
}
