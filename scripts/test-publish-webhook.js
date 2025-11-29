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
  process.exit(1);
}

// Allow overriding the target site URL with --url or --site-url for testing (e.g. http://localhost:3000)
const url = overrideUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';


async function run() {
  try {
    
    const res = await fetch(`${url}/api/publish-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sitemap-secret': secret
      },
      body: JSON.stringify({ slug })
    });

    const text = await res.text();
    
    // Print response headers to help diagnose 405 / method issues
    try {
      const headersObj = {};
      for (const [k, v] of res.headers) headersObj[k] = v;
    } catch (e) {
      // ignore
    }

    // If the POST failed, probe other HTTP methods to help diagnose hosting/routing issues
    if (res.status !== 200) {
      try {
        const methods = ['GET', 'OPTIONS', 'HEAD'];
        for (const m of methods) {
          try {
            const probe = await fetch(`${url}/api/publish-webhook`, { method: m });
            const pText = m === 'HEAD' ? '' : await probe.text().catch(() => '');
            try {
              const headersObj = {};
              for (const [k, v] of probe.headers) headersObj[k] = v;
            } catch (e) {}
          } catch (e) {
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
          const fRes = await fetch(c, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-sitemap-secret': secret },
            body: JSON.stringify({ slug })
          });
          const fText = await fRes.text().catch(() => '');
          try {
            const headersObj = {};
            for (const [k, v] of fRes.headers) headersObj[k] = v;
          } catch (e) {}
          if (fRes.status === 200) {
            break;
          }
        } catch (e) {
        }
      }
    }

    if (res.status === 200) {
      try {
        const json = JSON.parse(text);
        if (json.pingResults) {
          json.pingResults.forEach(result => {
          });
        }
        if (json.indexingResult) {
          if (json.indexingResult.reason) {
          }
        }
      } catch (e) {
        // Response is not JSON, that's okay
      }
    } else {
    }
    
  } catch (e) {
    process.exit(1);
  }
}

run();