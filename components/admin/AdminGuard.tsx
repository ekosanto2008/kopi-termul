'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip checking for login page itself
    if (pathname === '/admin/login') {
      setAuthorized(true);
      setLoading(false);
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.replace('/admin/login');
        } else {
          setAuthorized(true);
        }
      } catch (error) {
        console.error('Auth Check Error:', error);
        router.replace('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Only render children if authorized (or if we are on login page)
  if (!authorized && pathname !== '/admin/login') {
    return null; 
  }

  return <>{children}</>;
}
