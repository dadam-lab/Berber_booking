import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: Parse caption stored as "[Category] Title"
function parseCaption(captionRaw?: string): { category: string; title: string } {
  if (!captionRaw) {
    return { category: 'Střihy', title: 'Ukázka práce' };
  }
  const match = captionRaw.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    return {
      category: match[1] || 'Střihy',
      title: match[2] || 'Ukázka práce',
    };
  }
  return {
    category: 'Střihy',
    title: captionRaw,
  };
}

// Helper: Format title + category into single caption string for DB
function formatCaption(title?: string, category?: string): string {
  const cleanTitle = (title || 'Ukázka práce').trim();
  const cleanCategory = (category || 'Střihy').trim();
  return `[${cleanCategory}] ${cleanTitle}`;
}

// Helper: Upload base64 image to Supabase Storage if needed
async function ensurePublicStorageUrl(rawUrl: string): Promise<string> {
  if (!rawUrl || !rawUrl.startsWith('data:image/')) {
    return rawUrl;
  }

  try {
    const matches = rawUrl.match(/^data:(image\/[a-zA-Z0-9+-]+);base64,(.+)$/);
    if (!matches) return rawUrl;

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = mimeType.split('/')[1] || 'jpg';
    const fileName = `gallery_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('gallery')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Gallery Base64 Auto-Upload Error]:', uploadError);
      return rawUrl;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('gallery')
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || rawUrl;
  } catch (err) {
    console.error('[Gallery ensurePublicStorageUrl Exception]:', err);
    return rawUrl;
  }
}

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

    const formattedGallery = (data || []).map((item) => {
      const { category, title } = parseCaption(item.caption);
      return {
        id: item.id,
        image_url: item.image_url,
        imageUrl: item.image_url,
        caption: item.caption,
        title,
        category,
        order_index: item.order_index,
        created_at: item.created_at,
      };
    });

    return NextResponse.json(
      { gallery: formattedGallery },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
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

      const itemsToInsert = await Promise.all(
        body.gallery.map(async (item: any, idx: number) => {
          const rawUrl = item.imageUrl || item.image_url;
          const publicUrl = await ensurePublicStorageUrl(rawUrl);
          const rawTitle = item.title || item.caption || 'Ukázka práce';
          const rawCategory = item.category || 'Střihy';
          const captionStr = formatCaption(rawTitle, rawCategory);

          return {
            image_url: publicUrl,
            caption: captionStr,
            order_index: idx + 1,
          };
        })
      );

      const { data, error } = await supabaseAdmin
        .from('gallery')
        .insert(itemsToInsert)
        .select();

      if (error) {
        console.error('[Gallery Batch POST Error]:', error);
        return NextResponse.json({ error: 'Chyba při ukládání galerie.' }, { status: 500 });
      }

      const formattedData = (data || []).map((item) => {
        const { category, title } = parseCaption(item.caption);
        return {
          id: item.id,
          image_url: item.image_url,
          imageUrl: item.image_url,
          caption: item.caption,
          title,
          category,
          order_index: item.order_index,
        };
      });

      return NextResponse.json({ success: true, gallery: formattedData });
    }

    const { image_url, imageUrl, caption, title, category, order_index } = body;
    const rawUrl = imageUrl || image_url;

    if (!rawUrl) {
      return NextResponse.json({ error: 'URL obrázku je povinná.' }, { status: 400 });
    }

    const publicUrl = await ensurePublicStorageUrl(rawUrl);
    const captionStr = formatCaption(title || caption, category);

    const { data, error } = await supabaseAdmin
      .from('gallery')
      .insert({
        image_url: publicUrl,
        caption: captionStr,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[Gallery POST Error]:', error);
      return NextResponse.json({ error: 'Chyba při ukládání obrázku.' }, { status: 500 });
    }

    const parsed = parseCaption(data.caption);
    const formattedItem = {
      id: data.id,
      image_url: data.image_url,
      imageUrl: data.image_url,
      caption: data.caption,
      title: parsed.title,
      category: parsed.category,
      order_index: data.order_index,
    };

    return NextResponse.json({ success: true, item: formattedItem });
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
