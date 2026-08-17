import { NextResponse } from 'next/server';
import { getVaccinesStockAction, getVaccineStatsAction } from '@/app/actions/vaccines';

/**
 * GET /api/vaccines
 * Retorna la lista consolidada de vacunas y balances en tiempo real desde la vista `v_vaccines_stock`.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'stats') {
      const stats = await getVaccineStatsAction();
      return NextResponse.json({ success: true, ...stats }, { status: 200 });
    }

    const vaccines = await getVaccinesStockAction();
    return NextResponse.json({ success: true, data: vaccines }, { status: 200 });
  } catch (error) {
    console.error('[API /api/vaccines GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno al consultar vacunas.' },
      { status: 500 }
    );
  }
}
