import { NextResponse } from 'next/server';
import { snap } from '@/lib/midtrans';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, totalAmount, customerDetails, items } = body;

    // Check Key
    if (!process.env.MIDTRANS_SERVER_KEY) {
      throw new Error('MIDTRANS_SERVER_KEY is missing');
    }

    const roundedTotal = Math.round(totalAmount);
    
    // Create Item List
    const midtransItems = items.map((item: any) => ({
      id: item.id,
      price: Math.round(item.price),
      quantity: item.quantity,
      name: item.name.substring(0, 50),
    }));

    // Calculate Item Sum
    const itemsSum = midtransItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);

    // Calculate Tax Difference
    const taxAmount = roundedTotal - itemsSum;

    // Add Tax Item if exists
    if (taxAmount > 0) {
      midtransItems.push({
        id: 'TAX',
        price: taxAmount,
        quantity: 1,
        name: 'Tax & Service',
      });
    }

    const parameter = {
      transaction_details: {
        // Append timestamp to order_id for Midtrans ONLY to avoid duplicate ID errors in Sandbox
        // This makes order_id unique even if DB sends the same UUID or we re-use IDs
        order_id: `${orderId}-${Math.floor(Date.now() / 1000)}`,
        gross_amount: roundedTotal,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: customerDetails.name,
        phone: customerDetails.phone,
      },
      callbacks: {
        finish: "http://localhost:3000/menu",
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
