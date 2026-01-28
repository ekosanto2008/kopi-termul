'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function KitchenGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip checking for login page itself
    if (pathname === '/a2l0Y2hlbg==/login') {
      setAuthorized(true);
      setLoading(false);
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.replace('/a2l0Y2hlbg==/login');
        } else {
          setAuthorized(true);
        }
      } catch (error) {
        console.error('Auth Check Error:', error);
        router.replace('/a2l0Y2hlbg==/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!authorized && pathname !== '/a2l0Y2hlbg==/login') {
    return null; 
  }

  return <>{children}</>;
}
