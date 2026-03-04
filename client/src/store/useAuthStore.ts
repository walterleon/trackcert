import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompanyInfo } from '../api/companyApi';

interface AuthState {
  token: string | null;
  company: CompanyInfo | null;
  setAuth: (token: string, company: CompanyInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      company: null,
      setAuth: (token, company) => set({ token, company }),
      logout: () => set({ token: null, company: null }),
    }),
    { name: 'rastreoya-auth' }
  )
);
