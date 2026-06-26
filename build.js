// Vercel runs this before deploying.
// It reads SUPABASE_URL and SUPABASE_ANON_KEY from Vercel's environment
// and injects them into the HTML files so the browser can use them.

const fs = require('fs');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌  Missing environment variables: SUPABASE_URL and/or SUPABASE_ANON_KEY');
  console.error('    Add them in Vercel → Project Settings → Environment Variables');
  process.exit(1);
}

const files = ['index.html', 'setup.html', 'app.html'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content
    .replace(/YOUR_SUPABASE_URL/g,   url)
    .replace(/YOUR_SUPABASE_ANON_KEY/g, key);
  fs.writeFileSync(file, content);
  console.log(`✓ ${file}`);
});

console.log('Build complete.');
