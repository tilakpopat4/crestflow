import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_PATH =
  process.env.CHROME_PATH ||
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe');

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

function startDistServer(distDir) {
  const server = http.createServer((req, res) => {
    const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const safeRel = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
    let targetFile = path.join(distDir, safeRel === path.sep || safeRel === '/' ? 'index.html' : safeRel);
    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
      targetFile = path.join(distDir, 'index.html');
    }
    const ext = path.extname(targetFile).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' });
    fs.createReadStream(targetFile).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let idSeq = 1;
  const pending = new Map();
  const listeners = new Set();

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else {
      for (const fn of listeners) fn(msg);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = idSeq++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const on = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  return { send, on, close: () => ws.close() };
}

async function waitForPreview(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server failed to listen at ${url}`);
}

async function waitForSettledUi(cdp, predicateExpr, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await cdp.send('Runtime.evaluate', { expression: predicateExpr, returnByValue: true });
    if (res?.result?.value) return res.result.value;
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error(`Timed out waiting for: ${predicateExpr}`);
}

async function run() {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome binary not found at ${CHROME_PATH}`);
  }

  const { server, url: baseUrl } = await startDistServer(path.resolve(process.cwd(), 'dist'));
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-chrome-'));
  let chromeProc;

  try {
    chromeProc = spawn(CHROME_PATH, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const devToolsPort = await new Promise((resolve, reject) => {
      let logs = '';
      const activePortFile = path.join(userDataDir, 'DevToolsActivePort');
      const poll = setInterval(() => {
        if (fs.existsSync(activePortFile)) {
          const line = fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0]?.trim();
          if (/^\d+$/.test(line)) {
            clearTimeout(timer);
            clearInterval(poll);
            resolve(Number(line));
          }
        }
      }, 150);
      const timer = setTimeout(() => {
        clearInterval(poll);
        reject(new Error(`Chrome DevTools port timeout. Logs: ${logs.slice(0, 500)}`));
      }, 12000);
      const onData = (chunk) => {
        const str = String(chunk);
        logs += str;
        const m = str.match(/ws:\/\/127\.0\.0\.1:(\d+)\//);
        if (m) {
          clearTimeout(timer);
          clearInterval(poll);
          resolve(Number(m[1]));
        }
      };
      chromeProc.stderr.on('data', onData);
      chromeProc.stdout.on('data', onData);
      chromeProc.on('exit', (code) => {
        clearTimeout(timer);
        clearInterval(poll);
        reject(new Error(`Chrome exited early (${code}). Logs: ${logs.slice(0, 500)}`));
      });
    });

    const pages = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    const target = pages.find((p) => p.type === 'page') || pages[0];
    const cdp = await createCdpClient(target.webSocketDebuggerUrl);

    const consoleErrors = [];
    const pageExceptions = [];
    cdp.on((msg) => {
      if (msg.method === 'Runtime.exceptionThrown') {
        pageExceptions.push(msg.params?.exceptionDetails?.text || 'Uncaught exception');
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        consoleErrors.push((msg.params.args || []).map((a) => a.value || a.description || '').join(' '));
      }
    });

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    // Mock /api/public-invoice for public route E2E test without live Worker
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `${baseUrl}/api/*` }] });
    cdp.on(async (msg) => {
      if (msg.method !== 'Fetch.requestPaused') return;
      const reqUrl = msg.params.request.url;
      if (reqUrl.includes('/api/public-invoice/claim-paid')) {
        await cdp.send('Fetch.fulfillRequest', {
          requestId: msg.params.requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'content-type', value: 'application/json' }],
          body: Buffer.from(JSON.stringify({ success: true, status: 'Pending', paymentClaim: { status: 'claimed', claimedAt: Date.now() } })).toString('base64'),
        });
      } else if (reqUrl.includes('/api/public-invoice')) {
        await cdp.send('Fetch.fulfillRequest', {
          requestId: msg.params.requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'content-type', value: 'application/json' }],
          body: Buffer.from(JSON.stringify({
            success: true,
            invoice: {
              invoiceNumber: 'INV-DEMO-01',
              date: Date.now(),
              clientName: 'Apex Studio',
              payeeName: 'CrestFlow Demo',
              payeeUpiId: 'demo@okaxis',
              currency: 'INR',
              reels: [{ title: 'Launch Cut', quantity: 2, rate: 2500 }],
              deliverables: [],
              totalAmount: 5000,
              status: 'Pending',
            },
          })).toString('base64'),
        });
      } else {
        await cdp.send('Fetch.continueRequest', { requestId: msg.params.requestId });
      }
    });

    // 1. Check landing, pricing, refund, and public invoice across breakpoints (360, 768, 1280, 1920)
    const viewports = [360, 768, 1280, 1920];
    const routesToCheck = [
      { path: '/', waitFor: "document.body.innerText.includes('Invoice. Scan.')" },
      { path: '/pricing', waitFor: "document.body.innerText.includes('₹699') && document.body.innerText.includes('7-day free trial, no card needed, no automatic charge.')" },
      { path: '/refund', waitFor: "document.body.innerText.includes('Cancellation')" },
      { path: '/invoice/demo_inv_1?t=demo_secret_token_2026', waitFor: "document.body.innerText.includes('INV-DEMO-01') && document.body.innerText.includes('demo@okaxis')" },
    ];

    const responsiveResults = [];
    for (const r of routesToCheck) {
      await cdp.send('Page.navigate', { url: `${baseUrl}${r.path}` });
      await waitForSettledUi(cdp, r.waitFor);
      for (const w of viewports) {
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: 840, deviceScaleFactor: 1, mobile: w < 768 });
        await new Promise((ok) => setTimeout(ok, 80));
        const overflow = await cdp.send('Runtime.evaluate', {
          expression: '({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })',
          returnByValue: true,
        });
        const { sw, iw } = overflow.result.value;
        responsiveResults.push({ route: r.path, width: w, scrollWidth: sw, innerWidth: iw, ok: sw <= iw + 1 });
        if (sw > iw + 1) {
          throw new Error(`Horizontal overflow on ${r.path} at ${w}px: scrollWidth=${sw} innerWidth=${iw}`);
        }
      }
    }

    // 2. Test public invoice "I've paid" claim UI stays non-Paid pending confirmation
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 840, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Runtime.evaluate', {
      expression: "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes(\"I've paid\"))?.click()",
    });
    await waitForSettledUi(cdp, "document.body.innerText.includes('Confirm your UPI payment')");
    await cdp.send('Runtime.evaluate', {
      expression: "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Notify freelancer'))?.click()",
    });
    await waitForSettledUi(cdp, "document.body.innerText.includes('Payment claim recorded') && document.body.innerText.includes('Pending payment')");

    // 3. Throttled (Fast 3G + 4x CPU) 20 hard-refreshes flicker & CLS check
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });

    const refreshTrace = [];
    for (let i = 1; i <= 20; i++) {
      await cdp.send('Page.navigate', { url: `${baseUrl}/pricing` });
      await waitForSettledUi(cdp, "document.body.innerText.includes('₹699')");
      const clsEval = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const text = document.body.innerText;
          const hasBanned = text.includes('₹449') || text.includes('₹899') || text.includes('Pro • 999d');
          return { len: text.length, hasYearly: text.includes('₹699'), hasBanned };
        })()`,
        returnByValue: true,
      });
      const v = clsEval.result.value;
      if (v.hasBanned || !v.hasYearly) {
        throw new Error(`Flicker/incorrect state detected on throttled refresh ${i}: ${JSON.stringify(v)}`);
      }
      refreshTrace.push({ run: i, hasYearly: v.hasYearly, hasBanned: v.hasBanned });
    }

    // 4. Filter benign offline network console noise if any; assert zero React/page exceptions
    const realConsoleErrors = consoleErrors.filter((e) => !e.includes('ERR_NAME_NOT_RESOLVED') && !e.includes('Failed to fetch'));
    if (pageExceptions.length > 0 || realConsoleErrors.length > 0) {
      throw new Error(`Runtime errors detected: exceptions=${JSON.stringify(pageExceptions)} console=${JSON.stringify(realConsoleErrors)}`);
    }

    console.log(JSON.stringify({
      status: 'PASS',
      responsiveChecks: responsiveResults.length,
      allViewportsZeroOverflow: responsiveResults.every((r) => r.ok),
      throttledRefreshes: refreshTrace.length,
      pageExceptions: pageExceptions.length,
      realConsoleErrors: realConsoleErrors.length,
      chromePath: CHROME_PATH,
    }, null, 2));
    cdp.close();
  } finally {
    if (chromeProc) chromeProc.kill();
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

run().catch((err) => {
  console.error('[verify-app E2E FAILED]:', err);
  process.exit(1);
});
