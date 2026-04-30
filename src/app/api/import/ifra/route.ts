import { NextResponse } from 'next/server';
import { syncMaterialWithIfra } from '@/lib/import/ifraLibrary';

export async function POST(request: Request) {
  try {
    const { materialId } = await request.json();
    
    if (!materialId) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });
    }

    const result = await syncMaterialWithIfra(materialId);

    if (result && result.success) {
      return NextResponse.json({ 
        success: true, 
        matchedStandard: result.match?.title,
        limitsSaved: !!result.match?.limits,
        sourceUrl: result.match?.url 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Standard non trovato nella IFRA Library' 
      });
    }
  } catch (error: any) {
    console.error('IFRA Sync API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
