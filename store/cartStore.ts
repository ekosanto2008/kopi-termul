import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product, Customer, Discount } from '@/types';

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  discount: Discount | null;
  
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: Discount | null) => void;
  clearCart: () => void;
  
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTaxAmount: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: null,
      discount: null,
      
      addToCart: (product: Product) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id);
          
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          
          return { items: [...state.items, { ...product, quantity: 1 }] };
        });
      },

      removeFromCart: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.id !== productId),
            };
          }
          
          return {
            items: state.items.map((item) =>
              item.id === productId ? { ...item, quantity } : item
            ),
          };
        });
      },

      setCustomer: (customer) => set({ customer }),
      
      setDiscount: (discount) => set({ discount }),

      clearCart: () => set({ items: [], customer: null, discount: null }),

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getDiscountAmount: () => {
        const { discount, getSubtotal } = get();
        if (!discount) return 0;
        
        if (discount.type === 'fixed') {
          return discount.value;
        } else {
          return getSubtotal() * (discount.value / 100);
        }
      },

      getTaxAmount: () => {
        const { getSubtotal, getDiscountAmount } = get();
        const taxableAmount = Math.max(0, getSubtotal() - getDiscountAmount());
        return taxableAmount * 0.11; // 11% PPN
      },

      getTotal: () => {
        const { getSubtotal, getDiscountAmount, getTaxAmount } = get();
        return Math.max(0, getSubtotal() - getDiscountAmount() + getTaxAmount());
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
