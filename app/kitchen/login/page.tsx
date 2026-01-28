'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/store/toastStore';

export default function KitchenLoginPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      addToast('Kitchen Access Granted', 'success');
      router.push('/a2l0Y2hlbg==');
    } catch (error: any) {
      addToast(error.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <ChefHat className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Kitchen Login</h1>
          <p className="text-gray-400 text-sm mt-2">Authorized personnel only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-white placeholder:text-gray-600"
              placeholder="kitchen@mycafe.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-white placeholder:text-gray-600"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <Lock className="w-4 h-4" /> Access Kitchen
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
