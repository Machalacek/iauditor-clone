// src/store/projectStore.js
import { create } from 'zustand';
import { API_BASE as API } from '../lib/api';

export const useProjectStore = create((set, get) => ({
  projects: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    const res = await fetch(`${API}/projects`);
    const projects = await res.json();
    set({ projects, loading: false });
  },

  addProject: async (projectName) => {
    const res = await fetch(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName }),
    });
    const created = await res.json();
    set((state) => ({ projects: [created, ...state.projects] }));
  },

  renameProject: async (id, newName) => {
    const res = await fetch(`${API}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const updated = await res.json();
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },

  deleteProject: async (id) => {
    await fetch(`${API}/projects/${id}`, { method: 'DELETE' });
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }));
  },

  archiveProject: async (id, archived) => {
    const res = await fetch(`${API}/projects/${id}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived }),
    });
    const updated = await res.json();
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },
}));
