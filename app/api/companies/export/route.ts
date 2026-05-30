import { NextResponse } from 'next/server';
import { getAllCompanies, getNotionConnection } from '@/lib/notion';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Authenticate user & load decrypted secrets (allows token in searchParams)
    const { creds } = await getAuthenticatedUser(req);
    const connection = getNotionConnection(creds.notionApiKey, creds.notionDbId);

    const companies = await getAllCompanies(connection);
    const sentCompanies = companies.filter(c => c.emailStatus === 'Sent');

    // Create CSV header and rows
    const headers = [
      'Company',
      'Role',
      'Contact Name',
      'Contact Title',
      'Email',
      'Source',
      'Location',
      'Salary Range (LPA)',
      'Date Emailed'
    ];

    const escapeCsv = (str: string) => {
      if (!str) return '""';
      const clean = str.replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${clean}"`;
    };

    const csvRows = [
      headers.join(','),
      ...sentCompanies.map(c => [
        escapeCsv(c.company),
        escapeCsv(c.role),
        escapeCsv(c.contactName),
        escapeCsv(c.contactTitle),
        escapeCsv(c.email),
        escapeCsv(c.source),
        escapeCsv(c.location),
        escapeCsv(c.salaryRange),
        escapeCsv(c.dateAdded) // maps date sent
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="outreach_history.csv"',
      },
    });

  } catch (error: any) {
    console.error('Error exporting outreach data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
