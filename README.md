# 🚀 Job Outreach Dashboard: Setup & Deployment Guide

Welcome! This is a comprehensive, step-by-step setup guide for the **Job Outreach Dashboard**, a Next.js application that automates highly personalized cold email outreach for job hunting. 

The dashboard connects to a **Notion database** of target companies, generates custom-tailored email pitches using **Claude AI / Llama 3**, and sends approved pitches directly from your **Gmail account** (via OAuth2) with your resume PDF automatically attached.

---

## 🌟 Key Features

1. **Notion Database Sync**: Pulls target companies, roles, contact names, and email addresses directly from your Notion workspace.
2. **AI Pitch Generator**: Generates customized subject lines and body pitches tailored to the target company's products, tech stack, and job description.
3. **CRM Status Pipeline**: Tracks leads through various stages: `New` ➜ `Notion Draft Ready` ➜ `Approved` ➜ `Scheduled` ➜ `Sent` ➜ `Replied` ➜ `Interview` ➜ `Offer` ➜ `Rejected`.
4. **On-Demand & Bulk AI Generation**: Generate or regenerate pitches for individual companies directly from the UI drawer, or let the daily cron generate them in bulk.
5. **Secure Authentication Gate**: Protects the dashboard from public access using a simple password gate (`utkarsh@2002`).

---

## 🛠️ Technology Stack

*   **Framework**: Next.js 16 (App Router, TypeScript)
*   **UI**: React 19 + Vanilla CSS & Tailwind CSS v4
*   **AI Models**: Anthropic Claude (`claude-3-5-sonnet-20241022`) or Groq Llama 3 (`llama-3.3-70b-versatile`)
*   **Database**: Notion API (Leads) + Firebase/Firestore (User Settings & Auth Tokens)
*   **Email Engine**: Nodemailer + Gmail OAuth2 (sent from your personal Gmail address)
*   **Storage**: Vercel Blob (stores your resume PDF securely)
*   **Hosting**: Vercel (for serverless hosting, API routes, and Cron Jobs)

---

## 📂 Project Directory Structure

```
job-outreach-dashboard/
├── app/
│   ├── page.tsx                        # Main Dashboard page (Lead grid & Drawer)
│   ├── layout.tsx                      # Root layout wrapper
│   ├── login/page.tsx                  # Firebase sign-in page
│   ├── password/page.tsx               # Password gate landing page
│   ├── sent/page.tsx                   # History table of sent emails
│   ├── settings/page.tsx               # User profile, API credentials, and resume upload UI
│   ├── analytics/page.tsx              # Analytics charts (open rates, replies, success metrics)
│   └── api/
│       ├── auth/site-password/route.ts # Password gate verification API
│       ├── companies/route.ts          # Notion companies fetch and update API
│       ├── generate/route.ts           # Individual AI pitch generation API
│       ├── cron/generate/route.ts      # Automated daily bulk generation (4 AM IST)
│       ├── send/[id]/route.ts          # Gmail sender API for a specific company
│       └── resume/upload/route.ts      # Vercel Blob upload endpoint for resumes
├── lib/
│   ├── notion.ts                       # Notion client helper (fetches/writes properties)
│   ├── agents.ts                       # AI email generation pipeline
│   ├── mailer.ts                       # Nodemailer + Gmail OAuth2 sender
│   └── firebase-admin.ts               # Firebase admin client for backend operations
├── types/index.ts                      # TypeScript types for Companies, Credentials, etc.
└── vercel.json                         # Cron configuration for daily auto-runs
```

---

## ⚙️ Step 1: Environment Setup (`.env.local`)

Create a `.env.local` file in the root directory. Copy and paste the following keys, replacing placeholders with your credentials:

```env
# Active Mode: 'demo' (bypasses Firebase/Notion keys on localhost) or 'production'
NEXT_PUBLIC_APP_MODE=demo

# AI API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GROQ_API_KEY=your_groq_api_key_here
PREFERRED_LLM_PROVIDER=anthropic

# Notion Database Configuration
NOTION_API_KEY=your_notion_integration_token_here
NOTION_DB_ID=your_notion_database_id_here

# Password Gate & Session Security
SITE_PASSWORD=utkarsh@2002
AUTH_SECRET=b6e3f2d1e4c5a6b7f8c9d0e1f2a3b4c5
CRON_SECRET=b6e3f2d1e4c5a6b7f8c9d0e1f2a3b4c5

# Gmail OAuth2 Credentials
GMAIL_USER=your_email@gmail.com
GMAIL_CLIENT_ID=your_google_client_id_here
GMAIL_CLIENT_SECRET=your_google_client_secret_here
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token_here

# Vercel Blob Storage Token (For Resume Uploads)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here

# Firebase Configuration (for user credentials database)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key_here"

# Default Sender Profile Information
SENDER_NAME=Your Full Name
SENDER_PHONE=+91 XXXXXXXXXX
SENDER_LINKEDIN=linkedin.com/in/your-profile
SENDER_BIO=I am a Business Analyst with experience shipping end-to-end AI products.
TARGET_ROLES=Associate PM or Business Analyst
```

*Note: For production deployments, these environment variables must be added to your **Vercel Project Settings ➜ Environment Variables**.*

---

## 📊 Step 2: Notion Setup

1. **Create an Integration**: Go to [notion.so/my-integrations](https://notion.so/my-integrations), click **New integration**, name it, and copy the **Internal Integration Token** (which maps to `NOTION_API_KEY`).
2. **Create a Database**: In Notion, create a database containing the following columns exactly (case-sensitive):

| Property Name | Property Type | Description |
|:---|:---|:---|
| **Company** | `title` | Name of the target company (main column). |
| **Role** | `rich_text` | Target job title (e.g. Associate PM). |
| **Email** | `email` | Recruiter's email address. |
| **Contact Name** | `rich_text` | Recruiter's first and last name. |
| **Contact Title** | `rich_text` | Recruiter's role (e.g. HR Manager). |
| **Company Type** | `select` | Dropdown values: `Startup` or `Stable`. |
| **Email Status** | `select` | Dropdown values: `New`, `Draft Ready`, `Approved`, `Scheduled`, `Sent`, `Rejected`, `Redo`. |
| **Email Subject** | `rich_text` | Stores the generated or edited email subject. |
| **Email Draft** | `rich_text` | Stores the generated or edited email body. |
| **Draft Notes** | `rich_text` | Stores the AI feedback and gatekeeper score. |
| **Emailed** | `checkbox` | Checked automatically when the email is sent. |
| **Date Added** | `date` | Date the lead was entered. |
| **Notes** | `rich_text` | Personal notes or context about the lead. |
| **Source** | `select` | Where the job was found (e.g. LinkedIn, Wellfound). |
| **Source URL** | `url` | Link to the job posting. |

3. **Share Database**: Open your Notion database page, click the **three dots** (top right) ➜ **Add connections** ➜ select your newly created integration.
4. **Copy Database ID**: Extract the database ID from the URL of your Notion database (the 32-character alphanumeric string between `notion.so/` and `?v=`).

---

## 🔑 Step 3: Gmail OAuth2 Authentication Setup

To send emails directly from your personal Gmail address, you need to configure OAuth2:

1. **Google Cloud Console**: Go to [console.cloud.google.com](https://console.cloud.google.com) and create a **New Project**.
2. **Enable Gmail API**: Go to **APIs & Services ➜ Library**, search for **Gmail API**, and click **Enable**.
3. **Configure Consent Screen**:
   - Go to **OAuth consent screen**, select **External**, fill in the app details.
   - Under **Test Users**, add your personal Gmail address (e.g., `your_email@gmail.com`).
4. **Create Credentials**:
   - Go to **Credentials ➜ Create Credentials ➜ OAuth client ID**.
   - Select **Web application** as the application type.
   - Under **Authorized redirect URIs**, add `https://developers.google.com/oauthplayground`.
   - Click **Create** and save the **Client ID** and **Client Secret**.
5. **Get Refresh Token via OAuth2 Playground**:
   - Go to [Google OAuth2 Playground](https://developers.google.com/oauthplayground).
   - Click the **Gear Icon** in the top-right corner.
   - Check the box **"Use your own OAuth credentials"**.
   - Input your **OAuth Client ID** and **OAuth Client Secret**, then close the gear panel.
   - On the left sidebar, scroll down to **Gmail API v1** and expand it.
   - Check the checkbox for `https://mail.google.com/`.
   - Click **Authorize APIs** and log in with your personal Gmail account. Click **Allow** on the permissions screen.
   - On Step 2 of the playground, click **Exchange authorization code for tokens**.
   - Copy the generated **Refresh Token** (this is a long string starting with `1//`).
   - Add these values to your environment variables.

---

## 🔥 Step 4: Firebase / Firestore Setup

The dashboard uses Firebase Auth to register/login users, and Firestore to store encrypted secrets.

1. **Create Firebase Project**: Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.
2. **Enable Firestore**: In the Firebase console, go to **Firestore Database** and click **Create Database**.
3. **Users Collection Schema**:
   Create a collection named `users`. Each document inside this collection represents a user, with the document ID corresponding to their Firebase Authentication `UID`.
   Each user document should have the following structure:
   
   ```json
   {
     "name": "Your Name",
     "credentials": {
       "notionApiKey": "AES_ENCRYPTED_NOTION_TOKEN",
       "notionDbId": "AES_ENCRYPTED_NOTION_DB_ID",
       "anthropicApiKey": "AES_ENCRYPTED_ANTHROPIC_KEY",
       "groqApiKey": "AES_ENCRYPTED_GROQ_KEY",
       "llmProvider": "anthropic",
       "gmailUser": "your_email@gmail.com",
       "gmailClientId": "AES_ENCRYPTED_CLIENT_ID",
       "gmailClientSecret": "AES_ENCRYPTED_CLIENT_SECRET",
       "gmailRefreshToken": "AES_ENCRYPTED_REFRESH_TOKEN"
     },
     "profile": {
       "senderName": "Your Name",
       "phone": "+91 9969396063",
       "linkedin": "linkedin.com/in/your-profile",
       "bio": "Your professional elevator pitch bio.",
       "targetRoles": "Associate PM or Business Analyst"
     },
     "resumeBlobUrl": "https://xxxxx.public.blob.vercel-storage.com/resume.pdf",
     "settings": {
       "cronEnabled": true
     }
   }
   ```
   *Note: On the settings page, the dashboard handles encrypting and saving these fields automatically when you input them.*

4. **Service Account Key**:
   - Go to **Project Settings ➜ Service accounts** in the Firebase console.
   - Click **Generate new private key** to download a JSON file.
   - Extract `clientEmail` and `privateKey` from this JSON file to set your `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` environment variables.

---

## 🚀 Step 5: Running Locally

Once all your environment variables are configured in `.env.local`:

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Run development server**:
   ```bash
   npm run dev
   ```
3. **Access the application**: Open [http://localhost:3000](http://localhost:3000) in your browser.
4. **Login**: Enter the site password `utkarsh@2002` when prompted.

---

## 📤 Step 6: Deploying to Vercel

1. **Repository**: Push your code to a GitHub repository.
2. **Deploy on Vercel**: Create a new project on Vercel, import your repository, and copy all environment variables from `.env.local` to Vercel's environment settings.
3. **Enable Cron**: Vercel will automatically read `vercel.json` and configure the daily cron job endpoint `/api/cron/generate`.

---
*Last audited and verified: June 7, 2026*
