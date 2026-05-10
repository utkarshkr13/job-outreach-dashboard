import { NextRequest, NextResponse } from 'next/server';
import { updateStatus } from '@/lib/notion';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { reason } = await req.json();
  try {
    const { id } = await params;
    await updateStatus(id, 'Rejected', reason ?? 'Manually rejected');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
