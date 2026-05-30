# Job Outreach Dashboard — Full Implementation Document
**Version**: As of 2026-05-30
**Status**: 95% complete — one credential fix remaining
**Live URL**: https://job-outreach-dashboard.vercel.app
**GitHub**: https://github.com/utkarshkr13/job-outreach-dashboard (private)
**Local code**: `C:\Users\Utkarsh\.gemini\antigravity\scratch\job-outreach-dashboard`

---

## TABLE OF CONTENTS

1. What This System Does
2. Full Tech Stack
3. Complete File Structure
4. Every File — What It Does
5. Notion Database Schema
6. Environment Variables — Full Reference
7. Email Template & Generation Rules
8. GitHub Commit History
9. Everything That Was Tried (and Why It Failed)
10. Current State — What Works, What Doesn't
11. The One Remaining Fix
12. Post-Fix Checklist
13. QA Sanity Checklist
14. Future Roadmap

---

## 1. WHAT THIS SYSTEM DOES

Utkarsh has a Notion database of companies he wants to apply to for Associate PM / Business Analyst roles. This dashboard automates the outreach pipeline:

1. **Every morning at 3am IST** — Vercel cron hits `/api/cron/generate` which pulls all companies with status "New" from Notion and generates a personalised cold email draft for each using Claude.
2. **Utkarsh reviews drafts** in the dashboard UI at `job-outreach-dashboard.vercel.app`. He reads each draft, can edit it inline, approve it or reject it.
3. **One-click Send** — clicking Send fires the email directly from `utkarshwork13@gmail.com` via Gmail OAuth2, attaches his resume PDF automatically, and updates the Notion row to "Sent".

The system also has a **Settings page** where Utkarsh uploads his resume PDF once — it gets stored in Vercel Blob and auto-attached to every email going forward.

---

## 2. FULL TECH STACK

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.2.6 | App Router, TypeScript, API routes |
| UI | React + Tailwind CSS | 19.2.4 / v4 | Dashboard frontend |
| Email drafts | Anthropic Claude API | claude-3-5-sonnet-20241022 | Generates personalised email content |
| Database | Notion API | @notionhq/client 2.2.15 | Source of truth for all companies |
| Email sending | Nodemailer | 8.0.7 | Gmail OAuth2 SMTP transport |
| File storage | Vercel Blob | @vercel/blob 2.3.3 | Stores resume PDF |
| Hosting | Vercel | Free Hobby plan | Deployment + cron jobs |
| Runtime | Node.js | (Vercel managed) | Server-side API routes |

**Note**: `resend` package (6.12.3) is still in package.json from a previous attempt but is NOT used. The active mailer is Nodemailer with Gmail OAuth2.

---

## 3. COMPLETE FILE STRUCTURE

```
job-outreach-dashboard/
├── app/
│   ├── layout.tsx                        # Root layout, global styles
│   ├── page.tsx                          # Dashboard home — company table
│   ├── company/
│   │   └── [id]/
│   │       └── page.tsx                  # Company detail — view/edit draft
│   ├── sent/
│   │   └── page.tsx                      # Sent emails history
│   ├── settings/
│   │   └── page.tsx                      # Resume upload UI
│   └── api/
│       ├── companies/
│       │   └── route.ts                  # GET — fetch all companies from Notion
│       ├── generate/
│       │   ├── route.ts                  # POST — generate draft for one company
│       │   └── bulk/
│       │       └── route.ts              # POST — generate drafts for all "New"
│       ├── approve/
│       │   └── [id]/
│       │       └── route.ts              # POST — set status to "Approved"
│       ├── reject/
│       │   └── [id]/
│       │       └── route.ts              # POST — set status to "Rejected"
│       ├── redo/
│       │   └── [id]/
│       │       └── route.ts              # POST — regenerate draft
│       ├── send/
│       │   ├── [id]/
│       │   │   └── route.ts              # POST — send one email
│       │   └── bulk/
│       │       └── route.ts              # POST — send all "Approved" companies
│       ├── cron/
│       │   └── generate/
│       │       └── route.ts              # POST — cron endpoint (3am IST daily)
│       └── resume/
│           ├── route.ts                  # GET — check if resume exists in Blob
│           ├── upload/
│           │   └── route.ts              # POST — upload resume PDF to Vercel Blob
│           └── download/
│               └── route.ts             # GET — signed download URL for resume
├── lib/
│   ├── notion.ts                         # Notion API client
│   ├── agents.ts                         # Claude email generation (UPDATED 2026-05-30)
│   ├── mailer.ts                         # Gmail OAuth2 email sender
│   └── zapier.ts                         # DEPRECATED — do not use
├── types/
│   └── index.ts                          # TypeScript types
├── vercel.json                           # Cron job config
├── .env.local                            # Secrets (NOT in git)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 4. EVERY FILE — WHAT IT DOES

### `lib/notion.ts`
Handles all Notion API reads and writes.

Functions:
- `getAllCompanies()` — queries entire DB, sorted by Number property ascending. Returns array of Company objects.
- `getCompaniesByStatus(status | status[])` — filters DB by Email Status select property.
- `updateEmailDraft(notionId, subject, body, notes, status)` — writes generated draft back to Notion (Email Subject, Email Draft, Draft Notes, Email Status).
- `updateStatus(notionId, status, notes?)` — updates Email Status. If status = 'Sent', also ticks the Emailed checkbox.

Field mappings (exact Notion property names — do not change):
```
Company           → title
Role              → rich_text
Email             → email
Contact Name      → rich_text
Contact Title     → rich_text
Company Type      → select (Startup | Stable)
Salary Range (LPA)→ rich_text
Source            → select
Source URL        → url
Location          → rich_text
Notes             → rich_text
Email Status      → select (New | Draft Ready | Approved | Sent | Rejected | Redo)
Email Subject     → rich_text
Email Draft       → rich_text
Draft Notes       → rich_text
Emailed           → checkbox
Date Added        → date
Number            → number
```

### `lib/agents.ts` (UPDATED 2026-05-30)
Generates cold email drafts using Claude. Contains 3 functions + 1 main export.

**Fixed constants (hardcoded — never touched by AI):**
```
FIXED_INTRO_LINE = "I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives."

SIGNATURE = "Utkarsh Kumar\n+91 9969396063\nlinkedin.com/in/utkarsh-kumar-rajput-76b673232"

TARGET_ROLES = "Associate PM or Business Analyst"
```

**Functions:**
- `companyHookAgent(company)` — AI generates 2-3 specific opening sentences about the company. Has strict rules: no generic lines, no em dashes, no filler phrases.
- `subjectLineAgent(company)` — AI generates subject line in format "Associate PM / BA Interest at [Company] | Utkarsh Kumar" (40-55 chars).
- `qualityGateAgent(subject, body, company)` — reviews the assembled email on 7 criteria, returns {score, approved, feedback}.
- `assembleEmail(firstName, companyHook, companyName)` — combines hook + FIXED_INTRO_LINE + ask + CTA + SIGNATURE into final email. Only the hook is AI-generated; everything else is hardcoded.
- `runAgentPipeline(company)` — main export. Runs hook + subject in parallel, assembles email, quality gates with one retry. Returns {subject, body, score, notes}.

**Email template produced:**
```
Hi [First Name],

[2-3 AI-generated sentences specific to this company]

I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives.

I am currently looking for Associate PM or Business Analyst roles and would love to explore if there is a fit at [Company Name]. Happy to connect for a quick 15-minute call.

Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232
```

Word count target: 120-140 words.

### `lib/mailer.ts`
Sends emails via Gmail OAuth2 using Nodemailer. Also auto-attaches resume from Vercel Blob.

Required env vars: `GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`

Flow:
1. Validates all 4 OAuth2 env vars are present — throws descriptive error if not.
2. Creates Nodemailer transporter with `type: 'OAuth2'` auth.
3. Fetches resume PDF from Vercel Blob (pathname = 'resume.pdf') — non-fatal if not found.
4. Calls `transporter.sendMail()` with from, to, subject, html, text, replyTo, attachments.
5. Returns `true` on success.

From address: `"Utkarsh Rajput" <utkarshwork13@gmail.com>`

### `lib/zapier.ts`
**DEPRECATED.** Old Zapier webhook integration that was replaced. Kept in repo for reference only. Not imported anywhere.

### `app/api/send/[id]/route.ts`
POST handler that sends one email.
1. Receives Notion page ID from URL params.
2. Fetches the page directly via `notion.pages.retrieve()` to get fresh data.
3. Extracts: email address, email subject, email draft, company name, contact name from page properties.
4. Calls `sendEmail()` from mailer.ts.
5. On success, calls `updateStatus(id, 'Sent')` to update Notion.
6. Returns `{success: true}` or `{error: message}`.

### `app/api/generate/bulk/route.ts`
POST handler for bulk draft generation.
1. Calls `getCompaniesByStatus('New')` to get all unprocessed companies.
2. Loops through each, calls `runAgentPipeline(company)`.
3. Calls `updateEmailDraft()` to save subject + body + notes back to Notion with status "Draft Ready".
4. Returns count of drafts generated.

### `app/api/cron/generate/route.ts`
POST handler called by Vercel cron at 3am IST.
1. Validates `x-cron-secret` header matches `CRON_SECRET` env var.
2. Same logic as bulk generate — fetches New companies and generates drafts.
3. This is the fully automated daily pipeline.

### `app/settings/page.tsx`
Resume upload UI. Lets Utkarsh upload a PDF once. File gets stored in Vercel Blob as `resume.pdf` and is auto-attached to all outgoing emails from that point forward.

### `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/generate",
      "schedule": "30 22 * * *"
    }
  ]
}
```
Schedule: `30 22 * * *` = 22:30 UTC = 4:00 AM IST.
(Note: was previously documented as 3am IST / 21:30 UTC — actual value in file is 22:30 UTC = 4am IST. Verify and update if needed.)

---

## 5. NOTION DATABASE SCHEMA

**Database name**: Cold Email Outreach
**Database ID**: `e812a1f9-17a1-4db9-a3bb-4ca387d6c661`
**Data source ID**: `52aaa02a-ccee-47ff-886f-8e9bb4fbcbfc`
**Located under**: "Job Hunt HQ" page in Notion

| Property | Type | Values / Notes |
|---|---|---|
| Company | title | Company name |
| Role | rich_text | Job role targeted |
| Email | email | Recruiter/HR email |
| Contact Name | rich_text | Real person's name only |
| Contact Title | rich_text | Their job title |
| Company Type | select | Startup / Stable |
| Salary Range (LPA) | rich_text | From job listing |
| Source | select | LinkedIn / Naukri / Indeed / Career Page / Other |
| Source URL | url | Link to job listing |
| Location | rich_text | Area/city |
| Notes | rich_text | Any freeform notes |
| Email Status | select | New / Draft Ready / Approved / Sent / Rejected / Redo |
| Email Subject | rich_text | Generated by Claude |
| Email Draft | rich_text | Generated by Claude |
| Draft Notes | rich_text | Quality score + feedback from Claude |
| Emailed | checkbox | Set to true when email sent |
| Date Added | date | When row was added |
| Number | number | Row ordering |

**Email Status flow:**
```
New → (cron generates) → Draft Ready → (Utkarsh approves) → Approved → (sends) → Sent
                                     → (Utkarsh rejects) → Rejected
                                     → (Utkarsh redoes)  → Draft Ready (regenerated)
```

**Test row (for QA):**
- Page ID: `35e1c6af-4a06-81db-9ca7-c5882ab013a1`
- Company: "Test Company (DELETE ME)"
- Email: ukumardj@gmail.com
- Status: Approved
- Delete after confirming send works end-to-end.

---

## 6. ENVIRONMENT VARIABLES — FULL REFERENCE

### `.env.local` (local development)
Path: `C:\Users\Utkarsh\.gemini\antigravity\scratch\job-outreach-dashboard\.env.local`
**This file is gitignored — never commit it.**

```env
ANTHROPIC_API_KEY=sk-ant-api03-qOiSMj6uu5mslw_bsOALTxRdMOnth_CeMM-bJHkhNph0A7RloloZH_oMAMvfkD0Lm9zdxj8lEsr3DjGICxO9jA-bb1QqwAA
NOTION_API_KEY=ntn_d76283438148nT1AXmanjQUpjQiXhTXFojdE2haHmGj6Wj
NOTION_DB_ID=e812a1f9-17a1-4db9-a3bb-4ca387d6c661
CRON_SECRET=b6e3f2d1e4c5a6b7f8c9d0e1f2a3b4c5

# Gmail OAuth2
GMAIL_USER=utkarshwork13@gmail.com
GMAIL_CLIENT_ID=711970967574-oiqjog95i003l447opq91irqhgsovdc2.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=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
GMAIL_REFRESH_TOKEN=<NEEDS REGENERATING — see Section 11>
SENDER_NAME=Utkarsh Rajput

# Vercel Blob (auto-set by Vercel integration — do not set manually in production)
# BLOB_READ_WRITE_TOKEN=<set by Vercel>
```

### Vercel Production — Project tab
(Set via Vercel dashboard → job-outreach-dashboard → Settings → Environments → Production → Project tab)

| Variable | Value | Status |
|---|---|---|
| ANTHROPIC_API_KEY | sk-ant-api03-... | Set |
| NOTION_API_KEY | ntn_d76283... | Set |
| NOTION_DB_ID | e812a1f9-... | Set |
| CRON_SECRET | b6e3f2d1e4... | Set |
| GMAIL_USER | utkarshwork13@gmail.com | Set |
| SENDER_NAME | Utkarsh Rajput | Set |
| BLOB_READ_WRITE_TOKEN | (set by Vercel Blob integration) | Set |
| GMAIL_APP_PASSWORD | (old, unused) | Can delete |

### Vercel Production — Shared tab
(Set via Vercel dashboard → Settings → Environments → Production → Shared tab)

| Variable | Value | Status |
|---|---|---|
| GMAIL_CLIENT_ID | 711970967574-oiqjog...googleusercontent.com | Set |
| GMAIL_CLIENT_SECRET | GOCSPX-BZI0p... | Set |
| GMAIL_REFRESH_TOKEN | 1//04iLbjrW-... | **INVALID — needs regeneration** |

### Google Cloud OAuth2 Credentials
- Console: https://console.cloud.google.com
- Project name: "Job Outreach"
- Gmail API: Enabled
- OAuth consent screen: External, Testing mode
- Test user added: utkarshwork13@gmail.com
- Client type: Web application
- Authorized redirect URI: `https://developers.google.com/oauthplayground`
- Client ID: `711970967574-oiqjog95i003l447opq91irqhgsovdc2.apps.googleusercontent.com`
- Client Secret: `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`

---

## 7. EMAIL TEMPLATE & GENERATION RULES

### Fixed elements (hardcoded — AI never touches these)
```
INTRO LINE (word for word, every email):
"I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives."

SIGNATURE (every email):
Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232

TARGET ROLES (only these, in email body and subject):
Associate PM or Business Analyst
```

### Subject line format
```
Associate PM / BA Interest at [Company Name] | Utkarsh Kumar
```
40-55 characters. No em dashes.

### Full email structure
```
Hi [First Name],

[2-3 AI-generated sentences: specific to this company, what they build, why it's interesting.
No generic lines. No em dashes. No "I came across your company."]

I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning
everything from BRDs and sprint planning to UAT cycles and client go-lives.

I am currently looking for Associate PM or Business Analyst roles and would love to explore
if there is a fit at [Company Name]. Happy to connect for a quick 15-minute call.

Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232
```

### Hard rules — never do these
| Never | Instead |
|---|---|
| Em dash (—) anywhere | Hyphen (-) or restructure |
| "Hope this finds you well" | Open directly with company hook |
| "I wanted to reach out" | Just write the hook |
| Two CTAs | One only |
| "Please find my resume attached" | Resume auto-attaches silently |
| Placeholder [brackets] in final draft | Every field must be filled |
| Any role other than Associate PM or BA | Only these two |
| Change the fixed intro line | Hardcoded constant in code |
| "Best regards, Utkarsh Rajput" | Use full signature block with phone + LinkedIn |

### Word count
120-140 words for the full email body.

---

## 8. GITHUB COMMIT HISTORY

Repository: https://github.com/utkarshkr13/job-outreach-dashboard
Branch: main (16 commits total)

```
2dea065  feat: align email generation with Job Hunt SKILL.md template
         (Updated agents.ts — fixed intro line, correct signature, 120-140 words,
          parallel generation, quality gate with 7 criteria)

34e5972  chore: trigger redeploy for Gmail OAuth2 env vars
         (Empty commit to force Vercel rebuild with new env vars)

d0977e7  feat: switch to Gmail OAuth2 for SMTP (App Passwords unavailable)
         (Rewrote lib/mailer.ts to use Nodemailer OAuth2 transport)

c9f68a2  fix: switch email from Gmail SMTP to Resend API
         (Resend approach — later rejected by user, Gmail domain required)

a6720d1  fix: switch SMTP from Outlook to Gmail (utkarshwork13@gmail.com)
         (Gmail SMTP + App Password — failed, App Passwords unavailable on account)

a9c15e1  Fix send route to fetch company by page ID directly
         (send/[id]/route.ts now uses notion.pages.retrieve for fresh data)

27ade77  Fix: use proxy URL after upload instead of raw blob URL
26bc3ee1  Fix: add allowOverwrite to resume upload
f3f3858  Fix: use proxy URL for private resume viewing
aa9fa3c  Fix mailer private blob handling
e42f13f  Fix settings page private blob link
d3ec0b0  Fix stream disturbed error on blob upload
cc8637b  Fix blob private store issue

3e2e827  Add resume upload and attachment feature
         (Added app/settings/page.tsx + app/api/resume/* routes + Vercel Blob integration)

9c1a773  feat: full cold email dashboard - Nodemailer/Outlook SMTP replacing Zapier
         (Complete Next.js dashboard. Notion, Claude, Nodemailer, all API routes,
          cron config, dark UI. Replaced entire Zapier approach.)

1ad627b  Initial commit from Create Next App
```

---

## 9. EVERYTHING THAT WAS TRIED (AND WHY IT FAILED)

This section is critical context for anyone picking this up.

### Attempt 1: Zapier
**Approach**: Zapier Zap with Webhook trigger → send email step → update Notion.
**Why it failed**: Zapier Webhooks by Zapier trigger requires the **Pro plan** ($19/mo). The free Hobby plan cannot use it. Zap was built and all steps configured but could not be published.
**Decision**: Abandon Zapier entirely. Replace with direct code in Next.js.

### Attempt 2: Nodemailer + Outlook SMTP
**Approach**: `nodemailer.createTransport({ host: 'smtp-mail.outlook.com', port: 587, auth: { user, pass } })`
**Why it failed**: Microsoft deprecated basic authentication for Outlook/Hotmail/Live SMTP in 2023. All connections return `535 5.7.3 Authentication unsuccessful`. There is no workaround for personal @outlook.com / @hotmail.com accounts. Microsoft 365 work accounts can still use it if an admin enables SMTP AUTH, but this is a personal account.
**Decision**: Switch to Gmail.

### Attempt 3: Gmail SMTP + App Password
**Approach**: `nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, auth: { user, pass: appPassword } })`
**Why it failed**: Gmail App Passwords require **2-Step Verification** to be enabled on the Google account. When Utkarsh navigated to `myaccount.google.com/apppasswords`, Google showed a message that this feature is "no longer available" for his account. This typically happens on Google Workspace accounts managed by an organisation, or accounts under certain security policies.
**Decision**: Cannot use password-based Gmail auth. Must use OAuth2.

### Attempt 4: Resend.com
**Approach**: Use Resend SDK (`import { Resend } from 'resend'`). Transactional email API, no SMTP config.
**Why it failed**: Resend sends from their own domain (`onboarding@resend.dev`) by default on free tier. Utkarsh explicitly rejected this — he needs emails to appear as coming **from utkarshwork13@gmail.com**. Sending from a resend.dev domain would look unprofessional and spammy to recruiters.
**Decision**: Must use Gmail directly. Only remaining option is Gmail OAuth2.

### Attempt 5: Gmail OAuth2 via Nodemailer (CURRENT)
**Approach**: `nodemailer.createTransport({ service: 'gmail', auth: { type: 'OAuth2', user, clientId, clientSecret, refreshToken } })`
**Status**: Code is correct and deployed. Credentials are in Vercel. ONE issue remains.
**Current error**: `unauthorized_client: Unauthorized`
**Root cause**: When generating the refresh token on OAuth2 Playground, the playground was NOT switched to "use your own OAuth credentials" before authorising. The refresh token got generated against Google's own playground client credentials, not Utkarsh's. When the app tries to use Utkarsh's Client ID + Secret with a refresh token tied to Google's client — Google rejects it.
**Fix**: Regenerate the refresh token with the playground correctly configured (see Section 11).

---

## 10. CURRENT STATE — WHAT WORKS, WHAT DOESN'T

### Working
- Dashboard loads at https://job-outreach-dashboard.vercel.app
- Company list fetches from Notion DB correctly
- Company detail page (view/edit draft) works
- Sent emails history page works
- Generate draft for one company (POST /api/generate) works
- Bulk generate all New companies (POST /api/generate/bulk) works
- Approve (POST /api/approve/[id]) works
- Reject (POST /api/reject/[id]) works
- Redo/regenerate (POST /api/redo/[id]) works
- Resume upload at /settings works
- Resume auto-attaches to emails (when send works)
- Vercel cron is configured (30 22 * * * = 4am IST)
- All env vars are in Vercel
- All code is on GitHub (main branch, latest commit 2dea065)
- Email template now matches Job Hunt SKILL.md exactly

### Not Working
- **Email sending** — `POST /api/send/[id]` returns `{"error":"unauthorized_client: Unauthorized"}`
- Root cause: Invalid Gmail OAuth2 refresh token (generated incorrectly)
- Fix: 5-minute credential regeneration (see Section 11)

### Not Yet Started
- Resume PDF not yet uploaded to /settings (needs to be done by Utkarsh)
- No email drafts generated yet for the real companies in Notion
- Bulk send not tested

---

## 11. THE ONE REMAINING FIX

**Problem**: The GMAIL_REFRESH_TOKEN in Vercel is tied to Google's own OAuth client, not Utkarsh's.
**Time to fix**: 5 minutes.

### Step 1 — Open OAuth2 Playground
Go to: https://developers.google.com/oauthplayground

### Step 2 — CRITICAL: Enter your credentials BEFORE authorising
Click the **gear icon** (top-right corner of the page).
Check the box: **"Use your own OAuth credentials"**
Fill in:
- OAuth Client ID: `711970967574-oiqjog95i003l447opq91irqhgsovdc2.apps.googleusercontent.com`
- OAuth Client Secret: `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`
Close the gear panel.

### Step 3 — Authorise Gmail scope
In the left panel, scroll down to find **"Gmail API v1"**.
Expand it. Tick the checkbox next to: `https://mail.google.com/`
Click the blue **"Authorize APIs"** button.
Google sign-in will open. Sign in as **utkarshwork13@gmail.com**.
Click **Allow**.

### Step 4 — Exchange for tokens
You will be redirected back to the playground at Step 2.
Click **"Exchange authorization code for tokens"**.
A Refresh token will appear in the left panel.
Copy the entire **Refresh token** value (it starts with `1//`).
Do not copy the Access token — it expires in 1 hour and is not needed.

### Step 5 — Update Vercel
1. Go to https://vercel.com/dashboard
2. Click **job-outreach-dashboard**
3. Settings → Environments → Production → click the **Shared** tab
4. Find **GMAIL_REFRESH_TOKEN** → click **...** → **Edit**
5. Paste the new refresh token → Save

### Step 6 — Redeploy
Either:
- Push any change to GitHub (Vercel auto-deploys from main), OR
- Vercel dashboard → Deployments → click **...** on latest → **Redeploy**

### Step 7 — Test
Run this in PowerShell:
```powershell
Invoke-WebRequest -Uri "https://job-outreach-dashboard.vercel.app/api/send/35e1c6af-4a06-81db-9ca7-c5882ab013a1" -Method POST -ContentType "application/json" -UseBasicParsing
```
Expected: `StatusCode 200`, body `{"success":true}`
Check: email arrives at ukumardj@gmail.com from utkarshwork13@gmail.com.
Check: Notion row "Test Company (DELETE ME)" → Email Status = "Sent", Emailed checkbox = ticked.

---

## 12. POST-FIX CHECKLIST

Once email sending is confirmed working:

- [ ] Delete test Notion row: page ID `35e1c6af-4a06-81db-9ca7-c5882ab013a1`
- [ ] Upload resume PDF: go to https://job-outreach-dashboard.vercel.app/settings → upload PDF
- [ ] Generate drafts for all real companies: `POST /api/generate/bulk` (or use dashboard bulk button)
- [ ] Review 5-10 drafts manually to confirm quality
- [ ] Approve the good ones, reject or redo the bad ones
- [ ] Confirm cron: Vercel dashboard → project → Settings → Cron Jobs → should show `/api/cron/generate` at `30 22 * * *`
- [ ] Monitor next morning — check that drafts auto-generated overnight
- [ ] Delete old GMAIL_APP_PASSWORD var from Vercel Project tab (cleanup)

---

## 13. QA SANITY CHECKLIST

### Email quality checks (run on 5 sample drafts)
- [ ] Subject line is 40-55 characters
- [ ] Subject line format: "Associate PM / BA Interest at [Company] | Utkarsh Kumar"
- [ ] Email opens with "Hi [Real First Name]," — never a placeholder
- [ ] Opening 2-3 sentences are specific to the company — not generic
- [ ] Fixed intro line present word-for-word: "I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives."
- [ ] Only one CTA (either 15-min call OR "let me know")
- [ ] Signature is: "Utkarsh Kumar / +91 9969396063 / linkedin.com/in/utkarsh-kumar-rajput-76b673232"
- [ ] No em dashes (—) anywhere
- [ ] No unfilled [bracket] placeholders
- [ ] No "Hope this finds you well"
- [ ] No "I wanted to reach out"
- [ ] Word count is 120-140 words
- [ ] Only Associate PM or Business Analyst mentioned as target roles

### API endpoint checks
- [ ] `GET /api/companies` — returns array, 200
- [ ] `POST /api/generate` with body `{"notionId":"..."}` — returns subject + body, 200
- [ ] `POST /api/generate/bulk` — generates drafts for all New companies, 200
- [ ] `POST /api/approve/[id]` — Notion row status changes to "Approved", 200
- [ ] `POST /api/reject/[id]` — Notion row status changes to "Rejected", 200
- [ ] `POST /api/redo/[id]` — new draft generated and saved, status back to Draft Ready, 200
- [ ] `POST /api/send/[id]` — email arrives, Notion row → Sent, Emailed = true, 200
- [ ] `POST /api/send/bulk` — sends all Approved companies
- [ ] `GET /api/resume` — returns blob info if resume uploaded, 200
- [ ] `POST /api/resume/upload` — uploads PDF, stores in Vercel Blob as resume.pdf, 200
- [ ] `POST /api/cron/generate` with header `x-cron-secret: b6e3f2d1e4c5a6b7f8c9d0e1f2a3b4c5` — generates drafts, 200
- [ ] `POST /api/cron/generate` without header — returns 401

### Notion sync checks
- [ ] Generating a draft updates Email Status to "Draft Ready"
- [ ] Approving updates Email Status to "Approved"
- [ ] Rejecting updates Email Status to "Rejected"
- [ ] Sending updates Email Status to "Sent" AND Emailed checkbox = true
- [ ] Draft Notes field contains quality score from Claude

### Email delivery checks
- [ ] From address is utkarshwork13@gmail.com
- [ ] Display name is "Utkarsh Rajput"
- [ ] Resume PDF attached (if uploaded to /settings)
- [ ] Email is not in spam
- [ ] Reply-to is utkarshwork13@gmail.com

---

## 14. FUTURE ROADMAP

These are planned but not yet built. In priority order:

### P1 — Company Auto-Ingestion (High value, next to build)
Currently companies must be manually added to Notion. The plan is an agent that:
1. Takes a list of target companies or role keywords
2. Uses Claude + web search to find HR/TA contacts and their emails
3. Uses `createCompanyEntry()` in `lib/notion.ts` to add rows automatically
4. Connects to the existing daily cron so the full pipeline runs without manual intervention

### P2 — LinkedIn/Indeed Scraper Integration
The scheduled "Job Hunt" task already scrapes jobs daily via Apify. Connect that pipeline so new jobs found by the scraper automatically get added to the Notion DB (instead of Gmail drafts being created there — use this dashboard for sending instead).

### P3 — Email Open/Reply Tracking
Currently there's no visibility into whether emails are opened or replied to. Options:
- Add a tracking pixel via a Next.js API route
- Use Gmail API to poll for replies and update Notion accordingly

### P4 — Analytics Dashboard
A /analytics page showing:
- Total outreach sent by week
- Response rate
- Companies by city, role, status
- Draft quality score distribution

### P5 — Resume Personalisation
Currently one resume is attached to all emails. Future: upload multiple resume versions (APM-focused, BA-focused) and auto-select based on the role type.

---

*Document generated: 2026-05-30*
*Next session: Start with Section 11 (refresh token fix), then run QA checklist from Section 13.*
