const { Client } = require('@notionhq/client');

// Simple dotenv parser fallback to load .env.local variables
const fs = require('fs');
const path = require('path');
try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.replace(/^"|"+$/g, '');
        }
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {
  console.log('Skipped manual .env.local parsing:', e.message);
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DB_ID;

async function updateSchema() {
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_DB_ID) {
    console.error('Error: NOTION_API_KEY and NOTION_DB_ID must be set in .env.local or environment.');
    process.exit(1);
  }

  try {
    console.log(`Adding missing properties to Notion database: ${DB_ID}...`);
    await notion.databases.update({
      database_id: DB_ID,
      properties: {
        'Email Status': {
          select: {
            options: [
              { name: 'New' },
              { name: 'Draft Ready' },
              { name: 'Approved' },
              { name: 'Sent' },
              { name: 'Rejected' },
              { name: 'Redo' },
              { name: 'Scheduled' },
              { name: 'Replied' },
              { name: 'Interview' },
              { name: 'Offer' },
              { name: 'No Response' },
              { name: 'Follow-up Ready' }
            ]
          }
        },
        'Email Draft': { rich_text: {} },
        'Email Subject': { rich_text: {} },
        'Draft Notes': { rich_text: {} },
        'Emailed': { checkbox: {} },
        'Follow-up Count': { number: {} },
        'Last Contacted': { date: {} },
        'Gmail Thread ID': { rich_text: {} },
        'Reply Snippet': { rich_text: {} },
        'Scheduled Send Time': { date: {} },
        'Job Description URL': { url: {} },
        'JD Keywords': { rich_text: {} },
        'Skills Gap': { rich_text: {} },
        'Company Signal': {
          select: {
            options: [
              { name: 'Hot' },
              { name: 'Caution' }
            ]
          }
        },
        'Signal Reason': { rich_text: {} },
        'Signal Updated': { date: {} }
      }
    });
    console.log('✅ Successfully added and updated all schema properties in the Notion database!');
  } catch (error) {
    console.error('❌ Error updating database schema:', error.message);
  }
}

updateSchema();
