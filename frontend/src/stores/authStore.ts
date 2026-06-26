import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, User } from '../types/domain';

type AuthState = {
  token: string | null;
  user: User | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (session) => set({ token: session.accessToken, user: session.user }),
      clearSession: () => set({ token: null, user: null })
    }),
    { name: 'profileforge-auth' }
  )
);
