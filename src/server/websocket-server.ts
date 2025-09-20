import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';
import { draftWebSocketServer } from '@/lib/websocket/draft-server';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Initialize WebSocket server
  const io = draftWebSocketServer.initialize(server);

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> WebSocket server ready for draft connections`);
  });

  process.on('SIGTERM', () => {
    console.log('Cleaning up WebSocket connections...');
    draftWebSocketServer.cleanup();
    server.close();
  });

  process.on('SIGINT', () => {
    console.log('Cleaning up WebSocket connections...');
    draftWebSocketServer.cleanup();
    server.close();
  });
});