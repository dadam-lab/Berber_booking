import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Standard client for browser/client-side queries
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role for server-side API routes & elevated operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper function to fetch settings object from Supabase key-value table
export async function getSettingsMap(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabaseAdmin.from('settings').select('key, value');
    if (error || !data) {
      console.error('Error fetching settings from Supabase:', error);
      return {};
    }
    const map: Record<string, string> = {};
    data.forEach((row) => {
      map[row.key] = row.value;
    });
    return map;
  } catch (err) {
    console.error('Exception in getSettingsMap:', err);
    return {};
  }
}
