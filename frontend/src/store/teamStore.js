import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const useTeamStore = create((set) => ({
  team: [
    {
      id: uuidv4(),
      name: "Jan Machala",
      role: "Administrator",
      active: true,
    },
    {
      id: uuidv4(),
      name: "John Doe",
      role: "User",
      active: true,
    },
  ],
  setTeam: (teamArray) => set({ team: teamArray }),
  // Add more team logic here as needed!
}));
