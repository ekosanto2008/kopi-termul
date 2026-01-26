'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit, Trash2, Search, Upload, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Product, Category } from '@/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category_id: '',
    image: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: catData } = await supabase.from('categories').select('*').order('name');
      const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });

      if (catData) setCategories(catData);
      if (prodData) setProducts(prodData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setIsEditing(true);
      setFormData(product);
      setPreviewUrl(product.image || '');
    } else {
      setIsEditing(false);
      setFormData({ name: '', price: 0, category_id: categories[0]?.id || '', image: '' });
      setPreviewUrl('');
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      alert('Failed to delete product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let imageUrl = formData.image;

      // 1. Upload Image if new file selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrlData.publicUrl;
      }

      // 2. Save Product Data
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        category_id: formData.category_id,
        image: imageUrl,
      };

      if (isEditing && formData.id) {
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', formData.id)
          .select()
          .single();
          
        if (error) throw error;
        setProducts(products.map(p => p.id === formData.id ? data : p));
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();
          
        if (error) throw error;
        setProducts([data, ...products]);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
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

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
              <p className="text-sm text-gray-500">{products.length} items available</p>
            </div>
          </div>
          
          <div className="flex gap-3">
             <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none w-full md:w-64 text-gray-900 placeholder:text-gray-400"
                />
             </div>
             <button 
               onClick={() => handleOpenModal()}
               className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
             >
               <Plus className="w-5 h-5" />
               Add Product
             </button>
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-amber-50 text-amber-600 flex items-center justify-center p-1">
                               <span className="text-[10px] font-bold text-center leading-none line-clamp-2">
                                 {product.name}
                               </span>
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
                        {product.category_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      Rp {product.price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Image Upload */}
              <div className="flex flex-col items-center justify-center gap-4 mb-6">
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="relative w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all overflow-hidden group"
                 >
                   {previewUrl ? (
                     <>
                       <img 
                         src={previewUrl} 
                         alt="Preview" 
                         className="w-full h-full object-cover"
                       />
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Upload className="w-6 h-6 text-white" />
                       </div>
                     </>
                   ) : (
                     <div className="flex flex-col items-center text-gray-400">
                       <Upload className="w-8 h-8 mb-2" />
                       <span className="text-xs">Upload Image</span>
                     </div>
                   )}
                 </div>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="image/*"
                   onChange={handleImageChange}
                 />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900 placeholder:text-gray-400"
                  placeholder="e.g. Iced Latte"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-gray-900"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditing ? 'Update Product' : 'Create Product')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
