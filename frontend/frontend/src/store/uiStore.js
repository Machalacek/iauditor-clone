// src/store/uiStore.js
import { create } from "zustand";
export const useUIStore = create(set => ({
  showTransferModal: false,
  setShowTransferModal: v => set({ showTransferModal: v }),
}));
