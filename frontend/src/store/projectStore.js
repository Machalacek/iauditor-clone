// src/store/projectStore.js
import { create } from 'zustand';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const useProjectStore = create((set, get) => ({
  projects: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    const snapshot = await getDocs(collection(db, 'projects'));
    const projects = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        archived: data.archived || false,
        active: !data.archived, // active = not archived
      };
    });
    set({ projects, loading: false });
  },

  addProject: async (projectName) => {
    const docRef = await addDoc(collection(db, 'projects'), { name: projectName, archived: false });
    set((state) => ({
      projects: [
        ...state.projects,
        { id: docRef.id, name: projectName, archived: false, active: true }
      ],
    }));
  },

  renameProject: async (id, newName) => {
    await updateDoc(doc(db, 'projects', id), { name: newName });
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, name: newName } : p
      ),
    }));
  },

  deleteProject: async (id) => {
    await deleteDoc(doc(db, 'projects', id));
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }));
  },

  archiveProject: async (id, archived) => {
    await updateDoc(doc(db, 'projects', id), { archived });
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id
          ? { ...p, archived, active: !archived }
          : p
      ),
    }));
  },

  // Utility: get active projects
  getActiveProjects: () => {
    const { projects } = get();
    return projects.filter((p) => !p.archived && p.active);
  }
}));
