import { create } from 'zustand';

export const defaultFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'category', label: 'Category', type: 'select', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true },
  { name: 'assignedTo', label: 'Assigned To', type: 'select', required: false },
  { name: 'assignedProject', label: 'Project', type: 'select', required: false },
  { name: 'serialNumber', label: 'Serial #', type: 'text', required: false },
  { name: 'notes', label: 'Notes', type: 'textarea', required: false },
];

export const useGearStore = create((set) => ({
  gear: [],                // Loaded from Firestore
  categories: ['Rope', 'Harness', 'Tool', 'Radio', 'Other'],
  statuses: ['Available', 'In Use', 'Under Repair', 'Lost'],
  fields: defaultFields,
  setCategories: (cats) => set({ categories: cats }),
  setFields: (fields) => set({ fields }),
  setGear: (gear) => set({ gear }),
  addGear: (item) => set((state) => ({ gear: [item, ...state.gear] })),
  updateGear: (id, updates) => set((state) => ({
    gear: state.gear.map((g) => g.id === id ? { ...g, ...updates } : g),
  })),
  deleteGear: (id) => set((state) => ({
    gear: state.gear.filter((g) => g.id !== id),
  })),
}));
