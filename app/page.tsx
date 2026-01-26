'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCustomerStore } from '@/store/customerStore';
import { Coffee, User, Phone, MapPin, Loader2, ShoppingBag } from 'lucide-react';

export default function CustomerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useCustomerStore((state) => state.setSession);
  const isLoggedIn = useCustomerStore((state) => state.isLoggedIn);

  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [table, setTable] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check URL for table param
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      setTable(tableParam);
    }
    
    // If already logged in, redirect to menu
    if (isLoggedIn()) {
      router.push('/menu');
    }
  }, [searchParams, isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate: Table is required only for Dine In
    if (!name || !phone) return;
    if (orderType === 'dine-in' && !table) return;

    setIsLoading(true);

    try {
      // 1. Check or Create Customer
      let customerId = '';
      
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('phone', phone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update name if changed? For now keep existing or update
      } else {
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({ name, phone, points: 0 })
          .select()
          .single();
          
        if (createError) throw createError;
        customerId = newCustomer.id;
      }

      // 2. Save Session
      setSession({
        customerId,
        name,
        phone,
        tableNumber: orderType === 'takeaway' ? 'Takeaway' : table,
        orderType
      });

      // 3. Redirect to Menu
      router.push('/menu');

    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Kopi Termul</h1>
          <p className="text-gray-500 text-sm">Please fill in your details to order.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Order Type Toggle */}
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button
              type="button"
              onClick={() => setOrderType('dine-in')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2
                ${orderType === 'dine-in' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              <Coffee className="w-4 h-4" /> Dine In
            </button>
            <button
              type="button"
              onClick={() => setOrderType('takeaway')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2
                ${orderType === 'takeaway' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              <ShoppingBag className="w-4 h-4" /> Takeaway
            </button>
          </div>

          {/* Table Number (Only for Dine In) */}
          {orderType === 'dine-in' && (
            <div className="space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Table Number</label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-gray-900 font-medium bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Your Name</label>
            <div className="relative">
              <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-gray-900 font-medium bg-gray-50 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">WhatsApp Number</label>
            <div className="relative">
              <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-gray-900 font-medium bg-gray-50 focus:bg-white"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-amber-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Ordering'}
          </button>

        </form>
      </div>
      
      <p className="mt-8 text-xs text-gray-400 text-center">
        Powered by MyCafePOS
      </p>
    </main>
  );
}
