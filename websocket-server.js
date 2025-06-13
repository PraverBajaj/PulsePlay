const { createServer } = require('http');
const next = require('next');
const WebSocket = require('ws');
const url = require('url');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const connections = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = url.parse(request.url);

    if (pathname?.startsWith('/stream/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request) => {
    const creatorId = request.url.split('/').pop();

    if (!connections.has(creatorId)) {
      connections.set(creatorId, new Set());
    }
    connections.get(creatorId).add(ws);

    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket connected' }));

    ws.on('close', () => {
      connections.get(creatorId)?.delete(ws);
      if (connections.get(creatorId)?.size === 0) {
        connections.delete(creatorId);
      }
    });
  });

  global.broadcastToCreator = (creatorId, data) => {
    const message = JSON.stringify(data);
    const sockets = connections.get(creatorId);
    if (sockets) {
      sockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  };

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
