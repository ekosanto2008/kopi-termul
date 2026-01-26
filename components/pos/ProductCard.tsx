'use client';

import { Product } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const [imageError, setImageError] = useState(false);

  // Cek apakah ada URL gambar yang valid
  const hasImage = product.image && product.image.trim() !== '';

  return (
    <div 
      onClick={() => addToCart(product)}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden border border-gray-100 flex flex-col h-full"
    >
      <div className="relative h-32 w-full bg-gray-100 overflow-hidden">
        {hasImage && !imageError ? (
          <img
            src={product.image!}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-amber-50 text-amber-600 p-2 text-center select-none">
             <span className="font-bold text-sm leading-tight line-clamp-3">
               {product.name}
             </span>
          </div>
        )}
      </div>
      
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1">
          {product.name}
        </h3>
        <div className="mt-auto">
          <p className="text-amber-600 font-bold">
            Rp {product.price.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-gray-500 capitalize mt-1">
            {product.category_id}
          </p>
        </div>
      </div>
    </div>
  );
}
