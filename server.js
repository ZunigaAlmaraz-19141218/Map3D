const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const WebSocket = require('ws');

// In-memory storage for POIs (in a real app, use a database)
let pois = [];
const POIS_FILE = path.join(__dirname, 'data', 'pois.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(POIS_FILE))) {
  fs.mkdirSync(path.dirname(POIS_FILE), { recursive: true });
}

// Load POIs from file if it exists
if (fs.existsSync(POIS_FILE)) {
  try {
    pois = JSON.parse(fs.readFileSync(POIS_FILE, 'utf8'));
    console.log(`Loaded ${pois.length} POIs from file`);
  } catch (err) {
    console.error('Error loading POIs:', err);
  }
}

// Save POIs to file
function savePOIs() {
  fs.writeFileSync(POIS_FILE, JSON.stringify(pois, null, 2), 'utf8');
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API Routes
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, parsedUrl);
    return;
  }

  // Static file serving
  serveStaticFile(req, res, parsedUrl);
});

// Handle API requests
function handleApiRequest(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  
  try {
    // GET /api/pois - Get all POIs
    if (pathname === '/api/pois' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(pois));
      return;
    }

    // POST /api/pois - Add a new POI
    if (pathname === '/api/pois' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const poi = JSON.parse(body);
          // Basic validation
          if (!poi.name || !poi.lat || !poi.lng) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields' }));
            return;
          }
          
          // Add ID and timestamp
          poi.id = Date.now().toString();
          poi.createdAt = new Date().toISOString();
          
          // Add to storage
          pois.push(poi);
          savePOIs();
          
          // Broadcast to WebSocket clients
          broadcast({ type: 'poi_added', data: poi });
          
          // Respond
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(poi));
        } catch (err) {
          console.error('Error processing POI:', err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request body' }));
        }
      });
      return;
    }

    // Handle other API routes...
    
    // Not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (err) {
    console.error('API error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Serve static files
function serveStaticFile(req, res, parsedUrl) {
  let filePath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  
  // Get the file extension
  const extname = path.extname(filePath);
  
  // Set content type based on file extension
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'application/font-woff',
    '.woff2': 'application/font-woff2',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };
  
  // For service worker
  if (filePath.endsWith('service-worker.js')) {
    filePath = '/service-worker.js';
    res.setHeader('Content-Type', 'application/javascript');
  }

  // Default to octet-stream for unknown types
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  // Security: Prevent directory traversal
  filePath = path.join(__dirname, ...filePath.split('/').filter(Boolean));
  
  // Check if file exists
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('404 Not Found', 'utf-8');
      } else {
        // Server error
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      // File found, send it
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });
const clients = new Set();

// Broadcast function to send data to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  clients.add(ws);
  
  // Send current POIs to new client
  if (pois.length > 0) {
    ws.send(JSON.stringify({
      type: 'initial_pois',
      data: pois
    }));
  }
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'position_update':
          // Broadcast position update to all clients except sender
          clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'position_updated',
                data: data.data
              }));
            }
          });
          break;
          
        // Add more message types as needed
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clients.delete(ws);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/HTML/uttop-map.html in your browser`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  // Close WebSocket connections
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
