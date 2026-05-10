import Anthropic from '@anthropic-ai/sdk';
import { Company, AgentResult } from '@/types';
import fs from 'fs';
import path from 'path';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-3-5-sonnet-20241022';

async function ask(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });
  return (response.content[0] as any).text;
}

// Agent 1: Company Intelligence
async function companyIntelligenceAgent(company: Company): Promise<string> {
  return ask(
    `You are a company research specialist. Given a company name, role, and any available info, 
    produce a concise 3-4 sentence company profile covering: what they do, their product/service, 
    their market/industry, and anything notable. Be factual and specific. Output only the profile text, no labels.`,
    `Company: ${company.company}
Role: ${company.role}
Type: ${company.companyType}
Location: ${company.location}
Source URL: ${company.sourceUrl}
Notes: ${company.notes}
Salary Range: ${company.salaryRange} LPA`
  );
}

// Agent 2: Resume Parser
async function resumeParserAgent(role: string): Promise<string> {
  let resume = '';
  try {
    resume = fs.readFileSync(path.join(process.cwd(), 'resume.txt'), 'utf-8');
  } catch (error) {
    console.error('Could not read resume.txt', error);
  }
  
  return ask(
    `You are a resume analysis expert. Given a resume and a target job role, extract the candidate's 
    most relevant skills, achievements, and experiences FOR THAT SPECIFIC ROLE. 
    Return a JSON object with keys: "skills" (array of strings), "achievements" (array of strings with numbers/metrics), 
    "topExperiences" (array of strings), "education" (string). Be specific, use exact numbers from the resume.`,
    `Target Role: ${role}\n\nResume:\n${resume}`
  );
}

// Agent 3: Fit Analyzer
async function fitAnalyzerAgent(companyProfile: string, resumeData: string, company: Company): Promise<string> {
  return ask(
    `You are a job application strategist. Given a company profile and a candidate's resume data, 
    identify exactly 3 highly specific reasons why THIS candidate is a great fit for THIS company and role. 
    Each reason must cite specific resume evidence. No generic statements like "I am a hard worker."
    Return as a JSON array of 3 strings, each being one talking point with evidence.`,
    `Company: ${company.company}
Role: ${company.role}
Company Profile: ${companyProfile}
Candidate Resume Data: ${resumeData}`
  );
}

// Agent 4: Subject Line
async function subjectLineAgent(company: Company, talkingPoints: string): Promise<string> {
  return ask(
    `You are an expert cold email copywriter. Generate 3 compelling email subject lines for a job application cold email.
    Rules:
    - NEVER write "Application for [Role]" or anything generic
    - Be curiosity-driven or lead with value
    - Under 60 characters each
    - Sound like a human, not a bot
    - Reference something specific about the company or role
    Return only the best subject line as plain text, nothing else.`,
    `Company: ${company.company}
Role: ${company.role}
Contact: ${company.contactName ?? 'Hiring Manager'} (${company.contactTitle ?? ''})
Key talking points: ${talkingPoints}`
  );
}

// Agent 5: Email Body Writer
async function emailBodyAgent(
  company: Company,
  subject: string,
  companyProfile: string,
  talkingPoints: string,
  resumeData: string
): Promise<string> {
  return ask(
    `You are an expert cold email writer specializing in job applications. Write a cold email from a candidate 
    to a recruiter/hiring manager. 
    
    STRICT RULES:
    - Maximum 4 short paragraphs
    - Paragraph 1: Hook — something specific about the company that caught your eye (from company profile)
    - Paragraph 2: Why you — use the top 2 talking points with specific evidence from resume
    - Paragraph 3: One specific value you'd bring to THIS role at THIS company
    - Paragraph 4: Soft CTA — "Would love 15 minutes to chat" — not pushy
    - Sign off with: "Best regards,\nUtkarsh Rajput"
    - Mention resume is attached
    - Sound conversational and human, NOT corporate or robotic
    - NO clichés: "I am writing to express", "I would be a great fit", "passionate about"
    - Total length: 150-200 words maximum
    
    Return only the email body text, no subject line.`,
    `To: ${company.contactName ?? 'Hiring Manager'} (${company.contactTitle ?? 'Recruiter'}) at ${company.company}
Role: ${company.role}
Subject: ${subject}
Company Profile: ${companyProfile}
Top Talking Points: ${talkingPoints}
Resume Data: ${resumeData}`
  );
}

// Agent 6: Quality Gate
async function qualityGateAgent(subject: string, body: string, company: Company): Promise<{ score: number; approved: boolean; feedback: string }> {
  const result = await ask(
    `You are a cold email quality reviewer. Evaluate this recruiter email strictly.
    
    Score on these criteria (1-10 each, then average):
    1. Personalization — does it reference specific company details? Not generic?
    2. Evidence — does it cite real numbers/achievements from the resume?
    3. Clarity — is it concise, under 200 words, easy to read?
    4. Tone — conversational, human, not corporate or desperate?
    5. CTA — soft and confident, not pushy?
    
    Return a JSON object: { "score": <average 1-10>, "approved": <true if score >= 7>, "feedback": "<specific improvement if not approved, or 'Approved' if approved>" }`,
    `Company: ${company.company}
Role: ${company.role}
Subject: ${subject}
Body: ${body}`
  );

  try {
    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}
  
  return { score: 7, approved: true, feedback: 'Approved' };
}

// MAIN: Run full 6-agent pipeline
export async function runAgentPipeline(company: Company): Promise<AgentResult> {
  // Agent 1
  const companyProfile = await companyIntelligenceAgent(company);
  
  // Agent 2
  const resumeData = await resumeParserAgent(company.role);
  
  // Agent 3
  const talkingPointsRaw = await fitAnalyzerAgent(companyProfile, resumeData, company);
  
  // Agent 4
  const subject = await subjectLineAgent(company, talkingPointsRaw);
  
  // Agent 5
  let body = await emailBodyAgent(company, subject, companyProfile, talkingPointsRaw, resumeData);
  
  // Agent 6 — with one retry loop
  let quality = await qualityGateAgent(subject, body, company);
  
  if (!quality.approved) {
    // Retry Agent 5 with quality feedback
    body = await emailBodyAgent(
      company, subject, companyProfile, talkingPointsRaw, resumeData + '\n\nFeedback from previous draft: ' + quality.feedback
    );
    quality = await qualityGateAgent(subject, body, company);
  }

  return {
    subject,
    body,
    score: quality.score,
    notes: quality.feedback
  };
}
