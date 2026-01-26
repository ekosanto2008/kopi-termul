'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, ShoppingBag, Banknote, Package, TrendingUp, Calendar, ArrowRight, Settings, Ticket, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // 1. Get Today's Date Range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 2. Fetch Orders for Today
      const { data: ordersToday, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, final_amount')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .eq('payment_status', 'paid'); // Only count PAID orders

      if (ordersError) throw ordersError;

      // Calculate Stats
      const totalSales = ordersToday?.reduce((sum, order) => sum + (order.final_amount || order.total_amount), 0) || 0;
      const totalOrders = ordersToday?.length || 0;

      // 3. Fetch Total Products
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // 4. Fetch Recent Orders (Last 5)
      const { data: recent, error: recentError } = await supabase
        .from('orders')
        .select('id, created_at, final_amount, payment_method, payment_status, customers(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      setStats({
        totalSales,
        totalOrders,
        totalProducts: productsCount || 0,
      });
      setRecentOrders(recent || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Logout from Admin?')) {
      localStorage.removeItem('admin_session');
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      router.push('/admin/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="w-7 h-7 text-amber-600" />
              Admin Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">Welcome back, here's what's happening today.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm">
              Open POS
            </Link>
            <Link href="/admin/transactions" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 shadow-sm">
              <Calendar className="w-4 h-4" />
              Transactions
            </Link>
            <Link href="/admin/products" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors flex items-center gap-2 shadow-sm">
              <Package className="w-4 h-4" />
              Manage Products
            </Link>
            <Link href="/admin/vouchers" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors flex items-center gap-2 shadow-sm">
              <Ticket className="w-4 h-4" />
              Vouchers
            </Link>
            <Link href="/admin/settings" className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
              <Settings className="w-5 h-5" />
            </Link>
            <button 
              onClick={handleLogout}
              className="p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Sales Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Sales (Today)</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : `Rp ${stats.totalSales.toLocaleString('id-ID')}`}
              </h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Banknote className="w-6 h-6 text-green-600" />
            </div>
          </div>

          {/* Orders Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Orders (Today)</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.totalOrders}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          {/* Products Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Menu Items</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.totalProducts}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Recent Orders Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Recent Transactions
            </h2>
            {/* Future: Add 'View All' link */}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Payment</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading data...</td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No transactions yet today.</td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-gray-400 text-xs ml-1">
                          {new Date(order.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {order.customers?.name || 'Guest'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        Rp {order.final_amount?.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase
                          ${order.payment_method === 'qris' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                        `}>
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs border border-green-100">
                          {order.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
