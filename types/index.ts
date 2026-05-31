export type EmailStatus = 
  | 'New' 
  | 'Draft Ready' 
  | 'Approved' 
  | 'Sent' 
  | 'Rejected' 
  | 'Redo' 
  | 'Replied' 
  | 'Interview' 
  | 'Offer'
  | 'Follow-up Ready'
  | 'Scheduled'
  | 'No Response';

export interface Company {
  notionId: string;
  company: string;
  role: string;
  email: string;
  contactName: string;
  contactTitle: string;
  companyType: 'Startup' | 'Stable' | null;
  salaryRange: string;
  source: string;
  sourceUrl: string;
  location: string;
  notes: string;
  emailStatus: EmailStatus | null;
  emailDraft: string;
  emailSubject: string;
  draftNotes: string;
  emailed: boolean;
  dateAdded: string;
  resumeStatus?: 'custom' | 'global' | 'none';
  openCount?: number;
  resumeType?: 'pm' | 'ba' | 'custom' | null;
  // Feature 1: Intelligent Follow-up Sequencing
  followUpCount?: number;
  lastContacted?: string;
  // Feature 2: Reply Intelligence
  gmailThreadId?: string;
  replySnippet?: string;
  // Feature 3: Smart Send Timing
  scheduledSendTime?: string;
  // Feature 4: JD Keyword Injection
  jobDescriptionUrl?: string;
  jdKeywords?: string;
  skillsGap?: string;
  // Feature 5: Company Signal Monitoring
  companySignal?: 'Hot' | 'Normal' | 'Caution' | 'Archive' | null;
  signalReason?: string;
  signalUpdated?: string;
}

export interface AgentResult {
  subject: string;
  body: string;
  score: number;
  notes: string;
}
