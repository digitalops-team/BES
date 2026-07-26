import { create } from 'zustand';
import api from '@/lib/api';

interface NotificationState {
  sinLeer: number;
  fetchStats: () => Promise<void>;
  decrementSinLeer: () => void;
  setSinLeer: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  sinLeer: 0,
  fetchStats: async () => {
    try {
      const res = await api.get('/estadisticas');
      set({ sinLeer: res.data?.sinLeer ?? 0 });
    } catch (error) {
      console.error("Error fetching notification stats:", error);
    }
  },
  decrementSinLeer: () => set((state) => ({ sinLeer: Math.max(0, state.sinLeer - 1) })),
  setSinLeer: (count) => set({ sinLeer: count }),
}));
