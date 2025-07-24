// src/store/notificationStore.js
import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  setNotifications: (notifs) => set({ notifications: notifs }),
}));
