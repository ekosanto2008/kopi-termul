import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const notification = await request.json();
    
    // 1. Extract Notification Data
    const { 
      order_id, 
      transaction_status, 
      fraud_status, 
      status_code, 
      gross_amount, 
      signature_key 
    } = notification;

    console.log('Midtrans Notification Received:', order_id, transaction_status);

    // 2. Verify Signature (Security)
    // Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error('Server Key missing');
      return NextResponse.json({ message: 'Configuration error' }, { status: 500 });
    }

    const payload = order_id + status_code + gross_amount + serverKey;
    const hash = crypto.createHash('sha512').update(payload).digest('hex');

    if (hash !== signature_key) {
      console.error('Invalid Signature Key');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
    }

    // 3. Extract Real UUID from Order ID (UUID-Timestamp)
    // Format sent: UUID-TIMESTAMP (e.g. 123e4567-e89b...-168000000)
    // We need to remove the timestamp suffix
    const orderIdParts = order_id.split('-');
    // Check if the last part is a timestamp (numeric)
    // UUID has 5 parts. Our custom format has 6.
    let dbOrderId = order_id;
    if (orderIdParts.length > 5) {
       orderIdParts.pop(); // Remove timestamp
       dbOrderId = orderIdParts.join('-');
    }

    // 4. Determine Payment Status
    let newStatus = 'pending';

    if (transaction_status === 'capture') {
      if (fraud_status === 'challenge') {
        newStatus = 'challenge';
      } else if (fraud_status === 'accept') {
        newStatus = 'paid';
      }
    } else if (transaction_status === 'settlement') {
      newStatus = 'paid';
    } else if (
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire'
    ) {
      newStatus = 'cancelled';
    } else if (transaction_status === 'pending') {
      newStatus = 'pending';
    }

    // 5. Update Database
    if (newStatus !== 'pending') {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', dbOrderId);

      if (error) {
        console.error('Failed to update order status:', error);
        return NextResponse.json({ message: 'DB Error' }, { status: 500 });
      }
      
      console.log(`Order ${dbOrderId} updated to ${newStatus}`);
    }

    return NextResponse.json({ message: 'OK' });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
