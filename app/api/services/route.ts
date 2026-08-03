import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: List active or all services
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Chyba načítání služeb.' }, { status: 500 });
    }

    return NextResponse.json(
      { services: data || [] },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new service
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, price, duration_minutes, is_active } = body;

    if (!title || price === undefined) {
      return NextResponse.json({ error: 'Název a cena služby jsou povinné.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .insert({
        title,
        description: description || '',
        price: Number(price),
        duration_minutes: Number(duration_minutes || 30),
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Chyba při vytváření služby.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, service: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing service
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, description, price, duration_minutes, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Chybí ID služby.' }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined && !isNaN(Number(price))) updateData.price = Number(price);
    if (duration_minutes !== undefined && !isNaN(Number(duration_minutes))) updateData.duration_minutes = Number(duration_minutes);
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Services PUT Error]:', error);
      return NextResponse.json({ error: error.message || 'Chyba při úpravě služby.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, service: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove a service
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Chybí ID služby pro smazání.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('services').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Chyba při mazání služby.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Služba byla smazána.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
