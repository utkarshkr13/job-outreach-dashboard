import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DB_ID!;

async function main() {
  await notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      'Company': { title: [{ text: { content: 'Vercel Test Corp' } }] },
      'Email': { email: 'ukumardj@gmail.com' },
      'Role': { rich_text: [{ text: { content: 'Senior Software Engineer' } }] },
      'Contact Name': { rich_text: [{ text: { content: 'Jane Doe' } }] },
      'Email Status': { select: { name: 'Approved' } },
      'Email Subject': { rich_text: [{ text: { content: 'Application for Senior Software Engineer - Utkarsh Rajput' } }] },
      'Email Draft': { rich_text: [{ text: { content: 'Hi Jane, <br><br>I am testing the new job outreach dashboard with the resume feature. <br><br>Best,<br>Utkarsh' } }] }
    }
  });
  console.log('Created test company successfully!');
}
main().catch(console.error);
