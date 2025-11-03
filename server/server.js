// server.js - Socket.io chat server

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

// ✅ Connect MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB failed:', err.message);
    process.exit(1);
  }
};

// ✅ Track online users
const onlineUsers = new Map();
const typingUsers = {};

// ✅ Socket Auth Middleware
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

// ✅ Helper to send online users
const getOnlineUsers = () =>
  Array.from(onlineUsers.values()).map((u) => ({
    id: u.socketId,
    dbId: u.dbId,
    username: u.username,
  }));

// ✅ Socket Events
io.on('connection', (socket) => {
  console.log(`✅ ${socket.user.username} connected (${socket.id})`);
  // Auto-join the default public channel
  const defaultChannel = 'general';
  socket.join(defaultChannel);

  onlineUsers.set(socket.user._id.toString(), {
    username: socket.user.username,
    socketId: socket.id,
    dbId: socket.user._id.toString(),
  });
  // Emit a personal 'me' event so the client knows its DB id immediately
  socket.emit('me', { dbId: socket.user._id.toString() });

  io.emit('user_list', getOnlineUsers());
  socket.broadcast.emit('user_joined', { username: socket.user.username });

  // ✅ Public message
  socket.on('send_message', async (messageData) => {
    try {
      const content =
        typeof messageData === 'string' ? messageData : messageData.message;
      const channel =
        typeof messageData === 'object' && messageData.channel
          ? messageData.channel
          : defaultChannel;

      const message = new Message({
        content,
        sender: socket.user._id,
        isPrivate: false,
        channel,
      });

      await message.save();
      await message.populate('sender', 'username');

      // Emit only to clients in the same channel
      io.to(channel).emit('receive_message', {
        id: message._id,
        message: message.content,
        sender: message.sender.username,
        senderId: socket.id,
        // Message schema uses `createdAt` (timestamps: true)
        timestamp: message.createdAt.toISOString(),
        // Include DB id of the sender so clients can reliably identify message author
        senderDbId: message.sender._id.toString(),
        channel: message.channel,
        isPrivate: false,
      });
    } catch (err) {
      console.log('Error sending message:', err);
    }
  });

  // Join a channel
  socket.on('join_channel', (channel) => {
    try {
      if (!channel || typeof channel !== 'string') return;
      socket.join(channel);
      socket.emit('channel_joined', channel);
    } catch (err) {
      console.error('join_channel error:', err);
    }
  });

  // Leave a channel
  socket.on('leave_channel', (channel) => {
    try {
      if (!channel || typeof channel !== 'string') return;
      socket.leave(channel);
      socket.emit('channel_left', channel);
    } catch (err) {
      console.error('leave_channel error:', err);
    }
  });

  // ✅ Typing indicator
  socket.on('typing', (isTyping) => {
    if (isTyping) typingUsers[socket.id] = socket.user.username;
    else delete typingUsers[socket.id];

    io.emit('typing_users', Object.values(typingUsers));
  });

  // ✅ Private messages
  socket.on('private_message', async ({ to, message }) => {
    try {
      let recipientDbId = null;
      for (const [dbId, user] of onlineUsers.entries()) {
        if (user.socketId === to) {
          recipientDbId = dbId;
          break;
        }
      }

      if (!recipientDbId) {
        socket.emit('pm_error', { message: 'User offline' });
        return;
      }

      const msg = new Message({
        content: message,
        sender: socket.user._id,
        recipient: recipientDbId,
        isPrivate: true,
      });

      await msg.save();
      await msg.populate('sender', 'username');

      const formatted = {
        id: msg._id,
        message: msg.content,
        sender: msg.sender.username,
        senderId: socket.id,
        timestamp: msg.createdAt.toISOString(),
        // include DB ids to let clients mount conversations by user DB id
        senderDbId: socket.user._id.toString(),
        recipientDbId: recipientDbId,
        isPrivate: true,
      };

      io.to(to).emit('private_message', formatted);
      socket.emit('private_message', formatted);
    } catch (err) {
      console.log('PM error:', err);
    }
  });

  // ✅ Disconnect
  socket.on('disconnect', () => {
    if (socket.user) {
      console.log(`❌ ${socket.user.username} left`);
      onlineUsers.delete(socket.user._id.toString());
      delete typingUsers[socket.id];
      io.emit('user_list', getOnlineUsers());
      io.emit('user_left', { username: socket.user.username });
    }
  });
});

// ✅ REST: Get chat history
app.get('/api/messages', async (req, res) => {
  try {
    // Expect token in Authorization header (Bearer)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    let myDbId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        myDbId = decoded.id;
      } catch (err) {
        // invalid token - continue as anonymous (only public messages returned)
        myDbId = null;
      }
    }

    // Handle different types of message requests:
    // 1. Private messages only (private=true)
    // 2. Channel-specific messages (channel=xyz)
    // 3. All messages
    
    if (req.query.private === 'true' && myDbId) {
      // Private messages only - return all private messages where user is sender or recipient
      const privateSent = { $and: [ { isPrivate: true }, { sender: myDbId } ] };
      const privateReceived = { $and: [ { isPrivate: true }, { recipient: myDbId } ] };
      criteria = { $or: [ privateSent, privateReceived ] };
    } else if (req.query.channel && typeof req.query.channel === 'string') {
      // Channel-specific request -> only public messages for that channel
      criteria = { $and: [ { isPrivate: false }, { channel: req.query.channel } ] };
    } else if (myDbId) {
      // No specific filter and authenticated -> public (all channels) + private involving user
      const publicClause = { isPrivate: false };
      const privateSent = { $and: [ { isPrivate: true }, { sender: myDbId } ] };
      const privateReceived = { $and: [ { isPrivate: true }, { recipient: myDbId } ] };
      criteria = { $or: [ publicClause, privateSent, privateReceived ] };
    } else {
      // Anonymous -> only public messages
      criteria = { isPrivate: false };
    }

    const msgs = await Message.find(criteria)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username')
      .populate('recipient', 'username');

    const formatted = msgs.reverse().map((msg) => {
      const senderOnline = onlineUsers.get(msg.sender?._id?.toString());

      return {
        id: msg._id,
        message: msg.content,
        sender: msg.sender?.username || 'Unknown',
        senderDbId: msg.sender?._id?.toString() || null,
        senderId: senderOnline ? senderOnline.socketId : null,
        recipientDbId: msg.recipient?._id?.toString() || null,
        channel: msg.channel || 'general',
        timestamp: msg.createdAt.toISOString(),
        isPrivate: msg.isPrivate,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// ✅ Users route
app.get('/api/users', async (req, res) => {
  try {
    // Fetch all registered users from DB
    const allUsers = await User.find().select('username');

    // Build a map of online users by DB id for quick lookup
    const onlineMap = new Map();
    for (const [dbId, u] of onlineUsers.entries()) {
      onlineMap.set(dbId, u);
    }

    // Return every user with online status and socketId when online
    const formatted = allUsers.map((u) => {
      const online = onlineMap.has(u._id.toString());
      const onlineInfo = online ? onlineMap.get(u._id.toString()) : null;

      return {
        // Keep `id` as the socket id for online users (so client-side PMs still use it)
        id: onlineInfo ? onlineInfo.socketId : null,
        dbId: u._id.toString(),
        username: u.username,
        online: !!online,
      };
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
