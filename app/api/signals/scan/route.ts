import { NextResponse } from 'next/server';
import { getAllCompanies, getNotionConnection, updateCompanyProperties } from '@/lib/notion';
import { db } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/crypto';
import { UserCredentials } from '@/lib/auth-middleware';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') || url.searchParams.get('secret');

  if (process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
      const { getMockCompanies, mockUpdateProperties } = require('@/lib/mockDb');
      const companies = getMockCompanies();
      const uncontacted = companies.filter((c: any) => !['Sent', 'Replied', 'Interview', 'Offer', 'Rejected'].includes(c.emailStatus || ''));
      let hot = 0;
      let caution = 0;

      for (const company of uncontacted) {
        const rand = Math.random();
        if (rand > 0.8) {
          mockUpdateProperties(company.notionId, {
            companySignal: 'Hot',
            signalReason: 'Announced massive Series B funding yesterday to expand engineering squads.',
            signalUpdated: new Date().toISOString().split('T')[0]
          });
          hot++;
        } else if (rand < 0.15) {
          mockUpdateProperties(company.notionId, {
            companySignal: 'Caution',
            signalReason: 'Noted senior executive departures and hiring freeze rumors on LinkedIn boards.',
            signalUpdated: new Date().toISOString().split('T')[0]
          });
          caution++;
        } else {
          mockUpdateProperties(company.notionId, {
            companySignal: 'Normal',
            signalReason: 'Stable hiring velocity, no major updates or layoffs reported.',
            signalUpdated: new Date().toISOString().split('T')[0]
          });
        }
      }
      return NextResponse.json({ success: true, mode: 'demo', hotFlagged: hot, cautionFlagged: caution });
    }

    const usersSnapshot = await db.collection('users')
      .where('settings.cronEnabled', '==', true)
      .get();

    let totalFlagged = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();

      try {
        const credentials = userData.credentials || {};
        const profile = userData.profile || {};

        const creds: UserCredentials = {
          notionApiKey: decrypt(credentials.notionApiKey || ''),
          notionDbId: decrypt(credentials.notionDbId || ''),
          anthropicApiKey: decrypt(credentials.anthropicApiKey || ''),
          gmailUser: credentials.gmailUser || '',
          gmailClientId: decrypt(credentials.gmailClientId || '') || process.env.GMAIL_PLATFORM_CLIENT_ID || '',
          gmailClientSecret: decrypt(credentials.gmailClientSecret || '') || process.env.GMAIL_PLATFORM_CLIENT_SECRET || '',
          gmailRefreshToken: decrypt(credentials.gmailRefreshToken || ''),
          senderName: profile.senderName || userData.name || 'Anonymous',
          senderPhone: profile.phone || '',
          senderLinkedin: profile.linkedin || '',
          senderBio: profile.bio || '',
          targetRoles: profile.targetRoles || 'Associate PM or Business Analyst',
          resumeBlobUrl: userData.resumeBlobUrl || '',
        };

        if (!creds.notionApiKey || !creds.notionDbId || !creds.anthropicApiKey) continue;

        const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);
        const companies = await getAllCompanies(connection);
        const uncontacted = companies.filter(c => !['Sent', 'Replied', 'Interview', 'Offer', 'Rejected'].includes(c.emailStatus || ''));

        const client = new Anthropic({ apiKey: creds.anthropicApiKey });

        for (const company of uncontacted) {
          try {
            // Simple public news sweep using standard free feed fetch
            let newsSnippet = '';
            try {
              const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(company.company + ' hiring layoffs funding')}&hl=en-IN&gl=IN&ceid=IN:en`;
              const feedRes = await fetch(feedUrl);
              if (feedRes.ok) {
                const xml = await feedRes.text();
                // Simple regex to extract news titles from RSS XML
                const titles = [...xml.matchAll(/<title>([\s\S]*?)<\/title>/g)]
                  .slice(1, 4)
                  .map(m => m[1])
                  .join(' | ');
                newsSnippet = titles.slice(0, 1000);
              }
            } catch (err) {
              console.warn(`[SIGNALS] Failed to fetch RSS feed for ${company.company}:`, err);
            }

            if (!newsSnippet) {
              newsSnippet = `Hiring status and active recruitment for Associate PM / Analyst roles at ${company.company} in 2026.`;
            }

            const systemPrompt = `You analyze company signals to prioritize recruitment cold outreach.
Company Name: ${company.company}
Target Role: ${company.role}

Recent Google News titles:
${newsSnippet}

Classify this company's hiring priority into EXACTLY one of:
- hot: funding rounds, growth announcements, active aggressive hiring
- normal: stable hiring, no significant signals
- caution: hiring freezes, layoffs, leadership disputes, bad press
- archive: company shutting down, pivoting away from this role type

Return EXACTLY a JSON structure matching:
{
  "signal": "hot" | "normal" | "caution" | "archive",
  "reason": "one sentence explaining the classification"
}

No markdown wrappers outside the JSON, output only raw JSON.`;

            const response = await client.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 512,
              system: systemPrompt,
              messages: [{ role: 'user', content: 'Scan company signals and classify.' }],
            });

            const text = (response.content[0] as any).text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) continue;

            const result = JSON.parse(jsonMatch[0]);
            
            // Map HSL styled badges
            const signalMap: Record<string, string> = {
              hot: 'Hot',
              normal: 'Normal',
              caution: 'Caution',
              archive: 'Archive',
            };

            await updateCompanyProperties(connection, company.notionId, {
              companySignal: (signalMap[result.signal] || 'Normal') as any,
              signalReason: result.reason,
              signalUpdated: new Date().toISOString().split('T')[0]
            });

            totalFlagged++;
            // Small throttle
            await new Promise(r => setTimeout(r, 1200));
          } catch (e: any) {
            console.warn(`[SIGNALS] Scan company ${company.company} failed:`, e.message);
          }
        }
      } catch (err: any) {
        console.error(`❌ Signals scan sweep failed for user ${doc.id}:`, err.message);
      }
    }

    return NextResponse.json({ success: true, companiesScanned: totalFlagged });
  } catch (error: any) {
    console.error('❌ POST /api/signals/scan error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
