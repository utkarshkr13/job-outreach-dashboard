export type EmailStatus = 'New' | 'Draft Ready' | 'Approved' | 'Sent' | 'Rejected' | 'Redo';

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
}

export interface AgentResult {
  subject: string;
  body: string;
  score: number;
  notes: string;
}
