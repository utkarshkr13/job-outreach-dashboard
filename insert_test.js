const https = require('https');

const NOTION_API_KEY = "ntn_d76283438148nT1AXmanjQUpjQiXhTXFojdE2haHmGj6Wj";
const DB_ID = "e812a1f9-17a1-4db9-a3bb-4ca387d6c661";

const data = JSON.stringify({
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

const options = {
  hostname: 'api.notion.com',
  port: 443,
  path: '/v1/pages',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
