import { NextResponse } from 'next/server';
import { updateStatus, getNotionConnection } from '@/lib/notion';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason;

    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    // 2. Perform status updates in their respective database
    await updateStatus(connection, id, 'Rejected', reason ?? 'Manually rejected');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('❌ POST /api/reject/[id] error:', e.message);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
