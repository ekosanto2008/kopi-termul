import { create } from 'zustand';

interface UIState {
  isMobileCartOpen: boolean;
  openMobileCart: () => void;
  closeMobileCart: () => void;
  toggleMobileCart: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileCartOpen: false,
  openMobileCart: () => set({ isMobileCartOpen: true }),
  closeMobileCart: () => set({ isMobileCartOpen: false }),
  toggleMobileCart: () => set((state) => ({ isMobileCartOpen: !state.isMobileCartOpen })),
}));
