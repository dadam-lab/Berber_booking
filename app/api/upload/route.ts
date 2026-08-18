import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const contentTypeHeader = request.headers.get('content-type') || '';

    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string = 'image/jpeg';

    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = (formData.get('file') || formData.get('image')) as File | null;

      if (!file) {
        return NextResponse.json({ error: 'Nebyl přiložen žádný soubor.' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      mimeType = file.type || 'image/jpeg';

      const ext = mimeType.split('/')[1] || 'jpg';
      const cleanOriginalName = file.name ? file.name.replace(/[^a-zA-Z0-9]/g, '_') : 'image';
      fileName = `gallery_${Date.now()}_${cleanOriginalName}.${ext}`;
    } else {
      const body = await request.json();
      const base64Data: string = body.image || body.dataUrl || body.file;

      if (!base64Data) {
        return NextResponse.json({ error: 'Nebyly předány žádné údaje o obrázku.' }, { status: 400 });
      }

      const matches = base64Data.match(/^data:(image\/[a-zA-Z0-9+-]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        fileBuffer = Buffer.from(matches[2], 'base64');
      } else {
        fileBuffer = Buffer.from(base64Data, 'base64');
      }

      const ext = mimeType.split('/')[1] || 'jpg';
      fileName = `gallery_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    }

    // Upload to Supabase Storage 'gallery' bucket
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('gallery')
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Upload API Error]:', uploadError);
      return NextResponse.json(
        { error: `Chyba při nahrávání na Supabase Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('gallery')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json({ error: 'Nepodařilo se získat veřejnou URL fotky.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    });
  } catch (err: any) {
    console.error('[Upload API Exception]:', err);
    return NextResponse.json({ error: err.message || 'Chyba při zpracování fotky.' }, { status: 500 });
  }
}
