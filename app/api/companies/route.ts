import { NextResponse } from 'next/server';
import { getAllCompanies, getCompaniesByStatus, updateStatus, updateCompanyProperties, getNotionConnection } from '@/lib/notion';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';
import { getErrorMessage } from '@/lib/errors';

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
  } catch (e) {
    console.error('❌ GET /api/companies error:', getErrorMessage(e));
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    // 2. Perform status or property updates in their respective database
    const body = await req.json();
    const { notionId, status, notes, emailSubject, emailDraft, draftNotes } = body;
    
    if (!notionId) {
      return NextResponse.json({ error: 'Missing notionId' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (status !== undefined) updatePayload.emailStatus = status;
    if (notes !== undefined) updatePayload.notes = notes;
    if (emailSubject !== undefined) updatePayload.emailSubject = emailSubject;
    if (emailDraft !== undefined) updatePayload.emailDraft = emailDraft;
    if (draftNotes !== undefined) updatePayload.draftNotes = draftNotes;

    // Support updating any other fields passed
    for (const key of Object.keys(body)) {
      if (!['notionId', 'status', 'notes', 'emailSubject', 'emailDraft', 'draftNotes'].includes(key)) {
        updatePayload[key] = body[key];
      }
    }

    await updateCompanyProperties(connection, notionId, updatePayload);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('❌ POST /api/companies error:', getErrorMessage(e));
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}

export async function PATCH(req: Request) {
  return POST(req);
}
