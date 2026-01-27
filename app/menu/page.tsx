'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Category } from '@/types';
import { useCustomerStore } from '@/store/customerStore';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import BottomNav from '@/components/customer/BottomNav';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

export default function MenuPage() {
  const router = useRouter();
  const { session, isLoggedIn, clearSession } = useCustomerStore();
  const { addToCart, items, getTotal, clearCart } = useCartStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/');
      return;
    }
    fetchData();

    // Realtime Subscription for Product Updates (Stock/Availability)
    const channel = supabase
      .channel('menu-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          setProducts((current) =>
            current.map((p) =>
              p.id === payload.new.id ? { ...p, ...payload.new } : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, router]);

  const fetchData = async () => {
    try {
      const { data: catData } = await supabase.from('categories').select('*').order('name');
      const { data: prodData } = await supabase.from('products').select('*'); // Fetch ALL products
      
      if (catData) setCategories([{ id: 'all', name: 'All' }, ...catData]);
      if (prodData) setProducts(prodData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category_id === activeCategory);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      clearSession();
      clearCart();
      router.push('/');
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex justify-center">
      <div className="w-full max-w-md bg-gray-50 min-h-screen shadow-2xl pb-32 relative">
        
        {/* Header */}
        <div className="bg-white p-4 sticky top-0 z-10 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Hi, {session.name}</h1>
              <p className="text-sm text-gray-500">
                {session.orderType === 'takeaway' ? 'Takeaway Order' : `Table ${session.tableNumber}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {session.orderType === 'dine-in' ? (
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm">
                  {session.tableNumber}
                </div>
              ) : (
                <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
                  Takeaway
                </div>
              )}
              <button 
                onClick={handleLogout}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                  ${activeCategory === cat.id 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20' 
                    : 'bg-gray-100 text-gray-600'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product List */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          ) : (
            filteredProducts.map((product) => {
              const isUnavailable = product.is_available === false;
              const isDisabled = isUnavailable;

              return (
                <div 
                  key={product.id}
                  onClick={() => !isDisabled && addToCart(product)}
                  className={`bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 transition-transform h-full flex flex-col relative
                    ${isDisabled ? 'opacity-90 grayscale cursor-not-allowed' : 'active:scale-95 cursor-pointer'}
                  `}
                >
                  {isDisabled && (
                    <div className="absolute inset-0 z-10 bg-white/40 flex items-center justify-center backdrop-blur-[1px]">
                      <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full -rotate-12 shadow-lg">
                        TIDAK TERSEDIA
                      </span>
                    </div>
                  )}
                  <div className="relative h-32 w-full bg-gray-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-amber-50 text-amber-600 p-2 text-center text-xs font-bold">
                        {product.name}
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 min-h-[2.5em] mb-1">
                      {product.name}
                    </h3>
                    <div className="flex justify-between items-end mt-auto">
                      <div>
                        <p className="text-amber-600 font-bold text-sm">
                          {product.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <button 
                        disabled={isDisabled}
                        className="bg-amber-50 text-amber-700 p-2 rounded-lg hover:bg-amber-100 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Cart Button */}
        {items.length > 0 && (
          <div className="fixed bottom-20 left-0 right-0 z-20 flex justify-center px-4">
            <button 
              onClick={() => router.push('/menu/cart')}
              className="w-full max-w-md bg-amber-600 text-white p-4 rounded-xl shadow-xl shadow-amber-600/30 flex justify-between items-center animate-in slide-in-from-bottom-5 active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <span className="font-bold text-sm">{items.reduce((acc, item) => acc + item.quantity, 0)}</span>
                </div>
                <div className="text-left">
                  <p className="text-xs text-amber-100">Total Payment</p>
                  <p className="font-bold text-sm">Rp {getTotal().toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-bold text-sm">
                View Cart <ArrowLeft className="w-4 h-4 rotate-180" />
              </div>
            </button>
          </div>
        )}

        <BottomNav />
      </div>
    </div>
  );
}
