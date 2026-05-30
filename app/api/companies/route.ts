import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies, getCompaniesByStatus, updateStatus } from '@/lib/notion';

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

export async function POST(req: NextRequest) {
  try {
    const { notionId, status, notes } = await req.json();
    if (!notionId || !status) {
      return NextResponse.json({ error: 'Missing notionId or status' }, { status: 400 });
    }
    await updateStatus(notionId, status, notes);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
