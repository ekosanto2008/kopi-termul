'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Banknote, QrCode, CheckCircle, Loader2, Printer } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useToastStore } from '@/store/toastStore';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from '@/components/pos/Receipt';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { items, customer, discount, getTotal, getSubtotal, getDiscountAmount, getTaxAmount, clearCart } = useCartStore();
  const { closeMobileCart } = useUIStore();
  const { addToast } = useToastStore();
  
  // Recalculate everything to be safe
  const total = getTotal();
  const subtotal = getSubtotal();
  const discountAmt = getDiscountAmount();
  const tax = getTaxAmount();
  const grandTotal = total;

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Receipt State
  const receiptRef = useRef<HTMLDivElement>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('cash');
      setCashReceived('');
      setIsProcessing(false);
      setIsSuccess(false);
      setLastOrder(null);
      setReceiptItems([]);
      fetchStoreSettings();
    }
  }, [isOpen]);

  const fetchStoreSettings = async () => {
    const { data } = await supabase.from('store_settings').select('*').single();
    if (data) setStoreSettings(data);
  };

  const change = paymentMethod === 'cash' ? (Number(cashReceived) - grandTotal) : 0;
  const isCashInsufficient = paymentMethod === 'cash' && (Number(cashReceived) < grandTotal);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const handleProcessPayment = async () => {
    try {
      setIsProcessing(true);

      let customerId = customer?.id;

      // 1. If New Customer, Save to DB first
      if (customer && customer.id === 'new') {
        const { data: newCustomerData, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customer.name,
            phone: customer.phone,
            points: 0 // Start with 0
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomerData.id;
      }

      // 2. Insert into 'orders' table
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: subtotal, // Original amount before discount
          discount_amount: discountAmt,
          tax_amount: tax,
          final_amount: grandTotal, // Amount to pay
          payment_method: paymentMethod,
          payment_status: 'paid',
          cash_received: paymentMethod === 'cash' ? Number(cashReceived) : null,
          change_amount: paymentMethod === 'cash' ? change : null,
          customer_id: customerId, // Link to customer
          voucher_code: null // Todo: Add voucher support later
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Insert into 'order_items' table
      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
      
      setLastOrder(orderData);
      setReceiptItems(items); // Save items for receipt before clearing cart
      setIsProcessing(false);
      setIsSuccess(true);
      
      // Clear cart but keep modal open for printing
      clearCart();

    } catch (error: any) {
      console.error('Payment Error:', error);
      addToast(error.message || 'Transaction Failed! Please try again.', 'error');
      setIsProcessing(false);
    }
  };

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount.toString());
  };

  const handleClose = () => {
    onClose();
    if (isSuccess) {
      closeMobileCart();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Hidden Receipt Component */}
        <div className="hidden">
           {storeSettings && lastOrder && (
             <Receipt 
               ref={receiptRef}
               storeName={storeSettings.store_name}
               storeAddress={storeSettings.store_address}
               orderId={lastOrder.id}
               date={new Date()}
               items={receiptItems}
               subtotal={lastOrder.total_amount}
               discount={lastOrder.discount_amount}
               tax={lastOrder.tax_amount}
               total={lastOrder.final_amount}
               cash={lastOrder.cash_received}
               change={lastOrder.change_amount}
               paymentMethod={lastOrder.payment_method}
               customerName={customer?.name}
             />
           )}
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Payment Successful!</h3>
            <p className="text-gray-500">Order has been placed.</p>
            
            {paymentMethod === 'cash' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 w-full">
                <p className="text-sm text-gray-500">Change</p>
                <p className="text-xl font-bold text-gray-800">
                  Rp {change.toLocaleString('id-ID')}
                </p>
              </div>
            )}

            <div className="flex gap-3 w-full mt-6">
              <button 
                onClick={handleClose}
                className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                   // Hack: We need items to print. Since clearCart() is called, items in store are empty.
                   // Ideally we should have saved 'receiptItems' state.
                   // For now, let's just alert or try to print if ref is ready.
                   // Note: In real implementation, we should store 'receiptData' state upon success.
                   // Let's rely on the hidden Receipt component having the right props if we fixed the state issue.
                   // Actually, I need to fix the state issue first.
                   handlePrint && handlePrint();
                }}
                className="flex-1 py-3 px-4 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Print Struk
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-lg text-gray-800">Checkout</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Total Display */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                <p className="text-3xl font-extrabold text-gray-900">
                  Rp {grandTotal.toLocaleString('id-ID')}
                </p>
                {discount && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    Included Discount: -Rp {discountAmt.toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2
                    ${paymentMethod === 'cash' 
                      ? 'border-amber-600 bg-amber-50 text-amber-700' 
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                    }`}
                >
                  <Banknote className="w-6 h-6" />
                  <span className="font-semibold text-sm">Cash</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('qris')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2
                    ${paymentMethod === 'qris' 
                      ? 'border-amber-600 bg-amber-50 text-amber-700' 
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                    }`}
                >
                  <QrCode className="w-6 h-6" />
                  <span className="font-semibold text-sm">QRIS</span>
                </button>
              </div>

              {/* Payment Details */}
              <div className="min-h-[160px]">
                {paymentMethod === 'cash' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cash Received
                      </label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0"
                        className="w-full text-lg p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                        autoFocus
                      />
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      {[20000, 50000, 100000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => handleQuickCash(amt)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
                        >
                          {amt.toLocaleString('id-ID')}
                        </button>
                      ))}
                      <button
                        onClick={() => handleQuickCash(grandTotal)}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg text-xs font-medium text-amber-700 transition-colors"
                      >
                        Exact
                      </button>
                    </div>

                    {!isCashInsufficient && Number(cashReceived) > 0 && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                        <span className="text-sm text-green-700 font-medium">Change</span>
                        <span className="text-lg font-bold text-green-700">
                          Rp {change.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full space-y-3">
                    <div className="w-40 h-40 bg-gray-200 rounded-xl flex items-center justify-center">
                       <QrCode className="w-20 h-20 text-gray-400" />
                       {/* Placeholder for real QRIS image */}
                    </div>
                    <p className="text-sm text-gray-500">Scan QR Code to pay</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleProcessPayment}
                disabled={isProcessing || (paymentMethod === 'cash' && isCashInsufficient)}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Complete Order
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
