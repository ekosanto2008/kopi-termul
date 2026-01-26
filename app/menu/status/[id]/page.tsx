'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Clock, ChefHat, Bell, ArrowLeft, Wallet } from 'lucide-react';

declare global {
  interface Window {
    snap: any;
  }
}

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Polling for Realtime Status
  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000); // Poll every 5s
    
    // Load Midtrans Script
    const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
    const script = document.createElement('script');
    script.src = snapScript;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    document.body.appendChild(script);

    return () => {
      clearInterval(interval);
      document.body.removeChild(script);
    };
  }, []);

  const handleRepay = () => {
    if (!order?.snap_token) return;
    
    window.snap.pay(order.snap_token, {
      onSuccess: async () => {
        await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);
        fetchOrder(); // Refresh status
      },
      onPending: () => {
        // Stay on page
      },
      onError: () => {
        alert('Payment Failed');
      }
    });
  };

  const fetchOrder = async () => {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderData) {
      setOrder(orderData);
      // Fetch Items only once if not loaded
      if (items.length === 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);
        if (itemsData) setItems(itemsData);
      }
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  // Determine current step
  const getStepStatus = (step: string) => {
    const status = order.kitchen_status || 'pending';
    
    if (status === 'served') return 'completed';
    
    if (step === 'received') {
      return 'active'; // Always active/completed once created
    }
    if (step === 'cooking') {
      if (status === 'cooking' || status === 'ready') return 'active';
      return 'inactive';
    }
    if (step === 'ready') {
      if (status === 'ready') return 'active';
      return 'inactive';
    }
    return 'inactive';
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex justify-center">
      <div className="w-full max-w-md bg-gray-50 min-h-screen shadow-2xl relative pb-10">
      
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center gap-4">
        <button onClick={() => router.push('/menu')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Track Order</h1>
      </div>

      {/* Status Card */}
      <div className="bg-white m-4 p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-amber-600">
            Order #{orderId.slice(0, 5)}
          </h2>
          <div className="flex justify-center gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              order.payment_status === 'paid' 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {order.payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Estimated time: 10-15 mins
          </p>
        </div>

        {/* Stepper */}
        <div className="flex justify-between items-start relative px-2">
          {/* Connector Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 -z-0 mx-8"></div>
          
          {/* Step 1: Received */}
          <div className="flex flex-col items-center relative z-10 w-20">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500
              ${getStepStatus('received') === 'active' ? 'bg-green-100 border-green-500 text-green-600' : 'bg-white border-gray-200 text-gray-300'}
            `}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className={`text-xs mt-2 font-bold ${getStepStatus('received') === 'active' ? 'text-green-700' : 'text-gray-300'}`}>Received</p>
          </div>

          {/* Step 2: Cooking */}
          <div className="flex flex-col items-center relative z-10 w-20">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500
              ${getStepStatus('cooking') === 'active' ? 'bg-amber-100 border-amber-500 text-amber-600' : 'bg-white border-gray-200 text-gray-300'}
            `}>
              <ChefHat className="w-5 h-5" />
            </div>
            <p className={`text-xs mt-2 font-bold ${getStepStatus('cooking') === 'active' ? 'text-amber-700' : 'text-gray-300'}`}>Cooking</p>
          </div>

          {/* Step 3: Ready */}
          <div className="flex flex-col items-center relative z-10 w-20">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500
              ${getStepStatus('ready') === 'active' ? 'bg-blue-100 border-blue-500 text-blue-600' : 'bg-white border-gray-200 text-gray-300'}
            `}>
              <Bell className="w-5 h-5" />
            </div>
            <p className={`text-xs mt-2 font-bold ${getStepStatus('ready') === 'active' ? 'text-blue-700' : 'text-gray-300'}`}>Ready</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="m-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-800">Order Details</h3>
        </div>
        <div className="p-4 space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded text-xs font-bold">
                  {item.quantity}x
                </span>
                <span className="text-sm font-medium text-gray-800">{item.product_name}</span>
              </div>
              <span className="text-sm text-gray-500">
                Rp {(item.price * item.quantity).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
          
          <div className="pt-4 mt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gray-900">Total Bill</span>
              <span className="font-bold text-xl text-amber-600">
                Rp {order.final_amount.toLocaleString('id-ID')}
              </span>
            </div>

            {order.payment_status === 'pending' && order.snap_token && (
              <button 
                onClick={handleRepay}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Bayar Sekarang
              </button>
            )}
          </div>
        </div>
      </div>

      {order.kitchen_status === 'ready' && (
        <div className="fixed bottom-4 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-md bg-green-600 text-white p-4 rounded-xl shadow-xl flex items-center justify-between animate-bounce pointer-events-auto">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6" />
              <div>
                <p className="font-bold">Pesanan Siap!</p>
                <p className="text-xs text-green-100">Silakan ambil di counter.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
