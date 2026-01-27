import { createClient } from '@supabase/supabase-js';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = (envUrl && envUrl.length > 0) ? envUrl : 'https://placeholder.supabase.co';
const supabaseKey = (envKey && envKey.length > 0) ? envKey : 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);
