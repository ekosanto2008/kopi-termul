'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, Receipt, UtensilsCrossed } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCustomerStore } from '@/store/customerStore';

export default function BottomNav() {
  const pathname = usePathname();
  const { session } = useCustomerStore();
  const [hasActiveOrder, setHasActiveOrder] = useState(false);

  useEffect(() => {
    if (!session) return;
    
    const checkActive = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', session.customerId)
        .in('kitchen_status', ['pending', 'cooking', 'ready']); // Active statuses
      
      setHasActiveOrder(!!count && count > 0);
    };

    checkActive();
    const interval = setInterval(checkActive, 5000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 flex justify-center">
      <div className="w-full max-w-md flex justify-around items-center h-16">
        
        <Link 
          href="/menu" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1
            ${pathname === '/menu' ? 'text-amber-600' : 'text-gray-400 hover:text-gray-600'}
          `}
        >
          <UtensilsCrossed className="w-6 h-6" />
          <span className="text-[10px] font-medium">Menu</span>
        </Link>

        <Link 
          href="/menu/orders" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative
            ${pathname === '/menu/orders' ? 'text-amber-600' : 'text-gray-400 hover:text-gray-600'}
          `}
        >
          <div className="relative">
            <Receipt className="w-6 h-6" />
            {hasActiveOrder && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </div>
          <span className="text-[10px] font-medium">My Orders</span>
        </Link>

      </div>
    </div>
  );
}
