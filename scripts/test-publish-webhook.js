/**
 * Simple test script to POST to the publish webhook (server-side) using the secret.
 * Usage:
 *   node scripts/test-publish-webhook.js --slug my-story-slug
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { argv } = require('process');

const args = argv.slice(2);
let slug = 'test-slug';
let overrideUrl = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--slug' && args[i+1]) slug = args[i+1];
  if ((args[i] === '--url' || args[i] === '--site-url') && args[i+1]) overrideUrl = args[i+1];
}

const secret = process.env.SITEMAP_WEBHOOK_SECRET;
if (!secret) {
  console.error('\n❌ ERROR: SITEMAP_WEBHOOK_SECRET not found!');
  console.error('\nPlease create a .env.local file in the project root with:');
  console.error('SITEMAP_WEBHOOK_SECRET=acc66ef669a93d560bbbd987752c4656734b839f44264e430d84f35cf176462e');
  console.error('\nOr set it temporarily in PowerShell:');
  console.error('$env:SITEMAP_WEBHOOK_SECRET="acc66ef669a93d560bbbd987752c4656734b839f44264e430d84f35cf176462e"; node scripts/test-publish-webhook.js --slug test-story');
  process.exit(1);
}

// Allow overriding the target site URL with --url or --site-url for testing (e.g. http://localhost:3000)
const url = overrideUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

console.log(`\n${'='.repeat(80)}`);
console.log('Testing Publish Webhook');
console.log(`${'='.repeat(80)}\n`);
console.log(`Webhook URL: ${url}/api/publish-webhook`);
console.log(`Story slug: ${slug}`);
console.log(`Secret: ${secret.substring(0, 10)}...${secret.substring(secret.length - 5)}`);
console.log('');

async function run() {
  try {
    console.log('Sending request...\n');
    
    const res = await fetch(`${url}/api/publish-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sitemap-secret': secret
      },
      body: JSON.stringify({ slug })
    });

    const text = await res.text();
    
    console.log('--- Response ---');
    console.log('Status:', res.status);
    // Print response headers to help diagnose 405 / method issues
    try {
      const headersObj = {};
      for (const [k, v] of res.headers) headersObj[k] = v;
      console.log('Headers:', JSON.stringify(headersObj, null, 2));
    } catch (e) {
      // ignore
    }
    console.log('Body:', text);

    // If the POST failed, probe other HTTP methods to help diagnose hosting/routing issues
    if (res.status !== 200) {
      try {
        console.log('\n--- Probing other HTTP methods to help diagnose 405/404 ---');
        const methods = ['GET', 'OPTIONS', 'HEAD'];
        for (const m of methods) {
          try {
            const probe = await fetch(`${url}/api/publish-webhook`, { method: m });
            const pText = m === 'HEAD' ? '' : await probe.text().catch(() => '');
            console.log(`${m} -> Status: ${probe.status}`);
            try {
              const headersObj = {};
              for (const [k, v] of probe.headers) headersObj[k] = v;
              console.log(`${m} Headers:`, JSON.stringify(headersObj, null, 2));
            } catch (e) {}
            if (pText) console.log(`${m} Body:`, pText);
          } catch (e) {
            console.log(`${m} -> error:`, String(e));
          }
        }
      } catch (e) {
        // ignore probing errors
      }
    }

    // If POST failed and we have a backend API URL configured, try forwarding to that as a fallback.
    if (res.status !== 200 && process.env.NEXT_PUBLIC_API_URL) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
      const candidates = [`${apiBase}/api/publish-webhook`, `${apiBase}/publish-webhook`];
      for (const c of candidates) {
        try {
          console.log(`\nAttempting fallback to backend endpoint: ${c}`);
          const fRes = await fetch(c, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-sitemap-secret': secret },
            body: JSON.stringify({ slug })
          });
          const fText = await fRes.text().catch(() => '');
          console.log('Fallback Status:', fRes.status);
          try {
            const headersObj = {};
            for (const [k, v] of fRes.headers) headersObj[k] = v;
            console.log('Fallback Headers:', JSON.stringify(headersObj, null, 2));
          } catch (e) {}
          console.log('Fallback Body:', fText);
          if (fRes.status === 200) {
            console.log('\n✅ SUCCESS: Backend fallback executed successfully!');
            break;
          }
        } catch (e) {
          console.log('Fallback attempt error:', String(e));
        }
      }
    }

    if (res.status === 200) {
      console.log('\n✅ SUCCESS: Webhook executed successfully!');
      try {
        const json = JSON.parse(text);
        if (json.pingResults) {
          console.log('\nSearch Engine Ping Results:');
          json.pingResults.forEach(result => {
            console.log(`  - ${result.engine}: ${result.ok ? '✅ Success' : '❌ Failed'}`);
          });
        }
        if (json.indexingResult) {
          console.log('\nGoogle Indexing API Result:');
          console.log(`  Status: ${json.indexingResult.ok ? '✅ Success' : '❌ Failed'}`);
          if (json.indexingResult.reason) {
            console.log(`  Reason: ${json.indexingResult.reason}`);
          }
        }
      } catch (e) {
        // Response is not JSON, that's okay
      }
    } else {
      console.log('\n❌ FAILED: Webhook returned an error');
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
  } catch (e) {
    console.error('\n❌ Request failed:', e.message);
    console.log(`\n${'='.repeat(80)}\n`);
    process.exit(1);
  }
}

run();