// advc-stratum-proxy.js
const WebSocket = require('ws');
const net = require('net');
const url = require('url');

const wss = new WebSocket.Server({ port: 3333 });

wss.on('connection', (ws, req) => {
    const { query } = url.parse(req.url, true);
    const pool = (query.pool || '').split(':');
    const host = pool[0];
    const port = parseInt(pool[1] || '3333');

    console.log(`Incoming WS client → connect to ${host}:${port}`);

    const stratum = net.connect(port, host, () => {
        console.log('Connected to mining pool');
    });

    // Forward Stratum data to browser
    stratum.on('data', (data) => {
        ws.send(data.toString());
    });

    // Forward browser data to pool
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
