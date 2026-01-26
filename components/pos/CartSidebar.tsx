'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import { Trash2, Plus, Minus, ShoppingBag, User, Tag, X, Loader2 } from 'lucide-react';
import CheckoutModal from './CheckoutModal';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types';

export default function CartSidebar() {
  const { 
    items, customer, discount,
    updateQuantity, removeFromCart, 
    setCustomer, setDiscount,
    getSubtotal, getDiscountAmount, getTaxAmount, getTotal 
  } = useCartStore();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Member Lookup State
  const [memberPhone, setMemberPhone] = useState('');
  const [isCheckingMember, setIsCheckingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCheckMember = async () => {
    if (!memberPhone || memberPhone.length < 10) {
      setMemberError('Invalid phone number');
      return;
    }

    setIsCheckingMember(true);
    setMemberError('');

    try {
      // 1. Check if member exists
      const { data: existingMember, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', memberPhone)
        .single();

      if (existingMember) {
        setCustomer(existingMember as Customer);
        setMemberPhone('');
        // Reset discount if any (rules might apply differently for existing)
        setDiscount(null);
      } else {
        // 2. New Member Logic
        // Check Store Settings for New User Promo
        const { data: settings } = await supabase
          .from('store_settings')
          .select('*')
          .single();

        if (settings?.new_member_promo_active) {
          // Create temp customer object (not saved yet, saved on checkout)
          const newCustomer: Customer = {
            id: 'new',
            name: 'New Customer',
            phone: memberPhone,
            points: 0
          };
          setCustomer(newCustomer);
          
          // Apply Discount
          setDiscount({
            type: settings.new_member_discount_type as 'percent' | 'fixed',
            value: settings.new_member_discount_value,
            amount: 0, // calculated dynamically in store
            description: 'New Member Promo'
          });
        } else {
          // New member but no promo
          setCustomer({
            id: 'new',
            name: 'New Customer',
            phone: memberPhone,
            points: 0
          });
        }
        setMemberPhone('');
      }
    } catch (err) {
      console.error('Member check error:', err);
      setMemberError('Error checking member');
    } finally {
      setIsCheckingMember(false);
    }
  };

  const removeMember = () => {
    setCustomer(null);
    setDiscount(null);
    setMemberPhone('');
  };

  // Hydration safety
  if (!isMounted) {
    return null; // or loading skeleton
  }

  const subtotal = getSubtotal();
  const discountAmt = getDiscountAmount();
  const taxAmt = getTaxAmount();
  const total = getTotal();

  return (
    <>
      <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-lg text-gray-800">Current Order</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} items in cart
          </p>
        </div>

        {/* Member Section */}
        <div className="p-4 border-b border-gray-100 bg-white">
          {customer ? (
            <div className="flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-full">
                  <User className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-800">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.phone}</p>
                  {customer.id === 'new' && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">NEW</span>
                  )}
                </div>
              </div>
              <button onClick={removeMember} className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="tel" 
                    placeholder="Member Phone Number"
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckMember()}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
                <button 
                  onClick={handleCheckMember}
                  disabled={isCheckingMember}
                  className="bg-gray-800 hover:bg-black text-white px-3 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isCheckingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                </button>
              </div>
              {memberError && <p className="text-xs text-red-500 px-1">{memberError}</p>}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
              <ShoppingBag className="w-12 h-12 opacity-20" />
              <p>Cart is empty</p>
              <p className="text-xs">Select products to add items</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 text-sm">{item.name}</h4>
                  <p className="text-amber-600 font-bold text-sm mt-1">
                    Rp {item.price.toLocaleString('id-ID')}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-2 bg-gray-50 rounded-md p-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Checkout */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            
            {/* Discount Row */}
            {discount && (
               <div className="flex justify-between text-green-600 font-medium">
                 <div className="flex items-center gap-1">
                   <Tag className="w-3 h-3" />
                   <span>Discount ({discount.description})</span>
                 </div>
                 <span>- Rp {discountAmt.toLocaleString('id-ID')}</span>
               </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Tax (11%)</span>
              <span>Rp {taxAmt.toLocaleString('id-ID')}</span>
            </div>
            
            <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button 
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            disabled={items.length === 0}
          >
            Checkout
          </button>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
      />
    </>
  );
}
