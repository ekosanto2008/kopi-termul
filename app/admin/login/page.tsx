'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/store/toastStore';

export default function AdminLoginPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      addToast('Login successful', 'success');
      router.push('/admin');
    } catch (error: any) {
      addToast(error.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      addToast('Please enter your email', 'error');
      return;
    }
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/update-password`,
      });

      if (error) throw error;

      addToast('Check your email for the reset link!', 'success');
      setIsResetMode(false);
    } catch (error: any) {
      addToast(error.message || 'Failed to send reset email', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isResetMode ? 'Reset Password' : 'Admin Login'}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {isResetMode ? 'Enter email to receive reset link' : 'Restricted access only'}
          </p>
        </div>

        <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-gray-900"
              required
            />
          </div>

          {!isResetMode && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button 
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                >
                  Forgot Password?
                </button>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-gray-900"
                required
              />
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isResetMode ? 'Send Reset Link' : 'Login')}
          </button>

          {isResetMode && (
            <button
              type="button"
              onClick={() => setIsResetMode(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Back to Login
            </button>
          )}
        </form>

      </div>
    </div>
  );
}
