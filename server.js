// ===============================
// 📦 Dependencies
// ===============================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const crypto = require('crypto');

// ===============================
// 🗄️ SQLite Database Setup
// ===============================
const db = new Database('users.db');
console.log('📦 Connected to SQLite database');

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Helper function to generate secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to validate token
function validateToken(token) {
  if (!token) return null;
  const user = db.prepare('SELECT * FROM users WHERE token = ?').get(token);
  return user || null;
}

// ===============================
// ⚙️ Express Setup
// ===============================
const app = express();
app.use(cors());           // Allow all origins (change in production if needed)
app.use(express.json());   // Parse JSON body from Laravel

// ===============================
// 🔐 Token Authentication Middleware
// ===============================
const authenticateToken = (req, res, next) => {
  // Skip authentication for registration, root route, and test page
  if (req.path === '/register' || req.path === '/' || req.path === '/test') {
    return next();
  }

  // Safely extract token from headers, body, or query
  const authHeader = req.headers?.authorization;
  const tokenFromHeader = authHeader ? authHeader.replace('Bearer ', '') : null;
  const tokenFromBody = req.body?.token || null;
  const tokenFromQuery = req.query?.token || null;
  
  const token = tokenFromHeader || tokenFromBody || tokenFromQuery;

  if (!token) {
    return res.status(401).json({ error: 'Token required. Provide token in Authorization header, body, or query parameter.' });
  }

  const user = validateToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

// Apply authentication middleware to all routes except registration, root, and test page
app.use((req, res, next) => {
  if (req.path === '/register' || req.path === '/' || req.path === '/test') {
    return next();
  }
  authenticateToken(req, res, next);
});

// ===============================
// 🌐 Create HTTP + Socket.IO Server
// ===============================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow any frontend URL
    methods: ['GET', 'POST']
  }
});

// ===============================
// 💬 Socket.IO Connection Handling
// ===============================
io.use((socket, next) => {
  // Validate token from handshake auth or query
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  
  if (!token) {
    return next(new Error('Token required. Provide token in auth.token or query.token'));
  }

  const user = validateToken(token);
  if (!user) {
    return next(new Error('Invalid or expired token'));
  }

  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  console.log(`🟢 Client connected: ${socket.id} (User: ${socket.user.name})`);

  // Subscribe to a channel (room)
  socket.on('subscribe', (channel) => {
    if (!channel) return;
    socket.join(channel);
    console.log(`📡 ${socket.id} (${socket.user.name}) subscribed to "${channel}"`);
  });

  // Leave a channel (room)
  socket.on('leave', (channel) => {
    if (!channel) return;
    socket.leave(channel);
    console.log(`🚪 ${socket.id} (${socket.user.name}) left "${channel}"`);
  });

  // Broadcast event from one client to others in the same channel
  socket.on('broadcast-event', (payload) => {
    if (!payload || !payload.channel) return;
    const { channel, event, data } = payload;
    console.log(`📢 Client broadcast: ${event} on "${channel}" from ${socket.id} (${socket.user.name}):`, data);
    socket.to(channel).emit(event, { ...data, from: socket.id, fromUser: socket.user.name });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔴 Client disconnected: ${socket.id} (${socket.user.name}) - ${reason}`);
  });
});

// ===============================
// 👤 User Registration Endpoint
// ===============================
app.post('/register', (req, res) => {
  const { name, purpose } = req.body;

  if (!name || !purpose) {
    return res.status(400).json({ error: 'Name and purpose are required' });
  }

  // Generate unique token
  let token;
  let isUnique = false;
  while (!isUnique) {
    token = generateToken();
    const existing = db.prepare('SELECT id FROM users WHERE token = ?').get(token);
    if (!existing) isUnique = true;
  }

  // Insert user into database
  try {
    const result = db.prepare('INSERT INTO users (name, purpose, token) VALUES (?, ?, ?)').run(name, purpose, token);
    console.log(`✅ New user registered: ${name} (ID: ${result.lastInsertRowid})`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.lastInsertRowid,
        name,
        purpose,
        token
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// ===============================
// 📨 Laravel Broadcast Endpoint (Protected)
// ===============================
app.post('/broadcast', (req, res) => {
  const { channel, event, data } = req.body;

  if (!channel || !event) {
    console.warn('⚠️ Missing channel or event in broadcast payload.');
    return res.status(400).json({ error: 'Missing channel or event' });
  }

  console.log(`✅ Broadcast from ${req.user.name} → [${channel}] Event: "${event}"`, data);

  // Send to all connected clients in the specified channel
  io.to(channel).emit(event, { ...data, fromUser: req.user.name });

  res.status(200).json({ success: true });
});

// ===============================
// 🧭 Root Test Route
// ===============================
app.get('/', (req, res) => {
  const viewPath = path.join(__dirname, 'views', 'index.html');
  fs.readFile(viewPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading view file:', err);
      return res.status(500).send('Error loading page');
    }
    res.send(data);
  });
});

// ===============================
// 🧪 Test Page Route
// ===============================
app.get('/test', (req, res) => {
  const viewPath = path.join(__dirname, 'views', 'test.html');
  fs.readFile(viewPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading test file:', err);
      return res.status(500).send('Error loading test page');
    }
    res.send(data);
  });
});

// ===============================
// 🚀 Start Server
// ===============================
const PORT = 6001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port:${PORT}`);
  console.log(`🔗 Ready for requests at /broadcast`);
});
