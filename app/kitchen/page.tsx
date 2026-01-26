// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ChefHat, CheckCircle, Clock } from 'lucide-react';

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

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

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
        </header>

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
