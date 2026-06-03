import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import type { CompareResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const result = (await request.json()) as CompareResult;

    const mismatches = result.rows.filter((r) => r.status === 'mismatch');
    const matches = result.rows.filter((r) => r.status === 'match');
    const qbOnly = result.rows.filter((r) => r.status === 'qb_only');
    const hsOnly = result.rows.filter((r) => r.status === 'hs_only');

    const toSheet = (rows: typeof result.rows) =>
      rows.map((r) => ({
        Status: r.status,
        SKU: r.sku,
        'Product Family': r.productFamily,
        'Item Name': r.itemName,
        'QB Quantity': r.qbQty ?? '',
        'HubSpot Quantity': r.hsQty ?? '',
        Difference: r.difference ?? '',
        'Abs Difference': r.absDifference ?? '',
        'QB Record ID': r.qbRecordId,
        'HubSpot Record ID': r.hsRecordId,
        'HubSpot Name': r.hsName,
        Notes: r.notes,
      }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Metric: 'Run at', Value: result.summary.runAt },
        { Metric: 'QB compared', Value: result.summary.qbCompared },
        { Metric: 'HubSpot total', Value: result.summary.hsTotal },
        { Metric: 'Matches', Value: result.summary.matches },
        { Metric: 'Mismatches', Value: result.summary.mismatches },
        { Metric: 'QB API calls', Value: result.summary.apiCallsEstimate.quickbase },
        { Metric: 'HubSpot API calls', Value: result.summary.apiCallsEstimate.hubspot },
      ]),
      'Summary'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(toSheet(mismatches)),
      'Mismatches'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(toSheet(qbOnly)),
      'QB Only'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(toSheet(hsOnly)),
      'HubSpot Only'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(toSheet(matches)),
      'Matches'
    );

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="qty-compare-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
