// ===============================
// 📦 Dependencies
// ===============================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// ===============================
// ⚙️ Express Setup
// ===============================
const app = express();
app.use(cors());           // Allow all origins (change in production if needed)
app.use(express.json());   // Parse JSON body from Laravel

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
io.on('connection', (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`);

  // Subscribe to a channel (room)
  socket.on('subscribe', (channel) => {
    if (!channel) return;
    socket.join(channel);
    console.log(`📡 ${socket.id} subscribed to "${channel}"`);
  });

  // Leave a channel (room)
  socket.on('leave', (channel) => {
    if (!channel) return;
    socket.leave(channel);
    console.log(`🚪 ${socket.id} left "${channel}"`);
  });

  // Broadcast event from one client to others in the same channel
  socket.on('broadcast-event', (payload) => {
    if (!payload || !payload.channel) return;
    const { channel, event, data } = payload;
    console.log(`📢 Client broadcast: ${event} on "${channel}" from ${socket.id}:`, data);
    socket.to(channel).emit(event, { ...data, from: socket.id });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔴 Client disconnected: ${socket.id} (${reason})`);
  });
});

// ===============================
// 📨 Laravel Broadcast Endpoint
// ===============================
app.post('/broadcast', (req, res) => {
  const { channel, event, data } = req.body;

  if (!channel || !event) {
    console.warn('⚠️ Missing channel or event in broadcast payload.');
    return res.status(400).json({ error: 'Missing channel or event' });
  }

  console.log(`✅ Laravel broadcast → [${channel}] Event: "${event}"`, data);

  // Send to all connected clients in the specified channel
  io.to(channel).emit(event, data);

  res.status(200).json({ success: true });
});

// ===============================
// 🧭 Routes
// ===============================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Socket.IO Server Status</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .status-box {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }
        .status-icon {
          font-size: 64px;
          color: #10b981;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        .endpoint {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          font-family: monospace;
          text-align: left;
        }
        .endpoint-title {
          font-weight: bold;
          color: #667eea;
          margin-bottom: 10px;
        }
        .links {
          margin-top: 30px;
        }
        .links a {
          display: inline-block;
          margin: 10px;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          transition: background 0.3s;
        }
        .links a:hover {
          background: #5568d3;
        }
      </style>
    </head>
    <body>
      <div class="status-box">
        <div class="status-icon"><i class="fas fa-check-circle"></i></div>
        <h1>✅ Socket.IO Server is Running</h1>
        <p>Port: ${PORT}</p>
        
        <div class="endpoint">
          <div class="endpoint-title">Available Endpoints:</div>
          <div>GET /test - Interactive test page</div>
          <div>GET /docs - API documentation</div>
          <div>POST /broadcast - Broadcast messages to channels</div>
        </div>

        <div class="links">
          <a href="/test"><i class="fas fa-flask"></i> Test Page</a>
          <a href="/docs"><i class="fas fa-book"></i> Documentation</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/test', (req, res) => {
  res.sendFile(__dirname + '/views/test.html');
});

app.get('/docs', (req, res) => {
  res.sendFile(__dirname + '/views/docs.html');
});

// ===============================
// 🚀 Start Server
// ===============================
const PORT = 6001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port:${PORT}`);
  console.log(`🔗 Ready for requests at /broadcast`);
});
