// Vercel runs this before deploying.
// Reads credentials from Vercel environment variables and injects them
// into HTML files so the browser can use them.

const fs = require('fs');

const url         = process.env.SUPABASE_URL;
const key         = process.env.SUPABASE_ANON_KEY;
const coachEmails = process.env.COACH_EMAILS;

if (!url || !key) {
  console.error('❌  Missing: SUPABASE_URL and/or SUPABASE_ANON_KEY');
  console.error('    Add them in Vercel → Project Settings → Environment Variables');
  process.exit(1);
}

if (!coachEmails) {
  console.error('❌  Missing: COACH_EMAILS');
  console.error('    Add it in Vercel → Project Settings → Environment Variables');
  console.error('    Example value: tashbromiley@gmail.com,othercoach@example.com');
  process.exit(1);
}

const files = ['index.html', 'setup.html', 'app.html', 'coach.html'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content
    .replace(/YOUR_SUPABASE_URL/g,      url)
    .replace(/YOUR_SUPABASE_ANON_KEY/g, key)
    .replace(/YOUR_COACH_EMAILS/g,      coachEmails);
  fs.writeFileSync(file, content);
  console.log(`✓ ${file}`);
});

console.log('Build complete.');
