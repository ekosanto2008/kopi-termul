'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/pos/ProductCard';
import CartSidebar from '@/components/pos/CartSidebar';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { ShoppingBag, ChevronUp, X, Loader2, Settings, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Product, Category } from '@/types';
import Link from 'next/link';

export default function POSPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { items, getTotal } = useCartStore();
  const { isMobileCartOpen, openMobileCart, closeMobileCart } = useUIStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch Categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name');
          
        if (categoriesError) throw categoriesError;
        
        // Fetch Products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('is_available', true);
          
        if (productsError) throw productsError;

        if (categoriesData) setCategories([{ id: 'all', name: 'All Menu' }, ...categoriesData]);
        if (productsData) setProducts(productsData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load menu data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter((p) => p.category_id === activeCategory);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
          <p className="text-gray-500 font-medium">Loading Menu...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans relative">
      {/* Left Side: Product Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Header / Category Filter */}
        <header className="bg-white px-4 py-3 md:px-6 md:py-4 shadow-sm z-10">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">My Cafe POS</h1>
            <div className="flex gap-2">
              <Link href="/admin" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors flex items-center gap-2" title="Admin Dashboard">
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm font-medium hidden md:inline">Admin</span>
              </Link>
              <Link href="/admin/settings" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors" title="Settings">
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                  ${activeCategory === cat.id 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </header>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Cart Toggle Button */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30">
          <button 
            onClick={openMobileCart}
            className="w-full bg-amber-600 text-white p-3 rounded-xl shadow-xl shadow-amber-600/30 flex justify-between items-center animate-in slide-in-from-bottom-5 fade-in duration-300"
          >
             <div className="flex items-center gap-3">
               <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                 <ShoppingBag className="w-5 h-5" />
               </div>
               <div className="flex flex-col items-start">
                 <span className="text-xs text-amber-100">{items.length} Items</span>
                 <span className="font-bold text-sm">View Order</span>
               </div>
             </div>
             <div className="flex items-center gap-2 pr-1">
               <span className="font-bold text-lg">Rp {getTotal().toLocaleString('id-ID')}</span>
               <ChevronUp className="w-5 h-5 opacity-80" />
             </div>
          </button>
        </div>
      )}

      {/* Right Side: Cart Sidebar */}
      {/* Overlay Background for Mobile */}
      {isMobileCartOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeMobileCart}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none lg:w-[400px] lg:block flex flex-col
        ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button Header */}
        <div className="lg:hidden p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800">Order Details</h2>
          <button 
            onClick={closeMobileCart}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden h-full">
          <CartSidebar />
        </div>
      </div>
    </main>
  );
}
