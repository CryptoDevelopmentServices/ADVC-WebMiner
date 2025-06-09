const fs = require('fs');
const net = require('net');
const url = require('url');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');

// Allow only these pool hosts
const allowedPools = [
  'stratum.novagrid.online',
  'eu.coin-miners.info',
  'zergpool.com'
];

// Common WebSocket handler
function handleWSConnection(ws, req) {
  const { query } = url.parse(req.url, true);
  const [host, portRaw] = (query.pool || '').split(':');
  const port = parseInt(portRaw || '0', 10);

  if (!host || !port || isNaN(port) || port < 1 || port > 65535) {
    ws.send(JSON.stringify({ type: 'error', message: `[!] Invalid pool format.` }));
    ws.close();
    return;
  }

  if (!allowedPools.includes(host)) {
    ws.send(JSON.stringify({ type: 'error', message: `[!] Pool not allowed: ${host}` }));
    ws.close();
    return;
  }

  console.log(`🌍 WS client → connecting to ${host}:${port}`);

  const stratum = net.connect(port, host, () => {
    console.log('🔌 Connected to mining pool');
    ws.send(JSON.stringify({ type: 'log', message: `[✔] Connected to pool: ${host}:${port}` }));
  });

  stratum.on('data', (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data); // Raw Buffer
    }
  });

  stratum.on('error', (err) => {
    console.error('❌ Stratum error:', err.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', message: `[✘] Stratum error: ${err.message}` }));
      ws.close();
    }
  });

  stratum.on('end', () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'log', message: '[✘] Pool closed the connection.' }));
      ws.close();
    }
  });

  ws.on('message', (msg) => {
    if (stratum.writable) {
      stratum.write(msg.toString() + '\n');
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket disconnected');
    stratum.end();
  });
}

// ----- WS over HTTP on localhost:3333 -----
const httpServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("🟢 ADVC WebSocket Proxy (HTTP) is running.");
});

const wssHTTP = new WebSocket.Server({ server: httpServer });
wssHTTP.on('connection', handleWSConnection);

httpServer.listen(3333, '127.0.0.1', () => {
  console.log("✅ WS (localhost) running on http://127.0.0.1:3333");
});

// ----- WSS over HTTPS on proxy.adventurecoin.quest:443 -----
// const httpsServer = https.createServer({
//   key: fs.readFileSync('/etc/letsencrypt/live/proxy.adventurecoin.quest/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/proxy.adventurecoin.quest/fullchain.pem')
// }, (req, res) => {
//   res.writeHead(200);
//   res.end("🔐 ADVC Secure WebSocket Proxy (HTTPS) is running.");
// });

// const wssHTTPS = new WebSocket.Server({ server: httpsServer });
// wssHTTPS.on('connection', handleWSConnection);

// httpsServer.listen(443, '0.0.0.0', () => {
//   console.log("✅ WSS (public) running on https://proxy.adventurecoin.quest");
// });
