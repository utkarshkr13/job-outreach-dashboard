import { NextResponse } from 'next/server';
import { getAllCompanies, getCompaniesByStatus, updateStatus, getNotionConnection } from '@/lib/notion';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    // 2. Fetch companies from the user-specific Notion database
    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    const companies = status
      ? await getCompaniesByStatus(connection, status as any)
      : await getAllCompanies(connection);
    return NextResponse.json(companies);
  } catch (e: any) {
    console.error('❌ GET /api/companies error:', e.message);
    const isAuthError = e.message.includes('Unauthorized') || e.message.includes('User not found');
    return NextResponse.json({ error: e.message }, { status: isAuthError ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    // 2. Perform status updates in their respective database
    const { notionId, status, notes } = await req.json();
    if (!notionId || !status) {
      return NextResponse.json({ error: 'Missing notionId or status' }, { status: 400 });
    }
    await updateStatus(connection, notionId, status, notes);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('❌ POST /api/companies error:', e.message);
    const isAuthError = e.message.includes('Unauthorized') || e.message.includes('User not found');
    return NextResponse.json({ error: e.message }, { status: isAuthError ? 401 : 500 });
  }
}
