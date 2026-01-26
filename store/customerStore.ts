import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface CustomerSession {
  customerId: string;
  name: string;
  phone: string;
  tableNumber: string; // "Takeaway" if takeaway
  orderType: 'dine-in' | 'takeaway';
}

interface CustomerState {
  session: CustomerSession | null;
  setSession: (session: CustomerSession) => void;
  clearSession: () => void;
  isLoggedIn: () => boolean;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      session: null,
      
      setSession: (session) => set({ session }),
      
      clearSession: () => set({ session: null }),
      
      isLoggedIn: () => !!get().session?.customerId,
    }),
    {
      name: 'customer-session',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
