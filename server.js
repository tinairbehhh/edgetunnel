// server.js (v2)
// Adapter that runs a Cloudflare Worker (_worker.js) as a standard Node.js
// HTTP server on Hostless. Adds dedicated /__health and /__ready endpoints
// that bypass the worker, so Hostless health checks always succeed even if
// the worker is slow or fails on the root path.

import http from 'node:http';
import { Readable } from 'node:stream';
import nodeCrypto from 'node:crypto';

// ---------- WebCrypto MD5 polyfill ----------
// Cloudflare Workers' WebCrypto supports MD5 (for legacy reasons).
// Node.js's WebCrypto does NOT — it throws NotSupportedError / code 9.
// We monkey-patch crypto.subtle.digest to route MD5 calls to node:crypto's
// createHash('md5'), while leaving all other algorithms (SHA-*, AES-*, HMAC,
// etc.) to Node's native implementation.
//
// This MUST run before we import _worker.js, so the worker sees a
// Cloudflare-compatible crypto.subtle at module-eval time.

function toBuffer(data) {
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    // TypedArray / DataView — preserve byteOffset and byteLength
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (Buffer.isBuffer(data)) return data;
  if (data === null || data === undefined) return Buffer.alloc(0);
  return Buffer.from(data);
}

function toAlgorithmName(algorithm) {
  if (typeof algorithm === 'string') return algorithm;
  if (algorithm && typeof algorithm === 'object' && typeof algorithm.name === 'string') {
    return algorithm.name;
  }
  throw new TypeError(`Unsupported algorithm format: ${String(algorithm)}`);
}

const originalSubtleDigest = nodeCrypto.subtle.digest.bind(nodeCrypto.subtle);

async function patchedDigest(algorithm, data) {
  const name = toAlgorithmName(algorithm);
  const upper = name.toUpperCase();

  // MD5 — not in Node's WebCrypto, but available on Cloudflare Workers.
  // Route to node:crypto's createHash('md5').
  if (upper === 'MD5') {
    const buf = toBuffer(data);
    const hash = nodeCrypto.createHash('md5').update(buf).digest();
    // WebCrypto digest returns a Promise<ArrayBuffer>, not a Buffer.
    // Copy into a fresh ArrayBuffer to detach from Buffer's pool.
    const out = new ArrayBuffer(hash.length);
    new Uint8Array(out).set(hash);
    return out;
  }

  // Also polyfill a few other Cloudflare-quirky variants just in case
  // the worker uses lowercase or aliased names Node doesn't accept.
  // Normalize casing for SHA family.
  const shaAlias = {
    'SHA1': 'SHA-1',
    'SHA256': 'SHA-256',
    'SHA384': 'SHA-384',
    'SHA512': 'SHA-512'
  };
  if (shaAlias[upper]) {
    return originalSubtleDigest(shaAlias[upper], data);
  }

  // Default: delegate to native implementation with the original argument.
  return originalSubtleDigest(algorithm, data);
}

// Patch on the SubtleCrypto prototype so any access path benefits.
const SubtleCryptoProto = Object.getPrototypeOf(nodeCrypto.subtle);
if (SubtleCryptoProto && SubtleCryptoProto.digest !== patchedDigest) {
  SubtleCryptoProto.digest = patchedDigest;
}
// Also patch the globalThis.crypto.subtle instance directly, in case the
// prototype patch doesn't take for some access patterns.
const globalSubtle = globalThis.crypto?.subtle;
if (globalSubtle && globalSubtle.digest !== patchedDigest) {
  try {
    Object.defineProperty(globalSubtle, 'digest', {
      value: patchedDigest,
      configurable: true,
      writable: true
    });
  } catch {
    // If defineProperty fails (non-configurable), fall back to direct assign.
    globalSubtle.digest = patchedDigest;
  }
}

console.log('[server] WebCrypto MD5 polyfill installed (delegates to node:crypto.createHash)');

// ---------- Cloudflare global polyfills (best-effort) ----------

class CacheStub {
  async match() { return undefined; }
  async put() {}
  async delete() { return false; }
}
const caches = {
  default: new CacheStub(),
  async open() { return new CacheStub(); }
};

class WebSocketStub {
  constructor() { this.readyState = 0; }
  accept() {}
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}
class WebSocketPairStub {
  constructor() {
    this[0] = new WebSocketStub();
    this[1] = new WebSocketStub();
  }
}

class HTMLRewriterStub {
  on() { return this; }
  transform(response) { return response; }
}

globalThis.caches = caches;
globalThis.WebSocketPair = WebSocketPairStub;
globalThis.HTMLRewriter = HTMLRewriterStub;

// ---------- Worker loader ----------

let fetchHandler = null;
let workerLoadError = null;

try {
  const workerModule = await import('./_worker.js');
  const defaultExport = workerModule?.default;
  fetchHandler =
    (typeof defaultExport?.fetch === 'function' && defaultExport.fetch) ||
    (typeof defaultExport === 'function' && defaultExport) ||
    (typeof workerModule.fetch === 'function' && workerModule.fetch) ||
    null;

  if (!fetchHandler) {
    workerLoadError = new Error(
      'No fetch handler found in _worker.js. Expected: export default { async fetch(req, env, ctx) {} }'
    );
  } else {
    console.log('[server] worker loaded successfully.');
  }
} catch (err) {
  workerLoadError = err;
  console.error('[server] FAILED to import ./_worker.js:');
  console.error(err);
  // Do NOT exit — keep the server up so /__health still responds and we can
  // read the error from the Hostless Logs tab. /__ready will return 503.
}

// ---------- env / ctx stubs ----------

const env = {
  ASSETS: {
    fetch: async () => new Response(
      'ASSETS binding not available on Hostless.',
      { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    )
  },
  ...Object.fromEntries(
    Object.entries(process.env).filter(([k]) =>
      /^(CF_|CLOUDFLARE_|PUBLIC_|SECRET_|API_|DB_|KV_|EDGEPANEL_)/.test(k)
    )
  )
};

const ctx = {
  waitUntil(p) {
    if (p && typeof p.catch === 'function') {
      p.catch(err => console.error('[waitUntil] rejected:', err));
    }
  },
  passThroughOnException() {},
  abortController: new AbortController()
};

// ---------- HTTP server ----------

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const startedAt = new Date().toISOString();

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('content-type', contentType);
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();

  // --- Bypass worker for health/readiness probes ---
  // Hostless (and most PaaS) will hit these to decide if container is healthy.
  if (req.url === '/__health' || req.url === '/health') {
    return sendJson(res, 200, {
      status: 'ok',
      uptime_s: process.uptime(),
      started_at: startedAt,
      worker_loaded: !!fetchHandler
    });
  }
  if (req.url === '/__ready' || req.url === '/ready') {
    if (!fetchHandler) {
      return sendJson(res, 503, {
        status: 'not_ready',
        reason: 'worker_not_loaded',
        error: String(workerLoadError?.message || workerLoadError)
      });
    }
    return sendJson(res, 200, { status: 'ready' });
  }

  // If worker failed to load, return a clear 502 for everything else
  if (!fetchHandler) {
    return sendJson(res, 502, {
      error: 'worker_unavailable',
      message: String(workerLoadError?.message || workerLoadError),
      hint: 'Check Hostless Logs tab for the full import error.'
    });
  }

  try {
    const protocol = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    const host = req.headers.host || `${HOST}:${PORT}`;
    const url = new URL(req.url, `${protocol}://${host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    let body = null;
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = Readable.toWeb(req);
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      ...(body ? { body, duplex: 'half' } : {})
    });

    const response = await fetchHandler(request, env, ctx);

    res.statusCode = response.status || 200;
    response.headers.forEach((value, key) => {
      try { res.setHeader(key, value); } catch { /* ignore invalid header */ }
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error('[server] request error:');
    console.error('  url:', req.method, req.url);
    console.error('  message:', err?.message);
    console.error('  name:', err?.name);
    console.error('  code:', err?.code);
    if (err?.stack) console.error('  stack:', err.stack);
    if (err?.cause) console.error('  cause:', err.cause);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
    }
    res.end(JSON.stringify({
      error: 'internal_server_error',
      message: String(err?.message || err),
      name: String(err?.name || 'Error'),
      code: err?.code || null,
      stack: String(err?.stack || ''),
      request: { method: req.method, url: req.url }
    }, null, 2));
  } finally {
    console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - t0}ms`);
  }
});

server.on('error', (err) => {
  console.error('[server] server error:', err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[server] Edgepanel listening on http://${HOST}:${PORT}`);
  console.log(`[server] Health endpoints:`);
  console.log(`[server]   GET /__health -> 200 (always, liveness probe)`);
  console.log(`[server]   GET /__ready  -> 200 if worker loaded, 503 otherwise`);
  console.log(`[server] Worker loaded: ${!!fetchHandler}`);
  if (workerLoadError) {
    console.error(`[server] Worker load error:`, workerLoadError);
  }
  console.log(`[server] Cloudflare bindings on Hostless are stubbed (KV/D1/R2/ASSETS unavailable).`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[server] received ${sig}, shutting down...`);
    server.close(() => process.exit(0));
  });
}
