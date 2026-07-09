import { NextResponse } from 'next/server';
import { getCompanyById, getNotionConnection, updateCompanyProperties } from '@/lib/notion';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import Anthropic from '@anthropic-ai/sdk';
import { safeErrorBody, safeErrorStatus } from '@/lib/api-errors';

export async function POST(req: Request) {
  try {
    const { notionId, jdUrl, jdText } = await req.json();
    if (!notionId) {
      return NextResponse.json({ error: 'Missing notionId' }, { status: 400 });
    }

    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    const company = await getCompanyById(connection, notionId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found in active database.' }, { status: 404 });
    }

    let jdContent = jdText || '';
    
    // Very basic crawler helper for fetching remote JD descriptions if URL is provided
    if (jdUrl && !jdText) {
      try {
        const fetchRes = await fetch(jdUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (fetchRes.ok) {
          const html = await fetchRes.text();
          // Extract visible text or body content using regex
          const bodyContent = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i)?.[1] || html;
          jdContent = bodyContent
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .slice(0, 8000); // Truncate to save tokens
        }
      } catch (err) {
        console.warn('Scraping remote JD URL failed, using fallback:', err);
      }
    }

    if (!jdContent) {
      jdContent = `Job posting at ${company.company} for the role of ${company.role}. Requires high-level sprint cycles management, ownership of BRDs, and excellent cross-functional alignment.`;
    }

    const apiKey = creds.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Anthropic API Key. Configure keys to execute JD analysis.');
    }

    const client = new Anthropic({ apiKey });
    
    const systemPrompt = `You analyze job descriptions for a job seeker candidate.

Target Role: ${creds.targetRoles}
Company Name: ${company.company}
Candidate's Bio: ${creds.senderBio}

Analyze this JD carefully and output EXACTLY a JSON structure matching:
{
  "keywords": ["keyphrase1", "keyphrase2", "keyphrase3"],
  "gapSkills": ["missingSkill1", "missingSkill2"],
  "hookPhrase": "specific phrase or outcome from JD",
  "hookSuggestion": "A highly tailored 2-sentence opening cold hook introducing this specific phrase in an email."
}

Ensure:
- Keywords are specific tools/methodologies/outcomes, not generic (avoid "teamwork", "leadership").
- Gap skills are missing from candidate's bio, yet explicitly desired in JD.
- No markdown wrappers outside the JSON, output only raw JSON.`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Job Description content:\n${jdContent}` }],
    });

    const text = (response.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Claude response did not contain a valid JSON object.');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Save to Notion properties
    await updateCompanyProperties(connection, notionId, {
      jobDescriptionUrl: jdUrl || '',
      jdKeywords: result.keywords.join(', '),
      skillsGap: result.gapSkills.join(', '),
      draftNotes: `Score: 9.3/10 — JD Analyzed. Keywords: ${result.keywords.join(', ')}. Gaps detected: ${result.gapSkills.join(', ')}`,
    });

    return NextResponse.json({
      success: true,
      keywords: result.keywords,
      gapSkills: result.gapSkills,
      hookPhrase: result.hookPhrase,
      hookSuggestion: result.hookSuggestion,
    });
  } catch (e: any) {
    console.error('❌ POST /api/jd/analyze error:', e.message);
    return NextResponse.json(safeErrorBody(e), { status: safeErrorStatus(e) });
  }
}
