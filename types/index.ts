export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string;
  image?: string;
  stock?: number;
  is_available?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
}

export interface Discount {
  type: 'percent' | 'fixed';
  value: number;
  amount: number; // Nilai rupiah diskon
  code?: string;
  description: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'qris';
  createdAt: Date;
  customerId?: string;
}
