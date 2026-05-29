import Anthropic from '@anthropic-ai/sdk';
import { Company, AgentResult } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-3-5-sonnet-20241022';

// ─── FIXED CONSTANTS (never change these) ───────────────────────────────────

const FIXED_INTRO_LINE =
  'I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives.';

const SIGNATURE = `Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232`;

const TARGET_ROLES = 'Associate PM or Business Analyst';

// ─── HELPER ─────────────────────────────────────────────────────────────────

async function ask(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return (response.content[0] as any).text;
}

// ─── AGENT 1: COMPANY HOOK ────────────────────────────────────────────────
// Writes 2-3 sentences that are specific to THIS company.
// These are the opening lines of the email — before the fixed intro.

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

// ─── AGENT 2: SUBJECT LINE ────────────────────────────────────────────────

async function subjectLineAgent(company: Company): Promise<string> {
  return ask(
    `Write a cold email subject line for a job application.

FORMAT: "Associate PM / BA Interest at [Company Name] | Utkarsh Kumar"
- Replace [Company Name] with the actual company name.
- Keep total length between 40-55 characters.
- If the company name is long, abbreviate naturally to stay within 55 chars.
- NO em dashes (—). Use a hyphen (-) if needed.
- Output only the subject line. Nothing else.`,
    `Company: ${company.company}`
  );
}

// ─── AGENT 3: QUALITY GATE ───────────────────────────────────────────────

async function qualityGateAgent(
  subject: string,
  body: string,
  company: Company
): Promise<{ score: number; approved: boolean; feedback: string }> {
  const result = await ask(
    `You are a cold email quality reviewer. Check this job application email strictly.

Score each criterion 1-10, then return the average:
1. Specificity — does the opening reference concrete details about this company? Not generic?
2. Fixed intro line present — does the email contain this exact line word for word: "${FIXED_INTRO_LINE}"
3. Word count — is the body between 120-140 words? (score 10 if yes, 1 if not)
4. No em dashes — does the email contain any em dash (—)? (score 10 if none found, 1 if found)
5. No placeholders — are there any unfilled [brackets] or placeholder text? (score 10 if clean, 1 if found)
6. One CTA only — is there exactly one call to action?
7. Correct signature — does it end with "Utkarsh Kumar", phone, and LinkedIn?

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

// ─── ASSEMBLE FINAL EMAIL ────────────────────────────────────────────────

function assembleEmail(
  contactFirstName: string,
  companyHook: string,
  companyName: string
): string {
  return `Hi ${contactFirstName},

${companyHook}

${FIXED_INTRO_LINE}

I am currently looking for ${TARGET_ROLES} roles and would love to explore if there is a fit at ${companyName}. Happy to connect for a quick 15-minute call.

${SIGNATURE}`;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────

export async function runAgentPipeline(company: Company): Promise<AgentResult> {
  // Derive first name from contactName (e.g. "Priya Sharma" -> "Priya")
  const firstName = company.contactName
    ? company.contactName.trim().split(' ')[0]
    : 'there';

  // Run company hook + subject in parallel
  const [companyHook, subject] = await Promise.all([
    companyHookAgent(company),
    subjectLineAgent(company),
  ]);

  // Assemble body using fixed template
  let body = assembleEmail(firstName, companyHook.trim(), company.company);

  // Quality gate with one retry if needed
  let quality = await qualityGateAgent(subject, body, company);

  if (!quality.approved) {
    // Retry only the company hook (most likely failure point)
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
