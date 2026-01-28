// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ChefHat, CheckCircle, Clock, Settings, X, Power } from 'lucide-react';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
}

interface KitchenOrder {
  id: string;
  created_at: string;
  kitchen_status: string; // pending, cooking, ready
  customers: {
    name: string;
    phone: string;
  } | null;
  items?: OrderItem[];
}

interface Product {
  id: string;
  name: string;
  is_available: boolean;
  category_id: string;
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenuManager, setShowMenuManager] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    const interval = setInterval(fetchOrders, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, is_available, category_id').order('name');
    if (data) setProducts(data);
  };

  const toggleAvailability = async (productId: string, currentStatus: boolean) => {
    // Optimistic update
    setProducts(products.map(p => p.id === productId ? { ...p, is_available: !currentStatus } : p));
    
    await supabase.from('products').update({ is_available: !currentStatus }).eq('id', productId);
  };

  const fetchOrders = async () => {
    try {
      // Fetch Orders that are NOT served yet AND are PAID (for self-order safety)
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, kitchen_status, payment_status,
          customers (name, phone)
        `)
        .in('kitchen_status', ['pending', 'cooking'])
        .eq('payment_status', 'paid') // Only show PAID orders in Kitchen
        .order('created_at', { ascending: true }); // Oldest first

      if (error) throw error;

      // Fetch Items for these orders
      const ordersWithItems = await Promise.all(ordersData.map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('id, product_name, quantity')
          .eq('order_id', order.id);
        
        // Fix for Vercel Build: Handle Supabase join array/object mismatch
        const customerData = Array.isArray(order.customers) ? order.customers[0] : order.customers;

        return { 
          ...order, 
          customers: customerData,
          items: items || [] 
        };
      }));

      // Double cast to bypass strict type check on Vercel
      setOrders(ordersWithItems as unknown as KitchenOrder[]);
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase
      .from('orders')
      .update({ kitchen_status: status })
      .eq('id', orderId);
    
    // Refresh local state immediately
    if (status === 'ready') {
      // Remove from list (or move to completed section)
      setOrders(orders.filter(o => o.id !== orderId));
    } else {
      setOrders(orders.map(o => o.id === orderId ? { ...o, kitchen_status: status } : o));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold">Kitchen Display System</h1>
          </div>
          <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium">
            Active Orders: {orders.length}
          </div>
          <button
            onClick={() => setShowMenuManager(true)}
            className="ml-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Manage Menu
          </button>
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors border border-red-900/50"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Menu Manager Modal */}
        {showMenuManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-gray-700">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800 rounded-t-2xl">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-500" />
                  Menu Availability
                </h2>
                <button 
                  onClick={() => setShowMenuManager(false)}
                  className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-2">
                {products.length === 0 && <p className="text-gray-500 text-center">No products found.</p>}
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all
                      ${product.is_available 
                        ? 'bg-gray-800 border-gray-700' 
                        : 'bg-gray-900/50 border-gray-800 opacity-75'}
                    `}
                  >
                    <div>
                      <h3 className={`font-bold ${product.is_available ? 'text-white' : 'text-gray-500 line-through decoration-gray-600'}`}>
                        {product.name}
                      </h3>
                      <p className={`text-xs ${product.is_available ? 'text-green-400' : 'text-red-500'}`}>
                        {product.is_available ? 'Available' : 'Unavailable'}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => toggleAvailability(product.id, product.is_available ?? true)}
                      className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${
                        product.is_available ? 'bg-green-600 justify-end' : 'bg-gray-600 justify-start'
                      }`}
                    >
                      <div className="w-6 h-6 bg-white rounded-full shadow-md" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
              <CheckCircle className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-xl font-medium">All caught up!</p>
              <p className="text-sm">No pending orders.</p>
            </div>
          ) : (
            orders.map((order) => (
              <div 
                key={order.id} 
                className={`rounded-xl overflow-hidden border-2 flex flex-col
                  ${order.kitchen_status === 'cooking' 
                    ? 'bg-gray-800 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                    : 'bg-gray-800 border-gray-700'}
                `}
              >
                {/* Header */}
                <div className={`p-4 flex justify-between items-start
                   ${order.kitchen_status === 'cooking' ? 'bg-amber-900/30' : 'bg-gray-750'}
                `}>
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      {order.customers?.name || 'Guest'}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      #{order.id.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold bg-gray-700 px-2 py-1 rounded text-gray-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="p-4 flex-1 space-y-3">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="bg-gray-700 text-white w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-sm font-bold">
                        {item.quantity}
                      </span>
                      <span className="text-gray-200 text-sm font-medium leading-tight pt-0.5">
                        {item.product_name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer / Actions */}
                <div className="p-4 border-t border-gray-700">
                  {order.kitchen_status === 'pending' ? (
                    <button
                      onClick={() => updateStatus(order.id, 'cooking')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ChefHat className="w-5 h-5" />
                      Start Cooking
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(order.id, 'ready')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Mark Ready
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
