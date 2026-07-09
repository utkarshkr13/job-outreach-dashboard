import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Lightweight health/readiness check. Reports whether each external
 * integration has its required configuration present — it does NOT make
 * live calls to Notion/Gmail/Firebase (keeps this endpoint fast, free, and
 * safe to hit frequently from uptime monitors).
 */
export async function GET() {
  const checks = {
    firebase: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    notionPlatformFallback: !!(process.env.NOTION_API_KEY && process.env.NOTION_DB_ID),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    gmailPlatformOAuth: !!(process.env.GMAIL_PLATFORM_CLIENT_ID && process.env.GMAIL_PLATFORM_CLIENT_SECRET),
    blobStorage: !!process.env.BLOB_READ_WRITE_TOKEN,
    cronSecretConfigured: !!process.env.CRON_SECRET,
    demoMode: process.env.NEXT_PUBLIC_APP_MODE === 'demo',
  };

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks,
  });
}
