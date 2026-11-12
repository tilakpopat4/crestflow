import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const HTML_FILE = path.resolve('crestflow_3d_pov_promo_video_player.html');
const OUTPUT_MP4 = path.resolve('crestflow_3d_pov_promo.mp4');
const FPS = 30;
const DURATION = 10.0;
const TOTAL_FRAMES = Math.round(DURATION * FPS);
const TEMP_PROFILE = path.join(os.tmpdir(), `edge_promo_rec_${Date.now()}`);

console.log(`[Render] Starting video render for ${HTML_FILE}`);
console.log(`[Render] Target: ${OUTPUT_MP4} (${TOTAL_FRAMES} frames @ ${FPS}fps)`);

// 1. Launch Edge headless
const edgeProcess = spawn(EDGE_PATH, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${TEMP_PROFILE}`,
  '--window-size=1920,1080',
  '--hide-scrollbars',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  `file:///${HTML_FILE.replace(/\\/g, '/')}`,
]);

edgeProcess.stderr.on('data', (d) => {
  // Edge logs - ignore noisy warnings
});

async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// 2. Wait for Edge DevTools port
let wsUrl = null;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === 'page');
    if (pageTab && pageTab.webSocketDebuggerUrl) {
      wsUrl = pageTab.webSocketDebuggerUrl;
      break;
    }
  } catch (e) {
    // wait for port to be ready
  }
  await sleep(300);
}

if (!wsUrl) {
  console.error('[Render Error] Could not connect to Edge DevTools WebSocket');
  edgeProcess.kill();
  process.exit(1);
}

console.log('[Render] Connected to Edge CDP. Initializing viewport...');

// 3. Connect via WebSocket
const ws = new WebSocket(wsUrl);
await new Promise((res) => (ws.onopen = res));

let msgId = 1;
const pendingCallbacks = new Map();

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pendingCallbacks.has(data.id)) {
    const cb = pendingCallbacks.get(data.id);
    pendingCallbacks.delete(data.id);
    cb(data.result, data.error);
  }
};

function sendCommand(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pendingCallbacks.set(id, (result, error) => {
      if (error) reject(new Error(error.message));
      else resolve(result);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// Set 1920x1080 viewport
await sendCommand('Emulation.setDeviceMetricsOverride', {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});

// Wait for fonts & DOM to be ready
await sleep(1500);

// Stop live animation loop in page so we control time manually
await sendCommand('Runtime.evaluate', {
  expression: `
    if (typeof isPlaying !== 'undefined') isPlaying = false;
    window.renderTimelineAt(0);
  `,
});

// 4. Spawn FFmpeg process
const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'image2pipe',
  '-vcodec', 'mjpeg',
  '-r', String(FPS),
  '-i', '-',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-preset', 'fast',
  '-crf', '18',
  OUTPUT_MP4,
]);

ffmpeg.stderr.on('data', (d) => {
  // Can be uncommented for ffmpeg verbose logs
});

let ffmpegClosed = false;
ffmpeg.on('close', (code) => {
  ffmpegClosed = true;
  console.log(`[FFmpeg] Closed with code ${code}`);
});

console.log('[Render] Rendering frames and streaming into FFmpeg...');

for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
  const t = frame / FPS;

  // Step timeline to exact t
  await sendCommand('Runtime.evaluate', {
    expression: `window.renderTimelineAt(${t});`,
  });

  // Capture frame
  const shotResult = await sendCommand('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 95,
  });

  const buffer = Buffer.from(shotResult.data, 'base64');
  ffmpeg.stdin.write(buffer);

  if (frame % 30 === 0 || frame === TOTAL_FRAMES - 1) {
    const pct = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
    process.stdout.write(`\r[Render] Frame ${frame + 1}/${TOTAL_FRAMES} (${pct}%) — ${t.toFixed(1)}s / ${DURATION}s`);
  }
}

console.log('\n[Render] All frames dispatched. Finalizing MP4 encoding...');
ffmpeg.stdin.end();

// Wait for ffmpeg to complete
while (!ffmpegClosed) {
  await sleep(200);
}

// Clean up
ws.close();
edgeProcess.kill();
try {
  fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
} catch (e) {}

console.log(`\n✨ Success! Output video generated at: ${OUTPUT_MP4}`);
process.exit(0);

