'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Loader2, Tag, Percent, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';

interface Voucher {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_purchase: number;
  is_active: boolean;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Voucher>>({
    code: '',
    type: 'fixed',
    value: 0,
    min_purchase: 0,
    is_active: true
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const { error } = await supabase
        .from('vouchers')
        .update({ is_active: !voucher.is_active })
        .eq('id', voucher.id);

      if (error) throw error;
      
      // Update local state
      setVouchers(vouchers.map(v => 
        v.id === voucher.id ? { ...v, is_active: !v.is_active } : v
      ));
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this voucher?')) return;
    try {
      const { error } = await supabase.from('vouchers').delete().eq('id', id);
      if (error) throw error;
      setVouchers(vouchers.filter(v => v.id !== id));
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .insert([{
          code: formData.code?.toUpperCase(),
          type: formData.type,
          value: Number(formData.value),
          min_purchase: Number(formData.min_purchase),
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      setVouchers([data, ...vouchers]);
      setIsModalOpen(false);
      setFormData({ code: '', type: 'fixed', value: 0, min_purchase: 0 });
    } catch (error) {
      alert('Failed to create voucher. Code might be duplicate.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Manage Vouchers</h1>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create Voucher
          </button>
        </div>

        {/* List */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="text-center py-10 text-gray-500">Loading vouchers...</div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
              No vouchers created yet.
            </div>
          ) : (
            vouchers.map((voucher) => (
              <div key={voucher.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${voucher.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    <Tag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{voucher.code}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      {voucher.type === 'percent' ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium"><Percent className="w-3 h-3" /> {voucher.value}% OFF</span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 font-medium"><DollarSign className="w-3 h-3" /> Rp {voucher.value.toLocaleString('id-ID')} OFF</span>
                      )}
                      <span className="text-gray-300">|</span>
                      <span>Min spend: Rp {voucher.min_purchase.toLocaleString('id-ID')}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${voucher.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {voucher.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <button onClick={() => handleToggleActive(voucher)} className="text-gray-400 hover:text-amber-600 transition-colors">
                      {voucher.is_active ? <ToggleRight className="w-8 h-8 text-green-500" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </div>
                  <button onClick={() => handleDelete(voucher.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Voucher</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Code</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. SALE50"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none uppercase font-bold text-gray-900"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-gray-900"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="fixed">Fixed (Rp)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <input 
                    type="number" 
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min. Purchase (Rp)</label>
                <input 
                  type="number" 
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
                  value={formData.min_purchase}
                  onChange={e => setFormData({...formData, min_purchase: Number(e.target.value)})}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Voucher'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
