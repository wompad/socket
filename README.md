# Socket.IO Server with Token Authentication

A real-time Socket.IO server with token-based authentication, SQLite database, and RESTful API endpoints for broadcasting messages.

## Features

- 🔐 **Token-based Authentication** - Secure user registration and authentication
- 📡 **Real-time Broadcasting** - Send messages to specific channels via Socket.IO
- 🗄️ **SQLite Database** - Persistent user storage
- 🌐 **RESTful API** - HTTP endpoints for registration and broadcasting
- 🧪 **Interactive Test Page** - Built-in testing interface

## Installation

```bash
npm install
```

## Dependencies

- `express` - Web framework
- `socket.io` - Real-time communication
- `better-sqlite3` - SQLite database
- `cors` - Cross-origin resource sharing
- `crypto` - Token generation (built-in)

## Usage

### Start the Server

```bash
node server-api.js
```

The server will start on port **6002** by default.

### Access Points

- **Homepage**: http://localhost:6002/
- **Test Page**: http://localhost:6002/test
- **API Base**: http://localhost:6002/

## API Documentation

### 1. User Registration

Register a new user and receive an authentication token.

**Endpoint:** `POST /register`

**Request:**
```bash
curl -X POST http://localhost:6002/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","purpose":"Your Purpose"}'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "Your Name",
    "purpose": "Your Purpose",
    "token": "64-character-hex-token"
  }
}
```

### 2. Broadcast Message

Send a broadcast message to all clients subscribed to a channel.

**Endpoint:** `POST /broadcast`

**Authentication Required:** Yes (token)

**Token Methods:**
- Authorization header: `Authorization: Bearer <token>`
- Request body: `{ "token": "<token>", ... }`
- Query parameter: `?token=<token>`

**Request:**
```bash
curl -X POST http://localhost:6002/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "channel": "test-channel",
    "event": "message",
    "data": {
      "text": "Hello World"
    }
  }'
```

**Response:**
```json
{
  "success": true
}
```

### 3. Socket.IO Connection

Connect to Socket.IO with token authentication.

#### Method 1: Using auth object (Recommended)

```javascript
const socket = io('http://localhost:6002', {
  auth: {
    token: 'YOUR_TOKEN_HERE'
  }
});
```

#### Method 2: Using query parameter

```javascript
const socket = io('http://localhost:6002?token=YOUR_TOKEN_HERE');
```

### 4. Socket.IO Events

#### Subscribe to Channel

Join a channel to receive broadcasts:

```javascript
socket.emit('subscribe', 'channel-name');
```

#### Leave Channel

Leave a channel:

```javascript
socket.emit('leave', 'channel-name');
```

#### Broadcast Event

Send an event to other clients in the same channel:

```javascript
socket.emit('broadcast-event', {
  channel: 'channel-name',
  event: 'event-name',
  data: { key: 'value' }
});
```

#### Listen for Events

```javascript
socket.on('event-name', (data) => {
  console.log('Received:', data);
});

// Listen for any event
socket.onAny((eventName, ...args) => {
  console.log('Event:', eventName, args);
});
```

## Database Schema

The server uses SQLite with the following schema:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Security Notes

- Tokens are 64-character hexadecimal strings generated using `crypto.randomBytes()`
- All Socket.IO connections require valid token authentication
- API endpoints (except `/register`, `/`, `/test`) require token authentication
- CORS is enabled for all origins (change in production)

## File Structure

```
socketio-server/
├── server-api.js      # Main server file
├── users.db           # SQLite database (auto-created)
├── views/
│   ├── index.html     # Homepage with API documentation
│   └── test.html      # Interactive test page
├── package.json       # Dependencies
└── README.md          # This file
```

## Example Workflow

1. **Register a user:**
   ```bash
   curl -X POST http://localhost:6002/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","purpose":"Testing"}'
   ```

2. **Save the token from the response**

3. **Connect to Socket.IO:**
   ```javascript
   const socket = io('http://localhost:6002', {
     auth: { token: 'YOUR_TOKEN' }
   });
   ```

4. **Subscribe to a channel:**
   ```javascript
   socket.emit('subscribe', 'test-channel');
   ```

5. **Send a broadcast:**
   ```bash
   curl -X POST http://localhost:6002/broadcast \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"channel":"test-channel","event":"message","data":{"text":"Hello"}}'
   ```

6. **Receive the message in your Socket.IO client:**
   ```javascript
   socket.on('message', (data) => {
     console.log('Received:', data);
   });
   ```

## Testing

Use the interactive test page at http://localhost:6002/test (or port 6001 for server.js) to:
- Register new users
- Test Socket.IO connections (both methods)
- Subscribe to channels
- Send and receive broadcasts
- **Test the `/broadcast` HTTP endpoint directly** with a visual interface

### Testing the /broadcast Endpoint

The test page now includes a dedicated section to test the `/broadcast` HTTP POST endpoint:

1. **Navigate to the test page**: http://localhost:6001/test (or 6002 for server-api.js)
2. **Connect and Subscribe**: First, connect to Socket.IO using Method 1 or 2, then subscribe to a channel
3. **Use the HTTP Endpoint Tester**: 
   - Scroll to the "Test /broadcast HTTP Endpoint" section
   - Enter the channel name (must match your subscription)
   - Enter the event name (e.g., "notification", "message")
   - Enter JSON data
   - Click "Send HTTP POST to /broadcast"
4. **Watch for results**: The broadcast will be sent via HTTP POST and you'll see it arrive in your Socket.IO connection

This simulates exactly how Laravel or other backends would send broadcasts to the Socket.IO server.

## Author

**ITO I Julieto Ompad**

## License

ISC

