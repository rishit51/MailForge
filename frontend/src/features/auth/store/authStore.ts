import { create } from 'zustand';
import type { UserResponse } from '../../../types/models';

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  setAuth: (user: UserResponse | null, token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  setAuth: (user, token) => {
    if (token) localStorage.setItem('access_token', token);
    else localStorage.removeItem('access_token');
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },
}));
