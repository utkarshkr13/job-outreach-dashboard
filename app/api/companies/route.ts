import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies, getCompaniesByStatus } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  try {
    const companies = status
      ? await getCompaniesByStatus(status as any)
      : await getAllCompanies();
    return NextResponse.json(companies);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
