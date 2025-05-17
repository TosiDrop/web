import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const wranglerContent = fs.readFileSync('./wrangler.jsonc', 'utf8');

const updatedContent = wranglerContent.replace(
  '"id": "KV_NAMESPACE_ID"',
  `"id": "${process.env.KV_NAMESPACE_ID}"`
);

fs.writeFileSync('./wrangler.jsonc', updatedContent);

console.log('Updated wrangler.jsonc with environment variables');