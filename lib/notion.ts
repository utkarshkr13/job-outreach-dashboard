import { Client } from '@notionhq/client';
import { Company, EmailStatus } from '@/types';
import {
  getMockCompanies,
  mockUpdateEmailDraft,
  mockUpdateStatus,
} from './mockDb';

const notion = process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && process.env.NOTION_API_KEY
  ? new Client({ auth: process.env.NOTION_API_KEY })
  : null as any;
const DB_ID = process.env.NOTION_DB_ID!;

export async function getCompaniesByStatus(status: EmailStatus | EmailStatus[]): Promise<Company[]> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    return getMockCompanies(status);
  }

  const statuses = Array.isArray(status) ? status : [status];
  
  const response = await notion.databases.query({
    database_id: DB_ID,
    filter: {
      or: statuses.map(s => ({
        property: 'Email Status',
        select: { equals: s }
      }))
    }
  });

  return response.results.map((page: any) => ({
    notionId: page.id,
    company: page.properties['Company']?.title?.[0]?.text?.content ?? '',
    role: page.properties['Role']?.rich_text?.[0]?.text?.content ?? '',
    email: page.properties['Email']?.email ?? '',
    contactName: page.properties['Contact Name']?.rich_text?.[0]?.text?.content ?? '',
    contactTitle: page.properties['Contact Title']?.rich_text?.[0]?.text?.content ?? '',
    companyType: page.properties['Company Type']?.select?.name ?? null,
    salaryRange: page.properties['Salary Range (LPA)']?.rich_text?.[0]?.text?.content ?? '',
    source: page.properties['Source']?.select?.name ?? '',
    sourceUrl: page.properties['Source URL']?.url ?? '',
    location: page.properties['Location']?.rich_text?.[0]?.text?.content ?? '',
    notes: page.properties['Notes']?.rich_text?.[0]?.text?.content ?? '',
    emailStatus: page.properties['Email Status']?.select?.name ?? null,
    emailDraft: page.properties['Email Draft']?.rich_text?.[0]?.text?.content ?? '',
    emailSubject: page.properties['Email Subject']?.rich_text?.[0]?.text?.content ?? '',
    draftNotes: page.properties['Draft Notes']?.rich_text?.[0]?.text?.content ?? '',
    emailed: page.properties['Emailed']?.checkbox ?? false,
    dateAdded: page.properties['Date Added']?.date?.start ?? '',
  }));
}

export async function getAllCompanies(): Promise<Company[]> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    return getMockCompanies();
  }

  const response = await notion.databases.query({
    database_id: DB_ID,
    sorts: [{ property: 'Number', direction: 'ascending' }]
  });

  return response.results.map((page: any) => ({
    notionId: page.id,
    company: page.properties['Company']?.title?.[0]?.text?.content ?? '',
    role: page.properties['Role']?.rich_text?.[0]?.text?.content ?? '',
    email: page.properties['Email']?.email ?? '',
    contactName: page.properties['Contact Name']?.rich_text?.[0]?.text?.content ?? '',
    contactTitle: page.properties['Contact Title']?.rich_text?.[0]?.text?.content ?? '',
    companyType: page.properties['Company Type']?.select?.name ?? null,
    salaryRange: page.properties['Salary Range (LPA)']?.rich_text?.[0]?.text?.content ?? '',
    source: page.properties['Source']?.select?.name ?? '',
    sourceUrl: page.properties['Source URL']?.url ?? '',
    location: page.properties['Location']?.rich_text?.[0]?.text?.content ?? '',
    notes: page.properties['Notes']?.rich_text?.[0]?.text?.content ?? '',
    emailStatus: page.properties['Email Status']?.select?.name ?? null,
    emailDraft: page.properties['Email Draft']?.rich_text?.[0]?.text?.content ?? '',
    emailSubject: page.properties['Email Subject']?.rich_text?.[0]?.text?.content ?? '',
    draftNotes: page.properties['Draft Notes']?.rich_text?.[0]?.text?.content ?? '',
    emailed: page.properties['Emailed']?.checkbox ?? false,
    dateAdded: page.properties['Date Added']?.date?.start ?? '',
  }));
}

export async function updateEmailDraft(
  notionId: string,
  subject: string,
  body: string,
  notes: string,
  status: EmailStatus
): Promise<void> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    mockUpdateEmailDraft(notionId, subject, body, notes, status);
    return;
  }

  await notion.pages.update({
    page_id: notionId,
    properties: {
      'Email Status': { select: { name: status } },
      'Email Subject': { rich_text: [{ text: { content: subject.slice(0, 2000) } }] },
      'Email Draft': { rich_text: [{ text: { content: body.slice(0, 2000) } }] },
      'Draft Notes': { rich_text: [{ text: { content: notes.slice(0, 2000) } }] },
    }
  });
}

export async function updateStatus(notionId: string, status: EmailStatus, notes?: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    mockUpdateStatus(notionId, status, notes);
    return;
  }

  const props: any = {
    'Email Status': { select: { name: status } },
  };
  if (notes) {
    props['Draft Notes'] = { rich_text: [{ text: { content: notes.slice(0, 2000) } }] };
  }
  if (status === 'Sent') {
    props['Emailed'] = { checkbox: true };
  }
  await notion.pages.update({ page_id: notionId, properties: props });
}

export async function getCompanyById(id: string): Promise<Company | null> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    const { getMockCompany } = require('./mockDb');
    return getMockCompany(id) ?? null;
  }

  const page: any = await notion.pages.retrieve({ page_id: id });
  if (!page) return null;

  return {
    notionId: page.id,
    company: page.properties['Company']?.title?.[0]?.text?.content ?? '',
    role: page.properties['Role']?.rich_text?.[0]?.text?.content ?? '',
    email: page.properties['Email']?.email ?? '',
    contactName: page.properties['Contact Name']?.rich_text?.[0]?.text?.content ?? '',
    contactTitle: page.properties['Contact Title']?.rich_text?.[0]?.text?.content ?? '',
    companyType: page.properties['Company Type']?.select?.name ?? null,
    salaryRange: page.properties['Salary Range (LPA)']?.rich_text?.[0]?.text?.content ?? '',
    source: page.properties['Source']?.select?.name ?? '',
    sourceUrl: page.properties['Source URL']?.url ?? '',
    location: page.properties['Location']?.rich_text?.[0]?.text?.content ?? '',
    notes: page.properties['Notes']?.rich_text?.[0]?.text?.content ?? '',
    emailStatus: page.properties['Email Status']?.select?.name ?? null,
    emailDraft: page.properties['Email Draft']?.rich_text?.[0]?.text?.content ?? '',
    emailSubject: page.properties['Email Subject']?.rich_text?.[0]?.text?.content ?? '',
    draftNotes: page.properties['Draft Notes']?.rich_text?.[0]?.text?.content ?? '',
    emailed: page.properties['Emailed']?.checkbox ?? false,
    dateAdded: page.properties['Date Added']?.date?.start ?? '',
  };
}
