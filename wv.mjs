// Auto-discovers the WebView target from http://localhost:9222/json and evaluates expr
const expr = process.argv[2];
if (!expr) { console.error('usage: node wv.mjs <expr>'); process.exit(1); }

const res = await fetch('http://localhost:9222/json');
const targets = await res.json();
const page = targets.find(t => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();

function send(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener('open', async () => {
  try {
    await send('Runtime.enable', {});
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      console.error('EXCEPTION:', JSON.stringify(res.exceptionDetails, null, 2));
    } else {
      console.log(JSON.stringify(res.result.value, null, 2));
    }
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    ws.close();
    setTimeout(() => process.exit(0), 100);
  }
});

ws.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.id && pending.has(data.id)) {
    const { resolve } = pending.get(data.id);
    pending.delete(data.id);
    resolve(data.result || {});
  }
});

ws.addEventListener('error', (e) => { console.error('WSERR:', e.error || e.message); setTimeout(() => process.exit(1), 100); });
