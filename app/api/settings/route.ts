import { NextResponse } from 'next/server';
import { supabaseAdmin, getSettingsMap } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Fetch all key-value settings
export async function GET() {
  try {
    const settings = await getSettingsMap();
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Batch update settings
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Neplatná struktura nastavení.' }, { status: 400 });
    }

    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from('settings').upsert(updates, { onConflict: 'key' });

    if (error) {
      console.error('[Settings POST Error]:', error);
      return NextResponse.json({ error: 'Chyba při ukládání nastavení v Supabase.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Nastavení bylo úspěšně aktualizováno.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
