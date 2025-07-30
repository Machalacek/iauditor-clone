import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem('theme') || 'system',
  setTheme: (newTheme) => {
    localStorage.setItem('theme', newTheme);
    set({ theme: newTheme });
    applyTheme(newTheme);
  },
}));

function applyTheme(theme) {
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
}

// On load
applyTheme(localStorage.getItem('theme') || 'system');

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const saved = localStorage.getItem('theme');
  if (saved === 'system') applyTheme('system');
});
