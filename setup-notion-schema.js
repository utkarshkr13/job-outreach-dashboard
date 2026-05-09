const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DB_ID;

async function updateSchema() {
  if (!process.env.NOTION_API_KEY) {
    console.error('Please set NOTION_API_KEY in your environment before running this script.');
    process.exit(1);
  }

  try {
    console.log('Adding new properties to Notion database...');
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
              { name: 'Redo' }
            ]
          }
        },
        'Email Draft': {
          rich_text: {}
        },
        'Email Subject': {
          rich_text: {}
        },
        'Draft Notes': {
          rich_text: {}
        }
      }
    });
    console.log('Successfully added new properties to the Notion database!');
  } catch (error) {
    console.error('Error updating database schema:', error.message);
  }
}

updateSchema();
