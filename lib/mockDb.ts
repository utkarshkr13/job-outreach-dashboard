import { Company, EmailStatus, AgentResult } from '@/types';

// Let's seed realistic, beautiful companies for the demo mode
const SEED_COMPANIES: Company[] = [
  {
    notionId: 'demo-stripe-123',
    company: 'Stripe',
    role: 'Associate PM',
    email: 'recruiter@stripe.com',
    contactName: 'Sarah Jenkins',
    contactTitle: 'Technical Recruiter',
    companyType: 'Stable',
    salaryRange: '24-28',
    source: 'LinkedIn',
    sourceUrl: 'https://linkedin.com/jobs/view/stripe-apm',
    location: 'Bangalore (Hybrid)',
    notes: 'Stripe is expanding its Connect platforms engineering team in APAC.',
    emailStatus: 'Draft Ready',
    emailSubject: 'Associate PM / BA Interest at Stripe | Utkarsh Kumar',
    emailDraft: `Hi Sarah,

I've been following Stripe's focus on expanding Stripe Connect for platforms and the recent updates to Billing. The way you make complex multi-party payment flows look simple is exactly the kind of product engineering I love.

I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives.

I am currently looking for Associate PM or Business Analyst roles and would love to explore if there is a fit at Stripe. Happy to connect for a quick 15-minute call.

Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232`,
    draftNotes: 'Score: 9.5. Approved. Hook is highly specific to Stripe\'s Connect and Billing products.',
    emailed: false,
    dateAdded: '2026-05-28',
  },
  {
    notionId: 'demo-vercel-456',
    company: 'Vercel',
    role: 'Business Analyst',
    email: 'hr@vercel.com',
    contactName: 'David Miller',
    contactTitle: 'Head of Talent',
    companyType: 'Startup',
    salaryRange: '20-25',
    source: 'Career Page',
    sourceUrl: 'https://vercel.com/careers',
    location: 'Remote (India)',
    notes: 'Fast growing startup behind Next.js. Focus on enterprise dashboard workflows.',
    emailStatus: 'Draft Ready',
    emailSubject: 'Associate PM / BA Interest at Vercel | Utkarsh Kumar',
    emailDraft: `Hi David,

The velocity with which Vercel is building v0.dev and bringing Turbopack to production is incredible. Having spent a lot of time optimization-focused, I really appreciate how you are streamlining frontend development workflows.

I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives.

I am currently looking for Associate PM or Business Analyst roles and would love to explore if there is a fit at Vercel. Happy to connect for a quick 15-minute call.

Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232`,
    draftNotes: 'Score: 9.2. Approved. Opened with strong hooks about v0 and Turbopack.',
    emailed: false,
    dateAdded: '2026-05-29',
  },
  {
    notionId: 'demo-slack-789',
    company: 'Slack',
    role: 'Associate PM',
    email: 'slack-jobs@slack.com',
    contactName: 'Emily Watson',
    contactTitle: 'Product Recruiting Lead',
    companyType: 'Stable',
    salaryRange: '22-26',
    source: 'LinkedIn',
    sourceUrl: 'https://linkedin.com/jobs',
    location: 'Mumbai',
    notes: 'CRM integration PM team.',
    emailStatus: 'Approved',
    emailSubject: 'Associate PM / BA Interest at Slack | Utkarsh Kumar',
    emailDraft: `Hi Emily,

I'm a big fan of how Slack has evolved from a messaging app into an operating system for teams, especially with the release of Canvas and Slack Lists. The focus on deep work and asynchronous alignment is brilliant.

I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives.

I am currently looking for Associate PM or Business Analyst roles and would love to explore if there is a fit at Slack. Happy to connect for a quick 15-minute call.

Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232`,
    draftNotes: 'Score: 9.0. Approved. Good focus on Slack Lists and Canvas.',
    emailed: false,
    dateAdded: '2026-05-29',
  },
  {
    notionId: 'demo-retool-101',
    company: 'Retool',
    role: 'Business Analyst',
    email: 'careers@retool.com',
    contactName: 'James Carter',
    contactTitle: 'Talent Acquisition',
    companyType: 'Startup',
    salaryRange: '18-22',
    source: 'Naukri',
    sourceUrl: 'https://naukri.com',
    location: 'Bangalore',
    notes: 'Retool builds developer tools for internal workflows. BA role will work with customer success teams.',
    emailStatus: 'New',
    emailSubject: '',
    emailDraft: '',
    draftNotes: '',
    emailed: false,
    dateAdded: '2026-05-30',
  },
  {
    notionId: 'demo-canva-202',
    company: 'Canva',
    role: 'Associate PM',
    email: 'hiring@canva.com',
    contactName: 'Sophia Lin',
    contactTitle: 'HR Associate',
    companyType: 'Stable',
    salaryRange: '16-20',
    source: 'LinkedIn',
    sourceUrl: 'https://linkedin.com',
    location: 'Sydney (Remote)',
    notes: 'AI design tools team.',
    emailStatus: 'Sent',
    emailSubject: 'Associate PM / BA Interest at Canva | Utkarsh Kumar',
    emailDraft: `Hi Sophia,

Seeing Canva bring AI features into the enterprise suite so seamlessly is impressive. Making design accessible to anyone while keeping collaborative features robust is a massive PM challenge.

I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives.

I am currently looking for Associate PM or Business Analyst roles and would love to explore if there is a fit at Canva. Happy to connect for a quick 15-minute call.

Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232`,
    draftNotes: 'Score: 8.9. Approved.',
    emailed: true,
    dateAdded: '2026-05-25',
  },
  {
    notionId: 'demo-airbnb-303',
    company: 'Airbnb',
    role: 'Associate PM',
    email: 'team@airbnb.com',
    contactName: 'Olivia Brown',
    contactTitle: 'Hiring Lead',
    companyType: 'Stable',
    salaryRange: '25-30',
    source: 'Indeed',
    sourceUrl: 'https://indeed.com',
    location: 'Remote',
    notes: 'Guest experience squad.',
    emailStatus: 'Rejected',
    emailSubject: 'Associate PM / BA Interest at Airbnb | Utkarsh Kumar',
    emailDraft: `Hi Olivia,

I love Airbnb's focus on the guest experience and the recent updates in guest favorites and co-hosting. The attention to detail in UX is second to none.

I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives.

I am currently looking for Associate PM or Business Analyst roles and would love to explore if there is a fit at Airbnb. Happy to connect for a quick 15-minute call.

Utkarsh Kumar
+91 9969396063
linkedin.com/in/utkarsh-kumar-rajput-76b673232`,
    draftNotes: 'Score: 8.5. Rejected by user during manual review.',
    emailed: false,
    dateAdded: '2026-05-26',
  }
];

// In-memory mock store
let mockCompanies: Company[] = [...SEED_COMPANIES];
let mockResumeUploaded = false;

export function getMockCompanies(status?: EmailStatus | EmailStatus[]): Company[] {
  if (!status) return mockCompanies;
  const statuses = Array.isArray(status) ? status : [status];
  return mockCompanies.filter(c => c.emailStatus && statuses.includes(c.emailStatus));
}

export function getMockCompany(id: string): Company | undefined {
  return mockCompanies.find(c => c.notionId === id);
}

export function mockUpdateEmailDraft(
  notionId: string,
  subject: string,
  body: string,
  notes: string,
  status: EmailStatus
): void {
  mockCompanies = mockCompanies.map(c => {
    if (c.notionId === notionId) {
      return {
        ...c,
        emailSubject: subject,
        emailDraft: body,
        draftNotes: notes,
        emailStatus: status,
      };
    }
    return c;
  });
}

export function mockUpdateStatus(notionId: string, status: EmailStatus, notes?: string): void {
  mockCompanies = mockCompanies.map(c => {
    if (c.notionId === notionId) {
      const updated: Company = {
        ...c,
        emailStatus: status,
      };
      if (notes !== undefined) {
        updated.draftNotes = notes;
      }
      if (status === 'Sent') {
        updated.emailed = true;
      }
      return updated;
    }
    return c;
  });
}

// Generates high-quality specific hooks mock-style instantly
export function mockGenerateDraftPipeline(company: Company): AgentResult {
  const companyName = company.company;
  const firstName = company.contactName
    ? company.contactName.trim().split(' ')[0]
    : 'there';

  const hooks: Record<string, string> = {
    'Retool': 'I\'ve been playing around with Retool\'s new mobile workflows and custom component libraries. The way you make it simple for developers to build internal interfaces without styling from scratch is incredibly elegant.',
    'Stripe': 'I\'ve been following Stripe\'s focus on expanding Stripe Connect for platforms and the recent updates to Billing. The way you make complex multi-party payment flows look simple is exactly the kind of product engineering I love.',
    'Vercel': 'The velocity with which Vercel is building v0.dev and bringing Turbopack to production is incredible. Having spent a lot of time optimization-focused, I really appreciate how you are streamlining frontend development workflows.',
    'Slack': 'I\'m a big fan of how Slack has evolved from a messaging app into an operating system for teams, especially with the release of Canvas and Slack Lists. The focus on deep work and asynchronous alignment is brilliant.',
    'Canva': 'Seeing Canva bring AI features into the enterprise suite so seamlessly is impressive. Making design accessible to anyone while keeping collaborative features robust is a massive PM challenge.',
    'Airbnb': 'I love Airbnb\'s focus on the guest experience and the recent updates in guest favorites and co-hosting. The attention to detail in UX is second to none.'
  };

  const hook = hooks[companyName] ?? `I have been following ${companyName}'s work in building user-first digital products and solutions. Seeing your recent product launches and development speed is incredibly inspiring.`;
  const subject = `Associate PM / BA Interest at ${companyName} | Utkarsh Kumar`;
  
  const intro = "I am Utkarsh, a Business Analyst who has shipped end-to-end at an AI-first company, owning everything from BRDs and sprint planning to UAT cycles and client go-lives.";
  const signature = "Utkarsh Kumar\n+91 9969396063\nlinkedin.com/in/utkarsh-kumar-rajput-76b673232";
  const roles = "Associate PM or Business Analyst";
  
  const body = `Hi ${firstName},

${hook}

${intro}

I am currently looking for ${roles} roles and would love to explore if there is a fit at ${companyName}. Happy to connect for a quick 15-minute call.

${signature}`;

  return {
    subject,
    body,
    score: 9.4,
    notes: 'Score: 9.4. Approved (Mock Demo). Fits all formatting and template criteria perfectly.'
  };
}

export function isMockResumeUploaded(): boolean {
  return mockResumeUploaded;
}

export function setMockResumeUploaded(uploaded: boolean): void {
  mockResumeUploaded = uploaded;
}
