import * as http from 'http';
import { CiroAgent } from './services/CiroAgent';
import { ResilientDB } from './config/firebaseAdmin';

const PORT = process.env.PORT || 4000;

// Start CIRO Orchestrator Listening Daemon
CiroAgent.start();

// Create a lightweight built-in HTTP server for local replication & Stress Test 2
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/db' && req.url !== undefined) {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ResilientDB.get(), null, 2));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const { key, subKey, value } = payload;
          if (key && subKey && value !== undefined) {
            ResilientDB.updatePath(key, subKey, value);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Bad Request: Missing parameters');
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: Invalid JSON');
        }
      });
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🌐 Connecting to local DB mirror at: http://localhost:${PORT}/api/db`);
});
