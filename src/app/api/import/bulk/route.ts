import { NextResponse } from 'next/server';
import { importFromCSV, importFromExcel } from '@/lib/import/bulkImport';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    let results;
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      results = await importFromCSV(text);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      results = await importFromExcel(buffer);
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: Array.isArray(results) ? results.length : 0 });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  }
}
