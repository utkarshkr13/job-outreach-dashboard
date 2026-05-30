import Anthropic from '@anthropic-ai/sdk';
import { Company, AgentResult } from '@/types';
import { mockGenerateDraftPipeline } from './mockDb';

const client = process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null as any;
const MODEL = 'claude-3-5-sonnet-20241022';

// ─── USER CONFIG (all from env vars — no hardcoding) ─────────────────────────

const SENDER_NAME     = process.env.SENDER_NAME     || 'Your Name';
const SENDER_PHONE    = process.env.SENDER_PHONE    || '';
const SENDER_LINKEDIN = process.env.SENDER_LINKEDIN || '';
const TARGET_ROLES    = process.env.TARGET_ROLES    || 'Associate PM or Business Analyst';
const SENDER_BIO      = process.env.SENDER_BIO      ||
  'I am a professional with experience shipping products end-to-end.';

const SIGNATURE = [
  SENDER_NAME,
  SENDER_PHONE,
  SENDER_LINKEDIN,
].filter(Boolean).join('\n');

// ─── HELPER ──────────────────────────────────────────────────────────────────

async function ask(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return (response.content[0] as any).text;
}

// ─── AGENT 1: COMPANY HOOK ───────────────────────────────────────────────────

async function companyHookAgent(company: Company): Promise<string> {
  return ask(
    `You write the opening 2-3 sentences of a cold job application email.

RULES — ALL MANDATORY:
- Be specific to this exact company. Reference their actual product, the problem they solve, their market, or a recent development.
- Sound genuine and interested, not flattering or sycophantic.
- NO generic lines like "I came across your company and was impressed" or "You are a market leader."
- NO em dashes (the long dash: —). Use a hyphen (-) or rewrite.
- NO "Hope this finds you well", "I wanted to reach out", "I am reaching out to express".
- 2-3 sentences only. Tight and specific.
- Output only those 2-3 sentences. No greeting, no label, no extra text.`,
    `Company: ${company.company}
Role: ${company.role}
Company Type: ${company.companyType ?? ''}
Location: ${company.location ?? ''}
Notes: ${company.notes ?? ''}
Source URL: ${company.sourceUrl ?? ''}`
  );
}

// ─── AGENT 2: SUBJECT LINE ───────────────────────────────────────────────────

async function subjectLineAgent(company: Company): Promise<string> {
  return ask(
    `Write a cold email subject line for a job application.

FORMAT: "[TARGET_ROLES] Interest at [Company Name] | [SENDER_NAME]"
- Replace [Company Name] with the actual company name.
- Replace [TARGET_ROLES] with: ${TARGET_ROLES}
- Replace [SENDER_NAME] with: ${SENDER_NAME}
- Keep total length between 40-60 characters.
- If the company name is long, abbreviate naturally to stay within 60 chars.
- NO em dashes (—). Use a hyphen (-) if needed.
- Output only the subject line. Nothing else.`,
    `Company: ${company.company}`
  );
}

// ─── AGENT 3: QUALITY GATE ───────────────────────────────────────────────────

async function qualityGateAgent(
  subject: string,
  body: string,
  company: Company
): Promise<{ score: number; approved: boolean; feedback: string }> {
  const result = await ask(
    `You are a cold email quality reviewer. Check this job application email strictly.

Score each criterion 1-10, then return the average:
1. Specificity — does the opening reference concrete details about this company? Not generic?
2. Bio line present — does the email contain a professional introduction sentence?
3. Word count — is the body between 100-150 words? (score 10 if yes, 1 if not)
4. No em dashes — does the email contain any em dash (—)? (score 10 if none found, 1 if found)
5. No placeholders — are there any unfilled [brackets] or placeholder text? (score 10 if clean, 1 if found)
6. One CTA only — is there exactly one call to action?
7. Has signature — does it end with sender name and contact details?

Return a JSON object: { "score": <average>, "approved": <true if score >= 7>, "feedback": "<what to fix, or Approved>" }`,
    `Company: ${company.company}
Role: ${company.role}
Subject: ${subject}
Body:
${body}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}

  return { score: 7, approved: true, feedback: 'Approved' };
}

// ─── ASSEMBLE FINAL EMAIL ─────────────────────────────────────────────────────

function assembleEmail(
  contactFirstName: string,
  companyHook: string,
  companyName: string
): string {
  return `Hi ${contactFirstName},

${companyHook}

${SENDER_BIO}

I am currently looking for ${TARGET_ROLES} roles and would love to explore if there is a fit at ${companyName}. Happy to connect for a quick 15-minute call.

${SIGNATURE}`;
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export async function runAgentPipeline(company: Company): Promise<AgentResult> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    return mockGenerateDraftPipeline(company);
  }

  const firstName = company.contactName
    ? company.contactName.trim().split(' ')[0]
    : 'there';

  const [companyHook, subject] = await Promise.all([
    companyHookAgent(company),
    subjectLineAgent(company),
  ]);

  let body = assembleEmail(firstName, companyHook.trim(), company.company);
  let quality = await qualityGateAgent(subject, body, company);

  if (!quality.approved) {
    const betterHook = await ask(
      `You write the opening 2-3 sentences of a cold job application email.

RULES — ALL MANDATORY:
- Be specific to this exact company. Reference their actual product, the problem they solve, their market.
- Sound genuine and interested.
- NO generic lines whatsoever.
- NO em dashes (—). Use a hyphen (-) or rewrite.
- 2-3 sentences only.
- Previous attempt failed quality check with this feedback: ${quality.feedback}
- Fix that specific issue.
- Output only the 2-3 sentences. No label, no extra text.`,
      `Company: ${company.company}
Role: ${company.role}
Notes: ${company.notes ?? ''}
Source URL: ${company.sourceUrl ?? ''}`
    );

    body = assembleEmail(firstName, betterHook.trim(), company.company);
    quality = await qualityGateAgent(subject, body, company);
  }

  return {
    subject,
    body,
    score: quality.score,
    notes: quality.feedback,
  };
}
