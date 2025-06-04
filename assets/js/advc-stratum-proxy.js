const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const net = require('net');
const url = require('url');

// ✅ Replace with your actual SSL cert and key paths
const server = https.createServer({
  cert: fs.readFileSync('/etc/letsencrypt/live/proxy.adventurecoin.quest/fullchain.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/proxy.adventurecoin.quest/privkey.pem')
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const { query } = url.parse(req.url, true);
  const pool = (query.pool || '').split(':');
  const host = pool[0];
  const port = parseInt(pool[1] || '3333');

  console.log(`Incoming WS client → connect to ${host}:${port}`);

  const stratum = net.connect(port, host, () => {
    console.log('Connected to mining pool');
  });

  stratum.on('data', (data) => {
    ws.send(data.toString());
  });

  ws.on('message', (msg) => {
    stratum.write(msg + '\n');
  });

  ws.on('close', () => {
    stratum.end();
  });

  stratum.on('error', (err) => {
    console.error('Stratum error:', err.message);
    ws.close();
  });
});

// 🔒 Start HTTPS server
server.listen(3333, () => {
  console.log('✅ Secure WSS proxy running on port 3333');
});
