import { Client } from '@notionhq/client';
import { Company, EmailStatus } from '@/types';
import {
  getMockCompanies,
  mockUpdateEmailDraft,
  mockUpdateStatus,
  getCompanyResumeStatus,
} from './mockDb';

export interface NotionConnection {
  notion: Client;
  DB_ID: string;
}

/**
 * Factory helper to construct a scoped Notion Client for a user
 */
export function getNotionConnection(apiKey: string, dbId: string): NotionConnection {
  const notion = process.env.NEXT_PUBLIC_APP_MODE !== 'demo' && apiKey
    ? new Client({ auth: apiKey })
    : null as any;
  return { notion, DB_ID: dbId };
}

function mapPageToCompany(page: any): Company {
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
    resumeStatus: getCompanyResumeStatus(page.id),
    
    // Feature fields
    followUpCount: page.properties['Follow-up Count']?.number ?? 0,
    lastContacted: page.properties['Last Contacted']?.date?.start ?? '',
    gmailThreadId: page.properties['Gmail Thread ID']?.rich_text?.[0]?.text?.content ?? '',
    replySnippet: page.properties['Reply Snippet']?.rich_text?.[0]?.text?.content ?? '',
    scheduledSendTime: page.properties['Scheduled Send Time']?.date?.start ?? '',
    jobDescriptionUrl: page.properties['Job Description URL']?.url ?? '',
    jdKeywords: page.properties['JD Keywords']?.rich_text?.[0]?.text?.content ?? '',
    skillsGap: page.properties['Skills Gap']?.rich_text?.[0]?.text?.content ?? '',
    companySignal: page.properties['Company Signal']?.select?.name ?? null,
    signalReason: page.properties['Signal Reason']?.rich_text?.[0]?.text?.content ?? '',
    signalUpdated: page.properties['Signal Updated']?.date?.start ?? '',
  };
}

export async function getCompaniesByStatus(
  connection: NotionConnection,
  status: EmailStatus | EmailStatus[]
): Promise<Company[]> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    return getMockCompanies(status);
  }

  const { notion, DB_ID } = connection;
  const statuses = Array.isArray(status) ? status : [status];
  
  let results: any[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: DB_ID,
      start_cursor: cursor,
      filter: {
        or: statuses.map(s => ({
          property: 'Email Status',
          select: { equals: s }
        }))
      }
    });

    results = results.concat(response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  return results.map(mapPageToCompany);
}

export async function getAllCompanies(connection: NotionConnection): Promise<Company[]> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    return getMockCompanies();
  }

  const { notion, DB_ID } = connection;
  let results: any[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: DB_ID,
      start_cursor: cursor,
      sorts: [{ property: 'Number', direction: 'ascending' }]
    });

    results = results.concat(response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  return results.map(mapPageToCompany);
}

export async function updateEmailDraft(
  connection: NotionConnection,
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

  const { notion } = connection;
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

export async function updateStatus(
  connection: NotionConnection,
  notionId: string,
  status: EmailStatus,
  notes?: string
): Promise<void> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    mockUpdateStatus(notionId, status, notes);
    return;
  }

  const { notion } = connection;
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

export async function getCompanyById(connection: NotionConnection, id: string): Promise<Company | null> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    const { getMockCompany } = require('./mockDb');
    return getMockCompany(id) ?? null;
  }

  const { notion } = connection;
  const page: any = await notion.pages.retrieve({ page_id: id });
  if (!page) return null;

  return mapPageToCompany(page);
}

export async function updateCompanyProperties(
  connection: NotionConnection,
  notionId: string,
  properties: Partial<Company>
): Promise<void> {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    const { mockUpdateProperties } = require('./mockDb');
    mockUpdateProperties(notionId, properties);
    return;
  }

  const { notion } = connection;
  const props: any = {};

  if (properties.emailStatus !== undefined) {
    props['Email Status'] = { select: { name: properties.emailStatus } };
    if (properties.emailStatus === 'Sent') {
      props['Emailed'] = { checkbox: true };
    }
  }
  if (properties.emailSubject !== undefined) {
    props['Email Subject'] = { rich_text: [{ text: { content: properties.emailSubject.slice(0, 2000) } }] };
  }
  if (properties.emailDraft !== undefined) {
    props['Email Draft'] = { rich_text: [{ text: { content: properties.emailDraft.slice(0, 2000) } }] };
  }
  if (properties.draftNotes !== undefined) {
    props['Draft Notes'] = { rich_text: [{ text: { content: properties.draftNotes.slice(0, 2000) } }] };
  }
  if (properties.followUpCount !== undefined) {
    props['Follow-up Count'] = { number: properties.followUpCount };
  }
  if (properties.lastContacted !== undefined) {
    props['Last Contacted'] = { date: properties.lastContacted ? { start: properties.lastContacted } : null };
  }
  if (properties.gmailThreadId !== undefined) {
    props['Gmail Thread ID'] = { rich_text: [{ text: { content: properties.gmailThreadId.slice(0, 2000) } }] };
  }
  if (properties.replySnippet !== undefined) {
    props['Reply Snippet'] = { rich_text: [{ text: { content: properties.replySnippet.slice(0, 2000) } }] };
  }
  if (properties.scheduledSendTime !== undefined) {
    props['Scheduled Send Time'] = { date: properties.scheduledSendTime ? { start: properties.scheduledSendTime } : null };
  }
  if (properties.jobDescriptionUrl !== undefined) {
    props['Job Description URL'] = { url: properties.jobDescriptionUrl || null };
  }
  if (properties.jdKeywords !== undefined) {
    props['JD Keywords'] = { rich_text: [{ text: { content: properties.jdKeywords.slice(0, 2000) } }] };
  }
  if (properties.skillsGap !== undefined) {
    props['Skills Gap'] = { rich_text: [{ text: { content: properties.skillsGap.slice(0, 2000) } }] };
  }
  if (properties.companySignal !== undefined) {
    props['Company Signal'] = { select: properties.companySignal ? { name: properties.companySignal } : null };
  }
  if (properties.signalReason !== undefined) {
    props['Signal Reason'] = { rich_text: [{ text: { content: properties.signalReason.slice(0, 2000) } }] };
  }
  if (properties.signalUpdated !== undefined) {
    props['Signal Updated'] = { date: properties.signalUpdated ? { start: properties.signalUpdated } : null };
  }

  await notion.pages.update({
    page_id: notionId,
    properties: props,
  });
}
