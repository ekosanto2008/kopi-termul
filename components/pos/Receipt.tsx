'use client';

import React from 'react';
import { CartItem } from '@/types';

interface ReceiptProps {
  storeName: string;
  storeAddress: string;
  orderId: string;
  date: Date;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cash?: number | null;
  change?: number | null;
  paymentMethod: string;
  customerName?: string;
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>((props, ref) => {
  return (
    <div ref={ref} className="w-[80mm] p-4 bg-white text-black font-mono text-xs leading-tight">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold uppercase">{props.storeName}</h1>
        <p className="text-[10px] px-4 mt-1">{props.storeAddress}</p>
      </div>

      {/* Meta */}
      <div className="border-b border-black border-dashed pb-2 mb-2">
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{props.date.toLocaleDateString('id-ID')} {props.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex justify-between">
          <span>Order:</span>
          <span>#{props.orderId.slice(0, 8)}</span>
        </div>
        {props.customerName && (
           <div className="flex justify-between">
             <span>Cust:</span>
             <span>{props.customerName}</span>
           </div>
        )}
      </div>

      {/* Items */}
      <div className="border-b border-black border-dashed pb-2 mb-2 space-y-2">
        {props.items.map((item, index) => (
          <div key={index}>
            <div className="font-bold">{item.name}</div>
            <div className="flex justify-between">
              <span>{item.quantity} x {item.price.toLocaleString('id-ID')}</span>
              <span>{(item.quantity * item.price).toLocaleString('id-ID')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{props.subtotal.toLocaleString('id-ID')}</span>
        </div>
        {props.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{props.discount.toLocaleString('id-ID')}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax (11%)</span>
          <span>{props.tax.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-black border-dashed">
          <span>TOTAL</span>
          <span>{props.total.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="border-t border-black border-dashed pt-2 mb-4">
        <div className="flex justify-between">
          <span>Payment</span>
          <span className="uppercase">{props.paymentMethod}</span>
        </div>
        {props.paymentMethod === 'cash' && props.cash && (
          <>
            <div className="flex justify-between">
              <span>Cash</span>
              <span>{props.cash.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Change</span>
              <span>{props.change?.toLocaleString('id-ID')}</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] mt-4">
        <p>Thank you for visiting!</p>
        <p>Powered by MyCafePOS</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
