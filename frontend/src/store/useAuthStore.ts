import { create } from 'zustand';
import type { User } from '@/types/user';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null,
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, isAuthenticated: true, user });
  },
  logout: async () => {
    // También limpiar la cookie httpOnly si existe
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, isAuthenticated: false, user: null });
  },
}));


