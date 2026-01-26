'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Skip checking for login page itself
    if (pathname === '/admin/login') {
      setAuthorized(true);
      return;
    }

    const checkAuth = () => {
      // Simple check for MVP
      const session = localStorage.getItem('admin_session');
      
      if (!session) {
        router.push('/admin/login');
      } else {
        setAuthorized(true);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return <>{children}</>;
}
