# Job Outreach Dashboard

A Next.js dashboard that automates personalised cold email outreach for job hunting. It pulls companies from a Notion database, generates tailored email drafts using Claude AI, lets you review and approve them, then sends via Gmail OAuth2 with your resume auto-attached.

**Live:** https://job-outreach-dashboard.vercel.app

---

## What It Does

1. **Daily cron (4am IST)** — Pulls all companies with status `New` from Notion and generates a personalised cold email draft for each using Claude.
2. **Review dashboard** — Read each draft, edit inline, approve or reject.
3. **One-click send** — Sends directly from your Gmail via OAuth2, attaches your resume PDF automatically, and updates the Notion row to `Sent`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | React 19 + Tailwind CSS v4 |
| Email drafts | Anthropic Claude (`claude-3-5-sonnet-20241022`) |
| Database | Notion API |
| Email sending | Nodemailer + Gmail OAuth2 |
| File storage | Vercel Blob (resume PDF) |
| Hosting | Vercel (cron + deployment) |

---

## File Structure

```
job-outreach-dashboard/
├── app/
│   ├── page.tsx                        # Dashboard — company table
│   ├── company/[id]/page.tsx           # Company detail — view/edit draft
│   ├── sent/page.tsx                   # Sent emails history
│   ├── settings/page.tsx               # Resume upload UI
│   └── api/
│       ├── companies/route.ts          # GET all companies from Notion
│       ├── generate/route.ts           # POST generate draft for one company
│       ├── generate/bulk/route.ts      # POST generate drafts for all New
│       ├── approve/[id]/route.ts       # POST set status Approved
│       ├── reject/[id]/route.ts        # POST set status Rejected
│       ├── redo/[id]/route.ts          # POST regenerate draft
│       ├── send/[id]/route.ts          # POST send one email
│       ├── send/bulk/route.ts          # POST send all Approved
│       ├── cron/generate/route.ts      # POST cron endpoint (4am IST daily)
│       └── resume/                     # GET/POST resume blob management
├── lib/
│   ├── notion.ts                       # Notion API client + helpers
│   ├── agents.ts                       # Claude email generation pipeline
│   └── mailer.ts                       # Gmail OAuth2 email sender
├── types/index.ts                      # TypeScript types
├── vercel.json                         # Cron job config
└── .env.local                          # Secrets — never commit this
```

---

## Environment Variables

Create a `.env.local` file at the project root (never commit this file):

```env
# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Notion
NOTION_API_KEY=your_notion_integration_token
NOTION_DB_ID=your_notion_database_id

# Cron protection
CRON_SECRET=any_random_string

# Gmail OAuth2
GMAIL_USER=your_gmail_address
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Sender details
SENDER_NAME=Your Full Name
SENDER_PHONE=your_phone_number
SENDER_LINKEDIN=linkedin.com/in/your-profile
SENDER_BIO=One sentence professional bio
TARGET_ROLES=Associate PM or Business Analyst
```

For production, set these in your Vercel project → Settings → Environment Variables.

---

## Gmail OAuth2 Setup (5 min)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → New Project → Enable **Gmail API**
2. APIs & Services → Credentials → **Create OAuth Client ID** (Web application)
3. Add redirect URI: `https://developers.google.com/oauthplayground`
4. Go to [OAuth2 Playground](https://developers.google.com/oauthplayground)
   - Click the **gear icon** → check **"Use your own OAuth credentials"**
   - Enter your Client ID and Client Secret
5. Find **Gmail API v1** → select `https://mail.google.com/` → **Authorize APIs**
6. Sign in with your Gmail account → Allow
7. Click **Exchange authorization code for tokens** → copy the **Refresh token**
8. Add the refresh token to your env vars

---

## Notion Setup (2 min)

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations) → New integration → copy token
2. Create a database with these properties:

| Property | Type |
|---|---|
| Company | title |
| Role | rich_text |
| Email | email |
| Contact Name | rich_text |
| Contact Title | rich_text |
| Company Type | select: Startup / Stable |
| Email Status | select: New / Draft Ready / Approved / Sent / Rejected / Redo |
| Email Subject | rich_text |
| Email Draft | rich_text |
| Draft Notes | rich_text |
| Emailed | checkbox |
| Date Added | date |
| Number | number |

3. Share the database with your integration
4. Copy the database ID from the URL → set as `NOTION_DB_ID`

---

## Running Locally

```bash
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Email Status Flow

```
New → (cron generates) → Draft Ready → (approve) → Approved → (send) → Sent
                                     → (reject)  → Rejected
                                     → (redo)    → Draft Ready (regenerated)
```

---

## Cron Job

Configured in `vercel.json`:
- Schedule: `30 22 * * *` = **4:00 AM IST** daily
- Endpoint: `/api/cron/generate`
- Protected by `x-cron-secret` header matching `CRON_SECRET` env var

---

## Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/utkarshkr13/job-outreach-dashboard&env=ANTHROPIC_API_KEY,NOTION_API_KEY,NOTION_DB_ID,CRON_SECRET,GMAIL_USER,GMAIL_CLIENT_ID,GMAIL_CLIENT_SECRET,GMAIL_REFRESH_TOKEN,SENDER_NAME,SENDER_PHONE,SENDER_LINKEDIN,SENDER_BIO,TARGET_ROLES&project-name=job-outreach-dashboard&repository-name=job-outreach-dashboard)

Fill in your own credentials when Vercel prompts during setup.
