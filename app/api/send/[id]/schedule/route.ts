import { NextResponse } from 'next/server';
import { getCompanyById, getNotionConnection, updateCompanyProperties } from '@/lib/notion';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { getOptimalSendTime } from '@/lib/timing';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    const company = await getCompanyById(connection, id);
    if (!company) {
      return NextResponse.json({ error: 'Company not found in active database.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    let scheduledFor = body.scheduledFor;

    if (!scheduledFor) {
      const optimalDate = getOptimalSendTime(company.location || 'Bangalore');
      scheduledFor = optimalDate.toISOString();
    }

    await updateCompanyProperties(connection, id, {
      emailStatus: 'Scheduled',
      scheduledSendTime: scheduledFor,
    });

    return NextResponse.json({ success: true, scheduledFor });
  } catch (e: any) {
    console.error('❌ POST /api/send/[id]/schedule error:', e.message);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
