'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCustomerStore } from '@/store/customerStore';
import { useRouter } from 'next/navigation';
import { Loader2, ChefHat, CheckCircle, Clock, ChevronRight, Package, Receipt, CreditCard, XCircle } from 'lucide-react';
import BottomNav from '@/components/customer/BottomNav';

declare global {
  interface Window {
    snap: any;
  }
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { session, isLoggedIn } = useCustomerStore();
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/');
      return;
    }
    
    // Load Midtrans Snap Script
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '');
    document.body.appendChild(script);

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => {
      clearInterval(interval);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isLoggedIn, router, session]);

  const fetchOrders = async () => {
    if (!session) return;

    const { data } = await supabase
      .from('orders')
      .select('id, created_at, total_amount, final_amount, kitchen_status, payment_status, snap_token')
      .eq('customer_id', session.customerId)
      .neq('payment_status', 'cancelled') // Hide cancelled orders from active list logic
      .order('created_at', { ascending: false });

    if (data) {
      // Logic: Active if Pending Payment OR Kitchen is working on it
      const active = data.filter(o => 
        o.payment_status === 'pending' || 
        ['pending', 'cooking', 'ready'].includes(o.kitchen_status || 'pending')
      );
      
      const past = data.filter(o => 
        o.payment_status === 'paid' && 
        !['pending', 'cooking', 'ready'].includes(o.kitchen_status || 'pending')
      );
      
      setActiveOrders(active);
      setPastOrders(past);
    }
    setIsLoading(false);
  };

  const handlePay = (snapToken: string) => {
    if (window.snap) {
      window.snap.pay(snapToken, {
        onSuccess: function(result: any){ fetchOrders(); },
        onPending: function(result: any){ fetchOrders(); },
        onError: function(result: any){ alert('Payment failed!'); },
        onClose: function(){ console.log('customer closed the popup without finishing the payment'); }
      });
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    await supabase
      .from('orders')
      .update({ payment_status: 'cancelled', kitchen_status: 'cancelled' })
      .eq('id', orderId);
    
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'cooking': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'served': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'cooking': return <ChefHat className="w-4 h-4" />;
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'served': return <Package className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex justify-center">
      <div className="w-full max-w-md bg-gray-50 min-h-screen shadow-2xl pb-24 relative">
        
        {/* Header */}
        <div className="bg-white p-4 sticky top-0 z-10 shadow-sm mb-4">
          <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
        </div>

        <div className="px-4 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
          ) : (
            <>
              {/* Active Orders */}
              {activeOrders.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Active Orders</h2>
                  {activeOrders.map((order) => (
                    <div 
                      key={order.id}
                      onClick={() => router.push(`/menu/status/${order.id}`)}
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-gray-900">Order #{order.id.slice(0, 5)}</p>
                          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</p>
                        </div>
                        {order.payment_status === 'pending' ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 uppercase bg-amber-50 text-amber-700 border-amber-200">
                            <Clock className="w-3 h-3" /> Unpaid
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 uppercase ${getStatusColor(order.kitchen_status)}`}>
                            {getStatusIcon(order.kitchen_status || 'pending')}
                            {order.kitchen_status || 'Pending'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                        <span className="text-sm font-medium text-gray-600">Total</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-600">Rp {order.final_amount.toLocaleString('id-ID')}</span>
                          
                          {order.payment_status === 'pending' && order.snap_token && (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel(order.id);
                                }}
                                className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors"
                                title="Cancel Order"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePay(order.snap_token);
                                }}
                                className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors flex items-center gap-1"
                              >
                                <CreditCard className="w-3 h-3" /> Pay
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Past Orders */}
              {pastOrders.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">History</h2>
                  {pastOrders.map((order) => (
                    <div 
                      key={order.id}
                      onClick={() => router.push(`/menu/status/${order.id}`)}
                      className="bg-white p-4 rounded-xl border border-gray-100 opacity-70 active:scale-95 transition-transform"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">Order #{order.id.slice(0, 5)}</p>
                          <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-600">Rp {order.final_amount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeOrders.length === 0 && pastOrders.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No orders yet.</p>
                </div>
              )}
            </>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
