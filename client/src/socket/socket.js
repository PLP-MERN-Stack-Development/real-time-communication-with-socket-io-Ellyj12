// socket.js - Socket.io client setup

import { io } from "socket.io-client";
import { useEffect, useState } from "react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [myDbId, setMyDbId] = useState(null);
  // privateMessages: { [peerDbId]: { messages: [], unread: number } }
  const [privateMessages, setPrivateMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentChannel, setCurrentChannel] = useState('general');

  // ✅ Connect & Load History
  const connect = async () => {
    const token = localStorage.getItem("chat-token");

    if (!token) {
      console.error("No token found. Cannot connect.");
      return;
    }

    socket.auth = { token };
    socket.connect();

    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Load private message history (all private messages involving this user)
      const privateRes = await fetch('http://localhost:5000/api/messages?private=true', { headers });
      const privateHistory = await privateRes.json();

      // Group private messages by peer
      const privateByPeer = {};
      for (const msg of privateHistory) {
        const peerDbId = msg.senderDbId === myDbId ? msg.recipientDbId : msg.senderDbId;
        if (!privateByPeer[peerDbId]) {
          privateByPeer[peerDbId] = { messages: [], unread: 0 };
        }
        privateByPeer[peerDbId].messages.push(msg);
      }
      setPrivateMessages(privateByPeer);

      // load channel history for the current channel
      const res = await fetch(`http://localhost:5000/api/messages?channel=${encodeURIComponent(currentChannel)}`, { headers });
      const history = await res.json();

      // ✅ Load DB messages first
      setMessages(history);

      // Load full user list (with online/offline status)
      try {
        const usersRes = await fetch("http://localhost:5000/api/users", { headers });
        const usersList = await usersRes.json();
        setUsers(usersList);
        // determine my DB id from the users list when available
        const me = usersList.find((u) => u.id === socket.id);
        setMyDbId(me ? me.dbId : null);
      } catch (uErr) {
        console.error('Failed to load users list:', uErr);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const disconnect = () => {
    localStorage.removeItem("chat-token");
    localStorage.removeItem("chat-username");
    socket.disconnect();
    setIsConnected(false);
    setMessages([]);
    setUsers([]);
    setTypingUsers([]);
  };

  const sendMessage = (message) => {
    // Include the current channel when sending a public message
    socket.emit('send_message', { message, channel: currentChannel });
  };

  const joinChannel = async (channel) => {
    if (!channel || channel === currentChannel) return;
    // ask the server to leave the current channel (if any)
    if (currentChannel) {
      socket.emit('leave_channel', currentChannel);
    }

    // ask the server to join the socket.io room and wait for confirmation
    return new Promise((resolve) => {
      const onJoined = (joinedChannel) => {
        if (joinedChannel !== channel) return;
        socket.off('channel_joined', onJoined);
        setCurrentChannel(channel);

        // fetch channel-specific history after confirming join
        (async () => {
          try {
            const token = localStorage.getItem('chat-token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await fetch(`http://localhost:5000/api/messages?channel=${encodeURIComponent(channel)}`, { headers });
            const history = await res.json();
            setMessages(history);
          } catch (err) {
            console.error('Failed to load channel history:', err);
          }
          resolve();
        })();
      };

      socket.on('channel_joined', onJoined);
      socket.emit('join_channel', channel);
    });
  };

  const sendPrivateMessage = (to, message) => {
    socket.emit("private_message", { to, message });
  };

  const clearUnread = (peerDbId) => {
    setPrivateMessages((prev) => {
      if (!prev[peerDbId]) return prev;
      return { ...prev, [peerDbId]: { ...prev[peerDbId], unread: 0 } };
    });
  };

  const setTyping = (isTyping) => {
    socket.emit("typing", isTyping);
  };

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
    };

    const onMe = (payload) => {
      if (payload && payload.dbId) setMyDbId(payload.dbId);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setMessages([]);
      setUsers([]);
      setTypingUsers([]);
      localStorage.removeItem("chat-token");
      localStorage.removeItem("chat-username");
    };

    const onConnectError = (err) => {
      console.error("Connection Error:", err.message);
      if (err.message.includes("Authentication error")) {
        localStorage.removeItem("chat-token");
        localStorage.removeItem("chat-username");
        setIsConnected(false);
      }
    };

    const onReceiveMessage = (message) => {
      setLastMessage(message);

      // Ignore private messages here; private messages are delivered on 'private_message'
      if (message.isPrivate) return;

      // If message has a channel, only add it when it matches currentChannel
      if (message.channel && message.channel !== currentChannel) return;

      setMessages((prev) => [...prev, message]);
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);

      // message includes senderDbId and recipientDbId (server now provides these)
      // Determine the peer DB id (the other participant in the PM)
      let peerDbId = null;

      if (myDbId) {
        peerDbId = message.senderDbId === myDbId ? message.recipientDbId : message.senderDbId;
      } else {
        // Fallback: compare sender socket id when DB id hasn't been determined yet
        peerDbId = message.senderId === socket.id ? message.recipientDbId : message.senderDbId;
      }

      setPrivateMessages((prev) => {
        const copy = { ...prev };
        if (!copy[peerDbId]) copy[peerDbId] = { messages: [], unread: 0 };
        const wasUnread = copy[peerDbId].unread || 0;
        const isIncoming = message.senderDbId !== myDbId && message.senderId !== socket.id;

        copy[peerDbId] = {
          messages: [...copy[peerDbId].messages, message],
          // only increment unread for incoming messages (not for the sender's own echoes)
          unread: wasUnread + (isIncoming ? 1 : 0),
        };
        return copy;
      });
    };

    const onUserList = (userList) => {
      // When the server sends the online user list, refresh the full
      // users list (so offline users are included and statuses reflect current state).
      (async () => {
        try {
          const res = await fetch('http://localhost:5000/api/users');
          const all = await res.json();
          setUsers(all);
          const me = all.find((u) => u.id === socket.id);
          setMyDbId(me ? me.dbId : null);
        } catch (err) {
          console.error('Failed to refresh users:', err);
          // Fallback: use the online-only list
          setUsers(userList);
        }
      })();
    };

    const onUserJoined = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserLeft = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

  socket.on("connect", onConnect);
  socket.on('me', onMe);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
  socket.on("receive_message", onReceiveMessage);
    socket.on("private_message", onPrivateMessage);
    socket.on("user_list", onUserList);
    socket.on("user_joined", onUserJoined);
    socket.on("user_left", onUserLeft);
    socket.on("typing_users", onTypingUsers);

  return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("receive_message", onReceiveMessage);
  socket.off('me', onMe);
      socket.off("private_message", onPrivateMessage);
      socket.off("user_list", onUserList);
      socket.off("user_joined", onUserJoined);
      socket.off("user_left", onUserLeft);
      socket.off("typing_users", onTypingUsers);
    };
  }, [currentChannel, myDbId]);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    myDbId,
    privateMessages,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    clearUnread,
    joinChannel,
    currentChannel,
  };
};

export default socket;
