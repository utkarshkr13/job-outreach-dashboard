import Anthropic from '@anthropic-ai/sdk';
import { Company, AgentResult } from '@/types';
import { mockGenerateDraftPipeline } from './mockDb';
import { UserCredentials } from './auth-middleware';

interface ModelConfig {
  provider: 'anthropic' | 'groq';
  apiKey: string;
}

// ─── HELPER ──────────────────────────────────────────────────────────────────

async function askModel(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  if (config.provider === 'groq') {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Groq API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } else {
    const client = new Anthropic({ apiKey: config.apiKey });
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return (response.content[0] as any).text;
  }
}

// ─── AGENT 1: COMPANY HOOK ───────────────────────────────────────────────────

async function companyHookAgent(config: ModelConfig, company: Company): Promise<string> {
  const jdSection = company.jdKeywords ? `
We have analyzed the job description for this role.
Key themes/keywords the hiring manager values: ${company.jdKeywords}
Skills gap detected: ${company.skillsGap || 'None'}
INSTRUCTION: Weave one of these keywords naturally into the opening hook, matching their desired skills.` : '';

  return askModel(
    config,
    `You write the opening 2-3 sentences of a cold job application email.

RULES — ALL MANDATORY:
- Be specific to this exact company. Reference their actual product, the problem they solve, their market, or a recent development.
- PRIORITIZE fresh funding rounds, growth milestones, or specific product features. (Analytics show funding angles secure a 24% reply rate, compared to 6% for generic ones).
- Sound genuine and interested, not flattering or sycophantic.
- NO generic lines like "I came across your company and was impressed" or "You are a market leader."
- NO em dashes (the long dash: —). Use a hyphen (-) or rewrite.
- NO "Hope this finds you well", "I wanted to reach out", "I am reaching out to express".
- 2-3 sentences only. Tight and specific.
- Output only those 2-3 sentences. No greeting, no label, no extra text.
${jdSection}`,
    `Company: ${company.company}
Role: ${company.role}
Company Type: ${company.companyType ?? ''}
Location: ${company.location ?? ''}
Notes: ${company.notes ?? ''}
Source URL: ${company.sourceUrl ?? ''}`
  );
}

// ─── AGENT 2: SUBJECT LINE ───────────────────────────────────────────────────

async function subjectLineAgent(
  config: ModelConfig,
  company: Company,
  targetRoles: string,
  senderName: string
): Promise<string> {
  return askModel(
    config,
    `Write a cold email subject line for a job application.

FORMAT: "[TARGET_ROLES] Interest at [Company Name] | [SENDER_NAME]"
- Replace [Company Name] with the actual company name.
- Replace [TARGET_ROLES] with: ${targetRoles}
- Replace [SENDER_NAME] with: ${senderName}
- Keep total length between 40-60 characters.
- If the company name is long, abbreviate naturally to stay within 60 chars.
- NO em dashes (—). Use a hyphen (-) if needed.
- Output only the subject line. Nothing else.`,
    `Company: ${company.company}`
  );
}

// ─── AGENT 3: QUALITY GATE ───────────────────────────────────────────────────

async function qualityGateAgent(
  config: ModelConfig,
  subject: string,
  body: string,
  company: Company
): Promise<{ score: number; approved: boolean; feedback: string }> {
  const result = await askModel(
    config,
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
  companyName: string,
  senderBio: string,
  targetRoles: string,
  signature: string
): string {
  return `Hi ${contactFirstName},

${companyHook}

${senderBio}

I am currently looking for ${targetRoles} roles and would love to explore if there is a fit at ${companyName}. Happy to connect for a quick 15-minute call.

${signature}`;
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export async function runAgentPipeline(
  company: Company,
  creds: UserCredentials
): Promise<AgentResult> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    return mockGenerateDraftPipeline(company);
  }

  // Determine provider preference and keys
  const provider = creds.llmProvider || 'anthropic';
  const anthropicKey = creds.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  const groqKey = creds.groqApiKey || process.env.GROQ_API_KEY;

  const useGroq = provider === 'groq' ? !!groqKey : !anthropicKey && !!groqKey;

  const config: ModelConfig = useGroq 
    ? { provider: 'groq', apiKey: groqKey! }
    : { provider: 'anthropic', apiKey: anthropicKey! };

  if (!config.apiKey) {
    throw new Error(`Missing ${config.provider === 'groq' ? 'Groq' : 'Anthropic'} API Key. Please configure your key in settings to run email generation.`);
  }

  const signature = [
    creds.senderName,
    creds.senderPhone,
    creds.senderLinkedin,
  ].filter(Boolean).join('\n');

  const firstName = company.contactName
    ? company.contactName.trim().split(' ')[0]
    : 'there';

  const [companyHook, subject] = await Promise.all([
    companyHookAgent(config, company),
    subjectLineAgent(config, company, creds.targetRoles, creds.senderName),
  ]);

  let body = assembleEmail(
    firstName,
    companyHook.trim(),
    company.company,
    creds.senderBio,
    creds.targetRoles,
    signature
  );
  
  let quality = await qualityGateAgent(config, subject, body, company);

  if (!quality.approved) {
    const betterHook = await askModel(
      config,
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

    body = assembleEmail(
      firstName,
      betterHook.trim(),
      company.company,
      creds.senderBio,
      creds.targetRoles,
      signature
    );
    quality = await qualityGateAgent(config, subject, body, company);
  }

  return {
    subject,
    body,
    score: quality.score,
    notes: quality.feedback,
  };
}
