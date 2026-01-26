'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface StoreSettings {
  id: number;
  store_name: string;
  store_address: string;
  new_member_promo_active: boolean;
  new_member_discount_type: 'percent' | 'fixed';
  new_member_discount_value: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          store_name: settings.store_name,
          store_address: settings.store_address,
          new_member_promo_active: settings.new_member_promo_active,
          new_member_discount_type: settings.new_member_discount_type,
          new_member_discount_value: settings.new_member_discount_value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex gap-2">
            <Link href="/admin/products" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
              Manage Products
            </Link>
            <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* General Settings */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">General Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                <input
                  type="text"
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Address</label>
                <textarea
                  value={settings.store_address || ''}
                  onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none h-24 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Promo Settings */}
          <div className="p-6 bg-amber-50/50">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              New Member Promo
              {settings.new_member_promo_active ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
              ) : (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactive</span>
              )}
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">Enable Promo</label>
                  <p className="text-sm text-gray-500">Automatically apply discount for new customers</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings.new_member_promo_active}
                    onChange={(e) => setSettings({ ...settings, new_member_promo_active: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {settings.new_member_promo_active && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select
                      value={settings.new_member_discount_type}
                      onChange={(e) => setSettings({ ...settings, new_member_discount_type: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-gray-900"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (Rp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {settings.new_member_discount_type === 'percent' ? 'Percentage Value' : 'Amount Value'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={settings.new_member_discount_value}
                        onChange={(e) => setSettings({ ...settings, new_member_discount_value: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {settings.new_member_discount_type === 'percent' ? '%' : 'Rp'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-t border-gray-100 flex items-center justify-between">
            {message && (
              <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message.text}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ml-auto flex items-center gap-2 bg-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
