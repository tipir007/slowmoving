import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {loginNik, type SessionUser} from '../services/api';

type AuthState = {
  user: SessionUser | null;
  hydrating: boolean;
  login: (nik: string, pin: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      hydrating: true,
      login: async (nik, pin) => {
        const user = await loginNik(nik, pin);
        set({user});
      },
      logout: () => set({user: null}),
    }),
    {
      name: 'rak-merah-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: s => ({user: s.user}),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({hydrating: false});
      },
    },
  ),
);
