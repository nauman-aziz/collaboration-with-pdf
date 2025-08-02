const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection, docs } = require('y-websocket/bin/utils');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

console.log('Starting collaboration server on port 1234...');

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  setupWSConnection(ws, req);
});

// Periodic cleanup of inactive documents
setInterval(() => {
  let docCount = 0;
  docs.forEach((doc, name) => {
    if (doc.conns.size === 0) {
      docs.delete(name);
    } else {
      docCount++;
    }
  });
  console.log(`Active documents: ${docCount}`);
}, 60000);

server.listen(1234, () => {
  console.log('Collaboration server running on http://localhost:1234');
});