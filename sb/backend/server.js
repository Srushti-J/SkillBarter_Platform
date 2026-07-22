/**
 * SkillBarter Platform — Main Server v2.1
 * =========================================
 * WebRTC signaling added to Socket.io.
 *
 * WebRTC flow:
 *   1. Caller  emits  'video:call'    → Server relays to Callee
 *   2. Callee  emits  'video:answer'  → Server relays to Caller  
 *   3. Both    emit   'video:ice'     → Server relays to peer
 *   4. Either  emits  'video:end'     → Server relays to peer
 *   5. Callee  emits  'video:reject'  → Server relays to Caller
 */

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');
const http       = require('http');
const path       = require('path');
const { Server } = require('socket.io');

dotenv.config();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const onlineUsers = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('user_online', (userId) => {
    if (!userId) return;
    socket.join(userId);
    onlineUsers[userId] = socket.id;
    io.emit('online_users', Object.keys(onlineUsers));
  });

  socket.on('send_message', ({ receiverId, message }) => {
    io.to(receiverId).emit('receive_message', message);
  });

  socket.on('typing_start', ({ receiverId, senderName }) => {
    io.to(receiverId).emit('typing_start', { senderName });
  });
  socket.on('typing_stop', ({ receiverId }) => {
    io.to(receiverId).emit('typing_stop');
  });

  socket.on('new_request', ({ receiverId, request }) => {
    io.to(receiverId).emit('new_request', request);
  });
  socket.on('request_status_changed', ({ senderId, request }) => {
    io.to(senderId).emit('request_status_changed', request);
  });

  /* ---- WebRTC Video Signaling ---- */

  // Caller initiates call to callee
  socket.on('video:call', ({ to, from, fromName, offer }) => {
    console.log('video:call', from, '->', to);
    io.to(to).emit('video:incoming', { from, fromName, offer });
  });

  // Callee answers the call
  socket.on('video:answer', ({ to, answer }) => {
    console.log('video:answer ->', to);
    io.to(to).emit('video:answered', { answer });
  });

  // ICE candidate relay (both directions)
  socket.on('video:ice', ({ to, candidate }) => {
    io.to(to).emit('video:ice', { candidate });
  });

  // Either side hangs up
  socket.on('video:end', ({ to }) => {
    console.log('video:end ->', to);
    io.to(to).emit('video:ended');
  });

  // Callee rejects the call
  socket.on('video:reject', ({ to }) => {
    console.log('video:reject ->', to);
    io.to(to).emit('video:rejected');
  });

  socket.on('disconnect', () => {
    for (const uid in onlineUsers) {
      if (onlineUsers[uid] === socket.id) {
        delete onlineUsers[uid];
        io.emit('online_users', Object.keys(onlineUsers));
        break;
      }
    }
  });
});

app.set('io', io);
app.set('onlineUsers', onlineUsers);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/profile',  require('./routes/profileRoutes'));
app.use('/api/skills',   require('./routes/skillRoutes'));
app.use('/api/match',    require('./routes/matchRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/chat',     require('./routes/chatRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/reviews',  require('./routes/reviewRoutes'));
app.use('/api/users',    require('./routes/userRoutes'));

app.get('/', (_, res) => res.json({ message: 'SkillBarter API 2.1' }));

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skillbarter')
  .then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log('Server on port', PORT));
  })
  .catch((err) => { console.error(err.message); process.exit(1); });

module.exports = { app, io };
