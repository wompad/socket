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
// 🧭 Root Test Route
// ===============================
app.get('/', (req, res) => {
  res.send('✅ Socket.IO server is running and connected with Laravel.');
});

// ===============================
// 🚀 Start Server
// ===============================
const PORT = 6001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port:${PORT}`);
  console.log(`🔗 Ready for requests at /broadcast`);
});
