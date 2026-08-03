import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Fetch gallery photos
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('gallery')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[Gallery GET Error]:', error);
      return NextResponse.json({ gallery: [], error: error.message });
    }

    return NextResponse.json(
      { gallery: data || [] },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    console.error('[Gallery GET Exception]:', err);
    return NextResponse.json({ gallery: [], error: err.message });
  }
}

// POST: Add or Sync batch gallery photos
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Batch sync gallery
    if (Array.isArray(body.gallery)) {
      // First clear old items
      await supabaseAdmin.from('gallery').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (body.gallery.length === 0) {
        return NextResponse.json({ success: true, gallery: [] });
      }

      const itemsToInsert = body.gallery.map((item: any, idx: number) => ({
        image_url: item.imageUrl || item.image_url,
        caption: item.title || item.caption || '',
        order_index: idx + 1,
      }));

      const { data, error } = await supabaseAdmin
        .from('gallery')
        .insert(itemsToInsert)
        .select();

      if (error) {
        console.error('[Gallery Batch POST Error]:', error);
        return NextResponse.json({ error: 'Chyba při ukládání galerie.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, gallery: data });
    }

    const { image_url, caption, order_index } = body;

    if (!image_url) {
      return NextResponse.json({ error: 'URL obrázku je povinná.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('gallery')
      .insert({
        image_url,
        caption: caption || '',
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[Gallery POST Error]:', error);
      return NextResponse.json({ error: 'Chyba při ukládání obrázku.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    console.error('[Gallery POST Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove photo
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Chybí ID fotky.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('gallery').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Chyba při mazání z galerie.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Obrázek byl smazán.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
