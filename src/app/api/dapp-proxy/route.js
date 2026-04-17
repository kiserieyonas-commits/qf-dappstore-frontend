/**
 * /api/dapp-proxy/route.js
 *
 * Next.js App Router API route that acts as a reverse-proxy for external dApps.
 *
 * Purpose:
 *   Fetches an external dApp's HTML, injects the QF DappStore wallet provider
 *   script, rewrites relative URLs to absolute, and strips headers that would
 *   prevent the page from being embedded in our iframe (X-Frame-Options, strict
 *   Content-Security-Policy, etc.).
 *
 * Usage (from DappViewer.jsx):
 *   <iframe src={`/api/dapp-proxy?url=https://some-dapp.com&dappId=3`} />
 *
 * Non-HTML assets (JS, CSS, images, fonts) are proxied as-is so that resources
 * loaded by the dApp's own scripts continue to work under the same origin.
 *
 * Security notes:
 *   • Only http:// and https:// schemes are allowed (blocks file://, data:, etc.)
 *   • The injected script uses postMessage with origin '*' so it works under the
 *     proxy subdomain. The parent (DappViewer) validates message contents instead.
 *   • This proxy does NOT authenticate users or gate access — it is intended only
 *     for loading publicly accessible dApp frontends.
 */

import { createMinifiedProviderScript } from '../../../lib/walletInjector'

// ─── Chain config ─────────────────────────────────────────────────────────────

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '42', 10)

// ─── Config ───────────────────────────────────────────────────────────────────

/** Maximum response body size we will buffer (10 MB). */
const MAX_BODY_BYTES = 10 * 1024 * 1024

/** Upstream request timeout in ms. */
const FETCH_TIMEOUT_MS = 15_000

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Rewrite root-relative and protocol-relative URLs inside HTML so that assets
 * still resolve when the page is served from a different origin.
 */
function rewriteUrls(html, baseOrigin) {
  // href="/path" → href="https://origin/path"
  html = html.replace(/(\s(?:href|src|action|data-src|data-href))="(\/[^"/][^"]*)"/gi,
    (_, attr, path) => `${attr}="${baseOrigin}${path}"`)

  // href='//host/path' (protocol-relative) → https://host/path
  html = html.replace(/(\s(?:href|src|action))='\/\/([^']+)'/gi,
    (_, attr, rest) => `${attr}='https://${rest}'`)
  html = html.replace(/(\s(?:href|src|action))="\/\/([^"]+)"/gi,
    (_, attr, rest) => `${attr}="https://${rest}"`)

  // CSS url('/path') → url('https://origin/path')
  html = html.replace(/url\(['"]?(\/[^'")]+?)['"]?\)/gi,
    (_, path) => `url('${baseOrigin}${path}')`)

  return html
}

/**
 * Build a Content-Security-Policy that allows scripts from any source
 * (needed because the dApp may load scripts from CDNs) plus unsafe-inline
 * and unsafe-eval for compatibility with legacy dApp bundles.
 */
function permissiveCsp() {
  return [
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
    "script-src  * 'unsafe-inline' 'unsafe-eval' data: blob:",
    "style-src   * 'unsafe-inline' data:",
    "img-src     * data: blob:",
    "font-src    * data:",
    "connect-src *",
    "frame-src   *",
    "worker-src  blob:",
    "frame-ancestors *",   // allow embedding in DappStore iframe
  ].join('; ')
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get('url')
  const dappId    = searchParams.get('dappId') || '0'

  // ── Validate URL ──
  if (!targetUrl) {
    return Response.json({ error: 'Missing required query param: url' }, { status: 400 })
  }

  let parsed
  try {
    parsed = new URL(targetUrl)
  } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return Response.json({ error: 'Only http/https URLs are allowed' }, { status: 400 })
  }

  // ── Fetch upstream ──
  let upstreamRes
  try {
    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    upstreamRes = await fetch(targetUrl, {
      signal:  controller.signal,
      redirect: 'follow',
      headers: {
        // Mimic a browser so CDN / bot-detection middlware lets us through
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',          // avoid gzip so we can rewrite text
        'User-Agent':      'Mozilla/5.0 (compatible; QFDappStore/1.0; +https://qfnetwork.xyz)',
      },
    })
    clearTimeout(timer)
  } catch (err) {
    return new Response(errorPage(dappId, String(err)), {
      status:  200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream'

  // ── HTML response: inject provider + rewrite URLs ──
  if (contentType.includes('text/html')) {
    let body
    try {
      // Guard against giant pages
      const buf = await upstreamRes.arrayBuffer()
      if (buf.byteLength > MAX_BODY_BYTES) {
        return new Response(errorPage(dappId, 'Response too large to proxy'), {
          status:  200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }
      body = new TextDecoder('utf-8', { fatal: false }).decode(buf)
    } catch (err) {
      return new Response(errorPage(dappId, String(err)), {
        status:  200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Rewrite relative URLs
    body = rewriteUrls(body, parsed.origin)

    // Inject provider script as the FIRST script in the document so it
    // runs before any dApp code that tries to read window.ethereum.
    const providerTag = `<script data-qf-dappstore="true">${createMinifiedProviderScript(dappId, CHAIN_ID)}</script>`

    if (/<\/head>/i.test(body)) {
      body = body.replace(/<\/head>/i, `${providerTag}\n</head>`)
    } else if (/<body[^>]*>/i.test(body)) {
      body = body.replace(/(<body[^>]*>)/i, `$1\n${providerTag}`)
    } else {
      body = providerTag + '\n' + body
    }

    // Add a <base> tag so relative navigations resolve correctly
    const baseTag = `<base href="${parsed.origin}/">`
    if (!/<base\s/i.test(body)) {
      body = body.replace(/<head[^>]*>/i, (m) => `${m}\n${baseTag}`)
    }

    return new Response(body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type':              'text/html; charset=utf-8',
        'Content-Security-Policy':   permissiveCsp(),
        'X-Frame-Options':           'SAMEORIGIN',
        'Access-Control-Allow-Origin': '*',
        // Prevent browser from sniffing MIME and blocking the inline script
        'X-Content-Type-Options':    'nosniff',
      },
    })
  }

  // ── Non-HTML: proxy the binary / text asset as-is ──
  let assetBody
  try {
    const buf = await upstreamRes.arrayBuffer()
    assetBody = buf
  } catch {
    return new Response(null, { status: 502 })
  }

  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', contentType)
  responseHeaders.set('Access-Control-Allow-Origin', '*')
  responseHeaders.set('Cache-Control', 'public, max-age=3600')
  // Strip headers that would break cross-origin asset loading
  // (X-Frame-Options is irrelevant for non-HTML but harmless to remove)

  return new Response(assetBody, {
    status:  upstreamRes.status,
    headers: responseHeaders,
  })
}

// ─── Error page HTML ──────────────────────────────────────────────────────────

function errorPage(dappId, reason) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DappStore Proxy Error</title>
  <style>
    body { background: #0a0e1a; color: #e5e7eb; font-family: system-ui, sans-serif;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box; }
    .card { background: #0f1729; border: 1px solid rgba(6,182,212,.25);
            border-radius: 1rem; padding: 2rem; max-width: 28rem; text-align: center; }
    h2 { color: #fff; margin: 0 0 .5rem; }
    p  { color: #9ca3af; font-size: .875rem; margin: 0 0 1rem; line-height: 1.5; }
    .err { color: #ef4444; font-size: .75rem; font-family: monospace;
           background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2);
           border-radius: .5rem; padding: .75rem; word-break: break-all; margin-bottom: 1.25rem; }
    a { color: #22d3ee; text-decoration: none; font-size: .875rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:2.5rem;margin-bottom:.75rem">⚠️</div>
    <h2>Could not load dApp</h2>
    <p>The dApp (ID: ${escHtml(String(dappId))}) could not be proxied.
       It may block external embedding or require direct browser access.</p>
    <div class="err">${escHtml(reason)}</div>
    <p style="color:#6b7280;font-size:.75rem">Try opening the dApp directly in a new tab.</p>
  </div>
</body>
</html>`
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
