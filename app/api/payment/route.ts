import { NextResponse } from 'next/server';
import { snap } from '@/lib/midtrans';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { orderId, totalAmount, customerDetails, items } = body;

    // Check Key
    if (!process.env.MIDTRANS_SERVER_KEY) {
      throw new Error('MIDTRANS_SERVER_KEY is missing');
    }

    // 2. Security: Verify Prices from Database
    const itemIds = items.map((i: any) => i.id);
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('id, name, price')
      .in('id', itemIds);

    if (dbError || !dbProducts) {
      throw new Error('Failed to verify product prices');
    }

    // Create a map for fast lookup
    const dbProductMap = new Map(dbProducts.map(p => [p.id, p]));

    // Reconstruct items with SECURE prices
    const midtransItems = items.map((item: any) => {
      const dbProduct = dbProductMap.get(item.id);
      
      if (!dbProduct) {
         throw new Error(`Product ${item.id} not found or unavailable`);
      }

      return {
        id: item.id,
        price: Math.round(dbProduct.price), // Use DB Price!
        quantity: item.quantity,
        name: dbProduct.name.substring(0, 50),
      };
    });

    // Recalculate Totals
    const secureSubtotal = midtransItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    
    // Apply Tax (11% - matching cartStore logic)
    // Note: If you implement discounts later, validate them here too!
    const secureTax = Math.round(secureSubtotal * 0.11);
    const secureTotal = secureSubtotal + secureTax;

    // Add Tax Item for Midtrans display
    if (secureTax > 0) {
      midtransItems.push({
        id: 'TAX',
        price: secureTax,
        quantity: 1,
        name: 'Tax (11%)',
      });
    }

    const parameter = {
      transaction_details: {
        // Append timestamp to order_id for Midtrans ONLY to avoid duplicate ID errors in Sandbox
        // This makes order_id unique even if DB sends the same UUID or we re-use IDs
        order_id: `${orderId}-${Math.floor(Date.now() / 1000)}`,
        gross_amount: secureTotal, // Use the verified total
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: customerDetails.name,
        phone: customerDetails.phone,
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/menu`,
      }
    };

    console.log('Creating Midtrans Transaction:', JSON.stringify(parameter));

    // Create Snap Transaction
    const transaction = await snap.createTransaction(parameter);

    // Save Snap Token to Order
    await supabase
      .from('orders')
      .update({ snap_token: transaction.token })
      .eq('id', orderId);

    return NextResponse.json({ 
      token: transaction.token,
      redirect_url: transaction.redirect_url 
    });

  } catch (error: any) {
    console.error('Midtrans Error:', error);
    // Return detailed error for debugging
    return NextResponse.json({ 
      error: 'Payment creation failed', 
      details: error?.message || JSON.stringify(error) 
    }, { status: 500 });
  }
}
