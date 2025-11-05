// server.js - Socket.io chat server (simplified but behavior-preserving)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Models
const User = require('./models/userModel');
const Message = require('./models/messageModel');

// Auth routes
const authRoutes = require('./routes/authRoutes');

// Load env
dotenv.config({ path: path.join(__dirname, 'config', '.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB failed:', err.message);
    process.exit(1);
  }
};

// In-memory online/typing state
const onlineUsers = new Map(); // key: dbId -> { username, socketId, dbId }
const typingUsers = {};
const DEFAULT_CHANNEL = 'general';

// Helpers
const getOnlineUsers = () =>
  Array.from(onlineUsers.values()).map((u) => ({ id: u.socketId, dbId: u.dbId, username: u.username }));

const formatMessage = (msg) => {
  const senderOnline = onlineUsers.get(msg.sender?._id?.toString());
  return {
    id: msg._id,
    message: msg.content,
    sender: msg.sender?.username || 'Unknown',
    senderDbId: msg.sender?._id?.toString() || null,
    senderId: senderOnline ? senderOnline.socketId : null,
    recipientDbId: msg.recipient?._id?.toString() || null,
    channel: msg.channel || DEFAULT_CHANNEL,
    timestamp: msg.createdAt.toISOString(),
    isPrivate: msg.isPrivate,
  };
};

const getDbIdFromToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (_) {
    return null;
  }
};

const findDbIdBySocketId = (socketId) => {
  for (const [dbId, info] of onlineUsers.entries()) {
    if (info.socketId === socketId) return dbId;
  }
  return null;
};

// Socket auth middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (err) {
    console.error('Socket auth failed:', err.message);
    next(new Error('Authentication error'));
  }
});

// Socket Events
io.on('connection', (socket) => {
  console.log(`✅ ${socket.user.username} connected (${socket.id})`);

  socket.join(DEFAULT_CHANNEL);

  const dbId = socket.user._id.toString();
  onlineUsers.set(dbId, { username: socket.user.username, socketId: socket.id, dbId });

  // let client know their DB id
  socket.emit('me', { dbId });
  io.emit('user_list', getOnlineUsers());
  socket.broadcast.emit('user_joined', { username: socket.user.username });

  // public message
  socket.on('send_message', async (messageData) => {
    try {
      const content = typeof messageData === 'string' ? messageData : messageData.message;
      const channel = messageData && messageData.channel ? messageData.channel : DEFAULT_CHANNEL;

      const msg = new Message({ content, sender: socket.user._id, isPrivate: false, channel });
      await msg.save();
      await msg.populate('sender', 'username');

      io.to(channel).emit('receive_message', {
        id: msg._id,
        message: msg.content,
        sender: msg.sender.username,
        senderId: socket.id,
        timestamp: msg.createdAt.toISOString(),
        senderDbId: msg.sender._id.toString(),
        channel: msg.channel,
        isPrivate: false,
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  // join/leave channels
  socket.on('join_channel', (channel) => {
    if (!channel || typeof channel !== 'string') return;
    socket.join(channel);
    socket.emit('channel_joined', channel);
  });

  socket.on('leave_channel', (channel) => {
    if (!channel || typeof channel !== 'string') return;
    socket.leave(channel);
    socket.emit('channel_left', channel);
  });

  // typing indicator
  socket.on('typing', (isTyping) => {
    if (isTyping) typingUsers[socket.id] = socket.user.username;
    else delete typingUsers[socket.id];
    io.emit('typing_users', Object.values(typingUsers));
  });

  // private message
  socket.on('private_message', async ({ to, message }) => {
    try {
      const recipientDbId = findDbIdBySocketId(to);
      if (!recipientDbId) {
        socket.emit('pm_error', { message: 'User offline' });
        return;
      }

      const pm = new Message({ content: message, sender: socket.user._id, recipient: recipientDbId, isPrivate: true });
      await pm.save();
      await pm.populate('sender', 'username');

      const formatted = {
        id: pm._id,
        message: pm.content,
        sender: pm.sender.username,
        senderId: socket.id,
        timestamp: pm.createdAt.toISOString(),
        senderDbId: socket.user._id.toString(),
        recipientDbId: recipientDbId,
        isPrivate: true,
      };

      io.to(to).emit('private_message', formatted);
      socket.emit('private_message', formatted);
    } catch (err) {
      console.error('PM error:', err);
    }
  });

  // disconnect
  socket.on('disconnect', () => {
    if (!socket.user) return;
    console.log(`❌ ${socket.user.username} left`);
    onlineUsers.delete(socket.user._id.toString());
    delete typingUsers[socket.id];
    io.emit('user_list', getOnlineUsers());
    io.emit('user_left', { username: socket.user.username });
  });
});

// REST: Get chat history
app.get('/api/messages', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const myDbId = token ? getDbIdFromToken(token) : null;

    // Build criteria
    let criteria;
    if (req.query.private === 'true' && myDbId) {
      // only private messages involving user
      criteria = { $or: [ { $and: [{ isPrivate: true }, { sender: myDbId }] }, { $and: [{ isPrivate: true }, { recipient: myDbId }] } ] };
    } else if (req.query.channel && typeof req.query.channel === 'string') {
      criteria = { $and: [{ isPrivate: false }, { channel: req.query.channel }] };
    } else if (myDbId) {
      criteria = { $or: [ { isPrivate: false }, { $and: [{ isPrivate: true }, { sender: myDbId }] }, { $and: [{ isPrivate: true }, { recipient: myDbId }] } ] };
    } else {
      criteria = { isPrivate: false };
    }

    const msgs = await Message.find(criteria).sort({ createdAt: -1 }).limit(50).populate('sender', 'username').populate('recipient', 'username');
    res.json(msgs.reverse().map(formatMessage));
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Users route
app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await User.find().select('username');
    const formatted = allUsers.map((u) => {
      const onlineInfo = onlineUsers.get(u._id.toString());
      return { id: onlineInfo ? onlineInfo.socketId : null, dbId: u._id.toString(), username: u.username, online: !!onlineInfo };
    });
    res.json(formatted);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// Root
app.get('/', (_, res) => res.send('Server running ✅'));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () =>
    console.log(`🚀 Server running on port ${PORT}`)
  );
});

module.exports = { app, server, io };
