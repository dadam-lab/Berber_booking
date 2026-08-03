import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: List all services
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Services GET Error]:', error);
      return NextResponse.json({ error: 'Chyba načítání služeb.' }, { status: 500 });
    }

    return NextResponse.json(
      { services: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add single service or Batch Sync services array
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Batch Sync Services Array
    if (Array.isArray(body.services)) {
      const incomingServices = body.services;

      const validUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const keepIds: string[] = [];

      for (const srv of incomingServices) {
        const title = srv.name || srv.title;
        const description = srv.description || '';
        const price = Number(srv.price || 0);
        const duration_minutes = Number(srv.durationMinutes || srv.duration_minutes || 30);
        const is_active = srv.active ?? srv.is_active ?? true;

        if (!title) continue;

        if (srv.id && validUuidRegex.test(srv.id)) {
          // Upsert existing service by UUID
          const { data, error } = await supabaseAdmin
            .from('services')
            .upsert({
              id: srv.id,
              title,
              description,
              price,
              duration_minutes,
              is_active,
            })
            .select();

          if (error) {
            console.error('[Services Batch Upsert Error]:', error);
          } else if (data && data.length > 0) {
            keepIds.push(data[0].id);
          }
        } else {
          // Insert new service without temporary ID
          const { data, error } = await supabaseAdmin
            .from('services')
            .insert({
              title,
              description,
              price,
              duration_minutes,
              is_active,
            })
            .select();

          if (error) {
            console.error('[Services Batch Insert Error]:', error);
          } else if (data && data.length > 0) {
            keepIds.push(data[0].id);
          }
        }
      }

      // Safely delete services that were removed in the UI
      if (keepIds.length > 0) {
        const { data: allServices } = await supabaseAdmin.from('services').select('id');
        if (allServices && allServices.length > 0) {
          const idsToDelete = allServices.map((s) => s.id).filter((id) => !keepIds.includes(id));
          if (idsToDelete.length > 0) {
            try {
              await supabaseAdmin.from('services').delete().in('id', idsToDelete);
            } catch (delErr) {
              console.error('[Services Delete Error]:', delErr);
            }
          }
        }
      }

      // Fetch fresh services list from Supabase
      const { data: freshServices, error: fetchErr } = await supabaseAdmin
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchErr) {
        console.error('[Services Fetch Fresh Error]:', fetchErr);
      }

      return NextResponse.json({ success: true, services: freshServices || [] });
    }

    // 2. Single Service Creation
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
      .select();

    if (error) {
      return NextResponse.json({ error: 'Chyba při vytváření služby.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, service: data ? data[0] : null });
  } catch (err: any) {
    console.error('[Services POST Exception]:', err);
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
      .select();

    if (error) {
      console.error('[Services PUT Error]:', error);
      return NextResponse.json({ error: error.message || 'Chyba při úpravě služby.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, service: data ? data[0] : null });
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
