import { NextResponse } from 'next/server';
import { updateStatus, getNotionConnection } from '@/lib/notion';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    // 2. Perform status updates in their respective database
    await updateStatus(connection, id, 'Approved');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('❌ POST /api/approve/[id] error:', e.message);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
