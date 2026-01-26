'use client';

import { useState, useEffect } from 'react';
import { useCustomerStore } from '@/store/customerStore';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Minus, Plus, Loader2, ShoppingBag, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    snap: any;
  }
}

export default function CartPage() {
  const router = useRouter();
  const { session } = useCustomerStore();
  const { items, updateQuantity, removeFromCart, getTotal, clearCart, discount, setDiscount } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  const checkNewMemberPromo = async () => {
    // 1. Check if user has previous orders
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', session!.customerId)
      .eq('payment_status', 'paid'); // Only count paid orders

    // If no paid orders, they are eligible
    if (count === 0) {
      // 2. Get Store Settings
      const { data: settings } = await supabase
        .from('store_settings')
        .select('*')
        .single();

      if (settings?.new_member_promo_active) {
        setDiscount({
          type: settings.new_member_discount_type,
          value: settings.new_member_discount_value,
          amount: 0,
          code: 'NEWMEMBER',
          description: 'New Member Promo'
        });
      }
    }
  };

  // Check New Member Promo on Load
  useEffect(() => {
    if (!session || items.length === 0) return;
    
    // Only run if no discount is currently applied
    if (!discount) {
      checkNewMemberPromo();
    }
  }, [session, items.length]); // Run when session loads or items change (e.g. cart not empty)

  // Load Midtrans Snap Script
  useEffect(() => {
    const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
    const script = document.createElement('script');
    script.src = snapScript;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePaymentSafe = async () => {
    if (!session) return;
    setIsProcessing(true);

    try {
      const finalAmount = getTotal(); // This INCLUDES tax and discount
      
      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          total_amount: items.reduce((acc, item) => acc + item.price * item.quantity, 0),
          tax_amount: 0, // Placeholder
          discount_amount: 0, // Placeholder
          final_amount: finalAmount,
          payment_method: 'qris_online',
          payment_status: 'pending',
          customer_id: session.customerId,
          voucher_code: discount?.code || null,
        })
        .select()
        .single();

      if (error) throw error;

      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      await supabase.from('order_items').insert(orderItems);

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.id,
          totalAmount: finalAmount,
          customerDetails: {
            name: session.name,
            phone: session.phone,
          },
          items: items,
        }),
      });

      const { token } = await response.json();

      window.snap.pay(token, {
        onSuccess: async () => {
          await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderData.id);
          clearCart();
          router.push(`/menu/status/${orderData.id}`);
        },
        onPending: () => {
          clearCart();
          router.push(`/menu/status/${orderData.id}`);
        },
        onError: () => {
          alert('Payment Failed');
          setIsProcessing(false);
        },
        onClose: () => {
          setIsProcessing(false);
        }
      });

    } catch (e) {
      console.error(e);
      alert('System Error');
      setIsProcessing(false);
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode) return;
    setIsApplyingVoucher(true);
    setVoucherError('');

    try {
      const { data: voucher, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !voucher) {
        setVoucherError('Invalid voucher code');
        setDiscount(null);
      } else {
        if (getTotal() < voucher.min_purchase) {
          setVoucherError(`Min purchase Rp ${voucher.min_purchase.toLocaleString('id-ID')}`);
          setDiscount(null);
        } else {
          setDiscount({
            type: voucher.type,
            value: voucher.value,
            amount: 0, 
            code: voucher.code,
            description: voucher.code
          });
          setVoucherCode('');
        }
      }
    } catch (err) {
      setVoucherError('Error checking voucher');
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setDiscount(null);
    setVoucherCode('');
    // Try to restore new member promo if eligible
    checkNewMemberPromo();
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
        <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Your Cart is Empty</h2>
          <p className="text-gray-500 text-sm mt-2 mb-6">Looks like you haven't ordered anything yet.</p>
          <button 
            onClick={() => router.back()}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-700"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex justify-center">
      <div className="w-full max-w-md bg-gray-50 min-h-screen shadow-2xl relative pb-64">
        <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Order Summary</h1>
        </div>

        <div className="p-4 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 flex gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
                <p className="text-amber-600 font-bold text-sm mt-1">
                  Rp {item.price.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm w-4 text-center text-gray-900">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="w-full max-w-md bg-white border-t border-gray-100 p-4 space-y-4 shadow-top pointer-events-auto">
            
            {/* Voucher Input - Always Visible */}
            <div className="flex flex-col gap-2">
              {/* Active Discount Info */}
              {discount && (
                <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-bold text-green-700">Discount Applied</p>
                      <p className="text-xs text-green-600">{discount.description || discount.code}</p>
                    </div>
                  </div>
                  <button onClick={removeVoucher} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Input Field (Disable logic removed so user can overwrite) */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Enter Voucher Code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none uppercase text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <button 
                  onClick={handleApplyVoucher}
                  disabled={isApplyingVoucher || !voucherCode}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isApplyingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
              {voucherError && <p className="text-xs text-red-500 ml-1">{voucherError}</p>}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>Rp {items.reduce((acc, item) => acc + item.price * item.quantity, 0).toLocaleString('id-ID')}</span>
              </div>
              
              {discount && (
                 <div className="flex justify-between text-green-600 font-medium">
                   <span>Discount</span>
                   <span>- Rp {(items.reduce((acc, item) => acc + item.price * item.quantity, 0) - (getTotal() / 1.11)).toLocaleString('id-ID', {maximumFractionDigits: 0})}</span>
                 </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Tax (11%)</span>
                <span>Rp {(getTotal() - (getTotal() / 1.11)).toLocaleString('id-ID', {maximumFractionDigits: 0})}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-100">
                <span>Total Payment</span>
                <span>Rp {getTotal().toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button 
              onClick={handlePaymentSafe}
              disabled={isProcessing}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Pay Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
