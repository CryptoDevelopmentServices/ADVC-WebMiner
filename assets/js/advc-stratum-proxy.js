const net = require('net');
const url = require('url');
const http = require('http');
const WebSocket = require('ws');

// Create an HTTP server so users see a message in browser
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("ADVC WebSocket Proxy Running, Use wss:// in your miner.");
});

// Attach WebSocket server to HTTP
const wss = new WebSocket.Server({ server });
server.listen(3333, () => {
  console.log("✅ Proxy running on port 3333 (WebSocket + HTTP)");
});

// Handle incoming WebSocket connections from browser clients
wss.on('connection', (ws, req) => {
  const { query } = url.parse(req.url, true);
  const pool = (query.pool || '').split(':');
  const host = pool[0];
  const port = parseInt(pool[1] || '3333');

  console.log(`Incoming WS client → connect to ${host}:${port}`);

  const stratum = net.connect(port, host, () => {
    console.log('Connected to mining pool');
    ws.send(JSON.stringify({ type: 'log', message: `[✔] Connected to pool: ${host}:${port}` }));
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
